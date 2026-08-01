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

      // ── Intercept XHR API calls before any navigation ──────────────────────
      // InstaHire is AngularJS + Django REST — job data comes via XHR, not HTML
      const capturedData: Array<{ url: string; items: unknown[] }> = [];

      await this.page!.route('**/api/**', async (route) => {
        const response = await route.fetch();
        const url = route.request().url();
        try {
          const text = await response.text();
          const json = JSON.parse(text);
          // API typically returns { opportunities:[...] } or { results:[...] } or an array
          const items: unknown[] =
            json.opportunities ??
            json.results ??
            json.jobs ??
            json.data ??
            (Array.isArray(json) ? json : []);
          if (items.length > 0) {
            capturedData.push({ url, items });
            // log safely without await (route handler can't await our log util)
          }
        } catch {
          // not JSON or irrelevant
        }
        await route.fulfill({ response });
      });

      // ── Login ──────────────────────────────────────────────────────────────
      await this.log('info', 'InstaHire: Logging in');
      await this.page!.goto('https://www.instahyre.com/login/', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await this.randomDelay(1500, 2500);

      // InstaHire login form: input[name="email"] (type=text) + input[name="password"]
      const emailField = this.page!.locator('input[name="email"], input[type="email"]').first();
      const hasEmail = await emailField.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasEmail) {
        await emailField.fill(cred.email);
        await this.randomDelay(400, 800);
        await this.page!.locator('input[name="password"], input[type="password"]').first().fill(cred.password);
        await this.randomDelay(400, 800);
        // Button text is "Login"
        await this.page!.locator('button:has-text("Login"), button[type="submit"]').first().click();
        await this.page!.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
        await this.randomDelay(2000, 3000);
      }

      const postLoginUrl = this.page!.url();
      await this.log('info', `InstaHire: Post-login URL: ${postLoginUrl}`);

      if (postLoginUrl.includes('/login')) {
        await this.log('error', 'InstaHire: Login failed — still on login page');
        return jobs;
      }

      // ── Navigate to matching opportunities ─────────────────────────────────
      // Use the ?matching=true URL — this is the page the user sees jobs on
      await this.page!.goto('https://www.instahyre.com/candidate/opportunities/?matching=true', {
        waitUntil: 'networkidle',
        timeout: 35000,
      });

      // Wait for AngularJS $digest + XHR fetch to complete
      await this.randomDelay(8000, 10000);

      await this.log('info', `InstaHire: Page after nav: ${this.page!.url()}`);
      await this.log('info', `InstaHire: Captured ${capturedData.length} API responses`);

      // ── Strategy 1: Use intercepted XHR data ──────────────────────────────
      if (capturedData.length > 0) {
        for (const { url, items } of capturedData) {
          await this.log('info', `InstaHire: API hit: ${url} → ${items.length} items`);
          for (const item of items.slice(0, 20)) {
            const job = this.parseApiItem(item as Record<string, unknown>, location);
            if (job) jobs.push(job);
          }
        }
        await this.log('info', `InstaHire: ${jobs.length} jobs from API interception`);
        return jobs;
      }

      // ── Strategy 2: Direct API fetch in browser context ───────────────────
      // Try common InstaHire REST endpoints (browser has the session cookie)
      const apiResult = await this.page!.evaluate(async () => {
        const endpoints = [
          '/api/v1/candidate/opportunities/?matching=true&limit=30',
          '/api/v1/candidate/opportunities/',
          '/api/candidate/opportunities/?matching=true',
          '/api/candidate/opportunities/',
          '/api/v2/candidate/opportunities/',
        ];
        for (const ep of endpoints) {
          try {
            const r = await fetch(ep, {
              headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
            });
            if (r.ok) {
              const json = await r.json();
              const items =
                json.opportunities ?? json.results ?? json.jobs ?? json.data ??
                (Array.isArray(json) ? json : null);
              if (items && items.length > 0) {
                return { endpoint: ep, items };
              }
            }
          } catch {
            // try next
          }
        }
        return null;
      });

      if (apiResult) {
        await this.log('info', `InstaHire: Direct API success: ${apiResult.endpoint} → ${apiResult.items.length} items`);
        for (const item of (apiResult.items as Record<string, unknown>[]).slice(0, 20)) {
          const job = this.parseApiItem(item, location);
          if (job) jobs.push(job);
        }
        await this.log('info', `InstaHire: ${jobs.length} jobs from direct API`);
        return jobs;
      }

      // ── Strategy 3: DOM scraping fallback ─────────────────────────────────
      await this.log('warn', 'InstaHire: API approaches failed, falling back to DOM scraping');

      const extracted = await this.page!.evaluate(() => {
        // Probe many selectors
        const selectors = [
          '[ng-repeat]',
          '#opportunity-list > *',
          '.opportunity-list > *',
          '[class*="opportunity-card"]',
          '[class*="opp-card"]',
          'div:has(a[href*="/employer/"])',
          'li:has(a[href*="/employer/"])',
          'a[href*="/employer/"]',
        ];

        let cards: Element[] = [];
        let matchedSel = '';
        for (const sel of selectors) {
          try {
            const found = Array.from(document.querySelectorAll(sel));
            if (found.length > 0) { cards = found; matchedSel = sel; break; }
          } catch { /* :has() unsupported */ }
        }

        const results = cards.slice(0, 20).map(card => {
          const heading = card.querySelector('h1,h2,h3,h4,[class*="title"],[class*="role"],[class*="position"]');
          const company = card.querySelector('[class*="company"],[class*="employer"],[class*="org"]');
          const link = card.querySelector('a[href]') ?? (card.tagName === 'A' ? card : null);
          return {
            title: heading?.textContent?.trim() ?? '',
            company: company?.textContent?.trim() ?? '',
            href: (link as HTMLAnchorElement)?.href ?? '',
            html: card.outerHTML.substring(0, 400),
          };
        });

        return {
          cardCount: cards.length,
          matchedSel,
          results,
          bodySnippet: document.body.innerHTML.replace(/\s+/g, ' ').substring(0, 600),
        };
      });

      await this.log('info', `InstaHire: DOM cards: ${extracted.cardCount} (sel: "${extracted.matchedSel}")`);
      if (extracted.cardCount === 0) {
        await this.log('warn', `InstaHire body: ${extracted.bodySnippet}`);
      }

      for (const item of extracted.results) {
        if (!item.title) continue;
        const applyUrl = item.href.startsWith('http') ? item.href : `https://www.instahyre.com${item.href}`;
        const externalId =
          (item.href.match(/[0-9a-f-]{8,}/)?.[0]) ??
          (item.href.replace(/[^a-z0-9]/gi, '') || Math.random().toString(36).slice(2));

        jobs.push({
          externalId,
          title: item.title,
          company: item.company || 'Company on InstaHyre',
          location,
          skills: [],
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

  /** Parse a job item from InstaHire's REST API response */
  private parseApiItem(item: Record<string, unknown>, defaultLocation: string): ScrapedJob | null {
    // InstaHire API fields (common patterns)
    const title =
      (item.position_name ?? item.title ?? item.job_title ?? item.role ?? '') as string;
    const company =
      (item.company_name ?? item.employer_name ?? item.company ?? '') as string;
    const loc =
      (item.location ?? item.city ?? item.locations ?? defaultLocation) as string;
    const id =
      (item.id ?? item.opportunity_id ?? item.job_id ?? '') as string | number;
    const slug =
      (item.slug ?? item.url_slug ?? '') as string;
    const skills =
      Array.isArray(item.skills)
        ? (item.skills as Array<{ name?: string } | string>).map(s =>
            typeof s === 'string' ? s : (s.name ?? '')
          )
        : [];

    if (!title) return null;

    const applyUrl = slug
      ? `https://www.instahyre.com/employer/${slug}/`
      : id
      ? `https://www.instahyre.com/candidate/opportunities/${id}/`
      : 'https://www.instahyre.com/candidate/opportunities/?matching=true';

    const description =
      (item.description ?? item.job_description ?? `${title}${company ? ` at ${company}` : ''} — via InstaHyre`) as string;

    return {
      externalId: String(id || slug || Math.random().toString(36).slice(2)),
      title,
      company: company || 'Company on InstaHyre',
      location: Array.isArray(loc) ? loc.join(', ') : loc || defaultLocation,
      skills,
      description: String(description).substring(0, 1000),
      applyUrl,
      experience: (item.experience ?? item.min_experience ?? '') as string,
    };
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
