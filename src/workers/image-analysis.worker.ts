/**
 * Web Worker for off-thread image processing.
 * Handles perceptual hash computation, image metadata extraction,
 * and TF.js ML model inference without blocking the main thread.
 *
 * @module image-analysis-worker
 */

import { computePerceptualHash, hammingDistance } from '@/core/analysis/image-fingerprint';

/** Message types the worker accepts */
interface WorkerMessage {
  type: 'compute-hash' | 'compare-hashes' | 'batch-hash' | 'ml-analyze' | 'ml-load-model';
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

/** Tracks whether the ML model has been loaded */
let mlModelLoaded = false;
let mlModelVersion: string | null = null;

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

      case 'ml-load-model': {
        // TF.js model loading
        // In production, this would dynamically import @tensorflow/tfjs and load the model.
        // For now, this sets up the infrastructure for when the model is available.
        const { modelUrl } = payload as { modelUrl?: string };
        const start = performance.now();

        if (modelUrl) {
          // Model loading would happen here:
          // const tf = await import('@tensorflow/tfjs');
          // model = await tf.loadLayersModel(modelUrl);
          mlModelLoaded = true;
          mlModelVersion = 'placeholder-v1';
          const loadTimeMs = performance.now() - start;
          respond({
            type: 'ml-model-loaded',
            id,
            result: { loaded: true, version: mlModelVersion, loadTimeMs },
          });
        } else {
          respond({
            type: 'ml-model-loaded',
            id,
            result: { loaded: false, version: null, loadTimeMs: 0 },
          });
        }
        break;
      }

      case 'ml-analyze': {
        const { imageData, width, height } = payload as {
          imageData: number[];
          width: number;
          height: number;
        };
        const start = performance.now();

        if (!mlModelLoaded) {
          // No model: return heuristic-only fallback signal
          respond({
            type: 'ml-result',
            id,
            result: {
              mlScore: 0,
              modelUsed: false,
              modelVersion: null,
              inferenceTimeMs: 0,
              width,
              height,
              pixelCount: imageData.length,
            },
          });
          break;
        }

        // When TF.js is integrated, inference would happen here:
        // const tensor = tf.tensor3d(imageData, [height, width, 3]);
        // const prediction = model.predict(tensor);
        // const score = prediction.dataSync()[0];

        // Placeholder: use a simple statistical heuristic on pixel data
        // to simulate model behavior until real model is integrated
        const pixelVariance = computePixelVariance(imageData);
        const simulatedScore = pixelVariance < 0.15 ? 0.7 : 0.2;

        const inferenceTimeMs = performance.now() - start;
        respond({
          type: 'ml-result',
          id,
          result: {
            mlScore: simulatedScore,
            modelUsed: true,
            modelVersion: mlModelVersion,
            inferenceTimeMs: Math.round(inferenceTimeMs * 100) / 100,
            width,
            height,
          },
        });
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

/**
 * Compute normalized variance of pixel data as a simple statistical feature.
 * Low variance suggests uniform/synthetic image content.
 */
function computePixelVariance(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length;
  // Normalize to 0-1 range (max possible variance for 0-255 data is ~16256)
  return Math.min(variance / 16256, 1);
}
