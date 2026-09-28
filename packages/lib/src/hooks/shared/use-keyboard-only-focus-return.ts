'use client';

import { useEffect } from 'react';

// Which kind of input the person used last, shared by every menu on the page.
let lastInput: 'keyboard' | 'pointer' = 'keyboard';
let isTracking = false;

function startTrackingInput() {
  if (isTracking) return;
  isTracking = true;
  document.addEventListener(
    'keydown',
    () => {
      lastInput = 'keyboard';
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      lastInput = 'pointer';
    },
    true,
  );
}

function returnFocusAfterKeyboardOnly(event: Event) {
  if (lastInput === 'pointer') event.preventDefault();
}

/**
 * An `onCloseAutoFocus` for Radix menus and dialogs. Radix hands focus back
 * to whatever opened them, and the browser draws the keyboard focus ring on
 * it even after a mouse or touch close. This keeps the hand-back, and its
 * ring, for keyboard closes only, where the ring is how someone sees where
 * they are.
 */
export function useKeyboardOnlyFocusReturn(): (event: Event) => void {
  useEffect(startTrackingInput, []);
  return returnFocusAfterKeyboardOnly;
}
