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
  target?: string;
  rel?: string;
}

export default function Avatar({
  src,
  alt,
  className = 'w-8 h-8 rounded-full object-cover',
  href,
  authorSlug,
  disableLink = false,
  target,
  rel,
}: AvatarProps) {
  const isUtkarsh =
    authorSlug === 'utkarsh-mani-tripathi' ||
    authorSlug === 'utkarsh' ||
    (typeof src === 'string' && src.toLowerCase().includes('utkarsh')) ||
    (alt && alt.toLowerCase().includes('utkarsh'));

  const isBhoomija =
    !isUtkarsh &&
    (authorSlug === 'bhoomija-khanna' ||
      authorSlug === 'bhoomija' ||
      (typeof src === 'string' && src.toLowerCase().includes('bhoomija')) ||
      (alt && alt.toLowerCase().includes('bhoomija')) ||
      (!authorSlug && !href));

  const defaultAvatar = isBhoomija
    ? '/images/bhoomija-avatar.png'
    : isUtkarsh
    ? '/utkarsh-avatar.svg'
    : SILHOUETTE;

  const [imgSrc, setImgSrc] = useState<string>(src || defaultAvatar);

  const defaultUtkarshHref = 'https://utkarshmanitripathi.vercel.app';

  const resolvedHref =
    href ||
    (isUtkarsh
      ? defaultUtkarshHref
      : authorSlug
      ? getAuthorHref(authorSlug)
      : isBhoomija
      ? '/bhoomija'
      : undefined);

  const isExternal =
    Boolean(resolvedHref && (resolvedHref.startsWith('http://') || resolvedHref.startsWith('https://'))) ||
    target === '_blank';

  const resolvedTarget = target ?? (isExternal ? '_blank' : undefined);
  const resolvedRel = rel ?? (resolvedTarget === '_blank' ? 'noopener noreferrer' : undefined);

  const imgElement = (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(SILHOUETTE)}
    />
  );

  if (!disableLink && resolvedHref) {
    if (isExternal) {
      return (
        <a
          href={resolvedHref}
          target={resolvedTarget}
          rel={resolvedRel}
          className="inline-block transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none shrink-0"
          title={`View ${alt} Profile`}
          aria-label={`View ${alt} Profile`}
        >
          {imgElement}
        </a>
      );
    }

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
