'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
      else setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('email rate limit')) {
          setError(
            'Too many sign-up attempts. Please wait 10–15 minutes and try again. ' +
            'To avoid this, turn off "Confirm email" in Supabase: Authentication → Providers → Email.'
          );
        } else {
          setError(err.message);
        }
        return;
      }
      // When "Confirm email" is disabled in Supabase, a session is returned and we sign in automatically
      if (data.session) {
        router.push('/');
        router.refresh();
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  // Only show "Check your email" when Supabase has email confirmation enabled (no session returned)
  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">Check your email</h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center font-medium text-white hover:bg-emerald-700"
          >
            Back to log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-100">Sign up</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Create an account for Todo Whiteboard
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="signup-confirm" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
