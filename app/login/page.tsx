'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { BookOpen, ShieldAlert, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { setCurrentUserById, theme } = useApp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to explorer
    const userId = localStorage.getItem('academic_hub_current_user_id');
    if (userId) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store credentials and set context
      localStorage.setItem('academic_hub_current_user_id', data.id);
      setCurrentUserById(data.id);
      
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-gradient)'
    }}>
      <div className="glass-panel auth-panel" style={{
        maxWidth: '420px',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            padding: '12px',
            borderRadius: '12px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px var(--primary-glow)'
          }}>
            <BookOpen size={28} />
          </div>
          <h2 className="glow-accent" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em', marginTop: '8px' }}>
            AcademicHub
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Login to access campus resources</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            fontSize: '0.8rem',
            color: 'var(--danger)'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              College Email Address
            </label>
            <input 
              type="email" 
              placeholder="e.g., student@iitd.ac.in" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Password
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', height: '42px' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        {/* Signup redirection */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '16px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register Now
          </Link>
        </div>

        {/* Demo Helper box */}
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--surface-border)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: 600 }}>
            <Sparkles size={12} style={{ color: 'var(--warning)' }} />
            <span>Demo Credentials</span>
          </div>
          Email: <code>rahul.sharma@iitd.ac.in</code> <br />
          Password: <code>password123</code>
        </div>
      </div>
    </div>
  );
}
