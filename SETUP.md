# JobPilot Setup Guide

## 1. Install dependencies (already done)
```bash
npm install
```

## 2. Configure your .env
Edit `.env` and fill in your Gemini API key:
```
GEMINI_API_KEY="your-key-from-aistudio.google.com"
ENCRYPTION_KEY="any-32-char-random-string-here!!"
```

## 3. Create the database
```bash
npx prisma db push
```

## 4. Run the app
```bash
npm run dev
```

Open http://localhost:3000

## 5. First-time setup in the UI
1. **Profile** → Fill in your name, skills, desired roles, preferred locations
2. **Settings** → Add your Naukri/Shine/Monster/InstaHire credentials
3. **Automation** → Click "Run Now" to start your first job search

## How it works
- Every 6 hours (configurable), the bot logs into your job platforms using Playwright
- It searches for jobs matching your desired roles and location
- Gemini AI scores each job 0–100 based on your profile match
- Jobs above your threshold (default 60%) get an AI-generated cover letter and are auto-applied
- All activity is logged and visible in the Automation tab
