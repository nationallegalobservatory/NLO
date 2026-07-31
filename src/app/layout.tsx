import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import PWAProvider from '../components/PWAProvider';
import SyncStatusDock from '../components/SyncStatusDock';
// removed ChatBox

// Initialize fonts
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | National Legal Observatory',
    default: 'National Legal Observatory - Independent Legal Research',
  },
  description:
    'A professional academic legal journal and policy think tank focused on constitutional reviews, data surveillance analysis, and climate litigation frontiers.',
  metadataBase: new URL('https://legal-observatory.org'),
  manifest: '/manifest.webmanifest',
  keywords: [
    'Legal Review',
    'Constitutional Law',
    'Judicial Judgments',
    'Policy Commentary',
    'Technology Regulation',
    'Human Rights Research',
  ],
  authors: [{ name: 'National Legal Observatory Editorial Board' }],
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://legal-observatory.org',
    title: 'National Legal Observatory Platform',
    description: 'Independent Legal Research.',
    siteName: 'National Legal Observatory',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: 'National Legal Observatory Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'National Legal Observatory Platform',
    description: 'Independent Legal Research.',
    images: ['/icon.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'NLO',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#561922' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1115' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${sourceSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col transition-colors duration-300">
        <ThemeProvider>
          <PWAProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
                {children}
              </main>
              <Footer />
              <MobileBottomNav />
              <SyncStatusDock />
            </div>
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
