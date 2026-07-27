import { BaseScraper, ScrapedJob } from './base';

export class NaukriScraper extends BaseScraper {
  get platform() {
    return 'naukri';
  }

  async scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]> {
    await this.launchBrowser();
    const jobs: ScrapedJob[] = [];

    try {
      const cred = await this.getCredential();
      if (!cred) {
        await this.log('error', 'Naukri: No credentials found');
        return jobs;
      }

      await this.log('info', 'Naukri: Navigating to login page');
      await this.page!.goto('https://www.naukri.com/nlogin/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Check if already logged in
      const isLoggedIn = await this.page!
        .locator('[class*="naukri-logo"]')
        .isVisible()
        .catch(() => false);

      if (!isLoggedIn) {
        await this.log('info', 'Naukri: Logging in');
        await this.page!.fill('#usernameField', cred.email);
        await this.randomDelay(500, 1000);
        await this.page!.fill('#passwordField', cred.password);
        await this.randomDelay(500, 1000);
        await this.page!.click('button[type="submit"]');
        await this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });
      }

      await this.log('info', `Naukri: Searching for "${keywords.join(', ')}" in "${location}"`);

      for (const keyword of keywords.slice(0, 3)) {
        const searchUrl = `https://www.naukri.com/${encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, '-'))}-jobs-in-${encodeURIComponent(location.toLowerCase().replace(/\s+/g, '-'))}?experience=0&jobAge=7`;

        await this.page!.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomDelay(2000, 4000);

        const jobCards = await this.page!.locator('article.jobTuple').all();
        await this.log('info', `Naukri: Found ${jobCards.length} job cards for "${keyword}"`);

        for (const card of jobCards.slice(0, 15)) {
          try {
            const titleEl = card.locator('.title');
            const companyEl = card.locator('.comp-name');
            const locationEl = card.locator('.locWdth');
            const expEl = card.locator('.expwdth');
            const salaryEl = card.locator('.salary');
            const linkEl = card.locator('a.title');
            const skillsEl = card.locator('.tags li');

            const title = (await titleEl.textContent())?.trim() ?? '';
            const company = (await companyEl.textContent())?.trim() ?? '';
            const loc = (await locationEl.textContent())?.trim() ?? '';
            const exp = (await expEl.textContent())?.trim() ?? '';
            const salaryStr = (await salaryEl.textContent())?.trim() ?? '';
            const applyUrl = (await linkEl.getAttribute('href')) ?? '';
            const externalId = applyUrl.match(/(\d+)/)?.[1] ?? Math.random().toString(36).slice(2);

            const skillTexts = await skillsEl.allTextContents();
            const skills = skillTexts.map(s => s.trim()).filter(Boolean);

            const salary = this.parseSalary(salaryStr);

            if (title && company && applyUrl) {
              jobs.push({
                externalId,
                title,
                company,
                location: loc,
                experience: exp,
                skills,
                description: `${title} at ${company}. ${exp ? `Experience: ${exp}.` : ''} Skills: ${skills.join(', ')}`,
                applyUrl: applyUrl.startsWith('http') ? applyUrl : `https://www.naukri.com${applyUrl}`,
                ...salary,
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
      await this.log('info', `Naukri: Applying to "${job.title}" at ${job.company}`);
      await this.page!.goto(job.applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(2000, 3000);

      // Look for "Apply" button
      const applyBtn = this.page!.locator('button:has-text("Apply"), a:has-text("Apply Now")').first();
      const btnVisible = await applyBtn.isVisible().catch(() => false);

      if (!btnVisible) {
        await this.log('warn', `Naukri: Apply button not found for "${job.title}"`);
        return false;
      }

      await applyBtn.click();
      await this.randomDelay(2000, 4000);

      // Handle multi-step application if needed
      const nextBtn = this.page!.locator('button:has-text("Next"), button:has-text("Submit")').first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      if (nextVisible) {
        await nextBtn.click();
        await this.randomDelay(1500, 2500);
      }

      // Cover letter field
      const coverField = this.page!.locator('textarea[name*="cover"], textarea[placeholder*="cover"]').first();
      const coverVisible = await coverField.isVisible().catch(() => false);
      if (coverVisible) {
        await coverField.fill(coverLetter);
        await this.randomDelay(500, 1000);
      }

      // Final submit
      const submitBtn = this.page!.locator('button:has-text("Submit"), button:has-text("Apply")').first();
      const submitVisible = await submitBtn.isVisible().catch(() => false);
      if (submitVisible) {
        await submitBtn.click();
        await this.randomDelay(2000, 3000);
        await this.log('info', `Naukri: Successfully applied to "${job.title}" at ${job.company}`);
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
