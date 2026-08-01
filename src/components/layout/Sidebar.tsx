'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, User, Briefcase, FileCheck,
  Bot, Settings, Zap, Activity, LogOut, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/profile',      label: 'My Profile',   icon: User },
  { href: '/jobs',         label: 'Job Browser',  icon: Briefcase },
  { href: '/applications', label: 'Applications', icon: FileCheck },
  { href: '/automation',   label: 'Automation',   icon: Bot },
  { href: '/settings',     label: 'Settings',     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser({ name: data.name, email: data.email }); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast.success('Signed out');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside style={{
      width: '230px',
      minHeight: '100vh',
      background: 'rgba(255,255,255,0.02)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 14px',
      gap: '4px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'linear-gradient(135deg, hsl(258,90%,66%), hsl(195,85%,55%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139,92,246,0.4)'
        }}>
          <Zap size={18} color="white" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px' }}>JobPilot</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>AI Job Engine</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Status pill */}
      <div style={{
        padding: '12px',
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '12px',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Activity size={14} color='hsl(142,70%,55%)' />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(142,70%,55%)' }}>Bot Active</span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Next run in ~6h</div>
      </div>

      {/* User menu */}
      {user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: menuOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              cursor: 'pointer',
              color: 'white',
              textAlign: 'left',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, hsl(258,80%,60%), hsl(195,80%,50%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white',
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <ChevronDown size={14} color="rgba(255,255,255,0.3)" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '6px',
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,80,80,0.9)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
