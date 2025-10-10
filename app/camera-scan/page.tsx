"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// CameraScanPage: allows a user to scan a 4x4 grid pattern
// - Live camera preview using getUserMedia
// - Capture a frame, send to API for AI decoding -> 16-bit binary
// - Supabase lookup by decoded key; on match, show profile (and optionally redirect)

type ScanResult = {
  ok: boolean;
  error?: string;
  bits?: string; // 16 chars of 0/1
  number?: number; // 0..65535
  hex?: string; // e.g., 0xABCD
  confidence?: number; // 0..1 (from model)
  profile?: Record<string, unknown> | null;
};

export default function CameraScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to access camera. Please allow camera permissions and try again."
      );
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopCamera();
    };
  }, [stopCamera]);

  const captureDataUrl = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    // Optionally downscale to reduce payload
    const maxW = 1024;
    const scale = vw > maxW ? maxW / vw : 1;
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, w, h);

    // Use JPEG to keep payload smaller
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl;
  }, []);

  const onScan = useCallback(async () => {
    setError(null);
    setResult(null);
    const dataUrl = captureDataUrl();
    if (!dataUrl) {
      setError("Could not capture image.");
      return;
    }

    setIsScanning(true);
    try {
      const resp = await fetch("/api/camera-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const json = (await resp.json()) as ScanResult;
      if (!resp.ok || !json.ok) {
        throw new Error(json?.error || `Scan failed with status ${resp.status}`);
      }
      setResult(json);

      // Optional redirect: if your app exposes a profile route, navigate here.
      // Example: if API returns profile with a canonical url on your site.
      const profileUrl = (json.profile as any)?.profile_url as string | undefined;
      if (profileUrl) {
        router.push(profileUrl);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to scan image.");
    } finally {
      setIsScanning(false);
    }
  }, [captureDataUrl, router]);

  const gridOverlay = useMemo(() => {
    // CSS for a 4x4 grid overlay to help alignment
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid grid-cols-4 grid-rows-4"
        style={{ gap: 2 }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="border border-white/40" />
        ))}
      </div>
    );
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Camera Scan</h1>
      <p className="mt-2 text-sm text-gray-600">
        Align the 4x4 grid pattern within the frame and tap Scan.
      </p>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative w-full max-w-xl aspect-[3/4] bg-black rounded-md overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            aria-label="Camera preview"
          />
          {gridOverlay}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              disabled={isStarting}
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {isStarting ? "Starting…" : "Start camera"}
            </button>
          ) : (
            <>
              <button
                onClick={onScan}
                disabled={isScanning}
                className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {isScanning ? "Scanning…" : "Capture & Scan"}
              </button>
              <button
                onClick={stopCamera}
                className="rounded-md bg-gray-200 px-4 py-2"
              >
                Stop camera
              </button>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <div className="mt-4 w-full max-w-xl rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 w-full max-w-xl rounded-md border p-4">
            <h2 className="font-medium">Scan result</h2>
            <div className="mt-2 text-sm">
              <div>
                <span className="font-mono">bits</span>: {result.bits || "—"}
              </div>
              <div>
                <span className="font-mono">number</span>: {result.number ?? "—"}
              </div>
              <div>
                <span className="font-mono">hex</span>: {result.hex || "—"}
              </div>
              {typeof result.confidence === "number" && (
                <div>
                  <span className="font-mono">confidence</span>: {Math.round((result.confidence || 0) * 100)}%
                </div>
              )}
            </div>

            {result.profile ? (
              <div className="mt-4">
                <h3 className="font-medium">Matched profile</h3>
                <pre className="mt-2 overflow-auto rounded bg-gray-50 p-3 text-xs">
{JSON.stringify(result.profile, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No matching profile found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
