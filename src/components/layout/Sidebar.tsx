'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, User, Briefcase, FileCheck,
  Bot, Settings, Zap, Activity
} from 'lucide-react';

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
        marginTop: 'auto',
        padding: '12px',
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Activity size={14} color='hsl(142,70%,55%)' />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(142,70%,55%)' }}>Bot Active</span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          Next run in ~6h
        </div>
      </div>
    </aside>
  );
}
