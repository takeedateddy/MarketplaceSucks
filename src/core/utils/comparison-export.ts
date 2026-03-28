/**
 * Comparison export utilities for sharing listing comparisons.
 * Formats comparison results as copyable markdown or plain text.
 *
 * @module comparison-export
 */

import type { ComparisonResult } from '@/core/analysis/comparison-engine';

/**
 * Format a comparison result as a markdown table.
 *
 * @param result - The comparison result to format
 * @param listingTitles - Map of listing ID to title for readable headers
 * @returns Markdown-formatted comparison table
 */
export function formatAsMarkdown(
  result: ComparisonResult,
  listingTitles: Record<string, string>,
): string {
  if (result.dimensions.length === 0) return 'No comparison data.';

  const ids = result.listingIds;
  const labels = ids.map((id, i) => {
    const letter = String.fromCharCode(65 + i);
    const title = listingTitles[id] ?? `Listing ${letter}`;
    const truncated = title.length > 30 ? title.slice(0, 27) + '...' : title;
    return truncated;
  });

  // Header row
  const header = `| Dimension | ${labels.join(' | ')} |`;
  const separator = `| --- | ${ids.map(() => '---').join(' | ')} |`;

  // Data rows
  const rows = result.dimensions.map((dim) => {
    const values = ids.map((id) => {
      const val = dim.values[id] ?? 'N/A';
      const isBest = dim.bestId === id;
      return isBest ? `**${val}**` : val;
    });
    return `| ${dim.label} | ${values.join(' | ')} |`;
  });

  const lines = [header, separator, ...rows];

  // Recommendation
  if (result.recommendedId) {
    const idx = ids.indexOf(result.recommendedId);
    if (idx >= 0) {
      lines.push('');
      lines.push(`**Recommended:** ${labels[idx]}`);
    }
  }

  // Summary
  if (result.summary) {
    lines.push('');
    lines.push(result.summary);
  }

  return lines.join('\n');
}

/**
 * Format a comparison result as plain text (for pasting into messages).
 *
 * @param result - The comparison result to format
 * @param listingTitles - Map of listing ID to title
 * @returns Plain text comparison summary
 */
export function formatAsText(
  result: ComparisonResult,
  listingTitles: Record<string, string>,
): string {
  if (result.dimensions.length === 0) return 'No comparison data.';

  const ids = result.listingIds;
  const labels = ids.map((id, i) => {
    const letter = String.fromCharCode(65 + i);
    return listingTitles[id] ?? `Listing ${letter}`;
  });

  const lines: string[] = ['Marketplace Comparison', ''];

  // Per-listing summary
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const dimValues = result.dimensions
      .map((dim) => `${dim.label}: ${dim.values[id] ?? 'N/A'}`)
      .join(', ');
    lines.push(`${labels[i]}: ${dimValues}`);
  }

  // Winner highlights
  const wins: Record<string, string[]> = {};
  for (const dim of result.dimensions) {
    if (dim.bestId) {
      const idx = ids.indexOf(dim.bestId);
      const label = labels[idx] ?? dim.bestId;
      if (!wins[label]) wins[label] = [];
      wins[label].push(dim.label.toLowerCase());
    }
  }

  if (Object.keys(wins).length > 0) {
    lines.push('');
    for (const [label, dims] of Object.entries(wins)) {
      lines.push(`${label} leads in: ${dims.join(', ')}`);
    }
  }

  // Summary
  if (result.summary) {
    lines.push('');
    lines.push(result.summary);
  }

  return lines.join('\n');
}
