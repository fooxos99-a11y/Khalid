"use client"

import { useEffect } from "react"

const SERVICE_WORKER_READY_EVENT = "app-service-worker-ready"

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then(async (registration) => {
          await registration.update().catch(() => undefined)
          await navigator.serviceWorker.ready.catch(() => undefined)
          window.dispatchEvent(new Event(SERVICE_WORKER_READY_EVENT))
        })
        .catch((error) => {
          console.error("[pwa] service worker registration failed", error)
        })
    }

    registerServiceWorker()
    return undefined
  }, [])

  return null
}