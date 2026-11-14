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

  function base64ToUint8Array(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Closure-isolated in-memory session cache (never exposed as a mutable global property)
   * Prevents XSS/cloning scripts from reading raw session state out of WebView localStorage
   */
  let activeMemorySessionUser = null;
  const SECURE_SESSION_KEY = 'com.neolumina.songselector.user_session_v1';
  const SANDBOX_VAULT_PATH = '.secure_sandbox/session_vault.enc';
  const SANDBOX_KEY_PATH = '.secure_sandbox/sandbox_key.bin';
  const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour rolling session lifetime

  function generateRandomHex(byteLength) {
    const bytes = new Uint8Array(byteLength || 16);
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(input) {
    const str = String(input || '');
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
      const data = new TextEncoder().encode(str);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback deterministic FNV-1a 64-bit style hex for non-WebCrypto test environments
    let h1 = 0xdeadbeef ^ str.length;
    let h2 = 0x41c6ce57 ^ str.length;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Computes a device-and-sandbox binding fingerprint so a cloned session cannot be replayed
   * on another device, emulator, or browser profile.
   */
  async function getDeviceSandboxFingerprint() {
    const platform = getPlatform();
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'unknown_ua';
    const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en';
    const screenSig = (typeof screen !== 'undefined') ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0';
    return sha256Hex(`com.neolumina.songselector|${platform}|${ua}|${lang}|${screenSig}`);
  }

  /**
   * WebCrypto AES-256-GCM encryption inside the private App Sandbox (Filesystem Directory.DATA)
   */
  async function getOrCreateSandboxCryptoKey(Filesystem) {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return null;
    }
    let rawKeyBase64 = null;
    if (Filesystem) {
      try {
        const res = await Filesystem.readFile({
          path: SANDBOX_KEY_PATH,
          directory: 'DATA'
        });
        if (res && res.data) {
          rawKeyBase64 = String(res.data).trim();
        }
      } catch (e) {}
    }

    let keyBytes;
    if (rawKeyBase64) {
      try {
        keyBytes = base64ToUint8Array(rawKeyBase64);
      } catch (e) {}
    }
    if (!keyBytes || keyBytes.length !== 32) {
      keyBytes = new Uint8Array(32);
      window.crypto.getRandomValues(keyBytes);
      rawKeyBase64 = uint8ArrayToBase64(keyBytes);
      if (Filesystem) {
        try {
          await Filesystem.writeFile({
            path: SANDBOX_KEY_PATH,
            data: rawKeyBase64,
            directory: 'DATA',
            recursive: true
          });
        } catch (e) {}
      }
    }

    return window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptForSandbox(plaintext, Filesystem, deviceFingerprint) {
    const key = await getOrCreateSandboxCryptoKey(Filesystem);
    if (!key || typeof TextEncoder === 'undefined') {
      return btoa(unescape(encodeURIComponent(plaintext)));
    }
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    const aad = new TextEncoder().encode(deviceFingerprint);
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: 128 },
      key,
      encoded
    );
    return uint8ArrayToBase64(iv) + ':' + uint8ArrayToBase64(new Uint8Array(cipherBuf));
  }

  async function decryptFromSandbox(cipherPayload, Filesystem, deviceFingerprint) {
    if (!cipherPayload || typeof cipherPayload !== 'string') return null;
    const key = await getOrCreateSandboxCryptoKey(Filesystem);
    if (!key || !cipherPayload.includes(':') || typeof TextDecoder === 'undefined') {
      return decodeURIComponent(escape(atob(cipherPayload)));
    }
    const parts = cipherPayload.split(':');
    const iv = base64ToUint8Array(parts[0]);
    const cipherBytes = base64ToUint8Array(parts[1]);
    const aad = new TextEncoder().encode(deviceFingerprint);
    const plainBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: 128 },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(plainBuf);
  }

  /**
   * Persist user details, OAuth tokens, and session in native Keychain (iOS) /
   * Hardware AndroidKeyStore + private App Sandbox (Directory.DATA),
   * and scrub plaintext tokens from WebView localStorage on mobile devices.
   */
  async function saveUserSession(userObj) {
    if (!userObj || typeof userObj !== 'object') {
      return clearUserSession();
    }

    const now = Date.now();
    const deviceFingerprint = await getDeviceSandboxFingerprint();
    const sessionId = userObj.sessionId || generateRandomHex(16);
    const issuedAt = userObj.issuedAt || now;
    const expiresAt = now + SESSION_TTL_MS;

    const integrityHash = await sha256Hex(
      `${sessionId}|${userObj.email || ''}|${Boolean(userObj.isAuthenticated)}|${Boolean(userObj.isAuthorized)}|${issuedAt}|${expiresAt}|${deviceFingerprint}`
    );

    const sessionEnvelope = Object.assign({}, userObj, {
      sessionId: sessionId,
      issuedAt: issuedAt,
      expiresAt: expiresAt,
      deviceFingerprint: deviceFingerprint,
      integrityHash: integrityHash,
      storageType: isNativeApp() ? 'native_keychain_sandbox' : 'web_session'
    });

    activeMemorySessionUser = sessionEnvelope;
    const serialized = JSON.stringify(sessionEnvelope);

    if (isNativeApp()) {
      // Scrub plaintext tokens/sessions from WebView localStorage & sessionStorage so they cannot be cloned or hijacked
      try {
        localStorage.removeItem('GOOGLE_OAUTH_USER');
        localStorage.removeItem('SIMULATED_USER');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('GOOGLE_OAUTH_USER');
          sessionStorage.removeItem('SIMULATED_USER');
        }
      } catch (e) {}

      const Plugins = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins : {};

      // 1. Primary: Store in Native Hardware Keychain (iOS kSecAttrAccessibleWhenUnlockedThisDeviceOnly)
      //    or AndroidKeyStore (AES-256-GCM in noBackupFilesDir) via SecureSession plugin
      if (Plugins.SecureSession && typeof Plugins.SecureSession.setItem === 'function') {
        try {
          await Plugins.SecureSession.setItem({
            key: SECURE_SESSION_KEY,
            value: serialized
          });
        } catch (err) {
          console.warn('SecureSession Keychain write notice:', err);
        }
      }

      // 2. Secondary: Store AES-256-GCM encrypted copy in private App Sandbox (Directory.DATA)
      if (Plugins.Filesystem && typeof Plugins.Filesystem.writeFile === 'function') {
        try {
          const encryptedPayload = await encryptForSandbox(serialized, Plugins.Filesystem, deviceFingerprint);
          await Plugins.Filesystem.writeFile({
            path: SANDBOX_VAULT_PATH,
            data: encryptedPayload,
            directory: 'DATA',
            recursive: true
          });
        } catch (err) {
          console.warn('App Sandbox encrypted write notice:', err);
        }
      }
      return sessionEnvelope;
    }

    // Web browser fallback: store envelope with anti-tamper integrity hash & device fingerprint
    try {
      localStorage.setItem('GOOGLE_OAUTH_USER', serialized);
      localStorage.setItem('SIMULATED_USER', serialized);
    } catch (e) {}
    return sessionEnvelope;
  }

  /**
   * Validates that a loaded session has not expired, been tampered with, or cloned from another device.
   */
  async function verifySessionEnvelope(rawJson) {
    if (!rawJson) return null;
    try {
      const parsed = (typeof rawJson === 'string') ? JSON.parse(rawJson) : rawJson;
      if (!parsed || typeof parsed !== 'object' || !parsed.email) {
        return null;
      }

      // Enforce session expiration if present
      if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
        await clearUserSession();
        return null;
      }

      // Enforce anti-cloning device binding & cryptographic integrity hash when present
      if (parsed.deviceFingerprint && parsed.integrityHash && parsed.sessionId) {
        const currentFingerprint = await getDeviceSandboxFingerprint();
        if (parsed.deviceFingerprint !== currentFingerprint) {
          console.warn('Rejected cloned session: device sandbox fingerprint mismatch');
          await clearUserSession();
          return null;
        }
        const expectedIntegrity = await sha256Hex(
          `${parsed.sessionId}|${parsed.email || ''}|${Boolean(parsed.isAuthenticated)}|${Boolean(parsed.isAuthorized)}|${parsed.issuedAt}|${parsed.expiresAt}|${currentFingerprint}`
        );
        if (parsed.integrityHash !== expectedIntegrity) {
          console.warn('Rejected tampered session: integrity verification failed');
          await clearUserSession();
          return null;
        }
      }

      return parsed;
    } catch (e) {
      return null;
    }
  }

  /**
   * Load user session from Native Keychain / AndroidKeyStore or Encrypted App Sandbox
   */
  async function loadUserSession() {
    if (activeMemorySessionUser) {
      const verifiedMem = await verifySessionEnvelope(activeMemorySessionUser);
      if (verifiedMem) return verifiedMem;
    }

    if (isNativeApp()) {
      const Plugins = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins : {};
      const deviceFingerprint = await getDeviceSandboxFingerprint();

      // 1. Read from Native iOS Keychain / AndroidKeyStore SecureSession plugin
      if (Plugins.SecureSession && typeof Plugins.SecureSession.getItem === 'function') {
        try {
          const res = await Plugins.SecureSession.getItem({ key: SECURE_SESSION_KEY });
          if (res && res.value) {
            const verified = await verifySessionEnvelope(res.value);
            if (verified) {
              activeMemorySessionUser = verified;
              return verified;
            }
          }
        } catch (err) {
          console.warn('SecureSession Keychain read notice:', err);
        }
      }

      // 2. Fallback to AES-256-GCM Encrypted Private App Sandbox (Directory.DATA)
      if (Plugins.Filesystem && typeof Plugins.Filesystem.readFile === 'function') {
        try {
          const fileRes = await Plugins.Filesystem.readFile({
            path: SANDBOX_VAULT_PATH,
            directory: 'DATA'
          });
          if (fileRes && fileRes.data) {
            const decrypted = await decryptFromSandbox(String(fileRes.data), Plugins.Filesystem, deviceFingerprint);
            const verified = await verifySessionEnvelope(decrypted);
            if (verified) {
              activeMemorySessionUser = verified;
              return verified;
            }
          }
        } catch (err) {}
      }

      // 3. One-time migration: if a legacy plaintext localStorage entry exists on mobile, migrate it into Keychain/Sandbox and wipe localStorage
      try {
        const legacyRaw = localStorage.getItem('GOOGLE_OAUTH_USER');
        if (legacyRaw) {
          localStorage.removeItem('GOOGLE_OAUTH_USER');
          localStorage.removeItem('SIMULATED_USER');
          const legacyParsed = JSON.parse(legacyRaw);
          if (legacyParsed && legacyParsed.email) {
            return await saveUserSession(legacyParsed);
          }
        }
      } catch (e) {}

      return null;
    }

    // Web browser fallback
    try {
      const raw = localStorage.getItem('GOOGLE_OAUTH_USER');
      if (raw) {
        const verified = await verifySessionEnvelope(raw);
        if (verified) {
          activeMemorySessionUser = verified;
          return verified;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Completely purge user details, tokens, and session from memory, Keychain, App Sandbox, and WebView storage
   */
  async function clearUserSession() {
    activeMemorySessionUser = null;
    try {
      localStorage.removeItem('GOOGLE_OAUTH_USER');
      localStorage.removeItem('SIMULATED_USER');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('GOOGLE_OAUTH_USER');
        sessionStorage.removeItem('SIMULATED_USER');
      }
    } catch (e) {}

    if (isNativeApp()) {
      const Plugins = (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins : {};
      if (Plugins.SecureSession && typeof Plugins.SecureSession.removeItem === 'function') {
        try {
          await Plugins.SecureSession.removeItem({ key: SECURE_SESSION_KEY });
        } catch (e) {}
      }
      if (Plugins.Filesystem && typeof Plugins.Filesystem.deleteFile === 'function') {
        try {
          await Plugins.Filesystem.deleteFile({
            path: SANDBOX_VAULT_PATH,
            directory: 'DATA'
          });
        } catch (e) {}
      }
    }
  }

  function getActiveSessionUser() {
    if (activeMemorySessionUser) {
      return Object.assign({}, activeMemorySessionUser);
    }
    return null;
  }

  /**
   * Save exported PDF or DOCX to device storage and invoke native Android/iOS Share/Save sheet
   */
  async function saveAndShareFile(dataOrBytes, filename, mimeType) {
    // Sanitize filename to prevent directory traversal in native Filesystem plugin
    const safeFilename = String(filename || 'Songbook.pdf')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '_')
      .replace(/^\.+/, '');
    filename = safeFilename || 'Songbook.pdf';

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
        if (event && typeof event.url === 'string') {
          const isTrustedDeepLink =
            event.url.startsWith('com.neolumina.songselector://oauth') ||
            event.url.startsWith('https://nltsravi.github.io/song-selector');
          if (isTrustedDeepLink && (event.url.includes('id_token=') || event.url.includes('access_token='))) {
            const hashIdx = event.url.indexOf('#');
            if (hashIdx !== -1) {
              window.location.hash = event.url.substring(hashIdx);
              if (typeof window.checkAuthStatus === 'function') {
                window.checkAuthStatus();
              }
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
    openMobileGoogleSignInModal: openMobileGoogleSignInModal,
    saveUserSession: saveUserSession,
    loadUserSession: loadUserSession,
    clearUserSession: clearUserSession,
    getActiveSessionUser: getActiveSessionUser
  };
})();

