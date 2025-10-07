"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function useSession() {
  try {
    const supabase = getSupabaseBrowserClient();
    const [session, setSession] = React.useState<any>(null);
    React.useEffect(() => {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
      return () => sub.subscription?.unsubscribe?.();
    }, [supabase]);
    return session;
  } catch {
    return null;
  }
}

export default function SiteHeader() {
  const router = useRouter();
  const session = useSession();

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {}
  };

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
      <div>
        <Link href="/" style={{ fontWeight: 700, letterSpacing: 0.5 }}>HoodieVision</Link>
      </div>
      <nav style={{ display: "flex", gap: 8 }}>
        {session?.user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/scan">Scan</Link>
            <button onClick={signOut} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "4px 8px" }}>Sign out</button>
          </>
        ) : (
          <>
            <Link href="/scan">Scan</Link>
            <Link href="/login">Login</Link>
          </>
        )}
      </nav>
    </header>
  );
}
