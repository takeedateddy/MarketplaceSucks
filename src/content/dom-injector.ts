/**
 * @module content/dom-injector
 *
 * Injects MarketplaceSucks UI elements into the Facebook Marketplace page:
 * sidebar container, toggle button, listing badges, and preview panel.
 *
 * All injected elements use `mps-` prefixed CSS classes and `data-mps-*`
 * attributes to avoid collisions with Facebook's own styles and to make
 * the extension's DOM footprint easy to identify and clean up.
 *
 * @example
 * ```ts
 * import { DomInjector } from "@/content/dom-injector";
 *
 * const injector = new DomInjector();
 * injector.injectSidebar();
 * injector.injectToggleButton();
 * ```
 */

/** Badge descriptor passed to {@link DomInjector.injectBadge}. */
export interface BadgeDescriptor {
  /** Badge type, used for CSS class selection. */
  readonly type: "trust" | "price" | "heat" | "image";
  /** Severity / rating level within the type. */
  readonly level: string;
  /** Short text displayed inside the badge. */
  readonly label: string;
  /** Optional tooltip text shown on hover. */
  readonly tooltip?: string;
}

/** IDs for top-level injected containers. */
const ELEMENT_IDS = {
  sidebar: "mps-sidebar",
  sidebarToggle: "mps-sidebar-toggle",
  previewPanel: "mps-preview-panel",
  comparisonBar: "mps-comparison-bar",
  styleSheet: "mps-content-styles",
} as const;

/**
 * Injects and manages MarketplaceSucks UI elements within the Facebook
 * Marketplace page DOM.
 */
