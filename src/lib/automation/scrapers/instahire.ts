import { BaseScraper, ScrapedJob } from './base';

const TEXT_TIMEOUT = 5000; // max ms to wait for any text element

export class InstaHireScraper extends BaseScraper {
  get platform() {
    return 'instahire';
  }

  private async getText(locator: import('playwright').Locator): Promise<string> {
    try {
      return (await locator.textContent({ timeout: TEXT_TIMEOUT }))?.trim() ?? '';
    } catch {
      return '';
    }
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'InstaHire: No credentials found');
        return jobs;
      }

      // ── Login ──────────────────────────────────────────────────────────────
      await this.log('info', 'InstaHire: Logging in');
      await this.page!.goto('https://www.instahyre.com/login/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await this.randomDelay(1500, 2500);

      const emailField = this.page!.locator('input[type="email"], input[name="email"]').first();
      if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await emailField.fill(cred.email);
        await this.randomDelay(500, 1000);
        await this.page!.locator('input[type="password"]').first().fill(cred.password);
        await this.randomDelay(500, 1000);
        await this.page!.locator('button[type="submit"]').first().click();
        await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      }

      // ── Scrape opportunities ───────────────────────────────────────────────
      for (const keyword of keywords.slice(0, 2)) {
        await this.log('info', `InstaHire: Searching "${keyword}"`);
        await this.page!.goto('https://www.instahyre.com/candidate/opportunities/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await this.randomDelay(2000, 3000);

        // Try multiple selectors for job cards
        let cards = await this.page!.locator('.opportunity-card').all();
        if (cards.length === 0) cards = await this.page!.locator('.job-card').all();
        if (cards.length === 0) cards = await this.page!.locator('[class*="opportunityCard"], [class*="opportunity-card"], [class*="jobCard"]').all();

        await this.log('info', `InstaHire: Found ${cards.length} opportunities`);
        if (cards.length === 0) {
          await this.log('warn', 'InstaHire: No job cards found — login may have failed or page structure changed');
          continue;
        }

        for (const card of cards.slice(0, 10)) {
          try {
            // Use short timeouts so we never hang 30s on a missing element
            const title   = await this.getText(card.locator('h2, h3, .title, [class*="title"]').first());
            const company = await this.getText(card.locator('.company-name, [class*="company"]').first());
            const loc     = await this.getText(card.locator('.location, [class*="location"]').first());
            const linkEl  = card.locator('a').first();
            const href    = await linkEl.getAttribute('href', { timeout: TEXT_TIMEOUT }).catch(() => '') ?? '';
            const applyUrl = href.startsWith('http') ? href : `https://www.instahyre.com${href}`;
            const externalId = href.match(/[0-9a-f-]{8,}/)?.[0] ?? Math.random().toString(36).slice(2);

            if (title && company) {
              jobs.push({
                externalId,
                title,
                company,
                location: loc || location,
                skills: [],
                description: `${title} at ${company}. Location: ${loc || location}`,
                applyUrl,
              });
            }
          } catch { /* skip individual card */ }
        }
        await this.randomDelay(1500, 3000);
      }
    } catch (err) {
      await this.log('error', `InstaHire scraper error: ${(err as Error).message}`);
    } finally {
      await this.closeBrowser();
    }
    return jobs;
  }

  async applyToJob(job: ScrapedJob, _coverLetter: string): Promise<boolean> {
    await this.launchBrowser();
    try {
      await this.log('info', `InstaHire: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      const applyBtn = this.page!.locator(
        'button:has-text("Apply"), button:has-text("Express Interest"), a:has-text("Apply")'
      ).first();
      if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await applyBtn.click();
        await this.randomDelay(2000, 4000);
        await this.log('info', `InstaHire: Applied to "${job.title}"`);
        return true;
      }
      return false;
    } catch (err) {
      await this.log('error', `InstaHire apply error: ${(err as Error).message}`);
      return false;
    } finally {
      await this.closeBrowser();
    }
  }
}
