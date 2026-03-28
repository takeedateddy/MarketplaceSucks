/**
 * React theme provider for the MarketplaceSucks design system.
 *
 * Wraps the application (or a subtree) with theme context and injects the
 * corresponding CSS custom properties into the document.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { injectCSSVariables } from './css-variables';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported theme modes. */
export type ThemeMode = 'light' | 'dark';

/** Shape of the theme context value. */
export interface ThemeContextValue {
  /** The currently active theme. */
  readonly theme: ThemeMode;
  /** Switch to a specific theme. */
  readonly setTheme: (theme: ThemeMode) => void;
  /** Toggle between light and dark. */
  readonly toggleTheme: () => void;
}

/** Props accepted by {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** Initial theme. Defaults to `'light'`. */
  initialTheme?: ThemeMode;
  /** React children. */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Provides the current theme to all descendants and injects the matching CSS
 * custom properties into the document head.
 *
 * @example
 * ```tsx
 * <ThemeProvider initialTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme = 'light',
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  // Inject / update CSS variables whenever the theme changes.
  useEffect(() => {
    injectCSSVariables(theme);
  }, [theme]);

  const toggleTheme = useMemo(
    () => () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current theme context.
 *
 * Must be used inside a {@link ThemeProvider}.
 *
 * @throws If called outside of a ThemeProvider.
 *
 * @example
 * ```tsx
 * const { theme, toggleTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);

  if (ctx === undefined) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }

  return ctx;
}
