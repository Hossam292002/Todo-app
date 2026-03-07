'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TodoCanvas } from '@/components/TodoCanvas';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
        return;
      }
      setChecking(false);
    });
  }, [router]);

  if (checking) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <div className="flex-1 overflow-hidden">
        <TodoCanvas />
      </div>
    </main>
  );
}
