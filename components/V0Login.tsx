"use client";
import React, { useState } from "react";

export type V0LoginProps = {
  onSignIn: (email: string, password: string) => void | Promise<void>;
  onSignUp: (email: string, password: string) => void | Promise<void>;
  onGoogle: () => void | Promise<void>;
  error?: string;
};

export default function V0Login({ onSignIn, onSignUp, onGoogle, error }: V0LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (fn: () => Promise<void> | void) => {
    try {
      setBusy(true);
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "24px auto", padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <h1 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Login</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label htmlFor="email" style={{ fontSize: 12, color: "#374151" }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
        />

        <label htmlFor="password" style={{ fontSize: 12, color: "#374151" }}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
        />

        {error ? (
          <small style={{ color: "#dc2626" }}>{error}</small>
        ) : null}

        <button
          disabled={busy}
          onClick={() => handle(() => onSignIn(email, password))}
          style={{ padding: 10, borderRadius: 8, background: "#111827", color: "white", border: 0, cursor: "pointer" }}
        >
          Sign In
        </button>

        <button
          disabled={busy}
          onClick={() => handle(() => onSignUp(email, password))}
          style={{ padding: 10, borderRadius: 8, background: "#374151", color: "white", border: 0, cursor: "pointer" }}
        >
          Sign Up
        </button>

        <button
          disabled={busy}
          onClick={() => handle(onGoogle)}
          style={{ padding: 10, borderRadius: 8, background: "white", color: "#111827", border: "1px solid #d1d5db", cursor: "pointer" }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
