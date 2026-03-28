/**
 * Popup entry point. Renders the extension popup UI.
 *
 * @module popup-entry
 */

import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

const root = document.getElementById('popup-root');
if (root) {
  createRoot(root).render(<Popup />);
}
