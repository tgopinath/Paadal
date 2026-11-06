"use client";
import { useEffect } from "react";

/** Registers the service worker that makes the app installable and gives an offline fallback. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Installation is optional; the app works without it. */
    });
  }, []);
  return null;
}
