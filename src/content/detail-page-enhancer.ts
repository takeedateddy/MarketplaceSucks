/**
 * @module content/detail-page-enhancer
 *
 * Detects when the user is viewing a listing detail page and enhances it
 * with additional context: related listings, price comparison data, and
 * seller reputation indicators.
 *
 * The enhancer watches for URL changes (Facebook is a SPA) and injects
 * a "related listings" section below the main listing content.
 *
 * @example
 * ```ts
 * import { DetailPageEnhancer } from "@/content/detail-page-enhancer";
 *
 * const enhancer = new DetailPageEnhancer();
 * enhancer.enhance();
 *
 * // Later, during cleanup:
 * enhancer.cleanup();
 * ```
 */

import { SELECTORS, queryFirst } from "@/content/selectors.config";

/** Pattern to detect a Marketplace item detail page URL. */
const DETAIL_URL_PATTERN = /\/marketplace\/item\/(\d+)/;

/** ID of the injected related-listings container. */
const RELATED_CONTAINER_ID = "mps-related-listings";

/** ID of the injected price analysis container. */
const PRICE_ANALYSIS_ID = "mps-price-analysis";

/**
 * Enhances Facebook Marketplace listing detail pages with additional
 * information and context from the extension's analysis engines.
 */
export class DetailPageEnhancer {
  /** Whether the enhancer is currently active. */
  private active = false;

  /** The current detail page listing ID, or `null` if not on a detail page. */
  private currentListingId: string | null = null;

  /** Cleanup function for the URL observer. */
  private urlObserverCleanup: (() => void) | null = null;

  /** MutationObserver watching for detail page content to load. */
  private contentObserver: MutationObserver | null = null;

  /**
   * Start enhancing detail pages.
   *
   * Sets up a URL observer that detects navigation to listing detail pages
   * and triggers enhancement injection. Safe to call multiple times --
   * subsequent calls are no-ops.
   */
  enhance(): void {
    if (this.active) return;
    this.active = true;

    // Check if we're already on a detail page
    this.checkCurrentPage();

    // Watch for SPA navigation
    this.urlObserverCleanup = this.observeUrlChanges(() => {
      this.checkCurrentPage();
    });
  }

  /**
   * Remove all injected enhancements and stop observing.
   *
   * Safe to call multiple times or when no enhancements have been injected.
   */
  cleanup(): void {
    this.active = false;
    this.currentListingId = null;

    if (this.urlObserverCleanup) {
      this.urlObserverCleanup();
      this.urlObserverCleanup = null;
    }

    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }

