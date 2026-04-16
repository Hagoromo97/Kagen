type UpdateCallback = () => void

let _onUpdateReady: UpdateCallback | null = null
let _waitingSW: ServiceWorker | null = null

export function onSWUpdateReady(cb: UpdateCallback) {
  _onUpdateReady = cb
  // If SW was already waiting before callback was registered, fire immediately
  if (_waitingSW) cb()
}

export function applySWUpdate() {
  if (_waitingSW) {
    _waitingSW.postMessage({ type: 'SKIP_WAITING' })
    _waitingSW = null
  }
  window.location.reload()
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Check if there's already a waiting SW on load (e.g. user revisit)
        if (registration.waiting) {
          _waitingSW = registration.waiting
          _onUpdateReady?.()
        }

        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed and waiting — old one still active
              _waitingSW = newSW
              _onUpdateReady?.()
            }
          })
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    // When SW activates (after skipWaiting), reload all clients
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}
