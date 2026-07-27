import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { prisma } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/encryption';

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  skills: string[];
  description: string;
  applyUrl: string;
  postedAt?: Date;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected runId: string;
  protected log: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;

  constructor(
    runId: string,
    logFn: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>
  ) {
    this.runId = runId;
    this.log = logFn;
  }

  abstract get platform(): string;
  abstract scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]>;
  abstract applyToJob(job: ScrapedJob, coverLetter: string): Promise<boolean>;

  protected async launchBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // Try to restore saved session cookies
    const credential = await prisma.platformCredential.findFirst({
      where: { platform: this.platform, isActive: true },
    });

    let cookiesToAdd: Parameters<import('playwright').BrowserContext['addCookies']>[0] | null = null;
    if (credential?.sessionCookies) {
      try {
        cookiesToAdd = JSON.parse(credential.sessionCookies);
      } catch {
        // ignore malformed cookies
      }
    }

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });

    if (cookiesToAdd) {
      await this.context.addCookies(cookiesToAdd);
    }

    this.page = await this.context.newPage();

    // Block images and fonts to speed up scraping
    await this.page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot}', route =>
      route.abort()
    );
  }

  protected async saveSessionCookies(): Promise<void> {
    if (!this.context) return;
    try {
      const cookies = await this.context.cookies();
      const credential = await prisma.platformCredential.findFirst({
        where: { platform: this.platform, isActive: true },
      });
      if (credential) {
        await prisma.platformCredential.update({
          where: { id: credential.id },
          data: {
            sessionCookies: JSON.stringify(cookies),
            lastLogin: new Date(),
          },
        });
      }
    } catch (err) {
      console.error('Failed to save session cookies:', err);
    }
  }

  protected async getCredential(): Promise<{ email: string; password: string } | null> {
    const cred = await prisma.platformCredential.findFirst({
      where: { platform: this.platform, isActive: true },
    });
    if (!cred) return null;
    return { email: cred.email, password: decrypt(cred.password) };
  }

  async closeBrowser(): Promise<void> {
    await this.saveSessionCookies();
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  protected async randomDelay(min = 1000, max = 3000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min) + min);
    await new Promise(r => setTimeout(r, ms));
  }

  protected parseSalary(salaryStr: string): { min?: number; max?: number } {
    // "15-25 LPA" → { min: 1500000, max: 2500000 }
    const m = salaryStr.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
    if (m) {
      const multiplier = salaryStr.toLowerCase().includes('lpa') ? 100000 : 1;
      return {
        min: Math.round(parseFloat(m[1]) * multiplier),
        max: Math.round(parseFloat(m[2]) * multiplier),
      };
    }
    return {};
  }
}
