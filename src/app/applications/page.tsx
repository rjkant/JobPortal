'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileCheck, RefreshCw, ChevronDown, MapPin, Building2, Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  updatedAt: string;
  tailoredResume?: string;
  coverLetter?: string;
  notes?: string;
  job: {
    title: string;
    company: string;
    location: string;
    platform: string;
    matchScore: number;
    skills: string[];
  };
}

const STATUSES = ['applied', 'viewed', 'shortlisted', 'interview', 'offer', 'rejected'];

const statusColors: Record<string, string> = {
  applied: 'badge-applied',
  viewed: 'badge-viewed',
  shortlisted: 'badge-shortlisted',
  interview: 'badge-interview',
  offer: 'badge-offer',
  rejected: 'badge-rejected',
};

const platformColors: Record<string, string> = {
  naukri: 'badge-naukri',
  shine: 'badge-shine',
  monster: 'badge-monster',
  instahire: 'badge-instahire',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NotesEditor({ appId, initial, onSaved }: { appId: string; initial?: string; onSaved: (notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? '');

  const save = async () => {
    await fetch(`/api/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value }),
    });
    onSaved(value);
    setEditing(false);
    toast.success('Notes saved');
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>
          {value || 'No notes'}
        </span>
        <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}>
          <Edit3 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={3}
        className="input"
        style={{ fontSize: 12, resize: 'vertical' }}
        placeholder="Add notes…"
        autoFocus
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} className="btn-primary" style={{ fontSize: 12, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Save size={12} /> Save
        </button>
        <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeTab === 'all' ? '/api/applications' : `/api/applications?status=${activeTab}`;
      const res = await fetch(url);
      if (res.ok) setApplications(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    );
    toast.success(`Status updated to ${status}`);
  };

  const updateNotes = (id: string, notes: string) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, notes } : a));
  };

  // Counts per status for tabs
  const counts: Record<string, number> = { all: applications.length };
  for (const app of applications) {
    counts[app.status] = (counts[app.status] ?? 0) + 1;
  }

  const displayedApps = activeTab === 'all' ? applications : applications.filter(a => a.status === activeTab);

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
          Applications 📋
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          {applications.length} total applications tracked
        </p>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: activeTab === s ? 'hsl(258,90%,66%)' : 'rgba(255,255,255,0.06)',
              color: activeTab === s ? 'white' : 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {counts[s] != null && (
              <span style={{
                background: activeTab === s ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '0px 7px', fontSize: 11,
              }}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
        <button onClick={fetch_} className="btn-secondary" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'hsl(258,90%,66%)', margin: '0 auto' }} />
        </div>
      ) : displayedApps.length === 0 ? (
        <div className="glass" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <FileCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No applications</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            {activeTab === 'all' ? 'Run automation to start applying to jobs.' : `No ${activeTab} applications yet.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayedApps.map(app => (
            <div key={app.id} className="glass" style={{ padding: '18px 22px' }}>
              {/* Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{app.job.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                      <Building2 size={12} /> {app.job.company}
                    </span>
                    {app.job.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        <MapPin size={11} /> {app.job.location}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                      Applied {formatDate(app.appliedAt)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span className={`badge ${platformColors[app.job.platform] ?? 'badge-applied'}`}>
                    {app.job.platform}
                  </span>

                  {/* Status dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={app.status}
                      onChange={e => updateStatus(app.id, e.target.value)}
                      className={`badge ${statusColors[app.status] ?? 'badge-applied'}`}
                      style={{ cursor: 'pointer', appearance: 'none', paddingRight: 20, background: 'transparent', border: 'none', outline: 'none', fontWeight: 600, fontSize: 12 }}
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s} style={{ background: '#1a1a2e', color: 'white' }}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>

                  <button
                    onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    className="btn-secondary"
                    style={{ padding: '5px 10px', fontSize: 12 }}
                  >
                    {expandedId === app.id ? 'Less' : 'More'}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {expandedId === app.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Cover Letter */}
                    {app.coverLetter && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          Cover Letter
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxHeight: 120, overflow: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                          {app.coverLetter}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Notes
                      </div>
                      <NotesEditor appId={app.id} initial={app.notes} onSaved={n => updateNotes(app.id, n)} />
                    </div>
                  </div>

                  {/* Skills */}
                  {app.job.skills.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {app.job.skills.map(s => (
                        <span key={s} style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#67e8f9', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
