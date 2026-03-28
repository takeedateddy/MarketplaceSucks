/**
 * Selector health monitoring panel showing the status of each Facebook
 * DOM selector and allowing users to add custom overrides when selectors break.
 *
 * @module ui/sidebar/SelectorHealthPanel
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { ProgressBar } from '@/design-system/primitives/ProgressBar';
import { Input } from '@/design-system/primitives/Input';
import { EmptyState } from '@/design-system/primitives/EmptyState';
import type { SelectorHealthReport, SelectorCategoryHealth, SelectorHealthStatus } from '@/core/analysis/selector-health';
import { browser } from '@/platform/browser';

/** Props for the {@link SelectorHealthPanel} component. */
export interface SelectorHealthPanelProps {
  className?: string;
}

function statusBadgeVariant(status: SelectorHealthStatus): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'healthy': return 'success';
    case 'degraded': return 'warning';
    case 'broken': return 'error';
  }
}

function statusLabel(status: SelectorHealthStatus): string {
  switch (status) {
    case 'healthy': return 'OK';
    case 'degraded': return 'Fallback';
    case 'broken': return 'Broken';
  }
}

/**
 * Displays selector health status and allows users to add custom selector overrides.
 */
export function SelectorHealthPanel({ className }: SelectorHealthPanelProps): React.ReactElement {
  const [report, setReport] = useState<SelectorHealthReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customSelector, setCustomSelector] = useState('');

  const runCheck = useCallback(() => {
    setChecking(true);
    browser.runtime.sendMessage({ action: 'get-selector-health' })
      .then((result: unknown) => {
        const typed = result as SelectorHealthReport | undefined;
        if (typed) setReport(typed);
      })
      .catch(() => {
        // Health check not available
      })
      .finally(() => setChecking(false));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  }, []);

  const scoreColor = report
    ? report.overallScore >= 80 ? 'var(--mps-success, #22c55e)'
    : report.overallScore >= 50 ? 'var(--mps-warning, #f59e0b)'
    : 'var(--mps-error, #ef4444)'
    : undefined;

  return (
    <PanelLayout
      title="Selector Health"
      className={className}
      actions={
        <Button variant="secondary" size="sm" onClick={runCheck} disabled={checking}>
          {checking ? 'Checking...' : 'Run Check'}
        </Button>
      }
    >
      {!report ? (
        <EmptyState
          title="No health data"
          description='Click "Run Check" to test all Facebook DOM selectors against the current page.'
        />
      ) : (
        <>
          {/* Overall score */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Overall Health</span>
              <span style={{ fontSize: '13px' }}>{report.overallScore}%</span>
            </div>
            <ProgressBar value={report.overallScore} color={scoreColor} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
              <Badge variant="success" size="sm">{report.healthyCount} OK</Badge>
              <Badge variant="warning" size="sm">{report.degradedCount} Fallback</Badge>
              <Badge variant="error" size="sm">{report.brokenCount} Broken</Badge>
            </div>
          </div>

          {/* Per-category breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {report.categories.map((cat: SelectorCategoryHealth) => (
              <div
                key={cat.category}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--mps-radius-sm, 6px)',
                  background: 'var(--mps-bg-surface, #fff)',
                  border: '1px solid var(--mps-border, #e5e7eb)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleCategory(cat.category)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') toggleCategory(cat.category); }}
                >
                  <span style={{ fontSize: '13px' }}>{cat.displayName}</span>
                  <Badge variant={statusBadgeVariant(cat.status)} size="sm">
                    {statusLabel(cat.status)}
                  </Badge>
                </div>

                {expandedCategory === cat.category && (
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    {cat.probes.map((probe, i) => (
                      <div
                        key={probe.selector}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '2px 0',
                          color: probe.matched
                            ? 'var(--mps-text-primary, #111)'
                            : 'var(--mps-text-tertiary, #9ca3af)',
                          fontWeight: i === cat.activeIndex ? 600 : 400,
                        }}
                      >
                        <code style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {probe.selector}
                        </code>
                        <span>{probe.matched ? `${probe.matchCount}` : '--'}</span>
                      </div>
                    ))}

                    {/* Custom selector input */}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                      <Input
                        placeholder="Add custom selector..."
                        value={expandedCategory === cat.category ? customSelector : ''}
                        onChange={(val) => setCustomSelector(val)}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!customSelector.trim()}
                        onClick={() => {
                          const key = `mps-selector-override-${cat.category}`;
                          browser.storage.local.get(key).then((result: Record<string, unknown>) => {
                            const existing = (result[key] ?? []) as string[];
                            browser.storage.local.set({
                              [key]: [customSelector.trim(), ...existing],
                            });
                            setCustomSelector('');
                          });
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </PanelLayout>
  );
}
