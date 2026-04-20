/**
 * Capacitor native initialization for NelsonApp Pro
 * Runs only when the app is inside the native Android WebView.
 */
(function () {
    if (typeof window.Capacitor === 'undefined') return;

    const { Plugins } = window.Capacitor;
    const { StatusBar, SplashScreen, App } = Plugins;

    // ── Status Bar ──────────────────────────────────────────────────
    if (StatusBar) {
        StatusBar.setBackgroundColor({ color: '#0d0f1a' }).catch(() => {});
        StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }

    // ── Splash Screen ───────────────────────────────────────────────
    if (SplashScreen) {
        document.addEventListener('DOMContentLoaded', function () {
            SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
        });
    }

    // ── Back Button (Android) ───────────────────────────────────────
    if (App) {
        App.addListener('backButton', function () {
            // Close any open modal first
            var modals = document.querySelectorAll(
                '[id^="modal-"]:not(.hidden), [id^="camera-modal"]:not(.hidden)'
            );
            if (modals.length > 0) {
                var topModal = modals[modals.length - 1];
                var closeBtn = topModal.querySelector('[onclick*="close"], [onclick*="Close"], button[onclick*="✕"]');
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }
            }
            // If on root view, ask before exit
            if (typeof showAlert === 'function') {
                // Use native confirm via App plugin
                App.exitApp();
            }
        });

        // Resume event – refresh UI state after app comes back to foreground
        App.addListener('resume', function () {
            if (typeof renderAll === 'function') renderAll();
        });
    }
})();
