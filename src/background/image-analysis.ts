/**
 * @module background/image-analysis
 *
 * Runs the (previously infeasible) image heuristics for real. Content scripts
 * can't analyze Facebook's cross-origin CDN images — drawing them to a canvas
 * taints it. The MV3 service worker, however, can `fetch` the bytes
 * (CORS-bypassed via `host_permissions` for `*.fbcdn.net`), decode them with
 * `createImageBitmap`, and read pixels from an `OffscreenCanvas` without taint.
 *
 * Given an image URL it returns the perceptual hash + heuristic AI score, which
 * the content script then persists and surfaces as a badge / in the Images panel.
 */

import {
  analyzeImageHeuristic,
  isCommonAiResolution,
  isCommonAiAspectRatio,
  NO_EXIF_SIGNAL,
  type ImageMetadata,
} from "@/core/analysis/image-analyzer";
import { computePerceptualHash } from "@/core/analysis/image-fingerprint";

/** Result returned to the content script for one analyzed image. */
export interface ImageAnalysisResult {
  hash: string;
  /** Heuristic AI score, 0-100. */
  aiScore: number;
  classification: string;
  /** Names of the triggered heuristic signals. */
  flags: string[];
  width: number;
  height: number;
}

/** Sample resolution used for saturation / background analysis. */
const SAMPLE = 64;

/**
 * Detect whether a JPEG carries an EXIF (APP1) segment by scanning the header.
 * Reliable enough for the heuristic; non-JPEG formats report false.
 */
function jpegHasExif(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false; // not JPEG
  let offset = 2;
  // Walk APPn marker segments looking for APP1 (0xFFE1) "Exif".
  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    const size = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker === 0xe1) {
      const e = offset + 4;
      if (bytes[e] === 0x45 && bytes[e + 1] === 0x78 && bytes[e + 2] === 0x69 && bytes[e + 3] === 0x66) {
        return true; // "Exif"
      }
    }
    if (marker === 0xda || size <= 0) break; // start of scan / malformed
    offset += 2 + size;
  }
  return false;
}

/** Compute average + std-dev of per-pixel saturation (HSV) from RGBA data. */
function saturationStats(data: Uint8ClampedArray): {
  avgSaturation: number;
  saturationStdDev: number;
} {
  const sats: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sats.push(max === 0 ? 0 : (max - min) / max);
  }
  const avg = sats.reduce((a, b) => a + b, 0) / sats.length;
  const variance = sats.reduce((a, s) => a + (s - avg) ** 2, 0) / sats.length;
  return { avgSaturation: avg, saturationStdDev: Math.sqrt(variance) };
}

/** Heuristic: are the border pixels nearly uniform (solid/studio background)? */
function hasUniformBackground(data: Uint8ClampedArray, size: number): boolean {
  const lum: number[] = [];
  const at = (x: number, y: number): number => {
    const i = (y * size + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  for (let x = 0; x < size; x++) {
    lum.push(at(x, 0), at(x, size - 1));
  }
  for (let y = 1; y < size - 1; y++) {
    lum.push(at(0, y), at(size - 1, y));
  }
  const avg = lum.reduce((a, b) => a + b, 0) / lum.length;
  const std = Math.sqrt(lum.reduce((a, l) => a + (l - avg) ** 2, 0) / lum.length);
  return std < 12; // low border variance => uniform background
}

/** Draw the bitmap into a 32x32 grayscale array (1024 values) for the hash. */
function toGrayscale32(bitmap: ImageBitmap): number[] {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]));
  }
  return gray;
}

/**
 * Fetch, decode and analyze an image URL. Returns null on any failure
 * (network, decode, unsupported format) — analysis is always best-effort.
 */
export async function analyzeImageUrl(url: string): Promise<ImageAnalysisResult | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const hasExif = jpegHasExif(buffer);
    const blob = new Blob([buffer]);
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width;
    const height = bitmap.height;

    const canvas = new OffscreenCanvas(SAMPLE, SAMPLE);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

    const { avgSaturation, saturationStdDev } = saturationStats(data);
    const hash = computePerceptualHash(toGrayscale32(bitmap));
    bitmap.close();

    const metadata: ImageMetadata = {
      width,
      height,
      hasExif,
      hasUniformBackground: hasUniformBackground(data, SAMPLE),
      avgSaturation,
      saturationStdDev,
      isCommonAiAspectRatio: isCommonAiAspectRatio(width, height),
      isCommonAiResolution: isCommonAiResolution(width, height),
    };

    // Facebook strips EXIF from every upload, so the no-EXIF signal carries no
    // information here — exclude it and renormalize over the pixel-based signals.
    const result = analyzeImageHeuristic(metadata, { excludeSignals: [NO_EXIF_SIGNAL] });
    return {
      hash,
      aiScore: result.aiScore,
      classification: result.classification,
      flags: result.signals.filter((s) => s.triggered).map((s) => s.name),
      width,
      height,
    };
  } catch {
    return null;
  }
}