    this.removeInjectedElements();
  }

  // ---------------------------------------------------------------------------
  // URL observation
  // ---------------------------------------------------------------------------

  /**
   * Check the current page URL and enhance if it's a detail page.
   */
  private checkCurrentPage(): void {
    try {
      const match = window.location.pathname.match(DETAIL_URL_PATTERN);

      if (match) {
        const listingId = match[1];

        // Avoid re-enhancing the same page
        if (listingId === this.currentListingId) return;

        this.currentListingId = listingId;
        this.removeInjectedElements();
        this.waitForDetailContent(listingId);
      } else {
        // Left a detail page
        if (this.currentListingId) {
          this.currentListingId = null;
          this.removeInjectedElements();
        }
      }
    } catch (err) {
      console.warn("[MPS] Error checking current page:", err);
    }
  }

  /**
   * Observe URL changes in Facebook's SPA via History API interception and
   * popstate events.
   *
   * @param callback - Invoked whenever the URL changes.
   * @returns A cleanup function.
   */
  private observeUrlChanges(callback: () => void): () => void {
    let lastUrl = window.location.href;

    // Listen for popstate (back/forward navigation)
    const onPopState = (): void => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        callback();
      }
    };
    window.addEventListener("popstate", onPopState);

    // Observe <title> or <body> changes as a proxy for SPA navigation
    // (Facebook often does not trigger popstate for in-app navigation)
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        callback();
      }
    });

    // Watch <head> for title changes and <body> for structural changes
    if (document.head) {
      observer.observe(document.head, { childList: true, subtree: true });
    }
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: false,
      });
    }

    return () => {
      window.removeEventListener("popstate", onPopState);
      observer.disconnect();
    };
  }

  // ---------------------------------------------------------------------------
  // Content injection
  // ---------------------------------------------------------------------------

  /**
   * Wait for the detail page content to load, then inject enhancements.
   *
   * Facebook's SPA often renders the page shell before populating the
   * listing details, so we watch for the seller info section to appear.
   */
  private waitForDetailContent(listingId: string, retries = 20): void {
    try {
      // Look for a signal that the detail content has loaded
      const sellerInfo = queryFirst(document, SELECTORS.sellerName);
      const listingTitle = queryFirst(document, SELECTORS.listingTitle);

      if (sellerInfo || listingTitle) {
        this.injectEnhancements(listingId);
        return;
      }

      if (retries <= 0) {
        // Content never loaded; inject anyway with what we have
        this.injectEnhancements(listingId);
        return;
      }

      // Retry after a short delay
      setTimeout(() => {
        if (this.currentListingId === listingId && this.active) {
          this.waitForDetailContent(listingId, retries - 1);
        }
      }, 300);
    } catch (err) {
      console.warn("[MPS] Error waiting for detail content:", err);
    }
  }

  /**
   * Inject all enhancement sections into the detail page.
   */
  private injectEnhancements(listingId: string): void {
    if (!this.active || this.currentListingId !== listingId) return;

    try {
      this.injectRelatedListings(listingId);
      this.injectPriceAnalysis(listingId);
    } catch (err) {
      console.warn("[MPS] Error injecting detail page enhancements:", err);
    }
  }

  /**
   * Inject a "related listings" section below the main listing.
   */
  private injectRelatedListings(listingId: string): void {
    try {
      if (document.getElementById(RELATED_CONTAINER_ID)) return;

      const container = document.createElement("div");
      container.id = RELATED_CONTAINER_ID;
      container.className = "mps-related-listings";
      container.setAttribute("data-mps-component", "related-listings");
      container.setAttribute("data-mps-listing-id", listingId);

      // Header
      const header = document.createElement("div");
      header.className = "mps-related-header";

      const title = document.createElement("h3");
      title.className = "mps-related-title";
      title.textContent = "Similar Listings";
      header.appendChild(title);
      container.appendChild(header);

      // Placeholder content area (populated via events)
      const content = document.createElement("div");
      content.className = "mps-related-content";
      content.setAttribute("data-mps-part", "related-content");

      const loadingText = document.createElement("p");
      loadingText.className = "mps-related-loading";
      loadingText.textContent = "Finding similar listings...";
      content.appendChild(loadingText);

      container.appendChild(content);

      // Insert after the main listing content
      const mainContent = document.querySelector('[role="main"]');
      if (mainContent) {
        mainContent.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    } catch (err) {
      console.warn("[MPS] Error injecting related listings:", err);
    }
  }

  /**
   * Inject a price analysis section showing market comparison data.
   */
  private injectPriceAnalysis(listingId: string): void {
    try {
      if (document.getElementById(PRICE_ANALYSIS_ID)) return;

      const container = document.createElement("div");
      container.id = PRICE_ANALYSIS_ID;
      container.className = "mps-price-analysis";
      container.setAttribute("data-mps-component", "price-analysis");
      container.setAttribute("data-mps-listing-id", listingId);

      // Header
      const header = document.createElement("div");
      header.className = "mps-price-header";

      const title = document.createElement("h3");
      title.className = "mps-price-title";
      title.textContent = "Price Analysis";
      header.appendChild(title);
      container.appendChild(header);

      // Content placeholder
      const content = document.createElement("div");
      content.className = "mps-price-content";
      content.setAttribute("data-mps-part", "price-content");

      const loadingText = document.createElement("p");
      loadingText.className = "mps-price-loading";
      loadingText.textContent = "Analyzing price...";
      content.appendChild(loadingText);

      container.appendChild(content);

      // Try to insert near the price element on the detail page
      const priceEl = queryFirst(document, SELECTORS.listingPrice);
      if (priceEl?.parentElement) {
        priceEl.parentElement.insertAdjacentElement("afterend", container);
      } else {
        const mainContent = document.querySelector('[role="main"]');
        if (mainContent) {
          mainContent.appendChild(container);
        }
      }
    } catch (err) {
      console.warn("[MPS] Error injecting price analysis:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Remove all MPS-injected elements from the detail page.
   */
  private removeInjectedElements(): void {
    try {
      const ids = [RELATED_CONTAINER_ID, PRICE_ANALYSIS_ID];
      for (const id of ids) {
        document.getElementById(id)?.remove();
      }
    } catch (err) {
      console.warn("[MPS] Error removing injected elements:", err);
    }
  }
}
