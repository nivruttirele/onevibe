import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { hexFromBits, numberFromBits } from "../../../lib/gridDecode";
import { createClient } from "@supabase/supabase-js";

// OpenAI Vision via REST; you can switch to the official SDK if preferred.
// This endpoint accepts a data URL image, calls the model to locate a 4x4 grid of black/white cells,
// returns the 16-bit result and attempts a Supabase profile lookup.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set; /api/camera-scan will fail.");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase environment variables are not fully set.");
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { imageDataUrl?: string };
    const { imageDataUrl } = body || {};
    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { ok: false, error: "imageDataUrl required as a data URL" },
        { status: 400 }
      );
    }

    // 1) Ask OpenAI Vision to analyze the image and return a 16-char bitstring
    const { bits, confidence } = await callOpenAIVisionForGridBits(imageDataUrl);

    // 2) Convert to number/hex for display
    const num = numberFromBits(bits);
    const hex = hexFromBits(bits);

    // 3) Query Supabase for a profile with this scanner key
    let profile: Record<string, unknown> | null = null;
    if (supabase) {
      // Assumption: table `profiles` has column `scan_key` (integer or text)
      // Adjust as necessary to your schema.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`scan_key.eq.${num},scan_key_hex.eq.${hex}`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Supabase select error", error);
      } else if (data) {
        profile = data as any;
      }
    }

    return NextResponse.json({
      ok: true,
      bits,
      number: num,
      hex,
      confidence,
      profile,
    });
  } catch (err: any) {
    console.error("/api/camera-scan error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

async function callOpenAIVisionForGridBits(imageDataUrl: string): Promise<{ bits: string; confidence: number }> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Few-shot style prompt explaining the expected output.
  const system =
    "You are a precise vision decoder. Given an image of a 4x4 black/white grid, return exactly 16 characters of 0/1 with no spaces or punctuation, reading rows top-left to bottom-right. Black=1, White/blank=0. Also return a confidence score 0..1.";
  const user =
    "Decode this 4x4 grid into a 16-bit string. Output JSON: {\"bits\":\"XXXXXXXXXXXXXXXX\",\"confidence\":0.0}.";

  const payload = {
    model: "gpt-4o-mini", // or a Vision-capable model available in your account
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    temperature: 0,
  } as const;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${text}`);
  }

  const json = (await resp.json()) as any;
  const content = json?.choices?.[0]?.message?.content?.trim?.();

  // Try to parse JSON object response
  let bits = "";
  let confidence = 0.0;
  try {
    const parsed = JSON.parse(content);
    bits = (parsed?.bits || "").toString().trim();
    confidence = Number(parsed?.confidence ?? 0);
  } catch {
    // Fallback: attempt to extract bits by regex
    const match = content?.match(/[01]{16}/);
    bits = match?.[0] || "";
  }

  if (!/^[01]{16}$/.test(bits)) {
    // Optionally try a basic heuristic if Vision fails: 
    // Attempt a local decode pass (naive thresholding). This can be improved later.
    const fallback = await naiveLocalDecode(imageDataUrl);
    if (fallback) {
      bits = fallback;
      confidence = Math.max(confidence, 0.4);
    }
  }

  if (!/^[01]{16}$/.test(bits)) {
    throw new Error("Could not decode 16-bit grid pattern.");
  }
  return { bits, confidence };
}

// Very naive local decoding using Canvas thresholding. For robustness, replace with
// a proper image processing step (e.g. OpenCV via WASM). Here we assume the grid roughly
// fills the central square area and sampling each cell’s average luminance.
async function naiveLocalDecode(imageDataUrl: string): Promise<string | null> {
  try {
    const { decodeGridToBits } = await import("../../../lib/gridDecode");
    const bits = await decodeGridToBits(imageDataUrl);
    return bits;
  } catch (e) {
    console.warn("naiveLocalDecode failed", e);
    return null;
  }
}
