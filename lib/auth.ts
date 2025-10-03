"use client";

import { getSupabaseClient } from './supabase';

export async function signInEmailPassword(email: string, password: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Unknown error' } as const;
  }
}

export async function signUpEmailPassword(email: string, password: string) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Unknown error' } as const;
  }
}

export async function signInWithGoogle() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined },
    });
    if (error) return { ok: false, error: error.message } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Unknown error' } as const;
  }
}

export async function signOut() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Unknown error' } as const;
  }
}
