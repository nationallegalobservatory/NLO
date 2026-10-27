import { Metadata } from 'next';
import BhoomijaCVClient from './BhoomijaCVClient';

export const metadata: Metadata = {
  title: 'Bhoomija Khanna | Founder & Research Director · National Legal Observatory',
  description:
    'Academic portfolio, legal research credentials, and verified publications of Bhoomija Khanna — Founder & Research Director of the National Legal Observatory.',
  alternates: {
    canonical: 'https://legal-observatory.vercel.app/bhoomija',
  },
  openGraph: {
    title: 'Bhoomija Khanna | Founder & Research Director · National Legal Observatory',
    description:
      'Academic portfolio, legal research credentials, and verified publications of Bhoomija Khanna — Founder & Research Director of the National Legal Observatory.',
    url: 'https://legal-observatory.vercel.app/bhoomija',
    type: 'profile',
    siteName: 'National Legal Observatory',
    images: [
      {
        url: '/images/bhoomija-avatar.png',
        width: 800,
        height: 800,
        alt: 'Bhoomija Khanna',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Bhoomija Khanna | Founder & Research Director',
    description: 'Founder & Research Director of the National Legal Observatory.',
    images: ['/images/bhoomija-avatar.png'],
  },
};

export default function BhoomijaCVPage() {
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': 'https://legal-observatory.vercel.app/bhoomija#person',
    name: 'Bhoomija Khanna',
    jobTitle: 'Founder & Research Director',
    worksFor: {
      '@type': 'Organization',
      name: 'National Legal Observatory',
      url: 'https://legal-observatory.vercel.app',
    },
    url: 'https://legal-observatory.vercel.app/bhoomija',
    image: 'https://legal-observatory.vercel.app/images/bhoomija-avatar.png',
    sameAs: [
      'https://linkedin.com/in/bhoomija-khanna-268995368',
      'https://www.instagram.com/national.legal.observatory',
    ],
    description:
      'Founder and Research Director at the National Legal Observatory. Author of the Monthly Legal Review and substantive constitutional analyses.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <BhoomijaCVClient />
    </>
  );
}
