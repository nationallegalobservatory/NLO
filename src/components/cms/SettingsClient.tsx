'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CmsRole } from '@/lib/cms/session';

interface CmsUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

export function SettingsClient({
  currentUser,
  users,
}: {
  currentUser: { email: string; name: string; role: CmsRole };
  users: CmsUserRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<CmsRole>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const canInvite = currentUser.role === 'owner';

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch('/api/cms/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.message || data.error || 'Invite failed.');
        return;
      }
      setOk(`Invited ${email} as ${role}.`);
      setEmail('');
      setName('');
      startTransition(() => router.refresh());
    } catch (err) {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <header>
        <p className="font-technical-ui text-[10px] uppercase tracking-[0.28em] text-on-surface-variant">
          Account
        </p>
        <h1 className="text-2xl font-semibold mt-1">Settings</h1>
      </header>

      <section>
        <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em] mb-3">Your account</h2>
        <div className="border border-outline-variant p-4 text-sm space-y-1">
          <p>
            <span className="text-on-surface-variant">Name: </span>
            {currentUser.name}
          </p>
          <p>
            <span className="text-on-surface-variant">Email: </span>
            <span className="font-mono">{currentUser.email}</span>
          </p>
          <p>
            <span className="text-on-surface-variant">Role: </span>
            <span className="uppercase tracking-[0.14em]">{currentUser.role}</span>
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-technical-ui uppercase tracking-[0.18em] mb-3">Team</h2>
        {!canInvite ? (
          <p className="text-sm text-on-surface-variant">
            Only owners can invite new users. Ask the site owner to add you.
          </p>
        ) : (
          <form onSubmit={onInvite} className="space-y-3 border border-outline-variant p-4">
            <p className="text-xs text-on-surface-variant">
              Inviting adds the user to <code className="font-mono">cms_users</code>. They can then
              request a magic link from the login page.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border border-outline/50 bg-[#0c0f17] text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border border-outline/50 bg-[#0c0f17] text-[#f1f5f9] placeholder:text-on-surface-variant/50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CmsRole)}
                className="border border-outline/50 bg-[#0c0f17] text-[#f1f5f9] px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="owner" className="bg-[#0c0f17] text-[#f1f5f9]">Owner</option>
                <option value="editor" className="bg-[#0c0f17] text-[#f1f5f9]">Editor</option>
                <option value="viewer" className="bg-[#0c0f17] text-[#f1f5f9]">Viewer (read-only)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              style={{ backgroundColor: '#c5a059', color: '#090D14' }}
              className="border border-[#d4b068] px-4 py-2 text-xs font-technical-ui uppercase tracking-[0.18em] font-bold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {busy ? 'Inviting…' : 'Invite'}
            </button>
            {error && (
              <div className="border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </div>
            )}
            {ok && (
              <div className="border border-primary/40 bg-primary/5 px-3 py-2 text-sm">{ok}</div>
            )}
          </form>
        )}

        <div className="mt-4 border border-outline-variant">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Name
                </th>
                <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Email
                </th>
                <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Role
                </th>
                <th className="text-left px-4 py-2 font-technical-ui text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  Last sign-in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2 text-xs uppercase tracking-[0.12em]">{u.role}</td>
                  <td className="px-4 py-2 text-xs text-on-surface-variant">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