export class DomInjector {
  /**
   * Inject the sidebar container into the page.
   *
   * The sidebar hosts filter controls, sort options, and analytics panels.
   * If the sidebar already exists it is returned without creating a duplicate.
   *
   * @returns The sidebar container element, or `null` if injection failed.
   */
  /**
   * Inject the MPS controls by replacing Facebook's left navigation sidebar.
   * The original nav is hidden (not removed) so it can be toggled back.
   * If no left nav is found, falls back to creating a fixed-position panel.
   */
  injectSidebar(): HTMLElement | null {
    try {
      const existing = document.getElementById(ELEMENT_IDS.sidebar);
      if (existing) return existing;

      const sidebar = document.createElement("div");
      sidebar.id = ELEMENT_IDS.sidebar;
      sidebar.className = "mps-sidebar";
      sidebar.setAttribute("data-mps-component", "sidebar");
      sidebar.setAttribute("role", "complementary");
      sidebar.setAttribute("aria-label", "MarketplaceSucks filters and tools");
      sidebar.setAttribute("data-mps-open", "true");

      // Header
      const header = document.createElement("div");
      header.className = "mps-sidebar-header";
      header.setAttribute("data-mps-part", "sidebar-header");

      const title = document.createElement("h2");
      title.className = "mps-sidebar-title";
      title.textContent = "MarketplaceSucks";

      header.appendChild(title);
      sidebar.appendChild(header);

      // Content area
      const content = document.createElement("div");
      content.className = "mps-sidebar-content";
      content.setAttribute("data-mps-part", "sidebar-content");

      // Stats section
      const stats = document.createElement("div");
      stats.className = "mps-sidebar-section";
      stats.innerHTML = `
        <div style="padding: 12px; background: var(--mps-color-background, #f0f2f5); border-radius: 8px; margin-bottom: 12px;">
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">Listing Stats</div>
          <div id="mps-stats-content" style="font-size: 12px; color: var(--mps-color-text-secondary, #65676b);">
            Scanning listings...
          </div>
          <div id="mps-filter-status" style="font-size: 12px; margin-top: 6px; display: none;">
          </div>
        </div>
      `;
      content.appendChild(stats);

      // Search box
      const filterSection = document.createElement("div");
      filterSection.className = "mps-sidebar-section";
      filterSection.innerHTML = `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Search Marketplace</label>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="mps-keyword-input" data-mps-filter-input
              placeholder="Search for anything..."
              style="flex: 1; padding: 8px 12px; border: 1px solid var(--mps-color-border, #ced0d4); border-radius: 6px; font-size: 13px; box-sizing: border-box; background: var(--mps-color-surface, #fff); color: var(--mps-color-text-primary, #1c1e21);" />
            <button id="mps-search-btn"
              style="padding: 8px 14px; border: none; border-radius: 6px; background: var(--mps-color-primary, #0866ff); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;">
              Search
            </button>
          </div>
          <div style="font-size: 11px; color: var(--mps-color-text-secondary, #65676b); margin-top: 4px;">
            Press Enter or click Search. Use price filters below to narrow results.
          </div>
        </div>
      `;
      content.appendChild(filterSection);

      // Price filter
      const priceSection = document.createElement("div");
      priceSection.className = "mps-sidebar-section";
      priceSection.innerHTML = `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Price Range</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="number" id="mps-price-min" placeholder="Min" min="0" step="1"
              style="flex: 1; padding: 8px; border: 1px solid var(--mps-color-border, #ced0d4); border-radius: 6px; font-size: 13px; box-sizing: border-box; background: var(--mps-color-surface, #fff); color: var(--mps-color-text-primary, #1c1e21);" />
            <span style="color: var(--mps-color-text-secondary, #65676b);">to</span>
            <input type="number" id="mps-price-max" placeholder="Max" min="0" step="1"
              style="flex: 1; padding: 8px; border: 1px solid var(--mps-color-border, #ced0d4); border-radius: 6px; font-size: 13px; box-sizing: border-box; background: var(--mps-color-surface, #fff); color: var(--mps-color-text-primary, #1c1e21);" />
          </div>
        </div>
      `;
      content.appendChild(priceSection);

      // Sort dropdown
      const sortSection = document.createElement("div");
      sortSection.className = "mps-sidebar-section";
      sortSection.innerHTML = `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Sort By</label>
          <select id="mps-sort-select"
            style="width: 100%; padding: 8px; border: 1px solid var(--mps-color-border, #ced0d4); border-radius: 6px; font-size: 13px; background: var(--mps-color-surface, #fff); color: var(--mps-color-text-primary, #1c1e21); cursor: pointer;">
            <option value="">Default (Facebook order)</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="distance-asc">Nearest First</option>
            <option value="alphabetical-asc">A-Z</option>
            <option value="alphabetical-desc">Z-A</option>
          </select>
        </div>
      `;
      content.appendChild(sortSection);

      // Clear filters button
      const clearSection = document.createElement("div");
      clearSection.className = "mps-sidebar-section";
      clearSection.innerHTML = `
        <button id="mps-clear-filters-btn"
          style="width: 100%; padding: 10px; border: 1px solid var(--mps-color-border, #ced0d4); border-radius: 6px; background: transparent; color: var(--mps-color-text-secondary, #65676b); font-size: 13px; cursor: pointer; margin-bottom: 12px; transition: background 0.15s;">
          Clear All Filters
        </button>
      `;
      content.appendChild(clearSection);

      // Info section
      const info = document.createElement("div");
      info.className = "mps-sidebar-section";
      info.innerHTML = `
        <div style="padding: 12px; background: var(--mps-color-background, #f0f2f5); border-radius: 8px; font-size: 12px; color: var(--mps-color-text-secondary, #65676b);">
          <div style="font-weight: 600; margin-bottom: 4px;">MarketplaceSucks v0.1.0</div>
          <div>All processing runs locally. No data leaves your browser.</div>
          <div style="margin-top: 4px;">Press Alt+S to toggle this sidebar.</div>
        </div>
      `;
      content.appendChild(info);

      sidebar.appendChild(content);

      // Try to replace Facebook's left navigation sidebar
      const fbLeftNav = this.findFacebookLeftNav();
      if (fbLeftNav) {
        // Hide Facebook's nav and insert ours in the same position
        fbLeftNav.setAttribute("data-mps-original-display", getComputedStyle(fbLeftNav).display);
        fbLeftNav.style.display = "none";
        fbLeftNav.setAttribute("data-mps-hidden-nav", "true");
        fbLeftNav.parentElement?.insertBefore(sidebar, fbLeftNav);
        console.log("[MPS] Replaced Facebook left nav with MPS controls");
      } else {
        // Fallback: append to body as a left-side fixed panel
        document.body.appendChild(sidebar);
        console.log("[MPS] No Facebook left nav found, using fixed panel");
      }

      return sidebar;
    } catch (err) {
      console.warn("[MPS] Failed to inject sidebar:", err);
      return null;
    }
  }

