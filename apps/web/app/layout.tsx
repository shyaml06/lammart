import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lammart — Laminate Retail POS, Inventory & Challan Management',
  description: 'Fast counter billing, shade search, multi-location stock, and challan-to-invoice conversion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-bg text-text font-sans antialiased flex flex-col selection:bg-accent-soft selection:text-accent">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Navigation />
        <main id="main-content" tabIndex={-1} className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
