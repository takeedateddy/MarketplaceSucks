/**
 * Lightweight event bus for decoupled communication between modules.
 * Analysis engines, filters, and UI components communicate via events
 * rather than direct imports.
 *
 * @module event-bus
 */

/** Handler function type for event subscriptions */
type EventHandler<T = unknown> = (data: T) => void;

/**
 * Standard event names used throughout the extension.
 * Use these constants instead of raw strings to prevent typos.
 */
export const MPS_EVENTS = {
  /** New listings extracted from DOM */
  LISTINGS_PARSED: 'listings:parsed',
  /** Filter results updated */
  LISTINGS_FILTERED: 'listings:filtered',
  /** Sort order changed */
  LISTINGS_SORTED: 'listings:sorted',
  /** An analyzer finished processing */
  ANALYSIS_COMPLETE: 'analysis:complete',
  /** Seller trust score computed */
  SELLER_SCORED: 'seller:scored',
  /** Price rating computed */
  PRICE_RATED: 'price:rated',
  /** Image analysis complete */
  IMAGE_ANALYZED: 'image:analyzed',
  /** Heat scores recalculated */
  HEAT_UPDATED: 'heat:updated',
  /** User changed a setting */
  SETTINGS_CHANGED: 'settings:changed',
  /** Dark/light mode toggled */
  THEME_CHANGED: 'theme:changed',
  /** Sidebar open/close toggled */
  SIDEBAR_TOGGLED: 'sidebar:toggled',
  /** Listing added to comparison queue */
  COMPARISON_ADDED: 'comparison:added',
  /** Listing removed from comparison queue */
  COMPARISON_REMOVED: 'comparison:removed',
  /** Listing marked as seen */
  LISTING_SEEN: 'listing:seen',
  /** Saved search loaded */
  SEARCH_LOADED: 'search:loaded',
  /** New notification generated */
  NOTIFICATION_NEW: 'notification:new',
  /** Notification read/dismissed */
  NOTIFICATION_READ: 'notification:read',
  /** All notifications cleared */
  NOTIFICATION_CLEAR: 'notification:clear',
  /** Selector health check completed */
  SELECTOR_HEALTH_CHECKED: 'selector:health-checked',
} as const;

/**
 * A lightweight, typed event bus for decoupled module communication.
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Subscribe
 * const unsub = bus.on(MPS_EVENTS.LISTINGS_PARSED, (listings) => {
 *   console.log('Got listings:', listings);
 * });
 *
 * // Emit
 * bus.emit(MPS_EVENTS.LISTINGS_PARSED, parsedListings);
 *
 * // Unsubscribe
 * unsub();
 * ```
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event.
   *
   * @param event - The event name to subscribe to
   * @param handler - The callback to invoke when the event fires
   * @returns An unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = bus.on('listings:parsed', (data) => console.log(data));
   * unsub(); // later, to unsubscribe
   * ```
   */
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const typedHandler = handler as EventHandler;
    this.handlers.get(event)!.add(typedHandler);
    return () => {
      this.handlers.get(event)?.delete(typedHandler);
    };
  }

  /**
   * Subscribe to an event, but only fire the handler once.
   *
   * @param event - The event name to subscribe to
   * @param handler - The callback to invoke once
   * @returns An unsubscribe function
   */
  once<T>(event: string, handler: EventHandler<T>): () => void {
    const unsub = this.on<T>(event, (data) => {
      unsub();
      handler(data);
    });
    return unsub;
  }

  /**
   * Emit an event, invoking all subscribed handlers.
   *
   * @param event - The event name to emit
   * @param data - The data to pass to handlers
   *
   * @example
   * ```typescript
   * bus.emit('listings:parsed', { listings: [...], count: 10 });
   * ```
   */
  emit<T>(event: string, data: T): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[MPS] Error in event handler for "${event}":`, err);
      }
    });
  }

  /**
   * Remove all handlers for a specific event, or all events if no event specified.
   *
   * @param event - Optional event name. If omitted, clears all handlers.
   */
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of handlers registered for an event.
   *
   * @param event - The event name
   * @returns The number of handlers
   */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
