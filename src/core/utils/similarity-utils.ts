/**
 * Similarity and distance calculation utilities for comparing listings,
 * detecting related items, and fuzzy matching. Used by the keyword filter,
 * related listings engine, and comparison engine.
 *
 * @module similarity-utils
 */

/**
 * Calculate the Levenshtein edit distance between two strings.
 * Used for fuzzy/misspelling-tolerant keyword matching.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The number of single-character edits needed to transform a into b
 *
 * @example
 * ```typescript
 * levenshteinDistance('corvette', 'carvette') // => 1
 * levenshteinDistance('kitten', 'sitting')    // => 3
 * ```
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row optimization for memory efficiency
  let prevRow = Array.from({ length: lb + 1 }, (_, i) => i);
  let currRow = new Array<number>(lb + 1);

  for (let i = 1; i <= la; i++) {
    currRow[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost, // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[lb];
}

/**
 * Check if two strings are similar within a given tolerance.
 * Uses normalized Levenshtein distance.
 *
 * @param a - First string
 * @param b - Second string
 * @param threshold - Maximum normalized distance (0-1). Default 0.3 (30% different)
 * @returns Whether the strings are similar within the threshold
 *
 * @example
 * ```typescript
 * isFuzzyMatch('corvette', 'carvette', 0.3) // => true (distance 1/8 = 0.125)
 * isFuzzyMatch('corvette', 'toyota', 0.3)   // => false
 * ```
 */
export function isFuzzyMatch(a: string, b: string, threshold: number = 0.3): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return true;

  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(aLower.length, bLower.length);

  if (maxLen === 0) return true;

  return distance / maxLen <= threshold;
}

/**
 * Calculate Jaccard similarity between two sets of tokens.
 * Used for title-based listing similarity comparison.
 *
 * @param tokensA - First set of tokens
 * @param tokensB - Second set of tokens
 * @returns Similarity score between 0 (no overlap) and 1 (identical)
 *
 * @example
 * ```typescript
 * jaccardSimilarity(['ikea', 'malm', 'dresser'], ['ikea', 'malm', 'nightstand'])
 * // => 0.5 (2 shared out of 4 unique)
 * ```
 */
export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate cosine similarity between two term frequency vectors.
 * Used for TF-IDF based listing comparison.
 *
 * @param vecA - First term frequency map
 * @param vecB - Second term frequency map
 * @returns Similarity score between 0 and 1
 *
 * @example
 * ```typescript
 * cosineSimilarity(
 *   { ikea: 1, malm: 1, dresser: 1 },
 *   { ikea: 1, malm: 1, nightstand: 1 }
 * )
 * // => ~0.667
 * ```
 */
export function cosineSimilarity(
  vecA: Record<string, number>,
  vecB: Record<string, number>,
): number {
  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);

  if (keysA.length === 0 || keysB.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...keysA, ...keysB]);

  for (const key of allKeys) {
    const a = vecA[key] ?? 0;
    const b = vecB[key] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Build a term frequency map from a list of tokens.
 *
 * @param tokens - Array of tokens
 * @returns Map of token to frequency count
 *
 * @example
 * ```typescript
 * termFrequency(['ikea', 'malm', 'ikea'])
 * // => { ikea: 2, malm: 1 }
 * ```
 */
export function termFrequency(tokens: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const token of tokens) {
    freq[token] = (freq[token] ?? 0) + 1;
  }
  return freq;
}

/**
 * Get the fuzzy match tolerance threshold based on a user setting.
 *
 * @param level - Tolerance level: 'off', 'low', 'medium', 'high'
 * @returns Normalized Levenshtein distance threshold
 *
 * @example
 * ```typescript
 * getFuzzyThreshold('low')    // => 0.15
 * getFuzzyThreshold('medium') // => 0.25
 * getFuzzyThreshold('high')   // => 0.4
 * ```
 */
export function getFuzzyThreshold(
  level: 'off' | 'low' | 'medium' | 'high',
): number {
  switch (level) {
    case 'off':
      return 0;
    case 'low':
      return 0.15;
    case 'medium':
      return 0.25;
    case 'high':
      return 0.4;
  }
}
