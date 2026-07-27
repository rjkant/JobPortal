'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, RefreshCw, ExternalLink, Briefcase, MapPin, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface Job {
  id: string;
  platform: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  skills: string[];
  description: string;
  applyUrl: string;
  postedAt?: string;
  matchScore: number;
  fetchedAt: string;
  applied: boolean;
}

const platformColors: Record<string, string> = {
  naukri: 'badge-naukri',
  shine: 'badge-shine',
  monster: 'badge-monster',
  instahire: 'badge-instahire',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    '#6b7280';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '2px 10px',
    }}>
      <TrendingUp size={11} color={color} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}%</span>
    </div>
  );
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return '';
  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${n}`;
  if (min && max) return `₹${fmt(min)}–${fmt(max)} PA`;
  if (min) return `₹${fmt(min)}+ PA`;
  return `Up to ₹${fmt(max!)} PA`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        platform,
        minScore: String(minScore),
        search,
      });
      const res = await fetch(`/api/jobs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, platform, minScore, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [platform, minScore, search]);

  return (
    <div style={{ padding: '32px', maxWidth: 1200 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Job Browser 🔍
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          {total} jobs found — sorted by AI match score
        </p>
      </div>

      {/* Filters */}
      <div className="glass" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search jobs, companies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Platform */}
        <select
          className="input"
          style={{ width: 140, cursor: 'pointer' }}
          value={platform}
          onChange={e => setPlatform(e.target.value)}
        >
          <option value="all">All Platforms</option>
          <option value="naukri">Naukri</option>
          <option value="shine">Shine</option>
          <option value="monster">Monster</option>
          <option value="instahire">InstaHire</option>
        </select>

        {/* Min Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            Min score:
          </span>
          <select
            className="input"
            style={{ width: 90, cursor: 'pointer' }}
            value={minScore}
            onChange={e => setMinScore(parseInt(e.target.value))}
          >
            <option value={0}>Any</option>
            <option value={50}>50%+</option>
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
          </select>
        </div>

        <button onClick={fetchJobs} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Job List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(258,90%,66%)', margin: '0 auto' }} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No jobs found</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {total === 0
              ? 'Run the automation to scrape jobs from your platforms.'
              : 'Try adjusting your filters.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(job => (
            <div
              key={job.id}
              className="glass"
              style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{job.title}</span>
                    {job.applied && (
                      <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                        Applied
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                    {job.company}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {job.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        <MapPin size={11} /> {job.location}
                      </span>
                    )}
                    {job.experience && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        <Clock size={11} /> {job.experience}
                      </span>
                    )}
                    {formatSalary(job.salaryMin, job.salaryMax) && (
                      <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <ScoreBadge score={job.matchScore} />
                  <span className={`badge ${platformColors[job.platform] ?? 'badge-applied'}`}>
                    {job.platform}
                  </span>
                </div>
              </div>

              {/* Skills */}
              {job.skills.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {job.skills.slice(0, 6).map(skill => (
                    <span key={skill} style={{
                      background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                      color: '#67e8f9', borderRadius: 20, padding: '2px 10px', fontSize: 11,
                    }}>
                      {skill}
                    </span>
                  ))}
                  {job.skills.length > 6 && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+{job.skills.length - 6}</span>
                  )}
                </div>
              )}

              {/* Expanded description */}
              {expandedId === job.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 16 }}>
                    {job.description}
                  </p>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
                  >
                    <ExternalLink size={13} /> Apply on {job.platform}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <button
            className="btn-secondary"
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Page {page} of {pages}
          </span>
          <button
            className="btn-secondary"
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
            disabled={page === pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select.input option { background: #1a1a2e; }
      `}</style>
    </div>
  );
}
