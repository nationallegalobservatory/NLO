'use client';

import { Workbox } from 'workbox-window';

let registrationStarted = false;

export function registerServiceWorker() {
  if (
    registrationStarted ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  registrationStarted = true;
  window.addEventListener('load', () => {
    const workbox = new Workbox('/sw.js', { scope: '/' });

    workbox.addEventListener('waiting', () => {
      window.dispatchEvent(new Event('nlo:pwa-update-waiting'));
    });

    workbox.addEventListener('activated', () => {
      window.dispatchEvent(new Event('nlo:pwa-activated'));
    });

    void workbox.register();
  });
}
