'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getAuthorHref } from './AuthorLink';

// Base64 SVG silhouette — black bg, white person icon, works everywhere
const SILHOUETTE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ccircle cx='50' cy='35' r='18' fill='%23e2e8f0'/%3E%3Cellipse cx='50' cy='85' rx='28' ry='22' fill='%23e2e8f0'/%3E%3C/svg%3E";

interface AvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  href?: string;
  authorSlug?: string;
  disableLink?: boolean;
}

export default function Avatar({
  src,
  alt,
  className = 'w-8 h-8 rounded-full object-cover',
  href,
  authorSlug,
  disableLink = false,
}: AvatarProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || SILHOUETTE);

  const isBhoomija =
    authorSlug === 'bhoomija-khanna' ||
    authorSlug === 'bhoomija' ||
    (typeof src === 'string' && src.toLowerCase().includes('bhoomija')) ||
    (alt && alt.toLowerCase().includes('bhoomija'));

  const resolvedHref =
    href ||
    (authorSlug
      ? getAuthorHref(authorSlug)
      : isBhoomija
      ? '/bhoomija'
      : undefined);

  const imgElement = (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(SILHOUETTE)}
    />
  );

  if (!disableLink && resolvedHref) {
    return (
      <Link
        href={resolvedHref}
        className="inline-block transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none shrink-0"
        title={`View ${alt} Profile`}
        aria-label={`View ${alt} Profile`}
      >
        {imgElement}
      </Link>
    );
  }

  return imgElement;
}
