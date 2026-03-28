/**
 * @module content/listing-observer
 *
 * MutationObserver-based watcher that detects new listing cards appearing in
 * the Facebook Marketplace DOM -- typically from infinite scroll or client-side
 * navigation.
 *
 * The observer debounces rapid DOM mutations (100 ms) so downstream consumers
 * receive batched callbacks rather than per-node notifications.
 *
 * @example
 * ```ts
 * import { ListingObserver } from "@/content/listing-observer";
 *
 * const observer = new ListingObserver();
 * observer.onNewListings((elements) => {
 *   console.log(`Found ${elements.length} new listing cards`);
 * });
 * observer.start();
 * ```
 */

import { SELECTORS, queryFirst, queryAllFirst } from "@/content/selectors.config";

/** Callback signature for new-listing notifications. */
type NewListingsCallback = (elements: Element[]) => void;

/**
 * Watches the Facebook Marketplace DOM for newly-inserted listing card
 * elements and notifies registered callbacks in debounced batches.
 */
export class ListingObserver {
  /** Internal MutationObserver instance. */
  private observer: MutationObserver | null = null;

  /** Registered callbacks to invoke when new listings appear. */
  private callbacks: NewListingsCallback[] = [];

  /** Pending new elements accumulated during the debounce window. */
  private pendingElements: Set<Element> = new Set();

  /** Handle for the debounce timer. */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Debounce interval in milliseconds. */
  private readonly debounceMs: number;

  /** Set of listing element references we have already reported. */
  private readonly seenElements: WeakSet<Element> = new WeakSet();

  /**
   * Create a new ListingObserver.
   *
   * @param debounceMs - How long to wait (ms) after the last mutation before
   *   flushing the batch. Defaults to `100`.
   */
  constructor(debounceMs = 100) {
    this.debounceMs = debounceMs;
  }

  /**
   * Register a callback that fires whenever new listing card elements appear.
   *
   * @param callback - Invoked with an array of newly-detected listing card
   *   DOM elements. Each element is reported at most once.
   */
  onNewListings(callback: NewListingsCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Begin observing the Marketplace container for new listing cards.
   *
   * If the container is not yet in the DOM the observer will poll for it
   * (up to 10 seconds) before giving up.
   *
   * Also performs an initial scan so that listings already present on the
   * page when the extension loads are detected.
   */
  start(): void {
    if (this.observer) {
      console.warn("[MPS] ListingObserver is already running.");
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.attachToContainer();
  }

  /**
   * Stop observing and release resources.
   */
  stop(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.pendingElements.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Locate the Marketplace container and attach the MutationObserver.
   * Retries every 500 ms for up to 10 seconds if the container is not
   * immediately available (common during Facebook's SPA transitions).
   */
  private attachToContainer(retries = 20): void {
    try {
      const container = queryFirst(document, SELECTORS.marketplaceContainer);

      if (container) {
        this.observeContainer(container);
        this.performInitialScan(container);
        return;
      }

      // Fallback: observe <body> if the specific container is missing.
      if (retries <= 0) {
        console.warn(
          "[MPS] Marketplace container not found after retries. Falling back to document.body.",
        );
        if (document.body) {
          this.observeContainer(document.body);
          this.performInitialScan(document.body);
        }
        return;
      }

      setTimeout(() => this.attachToContainer(retries - 1), 500);
    } catch (err) {
      console.warn("[MPS] Error attaching listing observer:", err);
    }
  }

  /**
   * Start observing a specific container element for subtree changes.
   */
  private observeContainer(container: Element): void {
    if (!this.observer) return;

    this.observer.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Scan the container for listing cards that are already present and report
   * them as "new".
   */
  private performInitialScan(container: Element): void {
    try {
      const existingCards = queryAllFirst(container, SELECTORS.listingCard);
      for (const card of existingCards) {
        if (!this.seenElements.has(card)) {
          this.seenElements.add(card);
          this.pendingElements.add(card);
        }
      }
      this.scheduleFlush();
    } catch (err) {
      console.warn("[MPS] Error during initial listing scan:", err);
    }
  }

  /**
   * Process raw MutationRecords, extracting any added nodes that look like
   * listing cards (or contain listing cards).
   */
  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof Element)) continue;

        try {
          this.collectListingCards(node);
        } catch (err) {
          console.warn("[MPS] Error processing mutation node:", err);
        }
      }
    }

    if (this.pendingElements.size > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * Check whether `node` itself is a listing card, and also search its
   * subtree for listing cards.
   */
  private collectListingCards(node: Element): void {
    // Check if the node itself matches a listing card selector
    for (const selector of SELECTORS.listingCard) {
      try {
        if (node.matches(selector) && !this.seenElements.has(node)) {
          this.seenElements.add(node);
          this.pendingElements.add(node);
        }
      } catch {
        // Invalid selector -- skip
      }
    }

    // Search the subtree for listing cards
    const cards = queryAllFirst(node, SELECTORS.listingCard);
    for (const card of cards) {
      if (!this.seenElements.has(card)) {
        this.seenElements.add(card);
        this.pendingElements.add(card);
      }
    }
  }

  /**
   * Schedule a debounced flush of accumulated listing elements.
   */
  private scheduleFlush(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * Deliver all accumulated listing elements to registered callbacks.
   */
  private flush(): void {
    this.debounceTimer = null;

    if (this.pendingElements.size === 0) return;

    const elements = Array.from(this.pendingElements);
    this.pendingElements.clear();

    for (const callback of this.callbacks) {
      try {
        callback(elements);
      } catch (err) {
        console.error("[MPS] Error in onNewListings callback:", err);
      }
    }
  }
}
