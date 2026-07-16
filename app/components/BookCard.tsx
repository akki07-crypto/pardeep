'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Book, Transaction, Waitlist } from '../../lib/supabase';
import { Bookmark, MessageCircle, Star, Users, Clipboard, Plus, CornerDownRight, CheckCircle, Clock } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const { 
    currentUser, 
    borrowBook, 
    joinWaitlist, 
    transactions, 
    waitlists, 
    discussions, 
    reviews, 
    postDiscussion, 
    postReview 
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  // Checks
  const isAvailable = book.available_copies > 0;
  const isBorrowedByUser = transactions.some(t => t.book_id === book.id && t.user_id === currentUser?.id && t.returned_at === null);
  
  const isAccountFrozen = transactions.some(t => 
    t.user_id === currentUser?.id && 
    !t.returned_at && 
    new Date(t.due_date).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  const userWaitlist = waitlists.find(w => w.book_id === book.id && w.user_id === currentUser?.id && w.status === 'waiting');
  const isWaitlisted = !!userWaitlist;

  const bookDiscussions = discussions.filter(d => d.book_id === book.id);
  const bookReviews = reviews.filter(r => r.book_id === book.id);
  
  // Average Rating
  const avgRating = bookReviews.length > 0
    ? (bookReviews.reduce((sum, r) => sum + r.rating, 0) / bookReviews.length).toFixed(1)
    : 'N/A';

  const handleBorrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (isAccountFrozen) {
      alert("Your account is frozen due to an overdue book return (> 7 days). Action blocked.");
      return;
    }
    borrowBook(book.id);
  };

  const handleWaitlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (isAccountFrozen) {
      alert("Your account is frozen due to an overdue book return (> 7 days). Action blocked.");
      return;
    }
    joinWaitlist(book.id);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    postDiscussion(book.id, newComment, null);
    setNewComment('');
  };

  const handlePostReply = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    postDiscussion(book.id, replyContent, parentId);
    setReplyContent('');
    setActiveReplyId(null);
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    postReview(book.id, reviewRating, reviewComment);
    setReviewComment('');
  };

  // Get status text style details
  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case 'Available': return 'badge-available';
      case 'Borrowed': return 'badge-borrowed';
      default: return 'badge-transit';
    }
  };

  return (
    <>
      {/* Book Card Grid Item */}
      <div 
        onClick={() => setShowModal(true)}
        className="glass-panel book-card" 
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Aspect Book Cover wrapper */}
        <div style={{
          width: '100%',
          height: '200px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          <img 
            src={book.cover_image_url} 
            alt={book.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          
          {/* Category Chip */}
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'var(--surface)',
            color: 'var(--text-main)',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--surface-border)'
          }}>
            {book.category}
          </span>
        </div>

        {/* Title Details */}
        <div style={{ flexGrow: 1 }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', lineHeight: '1.2rem' }}>
            {book.title}
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            By {book.author}
          </p>
        </div>

        {/* Performance Indicators (Rating and Discussion Counters) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          borderTop: '1px solid var(--surface-border)',
          paddingTop: '10px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={12} fill="var(--warning)" color="var(--warning)" />
            <span>{avgRating} ({bookReviews.length} reviews)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageCircle size={12} />
            <span>{bookDiscussions.length} posts</span>
          </div>
        </div>

        {/* Bottom Booking Button Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: '4px'
        }}>
          {/* Status Badge */}
          <span className={`badge ${getStatusBadgeClass(book.status)}`}>
            {book.status === 'Available' ? `${book.available_copies} Available` : book.status}
          </span>

          {/* Context Buttons */}
          {isBorrowedByUser ? (
            <button disabled className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', color: '#fff', opacity: 0.8 }}>
              Borrowed
            </button>
          ) : isAvailable ? (
            <button 
              onClick={handleBorrow} 
              className="btn btn-primary" 
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.75rem',
                background: isAccountFrozen ? 'rgba(239, 68, 68, 0.2)' : undefined,
                color: isAccountFrozen ? 'var(--danger)' : undefined,
                border: isAccountFrozen ? '1px solid var(--danger)' : undefined,
                cursor: isAccountFrozen ? 'not-allowed' : 'pointer'
              }}
              title={isAccountFrozen ? "Account Frozen due to Overdue Book" : "Borrow"}
            >
              {isAccountFrozen ? "Frozen" : "Borrow"}
            </button>
          ) : isWaitlisted ? (
            <button 
              disabled 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: 0.6 }}
            >
              In Queue #{userWaitlist.queue_position}
            </button>
          ) : (
            <button 
              onClick={handleWaitlist} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--warning)', color: 'var(--warning)' }}
            >
              Join Queue
            </button>
          )}
        </div>
      </div>

      {/* Book details & reviews modal (Frosted overlay) */}
      {showModal && (
        <div className="book-modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            onClick={e => e.stopPropagation()} 
            className="glass-panel book-modal-container"
          >
            {/* Left Pane - Cover & Transactions Actions */}
            <div className="book-modal-left">
              <img 
                src={book.cover_image_url} 
                alt={book.title} 
                style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '12px' }} 
              />
              <div>
                <span className={`badge ${getStatusBadgeClass(book.status)}`} style={{ marginBottom: '8px' }}>
                  {book.status}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{book.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>By {book.author}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>ISBN: {book.isbn}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Library Stock: {book.available_copies} / {book.total_copies} copies</p>
              </div>

              {/* Transactions Actions inside details modal */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isBorrowedByUser ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <CheckCircle size={16} />
                    <span>Currently borrowed by you</span>
                  </div>
                ) : isAvailable ? (
                  <button 
                    onClick={handleBorrow} 
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center',
                      background: isAccountFrozen ? 'rgba(239, 68, 68, 0.2)' : undefined,
                      color: isAccountFrozen ? 'var(--danger)' : undefined,
                      border: isAccountFrozen ? '1px solid var(--danger)' : undefined,
                      cursor: isAccountFrozen ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isAccountFrozen ? "Account Frozen (Overdue Book)" : "Borrow This Copy"}
                  </button>
                ) : isWaitlisted ? (
                  <div style={{ padding: '12px', background: 'rgba(245,158,11,0.05)', border: '1px solid var(--warning)', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                      You are in queue position #{userWaitlist.queue_position}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      We will notify you when a copy is returned.
                    </span>
                  </div>
                ) : (
                  <button onClick={handleWaitlist} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
                    Join Queue Waitlist
                  </button>
                )}

                <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Close Modal
                </button>
              </div>
            </div>

            {/* Right Pane - Reviews & Discussions Boards */}
            <div className="book-modal-right">
              {/* Tab Selector Sections */}
              <div>
                {/* 1. Discussion Forum Threads Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    <MessageCircle size={18} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Discussion Board Thread</h3>
                  </div>

                  {/* Comments rendering */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px', marginBottom: '12px' }}>
                    {bookDiscussions.filter(d => d.parent_id === null).map(disc => {
                      const replies = bookDiscussions.filter(r => r.parent_id === disc.id);
                      return (
                        <div key={disc.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={disc.user_avatar} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                            <strong style={{ fontSize: '0.78rem' }}>{disc.user_name}</strong>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(disc.created_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{disc.content}</p>
                          
                          {/* Replies rendering */}
                          {replies.map(rep => (
                            <div key={rep.id} style={{ display: 'flex', gap: '8px', marginLeft: '16px', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '6px', borderLeft: '2px solid var(--primary)' }}>
                              <CornerDownRight size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                              <div style={{ flexGrow: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ fontSize: '0.72rem' }}>{rep.user_name}</strong>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{new Date(rep.created_at).toLocaleDateString()}</span>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '2px' }}>{rep.content}</p>
                              </div>
                            </div>
                          ))}

                          {/* Reply submission triggers */}
                          {activeReplyId === disc.id ? (
                            <form onSubmit={(e) => handlePostReply(e, disc.id)} style={{ display: 'flex', gap: '8px', marginTop: '6px', marginLeft: '16px' }}>
                              <input 
                                type="text" 
                                placeholder="Write reply..." 
                                value={replyContent} 
                                onChange={e => setReplyContent(e.target.value)} 
                                style={{ padding: '6px 12px', fontSize: '0.75rem' }} 
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Send</button>
                              <button onClick={() => setActiveReplyId(null)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Cancel</button>
                            </form>
                          ) : (
                            <button 
                              onClick={() => { setActiveReplyId(disc.id); setReplyContent(''); }} 
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, alignSelf: 'start', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                            >
                              <Plus size={10} /> Reply & Help (+15 Pts)
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {bookDiscussions.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No doubts posted yet. Start the thread!</p>}
                  </div>

                  {/* Doubts post form */}
                  <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Ask a doubt or write a post... (+15 Points for answers)" 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)} 
                      style={{ fontSize: '0.8rem' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Post</button>
                  </form>
                </div>

                {/* 2. Reviews Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                    <Star size={18} fill="var(--warning)" color="var(--warning)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Peer Reviews & Ratings</h3>
                  </div>

                  {/* Reviews rendering */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px', marginBottom: '16px' }}>
                    {bookReviews.map(rev => (
                      <div key={rev.id} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{rev.user_name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={10} fill={i < rev.rating ? 'var(--warning)' : 'none'} color="var(--warning)" />
                            ))}
                          </div>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>{rev.comment}</p>
                      </div>
                    ))}
                    {bookReviews.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No reviews yet. Be the first to share your thoughts!</p>}
                  </div>

                  {/* Write a review form */}
                  <form onSubmit={handlePostReview} className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Share Your Feedback (+10 Points)</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rating:</span>
                      <select 
                        value={reviewRating} 
                        onChange={e => setReviewRating(Number(e.target.value))} 
                        style={{ width: '80px', padding: '6px', fontSize: '0.75rem' }}
                      >
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={2}>2 Stars</option>
                        <option value={1}>1 Star</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Write a constructive review..." 
                        value={reviewComment} 
                        onChange={e => setReviewComment(e.target.value)} 
                        style={{ fontSize: '0.8rem' }}
                      />
                      <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Review</button>
                    </div>
                  </form>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Animation local helpers */}
      <style jsx global>{`
        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: rgba(99, 102, 241, 0.25);
        }
      `}</style>
    </>
  );
}
