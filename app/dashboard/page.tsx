"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { signOut } from '../../lib/auth';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        setIsSignedIn(!!data.session);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSignOut = async () => {
    setError(null);
    const res = await signOut();
    if (!res.ok) {
      setError(res.error ?? 'Failed to sign out');
      return;
    }
    setIsSignedIn(false);
  };

  if (isLoading) return null;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-gray-700">Please log in</p>
          <Link href="/login" className="text-blue-600 hover:underline">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Welcome</h1>
        <button onClick={handleSignOut} className="px-4 py-2 rounded bg-gray-900 text-white">
          Sign out
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
