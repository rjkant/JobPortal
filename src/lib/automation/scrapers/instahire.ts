import { BaseScraper, ScrapedJob } from './base';

export class InstaHireScraper extends BaseScraper {
  get platform() {
    return 'instahire';
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
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await this.randomDelay(1000, 2000);

      const emailField = this.page!.locator('input[type="email"], input[name="email"]').first();
      const hasEmail = await emailField.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasEmail) {
        await emailField.fill(cred.email);
        await this.randomDelay(400, 800);
        await this.page!.locator('input[type="password"]').first().fill(cred.password);
        await this.randomDelay(400, 800);
        await this.page!.locator('button[type="submit"]').first().click();
        // Wait for SPA navigation (networkidle catches React state changes)
        await this.page!.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.randomDelay(1000, 2000);
      }

      // Verify we are logged in
      const currentUrl = this.page!.url();
      await this.log('info', `InstaHire: Post-login URL: ${currentUrl}`);

      // ── Navigate to opportunities ─────────────────────────────────────────
      for (const keyword of keywords.slice(0, 2)) {
        await this.log('info', `InstaHire: Searching "${keyword}"`);
        await this.page!.goto('https://www.instahyre.com/candidate/opportunities/', {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        await this.randomDelay(2000, 3000);

        const pageTitle = await this.page!.title();
        await this.log('info', `InstaHire: Page title: "${pageTitle}"`);

        // Use page.evaluate to inspect real DOM and extract jobs
        const extracted = await this.page!.evaluate(() => {
          // Log first 300 chars of body for debugging
          const bodySnippet = document.body.innerHTML.substring(0, 300);

          // Try many possible card selectors
          const cardSelectors = [
            '.opportunity-card',
            '.job-card',
            '[class*="opportunity-card"]',
            '[class*="OpportunityCard"]',
            '[class*="job-card"]',
            '[class*="JobCard"]',
            '[data-cy*="opportunity"]',
            '[data-cy*="job"]',
            '.card',
          ];

          let cards: Element[] = [];
          for (const sel of cardSelectors) {
            const found = Array.from(document.querySelectorAll(sel));
            if (found.length > 0) { cards = found; break; }
          }

          const results = cards.slice(0, 10).map(card => {
            // Grab first heading-like element
            const titleEl = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="role"], [class*="position"], [class*="designation"]');
            // Grab company — usually the first non-heading text node
            const companyEl = card.querySelector('[class*="company"], [class*="employer"], [class*="org"], p, span');
            const linkEl = card.querySelector('a[href]');

            return {
              title: titleEl?.textContent?.trim() ?? '',
              company: companyEl?.textContent?.trim() ?? '',
              href: linkEl?.getAttribute('href') ?? '',
              sampleHTML: card.outerHTML.substring(0, 400),
            };
          });

          return { bodySnippet, cardCount: cards.length, cardSelector: cardSelectors.find(s => document.querySelector(s)), results };
        });

        await this.log('info', `InstaHire: Cards found: ${extracted.cardCount} (selector: ${extracted.cardSelector ?? 'none'})`);
        if (extracted.cardCount === 0) {
          await this.log('warn', `InstaHire: DOM snippet: ${extracted.bodySnippet.substring(0, 200)}`);
          continue;
        }

        // Log first card HTML for selector debugging
        if (extracted.results[0]) {
          await this.log('info', `InstaHire: First card HTML: ${extracted.results[0].sampleHTML.substring(0, 250)}`);
        }

        for (const item of extracted.results) {
          if (item.title && item.company) {
            const href = item.href;
            const applyUrl = href.startsWith('http') ? href : `https://www.instahyre.com${href}`;
            const externalId = href.match(/[0-9a-f-]{8,}/)?.[0] ?? Math.random().toString(36).slice(2);
            jobs.push({
              externalId,
              title: item.title,
              company: item.company,
              location,
              skills: [],
              description: `${item.title} at ${item.company}`,
              applyUrl,
            });
          }
        }

        await this.randomDelay(1500, 2500);
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

      const applyBtn = this.page!
        .locator('button:has-text("Apply"), button:has-text("Express Interest"), a:has-text("Apply")')
        .first();
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
