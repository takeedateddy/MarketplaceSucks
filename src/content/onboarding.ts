/**
 * First-time user onboarding overlay.
 *
 * Shows a 3-step walkthrough on the first Marketplace visit after install.
 * Highlights the sidebar toggle and key features. Dismissible and
 * persisted via chrome.storage.local so it only shows once.
 *
 * @module content/onboarding
 */

import { browser } from '@/platform/browser';

const STORAGE_KEY = 'mps-onboarding-complete';

/**
 * Check if onboarding has been completed.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result as Record<string, unknown>)[STORAGE_KEY] === true;
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as completed.
 */
export async function completeOnboarding(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: true });
}

/**
 * The onboarding steps shown to first-time users.
 */
export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to MarketplaceSucks',
    body: 'Finally, Marketplace search that actually works. Click the toggle button to open the sidebar.',
    highlight: 'toggle-button',
  },
  {
    id: 'filters',
    title: '18+ Real Filters',
    body: 'Filter by keywords, price range, condition, distance, seller trust, and more. Try typing a keyword to see it in action.',
    highlight: 'filter-panel',
  },
  {
    id: 'intelligence',
    title: 'Built-in Intelligence',
    body: 'Every listing gets a seller trust score, price rating, and AI image analysis — all computed locally on your device.',
    highlight: 'trust-panel',
  },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * Show the onboarding overlay if the user hasn't completed it.
 * Creates a shadow DOM container with the walkthrough UI.
 *
 * @returns A cleanup function to remove the overlay, or null if already completed.
 */
export async function showOnboardingIfNeeded(): Promise<(() => void) | null> {
  const complete = await isOnboardingComplete();
  if (complete) return null;

  const container = document.createElement('div');
  container.id = 'mps-onboarding-container';

  const shadow = container.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .mps-onboarding-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .mps-onboarding-card {
      background: #fff;
      border-radius: 12px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .mps-onboarding-title {
      font-size: 20px;
      font-weight: 700;
      color: #111;
      margin-bottom: 12px;
    }
    .mps-onboarding-body {
      font-size: 14px;
      color: #555;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .mps-onboarding-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
    }
    .mps-onboarding-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ddd;
    }
    .mps-onboarding-dot.active {
      background: #3b82f6;
    }
    .mps-onboarding-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .mps-onboarding-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s;
    }
    .mps-onboarding-btn:hover { opacity: 0.85; }
    .mps-onboarding-btn-primary {
      background: #3b82f6;
      color: #fff;
    }
    .mps-onboarding-btn-ghost {
      background: transparent;
      color: #888;
    }
    .mps-onboarding-step-counter {
      font-size: 12px;
      color: #999;
      margin-bottom: 16px;
    }
  `;
  shadow.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'mps-onboarding-overlay';
  shadow.appendChild(overlay);

  let currentStep = 0;

  function render(): void {
    const step = ONBOARDING_STEPS[currentStep];
    const isLast = currentStep === ONBOARDING_STEPS.length - 1;

    overlay.innerHTML = `
      <div class="mps-onboarding-card">
        <div class="mps-onboarding-step-counter">
          Step ${currentStep + 1} of ${ONBOARDING_STEPS.length}
        </div>
        <div class="mps-onboarding-title">${step.title}</div>
        <div class="mps-onboarding-body">${step.body}</div>
        <div class="mps-onboarding-dots">
          ${ONBOARDING_STEPS.map((_, i) =>
            `<div class="mps-onboarding-dot ${i === currentStep ? 'active' : ''}"></div>`,
          ).join('')}
        </div>
        <div class="mps-onboarding-actions">
          <button class="mps-onboarding-btn mps-onboarding-btn-ghost" id="mps-skip">
            Skip
          </button>
          <button class="mps-onboarding-btn mps-onboarding-btn-primary" id="mps-next">
            ${isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    `;

    shadow.getElementById('mps-skip')?.addEventListener('click', dismiss);
    shadow.getElementById('mps-next')?.addEventListener('click', () => {
      if (isLast) {
        dismiss();
      } else {
        currentStep++;
        render();
      }
    });
  }

  function dismiss(): void {
    completeOnboarding();
    container.remove();
  }

  render();
  document.body.appendChild(container);

  return () => container.remove();
}
