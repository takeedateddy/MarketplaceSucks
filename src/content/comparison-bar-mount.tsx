/**
 * @module content/comparison-bar-mount
 *
 * Mounts the (previously orphaned) {@link ComparisonBar} overlay at the bottom
 * of the page. It reflects the live comparison selection maintained in the
 * content script: subscribing to COMPARISON_ADDED/REMOVED to re-render, and
 * routing its actions back through the event bus / controller.
 */

import React, { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ComparisonBar } from "@/ui/overlays/ComparisonBar";
import type { Listing } from "@/core/models/listing";
import { MPS_EVENTS } from "@/core/utils/event-bus";

/** Dependencies the bar needs from the content-script composition root. */
export interface ComparisonBarDeps {
  /** Listings currently selected for comparison (in selection order). */
  getSelectedListings: () => Listing[];
  /** Subscribe to a pipeline event; returns an unsubscribe function. */
  subscribe: (event: string, handler: () => void) => () => void;
  /** Remove one listing from the comparison selection. */
  onRemove: (id: string) => void;
  /** Clear the whole selection. */
  onClear: () => void;
  /** Open the full comparison view (the sidebar Compare panel). */
  onCompare: () => void;
}

const ComparisonBarContainer: React.FC<{ deps: ComparisonBarDeps }> = ({ deps }) => {
  const [listings, setListings] = useState<Listing[]>(() => deps.getSelectedListings());

  useEffect(() => {
    const refresh = (): void => setListings(deps.getSelectedListings());
    const offAdded = deps.subscribe(MPS_EVENTS.COMPARISON_ADDED, refresh);
    const offRemoved = deps.subscribe(MPS_EVENTS.COMPARISON_REMOVED, refresh);
    refresh();
    return () => {
      offAdded();
      offRemoved();
    };
  }, [deps]);

  return (
    <ComparisonBar
      listings={listings}
      onRemove={deps.onRemove}
      onClear={deps.onClear}
      onCompare={deps.onCompare}
    />
  );
};

/** Handle returned by {@link mountComparisonBar} for teardown. */
export interface ComparisonBarHandle {
  unmount: () => void;
}

/** Render the comparison bar into a dedicated root appended to the page body. */
export function mountComparisonBar(deps: ComparisonBarDeps): ComparisonBarHandle {
  const host = document.createElement("div");
  host.id = "mps-comparison-bar-root";
  host.setAttribute("data-mps-component", "comparison-bar");
  document.body.appendChild(host);

  const root: Root = createRoot(host);
  root.render(<ComparisonBarContainer deps={deps} />);

  return {
    unmount: () => {
      root.unmount();
      host.remove();
    },
  };
}
