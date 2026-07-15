import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase if keys are available, otherwise use mock client
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Mock Data Structures
export interface College {
  id: string;
  name: string;
  domain: string;
  subdomain_prefix: string;
  logo_url: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'librarian' | 'super_admin';
  college_id: string;
  avatar_url: string;
  points: number;
  is_verified: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: 'Academic' | 'Competitive' | 'Comics' | 'Novels';
  isbn: string;
  cover_image_url: string;
  college_id: string;
  total_copies: number;
  available_copies: number;
  status: 'Available' | 'Borrowed' | 'In-Transit';
}

export interface Transaction {
  id: string;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: 'borrowed' | 'returned' | 'overdue' | 'lost';
  penalty_amount: number;
}

export interface Waitlist {
  id: string;
  book_id: string;
  user_id: string;
  queue_position: number;
  status: 'waiting' | 'notified' | 'fulfilled' | 'expired';
  notified_at: string | null;
  created_at: string;
}

export interface SwapRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_book_id: string;
  receiver_book_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
}

export interface Discussion {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  points_awarded: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'waitlist_alert' | 'penalty_alert' | 'swap_alert' | 'reply_alert';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Seed Mock Data
const MOCK_COLLEGES: College[] = [
  { id: 'c1', name: 'IIT Delhi', domain: 'iitd.ac.in', subdomain_prefix: 'iitd', logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=60' },
  { id: 'c2', name: 'IIT Bombay', domain: 'iitb.ac.in', subdomain_prefix: 'iitb', logo_url: 'https://images.unsplash.com/photo-1562774053-401386dfdf8f?w=100&auto=format&fit=crop&q=60' },
  { id: 'c3', name: 'BITS Pilani', domain: 'bits-pilani.ac.in', subdomain_prefix: 'bits', logo_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=60' }
];

const MOCK_USERS: User[] = [
  { id: 'u1', email: 'rahul.sharma@iitd.ac.in', full_name: 'Rahul Sharma', role: 'student', college_id: 'c1', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', points: 155, is_verified: true },
  { id: 'u2', email: 'priya.nair@iitb.ac.in', full_name: 'Priya Nair', role: 'student', college_id: 'c2', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', points: 340, is_verified: true },
  { id: 'u3', email: 'aarav.mehta@bits-pilani.ac.in', full_name: 'Aarav Mehta', role: 'student', college_id: 'c3', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav', points: 80, is_verified: true },
  { id: 'u4', email: 'amit.sen@iitd.ac.in', full_name: 'Dr. Amit Sen', role: 'librarian', college_id: 'c1', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', points: 10, is_verified: true }
];

const MOCK_BOOKS: Book[] = [
  { id: 'b1', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Academic', isbn: '978-0262033848', cover_image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80', college_id: 'c1', total_copies: 3, available_copies: 2, status: 'Available' },
  { id: 'b2', title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', category: 'Competitive', isbn: '978-0984782857', cover_image_url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&auto=format&fit=crop&q=80', college_id: 'c1', total_copies: 2, available_copies: 2, status: 'Available' },
  { id: 'b3', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Academic', isbn: '978-0262033848', cover_image_url: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80', college_id: 'c3', total_copies: 1, available_copies: 0, status: 'Borrowed' },
  { id: 'b4', title: 'The Amazing Spider-Man: Volume 1', author: 'Stan Lee', category: 'Comics', isbn: '978-0785185031', cover_image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80', college_id: 'c2', total_copies: 1, available_copies: 0, status: 'In-Transit' },
  { id: 'b5', title: 'The Amazing Spider-Man: Volume 1', author: 'Stan Lee', category: 'Comics', isbn: '978-0785185031', cover_image_url: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80', college_id: 'c3', total_copies: 2, available_copies: 2, status: 'Available' },
  { id: 'b6', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Novels', isbn: '978-0446310789', cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80', college_id: 'c1', total_copies: 1, available_copies: 0, status: 'Borrowed' },
  { id: 'b7', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Novels', isbn: '978-0446310789', cover_image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80', college_id: 'c2', total_copies: 2, available_copies: 2, status: 'Available' },
  { id: 'b8', title: 'Discrete Mathematics and its Applications', author: 'Kenneth H. Rosen', category: 'Academic', isbn: '978-0073383095', cover_image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80', college_id: 'c1', total_copies: 1, available_copies: 0, status: 'Borrowed' }
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', user_id: 'u1', book_id: 'b8', borrowed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), returned_at: null, status: 'overdue', penalty_amount: 30 },
  { id: 't2', user_id: 'u2', book_id: 'b4', borrowed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), returned_at: null, status: 'borrowed', penalty_amount: 0 }
];

const MOCK_DISCUSSIONS: Discussion[] = [
  { id: 'd1', book_id: 'b1', user_id: 'u1', user_name: 'Rahul Sharma', user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', content: 'What chapters are best to read for dynamic programming algorithms?', parent_id: null, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'd2', book_id: 'b1', user_id: 'u4', user_name: 'Dr. Amit Sen', user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', content: 'Definitely read Chapter 15. It gives an excellent breakdown of matrices, rod cutting, and LCS problems.', parent_id: 'd1', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'd3', book_id: 'b8', user_id: 'u1', user_name: 'Rahul Sharma', user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', content: 'Does anyone understand recurrence relations in Chapter 8? The induction steps feel rushed.', parent_id: null, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
];

const MOCK_REVIEWS: Review[] = [
  { id: 'r1', book_id: 'b1', user_id: 'u2', user_name: 'Priya Nair', rating: 5, comment: 'The bible of computer algorithms. Very detailed and rigorous proof mechanics!', points_awarded: 10, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'r2', book_id: 'b2', user_id: 'u1', user_name: 'Rahul Sharma', rating: 4, comment: 'Great compilation of interview style questions. The solutions walkthroughs are clear and explain trade-offs well.', points_awarded: 10, created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', user_id: 'u1', type: 'penalty_alert', title: 'Late Return Warning', message: 'Discrete Mathematics is overdue by 3 days. A fine of 30 INR has been applied.', is_read: false, created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() }
];

// Helper to interact with Mock Database via LocalStorage
class MockDatabase {
  private getStore<T>(key: string, initial: T[]): T[] {
    if (typeof window === 'undefined') return initial;
    const val = localStorage.getItem(`academic_hub_${key}`);
    if (!val) {
      localStorage.setItem(`academic_hub_${key}`, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(val);
  }

  private setStore<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`academic_hub_${key}`, JSON.stringify(data));
  }

  getColleges(): College[] { return this.getStore('colleges', MOCK_COLLEGES); }
  getUsers(): User[] { return this.getStore('users', MOCK_USERS); }
  getBooks(): Book[] { return this.getStore('books', MOCK_BOOKS); }
  getTransactions(): Transaction[] { return this.getStore('transactions', MOCK_TRANSACTIONS); }
  getDiscussions(): Discussion[] { return this.getStore('discussions', MOCK_DISCUSSIONS); }
  getReviews(): Review[] { return this.getStore('reviews', MOCK_REVIEWS); }
  getWaitlist(): Waitlist[] { return this.getStore('waitlist', []); }
  getNotifications(): Notification[] { return this.getStore('notifications', MOCK_NOTIFICATIONS); }
  getSwapRequests(): SwapRequest[] { return this.getStore('swap_requests', []); }

  saveBooks(books: Book[]) { this.setStore('books', books); }
  saveTransactions(txs: Transaction[]) { this.setStore('transactions', txs); }
  saveWaitlist(waitlist: Waitlist[]) { this.setStore('waitlist', waitlist); }
  saveDiscussions(disc: Discussion[]) { this.setStore('discussions', disc); }
  saveReviews(reviews: Review[]) { this.setStore('reviews', reviews); }
  saveNotifications(notifs: Notification[]) { this.setStore('notifications', notifs); }
  saveUsers(users: User[]) { this.setStore('users', users); }
  saveSwapRequests(swaps: SwapRequest[]) { this.setStore('swap_requests', swaps); }
}

export const mockDb = new MockDatabase();
