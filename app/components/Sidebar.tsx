'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Compass, Library, ArrowLeftRight, Trophy, Gift, Users, Calendar } from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab } = useApp();

  const menuItems = [
    { id: 'explorer', label: 'Book Explorer', icon: <Compass size={18} /> },
    { id: 'bookshelf', label: 'My Bookshelf', icon: <Library size={18} /> },
    { id: 'swap', label: 'Swap Lounge', icon: <ArrowLeftRight size={18} /> },
    { id: 'donation', label: 'Donation Drive', icon: <Gift size={18} /> },
    { id: 'study', label: 'Co-Study Rooms', icon: <Users size={18} /> },
    { id: 'events', label: 'Campus Events', icon: <Calendar size={18} /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
  ];

  return (
    <aside className="glass-panel" style={{
      width: '260px',
      margin: '16px 0 16px 24px',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      height: 'calc(100vh - 32px)',
      boxShadow: 'var(--shadow-md)'
    }}>
      {/* Platform Title Info */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
          Dashboard Menu
        </h3>
        <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Smart Campus Network</p>
      </div>

      {/* Menu items list */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'none',
                border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
              }}
              className={!isActive ? 'sidebar-item-hover' : ''}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Support Info */}
      <div style={{
        padding: '12px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--surface-border)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <strong>Onboarded Colleges:</strong> 3 active campuses. Use profile switcher to test boundaries.
      </div>

      {/* Local hover simulation styling helper */}
      <style jsx global>{`
        .sidebar-item-hover:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          color: var(--text-main) !important;
          transform: translateX(2px);
        }
      `}</style>
    </aside>
  );
}