  /**
   * Find Facebook's left sidebar navigation element.
   * Facebook wraps the left Marketplace nav (Browse all, Jobs, etc.)
   * in a container that's a sibling of the main content area.
   */
  private findFacebookLeftNav(): HTMLElement | null {
    // Facebook's left column contains "Marketplace" heading, search bar,
    // "Browse all", "Jobs", "Notifications", categories, etc.
    // We need to find the outermost container of the entire left column.

    // Strategy 1: Find the "Marketplace" heading text and walk up
    const allElements = document.querySelectorAll('h1, h2, span, div');
    for (const el of Array.from(allElements)) {
      if (el.textContent?.trim() === 'Marketplace' && el.tagName !== 'A') {
        let parent = el.parentElement;
        for (let i = 0; i < 15 && parent; i++) {
          const rect = parent.getBoundingClientRect();
          // Left column: left edge near 0, width 200-400px, tall
          if (rect.left < 50 && rect.width > 150 && rect.width < 400 && rect.height > 400) {
            return parent as HTMLElement;
          }
          parent = parent.parentElement;
        }
      }
    }

    // Strategy 2: Find nav links and walk up
    const navLinks = document.querySelectorAll('a[href="/marketplace/"]');
    for (const link of Array.from(navLinks)) {
      let parent = link.parentElement;
      for (let i = 0; i < 10 && parent; i++) {
        const rect = parent.getBoundingClientRect();
        if (rect.left < 50 && rect.width > 150 && rect.width < 400 && rect.height > 400) {
          return parent as HTMLElement;
        }
        parent = parent.parentElement;
      }
    }

    return null;
  }

  /**
   * Inject the floating toggle button used to open/close the sidebar.
   *
   * @returns The toggle button element, or `null` if injection failed.
   */
  injectToggleButton(): HTMLElement | null {
    try {
      const existing = document.getElementById(ELEMENT_IDS.sidebarToggle);
      if (existing) return existing;

      const button = document.createElement("button");
      button.id = ELEMENT_IDS.sidebarToggle;
      button.className = "mps-sidebar-toggle";
      button.setAttribute("data-mps-component", "sidebar-toggle");
      button.setAttribute("aria-label", "Toggle MarketplaceSucks sidebar");
      button.setAttribute("title", "MarketplaceSucks");

      // Icon: a small filter/funnel glyph
      const icon = document.createElement("span");
      icon.className = "mps-toggle-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;

      button.appendChild(icon);
      document.body.appendChild(button);
      return button;
    } catch (err) {
      console.warn("[MPS] Failed to inject toggle button:", err);
      return null;
    }
  }

  /**
   * Inject one or more badge overlays onto a listing card element.
   *
   * Badges indicate trust scores, price ratings, heat levels, or image
   * analysis results. Each badge is positioned as an overlay within the
   * listing card.
   *
   * @param listingElement - The listing card DOM element to decorate.
   * @param badges - Array of badge descriptors to inject.
   */
  injectBadge(listingElement: Element, badges: BadgeDescriptor[]): void {
    try {
      // Remove any existing badges on this element
      const existingContainer = listingElement.querySelector("[data-mps-part='badge-container']");
      if (existingContainer) {
        existingContainer.remove();
      }

      if (badges.length === 0) return;

      const container = document.createElement("div");
      container.className = "mps-badge-container";
      container.setAttribute("data-mps-part", "badge-container");

      for (const badge of badges) {
        const badgeEl = document.createElement("span");
        badgeEl.className = `mps-badge mps-badge-${badge.type}-${badge.level}`;
        badgeEl.setAttribute("data-mps-badge-type", badge.type);
        badgeEl.setAttribute("data-mps-badge-level", badge.level);
        badgeEl.textContent = badge.label;

        if (badge.tooltip) {
          badgeEl.setAttribute("title", badge.tooltip);
          badgeEl.setAttribute("aria-label", badge.tooltip);
        }

        container.appendChild(badgeEl);
      }

      // Ensure the listing element can contain absolutely-positioned children
      if (listingElement instanceof HTMLElement) {
        const position = getComputedStyle(listingElement).position;
        if (position === "static") {
          listingElement.style.position = "relative";
        }
      }

      listingElement.appendChild(container);
    } catch (err) {
      console.warn("[MPS] Failed to inject badge:", err);
    }
  }

