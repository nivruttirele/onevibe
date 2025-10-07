"use client";
import React, { useState, useCallback } from "react";
import V0Login from "@/components/V0Login";
import { useRouter } from "next/navigation";

// Dynamically import helpers from '@/lib/auth' if present; else use stubs that resolve ok
async function loadAuthHelpers(): Promise<{
  signInWithEmail?: (email: string, password: string) => Promise<void> | void;
  signUpWithEmail?: (email: string, password: string) => Promise<void> | void;
  signInWithGoogle?: () => Promise<void> | void;
}> {
  try {
    const mod: any = await import("@/lib/auth");
    return mod ?? {};
  } catch {
    return {
      signInWithEmail: async () => {},
      signUpWithEmail: async () => {},
      signInWithGoogle: async () => {},
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>(undefined);

  const onSignIn = useCallback(async (email: string, password: string) => {
    setError(undefined);
    try {
      const helpers = await loadAuthHelpers();
      if (helpers.signInWithEmail) {
        await helpers.signInWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Sign in failed");
    }
  }, [router]);

  const onSignUp = useCallback(async (email: string, password: string) => {
    setError(undefined);
    try {
      const helpers = await loadAuthHelpers();
      if (helpers.signUpWithEmail) {
        await helpers.signUpWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
    }
  }, [router]);

  const onGoogle = useCallback(async () => {
    setError(undefined);
    try {
      const helpers = await loadAuthHelpers();
      if (helpers.signInWithGoogle) {
        await helpers.signInWithGoogle();
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
    }
  }, [router]);

  return (
    <div style={{ padding: 16 }}>
      <V0Login onSignIn={onSignIn} onSignUp={onSignUp} onGoogle={onGoogle} error={error} />
    </div>
  );
}
