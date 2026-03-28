/**
 * Web Worker for off-thread image processing.
 * Handles perceptual hash computation and image metadata extraction
 * without blocking the main thread.
 *
 * @module image-analysis-worker
 */

import { computePerceptualHash, hammingDistance } from '@/core/analysis/image-fingerprint';

/** Message types the worker accepts */
interface WorkerMessage {
  type: 'compute-hash' | 'compare-hashes' | 'batch-hash';
  id: string;
  payload: unknown;
}

/** Response sent back to main thread */
interface WorkerResponse {
  type: string;
  id: string;
  result?: unknown;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  try {
    switch (type) {
      case 'compute-hash': {
        const { pixels } = payload as { pixels: number[] };
        const hash = computePerceptualHash(pixels);
        respond({ type: 'hash-result', id, result: hash });
        break;
      }

      case 'compare-hashes': {
        const { hashA, hashB } = payload as { hashA: string; hashB: string };
        const distance = hammingDistance(hashA, hashB);
        respond({ type: 'compare-result', id, result: { distance, similar: distance <= 10 } });
        break;
      }

      case 'batch-hash': {
        const { images } = payload as { images: Array<{ imageId: string; pixels: number[] }> };
        const results = images.map((img) => ({
          imageId: img.imageId,
          hash: computePerceptualHash(img.pixels),
        }));
        respond({ type: 'batch-hash-result', id, result: results });
        break;
      }

      default:
        respond({ type: 'error', id, error: `Unknown message type: ${type}` });
    }
  } catch (err) {
    respond({
      type: 'error',
      id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

function respond(response: WorkerResponse): void {
  self.postMessage(response);
}
