import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MobileBottomNav from '../components/MobileBottomNav';
import PWAProvider from '../components/PWAProvider';
import InstallPromptButton from '../components/InstallPromptButton';
import FullscreenController from '../components/FullscreenController';

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
  metadataBase: new URL('https://legal-observatory.vercel.app'),
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  keywords: [
    'National Legal Observatory',
    'NLO',
    'Bhoomija Khanna',
    'Independent Legal Research',
    'Constitutional Law India',
    'Supreme Court Judgments Review',
    'Judicial Review Analysis',
    'Technology Law and Policy',
    'Human Rights Jurisprudence',
    'Monthly Legal Review',
  ],
  authors: [{ name: 'Bhoomija Khanna', url: 'https://legal-observatory.vercel.app/bhoomija' }],
  creator: 'Bhoomija Khanna',
  publisher: 'National Legal Observatory',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://legal-observatory.vercel.app',
    title: 'National Legal Observatory | Independent Legal Research & Observation',
    description: 'Independent legal research and primary-source constitutional analysis in India.',
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
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://legal-observatory.vercel.app/#organization',
        name: 'National Legal Observatory',
        alternateName: ['NLO', 'The National Legal Observatory'],
        url: 'https://legal-observatory.vercel.app',
        logo: {
          '@type': 'ImageObject',
          url: 'https://legal-observatory.vercel.app/icon.png',
        },
        founder: {
          '@type': 'Person',
          '@id': 'https://legal-observatory.vercel.app/bhoomija#person',
          name: 'Bhoomija Khanna',
          jobTitle: 'Founder & Research Director',
          url: 'https://legal-observatory.vercel.app/bhoomija',
          sameAs: [
            'https://linkedin.com/in/bhoomija-khanna-268995368',
            'https://www.instagram.com/national.legal.observatory',
          ],
        },
        sameAs: [
          'https://www.instagram.com/national.legal.observatory',
          'https://linkedin.com/in/bhoomija-khanna-268995368',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://legal-observatory.vercel.app/#website',
        url: 'https://legal-observatory.vercel.app',
        name: 'National Legal Observatory',
        description: 'Independent legal research and primary-source constitutional observation in India.',
        publisher: {
          '@id': 'https://legal-observatory.vercel.app/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://legal-observatory.vercel.app/publications?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'en-IN',
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${sourceSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
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
              <InstallPromptButton />
              <FullscreenController />
            </div>
          </PWAProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
