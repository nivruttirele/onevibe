"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function useAuth() {
  try {
    const supabase = getSupabaseBrowserClient();
    const [session, setSession] = useState<any>(null);
    useEffect(() => {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
      return () => sub.subscription?.unsubscribe?.();
    }, [supabase]);
    return session;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const session = useAuth();
  const router = useRouter();
  const [hoodies, setHoodies] = useState<Array<any>>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const userId = session?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("hoodies")
          .select("id, binary_16, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setHoodies(data ?? []);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [session]);

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      // noop
    }
  };

  if (!session?.user) {
    return (
      <div style={{ padding: 16 }}>
        <p>Please log in</p>
        <Link href="/login" style={{ color: "#2563eb" }}>Go to login</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Link href="/scan" style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Scan a hoodie</Link>
        <button onClick={signOut} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Sign out</button>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Your Hoodies</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        {hoodies.map((h) => (
          <div key={h.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <div style={{ fontFamily: "monospace" }}>{h.binary_16}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{new Date(h.created_at).toLocaleString()}</div>
          </div>
        ))}
        {hoodies.length === 0 ? <div style={{ color: "#6b7280" }}>No hoodies yet</div> : null}
      </div>
    </div>
  );
}
