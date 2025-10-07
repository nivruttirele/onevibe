"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function useUser() {
  try {
    const supabase = getSupabaseBrowserClient();
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      });
      return () => {
        sub.subscription?.unsubscribe?.();
      };
    }, [supabase]);
    return user;
  } catch {
    return null;
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [binary16, setBinary16] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const user = useUser();

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream as any;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not access webcam");
      }
    };
    start();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  const captureAndAnalyze = async () => {
    setError(undefined);
    setBusy(true);
    try {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, size, size);
      const dataURL = canvas.toDataURL("image/jpeg", 0.9);
      const res = await fetch("/api/vision/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataURL }),
      });
      const json = await res.json();
      setBinary16(json?.binary_16 ?? null);
      setConfidence(typeof json?.confidence === "number" ? json.confidence : null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to analyze");
    } finally {
      setBusy(false);
    }
  };

  const saveHoodie = async () => {
    try {
      if (!binary16) return;
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setError("Not logged in");
        return;
      }
      const { error: dbErr } = await supabase.from("hoodies").insert({ binary_16: binary16, user_id: userId });
      if (dbErr) throw dbErr;
      alert("Saved");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    }
  };

  const grid = (binary16 ?? "").padEnd(16, "0");

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Scan Hoodie</h1>
      {error ? <div style={{ color: "#dc2626", marginBottom: 8 }}>{error}</div> : null}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <video ref={videoRef} style={{ width: 320, height: 240, background: "#000" }} muted playsInline />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div>
          <button onClick={captureAndAnalyze} disabled={busy} style={{ padding: 10, borderRadius: 8, background: "#111827", color: "white", border: 0, cursor: "pointer" }}>
            Capture & Analyze
          </button>
          <div style={{ marginTop: 12 }}>
            <div>binary_16: <code>{binary16 ?? "-"}</code></div>
            <div>confidence: {confidence != null ? confidence.toFixed(2) : "-"}</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 40px)", gap: 4 }}>
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} style={{ width: 40, height: 40, background: grid[i] === "1" ? "#111827" : "#e5e7eb", borderRadius: 4 }} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {user ? (
              <button onClick={saveHoodie} disabled={!binary16 || busy} style={{ padding: 10, borderRadius: 8, background: "#10b981", color: "white", border: 0, cursor: "pointer" }}>
                Save Hoodie
              </button>
            ) : (
              <Link href="/login" style={{ color: "#2563eb" }}>Log in to save</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
