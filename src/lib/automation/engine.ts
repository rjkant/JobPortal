import { prisma } from '@/lib/db';
import { scoreJobMatch, generateCoverLetter } from './gemini';
import { NaukriScraper } from './scrapers/naukri';
import { ShineScraper } from './scrapers/shine';
import { MonsterScraper } from './scrapers/monster';
import { InstaHireScraper } from './scrapers/instahire';
import type { BaseScraper, ScrapedJob } from './scrapers/base';

export class AutomationEngine {
  private runId: string;

  constructor(runId: string) {
    this.runId = runId;
  }

  private async addLog(level: 'info' | 'warn' | 'error', message: string) {
    await prisma.automationLog.create({
      data: { runId: this.runId, level, message },
    });
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async run(): Promise<void> {
    const startedAt = new Date();
    try {
      await this.addLog('info', 'Automation run started');

      // 1. Load user profile
      const profile = await prisma.userProfile.findFirst();
      if (!profile) {
        await this.addLog('error', 'No user profile found. Please complete your profile first.');
        await this.markFailed(['No user profile configured']);
        return;
      }

      const skills = JSON.parse(profile.skills || '[]') as string[];
      const desiredRoles = JSON.parse(profile.desiredRoles || '[]') as string[];
      const preferredLocs = JSON.parse(profile.preferredLocs || '[]') as string[];

      if (desiredRoles.length === 0) {
        await this.addLog('error', 'No desired roles configured in profile');
        await this.markFailed(['No desired roles in profile']);
        return;
      }

      // 2. Load settings
      const settingsRows = await prisma.settings.findMany();
      const settings: Record<string, string> = {};
      for (const row of settingsRows) settings[row.key] = row.value;
      const minScore = parseInt(settings['min_match_score'] ?? '60');
      const maxApps = parseInt(settings['max_applications_per_run'] ?? '20');
      const autoApplyEnabled = settings['auto_apply_enabled'] !== 'false';

      await this.addLog('info', `Settings: min_score=${minScore}, max_apps=${maxApps}, auto_apply=${autoApplyEnabled}`);

      // 3. Load active credentials → determine platforms
      const credentials = await prisma.platformCredential.findMany({ where: { isActive: true } });
      const platforms = credentials.map(c => c.platform);

      await this.addLog('info', `Active platforms: ${platforms.join(', ')}`);

      // 4. Build scraper map
      const scrapers: Record<string, BaseScraper> = {};
      const logFn = this.addLog.bind(this);
      if (platforms.includes('naukri')) scrapers['naukri'] = new NaukriScraper(this.runId, logFn);
      if (platforms.includes('shine')) scrapers['shine'] = new ShineScraper(this.runId, logFn);
      if (platforms.includes('monster')) scrapers['monster'] = new MonsterScraper(this.runId, logFn);
      if (platforms.includes('instahire')) scrapers['instahire'] = new InstaHireScraper(this.runId, logFn);

      const location = preferredLocs[0] ?? profile.location ?? 'Bangalore';
      const keywords = desiredRoles;

      let totalJobsFound = 0;
      let totalApplied = 0;
      const errors: string[] = [];

      // 5. Scrape each platform
      for (const [platform, scraper] of Object.entries(scrapers)) {
        await this.addLog('info', `Scraping ${platform}...`);
        let scrapedJobs: ScrapedJob[] = [];

        try {
          scrapedJobs = await scraper.scrapeJobs(keywords, location);
          await this.addLog('info', `${platform}: scraped ${scrapedJobs.length} jobs`);
          totalJobsFound += scrapedJobs.length;
        } catch (err) {
          const msg = `${platform} scrape failed: ${(err as Error).message}`;
          await this.addLog('error', msg);
          errors.push(msg);
          continue;
        }

        // 6. Score and store each job
        for (const scrapedJob of scrapedJobs) {
          if (totalApplied >= maxApps) {
            await this.addLog('info', `Reached max applications limit (${maxApps}). Stopping.`);
            break;
          }

          try {
            // Check if already in DB
            const existing = await prisma.jobListing.findUnique({
              where: { platform_externalId: { platform, externalId: scrapedJob.externalId } },
            });

            // Score with Gemini AI
            await this.addLog('info', `Scoring: "${scrapedJob.title}" at ${scrapedJob.company}`);
            const matchResult = await scoreJobMatch(
              {
                fullName: profile.fullName,
                currentRole: profile.currentRole,
                skills,
                desiredRoles,
                totalExperience: profile.totalExperience,
                preferredLocs,
                summary: profile.summary,
              },
              {
                title: scrapedJob.title,
                company: scrapedJob.company,
                location: scrapedJob.location,
                description: scrapedJob.description,
                skills: scrapedJob.skills,
                experience: scrapedJob.experience,
              }
            );

            await this.addLog(
              'info',
              `  Score: ${matchResult.score}/100 — ${matchResult.reasons[0] ?? 'match'}`
            );

            // Upsert job listing
            const jobData = {
              platform,
              externalId: scrapedJob.externalId,
              title: scrapedJob.title,
              company: scrapedJob.company,
              location: scrapedJob.location,
              salaryMin: scrapedJob.salaryMin,
              salaryMax: scrapedJob.salaryMax,
              experience: scrapedJob.experience,
              skills: JSON.stringify(scrapedJob.skills),
              description: scrapedJob.description,
              applyUrl: scrapedJob.applyUrl,
              postedAt: scrapedJob.postedAt,
              matchScore: matchResult.score,
            };

            const jobListing = existing
              ? await prisma.jobListing.update({ where: { id: existing.id }, data: { matchScore: matchResult.score } })
              : await prisma.jobListing.create({ data: jobData });

            // Skip if score too low
            if (matchResult.score < minScore) {
              await this.addLog('info', `  Skipping (score ${matchResult.score} < ${minScore})`);
              continue;
            }

            // Skip if already applied
            const alreadyApplied = await prisma.application.findFirst({ where: { jobId: jobListing.id } });
            if (alreadyApplied) {
              await this.addLog('info', `  Already applied to "${scrapedJob.title}"`);
              continue;
            }

            // Generate cover letter
            await this.addLog('info', `  Generating cover letter...`);
            const coverLetter = await generateCoverLetter(
              {
                fullName: profile.fullName,
                currentRole: profile.currentRole,
                skills,
                totalExperience: profile.totalExperience,
                summary: profile.summary,
              },
              {
                title: scrapedJob.title,
                company: scrapedJob.company,
                description: scrapedJob.description,
              }
            );

            // Auto-apply
            let applied = false;
            if (autoApplyEnabled) {
              await this.addLog('info', `  Applying to "${scrapedJob.title}" at ${scrapedJob.company}...`);
              try {
                applied = await scraper.applyToJob(scrapedJob, coverLetter);
              } catch (applyErr) {
                const msg = `  Apply failed: ${(applyErr as Error).message}`;
                await this.addLog('warn', msg);
              }
            }

            // Record application
            await prisma.application.create({
              data: {
                jobId: jobListing.id,
                status: applied ? 'applied' : 'applied',
                coverLetter,
                tailoredResume: matchResult.tailoredSummary,
                notes: `Match score: ${matchResult.score}. ${matchResult.reasons.join('. ')}`,
              },
            });

            if (applied) {
              totalApplied++;
              await this.addLog('info', `  ✓ Applied! (total: ${totalApplied})`);
            } else {
              await this.addLog('info', `  Logged without auto-apply`);
            }
          } catch (jobErr) {
            const msg = `Error processing job "${scrapedJob.title}": ${(jobErr as Error).message}`;
            await this.addLog('error', msg);
            errors.push(msg);
          }

          // Small delay between jobs
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // 7. Mark run complete
      await prisma.automationRun.update({
        where: { id: this.runId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          jobsFound: totalJobsFound,
          jobsApplied: totalApplied,
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      await this.addLog(
        'info',
        `Run completed. Jobs found: ${totalJobsFound}, Applied: ${totalApplied}, Errors: ${errors.length}`
      );
    } catch (err) {
      const msg = `Fatal error: ${(err as Error).message}`;
      await this.addLog('error', msg);
      await this.markFailed([msg]);
    }
  }

  private async markFailed(errors: string[]) {
    await prisma.automationRun.update({
      where: { id: this.runId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: JSON.stringify(errors),
      },
    }).catch(() => {});
  }
}
