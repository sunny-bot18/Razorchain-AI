'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    company?: string | null;
    role: 'BUYER' | 'SELLER' | 'ADMIN';
  } | null>(null);

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // fetch current user on mount
    (async () => {
      try {
        const res = await fetch('/api/auth', { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/login');
          }
          setLoadError(true);
          return;
        }
        const data = await res.json();
        setUser(data.user || null);
      } catch {
        setLoadError(true);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.replace('/login');
  };

  const links: { label: string; href: string }[] = [];
  if (user?.role === 'BUYER') {
    links.push({ label: 'Dashboard', href: '/buyer' });
    links.push({ label: 'Create Transaction', href: '/buyer/create' });
  } else if (user?.role === 'SELLER') {
    links.push({ label: 'Dashboard', href: '/seller' });
  } else if (user?.role === 'ADMIN') {
    links.push({ label: 'Dashboard', href: '/admin' });
  }

  if (user) {
    links.push({ label: 'Privacy & Settings', href: '/settings' });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-xs font-bold text-white">
            RC
          </span>
          <span className="text-zinc-100">RazorChain AI</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">{user.name}</span>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs font-medium uppercase text-blue-300">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
              >
                Logout
              </button>
            </>
          ) : (
            !loadError && (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-zinc-500 sm:block">
                  Loading…
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
