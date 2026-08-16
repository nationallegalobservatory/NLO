import Link from 'next/link';

type AuthorLinkProps = {
  slug?: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
};

export function getAuthorHref(slug?: string, name?: string) {
  const check = (slug || name || '').toLowerCase();
  if (check.includes('bhoomija') || check === 'bhoomija-khanna') {
    return '/bhoomija';
  }

  if (check === 'utkarsh-mani-tripathi' || check.includes('utkarsh')) {
    return '/authors/utkarsh-mani-tripathi';
  }

  return slug ? `/authors/${slug}` : '/authors';
}

export default function AuthorLink({ slug, name, className, children }: AuthorLinkProps) {
  const href = getAuthorHref(slug, name);
  const content = children ?? name ?? 'Observatory Author';

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
