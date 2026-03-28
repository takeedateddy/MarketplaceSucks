/**
 * Notification history panel showing alerts for saved search matches
 * and price drops. Users can view, dismiss, and clear notifications.
 *
 * @module ui/sidebar/NotificationPanel
 */

import React, { useState, useCallback } from 'react';
import { PanelLayout } from '@/design-system/layouts/PanelLayout';
import { Button } from '@/design-system/primitives/Button';
import { Badge } from '@/design-system/primitives/Badge';
import { EmptyState } from '@/design-system/primitives/EmptyState';

/** A notification entry for display */
interface NotificationEntry {
  id: string;
  type: 'new-match' | 'price-drop';
  title: string;
  body: string;
  url: string;
  timestamp: number;
  read: boolean;
}

/** Props for the {@link NotificationPanel} component. */
export interface NotificationPanelProps {
  className?: string;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Displays notification history with saved search matches and price drops.
 */
export function NotificationPanel({ className }: NotificationPanelProps): React.ReactElement {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PanelLayout
      title="Notifications"
      className={className}
      actions={
        notifications.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        ) : undefined
      }
    >
      {unreadCount > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <Badge variant="info">{unreadCount} unread</Badge>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Alerts for saved search matches and price drops will appear here. Enable notifications on a saved search to get started."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                markAsRead(notification.id);
                if (notification.url) {
                  window.open(notification.url, '_blank');
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  markAsRead(notification.id);
                  if (notification.url) window.open(notification.url, '_blank');
                }
              }}
              style={{
                cursor: 'pointer',
                opacity: notification.read ? 0.7 : 1,
                borderLeft: notification.read
                  ? '3px solid transparent'
                  : '3px solid var(--mps-primary, #3b82f6)',
                padding: '10px',
                borderRadius: 'var(--mps-radius-sm, 6px)',
                background: 'var(--mps-bg-surface, #fff)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Badge
                    variant={notification.type === 'price-drop' ? 'success' : 'info'}
                    size="sm"
                  >
                    {notification.type === 'price-drop' ? 'Price Drop' : 'New Match'}
                  </Badge>
                  <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '13px' }}>
                    {notification.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mps-text-secondary, #6b7280)', marginTop: '2px' }}>
                    {notification.body}
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--mps-text-tertiary, #9ca3af)', whiteSpace: 'nowrap' }}>
                  {formatTimeAgo(notification.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelLayout>
  );
}
