import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { registerServiceWorker } from "./lib/pwa"
import { DEFAULT_APP_FONT, FONT_OPTIONS } from "./hooks/use-theme"

// ── Apply persisted display settings before first paint ──────────────────────
;(function applyStoredDisplaySettings() {
  try {
    // Color mode — apply immediately to avoid flash
    const colorMode = localStorage.getItem("colorMode") ?? "dark"
    document.documentElement.classList.toggle("dark", colorMode === "dark")

    // Eye comfort mode
    const eyeComfort = localStorage.getItem("eye-comfort") === "1"
    document.documentElement.classList.toggle("eye-comfort", eyeComfort)

    // App zoom
<<<<<<< HEAD
<<<<<<< HEAD
    const zoom = localStorage.getItem("app-zoom") ?? "95"
=======
    const zoom = localStorage.getItem("app-zoom") ?? "120"
>>>>>>> parent of 8ff3d31 (Polish typography balance and soften UI theme across landing and sidebar)
=======
    const zoom = localStorage.getItem("app-zoom") ?? "120"
>>>>>>> parent of 8ff3d31 (Polish typography balance and soften UI theme across landing and sidebar)
    document.body.style.zoom = `${zoom}%`

    // Text size (root scale via CSS variable)
    const textSize = localStorage.getItem("text-size") ?? "14"
    document.documentElement.style.setProperty("--text-size-base", `${textSize}px`)

    // Font family
    const storedFont = localStorage.getItem("app-font")
    const hasValidStoredFont = storedFont !== null && FONT_OPTIONS.some(f => f.id === storedFont)
    const fontId = hasValidStoredFont ? storedFont : DEFAULT_APP_FONT
    if (!hasValidStoredFont) localStorage.setItem("app-font", DEFAULT_APP_FONT)
    const fontOpt = FONT_OPTIONS.find(f => f.id === fontId)
    if (fontOpt) {
      // Inject Google Fonts link if needed
      if (fontOpt.googleId) {
        const link = document.createElement("link")
        link.rel  = "stylesheet"
        link.href = `https://fonts.googleapis.com/css2?family=${fontOpt.googleId}&display=swap`
        document.head.appendChild(link)
      }
      // also preload Quicksand if not already loaded
      const quicksandId = "Quicksand:wght@400;500;600;700"
      if (fontOpt.googleId !== quicksandId) {
        const preload = document.createElement("link")
        preload.rel  = "stylesheet"
        preload.href = `https://fonts.googleapis.com/css2?family=${quicksandId}&display=swap`
        document.head.appendChild(preload)
      }
      document.documentElement.style.setProperty("--app-font", fontOpt.family)
      document.body.style.fontFamily = fontOpt.family
    }
  } catch { /* localStorage may be unavailable */ }
})()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <App />
  </StrictMode>
)

// Register service worker for PWA functionality
registerServiceWorker()
