-- SQL Schema for Smart Academic Hub & Library Ecosystem
-- Designed for PostgreSQL / Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS discussions CASCADE;
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TABLE IF EXISTS waitlists CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS colleges CASCADE;

-- Drop existing enums if they exist
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS swap_status CASCADE;
DROP TYPE IF EXISTS waitlist_status CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS book_status CASCADE;
DROP TYPE IF EXISTS book_category CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 1. Colleges Table
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'iitd.ac.in'
    subdomain_prefix VARCHAR(50) UNIQUE, -- e.g., 'iitd'
    logo_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TYPE user_role AS ENUM ('student', 'librarian', 'super_admin');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'student',
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    avatar_url VARCHAR(512),
    points INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Books Table
CREATE TYPE book_category AS ENUM ('Academic', 'Competitive', 'Comics', 'Novels');
CREATE TYPE book_status AS ENUM ('Available', 'Borrowed', 'In-Transit');

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category book_category NOT NULL,
    isbn VARCHAR(50),
    cover_image_url VARCHAR(512),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    status book_status DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transactions Table
CREATE TYPE transaction_status AS ENUM ('borrowed', 'returned', 'overdue', 'lost');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    borrowed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    status transaction_status DEFAULT 'borrowed',
    penalty_amount DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Waitlists Table
CREATE TYPE waitlist_status AS ENUM ('waiting', 'notified', 'fulfilled', 'expired');

CREATE TABLE waitlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    queue_position INT NOT NULL,
    status waitlist_status DEFAULT 'waiting',
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Swap Requests Table
CREATE TYPE swap_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');

CREATE TABLE swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    receiver_book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    status swap_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Discussions Table (Forum threads)
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES discussions(id) ON DELETE SET NULL, -- Nested replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    points_awarded INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TYPE notification_type AS ENUM ('waitlist_alert', 'penalty_alert', 'swap_alert', 'reply_alert');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_books_college ON books(college_id);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_waitlist_book ON waitlists(book_id);
CREATE INDEX idx_swap_users ON swap_requests(sender_id, receiver_id);
CREATE INDEX idx_discussions_book ON discussions(book_id);
CREATE INDEX idx_reviews_book ON reviews(book_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Initial Seed Data
-- 1. Colleges
INSERT INTO colleges (id, name, domain, subdomain_prefix, logo_url) VALUES
('c1000000-0000-0000-0000-000000000001', 'IIT Delhi', 'iitd.ac.in', 'iitd', 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=60'),
('c2000000-0000-0000-0000-000000000002', 'IIT Bombay', 'iitb.ac.in', 'iitb', 'https://images.unsplash.com/photo-1562774053-401386dfdf8f?w=100&auto=format&fit=crop&q=60'),
('c3000000-0000-0000-0000-000000000003', 'BITS Pilani', 'bits-pilani.ac.in', 'bits', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&auto=format&fit=crop&q=60')
ON CONFLICT (domain) DO NOTHING;

-- 2. Mock Users (Password is 'password123')
INSERT INTO users (id, email, password_hash, full_name, role, college_id, avatar_url, points, is_verified) VALUES
('u1000000-0000-0000-0000-000000000001', 'rahul.sharma@iitd.ac.in', 'password123', 'Rahul Sharma', 'student', 'c1000000-0000-0000-0000-000000000001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', 155, true),
('u2000000-0000-0000-0000-000000000002', 'priya.nair@iitb.ac.in', 'password123', 'Priya Nair', 'student', 'c2000000-0000-0000-0000-000000000002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', 340, true),
('u3000000-0000-0000-0000-000000000003', 'aarav.mehta@bits-pilani.ac.in', 'password123', 'Aarav Mehta', 'student', 'c3000000-0000-0000-0000-000000000003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav', 80, true),
('u4000000-0000-0000-0000-000000000004', 'amit.sen@iitd.ac.in', 'password123', 'Dr. Amit Sen', 'librarian', 'c1000000-0000-0000-0000-000000000001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', 10, true)
ON CONFLICT (email) DO NOTHING;

-- 3. Books
INSERT INTO books (id, title, author, category, isbn, cover_image_url, college_id, total_copies, available_copies, status) VALUES
('b1000000-0000-0000-0000-000000000001', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Academic', '978-0262033848', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80', 'c1000000-0000-0000-0000-000000000001', 3, 2, 'Available'),
('b2000000-0000-0000-0000-000000000002', 'Cracking the Coding Interview', 'Gayle Laakmann McDowell', 'Competitive', '978-0984782857', 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&auto=format&fit=crop&q=80', 'c1000000-0000-0000-0000-000000000001', 2, 2, 'Available'),
('b3000000-0000-0000-0000-000000000003', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Academic', '978-0262033848', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&auto=format&fit=crop&q=80', 'c3000000-0000-0000-0000-000000000003', 1, 0, 'Borrowed'),
('b4000000-0000-0000-0000-000000000004', 'The Amazing Spider-Man: Volume 1', 'Stan Lee', 'Comics', '978-0785185031', 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80', 'c2000000-0000-0000-0000-000000000002', 1, 0, 'In-Transit'),
('b5000000-0000-0000-0000-000000000005', 'The Amazing Spider-Man: Volume 1', 'Stan Lee', 'Comics', '978-0785185031', 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=80', 'c3000000-0000-0000-0000-000000000003', 2, 2, 'Available'),
('b6000000-0000-0000-0000-000000000006', 'To Kill a Mockingbird', 'Harper Lee', 'Novels', '978-0446310789', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80', 'c1000000-0000-0000-0000-000000000001', 1, 0, 'Borrowed'),
('b7000000-0000-0000-0000-000000000007', 'To Kill a Mockingbird', 'Harper Lee', 'Novels', '978-0446310789', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&auto=format&fit=crop&q=80', 'c2000000-0000-0000-0000-000000000002', 2, 2, 'Available'),
('b8000000-0000-0000-0000-000000000008', 'Discrete Mathematics and its Applications', 'Kenneth H. Rosen', 'Academic', '978-0073383095', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&auto=format&fit=crop&q=80', 'c1000000-0000-0000-0000-000000000001', 1, 0, 'Borrowed')
ON CONFLICT (id) DO NOTHING;
