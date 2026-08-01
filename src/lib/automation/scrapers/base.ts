import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

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
  protected userId: string;
  protected log: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;

  constructor(
    runId: string,
    userId: string,
    logFn: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>
  ) {
    this.runId = runId;
    this.userId = userId;
    this.log = logFn;
  }

  abstract get platform(): string;
  abstract scrapeJobs(keywords: string[], location: string): Promise<ScrapedJob[]>;
  abstract applyToJob(job: ScrapedJob, coverLetter: string): Promise<boolean>;

  protected async launchBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // Anti-detection: hide the fact that this is a bot
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // Try to restore saved session cookies for this user
    const credential = await prisma.platformCredential.findFirst({
      where: { userId: this.userId, platform: this.platform, isActive: true },
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    });

    // Stealth: mask webdriver properties before any page script runs
    await this.context.addInitScript(() => {
      // Hide navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // Spoof plugins (real browsers have plugins)
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      // Spoof languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-IN', 'en'],
      });
      // Remove Chrome automation flag
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      // @ts-ignore
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
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
        where: { userId: this.userId, platform: this.platform, isActive: true },
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
      where: { userId: this.userId, platform: this.platform, isActive: true },
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

  protected parseSalary(salaryStr: string): { salaryMin?: number; salaryMax?: number } {
    const m = salaryStr.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/);
    if (m) {
      const multiplier = salaryStr.toLowerCase().includes('lpa') ? 100000 : 1;
      return {
        salaryMin: Math.round(parseFloat(m[1]) * multiplier),
        salaryMax: Math.round(parseFloat(m[2]) * multiplier),
      };
    }
    return {};
  }
}
