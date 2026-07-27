'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Play, RefreshCw, Bot, CheckCircle, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronRight, Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: string;
  platforms: string[];
  jobsFound: number;
  jobsApplied: number;
  errors: string[];
}

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  running: <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', color: 'hsl(195,85%,55%)' }} />,
  completed: <CheckCircle size={14} color="hsl(142,70%,55%)" />,
  failed: <XCircle size={14} color="hsl(4,85%,60%)" />,
};

const levelColors: Record<string, string> = {
  info: 'rgba(255,255,255,0.6)',
  warn: 'hsl(38,95%,65%)',
  error: 'hsl(4,85%,65%)',
};

const levelBg: Record<string, string> = {
  info: 'transparent',
  warn: 'rgba(245,158,11,0.05)',
  error: 'rgba(239,68,68,0.06)',
};

function formatDuration(start: string, end?: string): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function RunCard({ run, onClick, expanded }: { run: AutomationRun; onClick: () => void; expanded: boolean }) {
  return (
    <div
      className="glass"
      style={{ cursor: 'pointer', overflow: 'hidden' }}
      onClick={onClick}
    >
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          {statusIcon[run.status] ?? <Clock size={14} />}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
              Run {run.id.slice(0, 8)}…
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {new Date(run.startedAt).toLocaleString('en-IN')} · {formatDuration(run.startedAt, run.completedAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'hsl(195,85%,55%)' }}>{run.jobsFound}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>found</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'hsl(142,70%,55%)' }}>{run.jobsApplied}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>applied</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {run.platforms.map(p => (
              <span key={p} className={`badge badge-${p}`} style={{ fontSize: 10 }}>{p}</span>
            ))}
          </div>
          {expanded ? <ChevronDown size={14} style={{ opacity: 0.4 }} /> : <ChevronRight size={14} style={{ opacity: 0.4 }} />}
        </div>
      </div>

      {run.errors.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', padding: '10px 20px', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'hsl(4,85%,65%)' }}>
            <AlertCircle size={11} />
            {run.errors.length} error{run.errors.length > 1 ? 's' : ''}: {run.errors[0].slice(0, 80)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutomationPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/run');
      if (res.ok) setRuns(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  // Poll for active runs
  useEffect(() => {
    const hasRunning = runs.some(r => r.status === 'running');
    if (!hasRunning) return;
    const t = setInterval(fetchRuns, 5000);
    return () => clearInterval(t);
  }, [runs, fetchRuns]);

  const fetchLogs = async (runId: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/automation/logs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };

  useEffect(() => {
    if (expandedRunId) fetchLogs(expandedRunId);
  }, [expandedRunId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Poll logs if run is active
  useEffect(() => {
    if (!expandedRunId) return;
    const run = runs.find(r => r.id === expandedRunId);
    if (!run || run.status !== 'running') return;
    const t = setInterval(() => fetchLogs(expandedRunId), 3000);
    return () => clearInterval(t);
  }, [expandedRunId, runs]);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/automation/run', { method: 'POST' });
      if (res.ok) {
        const { runId } = await res.json();
        toast.success('Automation started!');
        await fetchRuns();
        setExpandedRunId(runId);
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to start');
      }
    } catch {
      toast.error('Network error');
    }
    setRunning(false);
  };

  const activeRun = runs.find(r => r.status === 'running');

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>
            Automation 🤖
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Control your AI job application engine
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={fetchRuns} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={triggerRun}
            disabled={running || !!activeRun}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {running || activeRun
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
              : <><Play size={13} /> Run Now</>}
          </button>
        </div>
      </div>

      {/* Active run status */}
      {activeRun && (
        <div className="glass animate-pulse-glow" style={{
          padding: '16px 20px', marginBottom: 24,
          border: '1px solid rgba(6,182,212,0.3)',
          background: 'rgba(6,182,212,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Activity size={18} color="hsl(195,85%,55%)" style={{ animation: 'spin-slow 3s linear infinite' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(195,85%,55%)' }}>
              Automation Running
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Run {activeRun.id.slice(0, 8)}… · Started {new Date(activeRun.startedAt).toLocaleTimeString()}
            </div>
          </div>
          <button onClick={() => setExpandedRunId(activeRun.id)} className="btn-secondary" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px' }}>
            View Logs
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: expandedRunId ? '380px 1fr' : '1fr', gap: 20 }}>
        {/* Run history */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>
            Run History
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'hsl(258,90%,66%)' }} />
            </div>
          ) : runs.length === 0 ? (
            <div className="glass" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Bot size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No runs yet. Click "Run Now" to start.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {runs.map(run => (
                <RunCard
                  key={run.id}
                  run={run}
                  expanded={expandedRunId === run.id}
                  onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Logs panel */}
        {expandedRunId && (
          <div className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Logs — Run {expandedRunId.slice(0, 8)}…
              </div>
              {logsLoading && <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />}
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
              {logs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', padding: '20px 0' }}>Waiting for logs…</div>
              ) : (
                logs.map((log, i) => (
                  <div key={log.id ?? i} style={{
                    padding: '3px 6px', borderRadius: 4, marginBottom: 2,
                    background: levelBg[log.level],
                    color: levelColors[log.level],
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <span style={{ opacity: 0.4, fontSize: 10, whiteSpace: 'nowrap', marginTop: 1 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ opacity: 0.6, fontSize: 10, whiteSpace: 'nowrap', marginTop: 1, textTransform: 'uppercase', minWidth: 32 }}>
                      {log.level}
                    </span>
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
