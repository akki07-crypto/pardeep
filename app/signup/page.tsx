'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { BookOpen, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { College } from '../../lib/supabase';

export default function SignupPage() {
  const { setCurrentUserById, colleges: fallbackColleges } = useApp();
  const router = useRouter();

  const [colleges, setColleges] = useState<College[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch registered colleges on load
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await fetch('/api/auth?action=colleges');
        if (!res.ok) throw new Error('Failed to fetch colleges');
        const data = await res.json();
        setColleges(data.length > 0 ? data : fallbackColleges);
      } catch (err) {
        // Fallback to static context colleges if db connection simulation is blank
        setColleges(fallbackColleges);
      }
    };
    fetchColleges();
  }, [fallbackColleges]);

  // Find currently selected college details
  const activeCollege = colleges.find(c => c.id === selectedCollegeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !selectedCollegeId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          fullName,
          email,
          password,
          collegeId: selectedCollegeId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess(true);
      
      // Auto login
      setTimeout(() => {
        localStorage.setItem('academic_hub_current_user_id', data.id);
        setCurrentUserById(data.id);
        router.push('/');
      }, 1500);

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
        maxWidth: '460px',
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
            Join AcademicHub
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Register as a student inside the network</p>
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

        {/* Success Alert */}
        {success && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            fontSize: '0.8rem',
            color: 'var(--success)'
          }}>
            <CheckCircle size={16} />
            <span>Registration successful! Redirecting you...</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Full Name
            </label>
            <input 
              type="text" 
              placeholder="e.g., Rahul Sharma" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Select Institution / College
            </label>
            <select 
              value={selectedCollegeId}
              onChange={e => setSelectedCollegeId(e.target.value)}
              required
              style={{ padding: '12px' }}
            >
              <option value="">Choose your college...</option>
              {colleges.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              College Institutional Email
            </label>
            <input 
              type="email" 
              placeholder="e.g., name@college.domain" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {/* Dynamic Gate Domain Tip */}
            {activeCollege && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--primary)' }}>
                <Info size={12} />
                <span>Verification Gate active. Email must end in: <strong>@{activeCollege.domain}</strong></span>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
              Password
            </label>
            <input 
              type="password" 
              placeholder="Min 6 characters" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', height: '42px' }}
            disabled={loading || success}
          >
            {loading ? 'Creating Account...' : 'Register Profile (+10 Pts)'}
          </button>
        </form>

        {/* Login redirection */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '16px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already registered? </span>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
