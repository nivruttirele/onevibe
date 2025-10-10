// gridDecode.ts - utilities to map 4x4 black/white grid to 16-bit binary
// This module provides two decoding paths:
// 1) decodeGridToBits(imageDataUrl) - naive local decode using Canvas thresholding
// 2) helpers to convert a bitstring to number/hex

export async function decodeGridToBits(imageDataUrl: string): Promise<string> {
  const { createCanvas, loadImage } = await import("canvas").catch(() => ({
    // In the browser, we can implement using an HTMLCanvasElement. In Next.js route
    // runtime (Edge/node), node-canvas may not be available. In that case, return empty
    // and let upstream handle with AI.
    createCanvas: null,
    loadImage: null,
  } as any));

  // For node runtime without canvas, just bail.
  if (!createCanvas || !loadImage) {
    return "";
  }

  const img = await loadImage(imageDataUrl);
  const w = img.width;
  const h = img.height;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  // Assume grid is roughly centered and square. Sample a centered square portion.
  const squareSize = Math.min(w, h) * 0.8;
  const offsetX = (w - squareSize) / 2;
  const offsetY = (h - squareSize) / 2;

  const cellsPerSide = 4;
  const cellSize = squareSize / cellsPerSide;

  let bits = "";
  for (let row = 0; row < cellsPerSide; row++) {
    for (let col = 0; col < cellsPerSide; col++) {
      // sample a 5x5 grid at the center of the cell
      const cx = Math.round(offsetX + col * cellSize + cellSize / 2);
      const cy = Math.round(offsetY + row * cellSize + cellSize / 2);
      const sampleSize = Math.max(3, Math.floor(cellSize * 0.1));
      const half = Math.floor(sampleSize / 2);
      let sumLuma = 0;
      let count = 0;
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const x = Math.min(Math.max(cx + dx, 0), w - 1);
          const y = Math.min(Math.max(cy + dy, 0), h - 1);
          const { data } = ctx.getImageData(x, y, 1, 1);
          const r = data[0];
          const g = data[1];
          const b = data[2];
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sumLuma += luma;
          count++;
        }
      }
      const avg = sumLuma / count;
      // threshold mid-gray; tweak if needed
      const bit = avg < 128 ? "1" : "0"; // darker => 1
      bits += bit;
    }
  }

  return bits;
}

export function numberFromBits(bits: string): number {
  let value = 0;
  for (let i = 0; i < bits.length; i++) {
    value = (value << 1) | (bits[i] === "1" ? 1 : 0);
  }
  return value >>> 0;
}

export function hexFromBits(bits: string): string {
  const num = numberFromBits(bits);
  return "0x" + num.toString(16).padStart(4, "0").toUpperCase();
}
