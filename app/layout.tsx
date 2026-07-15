import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from './context/AppContext';

export const metadata: Metadata = {
  title: 'Academic Hub - Multi-College Library Ecosystem',
  description: 'A dynamic, shared, and gamified academic resources library platform for colleges.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
