import type { NextRequest } from "next/server";

function downscaleDataUrl(dataURL: string, maxSize = 512): string {
  // Run in an offscreen canvas on the server using @napi-rs/canvas replacement via data URL manipulation not available;
  // here we simply forward the original for simplicity. Real downscale would require a Node canvas lib.
  return dataURL;
}

async function callOpenAIVision(dataURL: string): Promise<{ binary_16: string; confidence: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { binary_16: "0000000000000000", confidence: 0.0 };
  }

  const prompt = [
    {
      type: "text",
      text:
        "Look at the image of a 4x4 hoodie LED pattern. Return only a 16-character string of 0s and 1s (row-major, top-left to bottom-right), where 1 means filled/dark and 0 means empty/light. Also return a numeric confidence between 0 and 1. Respond strictly as JSON: {\"binary_16\":\"[01]{16}\",\"confidence\":<0-1>}. No prose.",
    },
    { type: "image_url", image_url: { url: dataURL } },
  ];

  const body = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI error: ${resp.status}`);
  }

  const json = await resp.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";

  // Attempt to extract JSON from assistant content
  let parsed: any = null;
  try {
    parsed = JSON.parse(content.trim());
  } catch {
    // try to find JSON object within content
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Malformed response");
    }
  }

  let bin = String(parsed?.binary_16 ?? "").replace(/[^01]/g, "");
  if (!/^([01]{16})$/.test(bin)) {
    // Retry hint
    const retryPrompt = [
      { type: "text", text: "Crop to the central area and increase contrast. Repeat instructions exactly." },
      { type: "image_url", image_url: { url: dataURL } },
    ];
    const retryBody = { ...body, messages: [{ role: "user", content: retryPrompt }] };
    const retry = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(retryBody),
    });
    const retryJson = await retry.json();
    const retryContent: string = retryJson?.choices?.[0]?.message?.content ?? "";
    try {
      const maybe = JSON.parse(retryContent.trim());
      bin = String(maybe?.binary_16 ?? "").replace(/[^01]/g, "");
      if (!/^([01]{16})$/.test(bin)) throw new Error("invalid bin");
      return { binary_16: bin, confidence: Number(maybe?.confidence ?? 0) };
    } catch {
      // give up
      return { binary_16: "0000000000000000", confidence: 0 };
    }
  }

  return { binary_16: bin, confidence: Number(parsed?.confidence ?? 0) };
}

export async function POST(req: NextRequest) {
  try {
    const { dataURL } = await req.json();
    if (!dataURL || typeof dataURL !== "string") {
      return new Response(JSON.stringify({ error: "Missing dataURL" }), { status: 400 });
    }

    const ds = downscaleDataUrl(dataURL, 512);
    const result = await callOpenAIVision(ds);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Error" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}
