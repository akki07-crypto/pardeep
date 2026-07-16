'use client';

import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import { mockDb } from '../lib/supabase';
import { Search, Sparkles, MessageSquare, ArrowRight, UserPlus, Info, Check, X, ShieldAlert, Award, Users } from 'lucide-react';

export default function LibraryHub() {
  const { 
    currentUser, 
    books, 
    colleges, 
    activeTab, 
    transactions, 
    returnBook, 
    swapRequests, 
    updateSwapStatus, 
    proposeSwap, 
    users 
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCampus, setSelectedCampus] = useState<string>('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Mobile Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Swap Form State
  const [swapSenderBook, setSwapSenderBook] = useState('');
  const [swapReceiverBook, setSwapReceiverBook] = useState('');
  const [swapReceiverId, setSwapReceiverId] = useState('');

  // AI Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Academic Library Assistant. Ask me about your due dates, available books, or current fines.' }
  ]);

  // Donation Form State
  const [donateTitle, setDonateTitle] = useState('');
  const [donateAuthor, setDonateAuthor] = useState('');
  const [donateCategory, setDonateCategory] = useState<'Academic' | 'Competitive' | 'Comics' | 'Novels'>('Academic');
  const [donateIsbn, setDonateIsbn] = useState('');
  const [donateCoverUrl, setDonateCoverUrl] = useState('');
  const [donateCopies, setDonateCopies] = useState(1);

  // Study Rooms State
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomChatInput, setRoomChatInput] = useState('');
  const [roomMessages, setRoomMessages] = useState<Array<{ user: string; text: string }>>([
    { user: 'System', text: 'Welcome! Share questions, doubt snippets or recommend reference articles.' }
  ]);

  // Campus Events State
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);

  if (!currentUser) return null;

  // Filter books
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || book.category === selectedCategory;
    
    // Multi-tenant check: standard students can only see their own college books
    const matchesCampus = currentUser.role === 'librarian'
      ? (selectedCampus === 'All' || 
         (selectedCampus === 'mine' && book.college_id === currentUser.college_id) || 
         book.college_id === selectedCampus)
      : (book.college_id === currentUser.college_id);

    const matchesAvailability = !availableOnly || book.available_copies > 0;
    return matchesSearch && matchesCategory && matchesCampus && matchesAvailability;
  });

  // Calculate AI Recommendations based on current user's profile
  const getAIRecommendations = () => {
    // If not a librarian, filter base books by student's college
    const baseBooks = currentUser.role === 'librarian'
      ? books
      : books.filter(b => b.college_id === currentUser.college_id);

    if (currentUser.id === 'u1') {
      return baseBooks.filter(b => b.category === 'Academic' || b.category === 'Competitive').slice(0, 3);
    } else if (currentUser.id === 'u2' || currentUser.id === 'u3') {
      return baseBooks.filter(b => b.category === 'Comics' || b.category === 'Novels').slice(0, 3);
    }
    return baseBooks.slice(0, 3);
  };

  const aiRecs = getAIRecommendations();

  // Active user Borrows
  const activeBorrows = transactions.filter(t => t.user_id === currentUser.id && t.returned_at === null);
  const totalFine = activeBorrows.reduce((sum, t) => sum + t.penalty_amount, 0);

  // Freeze check: book overdue by more than 7 days (7 * 24 * 60 * 60 * 1000 MS)
  const isAccountFrozen = activeBorrows.some(t => 
    new Date(t.due_date).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  // Group student points by college to calculate inter-campus rankings
  const collegePointsMap: { [key: string]: number } = {};
  colleges.forEach(c => {
    collegePointsMap[c.id] = 0;
  });
  users.forEach(u => {
    if (collegePointsMap[u.college_id] !== undefined) {
      collegePointsMap[u.college_id] += u.points;
    }
  });
  const rankedColleges = colleges
    .map(c => ({
      ...c,
      total_points: collegePointsMap[c.id] || 0
    }))
    .sort((a, b) => b.total_points - a.total_points);

  // Swap matches
  const receivedSwaps = swapRequests.filter(s => s.receiver_id === currentUser.id);
  const sentSwaps = swapRequests.filter(s => s.sender_id === currentUser.id);

  // Chat query processor
  const handleSendMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customMsg || chatInput).trim();
    if (!userMsg) return;

    const newMsgs = [...chatMessages, { sender: 'user' as const, text: userMsg }];
    setChatMessages(newMsgs);
    if (!customMsg) setChatInput('');

    // Set temporary AI thinking state
    setChatMessages(prev => [...prev, { sender: 'ai' as const, text: 'Thinking...' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          userId: currentUser.id,
          history: chatMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await response.json();
      const aiReply = data.reply || data.error || "I'm having trouble processing that right now.";
      
      setChatMessages(prev => {
        const withoutThinking = prev.slice(0, -1);
        return [...withoutThinking, { sender: 'ai' as const, text: aiReply }];
      });
    } catch (err: any) {
      setChatMessages(prev => {
        const withoutThinking = prev.slice(0, -1);
        return [...withoutThinking, { sender: 'ai' as const, text: "Failed to connect to library assistant. Please try again." }];
      });
    }
  };

  const handleProposeSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAccountFrozen) {
      alert("Your account is frozen due to an overdue book return (> 7 days). Swap proposal blocked.");
      return;
    }
    if (!swapSenderBook || !swapReceiverBook || !swapReceiverId) return;
    proposeSwap(swapSenderBook, swapReceiverBook, swapReceiverId);
    // Reset forms
    setSwapSenderBook('');
    setSwapReceiverBook('');
    setSwapReceiverId('');
    alert('Swap request proposed successfully!');
  };

  const handleUpdateUser = async (targetUserId: string, points?: number, isVerified?: boolean) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateUser',
          targetUserId,
          points,
          isVerified,
          requesterId: currentUser.id
        })
      });
      if (!res.ok) throw new Error('Update failed');
      alert('User profile updated successfully!');
      window.location.reload();
    } catch {
      // Offline fallback state updates
      const usersList = [...users];
      const idx = usersList.findIndex(u => u.id === targetUserId);
      if (idx !== -1) {
        if (points !== undefined) usersList[idx].points = points;
        if (isVerified !== undefined) usersList[idx].is_verified = isVerified;
        mockDb.saveUsers(usersList);
      }
      alert('[SIMULATION] User profile updated successfully!');
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Panel Content */}
      <div className="main-content">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Dynamic Screen Renders */}
        <main className="main-container">
          
          {isAccountFrozen && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              padding: '16px 20px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '20px'
            }}>
              <ShieldAlert size={20} />
              <div>
                <strong>Account Frozen:</strong> You have an overdue book return that is more than 7 days past the due date. Borrowing privileges and peer swaps are suspended. Please return the book and clear any outstanding fines at the library counter.
              </div>
            </div>
          )}
          
          {/* TAB 1: BOOK EXPLORER DASHBOARD */}
          {activeTab === 'explorer' && (
            <>
              {/* Header Greeting Banner */}
              <div className="glass-panel responsive-banner" style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
              }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Welcome Back, {currentUser.full_name}!</h2>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Access academic resources across partnered institutes. You are verified via your institutional email.
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
                  <span>College Domain Gate Active</span>
                </div>
              </div>

              {/* AI Powered Recommendations Carousels */}
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(168,85,247,0.2)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    AI Recommended For You
                  </h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Based on borrow history)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {aiRecs.map(book => (
                    <BookCard key={`ai-${book.id}`} book={book} />
                  ))}
                </div>
              </div>

              {/* Search & Dynamic Filters Row */}
              <div className="glass-panel filters-container">
                {/* Search Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, minWidth: '240px', background: 'rgba(0,0,0,0.12)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '6px 12px' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by title, author, or subject..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', padding: '6px 0', width: '100%' }}
                  />
                </div>

                {/* Campus Filter */}
                {currentUser.role === 'librarian' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Campus:</span>
                    <select 
                      value={selectedCampus}
                      onChange={e => setSelectedCampus(e.target.value)}
                      style={{ padding: '8px', fontSize: '0.8rem' }}
                    >
                      <option value="All">All Campuses</option>
                      <option value="mine">My College Only</option>
                      {colleges.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Genre Categories */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Genre:</span>
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{ padding: '8px', fontSize: '0.8rem' }}
                  >
                    <option value="All">All Genres</option>
                    <option value="Academic">Academic</option>
                    <option value="Competitive">Competitive</option>
                    <option value="Comics">Comics</option>
                    <option value="Novels">Novels</option>
                  </select>
                </div>

                {/* Available switch toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <input 
                    type="checkbox" 
                    checked={availableOnly}
                    onChange={e => setAvailableOnly(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <span>Available Only</span>
                </label>
              </div>

              {/* Books Grid display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Explore Resources Catalogue</h3>
                {filteredBooks.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No books match your filters.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                    {filteredBooks.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: MY BOOKSHELF / DIGITAL LOCKER */}
          {activeTab === 'bookshelf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Dues & late fees tracker */}
              <div className="glass-panel responsive-banner" style={{
                borderLeft: `6px solid ${totalFine > 0 ? 'var(--danger)' : 'var(--success)'}`,
                background: totalFine > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {totalFine > 0 ? (
                    <ShieldAlert size={32} style={{ color: 'var(--danger)' }} />
                  ) : (
                    <Check size={32} style={{ color: 'var(--success)' }} />
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Penalty & Overdue Calculator</h3>
                    <p style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      {totalFine > 0 
                        ? `You have outstanding fines of ${totalFine} INR. Please return overdue volumes to avoid suspension.`
                        : 'Congratulations! You have no outstanding fines.'}
                    </p>
                  </div>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: totalFine > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {totalFine} INR
                </div>
              </div>

              {/* Borrowed books tracker lists */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Currently Checked Out Books</h3>
                {activeBorrows.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '20px 0' }}>No books currently checked out.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeBorrows.map(tx => {
                      const book = books.find(b => b.id === tx.book_id);
                      if (!book) return null;
                      const isOverdue = tx.status === 'overdue';
                      return (
                        <div key={tx.id} className="responsive-banner" style={{
                          padding: '16px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.01)',
                        }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <img src={book.cover_image_url} style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '4px' }} />
                            <div>
                              <strong style={{ fontSize: '0.9rem', display: 'block' }}>{book.title}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {new Date(tx.due_date).toLocaleDateString()}</span>
                              {isOverdue && (
                                <span style={{ marginLeft: '12px', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase' }}>
                                  [Overdue - Fine Accumulating]
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Settle Return */}
                          <button 
                            onClick={() => returnBook(tx.id)}
                            className="btn btn-secondary"
                            style={{ border: '1px solid var(--success)', color: 'var(--success)' }}
                          >
                            Return & Settle
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Locker Reading List Favorites */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>My Library Reading List</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed var(--surface-border)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '120px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reading list features allow pinning wishlist titles directly from Explorer cards.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SWAP LOUNGE P2P EXCHANGE */}
          {activeTab === 'swap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Proposal Submission Panel */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Propose a Peer Swap Exchanger</h3>
                <form onSubmit={handleProposeSwap} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>My Book (To Offer):</label>
                    <select 
                      value={swapSenderBook} 
                      onChange={e => setSwapSenderBook(e.target.value)}
                      required
                      style={{ padding: '10px' }}
                    >
                      <option value="">Select your book</option>
                      {books.filter(b => b.college_id === currentUser.college_id).map(b => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Peer Book (To Get):</label>
                    <select 
                      value={swapReceiverBook} 
                      onChange={e => setSwapReceiverBook(e.target.value)}
                      required
                      style={{ padding: '10px' }}
                    >
                      <option value="">Select peer book</option>
                      {books.filter(b => currentUser.role === 'librarian' || b.college_id === currentUser.college_id).map(b => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Target Student:</label>
                    <select 
                      value={swapReceiverId} 
                      onChange={e => setSwapReceiverId(e.target.value)}
                      required
                      style={{ padding: '10px' }}
                    >
                      <option value="">Select recipient student</option>
                      {users.filter(u => u.id !== currentUser.id && (currentUser.role === 'librarian' || u.college_id === currentUser.college_id)).map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isAccountFrozen}
                    className="btn btn-primary" 
                    style={{ 
                      height: '42px', 
                      justifyContent: 'center',
                      background: isAccountFrozen ? 'rgba(239, 68, 68, 0.2)' : undefined,
                      color: isAccountFrozen ? 'var(--danger)' : undefined,
                      border: isAccountFrozen ? '1px solid var(--danger)' : undefined,
                      cursor: isAccountFrozen ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isAccountFrozen ? "Account Frozen" : "Propose Swap (+20 Pts)"}
                  </button>
                </form>
              </div>

              {/* Active swap requests */}
              <div className="swap-panels-grid">
                
                {/* Received Offers */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>Received Swap Proposals</h3>
                  {receivedSwaps.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No trade proposals received yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {receivedSwaps.map(s => {
                        const sender = users.find(u => u.id === s.sender_id);
                        const offer = books.find(b => b.id === s.sender_book_id);
                        const target = books.find(b => b.id === s.receiver_book_id);
                        return (
                          <div key={s.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.01)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From: {sender?.full_name}</span>
                            <div style={{ fontSize: '0.82rem', margin: '6px 0' }}>
                              Offer: <strong>{offer?.title}</strong> <br />
                              For: <strong>{target?.title}</strong>
                            </div>
                            {s.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button 
                                  onClick={() => updateSwapStatus(s.id, 'completed')}
                                  className="btn" 
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', color: '#fff' }}
                                >
                                  Accept & Swap
                                </button>
                                <button 
                                  onClick={() => updateSwapStatus(s.id, 'rejected')}
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: s.status === 'completed' ? 'var(--success)' : 'var(--danger)' }}>
                                {s.status}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sent Offers */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px' }}>Proposed Outbound Requests</h3>
                  {sentSwaps.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No trade proposals sent yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {sentSwaps.map(s => {
                        const recv = users.find(u => u.id === s.receiver_id);
                        const offer = books.find(b => b.id === s.sender_book_id);
                        const target = books.find(b => b.id === s.receiver_book_id);
                        return (
                          <div key={s.id} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.01)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To: {recv?.full_name}</span>
                            <div style={{ fontSize: '0.82rem', margin: '6px 0' }}>
                              Giving: <strong>{offer?.title}</strong> <br />
                              Requesting: <strong>{target?.title}</strong>
                            </div>
                            <span style={{
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              textTransform: 'uppercase',
                              color: s.status === 'pending' ? 'var(--warning)' : s.status === 'completed' ? 'var(--success)' : 'var(--danger)'
                            }}>
                              Status: {s.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARD & REWARDS */}
          {activeTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. College Rankings (Inter-College Leadership) */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px', marginBottom: '20px' }}>
                  <Award size={22} style={{ color: 'var(--warning)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Campus Leadership Rankings</h3>
                </div>
                
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Showing which partnered colleges are leading the Hub network in total contributor points.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {rankedColleges.map((c, index) => {
                    const placeColor = index === 0 ? 'var(--warning)' : index === 1 ? '#a1a1aa' : index === 2 ? '#b45309' : 'var(--text-muted)';
                    return (
                      <div key={c.id} style={{
                        padding: '16px 20px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--surface-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: placeColor }}>
                            #{index + 1}
                          </span>
                          <div>
                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>{c.name}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.subdomain_prefix.toUpperCase()} Domain</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          {c.total_points} Pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Top Student Contributors Leaderboard */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px', marginBottom: '20px' }}>
                  <Users size={22} style={{ color: 'var(--secondary)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Student Leaderboard Rankings</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...users].sort((a,b) => b.points - a.points).map((u, index) => {
                    const coll = colleges.find(c => c.id === u.college_id);
                    const isCurrent = u.id === currentUser.id;
                    
                    return (
                      <div key={u.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        background: isCurrent ? 'var(--primary-glow)' : 'rgba(255,255,255,0.01)',
                        border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--surface-border)'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, width: '24px', textAlign: 'center', color: index === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            #{index + 1}
                          </span>
                          <img src={u.avatar_url} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                          <div>
                            <strong style={{ fontSize: '0.9rem', display: 'block' }}>
                              {u.full_name} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginLeft: '6px' }}>(You)</span>}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coll?.name || 'Partner Institute'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          {u.points} Pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Librarian User Management panel */}
              {currentUser.role === 'librarian' && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>User Management Console ⚙️</span>
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '500px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--surface-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px' }}>User Details</th>
                          <th style={{ padding: '8px' }}>Role</th>
                          <th style={{ padding: '8px' }}>Points</th>
                          <th style={{ padding: '8px' }}>Verification Status</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => {
                          const coll = colleges.find(c => c.id === u.college_id);
                          return (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={u.avatar_url} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                                <div>
                                  <strong style={{ display: 'block' }}>{u.full_name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email} ({coll?.subdomain_prefix.toUpperCase()})</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 8px', textTransform: 'capitalize' }}>{u.role}</td>
                              <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>{u.points} Pts</td>
                              <td style={{ padding: '10px 8px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  background: u.is_verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: u.is_verified ? 'var(--success)' : 'var(--danger)'
                                }}>
                                  {u.is_verified ? 'Verified ✓' : 'Unverified'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button 
                                    onClick={() => handleUpdateUser(u.id, u.points + 10, u.is_verified)}
                                    className="btn btn-secondary" 
                                    style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                    title="Add +10 points"
                                  >
                                    +10 Pts
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateUser(u.id, Math.max(0, u.points - 10), u.is_verified)}
                                    className="btn btn-secondary" 
                                    style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                    title="Subtract -10 points"
                                  >
                                    -10 Pts
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateUser(u.id, u.points, !u.is_verified)}
                                    className="btn" 
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.7rem',
                                      background: u.is_verified ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                      color: u.is_verified ? 'var(--danger)' : 'var(--success)'
                                    }}
                                  >
                                    {u.is_verified ? 'Unverify' : 'Verify'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: BOOK DONATION DRIVE */}
          {activeTab === 'donation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel responsive-banner" style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)',
              }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Book Donation Drive & Hub 🎁</h2>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Donate your old textbooks or novels to expand your campus library stock. Earn 50 points immediately!
                  </p>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--success)'
                }}>
                  +50 Points per Book
                </div>
              </div>

              <div className="donation-grid">
                {/* Donation Form */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>List a Book to Donate</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!donateTitle || !donateAuthor) return;
                    try {
                      const coverUrl = donateCoverUrl.trim() || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&auto=format&fit=crop&q=80';
                      const body = {
                        title: donateTitle,
                        author: donateAuthor,
                        category: donateCategory,
                        isbn: donateIsbn || `ISBN-${Math.floor(100000 + Math.random() * 900000)}`,
                        cover_image_url: coverUrl,
                        college_id: currentUser.college_id,
                        total_copies: Number(donateCopies)
                      };
                      const res = await fetch('/api/books', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                      });
                      if (!res.ok) throw new Error('Donation failed');
                      alert(`Thank you! "${donateTitle}" has been added to your campus inventory. You earned 50 points!`);
                      window.location.reload();
                    } catch {
                      alert(`[SIMULATION] Thank you! "${donateTitle}" has been added to your campus inventory. You earned 50 points!`);
                      window.location.reload();
                    }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div className="donation-form-row">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Book Title:</label>
                        <input type="text" placeholder="e.g. Concrete Mathematics" value={donateTitle} onChange={e => setDonateTitle(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Author:</label>
                        <input type="text" placeholder="e.g. Knuth & Patashnik" value={donateAuthor} onChange={e => setDonateAuthor(e.target.value)} required />
                      </div>
                    </div>

                    <div className="donation-form-row">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Category:</label>
                        <select value={donateCategory} onChange={e => setDonateCategory(e.target.value as any)} style={{ padding: '10px' }}>
                          <option value="Academic">Academic</option>
                          <option value="Competitive">Competitive</option>
                          <option value="Comics">Comics</option>
                          <option value="Novels">Novels</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>ISBN (Optional):</label>
                        <input type="text" placeholder="e.g. 978-0201558029" value={donateIsbn} onChange={e => setDonateIsbn(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Copies:</label>
                        <input type="number" min={1} max={5} value={donateCopies} onChange={e => setDonateCopies(Number(e.target.value))} required />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Cover Image URL (Optional):</label>
                      <input type="text" placeholder="e.g. https://images.unsplash.com/... (or leave blank for default)" value={donateCoverUrl} onChange={e => setDonateCoverUrl(e.target.value)} />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ height: '42px', justifyContent: 'center', marginTop: '8px' }}>
                      Donate book & Credit points
                    </button>
                  </form>
                </div>

                {/* Donation Stats */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Donation Leaderboards</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--surface-border)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>Total Books Donated Network-wide</span>
                      <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>48 Books</strong>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--surface-border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Point Multiplier Active:</strong> Donating books grants +50 points which updates your standing rank on the Leaderboard.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CO-STUDY COLLABORATION ROOMS */}
          {activeTab === 'study' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel responsive-banner" style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
              }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Co-Study Virtual Rooms 👥</h2>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Join live virtual study rooms based on subjects or exam paths. Clear doubts with peers instantly.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => alert('Custom study room creation is limited to college librarians.')}>
                  Create Room
                </button>
              </div>

              {/* Study Rooms Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {[
                  { id: 'sr1', title: 'Data Structures & Algorithms Hub', description: 'Cracking code complexities, array structures, trees and graph implementations.', members: 5, max: 8, college: 'IIT Delhi' },
                  { id: 'sr2', title: 'GATE CS Exam Preparation 2026', description: 'Solving syllabus questions, compiler designs, DBMS and architecture theory.', members: 14, max: 20, college: 'All Colleges' },
                  { id: 'sr3', title: 'AI & Machine Learning Group', description: 'Discussing neural networks, PyTorch modules, and model fine-tunings.', members: 6, max: 10, college: 'IIT Bombay' },
                  { id: 'sr4', title: 'Novels & Fiction Reading Circle', description: 'Reviewing recent updates, classics, and share favorite paragraphs.', members: 3, max: 5, college: 'BITS Pilani' }
                ].map(room => {
                  const isJoined = joinedRooms.includes(room.id);
                  return (
                    <div key={room.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--surface-border)', width: 'fit-content' }}>
                        {room.college}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{room.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexGrow: 1 }}>{room.description}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        <span>Capacity: {room.members + (isJoined ? 1 : 0)} / {room.max} slots</span>
                        {isJoined ? (
                          <button onClick={() => setActiveRoomId(room.id)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem', background: 'var(--success)' }}>
                            Enter Chat
                          </button>
                        ) : (
                          <button onClick={() => {
                            setJoinedRooms([...joinedRooms, room.id]);
                            setActiveRoomId(room.id);
                          }} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                            Join Room
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Overlay for Rooms */}
              {activeRoomId && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.6)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)'
                }} onClick={() => setActiveRoomId(null)}>
                  <div className="glass-panel room-chat-modal-content" onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '16px', background: 'var(--primary-glow)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem' }}>Room Live Chat Panel</strong>
                      <button onClick={() => setActiveRoomId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                    </div>
                    <div style={{ flexGrow: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {roomMessages.map((m, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', borderRadius: '8px', background: m.user === 'System' ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.05)', border: '1px solid var(--surface-border)', fontSize: '0.78rem' }}>
                          <span style={{ fontWeight: 'bold', color: m.user === 'System' ? 'var(--text-muted)' : 'var(--primary)', display: 'block', marginBottom: '2px' }}>{m.user}:</span>
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!roomChatInput.trim()) return;
                      setRoomMessages([...roomMessages, { user: currentUser.full_name, text: roomChatInput.trim() }]);
                      setRoomChatInput('');
                    }} style={{ padding: '12px', display: 'flex', gap: '8px', borderTop: '1px solid var(--surface-border)' }}>
                      <input type="text" placeholder="Type a message..." value={roomChatInput} onChange={e => setRoomChatInput(e.target.value)} style={{ fontSize: '0.8rem' }} />
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>Send</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CAMPUS EVENTS CALENDAR */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel responsive-banner" style={{
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.08) 100%)',
              }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Campus Events & Seminars Calendar 📅</h2>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    Register for upcoming webinars, paper reviews, and college hackathons to boost your academic progress.
                  </p>
                </div>
                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                  +10 Points per Registration
                </div>
              </div>

              {/* Events Listings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {[
                  { id: 'ev1', title: 'Supabase Hacks: Building multi-tenant databases', date: 'July 20, 2026 (04:00 PM)', college: 'BITS Pilani', description: 'Deep dive session on implementing row-level security and connection pools.' },
                  { id: 'ev2', title: 'Guest Lecture: Recurrence Induction in Discrete Maths', date: 'July 25, 2026 (11:00 AM)', college: 'IIT Delhi', description: 'Special seminar by Dr. Amit Sen discussing induction strategies on recurrence relations.' },
                  { id: 'ev3', title: 'TechTalk: React 19 Server Actions & Suspense', date: 'August 02, 2026 (02:30 PM)', college: 'IIT Bombay', description: 'Exploring framework additions, caching, and server actions transitions.' }
                ].map(evt => {
                  const isRegistered = registeredEvents.includes(evt.id);
                  return (
                    <div key={evt.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600 }}>{evt.college}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{evt.date}</span>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{evt.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexGrow: 1 }}>{evt.description}</p>
                      
                      {isRegistered ? (
                        <button disabled className="btn" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', cursor: 'default', width: '100%', justifyContent: 'center' }}>
                          Registered ✓ (+10 Points credited)
                        </button>
                      ) : (
                        <button onClick={() => {
                          setRegisteredEvents([...registeredEvents, evt.id]);
                          currentUser.points += 10;
                          alert('Registered successfully! 10 points added to your account.');
                        }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          Register Event
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>

        {/* Dynamic Chatbot floating console */}
        <div className="ai-chatbot-container">
          {isChatOpen ? (
            <div className="glass-panel ai-chatbot-box">
              {/* Header */}
              <div style={{
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                padding: '12px 16px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <strong style={{ fontSize: '0.85rem' }}>AI Library Assistant</strong>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)} 
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Suggested Quick Questions */}
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--surface-border)',
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Quick Suggestions:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {[
                    "Timings?",
                    "Limits & Fines?",
                    "My books?",
                    "Earn points?"
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const fullQuestions: { [key: string]: string } = {
                          "Timings?": "What are the library timings?",
                          "Limits & Fines?": "What is my borrowing limit & fine rate?",
                          "My books?": "Show my currently borrowed books.",
                          "Earn points?": "How can I earn Contributor Points?"
                        };
                        handleSendMessage(undefined, fullQuestions[q]);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Body */}
              <div style={{ flexGrow: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatMessages.map((m, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      maxWidth: '85%',
                      fontSize: '0.8rem',
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      background: m.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: m.sender === 'user' ? '#fff' : 'var(--text-main)',
                      border: m.sender === 'ai' ? '1px solid var(--surface-border)' : 'none',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendMessage} style={{ padding: '12px', display: 'flex', gap: '8px', borderTop: '1px solid var(--surface-border)' }}>
                <input 
                  type="text" 
                  placeholder="Ask due dates, books info..." 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>
                  Send
                </button>
              </form>
            </div>
          ) : (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="btn btn-primary"
              style={{
                borderRadius: '50%',
                width: '56px',
                height: '56px',
                padding: 0,
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
              }}
            >
              <MessageSquare size={22} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
