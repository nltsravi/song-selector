/**
 * Capacitor Hybrid Mobile Bridge (Android & iOS)
 * Integrates native StatusBar, SplashScreen, Hardware Back Button,
 * Native File Export & Share Sheet (PDF / DOCX), and Mobile OAuth Sign-In.
 */
(function() {
  'use strict';

  function isNativeApp() {
    return Boolean(
      typeof window !== 'undefined' &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    );
  }

  function getPlatform() {
    if (typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  function uint8ArrayToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  /**
   * Save exported PDF or DOCX to device storage and invoke native Android/iOS Share/Save sheet
   */
  async function saveAndShareFile(dataOrBytes, filename, mimeType) {
    const base64Data = (dataOrBytes instanceof Uint8Array)
      ? uint8ArrayToBase64(dataOrBytes)
      : String(dataOrBytes || '').replace(/^data:[^;]+;base64,/, '');

    if (!isNativeApp()) {
      return false;
    }

    try {
      const Plugins = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins : {};
      const Filesystem = Plugins.Filesystem;
      const Share = Plugins.Share;

      if (Filesystem) {
        // Also persist a copy in DOCUMENTS when supported so it appears in the device's Files app
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'DOCUMENTS',
            recursive: true
          });
        } catch (docErr) {}

        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: 'CACHE',
          recursive: true
        });

        if (Share && writeResult && writeResult.uri) {
          await Share.share({
            title: filename,
            text: `Exported Songbook: ${filename}`,
            url: writeResult.uri,
            dialogTitle: 'Save or Share Songbook (Google Drive / Files)'
          });
          return true;
        }
      }
    } catch (err) {
      console.warn('Native file share notice:', err);
    }
    return false;
  }

  /**
   * Mobile-friendly in-app Google Account Sign-In modal (used when GIS popup or window.prompt is restricted in mobile WebView)
   */
  function openMobileGoogleSignInModal(onSubmitEmail) {
    const existing = document.getElementById('mobile-google-auth-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mobile-google-auth-modal';
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div class="modal-window" style="max-width: 400px; border-radius: 16px; overflow: hidden;">
        <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding: 1.15rem 1.25rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <svg style="width:22px;height:22px;" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h3 style="margin:0; font-size:1.05rem; color:#0f172a;">Sign in with Google</h3>
          </div>
          <button type="button" class="btn-modal-close" id="btn-close-mobile-oauth" aria-label="Close">✕</button>
        </div>
        <form id="mobile-google-auth-form" style="padding: 1.25rem;">
          <p style="font-size:0.875rem; color:#475569; margin:0 0 0.85rem 0; line-height:1.5;">
            Enter your Google account email address to sign in to Song Collection &amp; Lyrics Library:
          </p>
          <input
            type="email"
            id="mobile-google-email-input"
            class="input-styled"
            placeholder="name@gmail.com"
            required
            autocomplete="email"
            autocapitalize="none"
            style="width:100%; padding:0.75rem 0.9rem; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:1rem; box-sizing:border-box;"
          />
          <div style="display:flex; justify-content:flex-end; gap:0.65rem;">
            <button type="button" class="btn-secondary-action" id="btn-cancel-mobile-oauth">Cancel</button>
            <button type="submit" class="btn-primary-action" style="background:#2563eb; color:#fff; border:none; padding:0.6rem 1.2rem; border-radius:8px; font-weight:600;">Continue</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    const input = document.getElementById('mobile-google-email-input');
    if (input) setTimeout(() => input.focus(), 80);

    function close() {
      overlay.remove();
    }

    document.getElementById('btn-close-mobile-oauth').onclick = close;
    document.getElementById('btn-cancel-mobile-oauth').onclick = close;
    document.getElementById('mobile-google-auth-form').onsubmit = function(e) {
      e.preventDefault();
      const val = (input ? input.value : '').trim().toLowerCase();
      if (val && val.includes('@')) {
        close();
        if (typeof onSubmitEmail === 'function') {
          onSubmitEmail(val);
        }
      }
    };
  }

  /**
   * Initialize Native Platform Listeners (Status Bar, Splash Screen, Android Back Button)
   */
  function initNativePlatform() {
    if (typeof document !== 'undefined' && document.body) {
      if (isNativeApp()) {
        document.body.classList.add('capacitor-native', `platform-${getPlatform()}`);
      }
    }

    if (!isNativeApp()) return;

    const Plugins = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins : {};

    // 1. Configure StatusBar
    if (Plugins.StatusBar) {
      try {
        Plugins.StatusBar.setStyle({ style: 'LIGHT' }).catch(() => {});
        Plugins.StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      } catch (e) {}
    }

    // 2. Hide SplashScreen once DOM is ready
    if (Plugins.SplashScreen) {
      try {
        setTimeout(() => {
          Plugins.SplashScreen.hide().catch(() => {});
        }, 400);
      } catch (e) {}
    }

    // 3. Handle Android Hardware Back Button & Deep Link OAuth Redirects (appUrlOpen)
    if (Plugins.App && typeof Plugins.App.addListener === 'function') {
      Plugins.App.addListener('appUrlOpen', (event) => {
        if (event && event.url && (event.url.includes('id_token=') || event.url.includes('access_token='))) {
          const hashIdx = event.url.indexOf('#');
          if (hashIdx !== -1) {
            window.location.hash = event.url.substring(hashIdx);
            if (typeof window.checkAuthStatus === 'function') {
              window.checkAuthStatus();
            }
          }
        }
      });

      Plugins.App.addListener('backButton', ({ canGoBack }) => {
        // First close any active modal
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
          return;
        }
        // If on My Collections tab, switch back to Songs tab
        const collectionsTabBtn = document.getElementById('tab-btn-collections');
        if (collectionsTabBtn && collectionsTabBtn.classList.contains('active') && typeof window.switchTab === 'function') {
          window.switchTab('songs');
          return;
        }
        // Otherwise navigate back or minimize app
        if (canGoBack && window.history.length > 1) {
          window.history.back();
        } else if (typeof Plugins.App.minimizeApp === 'function') {
          Plugins.App.minimizeApp();
        }
      });
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initNativePlatform);
    } else {
      initNativePlatform();
    }
  }

  window.NativeMobileBridge = {
    isNativeApp: isNativeApp,
    getPlatform: getPlatform,
    saveAndShareFile: saveAndShareFile,
    openMobileGoogleSignInModal: openMobileGoogleSignInModal
  };
})();

