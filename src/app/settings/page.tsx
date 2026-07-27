'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Key, Bot, Save, RefreshCw, Plus, Trash2,
  Eye, EyeOff, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Credential {
  id: string;
  platform: string;
  email: string;
  password: string;
  isActive: boolean;
  lastLogin?: string;
}

interface AppSettings {
  automation_schedule: string;
  max_applications_per_run: string;
  min_match_score: string;
  auto_apply_enabled: string;
  gemini_model: string;
}

const PLATFORMS = ['naukri', 'shine', 'monster', 'instahire'];
const platformLabels: Record<string, string> = {
  naukri: 'Naukri',
  shine: 'Shine',
  monster: 'Monster India',
  instahire: 'InstaHyre',
};
const platformColors: Record<string, string> = {
  naukri: 'badge-naukri',
  shine: 'badge-shine',
  monster: 'badge-monster',
  instahire: 'badge-instahire',
};

function CredentialCard({
  cred,
  onToggle,
  onDelete,
}: {
  cred: Credential;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="glass" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className={`badge ${platformColors[cred.platform] ?? 'badge-applied'}`} style={{ minWidth: 80, justifyContent: 'center' }}>
        {platformLabels[cred.platform] ?? cred.platform}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{cred.email}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{showPwd ? '(stored encrypted)' : '••••••••'}</span>
          <button onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
            {showPwd ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
          {cred.lastLogin && (
            <span style={{ marginLeft: 8 }}>Last login: {new Date(cred.lastLogin).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {cred.isActive
          ? <CheckCircle size={14} color="hsl(142,70%,55%)" />
          : <XCircle size={14} color="rgba(255,255,255,0.25)" />}
        <button
          onClick={() => onToggle(cred.id, !cred.isActive)}
          className="btn-secondary"
          style={{ fontSize: 12, padding: '5px 12px' }}
        >
          {cred.isActive ? 'Disable' : 'Enable'}
        </button>
        <button
          onClick={() => onDelete(cred.id)}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', color: 'hsl(4,85%,65%)' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function AddCredentialForm({ onAdded }: { onAdded: () => void }) {
  const [platform, setPlatform] = useState('naukri');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSaving(true);
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, email, password }),
      });
      if (res.ok) {
        toast.success(`${platformLabels[platform]} credentials saved`);
        setEmail('');
        setPassword('');
        onAdded();
      } else {
        toast.error('Failed to save credentials');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#e2e8f0',
    fontSize: 14, outline: 'none',
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</label>
        <select value={platform} onChange={e => setPlatform(e.target.value)} className="input" style={{ cursor: 'pointer' }}>
          {PLATFORMS.map(p => <option key={p} value={p} style={{ background: '#1a1a2e' }}>{platformLabels[p]}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
        <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...inputStyle, paddingRight: 36 }}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}>
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', whiteSpace: 'nowrap' }}>
        {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
        Add
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    automation_schedule: '0 */6 * * *',
    max_applications_per_run: '20',
    min_match_score: '60',
    auto_apply_enabled: 'true',
    gemini_model: 'gemini-1.5-flash',
  });
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchCredentials = useCallback(async () => {
    setLoadingCreds(true);
    try {
      const res = await fetch('/api/credentials');
      if (res.ok) setCredentials(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingCreds(false); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCredentials(); fetchSettings(); }, [fetchCredentials, fetchSettings]);

  const toggleCredential = async (id: string, isActive: boolean) => {
    await fetch(`/api/credentials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    setCredentials(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
    toast.success(isActive ? 'Credential enabled' : 'Credential disabled');
  };

  const deleteCredential = async (id: string) => {
    await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
    setCredentials(prev => prev.filter(c => c.id !== id));
    toast.success('Credential deleted');
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('Settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Network error');
    }
    setSavingSettings(false);
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 28px', marginBottom: 24,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: '#c4b5fd', marginBottom: 20,
    paddingBottom: 10, borderBottom: '1px solid rgba(139,92,246,0.2)',
    display: 'flex', alignItems: 'center', gap: 8,
  };

  return (
    <div style={{ padding: '32px', maxWidth: 900 }} className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Settings ⚙️</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Configure platforms, automation, and AI preferences</p>
      </div>

      {/* Platform Credentials */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Key size={16} /> Platform Credentials</div>

        {loadingCreds ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'hsl(258,90%,66%)' }} />
          </div>
        ) : (
          <>
            {credentials.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
                No credentials added yet. Add platform credentials below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {credentials.map(cred => (
                  <CredentialCard key={cred.id} cred={cred} onToggle={toggleCredential} onDelete={deleteCredential} />
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: credentials.length > 0 ? 4 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                Add New Credential
              </div>
              <AddCredentialForm onAdded={fetchCredentials} />
            </div>

            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: 'hsl(38,95%,65%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={12} />
                Passwords are encrypted using AES-256 before storage. Session cookies are refreshed automatically.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Automation Settings */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Bot size={16} /> Automation Settings</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* Schedule */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Schedule (cron expression)
            </label>
            <input
              className="input"
              value={settings.automation_schedule}
              onChange={e => setSettings(s => ({ ...s, automation_schedule: e.target.value }))}
              placeholder="0 */6 * * *"
            />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Default: every 6 hours. Use crontab.guru to build expressions.
            </div>
          </div>

          {/* Max applications */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Max Applications per Run
            </label>
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={settings.max_applications_per_run}
              onChange={e => setSettings(s => ({ ...s, max_applications_per_run: e.target.value }))}
            />
          </div>

          {/* Min match score */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Min Match Score ({settings.min_match_score}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.min_match_score}
              onChange={e => setSettings(s => ({ ...s, min_match_score: e.target.value }))}
              style={{ width: '100%', accentColor: 'hsl(258,90%,66%)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          {/* Auto apply toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Auto-Apply
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setSettings(s => ({ ...s, auto_apply_enabled: s.auto_apply_enabled === 'true' ? 'false' : 'true' }))}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: settings.auto_apply_enabled === 'true' ? 'hsl(142,70%,45%)' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: settings.auto_apply_enabled === 'true' ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                }} />
              </button>
              <span style={{ fontSize: 13, color: settings.auto_apply_enabled === 'true' ? 'hsl(142,70%,55%)' : 'rgba(255,255,255,0.4)' }}>
                {settings.auto_apply_enabled === 'true' ? 'Enabled — bot will auto-submit applications' : 'Disabled — jobs scored but not applied'}
              </span>
            </div>
          </div>

          {/* Gemini model */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gemini Model
            </label>
            <select
              className="input"
              value={settings.gemini_model}
              onChange={e => setSettings(s => ({ ...s, gemini_model: e.target.value }))}
              style={{ cursor: 'pointer' }}
            >
              <option value="gemini-1.5-flash" style={{ background: '#1a1a2e' }}>Gemini 1.5 Flash (Fast)</option>
              <option value="gemini-1.5-pro" style={{ background: '#1a1a2e' }}>Gemini 1.5 Pro (Accurate)</option>
              <option value="gemini-2.0-flash" style={{ background: '#1a1a2e' }}>Gemini 2.0 Flash (Latest)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {savingSettings ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Gemini API */}
      <div style={cardStyle}>
        <div style={sectionTitle}><Settings size={16} /> Environment</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          Set these in your <code style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: 12 }}>.env</code> file:
        </div>
        <div style={{ marginTop: 14, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '14px 18px', fontFamily: 'monospace', fontSize: 12, color: '#a5f3fc', lineHeight: 2 }}>
          <div><span style={{ color: '#94a3b8' }}># Database</span></div>
          <div>DATABASE_URL=<span style={{ color: '#86efac' }}>"file:./prisma/dev.db"</span></div>
          <div style={{ marginTop: 6 }}><span style={{ color: '#94a3b8' }}># Gemini AI</span></div>
          <div>GEMINI_API_KEY=<span style={{ color: '#86efac' }}>"your-gemini-api-key"</span></div>
          <div style={{ marginTop: 6 }}><span style={{ color: '#94a3b8' }}># Encryption</span></div>
          <div>ENCRYPTION_KEY=<span style={{ color: '#86efac' }}>"32-char-secret-key-change-this!!"</span></div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Get your Gemini API key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'hsl(258,90%,75%)' }}>aistudio.google.com</a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } select.input option { background: #1a1a2e; }`}</style>
    </div>
  );
}
