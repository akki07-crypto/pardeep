'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockDb, Book, User, Transaction, Waitlist, Discussion, Review, Notification, SwapRequest, College } from '../../lib/supabase';

interface AppContextType {
  colleges: College[];
  currentUser: User | null;
  users: User[];
  books: Book[];
  transactions: Transaction[];
  discussions: Discussion[];
  reviews: Review[];
  waitlists: Waitlist[];
  notifications: Notification[];
  swapRequests: SwapRequest[];
  theme: 'dark' | 'light';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toggleTheme: () => void;
  setCurrentUserById: (userId: string) => void;
  borrowBook: (bookId: string) => Promise<void>;
  returnBook: (transactionId: string) => Promise<void>;
  joinWaitlist: (bookId: string) => Promise<void>;
  postDiscussion: (bookId: string, content: string, parentId?: string | null) => Promise<void>;
  postReview: (bookId: string, rating: number, comment: string) => Promise<void>;
  proposeSwap: (senderBookId: string, receiverBookId: string, receiverId: string) => Promise<void>;
  updateSwapStatus: (swapId: string, status: 'accepted' | 'rejected' | 'completed') => Promise<void>;
  dismissNotification: (id: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [colleges, setColleges] = useState<College[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<string>('explorer');

  // Load and refresh state parameters from backend REST API
  const refreshBackendData = useCallback(async (userId: string | null) => {
    try {
      // 1. Fetch Colleges
      const collRes = await fetch('/api/auth?action=colleges');
      let loadedColleges = mockDb.getColleges();
      if (collRes.ok) {
        const colls = await collRes.json();
        if (colls.length > 0) loadedColleges = colls;
      }
      setColleges(loadedColleges);

      // 2. Fetch Books
      const booksRes = await fetch('/api/books');
      let loadedBooks = mockDb.getBooks();
      if (booksRes.ok) {
        const bk = await booksRes.json();
        if (bk.length > 0) loadedBooks = bk;
      }
      setBooks(loadedBooks);

      if (userId) {
        // 3. Fetch Transactions for active user
        const txRes = await fetch(`/api/transactions?userId=${userId}`);
        if (txRes.ok) {
          const txs = await txRes.json();
          setTransactions(txs.length > 0 ? txs : mockDb.getTransactions());
        }

        // 4. Fetch Swaps
        const swapsRes = await fetch(`/api/swap?userId=${userId}`);
        if (swapsRes.ok) {
          const sws = await swapsRes.json();
          setSwapRequests(sws.length > 0 ? sws : mockDb.getSwapRequests());
        }
      }
    } catch (err) {
      console.warn('[BACKEND SIMULATION] API connection failed. Loading local mock registers.');
      // Keep mock simulation active as fallback
      setColleges(mockDb.getColleges());
      setBooks(mockDb.getBooks());
      setTransactions(mockDb.getTransactions());
      setSwapRequests(mockDb.getSwapRequests());
    }
  }, []);

  // Initial authentication gate checks
  useEffect(() => {
    const initSession = async () => {
      const savedTheme = localStorage.getItem('academic_hub_theme') as 'dark' | 'light';
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }

      const path = window.location.pathname;
      const storedUserId = localStorage.getItem('academic_hub_current_user_id');

      // Seed mock registers as local cache
      const initialUsers = mockDb.getUsers();
      setUsers(initialUsers);
      setNotifications(mockDb.getNotifications());
      setWaitlists(mockDb.getWaitlist());
      setDiscussions(mockDb.getDiscussions());
      setReviews(mockDb.getReviews());

      if (!storedUserId) {
        // Redirect to Login if accessing dashboard routes
        if (path !== '/login' && path !== '/signup') {
          router.push('/login');
        }
      } else {
        // Lookup user profile details
        try {
          // Attempt to find user on database if available
          const res = await fetch('/api/auth?action=colleges'); // Check if API works
          if (res.ok) {
            // Find active profile
            const activeUser = initialUsers.find(u => u.id === storedUserId) || initialUsers[0];
            setCurrentUser(activeUser);
          } else {
            const activeUser = initialUsers.find(u => u.id === storedUserId) || initialUsers[0];
            setCurrentUser(activeUser);
          }
        } catch {
          const activeUser = initialUsers.find(u => u.id === storedUserId) || initialUsers[0];
          setCurrentUser(activeUser);
        }
        
        await refreshBackendData(storedUserId);
      }
    };

    initSession();
  }, [router, refreshBackendData]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('academic_hub_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const setCurrentUserById = async (userId: string) => {
    const match = users.find(u => u.id === userId);
    if (match) {
      setCurrentUser(match);
      localStorage.setItem('academic_hub_current_user_id', userId);
      await refreshBackendData(userId);
    }
  };

  const borrowBook = async (bookId: string) => {
    if (!currentUser) return;
    
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'borrow', userId: currentUser.id, bookId })
      });

      if (!res.ok) throw new Error('API borrow failed');
      await refreshBackendData(currentUser.id);
    } catch {
      // Local fallback simulation
      const updatedBooks = books.map(b => {
        if (b.id === bookId) {
          return { ...b, available_copies: Math.max(0, b.available_copies - 1), status: b.available_copies - 1 === 0 ? 'Borrowed' as const : b.status };
        }
        return b;
      });

      const newTx: Transaction = {
        id: `t_${Date.now()}`,
        user_id: currentUser.id,
        book_id: bookId,
        borrowed_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        returned_at: null,
        status: 'borrowed',
        penalty_amount: 0
      };

      const nextTxs = [newTx, ...transactions];
      setBooks(updatedBooks);
      setTransactions(nextTxs);
      mockDb.saveBooks(updatedBooks);
      mockDb.saveTransactions(nextTxs);
    }
  };

  const returnBook = async (transactionId: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', userId: currentUser.id, transactionId })
      });

      if (!res.ok) throw new Error('API return failed');
      await refreshBackendData(currentUser.id);
    } catch {
      // Local fallback simulation
      const tx = transactions.find(t => t.id === transactionId);
      if (!tx) return;

      const updatedTxs = transactions.map(t => {
        if (t.id === transactionId) {
          return { ...t, returned_at: new Date().toISOString(), status: 'returned' as const };
        }
        return t;
      });

      const updatedBooks = books.map(b => {
        if (b.id === tx.book_id) {
          const copies = b.available_copies + 1;
          return { ...b, available_copies: copies, status: copies > 0 ? ('Available' as const) : b.status };
        }
        return b;
      });

      setBooks(updatedBooks);
      setTransactions(updatedTxs);
      mockDb.saveBooks(updatedBooks);
      mockDb.saveTransactions(updatedTxs);
    }
  };

  const joinWaitlist = async (bookId: string) => {
    if (!currentUser) return;
    
    // Check if user is already waitlisted
    const alreadyListed = waitlists.some(w => w.book_id === bookId && w.user_id === currentUser.id && w.status === 'waiting');
    if (alreadyListed) return;

    const bookQueue = waitlists.filter(w => w.book_id === bookId && w.status === 'waiting');
    const newQueuePos = bookQueue.length + 1;

    const newWait: Waitlist = {
      id: `w_${Date.now()}`,
      book_id: bookId,
      user_id: currentUser.id,
      queue_position: newQueuePos,
      status: 'waiting',
      notified_at: null,
      created_at: new Date().toISOString()
    };

    const nextWaitlist = [...waitlists, newWait];
    setWaitlists(nextWaitlist);
    mockDb.saveWaitlist(nextWaitlist);
  };

  const postDiscussion = async (bookId: string, content: string, parentId: string | null = null) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, userId: currentUser.id, content, parentId })
      });

      if (!res.ok) throw new Error('API discussion failed');
    } catch {
      // Local fallback simulation
      const newDisc: Discussion = {
        id: `d_${Date.now()}`,
        book_id: bookId,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_avatar: currentUser.avatar_url,
        content,
        parent_id: parentId,
        created_at: new Date().toISOString()
      };

      const nextDiscussions = [...discussions, newDisc];
      setDiscussions(nextDiscussions);
      mockDb.saveDiscussions(nextDiscussions);

      // Award Points
      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id) {
          const uPoints = u.points + 15;
          setCurrentUser({ ...currentUser, points: uPoints });
          return { ...u, points: uPoints };
        }
        return u;
      });
      setUsers(updatedUsers);
      mockDb.saveUsers(updatedUsers);
    }
  };

  const postReview = async (bookId: string, rating: number, comment: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, userId: currentUser.id, rating, comment })
      });

      if (!res.ok) throw new Error('API review failed');
    } catch {
      // Local fallback simulation
      const newReview: Review = {
        id: `r_${Date.now()}`,
        book_id: bookId,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        rating,
        comment,
        points_awarded: 10,
        created_at: new Date().toISOString()
      };

      const nextReviews = [...reviews, newReview];
      setReviews(nextReviews);
      mockDb.saveReviews(nextReviews);

      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id) {
          const uPoints = u.points + 10;
          setCurrentUser({ ...currentUser, points: uPoints });
          return { ...u, points: uPoints };
        }
        return u;
      });
      setUsers(updatedUsers);
      mockDb.saveUsers(updatedUsers);
    }
  };

  const proposeSwap = async (senderBookId: string, receiverBookId: string, receiverId: string) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose', senderId: currentUser.id, receiverId, senderBookId, receiverBookId })
      });

      if (!res.ok) throw new Error('API swap propose failed');
      await refreshBackendData(currentUser.id);
    } catch {
      // Local fallback simulation
      const newSwap: SwapRequest = {
        id: `swap_${Date.now()}`,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        sender_book_id: senderBookId,
        receiver_book_id: receiverBookId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const nextSwaps = [newSwap, ...swapRequests];
      setSwapRequests(nextSwaps);
      mockDb.saveSwapRequests(nextSwaps);
    }
  };

  const updateSwapStatus = async (swapId: string, status: 'accepted' | 'rejected' | 'completed') => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'respond', swapId, status })
      });

      if (!res.ok) throw new Error('API swap respond failed');
      await refreshBackendData(currentUser.id);
    } catch {
      // Local fallback simulation
      const nextSwaps = swapRequests.map(s => {
        if (s.id === swapId) return { ...s, status };
        return s;
      });
      setSwapRequests(nextSwaps);
      mockDb.saveSwapRequests(nextSwaps);
    }
  };

  const dismissNotification = (id: string) => {
    const nextNotifs = notifications.filter(n => n.id !== id);
    setNotifications(nextNotifs);
    mockDb.saveNotifications(nextNotifs);
  };

  const logout = () => {
    localStorage.removeItem('academic_hub_current_user_id');
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <AppContext.Provider value={{
      colleges,
      currentUser,
      users,
      books,
      transactions,
      discussions,
      reviews,
      waitlists,
      notifications,
      swapRequests,
      theme,
      activeTab,
      setActiveTab,
      toggleTheme,
      setCurrentUserById,
      borrowBook,
      returnBook,
      joinWaitlist,
      postDiscussion,
      postReview,
      proposeSwap,
      updateSwapStatus,
      dismissNotification,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
