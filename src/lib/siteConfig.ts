/**
 * Canonical site configuration for National Legal Observatory (NLO).
 * Establishes authoritative domain, branding, and metadata defaults.
 */
export const SITE_CONFIG = {
  name: 'National Legal Observatory',
  shortName: 'NLO',
  domain: 'legal-observatory.vercel.app',
  baseUrl: 'https://legal-observatory.vercel.app',
  tagline: 'Independent Legal Research & Constitutional Observation in India',
  description:
    'An independent academic legal observatory and policy institute providing rigorous primary-source analysis on constitutional law, judicial review, technology governance, and rights frameworks.',
  founder: {
    name: 'Bhoomija Khanna',
    role: 'Founder & Research Director',
    url: 'https://legal-observatory.vercel.app/bhoomija',
    sameAs: [
      'https://linkedin.com/in/bhoomija-khanna-268995368',
      'https://www.instagram.com/national.legal.observatory',
    ],
  },
  social: {
    instagram: 'https://www.instagram.com/national.legal.observatory',
    linkedin: 'https://linkedin.com/in/bhoomija-khanna-268995368',
    email: 'nationallegalobservatory@gmail.com',
  },
  defaultOgImage: '/icon.png',
};
