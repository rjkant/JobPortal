import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface JobMatchResult {
  score: number;          // 0-100
  reasons: string[];      // why it's a good match
  mismatches: string[];   // why it might not be ideal
  tailoredSummary: string; // AI-tailored professional summary for this job
}

export interface CoverLetterResult {
  coverLetter: string;
}

/** Score a job listing against the user's profile */
export async function scoreJobMatch(
  profile: {
    fullName: string;
    currentRole: string;
    skills: string[];
    desiredRoles: string[];
    totalExperience: number;
    preferredLocs: string[];
    summary: string;
  },
  job: {
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    experience?: string;
  }
): Promise<JobMatchResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert recruitment AI. Analyze how well this job matches the candidate.

CANDIDATE PROFILE:
- Name: ${profile.fullName}
- Current Role: ${profile.currentRole}
- Total Experience: ${profile.totalExperience} years
- Skills: ${profile.skills.join(', ')}
- Desired Roles: ${profile.desiredRoles.join(', ')}
- Preferred Locations: ${profile.preferredLocs.join(', ')}
- Summary: ${profile.summary}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Required Experience: ${job.experience || 'Not specified'}
- Required Skills: ${job.skills.join(', ')}
- Description: ${job.description.slice(0, 1500)}

Respond ONLY with valid JSON in this exact format:
{
  "score": <number 0-100>,
  "reasons": [<up to 3 short strings explaining why it's a good match>],
  "mismatches": [<up to 2 short strings explaining potential gaps>],
  "tailoredSummary": "<a 2-sentence tailored professional summary for this specific job>"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(jsonStr) as JobMatchResult;
  } catch {
    return {
      score: 50,
      reasons: ['Profile skills partially match job requirements'],
      mismatches: [],
      tailoredSummary: profile.summary,
    };
  }
}

/** Generate a cover letter for a job application */
export async function generateCoverLetter(
  profile: {
    fullName: string;
    currentRole: string;
    skills: string[];
    totalExperience: number;
    summary: string;
  },
  job: {
    title: string;
    company: string;
    description: string;
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Write a concise, professional cover letter (3 paragraphs, ~150 words) for:

Candidate: ${profile.fullName}, ${profile.currentRole}, ${profile.totalExperience} years experience
Skills: ${profile.skills.slice(0, 8).join(', ')}

Job: ${job.title} at ${job.company}
Job description excerpt: ${job.description.slice(0, 800)}

Write as if you are the candidate. Be specific and compelling. Do not include placeholders or [brackets]. Output only the cover letter text.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Dear Hiring Manager,

I am excited to apply for the ${job.title} position at ${job.company}. With ${profile.totalExperience} years of experience as a ${profile.currentRole}, I bring strong expertise in ${profile.skills.slice(0, 3).join(', ')}.

${profile.summary}

I would welcome the opportunity to discuss how my background aligns with your team's needs.

Regards,
${profile.fullName}`;
  }
}
