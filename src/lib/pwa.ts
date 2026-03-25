export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => {
          // Registration succeeded.
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}
