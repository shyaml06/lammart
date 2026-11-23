import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-[#FAF8F4] flex flex-col font-sans antialiased text-[#14201B]">
        <Navigation />
        <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 md:p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
