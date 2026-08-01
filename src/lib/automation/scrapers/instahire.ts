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
      await this.randomDelay(1500, 2500);

      const emailField = this.page!.locator('input[type="email"], input[name="email"]').first();
      const hasEmail = await emailField.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasEmail) {
        await emailField.fill(cred.email);
        await this.randomDelay(400, 800);
        await this.page!.locator('input[type="password"]').first().fill(cred.password);
        await this.randomDelay(400, 800);
        await this.page!.locator('button[type="submit"]').first().click();
        await this.page!.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.randomDelay(2000, 3000);
      }

      const postLoginUrl = this.page!.url();
      await this.log('info', `InstaHire: Post-login URL: ${postLoginUrl}`);

      // If still on login page, bail
      if (postLoginUrl.includes('/login')) {
        await this.log('error', 'InstaHire: Login failed — still on login page');
        return jobs;
      }

      // ── Navigate to opportunities once (it's personalized, not keyword-based) ─
      await this.page!.goto('https://www.instahyre.com/candidate/opportunities/', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // InstaHire uses AngularJS — wait for $digest cycle to render cards
      await this.randomDelay(6000, 8000);

      const pageTitle = await this.page!.title();
      await this.log('info', `InstaHire: Page title: "${pageTitle}"`);

      // Extract jobs using page.evaluate (runs in browser context, sees real AngularJS DOM)
      const extracted = await this.page!.evaluate(() => {
        // AngularJS renders ng-repeat items — try many selectors
        const cardSelectors = [
          // AngularJS ng-repeat items inside known containers
          '#opportunity-list > div',
          '#opportunity-list li',
          '.opportunity-list > div',
          '.opportunity-list li',
          // Generic AngularJS repeat items
          '[ng-repeat]',
          // Common class patterns
          '.opportunity-card',
          '.opportunity',
          '.job-card',
          '.job-listing',
          // Table rows
          'table tbody tr',
          // Any div with an anchor inside it that links to /employer/
          'div:has(a[href*="/employer/"])',
          'li:has(a[href*="/employer/"])',
        ];

        let cards: Element[] = [];
        let matchedSelector = '';

        for (const sel of cardSelectors) {
          try {
            const found = Array.from(document.querySelectorAll(sel));
            if (found.length > 0) {
              cards = found;
              matchedSelector = sel;
              break;
            }
          } catch {
            // some selectors like :has() may not be supported — skip
          }
        }

        // Fallback: find all anchors linking to employer pages
        if (cards.length === 0) {
          const employerLinks = Array.from(document.querySelectorAll('a[href*="/employer/"]'));
          cards = employerLinks.map(a => a.closest('div, li, tr') ?? a) as Element[];
          if (cards.length > 0) matchedSelector = 'a[href*="/employer/"] closest parent';
        }

        const results = cards.slice(0, 15).map(card => {
          const heading = card.querySelector('h1,h2,h3,h4,[class*="title"],[class*="role"],[class*="position"]');
          const company = card.querySelector('[class*="company"],[class*="employer"],[class*="org"],p,span');
          const link    = card.querySelector('a[href]');
          return {
            title:      heading?.textContent?.trim() ?? '',
            company:    company?.textContent?.trim() ?? '',
            href:       link?.getAttribute('href') ?? '',
            sampleHTML: card.outerHTML.substring(0, 500),
          };
        });

        // Also grab first 800 chars of body for debug
        const bodySnippet = document.body.innerHTML.replace(/\s+/g, ' ').substring(0, 800);

        return { cardCount: cards.length, matchedSelector, results, bodySnippet };
      });

      await this.log('info', `InstaHire: Cards found: ${extracted.cardCount} (selector: "${extracted.matchedSelector}")`);

      if (extracted.cardCount === 0) {
        await this.log('warn', `InstaHire: Body snippet: ${extracted.bodySnippet.substring(0, 300)}`);
      } else if (extracted.results[0]) {
        await this.log('info', `InstaHire: First card HTML: ${extracted.results[0].sampleHTML.substring(0, 300)}`);
      }

      for (const item of extracted.results) {
        if (!item.title) continue;
        const href = item.href;
        const applyUrl = href.startsWith('http') ? href : `https://www.instahyre.com${href}`;
        const externalId = href.match(/[0-9a-f-]{8,}/)?.[0] ?? href.replace(/[^a-z0-9]/gi, '') || Math.random().toString(36).slice(2);

        jobs.push({
          externalId,
          title:       item.title,
          company:     item.company || 'Company on InstaHyre',
          location,
          skills:      [],
          description: `${item.title}${item.company ? ` at ${item.company}` : ''} — via InstaHyre`,
          applyUrl,
        });
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
