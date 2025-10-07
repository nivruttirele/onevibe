"use client";
import React, { useMemo, useRef, useState } from "react";

function toggleBit(s: string, index: number): string {
  return s
    .split("")
    .map((ch, i) => (i === index ? (ch === "1" ? "0" : "1") : ch))
    .join("");
}

function toPngDataUrl(binary16: string): string {
  const size = 1024;
  const cells = 4;
  const cell = size / cells;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#000000";
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(i / 4);
    const c = i % 4;
    if (binary16[i] === "1") {
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
  return canvas.toDataURL("image/png");
}

export default function PatternPage() {
  const [bits, setBits] = useState<string>("0000000000000000");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const onRandom = () => {
    let s = "";
    for (let i = 0; i < 16; i++) s += Math.random() < 0.5 ? "0" : "1";
    setBits(s);
  };
  const onClear = () => setBits("0000000000000000");
  const onInvert = () => setBits(bits.split("").map((b) => (b === "1" ? "0" : "1")).join(""));
  const onCopy = async () => {
    await navigator.clipboard.writeText(bits);
  };
  const onPaste = async () => {
    const t = await navigator.clipboard.readText();
    const cleaned = (t || "").replace(/[^01]/g, "");
    if (/^[01]{16}$/.test(cleaned)) setBits(cleaned);
    else alert("Invalid pattern; must be 16 bits of 0/1");
  };
  const onDownload = () => {
    const url = toPngDataUrl(bits);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pattern-${bits}.png`;
    a.click();
  };

  const grid = bits;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Pattern Builder</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 80px)", gap: 6, marginBottom: 12 }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setBits((s) => toggleBit(s, i))}
            style={{ width: 80, height: 80, background: grid[i] === "1" ? "#111827" : "#ffffff", border: "1px solid #d1d5db", borderRadius: 6 }}
          />
        ))}
      </div>
      <div style={{ fontFamily: "monospace", marginBottom: 12 }}>{bits}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onRandom} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Randomize</button>
        <button onClick={onClear} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Clear</button>
        <button onClick={onInvert} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Invert</button>
        <button onClick={onCopy} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Copy</button>
        <button onClick={onPaste} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Paste</button>
        <button onClick={onDownload} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 8 }}>Download PNG</button>
      </div>
    </div>
  );
}
