'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-black">
      <p className="text-slate-500 dark:text-slate-400">Redirecting to log in…</p>
    </main>
  );
}
