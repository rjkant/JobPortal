import { BaseScraper, ScrapedJob } from './base';

export class ShineScraper extends BaseScraper {
  get platform() {
    return 'shine';
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'Shine: No credentials found');
        return jobs;
      }

      // Login
      await this.log('info', 'Shine: Logging in');
      await this.page!.goto('https://www.shine.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await this.randomDelay(1000, 2000);

      const emailField = this.page!.locator('#email, input[type="email"]').first();
      if (await emailField.isVisible().catch(() => false)) {
        await emailField.fill(cred.email);
        await this.page!.locator('#password, input[type="password"]').first().fill(cred.password);
        await this.page!.locator('button[type="submit"]').first().click();
        await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }

      for (const keyword of keywords.slice(0, 2)) {
        await this.log('info', `Shine: Searching "${keyword}" in "${location}"`);
        const searchUrl = `https://www.shine.com/job-search/${encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'))}-jobs-in-${encodeURIComponent(location.toLowerCase().replace(/\s+/g, '-'))}?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&freshness=7`;

        await this.page!.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomDelay(2000, 4000);

        const cards = await this.page!.locator('.job-card, article[class*="job"]').all();
        await this.log('info', `Shine: Found ${cards.length} jobs for "${keyword}"`);

        for (const card of cards.slice(0, 10)) {
          try {
            const title = (await card.locator('h2, h3, .job-title').first().textContent())?.trim() ?? '';
            const company = (await card.locator('.company-name, [class*="company"]').first().textContent())?.trim() ?? '';
            const loc = (await card.locator('.location, [class*="location"]').first().textContent())?.trim() ?? '';
            const exp = (await card.locator('.experience, [class*="exp"]').first().textContent())?.trim() ?? '';
            const linkEl = card.locator('a').first();
            const href = (await linkEl.getAttribute('href')) ?? '';
            const applyUrl = href.startsWith('http') ? href : `https://www.shine.com${href}`;
            const externalId = href.match(/(\d+)/)?.[1] ?? Math.random().toString(36).slice(2);

            if (title && company) {
              jobs.push({
                externalId,
                title,
                company,
                location: loc,
                experience: exp,
                skills: [],
                description: `${title} at ${company}. ${exp ? `Experience: ${exp}.` : ''} Location: ${loc}`,
                applyUrl,
              });
            }
          } catch { /* skip */ }
        }
        await this.randomDelay(2000, 4000);
      }
    } catch (err) {
      await this.log('error', `Shine scraper error: ${(err as Error).message}`);
    } finally {
      await this.closeBrowser();
    }
    return jobs;
  }

  async applyToJob(job: ScrapedJob, _coverLetter: string): Promise<boolean> {
    await this.launchBrowser();
    try {
      await this.log('info', `Shine: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      const applyBtn = this.page!.locator('button:has-text("Apply"), a:has-text("Apply Now"), button:has-text("Easy Apply")').first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
        await this.randomDelay(2000, 4000);
        await this.log('info', `Shine: Applied to "${job.title}"`);
        return true;
      }
      return false;
    } catch (err) {
      await this.log('error', `Shine apply error: ${(err as Error).message}`);
      return false;
    } finally {
      await this.closeBrowser();
    }
  }
}
