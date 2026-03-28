/**
 * Content-script side of the selector health check system.
 * Probes the live Facebook DOM to determine which selectors are working
 * and returns results to the background/popup via messaging.
 *
 * @module selector-health-checker
 */

import { SELECTORS, type SelectorConfig } from './selectors.config';
import type { SelectorProbeResult } from '@/core/analysis/selector-health';
import { evaluateCategoryHealth, generateHealthReport, type SelectorHealthReport } from '@/core/analysis/selector-health';

/**
 * Run a health check on all selector categories against the live DOM.
 *
 * @returns A full health report indicating which selectors are working
 */
export function runSelectorHealthCheck(): SelectorHealthReport {
  const categories = Object.keys(SELECTORS) as (keyof SelectorConfig)[];
  const results = categories.map((category) => {
    const selectors = SELECTORS[category];
    const probes: SelectorProbeResult[] = selectors.map((selector) => {
      try {
        const matches = document.querySelectorAll(selector);
        return {
          selector,
          matched: matches.length > 0,
          matchCount: matches.length,
        };
      } catch {
        return { selector, matched: false, matchCount: 0 };
      }
    });
    return evaluateCategoryHealth(category, probes);
  });

  return generateHealthReport(results);
}
