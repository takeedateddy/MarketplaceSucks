/**
 * @module content/dom-manipulator
 *
 * Shows, hides, reorders, and dims listing card elements in the DOM based
 * on filter and sort results from the core engines.
 *
 * All visual state is applied via CSS classes (`mps-listing-hidden`,
 * `mps-listing-dimmed`) and `data-mps-*` attributes rather than inline
 * styles, keeping the logic fast and easily reversible.
 *
 * Designed to efficiently handle hundreds of listing elements by batching
 * DOM writes and using `requestAnimationFrame` to avoid layout thrashing.
 *
 * @example
 * ```ts
 * import { DomManipulator } from "@/content/dom-manipulator";
 *
 * const manipulator = new DomManipulator();
 * manipulator.hideListings(["123", "456"]);
 * manipulator.reorderListings(["789", "012", "345"]);
 * ```
 */

import { SELECTORS, queryAllFirst } from "@/content/selectors.config";

/** Pattern to extract a Marketplace item ID from a URL. */
const ITEM_ID_PATTERN = /\/marketplace\/item\/(\d+)/;

/**
 * Manipulates listing card visibility, order, and visual emphasis in the DOM.
 */
export class DomManipulator {
  /** Cached map from listing ID to its DOM element. Rebuilt on demand. */
  private elementCache: Map<string, Element> = new Map();

  /** Timestamp of the last cache rebuild. */
  private cacheBuiltAt = 0;

  /** Maximum cache age in milliseconds before a forced rebuild. */
  private readonly cacheMaxAge = 2000;

  /**
   * Hide listing cards by their IDs.
   *
   * Applies the `mps-listing-hidden` CSS class which sets `display: none`.
   * Hidden listings are also tagged with `data-mps-hidden="true"`.
   *
   * @param ids - Listing IDs to hide.
   */
  hideListings(ids: string[]): void {
    if (ids.length === 0) return;

    const idSet = new Set(ids);

    requestAnimationFrame(() => {
      try {
        const cache = this.getElementCache();

        for (const [listingId, element] of cache) {
          if (idSet.has(listingId)) {
            element.classList.add("mps-listing-hidden");
            element.setAttribute("data-mps-hidden", "true");

            // Also hide the parent grid cell wrapper — Facebook wraps each
            // listing card in an extra div that maintains the grid slot.
            // Without hiding the parent, hidden cards leave empty gaps.
            const parent = element.parentElement;
            if (parent && parent !== document.body) {
              parent.classList.add("mps-listing-hidden");
              parent.setAttribute("data-mps-parent-hidden", "true");
            }
          }
        }
      } catch (err) {
        console.warn("[MPS] Error hiding listings:", err);
      }
    });
  }

  /**
   * Show all previously hidden listing cards.
   *
   * Removes the `mps-listing-hidden` class and `data-mps-hidden` attribute
   * from every listing element.
   */
  showAllListings(): void {
    requestAnimationFrame(() => {
      try {
        const hidden = document.querySelectorAll(".mps-listing-hidden");
        for (const el of Array.from(hidden)) {
          el.classList.remove("mps-listing-hidden");
          el.removeAttribute("data-mps-hidden");
          el.removeAttribute("data-mps-parent-hidden");
        }
      } catch (err) {
        console.warn("[MPS] Error showing listings:", err);
      }
    });
  }

  /**
   * Reorder listing cards in the DOM to match the given ID sequence.
   *
   * Uses CSS `order` on a flex/grid container for efficient reordering
   * without physically moving DOM nodes (which would disrupt Facebook's
   * internal state and event handlers).
   *
   * @param orderedIds - Listing IDs in the desired display order.
   */
  reorderListings(orderedIds: string[]): void {
    if (orderedIds.length === 0) return;

    requestAnimationFrame(() => {
      try {
        const cache = this.getElementCache();

        // Build an order index
        const orderMap = new Map<string, number>();
        for (let i = 0; i < orderedIds.length; i++) {
          orderMap.set(orderedIds[i], i);
        }

        // Ensure the parent container uses flex layout for CSS order to work
        let parentMarked = false;

        for (const [listingId, element] of cache) {
          const order = orderMap.get(listingId);

          if (element instanceof HTMLElement) {
            if (order !== undefined) {
              element.style.order = String(order);
              element.setAttribute("data-mps-order", String(order));
            } else {
              // Listings not in the ordered list go to the end
              element.style.order = String(orderedIds.length);
              element.setAttribute("data-mps-order", String(orderedIds.length));
            }

            // Mark parent container as flex once
            if (!parentMarked && element.parentElement) {
              element.parentElement.style.display = "flex";
              element.parentElement.style.flexDirection = "column";
              element.parentElement.setAttribute("data-mps-reordered", "true");
              parentMarked = true;
            }
          }
        }
      } catch (err) {
        console.warn("[MPS] Error reordering listings:", err);
      }
    });
  }

