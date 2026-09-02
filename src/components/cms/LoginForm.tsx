'use client';

import { useState, useTransition } from 'react';

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    startTransition(async () => {
      try {
        const res = await fetch('/api/cms/auth/magic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || data.error || 'Could not send sign-in link.');
          setStatus('error');
          return;
        }
        if (data.sent === false) {
          setError(
            'No CMS account found for that email. Ask the site owner to invite you from Settings → Team.',
          );
          setStatus('error');
          return;
        }
        setStatus('sent');
      } catch (err) {
        setError('Network error. Try again.');
        setStatus('error');
      }
    });
  };

  if (status === 'sent') {
    return (
      <div className="border border-primary/30 bg-primary/5 px-4 py-6 text-sm">
        <strong className="block mb-1">Check your email.</strong>
        We sent a sign-in link to <span className="font-mono">{email}</span>. The link expires in 15
        minutes.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="block text-xs font-technical-ui uppercase tracking-[0.18em] mb-2 text-on-surface-variant">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="bhoomija@thenlo.org"
          className="w-full border border-outline bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      {error && (
        <div className="border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !email}
        className="w-full border border-oxblood bg-oxblood text-white py-2.5 text-xs font-technical-ui font-bold uppercase tracking-[0.18em] hover:bg-on-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Sending…' : 'Send sign-in link'}
      </button>

      <p className="text-xs text-on-surface-variant text-center pt-2">
        {callbackUrl ? (
          <>You&apos;ll be sent to <code className="font-mono">{callbackUrl}</code> after sign-in.</>
        ) : (
          <>Only invited CMS users can sign in.</>
        )}
      </p>
    </form>
  );
}