  /**
   * Inject the preview panel used for quick-view of listing details.
   *
   * The panel slides in from the right when a user hovers or clicks a
   * listing card while holding a modifier key.
   *
   * @returns The preview panel element, or `null` if injection failed.
   */
  injectPreviewPanel(): HTMLElement | null {
    try {
      const existing = document.getElementById(ELEMENT_IDS.previewPanel);
      if (existing) return existing;

      const panel = document.createElement("div");
      panel.id = ELEMENT_IDS.previewPanel;
      panel.className = "mps-preview-panel";
      panel.setAttribute("data-mps-component", "preview-panel");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "Listing preview");
      panel.setAttribute("aria-hidden", "true");

      // Close button
      const closeBtn = document.createElement("button");
      closeBtn.className = "mps-preview-close";
      closeBtn.setAttribute("data-mps-action", "close-preview");
      closeBtn.setAttribute("aria-label", "Close preview");
      closeBtn.textContent = "\u00D7";
      panel.appendChild(closeBtn);

      // Content area
      const content = document.createElement("div");
      content.className = "mps-preview-content";
      content.setAttribute("data-mps-part", "preview-content");
      panel.appendChild(content);

      document.body.appendChild(panel);
      return panel;
    } catch (err) {
      console.warn("[MPS] Failed to inject preview panel:", err);
      return null;
    }
  }

  /**
   * Inject the comparison bar at the bottom of the viewport.
   *
   * The comparison bar holds thumbnails of listings the user has selected
   * for side-by-side comparison.
   *
   * @returns The comparison bar element, or `null` if injection failed.
   */
  injectComparisonBar(): HTMLElement | null {
    try {
      const existing = document.getElementById(ELEMENT_IDS.comparisonBar);
      if (existing) return existing;

      const bar = document.createElement("div");
      bar.id = ELEMENT_IDS.comparisonBar;
      bar.className = "mps-comparison-bar";
      bar.setAttribute("data-mps-component", "comparison-bar");
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "Listing comparison");
      bar.setAttribute("aria-hidden", "true");

      // Slot for comparison items
      const items = document.createElement("div");
      items.className = "mps-comparison-items";
      items.setAttribute("data-mps-part", "comparison-items");
      bar.appendChild(items);

      // Compare button
      const compareBtn = document.createElement("button");
      compareBtn.className = "mps-comparison-action";
      compareBtn.setAttribute("data-mps-action", "compare");
      compareBtn.textContent = "Compare";
      compareBtn.disabled = true;
      bar.appendChild(compareBtn);

      document.body.appendChild(bar);
      return bar;
    } catch (err) {
      console.warn("[MPS] Failed to inject comparison bar:", err);
      return null;
    }
  }

  /**
   * Remove all MarketplaceSucks-injected elements from the page.
   *
   * Useful during cleanup or when navigating away from Marketplace.
   */
  removeAll(): void {
    try {
      const injectedElements = document.querySelectorAll("[data-mps-component]");
      for (const el of Array.from(injectedElements)) {
        el.remove();
      }

      // Also remove badge containers within listing cards
      const badges = document.querySelectorAll("[data-mps-part='badge-container']");
      for (const el of Array.from(badges)) {
        el.remove();
      }
    } catch (err) {
      console.warn("[MPS] Error during DOM cleanup:", err);
    }
  }
}