  /**
   * Visually dim listing cards by their IDs.
   *
   * Dimmed listings remain visible but are de-emphasized with reduced opacity.
   * Useful for "seen" listings or low-relevance results.
   *
   * @param ids - Listing IDs to dim.
   */
  dimListings(ids: string[]): void {
    if (ids.length === 0) return;

    const idSet = new Set(ids);

    requestAnimationFrame(() => {
      try {
        const cache = this.getElementCache();

        for (const [listingId, element] of cache) {
          if (idSet.has(listingId)) {
            element.classList.add("mps-listing-dimmed");
            element.setAttribute("data-mps-dimmed", "true");
          }
        }
      } catch (err) {
        console.warn("[MPS] Error dimming listings:", err);
      }
    });
  }

  /**
   * Remove all dimming from listing cards.
   */
  undimAllListings(): void {
    requestAnimationFrame(() => {
      try {
        const dimmed = document.querySelectorAll(".mps-listing-dimmed");
        for (const el of Array.from(dimmed)) {
          el.classList.remove("mps-listing-dimmed");
          el.removeAttribute("data-mps-dimmed");
        }
      } catch (err) {
        console.warn("[MPS] Error un-dimming listings:", err);
      }
    });
  }

  /**
   * Reset all MPS visual modifications (hidden, dimmed, reordered).
   */
  resetAll(): void {
    requestAnimationFrame(() => {
      try {
        this.showAllListings();
        this.undimAllListings();

        // Reset ordering
        const reorderedContainers = document.querySelectorAll("[data-mps-reordered]");
        for (const container of Array.from(reorderedContainers)) {
          if (container instanceof HTMLElement) {
            container.style.removeProperty("display");
            container.style.removeProperty("flex-direction");
            container.removeAttribute("data-mps-reordered");
          }
        }

        const orderedElements = document.querySelectorAll("[data-mps-order]");
        for (const el of Array.from(orderedElements)) {
          if (el instanceof HTMLElement) {
            el.style.removeProperty("order");
            el.removeAttribute("data-mps-order");
          }
        }
      } catch (err) {
        console.warn("[MPS] Error resetting DOM state:", err);
      }
    });
  }

  /**
   * Invalidate the element cache, forcing a rebuild on the next operation.
   */
  invalidateCache(): void {
    this.elementCache.clear();
    this.cacheBuiltAt = 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Build or return a cached map from listing ID to DOM element.
   *
   * The cache is rebuilt if it is older than {@link cacheMaxAge} or empty.
   */
  private getElementCache(): Map<string, Element> {
    const now = Date.now();
    if (this.elementCache.size > 0 && now - this.cacheBuiltAt < this.cacheMaxAge) {
      return this.elementCache;
    }

    this.elementCache.clear();

    const cards = queryAllFirst(document, SELECTORS.listingCard);

    for (const card of cards) {
      const id = this.extractListingId(card);
      if (id) {
        this.elementCache.set(id, card);
      }
    }

    this.cacheBuiltAt = now;
    return this.elementCache;
  }

  /**
   * Extract a listing ID from a card element using data attributes or link URLs.
   */
  private extractListingId(element: Element): string | null {
    try {
      // Direct data attribute
      const dataId = element.getAttribute("data-marketplace-item-id");
      if (dataId) return dataId;

      // MPS-set attribute
      const mpsId = element.getAttribute("data-mps-listing-id");
      if (mpsId) return mpsId;

      // Extract from link URL
      const link = element.querySelector('a[href*="/marketplace/item/"]');
      if (link) {
        const href = link.getAttribute("href");
        if (href) {
          const match = href.match(ITEM_ID_PATTERN);
          if (match) return match[1];
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}
