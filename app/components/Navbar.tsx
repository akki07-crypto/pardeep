'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Bell, Sun, Moon, Award, User, ChevronDown, Check, ShieldAlert, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { 
    currentUser, 
    users, 
    colleges, 
    setCurrentUserById, 
    theme, 
    toggleTheme, 
    notifications, 
    dismissNotification,
    logout
  } = useApp();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const activeCollege = colleges.find(c => c.id === currentUser?.college_id);
  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Determine User Badges based on points
  const getBadgeName = (pts: number) => {
    if (pts >= 1000) return 'Sage 👑';
    if (pts >= 500) return 'Trade Master 💎';
    if (pts >= 250) return 'Scholar 🎓';
    if (pts >= 100) return 'Bookworm 📚';
    return 'Novice 🌱';
  };

  return (
    <nav className="navbar navbar-container glass-panel">
      {/* Brand Logo & College Tenancy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Sidebar Hamburger Toggle */}
        <button 
          onClick={onMenuClick}
          className="btn btn-secondary mobile-menu-btn"
          style={{ padding: '8px', borderRadius: '8px' }}
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            padding: '8px',
            borderRadius: '10px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <span className="glow-accent navbar-brand-text" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            AcademicHub
          </span>
        </div>
        
        {/* Dynamic Tenant College Badge */}
        {activeCollege && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--surface-border)',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            <img 
              src={activeCollege.logo_url} 
              alt={activeCollege.name} 
              style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <span className="navbar-college-name">{activeCollege.name}</span>
          </div>
        )}
      </div>

      {/* Right Action Icons & Profile Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Leaderboard Points Display */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'var(--primary-glow)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--primary)'
          }} title={`Badge: ${getBadgeName(currentUser.points)}`}>
            <Award size={16} />
            <span>{currentUser.points} Pts</span>
            <span className="navbar-points-badge-text" style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '4px' }}>
              ({getBadgeName(currentUser.points).split(' ')[0]})
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary" 
          style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Center */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false); }}
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={18} />
            {unreadNotifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--danger)',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifDropdown && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '320px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 101,
              animation: 'slideIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                <h4 style={{ fontSize: '0.9rem' }}>Notifications</h4>
              </div>
              {notifications.length === 0 ? (
                <p style={{ fontSize: '0.8rem', textAlign: 'center', padding: '12px 0' }}>No notifications yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: n.type === 'penalty_alert' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                      borderLeft: `4px solid ${n.type === 'penalty_alert' ? 'var(--danger)' : 'var(--primary)'}`,
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'start'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {n.type === 'penalty_alert' && <ShieldAlert size={14} style={{ color: 'var(--danger)' }} />}
                          <strong style={{ fontSize: '0.8rem', display: 'block' }}>{n.title}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</span>
                      </div>
                      <button 
                        onClick={() => dismissNotification(n.id)}
                        style={{ background: 'none', color: 'var(--text-muted)', padding: '2px', cursor: 'pointer' }}
                        title="Dismiss"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Identity Switcher */}
        {currentUser && (
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false); }}
              className="navbar-profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px'
              }}
            >
              <img 
                src={currentUser.avatar_url} 
                alt={currentUser.full_name} 
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)' }} 
              />
              <div className="navbar-profile-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Dropdown list for Tenant Switcher */}
            {showUserDropdown && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                width: '280px',
                padding: '8px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 101,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--surface-border)', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Switch Tenant Identity
                  </span>
                </div>
                {users.map(u => {
                  const coll = colleges.find(c => c.id === u.college_id);
                  return (
                    <div 
                      key={u.id}
                      onClick={() => {
                        setCurrentUserById(u.id);
                        setShowUserDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: u.id === currentUser.id ? 'var(--primary-glow)' : 'transparent',
                        color: u.id === currentUser.id ? 'var(--primary)' : 'var(--text-main)',
                      }}
                    >
                      <img 
                        src={u.avatar_url} 
                        alt={u.full_name} 
                        style={{ width: '28px', height: '28px', borderRadius: '50%' }} 
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.full_name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {coll?.name} ({u.role})
                        </span>
                      </div>
                      {u.id === currentUser.id && <Check size={14} />}
                    </div>
                  );
                })}
                <div style={{
                  padding: '6px 12px',
                  borderTop: '1px solid var(--surface-border)',
                  marginTop: '4px',
                  display: 'flex'
                }}>
                  <button 
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="btn btn-secondary" 
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '6px 12px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </nav>
  );
}
