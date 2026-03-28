/**
 * Extension popup component. Shows quick stats, feature toggles,
 * and links to the sidebar and settings.
 *
 * @module Popup
 */

import { useState, useEffect, useCallback } from 'react';

interface PopupStats {
  listingCount: number;
  filterCount: number;
  flaggedTrust: number;
  flaggedImages: number;
}

/**
 * Main popup UI shown when clicking the extension icon.
 */
export function Popup() {
  const [stats, setStats] = useState<PopupStats>({
    listingCount: 0,
    filterCount: 0,
    flaggedTrust: 0,
    flaggedImages: 0,
  });
  const [isOnMarketplace, setIsOnMarketplace] = useState(false);

  useEffect(() => {
    // Check if current tab is on Marketplace
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? '';
      setIsOnMarketplace(url.includes('facebook.com/marketplace'));
    });

    // Get stats from background
    chrome.runtime?.sendMessage({ action: 'get-stats' }, (response) => {
      if (response) {
        setStats((prev) => ({
          ...prev,
          listingCount: response.listingCount ?? 0,
          filterCount: response.filterCount ?? 0,
        }));
      }
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    chrome.runtime?.sendMessage({ action: 'toggle-sidebar' });
  }, []);

  const handleOpenMarketplace = useCallback(() => {
    chrome.runtime?.sendMessage({ action: 'open-marketplace' });
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>&#x1F6D2;</span>
          <span style={styles.logoText}>MarketplaceSucks</span>
        </div>
        <div style={styles.version}>v0.1.0</div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {isOnMarketplace ? (
          <>
            {/* Stats */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.listingCount}</div>
                <div style={styles.statLabel}>Listings found</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{stats.filterCount}</div>
                <div style={styles.statLabel}>After filters</div>
              </div>
            </div>

            {/* Actions */}
            <button style={styles.primaryButton} onClick={handleToggleSidebar}>
              Toggle Sidebar
            </button>
          </>
        ) : (
          <div style={styles.notOnMarketplace}>
            <p style={styles.infoText}>
              Navigate to Facebook Marketplace to use MarketplaceSucks.
            </p>
            <button style={styles.primaryButton} onClick={handleOpenMarketplace}>
              Open Marketplace
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <a
          href="https://github.com/takeedateddy/MarketplaceSucks"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.footerLink}
        >
          GitHub
        </a>
        <span style={styles.footerDivider}>|</span>
        <span style={styles.footerText}>No data collection. Everything local.</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '200px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #ced0d4',
    background: '#f0f2f5',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '20px',
  },
  logoText: {
    fontWeight: '700',
    fontSize: '15px',
    color: '#e04f5f',
  },
  version: {
    fontSize: '11px',
    color: '#65676b',
  },
  content: {
    padding: '16px',
    flex: 1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  statCard: {
    padding: '12px',
    background: '#f0f2f5',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1c1e21',
  },
  statLabel: {
    fontSize: '11px',
    color: '#65676b',
    marginTop: '2px',
  },
  primaryButton: {
    width: '100%',
    padding: '10px 16px',
    background: '#e04f5f',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  notOnMarketplace: {
    textAlign: 'center' as const,
  },
  infoText: {
    color: '#65676b',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  footer: {
    padding: '8px 16px',
    borderTop: '1px solid #ced0d4',
    fontSize: '11px',
    color: '#65676b',
    textAlign: 'center' as const,
  },
  footerLink: {
    color: '#1877f2',
    textDecoration: 'none',
  },
  footerDivider: {
    margin: '0 6px',
  },
  footerText: {
    fontSize: '10px',
  },
};
