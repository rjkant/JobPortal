'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  totalExperience: string;
  summary: string;
  skills: string[];
  desiredRoles: string[];
  preferredLocs: string[];
  expectedCTC: string;
  noticePeriod: string;
  linkedinUrl: string;
  resumeFileName?: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type: 'success' | 'error'; onClose: () => void; }
function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
      padding: '14px 22px', borderRadius: 12, fontWeight: 600, fontSize: 14,
      background: type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
      border: `1px solid ${type === 'success' ? '#10b981' : '#ef4444'}`,
      color: type === 'success' ? '#10b981' : '#ef4444',
      backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: 8, fontSize: 16 }}>×</button>
    </div>
  );
}

// ─── Tag Input ────────────────────────────────────────────────────────────────
interface TagInputProps { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string; }
function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState('');
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      const val = input.trim().replace(/,$/, '');
      if (val && !tags.includes(val)) onChange([...tags, val]);
      setInput('');
    }
  };
  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));
  return (
    <div style={{
      minHeight: 48, padding: '8px 10px', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, display: 'flex',
      flexWrap: 'wrap', gap: 6, alignItems: 'center',
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)',
          color: '#c4b5fd', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 500,
        }}>
          {tag}
          <button onClick={() => remove(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder || 'Type and press Enter'}
        style={{
          flex: 1, minWidth: 140, background: 'transparent', border: 'none', outline: 'none',
          color: '#e2e8f0', fontSize: 14, padding: '2px 4px',
        }}
      />
    </div>
  );
}

// ─── Input / Textarea helpers ─────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0',
  fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#c4b5fd', marginBottom: 18, paddingBottom: 8, borderBottom: '1px solid rgba(139,92,246,0.2)' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Preview Card ─────────────────────────────────────────────────────────────
function PreviewCard({ data }: { data: ProfileData }) {
  const initials = data.fullName ? data.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'JP';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28,
      position: 'sticky', top: 24,
    }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff',
        }}>{initials}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{data.fullName || 'Your Name'}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{data.currentRole || 'Your Role'}</div>
        {data.location && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>📍 {data.location}</div>}
      </div>
      {/* Contact */}
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.email && <span>✉ {data.email}</span>}
        {data.phone && <span>📞 {data.phone}</span>}
        {data.linkedinUrl && <a href={data.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>🔗 LinkedIn</a>}
      </div>
      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Summary</div>
          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{data.summary}</p>
        </div>
      )}
      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.skills.slice(0, 10).map(s => (
              <span key={s} style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{s}</span>
            ))}
            {data.skills.length > 10 && <span style={{ color: '#64748b', fontSize: 12 }}>+{data.skills.length - 10}</span>}
          </div>
        </div>
      )}
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {[
          { label: 'Experience', value: data.totalExperience ? `${data.totalExperience} yrs` : '—' },
          { label: 'Notice Period', value: data.noticePeriod || '—' },
          { label: 'Expected CTC', value: data.expectedCTC || '—' },
          { label: 'Resume', value: data.resumeFileName ? '✓ Uploaded' : 'Not uploaded' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginTop: 3 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [form, setForm] = useState<ProfileData>({
    fullName: '', email: '', phone: '', location: '',
    currentRole: '', totalExperience: '', summary: '',
    skills: [], desiredRoles: [], preferredLocs: [],
    expectedCTC: '', noticePeriod: '', linkedinUrl: '', resumeFileName: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch existing profile
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({ ...prev, ...data }));
        }
      } catch { /* network error — start with empty form */ }
      finally { setLoading(false); }
    })();
  }, []);

  const set = useCallback(<K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (fileRef.current?.files?.[0]) {
        // In a real app we'd upload separately; include filename as indicator
        payload.resumeFileName = fileRef.current.files[0].name;
      }
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast({ message: 'Profile saved successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: `Failed to save: ${(err as Error).message}`, type: 'error' });
    } finally { setSaving(false); }
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, marginBottom: 24,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ color: '#94a3b8' }}>Loading profile…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>My Profile</h1>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Keep your profile updated to get better job matches</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Personal Info */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Full Name">
                  <input style={inputStyle} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="John Doe" />
                </Field>
                <Field label="Email">
                  <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
                </Field>
                <Field label="Phone">
                  <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
                </Field>
                <Field label="Location">
                  <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Bangalore, India" />
                </Field>
                <Field label="LinkedIn URL">
                  <input style={inputStyle} value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </Field>
              </div>
            </div>

            {/* Professional Info */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Professional Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Current Role">
                  <input style={inputStyle} value={form.currentRole} onChange={e => set('currentRole', e.target.value)} placeholder="Senior Software Engineer" />
                </Field>
                <Field label="Total Experience (years)">
                  <input style={inputStyle} type="number" min={0} max={50} value={form.totalExperience} onChange={e => set('totalExperience', e.target.value)} placeholder="5" />
                </Field>
                <Field label="Expected CTC">
                  <input style={inputStyle} value={form.expectedCTC} onChange={e => set('expectedCTC', e.target.value)} placeholder="20 LPA" />
                </Field>
                <Field label="Notice Period">
                  <input style={inputStyle} value={form.noticePeriod} onChange={e => set('noticePeriod', e.target.value)} placeholder="30 days / Immediate" />
                </Field>
              </div>
              <Field label="Professional Summary">
                <textarea
                  style={{ ...inputStyle, height: 110, resize: 'vertical' }}
                  value={form.summary}
                  onChange={e => set('summary', e.target.value)}
                  placeholder="Write a brief summary of your professional background, key skills, and career goals…"
                />
              </Field>
            </div>

            {/* Skills & Preferences */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Skills & Preferences</div>
              <Field label="Skills (press Enter to add)">
                <TagInput tags={form.skills} onChange={tags => set('skills', tags)} placeholder="e.g. React, Node.js…" />
              </Field>
              <Field label="Desired Roles (press Enter to add)">
                <TagInput tags={form.desiredRoles} onChange={tags => set('desiredRoles', tags)} placeholder="e.g. Full Stack Developer…" />
              </Field>
              <Field label="Preferred Locations (press Enter to add)">
                <TagInput tags={form.preferredLocs} onChange={tags => set('preferredLocs', tags)} placeholder="e.g. Bangalore, Remote…" />
              </Field>
            </div>

            {/* Resume Upload */}
            <div style={cardStyle}>
              <div style={sectionTitle}>Resume</div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed rgba(139,92,246,0.4)', borderRadius: 14, padding: '28px 20px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                  background: 'rgba(139,92,246,0.04)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)')}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>
                  {form.resumeFileName ? form.resumeFileName : 'Click to upload your resume'}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>PDF, DOC or DOCX — max 5 MB</div>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) set('resumeFileName', e.target.files[0].name); }} />
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '12px 36px', borderRadius: 12, border: 'none',
                  background: saving ? 'rgba(139,92,246,0.4)' : 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {saving && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />}
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Preview ── */}
          <PreviewCard data={form} />
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus, textarea:focus { border-color: rgba(139,92,246,0.6) !important; }`}</style>
    </div>
  );
}
