import { BaseScraper, ScrapedJob } from './base';

export class MonsterScraper extends BaseScraper {
  get platform() {
    return 'monster';
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'Monster: No credentials found');
        return jobs;
      }

      await this.log('info', 'Monster: Logging in');
      await this.page!.goto('https://www.monsterindia.com/login.html', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await this.randomDelay(1500, 2500);

      const emailField = this.page!.locator('input[type="email"], #email, #username').first();
      if (await emailField.isVisible().catch(() => false)) {
        await emailField.fill(cred.email);
        await this.randomDelay(500, 1000);
        await this.page!.locator('input[type="password"], #password').first().fill(cred.password);
        await this.randomDelay(500, 1000);
        await this.page!.locator('button[type="submit"], input[type="submit"]').first().click();
        await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }

      for (const keyword of keywords.slice(0, 2)) {
        await this.log('info', `Monster: Searching "${keyword}" in "${location}"`);
        const searchUrl = `https://www.monsterindia.com/srp/results?query=${encodeURIComponent(keyword)}&locations=${encodeURIComponent(location)}&freshness=7`;

        await this.page!.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomDelay(2000, 4000);

        const cards = await this.page!.locator('.card-apply-content, .job-card, [class*="card"]').all();
        await this.log('info', `Monster: Found ${cards.length} job cards for "${keyword}"`);

        for (const card of cards.slice(0, 10)) {
          try {
            const title = (await card.locator('h3, .title, [class*="title"]').first().textContent())?.trim() ?? '';
            const company = (await card.locator('.company, [class*="company"]').first().textContent())?.trim() ?? '';
            const loc = (await card.locator('.location, [class*="location"]').first().textContent())?.trim() ?? '';
            const linkEl = card.locator('a[href*="job-detail"], a[href*="jobs"]').first();
            const href = (await linkEl.getAttribute('href')) ?? '';
            const applyUrl = href.startsWith('http') ? href : `https://www.monsterindia.com${href}`;
            const externalId = href.match(/(\d+)/)?.[1] ?? Math.random().toString(36).slice(2);

            if (title && company) {
              jobs.push({
                externalId,
                title,
                company,
                location: loc,
                skills: [],
                description: `${title} at ${company}. Location: ${loc}`,
                applyUrl,
              });
            }
          } catch { /* skip */ }
        }
        await this.randomDelay(2000, 3500);
      }
    } catch (err) {
      await this.log('error', `Monster scraper error: ${(err as Error).message}`);
    } finally {
      await this.closeBrowser();
    }
    return jobs;
  }

  async applyToJob(job: ScrapedJob, _coverLetter: string): Promise<boolean> {
    await this.launchBrowser();
    try {
      await this.log('info', `Monster: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      const applyBtn = this.page!.locator('button:has-text("Apply"), a:has-text("Apply Now")').first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.click();
        await this.randomDelay(2000, 4000);
        await this.log('info', `Monster: Applied to "${job.title}"`);
        return true;
      }
      return false;
    } catch (err) {
      await this.log('error', `Monster apply error: ${(err as Error).message}`);
      return false;
    } finally {
      await this.closeBrowser();
    }
  }
}
