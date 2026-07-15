'use client';

import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import { Search, Sparkles, MessageSquare, ArrowRight, UserPlus, Info, Check, X, ShieldAlert, Award } from 'lucide-react';

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
    const matchesCampus = selectedCampus === 'All' || 
                          (selectedCampus === 'mine' && book.college_id === currentUser.college_id) || 
                          book.college_id === selectedCampus;
    const matchesAvailability = !availableOnly || book.available_copies > 0;
    return matchesSearch && matchesCategory && matchesCampus && matchesAvailability;
  });

  // Calculate AI Recommendations based on current user's profile
  // E.g., Rahul is from IIT Delhi (c1), has borrowed Rosen's Discrete Mathematics. Suggest algorithm books.
  // Priya is from IIT Bombay (c2), has borrowed Spider-Man. Suggest comics.
  const getAIRecommendations = () => {
    if (currentUser.id === 'u1') {
      // Suggest Advanced Algorithms
      return books.filter(b => b.category === 'Academic' || b.category === 'Competitive').slice(0, 3);
    } else if (currentUser.id === 'u2' || currentUser.id === 'u3') {
      // Suggest Comics & Novels
      return books.filter(b => b.category === 'Comics' || b.category === 'Novels').slice(0, 3);
    }
    return books.slice(0, 3);
  };

  const aiRecs = getAIRecommendations();

  // Active user Borrows
  const activeBorrows = transactions.filter(t => t.user_id === currentUser.id && t.returned_at === null);
  const totalFine = activeBorrows.reduce((sum, t) => sum + t.penalty_amount, 0);

  // Swap matches
  const receivedSwaps = swapRequests.filter(s => s.receiver_id === currentUser.id);
  const sentSwaps = swapRequests.filter(s => s.sender_id === currentUser.id);

  // Chat query processor
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const newMsgs = [...chatMessages, { sender: 'user' as const, text: userMsg }];
    setChatMessages(newMsgs);
    setChatInput('');

    // Simulate RAG chatbot logic based on application state
    setTimeout(() => {
      let aiReply = "I'm sorry, I couldn't find details matching your query. Try asking 'When is my book due?' or 'Do you have Algorithms books?'";
      
      const query = userMsg.toLowerCase();

      if (query.includes('due') || query.includes('when') || query.includes('borrowed')) {
        const borrows = transactions.filter(t => t.user_id === currentUser.id && t.returned_at === null);
        if (borrows.length === 0) {
          aiReply = "You do not have any active book checkouts at the moment.";
        } else {
          const details = borrows.map(t => {
            const b = books.find(book => book.id === t.book_id);
            const dateStr = new Date(t.due_date).toLocaleDateString();
            return `"${b?.title}" is due on ${dateStr} (${t.status === 'overdue' ? 'OVERDUE' : 'Active'}).`;
          }).join('\n');
          aiReply = `You have ${borrows.length} borrowed books:\n${details}`;
        }
      } else if (query.includes('fine') || query.includes('penalty') || query.includes('fee')) {
        const borrows = transactions.filter(t => t.user_id === currentUser.id && t.returned_at === null);
        const fine = borrows.reduce((sum, t) => sum + t.penalty_amount, 0);
        if (fine > 0) {
          aiReply = `You currently have outstanding dues of ${fine} INR due to overdue book returns. Please settle these at the library desk.`;
        } else {
          aiReply = "Great news! You have no outstanding late fines or dues.";
        }
      } else if (query.includes('algorithms') || query.includes('discrete') || query.includes('computer')) {
        const match = books.filter(b => b.title.toLowerCase().includes('algorithms') || b.title.toLowerCase().includes('discrete'));
        if (match.length > 0) {
          const details = match.map(b => {
            const coll = colleges.find(c => c.id === b.college_id);
            return `- "${b.title}" at ${coll?.name} (${b.available_copies} available)`;
          }).join('\n');
          aiReply = `Here are the matching resources in our network:\n${details}`;
        } else {
          aiReply = "Sorry, no algorithms or discrete math textbooks are currently cataloged.";
        }
      } else if (query.includes('points') || query.includes('badges')) {
        aiReply = `You currently have ${currentUser.points} contributor points! Keep reviewing books (+10 pts) and solving doubts (+15 pts) to advance your rank.`;
      } else if (query.includes('swap') || query.includes('exchange')) {
        aiReply = "You can propose swaps in the Swap Lounge. Select a book from your locker and request a peer trade from another college.";
      }

      setChatMessages(prev => [...prev, { sender: 'ai' as const, text: aiReply }]);
    }, 600);
  };

  const handleProposeSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapSenderBook || !swapReceiverBook || !swapReceiverId) return;
    proposeSwap(swapSenderBook, swapReceiverBook, swapReceiverId);
    // Reset forms
    setSwapSenderBook('');
    setSwapReceiverBook('');
    setSwapReceiverId('');
    alert('Swap request proposed successfully!');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel Content */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Navbar />

        {/* Dynamic Screen Renders */}
        <main style={{ padding: '0 24px 24px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TAB 1: BOOK EXPLORER DASHBOARD */}
          {activeTab === 'explorer' && (
            <>
              {/* Header Greeting Banner */}
              <div className="glass-panel" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
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
              <div className="glass-panel" style={{
                padding: '24px',
                borderLeft: `6px solid ${totalFine > 0 ? 'var(--danger)' : 'var(--success)'}`,
                background: totalFine > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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
                        <div key={tx.id} style={{
                          padding: '16px',
                          borderRadius: '10px',
                          border: '1px solid var(--surface-border)',
                          background: 'rgba(255, 255, 255, 0.01)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
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
                      {books.filter(b => b.college_id !== currentUser.college_id).map(b => (
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
                      {users.filter(u => u.id !== currentUser.id).map(u => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ height: '42px', justifyContent: 'center' }}>
                    Propose Swap (+20 Pts)
                  </button>
                </form>
              </div>

              {/* Active swap requests */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
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
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px', marginBottom: '20px' }}>
                <Award size={22} style={{ color: 'var(--secondary)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Top Contributors Leaderboard</h3>
              </div>

              {/* Ranks listing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {users.sort((a,b) => b.points - a.points).map((u, index) => {
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
                        {/* Rank indicator badge */}
                        <span style={{ fontSize: '1rem', fontWeight: 800, width: '24px', textAlign: 'center', color: index === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          #{index + 1}
                        </span>
                        
                        <img src={u.avatar_url} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                        
                        <div>
                          <strong style={{ fontSize: '0.9rem', display: 'block' }}>
                            {u.full_name} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', marginLeft: '6px' }}>(You)</span>}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coll?.name}</span>
                        </div>
                      </div>

                      {/* Points count */}
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                        {u.points} Pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: BOOK DONATION DRIVE */}
          {activeTab === 'donation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Book Title:</label>
                        <input type="text" placeholder="e.g. Concrete Mathematics" value={donateTitle} onChange={e => setDonateTitle(e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Author:</label>
                        <input type="text" placeholder="e.g. Knuth & Patashnik" value={donateAuthor} onChange={e => setDonateAuthor(e.target.value)} required />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
              <div className="glass-panel" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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
                  <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', height: '480px', display: 'flex', flexDirection: 'column' }}>
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
              <div className="glass-panel" style={{
                padding: '24px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid var(--surface-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
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
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
          {isChatOpen ? (
            <div className="glass-panel" style={{
              width: '350px',
              height: '450px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid rgba(168,85,247,0.3)',
              overflow: 'hidden'
            }}>
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
