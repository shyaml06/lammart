import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/header';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { OrganizationJsonLd } from '@/components/seo/json-ld';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://lammart.com'),
  title: {
    default: 'Lammart - Premium Laminate, Plywood & Architectural Hardware',
    template: '%s | Lammart',
  },
  description:
    'Direct manufacturer and wholesale pricing across Gujarat and India. Decorative laminates, marine BWP plywood, and architectural hardware.',
  keywords: [
    'laminates',
    'plywood',
    'architectural hardware',
    'Greenlam',
    'CenturyPly',
    'Merino',
    'Royale Touche',
    'Ahmedabad',
    'Gujarat',
  ],
  openGraph: {
    title: 'Lammart - Premium Laminate, Plywood & Architectural Hardware',
    description:
      'Direct manufacturer and wholesale pricing across Gujarat and India. Decorative laminates, marine BWP plywood, and architectural hardware.',
    url: 'https://lammart.com',
    siteName: 'Lammart',
    locale: 'en_IN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <OrganizationJsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#14201B] antialiased selection:bg-[#0B7A55] selection:text-white">
        <Header />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
