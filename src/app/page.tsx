'use client';

import { useEffect, useState } from 'react';
import {
  Send, TrendingUp, Eye, MessageSquare, Award,
  Clock, Play, BarChart2, Briefcase, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalApplications: number;
  appliedThisWeek: number;
  shortlisted: number;
  interviews: number;
  successRate: number;
  topPlatforms: { platform: string; count: number }[];
  recentApplications: {
    id: string; status: string; appliedAt: string;
    job: { title: string; company: string; platform: string };
  }[];
  nextRunAt: string;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="glass" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: color, opacity: 0.08, filter: 'blur(20px)'
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '10px',
          background: color.replace('hsl', 'hsla').replace(')', ', 0.15)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function Countdown({ targetTime }: { targetTime: string }) {
  const [diff, setDiff] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const delta = Math.max(0, target - now);
      setDiff({
        h: Math.floor(delta / 3600000),
        m: Math.floor((delta % 3600000) / 60000),
        s: Math.floor((delta % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetTime]);

  const Unit = ({ n, label }: { n: number; label: string }) => (
    <div className="countdown-unit">
      <div className="countdown-number gradient-text">{String(n).padStart(2, '0')}</div>
      <div className="countdown-label">{label}</div>
    </div>
  );

  return (
    <div className="countdown">
      <Unit n={diff.h} label="hrs" />
      <span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>:</span>
      <Unit n={diff.m} label="min" />
      <span style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>:</span>
      <Unit n={diff.s} label="sec" />
    </div>
  );
}

const platformColors: Record<string, string> = {
  naukri: 'badge-naukri', shine: 'badge-shine',
  monster: 'badge-monster', instahire: 'badge-instahire',
};
const statusColors: Record<string, string> = {
  applied: 'badge-applied', viewed: 'badge-viewed', shortlisted: 'badge-shortlisted',
  interview: 'badge-interview', offer: 'badge-offer', rejected: 'badge-rejected',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' });
      if (res.ok) {
        const { runId } = await res.json();
        toast.success(`Automation started! Run ID: ${runId.slice(0, 8)}...`);
      } else {
        toast.error('Failed to start automation');
      }
    } catch {
      toast.error('Network error');
    }
    setRunning(false);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(258,90%,66%)' }} />
      </div>
    );
  }

  const s = stats ?? {
    totalApplications: 0, appliedThisWeek: 0, shortlisted: 0, interviews: 0,
    successRate: 0, topPlatforms: [], recentApplications: [],
    nextRunAt: new Date(Date.now() + 6 * 3600000).toISOString()
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1280px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Dashboard 🚀
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
            Your AI job application engine — running 24/7
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={fetchStats} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={triggerRun} disabled={running} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {running
              ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
              : <><Play size={14} /> Run Now</>}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <StatCard icon={Send}       label="Total Applications"  value={s.totalApplications} color="hsl(258,90%,66%)" />
        <StatCard icon={TrendingUp} label="Applied This Week"   value={s.appliedThisWeek}   color="hsl(195,85%,55%)" sub="last 7 days" />
        <StatCard icon={Eye}        label="Shortlisted"         value={s.shortlisted}        color="hsl(142,70%,45%)" />
        <StatCard icon={MessageSquare} label="Interviews"       value={s.interviews}         color="hsl(38,95%,55%)" />
        <StatCard icon={Award}      label="Success Rate"        value={`${s.successRate}%`}  color="hsl(142,70%,45%)" sub="shortlist/applied" />
        <StatCard icon={BarChart2}  label="Active Platforms"    value={s.topPlatforms.length} color="hsl(280,85%,65%)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Recent Applications */}
        <div className="glass" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Applications</h2>
            <a href="/applications" style={{ fontSize: '12px', color: 'hsl(258,90%,75%)', textDecoration: 'none' }}>
              View all →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {s.recentApplications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                <Briefcase size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div>No applications yet.</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Run Now" to start applying!</div>
              </div>
            ) : s.recentApplications.map(app => (
              <div key={app.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{app.job.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{app.job.company}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`badge ${platformColors[app.job.platform] ?? 'badge-applied'}`}>
                    {app.job.platform}
                  </span>
                  <span className={`badge ${statusColors[app.status] ?? 'badge-applied'}`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Next Run Countdown */}
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={16} color="hsl(258,90%,66%)" />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Next Auto-Run</span>
            </div>
            <Countdown targetTime={s.nextRunAt} />
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
              Runs every 6 hours automatically
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="glass" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Platform Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {s.topPlatforms.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
              ) : s.topPlatforms.map(({ platform, count }) => {
                const pct = s.totalApplications > 0 ? (count / s.totalApplications) * 100 : 0;
                return (
                  <div key={platform}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className={`badge ${platformColors[platform] ?? ''}`}>{platform}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2, width: `${pct}%`,
                        background: 'linear-gradient(90deg, hsl(258,90%,66%), hsl(195,85%,55%))',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
