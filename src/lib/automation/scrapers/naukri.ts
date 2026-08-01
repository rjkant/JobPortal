import { BaseScraper, ScrapedJob } from './base';

export class NaukriScraper extends BaseScraper {
  get platform() {
    return 'naukri';
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      await this.log('info', `Naukri: Searching for "${keywords.join(', ')}" in "${location}"`);

      for (const keyword of keywords.slice(0, 3)) {
        const slug = keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const locSlug = location.toLowerCase().split(',')[0].trim().replace(/\s+/g, '-');

        const searchUrl = `https://www.naukri.com/${slug}-jobs-in-${locSlug}?jobAge=7`;
        await this.log('info', `Naukri: Fetching ${searchUrl}`);

        await this.page!.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 });

        // Extra wait for React hydration after network is idle
        await this.randomDelay(3000, 5000);

        const pageTitle = await this.page!.title();
        await this.log('info', `Naukri: Page title: "${pageTitle}"`);

        // Try selectors in order of preference
        let jobCards = await this.page!.locator('.srp-jobtuple-wrapper').all();
        if (jobCards.length === 0) jobCards = await this.page!.locator('.cust-job-tuple').all();
        if (jobCards.length === 0) jobCards = await this.page!.locator('[data-job-id]').all();

        await this.log('info', `Naukri: Found ${jobCards.length} job cards for "${keyword}"`);

        if (jobCards.length === 0) {
          const snippet = await this.page!.evaluate(() => document.body.innerHTML.substring(0, 400));
          await this.log('warn', `Naukri: Zero cards DOM snippet: ${snippet.replace(/\s+/g, ' ')}`);
          continue;
        }

        for (const card of jobCards.slice(0, 15)) {
          try {
            const title    = (await card.locator('a.title, h2, [class*="title"]').first().textContent({ timeout: 3000 }))?.trim() ?? '';
            const company  = (await card.locator('.comp-name, [class*="comp"]').first().textContent({ timeout: 3000 }))?.trim() ?? '';
            const loc      = await card.locator('.locWdth').first().textContent({ timeout: 3000 }).then(t => t?.trim() ?? '').catch(() => '');
            const exp      = await card.locator('.expwdth').first().textContent({ timeout: 3000 }).then(t => t?.trim() ?? '').catch(() => '');
            const desc     = await card.locator('.row4').textContent({ timeout: 3000 }).then(t => t?.trim() ?? '').catch(() => '');
            const salary   = await card.locator('.salary').textContent({ timeout: 3000 }).then(t => t?.trim() ?? '').catch(() => '');
            const applyUrl = await card.locator('a.title, a[href*="naukri.com"]').first().getAttribute('href').catch(() => '') ?? '';
            const skillEls = await card.locator('.tag-li').allTextContents();
            const skills   = skillEls.map(s => s.trim()).filter(Boolean);

            const externalId = applyUrl.match(/(\d{10,})/)?.[1] ?? Math.random().toString(36).slice(2);

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
                ...this.parseSalary(salary),
              });
            }
          } catch {
            // skip individual card errors
          }
        }
        await this.randomDelay(2000, 4000);
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
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'Naukri: No credentials found for applying');
        return false;
      }

      await this.page!.goto('https://www.naukri.com/nlogin/login', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await this.randomDelay(2000, 3000);

      const emailField = this.page!.locator('#usernameField');
      await emailField.waitFor({ state: 'visible', timeout: 20000 });
      await emailField.fill(cred.email);
      await this.randomDelay(500, 1000);
      await this.page!.fill('#passwordField', cred.password);
      await this.randomDelay(500, 1000);
      await this.page!.click('button[type="submit"]');
      await this.page!.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});

      await this.log('info', `Naukri: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      const applyBtn = this.page!.locator('button:has-text("Apply"), a:has-text("Apply Now")').first();
      if (!(await applyBtn.isVisible().catch(() => false))) {
        await this.log('warn', `Naukri: Apply button not found for "${job.title}"`);
        return false;
      }
      await applyBtn.click();
      await this.randomDelay(2000, 4000);

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
