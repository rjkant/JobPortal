import { BaseScraper, ScrapedJob } from './base';

export class NaukriScraper extends BaseScraper {
  get platform() {
    return 'naukri';
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      // Naukri's search is fully public — no login needed for listing scraping.
      // We use direct search URLs to avoid bot-detection on the login page.
      await this.log('info', `Naukri: Searching for "${keywords.join(', ')}" in "${location}"`);

      for (const keyword of keywords.slice(0, 3)) {
        const slug = keyword.toLowerCase().replace(/\s+/g, '-');
        const locSlug = location.toLowerCase().replace(/[\s,]+/g, '-');
        const searchUrl =
          `https://www.naukri.com/${encodeURIComponent(slug)}-jobs-in-${encodeURIComponent(locSlug)}?jobAge=7`;

        await this.page!.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomDelay(2000, 4000);

        // Current Naukri selector (as of 2026): .srp-jobtuple-wrapper
        const jobCards = await this.page!.locator('.srp-jobtuple-wrapper').all();
        await this.log('info', `Naukri: Found ${jobCards.length} job cards for "${keyword}"`);

        for (const card of jobCards.slice(0, 15)) {
          try {
            const title   = (await card.locator('.title').textContent())?.trim() ?? '';
            const company = (await card.locator('.comp-name').textContent())?.trim() ?? '';
            const loc     = (await card.locator('.locWdth').first().textContent())?.trim() ?? '';
            const exp     = (await card.locator('.expwdth').first().textContent())?.trim() ?? '';
            const desc    = (await card.locator('.row4').textContent())?.trim() ?? '';
            const salary  = (await card.locator('.salary').textContent().catch(() => ''))?.trim() ?? '';
            const applyUrl = (await card.locator('a.title').getAttribute('href')) ?? '';

            // Skills: .tag-li (replaced old .tags li)
            const skillEls = await card.locator('.tag-li').allTextContents();
            const skills = skillEls.map(s => s.trim()).filter(Boolean);

            const externalId =
              applyUrl.match(/(\d{10,})/)?.[1] ?? Math.random().toString(36).slice(2);

            const parsedSalary = this.parseSalary(salary);

            if (title && company && applyUrl) {
              jobs.push({
                externalId,
                title,
                company,
                location: loc || location,
                experience: exp,
                skills,
                description: desc || `${title} at ${company}. ${exp ? `Experience: ${exp}.` : ''} Skills: ${skills.join(', ')}`,
                applyUrl: applyUrl.startsWith('http') ? applyUrl : `https://www.naukri.com${applyUrl}`,
                ...parsedSalary,
              });
            }
          } catch {
            // skip individual card errors
          }
        }
        await this.randomDelay(1500, 3000);
      }
    } catch (err) {
      await this.log('error', `Naukri scraper error: ${(err as Error).message}`);
    } finally {
      await this.closeBrowser();
    }

    return jobs;
  }

  async applyToJob(job: ScrapedJob, coverLetter: string): Promise<boolean> {
    await this.launchBrowser();
    try {
      // Login is required only when applying
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'Naukri: No credentials found for applying');
        return false;
      }

      // Navigate to login
      await this.page!.goto('https://www.naukri.com/nlogin/login', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for the email field (it's a React-rendered input)
      const emailField = this.page!.locator('#usernameField');
      await emailField.waitFor({ state: 'visible', timeout: 20000 });
      await emailField.fill(cred.email);
      await this.randomDelay(500, 1000);

      await this.page!.fill('#passwordField', cred.password);
      await this.randomDelay(500, 1000);
      await this.page!.click('button[type="submit"]');
      await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});

      await this.log('info', `Naukri: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      const applyBtn = this.page!.locator('button:has-text("Apply"), a:has-text("Apply Now")').first();
      if (!(await applyBtn.isVisible().catch(() => false))) {
        await this.log('warn', `Naukri: Apply button not found for "${job.title}"`);
        return false;
      }

      await applyBtn.click();
      await this.randomDelay(2000, 4000);

      const nextBtn = this.page!.locator('button:has-text("Next"), button:has-text("Submit")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await this.randomDelay(1500, 2500);
      }

      const coverField = this.page!.locator('textarea[name*="cover"], textarea[placeholder*="cover"]').first();
      if (await coverField.isVisible().catch(() => false)) {
        await coverField.fill(coverLetter);
        await this.randomDelay(500, 1000);
      }

      const submitBtn = this.page!.locator('button:has-text("Submit"), button:has-text("Apply")').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await this.randomDelay(2000, 3000);
        await this.log('info', `Naukri: Applied to "${job.title}" at ${job.company}`);
        return true;
      }

      return false;
    } catch (err) {
      await this.log('error', `Naukri apply error: ${(err as Error).message}`);
      return false;
    } finally {
      await this.closeBrowser();
    }
  }
}
