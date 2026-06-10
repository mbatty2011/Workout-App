"use client";

import { useEffect } from "react";

/** Registers the service worker (installed-PWA asset caching). */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration is a progressive enhancement — ignore failures.
      });
    }
  }, []);
  return null;
}
