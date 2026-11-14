
/**
 * Frontend Application Controller for Song Collection & Lyrics Library
 * Robust, responsive, Unicode-ready client with Apps Script & local simulation support
 */

// Application State
const state = {
  currentUser: null,
  songs: [],
  filteredSongs: [],
  selectedSongIds: new Set(),
  activeTab: 'library', // 'library' or 'collections'
  searchQuery: '',
  selectedFilterTag: null,
  collections: [],
  activeLyricsSong: null,
  activeLyricsTab: 'tamil',
  editingTagsSong: null,
  activeCollection: null,
  exportModalData: null,
  isLoadingSongs: false,
  isLoadingCollections: false,
  songsViewMode: 'card' // 'card' (default) or 'list' (2-column layout)
};

// UI Elements Cache
const elements = {
  userBadge: document.getElementById('user-badge'),
  userAvatar: document.getElementById('user-avatar'),
  userEmailText: document.getElementById('user-email-text'),
  userStatusPill: document.getElementById('user-status-pill'),
  authHero: document.getElementById('auth-hero'),
  appContent: document.getElementById('app-main-content'),
  tabLibrary: document.getElementById('tab-btn-library'),
  tabCollections: document.getElementById('tab-btn-collections'),
  viewLibrary: document.getElementById('view-library'),
  viewCollections: document.getElementById('view-collections'),
  songsCountBadge: document.getElementById('songs-count-badge'),
  collectionsCountBadge: document.getElementById('collections-count-badge'),
  searchInput: document.getElementById('search-songs-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  quickTagFilters: document.getElementById('quick-tag-filters'),
  songsGrid: document.getElementById('songs-grid'),
  collectionsGrid: document.getElementById('collections-grid'),
  selectionActionBar: document.getElementById('selection-action-bar'),
  selectedCountText: document.getElementById('selected-count-text'),
  btnOpenCreateCollection: document.getElementById('btn-open-create-collection'),
  btnClearSelection: document.getElementById('btn-clear-selection'),

  // Modals
  modalLyrics: document.getElementById('modal-lyrics'),
  modalTags: document.getElementById('modal-tags'),
  modalCreateCollection: document.getElementById('modal-create-collection'),
  modalOpenCollection: document.getElementById('modal-open-collection'),
  modalExport: document.getElementById('modal-export'),

  // Toast Container
  toastContainer: document.getElementById('toast-container')
};

// API Bridge: Detects google.script.run or falls back to local simulator
const API = {
  isAppsScript: typeof google !== 'undefined' && google.script && google.script.run,

  call: function(serverMethodName, ...args) {
    return new Promise((resolve, reject) => {
      if (this.isAppsScript) {
        google.script.run
          .withSuccessHandler((response) => {
            if (response && response.success === false) {
              reject(response.error || new Error('Backend returned unsuccessful response'));
            } else {
              resolve(response ? response.data : null);
            }
          })
          .withFailureHandler((err) => {
            console.error('Apps Script error in ' + serverMethodName + ':', err);
            reject(new Error(err && err.message ? err.message : 'Unable to connect to Google Apps Script.'));
          })[serverMethodName](...args);
      } else {
        // Fallback to local Mock Provider (for preview & testing)
        if (window.MockBackend && typeof window.MockBackend[serverMethodName] === 'function') {
          try {
            const result = window.MockBackend[serverMethodName](...args);
            if (result && typeof result.then === 'function') {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (mockErr) {
            reject(mockErr);
          }
        } else {
          reject(new Error('Backend method ' + serverMethodName + ' is unavailable.'));
        }
      }
    });
  }
};

/**
 * Toast Notification Utility (Section 45)
 */
function showToast(message, type = 'success') {
  if (!elements.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '✓';
  if (type === 'error') icon = '⚠';
  if (type === 'info') icon = 'ℹ';

  toast.innerHTML = `<span style="font-weight:700;">${icon}</span><span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * HTML Escaping
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes strings embedded inside inline JavaScript event handler attributes (e.g. onclick="fn('...')")
 * Prevents DOM XSS when HTML entities are decoded by the browser prior to JS evaluation
 */
function escapeJsAttr(str) {
  if (!str) return '';
  return escapeHtml(
    String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
  );
}

/**
 * Strict URL Sanitizer: Prevents javascript:, vbscript:, and data:text/html XSS vectors
 */
function sanitizeUrl(url, allowDataImage = false) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (allowDataImage && /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^images\/[A-Za-z0-9._/-]+$/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

/**
 * Generates a cryptographically strong random OAuth nonce
 */
function generateSecureNonce() {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  return String(Date.now()) + '-' + Math.random().toString(36).substring(2);
}

/**
 * Google Sites iframe embed responsiveness & height adapter
 */
function checkEmbeddedMode() {
  try {
    const isEmbedded = window.self !== window.top;
    if (isEmbedded) {
      document.documentElement.classList.add('is-embedded');
      document.body.classList.add('is-embedded');
    }
  } catch (e) {
    document.documentElement.classList.add('is-embedded');
    document.body.classList.add('is-embedded');
  }
}

function adjustEmbedHeight() {
  try {
    const mainEl = document.getElementById('app-main-content');
    const containerEl = document.querySelector('.app-container');
    const contentHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0,
      mainEl ? mainEl.scrollHeight + 160 : 0,
      containerEl ? containerEl.scrollHeight + 60 : 0,
      600
    );

    // 1. Google Apps Script host setHeight API (when embedded in Google Sites)
    if (typeof google !== 'undefined' && google.script && google.script.host && typeof google.script.host.setHeight === 'function') {
      google.script.host.setHeight(contentHeight);
    }
    // 2. PostMessage for HTML iframe embeds
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SET_HEIGHT', height: contentHeight }, '*');
    }
  } catch (err) {}
}

/**
 * Initialize Application
 */
async function initApp() {
  const buildEl = document.getElementById('app-build-number');
  if (buildEl && window.AUTH_CONFIG && window.AUTH_CONFIG.BUILD_NUMBER) {
    buildEl.textContent = window.AUTH_CONFIG.BUILD_NUMBER;
  }
  checkEmbeddedMode();
  setupEventListeners();
  initSongsViewMode();
  await checkAuthentication();
  setTimeout(adjustEmbedHeight, 300);
}

/**
 * Initialize Songs View Mode (Card vs List View)
 * Defaults to card view. User preference is persisted.
 */
function initSongsViewMode() {
  let savedMode = 'card';
  try {
    const stored = localStorage.getItem('song_selector_view_mode');
    if (stored === 'list' || stored === 'card') {
      savedMode = stored;
    }
  } catch (e) {}
  state.songsViewMode = savedMode;
  applySongsViewMode();
}

/**
 * Switch Songs View Mode ('card' or 'list')
 */
window.switchSongsView = function(mode) {
  state.songsViewMode = (mode === 'list') ? 'list' : 'card';
  try {
    localStorage.setItem('song_selector_view_mode', state.songsViewMode);
  } catch (e) {}
  applySongsViewMode();
};

/**
 * Apply current view mode to #songs-grid and toggle buttons
 */
function applySongsViewMode() {
  const isList = state.songsViewMode === 'list';
  if (elements.songsGrid) {
    if (isList) {
      elements.songsGrid.classList.add('view-list');
    } else {
      elements.songsGrid.classList.remove('view-list');
    }
  }

  const cardBtn = document.getElementById('btn-view-card');
  const listBtn = document.getElementById('btn-view-list');
  if (cardBtn && listBtn) {
    if (isList) {
      cardBtn.classList.remove('active');
      cardBtn.setAttribute('aria-pressed', 'false');
      listBtn.classList.add('active');
      listBtn.setAttribute('aria-pressed', 'true');
    } else {
      cardBtn.classList.add('active');
      cardBtn.setAttribute('aria-pressed', 'true');
      listBtn.classList.remove('active');
      listBtn.setAttribute('aria-pressed', 'false');
    }
  }
  adjustEmbedHeight();
}

/**
 * Helper: Decode JWT token from Google Identity Services
 */
function decodeJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== 'object') return null;

    // Validate issuer if present
    if (payload.iss && payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      console.warn('Rejected JWT with untrusted issuer:', payload.iss);
      return null;
    }
    // Validate token expiration if present
    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
      console.warn('Rejected expired JWT token');
      return null;
    }
    // Reject explicitly unverified email claims
    if (payload.email_verified === false) {
      console.warn('Rejected JWT with unverified email');
      return null;
    }
    return payload;
  } catch (e) {
    console.error('Failed to decode JWT token:', e);
    return null;
  }
}

/**
 * Helper: Parse comma-separated AUTHORIZED_EMAIL_IDS from window.AUTH_CONFIG
 */
function getAuthorizedEmailIdsList(config) {
  const cfg = config || window.AUTH_CONFIG || {};
  const raw = cfg.AUTHORIZED_EMAIL_IDS || cfg.AUTHORIZED_EMAILS || '';
  if (Array.isArray(raw)) {
    return raw.map(e => String(e || '').trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));
  }
  return [];
}

/**
 * Helper: Check if an email is authorized via window.AUTH_CONFIG.AUTHORIZED_EMAIL_IDS (read from Git Variable / Secret)
 */
function checkEmailAuthorization(email, domain) {
  const config = window.AUTH_CONFIG || {};
  const authorizedEmails = getAuthorizedEmailIdsList(config);
  const allowedDomains = (config.ALLOWED_DOMAINS || []).map(d => d.trim().toLowerCase());

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanDomain = (domain || cleanEmail.split('@')[1] || '').trim().toLowerCase();

  // 1. Direct match in AUTHORIZED_EMAIL_IDS list (from Git Variable / Secret)
  if (cleanEmail && authorizedEmails.includes(cleanEmail)) {
    return { isAuthorized: true, reason: 'EMAIL_AUTHORIZED' };
  }

  // 2. Domain match in allowed domains if specified
  if (cleanDomain && allowedDomains.includes(cleanDomain)) {
    return { isAuthorized: true, reason: 'DOMAIN_AUTHORIZED' };
  }

  // 3. Fallback when authorization list is empty and require_authorization is false
  if (authorizedEmails.length === 0 && config.REQUIRE_AUTHORIZATION === false) {
    return { isAuthorized: true, reason: 'OPEN_ACCESS' };
  }

  return { isAuthorized: false, reason: 'NOT_IN_AUTHORIZED_LIST' };
}

/**
 * Handle Google User Profile from OAuth 2.0 credential
 */
function handleGoogleUserProfile(payload) {
  const email = (payload.email || '').trim().toLowerCase();
  const name = payload.name || email.split('@')[0] || 'Google User';
  const picture = payload.picture || '';
  const domain = payload.hd || (email.split('@')[1] || '');

  const authResult = checkEmailAuthorization(email, domain);

  const userObj = {
    isAuthenticated: true,
    isDomainAllowed: authResult.isAuthorized,
    isAuthorized: authResult.isAuthorized,
    email: email,
    name: name,
    picture: picture,
    domain: domain,
    source: 'google_oauth'
  };

  if (!authResult.isAuthorized) {
    userObj.error = {
      code: 'UNAUTHORIZED_EMAIL',
      message: `Unauthorized Access: ${email} is not in the AUTHORIZED_EMAIL_IDS list.`
    };
  }

  if (window.NativeMobileBridge && typeof window.NativeMobileBridge.saveUserSession === 'function') {
    window.NativeMobileBridge.saveUserSession(userObj).catch(() => {});
  } else {
    localStorage.setItem('GOOGLE_OAUTH_USER', JSON.stringify(userObj));
    localStorage.setItem('SIMULATED_USER', JSON.stringify(userObj));
  }
  state.currentUser = userObj;

  if (authResult.isAuthorized) {
    showToast(`Welcome, ${name}! Signed in successfully.`);
    renderAuthenticatedState(userObj);
    loadSongs();
    loadCollections();
  } else {
    showToast(`Access denied for ${email}. Account is not authorized.`, 'error');
    renderRequestAccessState(userObj);
  }
}

/**
 * Check URL hash for OAuth 2.0 redirect callback (#id_token=... or #access_token=...)
 */
async function handleOAuthRedirectCallback() {
  if (typeof window === 'undefined' || !window.location || !window.location.hash) return false;
  const hash = window.location.hash.substring(1);
  if (!hash.includes('id_token=') && !hash.includes('access_token=')) return false;

  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');

  // Clean URL hash so tokens are not left in address bar
  try {
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch (e) {}

  if (idToken) {
    const payload = decodeJwt(idToken);
    if (payload && payload.email) {
      handleGoogleUserProfile(payload);
      return true;
    }
  }

  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const profile = await res.json();
        if (profile && profile.email) {
          handleGoogleUserProfile(profile);
          return true;
        }
      }
    } catch (err) {
      console.error('OAuth redirect userinfo error:', err);
    }
  }
  return false;
}

/**
 * Global Callback for Google Identity Services (GIS)
 */
window.handleGoogleCredentialResponse = function(response) {
  if (!response || !response.credential) {
    showToast('Google Sign-in failed. Please try again.', 'error');
    return;
  }
  const payload = decodeJwt(response.credential);
  if (!payload || !payload.email) {
    showToast('Unable to read profile from Google Sign-in response.', 'error');
    return;
  }
  handleGoogleUserProfile(payload);
};

/**
 * Initialize Google Identity Services (GIS) button and prompt
 */
function initGoogleOAuth() {
  const config = window.AUTH_CONFIG || {};
  const clientId = config.GOOGLE_CLIENT_ID;
  const isNativeMobile = Boolean(
    window.NativeMobileBridge &&
    typeof window.NativeMobileBridge.isNativeApp === 'function' &&
    window.NativeMobileBridge.isNativeApp()
  );

  // In native Android/iOS WebView (origin https://localhost), keep the native button
  // so it triggers initiateGoogleSignIn() instead of an embedded GIS iframe that fails with origin_mismatch
  if (isNativeMobile) {
    return;
  }

  function setupGis() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      return;
    }

    if (clientId) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: window.handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          google.accounts.id.renderButton(btnContainer, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            width: 260
          });
        }
      } catch (err) {
        console.warn('GIS initialization notice:', err);
      }
    }
  }

  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    setupGis();
  } else {
    window.addEventListener('load', () => setTimeout(setupGis, 300));
  }
}

/**
 * Interactive Google Sign-In Trigger
 */
window.initiateGoogleSignIn = function() {
  const config = window.AUTH_CONFIG || {};
  const clientId = config.GOOGLE_CLIENT_ID;
  const isNativeMobile = Boolean(
    window.NativeMobileBridge &&
    typeof window.NativeMobileBridge.isNativeApp === 'function' &&
    window.NativeMobileBridge.isNativeApp()
  );

  if (isNativeMobile) {
    promptDevGoogleLogin();
    return;
  }

  if (typeof google !== 'undefined' && google.accounts && google.accounts.id && clientId) {
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log('GIS One-Tap not displayed, launching OAuth popup:', notification.getNotDisplayedReason());
        triggerGoogleOAuthPopup(clientId);
      }
    });
  } else if (clientId) {
    triggerGoogleOAuthPopup(clientId);
  } else {
    // Development mode fallback when Google Client ID is not yet configured in .env
    promptDevGoogleLogin();
  }
};

/**
 * OAuth Popup / Token Client
 */
function triggerGoogleOAuthPopup(clientId) {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await res.json();
            handleGoogleUserProfile(profile);
          } catch (e) {
            showToast('Failed to fetch Google profile: ' + e.message, 'error');
          }
        }
      }
    });
    client.requestAccessToken();
  } else {
    const redirectUri = window.location.origin + window.location.pathname;
    const nonce = generateSecureNonce();
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${encodeURIComponent(nonce)}`;
    window.location.href = oauthUrl;
  }
}

/**
 * Development Mode Email Authentication Prompt
 */
function promptDevGoogleLogin() {
  if (window.NativeMobileBridge && typeof window.NativeMobileBridge.openMobileGoogleSignInModal === 'function') {
    window.NativeMobileBridge.openMobileGoogleSignInModal((cleanEmail) => {
      handleGoogleUserProfile({
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        hd: cleanEmail.split('@')[1]
      });
    });
    return;
  }

  const emailInput = window.prompt('Enter your Google account email to sign in:');

  if (emailInput && emailInput.trim()) {
    const cleanEmail = emailInput.trim().toLowerCase();
    handleGoogleUserProfile({
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      hd: cleanEmail.split('@')[1]
    });
  }
}

/**
 * Sign Out from Google Session
 */
window.googleSignOut = function() {
  if (window.NativeMobileBridge && typeof window.NativeMobileBridge.clearUserSession === 'function') {
    window.NativeMobileBridge.clearUserSession().catch(() => {});
  }
  localStorage.removeItem('GOOGLE_OAUTH_USER');
  localStorage.removeItem('SIMULATED_USER');
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
  }
  state.currentUser = null;
  renderUnauthenticatedState({
    message: 'You have signed out. Please sign in with your Google account to access the library.'
  });
  showToast('Signed out successfully.', 'info');
  if (window.MockBackend && typeof window.MockBackend.setSimulatedUser === 'function') {
    window.MockBackend.setSimulatedUser('unauthenticated');
  }
};

/**
 * Switch Google Account
 */
window.googleSwitchAccount = function() {
  if (window.NativeMobileBridge && typeof window.NativeMobileBridge.clearUserSession === 'function') {
    window.NativeMobileBridge.clearUserSession().catch(() => {});
  }
  localStorage.removeItem('GOOGLE_OAUTH_USER');
  localStorage.removeItem('SIMULATED_USER');
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
  }
  state.currentUser = null;
  renderUnauthenticatedState({
    message: 'Please choose an authorized Google account to continue.'
  });
  setTimeout(() => {
    window.initiateGoogleSignIn();
  }, 100);
};

/**
 * Check Authentication Status (Section 4, 5, 6, 53)
 */
async function checkAuthentication() {
  try {
    // 0. Check if returning from Google OAuth 2.0 redirect flow (#id_token=... or #access_token=...)
    const handledRedirect = await handleOAuthRedirectCallback();
    if (handledRedirect) {
      return;
    }

    // 1. Check for stored Google OAuth session (Keychain / App Sandbox on mobile, or verified web session)
    let oauthUser = null;
    if (window.NativeMobileBridge && typeof window.NativeMobileBridge.loadUserSession === 'function') {
      oauthUser = await window.NativeMobileBridge.loadUserSession();
    } else {
      const storedOauth = localStorage.getItem('GOOGLE_OAUTH_USER');
      if (storedOauth) {
        try {
          oauthUser = JSON.parse(storedOauth);
        } catch (parseErr) {
          localStorage.removeItem('GOOGLE_OAUTH_USER');
        }
      }
    }

    if (oauthUser && oauthUser.isAuthenticated && oauthUser.email) {
      const authCheck = checkEmailAuthorization(oauthUser.email, oauthUser.domain);
      oauthUser.isDomainAllowed = authCheck.isAuthorized;
      oauthUser.isAuthorized = authCheck.isAuthorized;
      if (window.NativeMobileBridge && typeof window.NativeMobileBridge.saveUserSession === 'function') {
        await window.NativeMobileBridge.saveUserSession(oauthUser);
      } else {
        localStorage.setItem('SIMULATED_USER', JSON.stringify(oauthUser));
      }
      state.currentUser = oauthUser;

      if (authCheck.isAuthorized) {
        renderAuthenticatedState(oauthUser);
        loadSongs();
        loadCollections();
        return;
      } else {
        renderRequestAccessState(oauthUser);
        return;
      }
    }

    // In static SPA mode (GitHub Pages / standalone), require explicit Google OAuth login first
    if (!isGasEnvironment) {
      renderUnauthenticatedState({
        message: 'Please sign in with your Google account to access the Song Collection & Lyrics Library.'
      });
      initGoogleOAuth();
      return;
    }

    // 2. Check Google Apps Script Backend session when running inside GAS
    const user = await API.call('apiGetCurrentUser');
    state.currentUser = user;

    if (!user || !user.isAuthenticated || !user.email) {
      renderUnauthenticatedState(user ? user.error : null);
      initGoogleOAuth();
      return;
    }

    // Validate email authorization against AUTHORIZED_EMAIL_IDS list
    const authCheck = checkEmailAuthorization(user.email, user.domain);
    if (!authCheck.isAuthorized) {
      user.isDomainAllowed = false;
      renderRequestAccessState(user);
      return;
    }

    renderAuthenticatedState(user);
    loadSongs();
    loadCollections();
  } catch (err) {
    console.error('Auth check failure:', err);
    renderUnauthenticatedState({
      message: 'Unable to verify your Google session. Please sign in with your Google account.'
    });
    initGoogleOAuth();
  }
}

/**
 * Render Unauthenticated Screen
 */
function renderUnauthenticatedState(errorObj) {
  elements.authHero.style.display = 'flex';
  elements.appContent.style.display = 'none';
  elements.userBadge.style.display = 'none';

  const authCard = elements.authHero.querySelector('.auth-card');
  if (authCard) {
    const errorMsg = (errorObj && errorObj.message) ? errorObj.message : 'Please sign in with your Google account to access the Song Collection & Lyrics Library.';
    authCard.innerHTML = `
      <div class="auth-card-icon" aria-hidden="true">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      </div>
      <h2>Sign in required</h2>
      <p id="auth-error-message">${escapeHtml(errorMsg)}</p>
      
      <div id="google-signin-btn-container" style="display:flex; justify-content:center; margin: 0.75rem 0;"></div>

      <button type="button" class="btn-google-signin" id="btn-google-login" onclick="window.initiateGoogleSignIn()">
        <svg style="width:18px;height:18px;" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        <span>Sign in with Google</span>
      </button>
      <div class="domain-note">Access is restricted to authorized Google accounts</div>
    `;
    initGoogleOAuth();
  }
}

/**
 * Render Request Access / Unauthorized Screen (Section 4, 6)
 * Displayed when user is logged in with their Google/Gmail account but needs library access
 */
function renderRequestAccessState(user) {
  elements.authHero.style.display = 'flex';
  elements.appContent.style.display = 'none';
  elements.userBadge.style.display = 'none';

  const authCard = elements.authHero.querySelector('.auth-card');
  if (!authCard) return;

  const email = (user && user.email) ? user.email : '';
  const isPending = Boolean(user && user.hasPendingRequest);

  if (isPending) {
    authCard.innerHTML = `
      <div class="auth-card-icon" style="background:#fef3c7; border-color:#fde68a; color:#d97706;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <h2>Access Request Pending</h2>
      <p style="margin-bottom:0.75rem;">Your request for library access is currently awaiting administrator review.</p>
      
      <div class="user-pill-highlight">
        <span class="user-pill-dot" style="background:#f59e0b; box-shadow:0 0 0 2px rgba(245,158,11,0.25);"></span>
        <span>Signed in as: <strong>${escapeHtml(email)}</strong></span>
      </div>

      <div class="access-info-box">
        <div style="font-weight:600; color:#1e293b; font-size:0.9rem; margin-bottom:0.25rem;">
          <svg style="width:16px;height:16px;display:inline-block;vertical-align:-2px;color:#f59e0b;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Status: Review in Progress
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted);">
          Submitted: ${escapeHtml(user.requestDate || 'Recently')}
        </div>
        <div style="font-size:0.8rem; color:var(--text-dim); margin-top:0.5rem; line-height:1.4;">
          Once the administrator approves your email in the authorized users list, clicking "Check Access Status" will immediately take you into the library.
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.75rem; width:100%; margin-top:1rem;">
        <button type="button" class="btn-primary btn-request-access" id="btn-refresh-status" onclick="window.checkAuthStatus()">
          <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>Check Access Status / Refresh</span>
        </button>

        <div style="display:flex; justify-content:center; gap:1.25rem; margin-top:0.5rem;">
          <a href="javascript:void(0)" onclick="window.googleSwitchAccount()" style="font-size:0.85rem; color:var(--primary); font-weight:600; text-decoration:none;">
            Switch Google Account
          </a>
          <span style="color:#cbd5e1;">|</span>
          <a href="javascript:void(0)" onclick="window.googleSignOut()" style="font-size:0.85rem; color:#ef4444; font-weight:600; text-decoration:none;">
            Sign Out
          </a>
        </div>
      </div>
    `;
  } else {
    authCard.innerHTML = `
      <div class="auth-card-icon" style="background:#fef2f2; border-color:#fecaca; color:#ef4444;">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h2>Unauthorized Access — Access Restricted</h2>
      <p style="margin-bottom:0.75rem;">You are signed in as <strong>${escapeHtml(email)}</strong>, which is not in the authorized email IDs list (<code>AUTHORIZED_EMAIL_IDS</code>).</p>

      <div class="user-pill-highlight" style="border-color:#fca5a5; background:#fff1f2;">
        <span class="user-pill-dot" style="background:#ef4444; box-shadow:0 0 0 2px rgba(239,68,68,0.25);"></span>
        <span>Signed in as: <strong>${escapeHtml(email)}</strong></span>
      </div>

      <div class="access-info-box" style="margin-top:0.75rem; text-align:left; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.75rem 1rem; font-size:0.85rem; color:#475569;">
        <div style="font-weight:600; color:#1e293b; margin-bottom:0.25rem;">Authorization Required</div>
        Access to this application is restricted to pre-approved Google accounts configured in the repository's <code>AUTHORIZED_EMAIL_IDS</code> variable. Please switch to an authorized Google account or request access below.
      </div>

      <div class="access-form-wrapper" style="width:100%; margin-top:0.75rem; text-align:left;">
        <label for="access-reason-input" style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.4rem;">
          Note or Reason for Access (Optional)
        </label>
        <input type="text" id="access-reason-input" class="access-reason-input" placeholder="e.g. Choir member, worship team..." maxlength="150" />
        
        <button type="button" class="btn-primary btn-request-access" id="btn-submit-access-request" onclick="window.submitAccessRequest()">
          <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <span>Request Access for ${escapeHtml(email)}</span>
        </button>

        <div style="display:flex; justify-content:center; gap:1.25rem; margin-top:1.25rem; font-size:0.85rem;">
          <a href="javascript:void(0)" onclick="window.googleSwitchAccount()" style="color:var(--primary); font-weight:600; text-decoration:none;">
            Switch Google Account
          </a>
          <span style="color:#cbd5e1;">|</span>
          <a href="javascript:void(0)" onclick="window.googleSignOut()" style="color:#ef4444; font-weight:600; text-decoration:none;">
            Sign Out
          </a>
        </div>
      </div>
    `;
  }
}

/**
 * Handle Access Request Submission
 */
window.submitAccessRequest = async function() {
  const btn = document.getElementById('btn-submit-access-request');
  const input = document.getElementById('access-reason-input');
  const reason = input ? input.value.trim() : '';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:-2px;margin-right:6px;"></span>
      <span>Submitting request...</span>
    `;
  }

  try {
    await API.call('apiSubmitAccessRequest', reason);
    showToast('Access request submitted! Waiting for administrator review.', 'success');
    await checkAuthentication();
  } catch (err) {
    console.error('Failed to submit access request:', err);
    showToast('Failed to submit request: ' + (err.message || 'Please try again.'), 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
        </svg>
        <span>Try Again</span>
      `;
    }
  }
};

/**
 * Check Access Status and Refresh
 */
window.checkAuthStatus = async function() {
  const btn = document.getElementById('btn-refresh-status');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:-2px;margin-right:6px;"></span>
      <span>Checking status...</span>
    `;
  }

  try {
    await checkAuthentication();
    if (state.currentUser && !state.currentUser.isDomainAllowed) {
      showToast('Your request is still awaiting administrator review.', 'info');
    }
  } catch (e) {
    showToast('Error checking status: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Check Access Status / Refresh</span>
      `;
    }
  }
};

/**
 * Render Authenticated Screen
 */
function renderAuthenticatedState(user) {
  elements.authHero.style.display = 'none';
  elements.appContent.style.display = 'block';
  elements.userBadge.style.display = 'flex';

  const email = user.email || '';
  elements.userEmailText.textContent = email;

  const safePicUrl = sanitizeUrl(user.picture);
  if (safePicUrl) {
    elements.userAvatar.innerHTML = `<img src="${escapeHtml(safePicUrl)}" alt="Avatar" referrerpolicy="no-referrer">`;
  } else {
    elements.userAvatar.textContent = (user.name || email).charAt(0).toUpperCase() || 'U';
  }

  elements.userStatusPill.textContent = 'Authorized';
}

/**
 * Load Songs from Backend (Section 10, 42, 43)
 */
async function loadSongs() {
  state.isLoadingSongs = true;
  renderSongsLoading();

  try {
    if ((!window.SONGS_DATABASE || window.SONGS_DATABASE.length === 0) && typeof fetch === 'function') {
      try {
        const res = await fetch('songs.json');
        if (res.ok) {
          const fetchedSongs = await res.json();
          if (Array.isArray(fetchedSongs) && fetchedSongs.length > 0) {
            window.SONGS_DATABASE = fetchedSongs;
            if (window.MockBackend && typeof window.MockBackend.initSongs === 'function') {
              window.MockBackend.initSongs(fetchedSongs);
            }
          }
        }
      } catch (e) {
        // Continue to API.call fallback
      }
    }

    const songs = await API.call('apiGetSongs');
    state.songs = Array.isArray(songs) ? songs : [];
    filterSongs();
    renderQuickTagFilters();
    updateCounts();
  } catch (err) {
    console.error('Error loading songs:', err);
    elements.songsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">⚠</div>
        <h3>Unable to load song library</h3>
        <p>${escapeHtml(err.message || 'Please verify sheet permissions.')}</p>
        <button class="btn-primary-action" onclick="loadSongs()">Try Again</button>
      </div>
    `;
  } finally {
    state.isLoadingSongs = false;
  }
}

/**
 * Load User's Collections (Section 17, 18)
 */
async function loadCollections() {
  state.isLoadingCollections = true;

  try {
    const collections = await API.call('apiGetMyCollections');
    state.collections = Array.isArray(collections) ? collections : [];
    renderCollections();
    updateCounts();
  } catch (err) {
    console.error('Error loading collections:', err);
  } finally {
    state.isLoadingCollections = false;
  }
}

/**
 * Update Header Counts
 */
function updateCounts() {
  if (elements.songsCountBadge) {
    elements.songsCountBadge.textContent = state.songs.length;
  }
  if (elements.collectionsCountBadge) {
    elements.collectionsCountBadge.textContent = state.collections.length;
  }
}

/**
 * Render Songs Loading State
 */
function renderSongsLoading() {
  elements.songsGrid.innerHTML = `
    <div class="loading-indicator" style="grid-column: 1 / -1;">
      <div class="spinner"></div>
      <p>Loading songs from Google Sheets...</p>
    </div>
  `;
}

/**
 * Client-side Search and Filtering (Section 11)
 * Supports Song title, Tags, and Song ID with full Unicode awareness
 */
function filterSongs() {
  const query = (state.searchQuery || '').trim().toLowerCase();
  const filterTag = state.selectedFilterTag ? state.selectedFilterTag.toLowerCase() : null;

  state.filteredSongs = state.songs.filter(song => {
    // 1. Tag Filter Check
    if (filterTag) {
      const tagsList = (song.tagList || []).map(t => t.toLowerCase());
      if (!tagsList.includes(filterTag)) {
        return false;
      }
    }

    // 2. Query Search Check
    if (!query) return true;

    const idMatch = (song.id || '').toLowerCase().includes(query);
    const titleMatch = (song.title || '').toLowerCase().includes(query);
    const englishTitleMatch = (song.englishTitle || '').toLowerCase().includes(query);
    const tamilTitleMatch = (song.tamilTitle || '').toLowerCase().includes(query);
    const hindiTitleMatch = (song.hindiTitle || song.devanagariTitle || '').toLowerCase().includes(query);
    const tagsMatch = (song.tags || '').toLowerCase().includes(query);
    const tamilLyricsMatch = (song.tamilLyrics || '').toLowerCase().includes(query);
    const englishLyricsMatch = (song.englishLyrics || '').toLowerCase().includes(query);
    const hindiLyricsMatch = (song.devanagariLyrics || '').toLowerCase().includes(query);

    return idMatch || titleMatch || englishTitleMatch || tamilTitleMatch || hindiTitleMatch || tagsMatch || tamilLyricsMatch || englishLyricsMatch || hindiLyricsMatch;
  });

  renderSongs();
}

/**
 * Render Quick Tag Filter Pills
 */
function renderQuickTagFilters() {
  if (!elements.quickTagFilters) return;

  const tagCounts = {};
  state.songs.forEach(song => {
    (song.tagList || []).forEach(tag => {
      const cleanTag = tag.trim();
      if (cleanTag) {
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      }
    });
  });

  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 8);

  let html = `<span class="filter-label">Tags:</span>`;
  html += `
    <button class="tag-pill ${state.selectedFilterTag === null ? 'active' : ''}" onclick="selectFilterTag(null)">
      All
    </button>
  `;

  sortedTags.forEach(tag => {
    const isActive = state.selectedFilterTag && state.selectedFilterTag.toLowerCase() === tag.toLowerCase();
    html += `
      <button class="tag-pill ${isActive ? 'active' : ''}" onclick="selectFilterTag('${escapeJsAttr(tag)}')">
        ${escapeHtml(tag)} <span style="opacity:0.75; font-size:0.75rem;">(${tagCounts[tag]})</span>
      </button>
    `;
  });

  elements.quickTagFilters.innerHTML = html;
}

window.selectFilterTag = function(tag) {
  state.selectedFilterTag = tag;
  renderQuickTagFilters();
  filterSongs();
};

/**
 * Render Songs List with Checkboxes and Actions (Section 10, 12)
 */
function renderSongs() {
  if (state.filteredSongs.length === 0) {
    elements.songsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <h3>No songs found</h3>
        <p>Try a different search term or clear active filters.</p>
        <button class="btn-secondary-action" onclick="clearFilters()" style="margin: 0 auto;">Clear Search</button>
      </div>
    `;
    return;
  }

  let html = '';
  const defaultSongImage = (typeof LOGO_IMAGE_BASE64 !== 'undefined' && LOGO_IMAGE_BASE64)
    ? ('data:image/png;base64,' + LOGO_IMAGE_BASE64)
    : 'images/app-logo.png';

  state.filteredSongs.forEach(song => {
    const isSelected = state.selectedSongIds.has(song.id);
    const tagBadges = (song.tagList || []).map(t =>
      `<span class="song-tag-badge">${escapeHtml(t)}</span>`
    ).join('');

    const safeCustomImg = sanitizeUrl(song.imageUrl, true);
    const hasCustomImage = Boolean(safeCustomImg);
    const displayImg = hasCustomImage ? safeCustomImg : defaultSongImage;

    const safeAudioUrl = sanitizeUrl(song.audioUrl);
    const hasAudio = Boolean(safeAudioUrl);
    const audioBtnHtml = hasAudio
      ? `<a href="${escapeHtml(safeAudioUrl)}" target="_blank" rel="noopener noreferrer" class="media-btn audio-btn enabled" title="Listen Audio: ${escapeHtml(safeAudioUrl)}" onclick="event.stopPropagation();" aria-label="Listen audio for ${escapeHtml(song.title)}">
          <svg class="media-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Audio</span>
        </a>`
      : `<span class="media-btn audio-btn disabled" title="Audio link not available" aria-disabled="true" aria-label="Audio not available for ${escapeHtml(song.title)}">
          <svg class="media-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span>Audio</span>
        </span>`;

    const safeVideoUrl = sanitizeUrl(song.videoUrl);
    const hasVideo = Boolean(safeVideoUrl);
    const videoBtnHtml = hasVideo
      ? `<a href="${escapeHtml(safeVideoUrl)}" target="_blank" rel="noopener noreferrer" class="media-btn video-btn enabled" title="Watch Video: ${escapeHtml(safeVideoUrl)}" onclick="event.stopPropagation();" aria-label="Watch video for ${escapeHtml(song.title)}">
          <svg class="media-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="15" height="16" rx="2" ry="2"></rect>
            <polygon points="17 8 22 12 17 16 17 8"></polygon>
          </svg>
          <span>Video</span>
        </a>`
      : `<span class="media-btn video-btn disabled" title="Video link not available" aria-disabled="true" aria-label="Video not available for ${escapeHtml(song.title)}">
          <svg class="media-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="15" height="16" rx="2" ry="2"></rect>
            <polygon points="17 8 22 12 17 16 17 8"></polygon>
          </svg>
          <span>Video</span>
        </span>`;

    html += `
      <div class="song-card ${isSelected ? 'selected' : ''}" id="song-card-${escapeHtml(song.id)}">
        <div class="song-card-image-wrap">
          <img 
            src="${escapeHtml(displayImg)}" 
            alt="${escapeHtml(song.title)}" 
            class="song-card-image ${hasCustomImage ? '' : 'default-logo'}" 
            loading="lazy" 
            onerror="this.onerror=null;this.src='${defaultSongImage}';this.classList.add('default-logo');"
          >
        </div>

        <div class="song-card-body">
          <div class="song-header-row">
            <label class="custom-checkbox-label" title="Select song" aria-label="Select song ${escapeHtml(song.title)}">
              <input type="checkbox" class="custom-checkbox-input" id="check-${escapeHtml(song.id)}" ${isSelected ? 'checked' : ''} onchange="toggleSongSelection('${escapeJsAttr(song.id)}')" aria-label="Select song ${escapeHtml(song.title)}">
              <span class="custom-checkbox-box" aria-hidden="true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              </span>
            </label>
            <div class="song-info">
              <h3 class="song-title">${escapeHtml(song.englishTitle || song.title)}</h3>
              ${song.tamilTitle ? `<div class="song-subtitle-tamil font-tamil">${escapeHtml(song.tamilTitle)}</div>` : ''}
              ${(song.hindiTitle || song.devanagariTitle) ? `<div class="song-subtitle-hindi font-devanagari">${escapeHtml(song.hindiTitle || song.devanagariTitle)}</div>` : ''}
              <span class="song-id-badge" style="display: none;" aria-hidden="true">${escapeHtml(song.id)}</span>
              ${song.updatedBy ? `
                <div class="song-editor-meta" title="Last updated on ${escapeHtml(song.updatedAt || '')}">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  <span>Edited by ${escapeHtml(song.updatedBy.split('@')[0])}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="song-meta-row">
            <div class="song-media-icons" role="group" aria-label="Media links for ${escapeHtml(song.title)}">
              ${audioBtnHtml}
              ${videoBtnHtml}
            </div>
            
            <div class="lang-availability" role="group" aria-label="Available languages">
              <span class="lang-pill tamil ${song.hasTamil ? '' : 'unavailable'}" title="${song.hasTamil ? 'Tamil lyrics available' : 'No Tamil lyrics'}">TA</span>
              <span class="lang-pill english ${song.hasEnglish ? '' : 'unavailable'}" title="${song.hasEnglish ? 'English lyrics available' : 'No English lyrics'}">EN</span>
              <span class="lang-pill devanagari ${song.hasDevanagari ? '' : 'unavailable'}" title="${song.hasDevanagari ? 'Devanagari lyrics available' : 'No Devanagari lyrics'}">HI</span>
            </div>
          </div>

          <div class="song-tags-container" role="group" aria-label="Tags for ${escapeHtml(song.title)}">
            ${tagBadges}
            <button class="btn-add-tag-inline" onclick="openTagEditor('${escapeJsAttr(song.id)}')" title="Edit tags" aria-label="Add or edit tags for ${escapeHtml(song.title)}">
              <svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              + Tags
            </button>
          </div>
        </div>

        <div class="song-card-actions">
          <button class="btn-secondary-action" onclick="openLyricsPreview('${escapeJsAttr(song.id)}')" aria-label="View lyrics for ${escapeHtml(song.title)}">
            <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            View Lyrics
          </button>
          <button class="btn-secondary-action btn-edit-lyrics-action" onclick="openSongEditor('${escapeJsAttr(song.id)}')" aria-label="Edit lyrics and title for ${escapeHtml(song.title)}">
            <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            Edit Lyrics
          </button>
          <button class="btn-secondary-action" onclick="openTagEditor('${escapeJsAttr(song.id)}')" aria-label="Edit tags for ${escapeHtml(song.title)}">
            <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            Edit Tags
          </button>
        </div>
      </div>
    `;
  });

  elements.songsGrid.innerHTML = html;
  applySongsViewMode();
  updateSelectionActionBar();
  adjustEmbedHeight();
}

/**
 * Toggle Song Selection (Section 12)
 */
window.toggleSongSelection = function(songId) {
  if (state.selectedSongIds.has(songId)) {
    state.selectedSongIds.delete(songId);
  } else {
    state.selectedSongIds.add(songId);
  }

  const card = document.getElementById('song-card-' + songId);
  if (card) {
    if (state.selectedSongIds.has(songId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  }

  updateSelectionActionBar();
};

/**
 * Update Selection Action Bar
 */
function updateSelectionActionBar() {
  const count = state.selectedSongIds.size;
  if (count > 0) {
    elements.selectedCountText.textContent = `Selected: ${count} ${count === 1 ? 'song' : 'songs'}`;
    elements.selectionActionBar.classList.add('visible');
    elements.btnOpenCreateCollection.disabled = false;
  } else {
    elements.selectionActionBar.classList.remove('visible');
    elements.btnOpenCreateCollection.disabled = true;
  }
}

window.clearSelection = function() {
  state.selectedSongIds.clear();
  renderSongs();
};

window.selectAllVisibleSongs = function() {
  state.filteredSongs.forEach(s => state.selectedSongIds.add(s.id));
  renderSongs();
};

window.clearFilters = function() {
  state.searchQuery = '';
  state.selectedFilterTag = null;
  elements.searchInput.value = '';
  elements.searchClearBtn.style.display = 'none';
  renderQuickTagFilters();
  filterSongs();
};

/**
 * Lyrics Preview Modal (Section 13)
 */
window.openLyricsPreview = function(songId) {
  const song = state.songs.find(s => s.id === songId);
  if (!song) return;

  state.activeLyricsSong = song;

  // Determine initial active tab based on availability
  if (song.hasTamil) state.activeLyricsTab = 'tamil';
  else if (song.hasEnglish) state.activeLyricsTab = 'english';
  else if (song.hasDevanagari) state.activeLyricsTab = 'devanagari';
  else state.activeLyricsTab = 'english';

  document.getElementById('modal-lyrics-title').textContent = song.title;
  renderLyricsModalBody();
  openModal('modal-lyrics');
};

function renderLyricsModalBody() {
  const song = state.activeLyricsSong;
  if (!song) return;

  const tabContainer = document.getElementById('lyrics-tabs-container');
  tabContainer.innerHTML = `
    <button class="lyrics-tab-btn ${state.activeLyricsTab === 'tamil' ? 'active' : ''} ${song.hasTamil ? '' : 'disabled'}" onclick="setLyricsTab('tamil')">
      Tamil ${song.hasTamil ? '' : '(Unavailable)'}
    </button>
    <button class="lyrics-tab-btn ${state.activeLyricsTab === 'english' ? 'active' : ''} ${song.hasEnglish ? '' : 'disabled'}" onclick="setLyricsTab('english')">
      English ${song.hasEnglish ? '' : '(Unavailable)'}
    </button>
    <button class="lyrics-tab-btn ${state.activeLyricsTab === 'devanagari' ? 'active' : ''} ${song.hasDevanagari ? '' : 'disabled'}" onclick="setLyricsTab('devanagari')">
      Devanagari ${song.hasDevanagari ? '' : '(Unavailable)'}
    </button>
  `;

  const contentArea = document.getElementById('lyrics-content-area');
  let lyricsText = '';
  let fontClass = '';

  if (state.activeLyricsTab === 'tamil') {
    lyricsText = song.tamilLyrics || 'No Tamil lyrics available for this song.';
    fontClass = 'lyrics-tamil';
  } else if (state.activeLyricsTab === 'devanagari') {
    lyricsText = song.devanagariLyrics || 'No Devanagari lyrics available for this song.';
    fontClass = 'lyrics-devanagari';
  } else {
    lyricsText = song.englishLyrics || 'No English lyrics available for this song.';
    fontClass = 'lyrics-english';
  }

  let displayTitle = song.englishTitle || song.title;
  const subTitles = [];
  if (song.tamilTitle) subTitles.push(song.tamilTitle);
  if (song.hindiTitle || song.devanagariTitle) subTitles.push(song.hindiTitle || song.devanagariTitle);
  if (subTitles.length > 0) {
    displayTitle += ` (${subTitles.join(' / ')})`;
  }
  document.getElementById('modal-lyrics-title').textContent = displayTitle;

  contentArea.className = `lyrics-content-area ${fontClass}`;
  contentArea.textContent = lyricsText;

  const attrEl = document.getElementById('modal-lyrics-attribution');
  if (attrEl) {
    if (song.updatedBy) {
      attrEl.style.display = 'flex';
      attrEl.innerHTML = `
        <span class="user-pill-dot" style="width:7px;height:7px;"></span>
        <span>Last edited by <strong>${escapeHtml(song.updatedBy)}</strong>${song.updatedAt ? ' on ' + escapeHtml(song.updatedAt) : ''}</span>
      `;
    } else {
      attrEl.style.display = 'none';
    }
  }
}

window.setLyricsTab = function(lang) {
  const song = state.activeLyricsSong;
  if (!song) return;

  if (lang === 'tamil' && !song.hasTamil) return;
  if (lang === 'devanagari' && !song.hasDevanagari) return;
  if (lang === 'english' && !song.hasEnglish) return;

  state.activeLyricsTab = lang;
  renderLyricsModalBody();
};

window.copyCurrentLyrics = function() {
  const content = document.getElementById('lyrics-content-area').textContent;
  if (!content) return;
  navigator.clipboard.writeText(content).then(() => {
    showToast('Lyrics copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy text', 'error');
  });
};

/**
 * Tag Editor Modal (Section 8, 9)
 */
window.openTagEditor = function(songId) {
  const song = state.songs.find(s => s.id === songId);
  if (!song) return;

  state.editingTagsSong = {
    id: song.id,
    title: song.title,
    tagsList: [...(song.tagList || [])]
  };

  document.getElementById('modal-tags-song-title').textContent = song.title;
  renderTagChipsEditor();
  openModal('modal-tags');
};

function renderTagChipsEditor() {
  const container = document.getElementById('tag-chips-container');
  if (!state.editingTagsSong) return;

  let html = '';
  state.editingTagsSong.tagsList.forEach((tag, idx) => {
    html += `
      <span class="editable-tag-chip">
        ${escapeHtml(tag)}
        <button type="button" class="btn-remove-chip" onclick="removeTagChip(${idx})" title="Remove tag">✕</button>
      </span>
    `;
  });

  if (state.editingTagsSong.tagsList.length === 0) {
    html = `<span style="color:var(--text-dim); font-size:0.85rem; align-self:center;">No tags added yet. Type below to add tags.</span>`;
  }

  container.innerHTML = html;
}

window.removeTagChip = function(index) {
  if (!state.editingTagsSong) return;
  state.editingTagsSong.tagsList.splice(index, 1);
  renderTagChipsEditor();
};

window.addTagChipFromInput = function() {
  const input = document.getElementById('tag-new-input');
  const val = (input.value || '').trim();
  if (!val || !state.editingTagsSong) return;

  // Split if user pasted comma-separated tags
  const newTags = val.split(/[,|]/).map(t => t.trim()).filter(t => t.length > 0);
  newTags.forEach(t => {
    const formatted = t.charAt(0).toUpperCase() + t.slice(1);
    if (!state.editingTagsSong.tagsList.some(existing => existing.toLowerCase() === formatted.toLowerCase())) {
      state.editingTagsSong.tagsList.push(formatted);
    }
  });

  input.value = '';
  renderTagChipsEditor();
};

window.saveSongTags = async function() {
  if (!state.editingTagsSong) return;
  const songId = state.editingTagsSong.id;
  const tagsString = state.editingTagsSong.tagsList.join(', ');

  const saveBtn = document.getElementById('btn-save-tags');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span> Saving...`;

  try {
    const updated = await API.call('apiUpdateSongTags', songId, tagsString);

    // Update local song state
    const song = state.songs.find(s => s.id === songId);
    if (song) {
      song.tags = updated.tags;
      song.tagList = updated.tagList;
      song.updatedAt = updated.updatedAt;
      song.updatedBy = updated.updatedBy;
    }

    renderQuickTagFilters();
    filterSongs();
    closeModal('modal-tags');
    showToast('✓ Tags updated successfully.');
  } catch (err) {
    console.error('Save tags failed:', err);
    showToast(err.message || 'Unable to save tags. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
};

/**
 * Create Collection Modal (Section 14, 15, 20)
 */
window.openCreateCollectionModal = function() {
  if (state.selectedSongIds.size === 0) return;

  const selectedSongs = [];
  state.selectedSongIds.forEach(id => {
    const s = state.songs.find(song => song.id === id);
    if (s) selectedSongs.push(s);
  });

  state.createCollectionSongs = selectedSongs;
  document.getElementById('collection-name-input').value = '';
  document.getElementById('collection-count-indicator').textContent = `Songs selected: ${selectedSongs.length}`;
  renderCreateCollectionSongList();
  openModal('modal-create-collection');
};

function renderCreateCollectionSongList() {
  const container = document.getElementById('create-collection-song-list');
  let html = '';

  state.createCollectionSongs.forEach((song, idx) => {
    html += `
      <div class="ordered-song-item">
        <span style="color:var(--text-dim); font-size:0.85rem; width:22px;">${idx + 1}.</span>
        <span class="ordered-song-title">${escapeHtml(song.title)}</span>
        
        <div class="ordered-song-order-actions">
          <button class="btn-order-move" onclick="moveCreateSongOrder(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up" aria-label="Move ${escapeHtml(song.title)} up">↑</button>
          <button class="btn-order-move" onclick="moveCreateSongOrder(${idx}, 1)" ${idx === state.createCollectionSongs.length - 1 ? 'disabled' : ''} title="Move Down" aria-label="Move ${escapeHtml(song.title)} down">↓</button>
          <button class="btn-order-remove" onclick="removeCreateSong(${idx})" title="Remove from collection" aria-label="Remove ${escapeHtml(song.title)} from collection">✕</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.getElementById('collection-count-indicator').textContent = `Songs selected: ${state.createCollectionSongs.length}`;
}

window.moveCreateSongOrder = function(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.createCollectionSongs.length) return;
  const temp = state.createCollectionSongs[index];
  state.createCollectionSongs[index] = state.createCollectionSongs[target];
  state.createCollectionSongs[target] = temp;
  renderCreateCollectionSongList();
};

window.removeCreateSong = function(index) {
  const removedSong = state.createCollectionSongs[index];
  state.createCollectionSongs.splice(index, 1);
  if (removedSong) {
    state.selectedSongIds.delete(removedSong.id);
    updateSelectionActionBar();
    const card = document.getElementById('song-card-' + removedSong.id);
    if (card) {
      card.classList.remove('selected');
      const chk = document.getElementById('check-' + removedSong.id);
      if (chk) chk.checked = false;
    }
  }
  renderCreateCollectionSongList();
};

window.saveNewCollection = async function() {
  const nameInput = document.getElementById('collection-name-input');
  const name = (nameInput.value || '').trim();

  if (!name) {
    showToast('Please enter a collection name.', 'error');
    nameInput.focus();
    return;
  }

  if (state.createCollectionSongs.length === 0) {
    showToast('Please select at least one song.', 'error');
    return;
  }

  const songIds = state.createCollectionSongs.map(s => s.id);
  const saveBtn = document.getElementById('btn-save-new-collection');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span> Creating...`;

  try {
    const created = await API.call('apiCreateCollection', name, songIds);
    state.collections.unshift(created);
    closeModal('modal-create-collection');
    showToast('✓ Collection created successfully.');

    // Switch to collections tab to show the new collection
    switchTab('collections');
    renderCollections();
    updateCounts();

    // Clear selections
    state.selectedSongIds.clear();
    updateSelectionActionBar();
    renderSongs();
  } catch (err) {
    console.error('Create collection error:', err);
    showToast(err.message || 'Unable to create collection.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
};

/**
 * Render Collections View (Section 18)
 */
function renderCollections() {
  if (!elements.collectionsGrid) return;

  if (state.collections.length === 0) {
    elements.collectionsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
        </div>
        <h3>You haven't created any collections yet</h3>
        <p>Select songs in the Song Library above to create your first collection.</p>
        <button class="btn-primary-action" onclick="switchTab('library')">Browse Songs</button>
      </div>
    `;
    return;
  }

  let html = '';
  state.collections.forEach(col => {
    html += `
      <div class="collection-card">
        <div>
          <div class="collection-card-header">
            <div class="collection-icon">
              <svg style="width:22px;height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <div class="collection-meta">
              <h3>${escapeHtml(col.name)}</h3>
              <div class="collection-info-line">
                <span>${col.songCount || (col.songIds ? col.songIds.length : 0)} songs</span>
                <span>•</span>
                <span>${escapeHtml(col.createdTimestamp || col.createdDate || '')}</span>
              </div>
              <span class="collection-owner-badge">Created by: ${escapeHtml(col.userEmail || '')}</span>
            </div>
          </div>
        </div>

        <div class="collection-card-actions">
          <button class="btn-secondary-action" onclick="openCollectionDetails('${escapeJsAttr(col.collectionId)}')" style="flex:1;">
            Open Collection
          </button>
          <button class="btn-primary-action" onclick="openExportModal('${escapeJsAttr(col.collectionId)}')" style="padding:0.5rem 0.85rem;">
            Export
          </button>
          <button class="btn-danger-action" onclick="confirmDeleteCollection('${escapeJsAttr(col.collectionId)}', '${escapeJsAttr(col.name)}')" title="Delete collection" aria-label="Delete collection ${escapeHtml(col.name)}">
            <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    `;
  });

  elements.collectionsGrid.innerHTML = html;
  adjustEmbedHeight();
}

/**
 * Open Collection Details & Manager (Section 19, 20)
 */
window.openCollectionDetails = async function(collectionId) {
  try {
    const collection = await API.call('apiGetCollection', collectionId);
    state.activeCollection = collection;

    document.getElementById('modal-collection-name').textContent = collection.name;
    document.getElementById('modal-collection-creator').textContent = `Created by: ${collection.userEmail}`;
    document.getElementById('modal-collection-time').textContent = `Created: ${collection.createdTimestamp}`;
    
    renderOpenCollectionSongs();
    openModal('modal-open-collection');
  } catch (err) {
    console.error('Error opening collection:', err);
    showToast(err.message || 'Unable to open collection.', 'error');
  }
};

function renderOpenCollectionSongs() {
  const container = document.getElementById('open-collection-song-list');
  const collection = state.activeCollection;
  if (!collection) return;

  let html = '';
  collection.songs.forEach((song, idx) => {
    html += `
      <div class="ordered-song-item">
        <span style="color:var(--text-dim); font-size:0.85rem; width:22px;">${idx + 1}.</span>
        <span class="ordered-song-title">${escapeHtml(song.title)}</span>
        
        <div class="ordered-song-order-actions">
          <button class="btn-order-move" onclick="moveOpenCollectionOrder(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up" aria-label="Move ${escapeHtml(song.title)} up">↑</button>
          <button class="btn-order-move" onclick="moveOpenCollectionOrder(${idx}, 1)" ${idx === collection.songs.length - 1 ? 'disabled' : ''} title="Move Down" aria-label="Move ${escapeHtml(song.title)} down">↓</button>
          <button class="btn-order-remove" onclick="removeOpenCollectionSong(${idx})" title="Remove song" aria-label="Remove ${escapeHtml(song.title)} from collection">✕</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  document.getElementById('open-collection-count').textContent = `${collection.songs.length} songs`;
}

window.moveOpenCollectionOrder = function(index, direction) {
  const collection = state.activeCollection;
  if (!collection) return;
  const target = index + direction;
  if (target < 0 || target >= collection.songs.length) return;

  const temp = collection.songs[index];
  collection.songs[index] = collection.songs[target];
  collection.songs[target] = temp;
  renderOpenCollectionSongs();
};

window.removeOpenCollectionSong = function(index) {
  const collection = state.activeCollection;
  if (!collection) return;
  collection.songs.splice(index, 1);
  renderOpenCollectionSongs();
};

window.saveOpenCollectionChanges = async function() {
  const collection = state.activeCollection;
  if (!collection) return;

  if (collection.songs.length === 0) {
    showToast('Collection must contain at least one song.', 'error');
    return;
  }

  const songIds = collection.songs.map(s => s.id);
  const saveBtn = document.getElementById('btn-save-collection-changes');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span> Saving...`;

  try {
    const updated = await API.call('apiUpdateCollection', collection.collectionId, collection.name, songIds);
    state.activeCollection = updated;

    // Update in local collections list
    const idx = state.collections.findIndex(c => c.collectionId === collection.collectionId);
    if (idx !== -1) {
      state.collections[idx].songCount = updated.songCount;
      state.collections[idx].songIds = updated.songIds;
    }

    renderCollections();
    closeModal('modal-open-collection');
    showToast('✓ Collection updated successfully.');
  } catch (err) {
    console.error('Update collection error:', err);
    showToast(err.message || 'Unable to update collection.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
};

/**
 * Export Collection Modal (Section 21 - 28)
 */
window.openExportModal = async function(collectionId) {
  state.exportModalData = {
    collectionId: collectionId,
    language: 'Tamil',
    format: 'PDF',
    skipMissing: false,
    validation: null
  };

  const collection = state.collections.find(c => c.collectionId === collectionId);
  const collName = collection ? collection.name : 'Collection';
  document.getElementById('export-modal-collection-name').textContent = collName;

  // Inform user about Google Drive storage target
  const userEmail = (state.currentUser && state.currentUser.email) ? state.currentUser.email : 'your Google account';
  const emailPlaceholder = document.getElementById('export-user-email-placeholder');
  if (emailPlaceholder) {
    emailPlaceholder.textContent = userEmail;
  }

  // Set default selection
  setExportLanguage('Tamil');
  setExportFormat('PDF');

  openModal('modal-export');
  await validateExportLanguage();
};

window.setExportLanguage = async function(lang) {
  if (!state.exportModalData) return;
  state.exportModalData.language = lang;

  document.querySelectorAll('.lang-radio-card').forEach(card => {
    const isActive = card.dataset.lang === lang;
    if (isActive) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
    card.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  await validateExportLanguage();
};

window.setExportFormat = function(fmt) {
  if (!state.exportModalData) return;
  state.exportModalData.format = fmt;

  document.querySelectorAll('.format-radio-card').forEach(card => {
    const isActive = card.dataset.format === fmt;
    if (isActive) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
    card.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });

  const exportBtn = document.getElementById('btn-execute-export');
  exportBtn.textContent = `Export ${fmt}`;
};

/**
 * Missing Lyrics Validation Check (Section 25)
 */
async function validateExportLanguage() {
  const data = state.exportModalData;
  if (!data) return;

  const warningContainer = document.getElementById('export-missing-warning-container');
  warningContainer.innerHTML = '';

  try {
    const val = await API.call('apiValidateExport', data.collectionId, data.language);
    data.validation = val;

    if (val.hasMissingLyrics) {
      const missingList = val.missingSongs.map(s => `<li>${escapeHtml(s.title)} (${escapeHtml(s.id)})</li>`).join('');
      warningContainer.innerHTML = `
        <div class="alert-warning-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <div class="alert-warning-text">
            <h4>Lyrics unavailable in ${escapeHtml(data.language)} for:</h4>
            <ul class="alert-warning-list">
              ${missingList}
            </ul>
            <p style="margin-top:0.6rem;">
              You can continue export without these songs (${val.availableSongsCount} songs will be exported), or choose another language.
            </p>
            <label style="display:flex; align-items:center; gap:0.5rem; margin-top:0.6rem; cursor:pointer; font-weight:600; color:#fef3c7;">
              <input type="checkbox" id="skip-missing-checkbox" onchange="state.exportModalData.skipMissing = this.checked">
              Continue without these songs
            </label>
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Validation error:', err);
  }
}

/**
 * Execute Export Generation (Section 26, 27, 28)
 */
window.executeExport = async function() {
  const data = state.exportModalData;
  if (!data) return;

  if (data.validation && data.validation.hasMissingLyrics && !data.skipMissing) {
    showToast(`Please check "Continue without these songs" or change language.`, 'error');
    return;
  }

  const exportBtn = document.getElementById('btn-execute-export');
  const originalText = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;"></span> Preparing your document...`;

  try {
    const result = await API.call('apiExportCollection', data.collectionId, data.language, data.format, data.skipMissing);

    if (result.requiresConfirmation) {
      showToast('Export cancelled due to missing lyrics.', 'error');
      return;
    }

    if (result.format === 'PDF') {
      await generateAndDownloadPdf(result);
    } else {
      // Trigger direct browser download of base64 blob (DOCX)
      downloadExportBlob(result.base64Data, result.filename, result.mimeType);
    }

    const userEmail = (state.currentUser && state.currentUser.email) ? state.currentUser.email : '';
    const driveNote = userEmail ? ` and saved to Google Drive for ${userEmail}` : ' and saved to Google Drive';
    showToast(`✓ ${result.format} generated${driveNote}.`);
    closeModal('modal-export');

    // Refresh collection export metadata
    loadCollections();
  } catch (err) {
    console.error('Export error:', err);
    showToast(err.message || 'Unable to generate document.', 'error');
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalText;
  }
};

/**
 * Generate and download valid binary PDF document matching Google Apps Script ExportService.gs
 */
async function generateAndDownloadPdf(result) {
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }

    function loadB64Image(b64) {
      return new Promise((resolve) => {
        if (!b64 || typeof Image === 'undefined') return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = b64.startsWith('data:') ? b64 : ('data:image/png;base64,' + b64);
      });
    }

    const headerLogoB64 = typeof LOGO_HEADER_BASE64 !== 'undefined' ? LOGO_HEADER_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');
    const watermarkB64 = typeof LOGO_IMAGE_WATERMARK_BASE64 !== 'undefined' ? LOGO_IMAGE_WATERMARK_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');

    const [logoImg, watermarkImg] = await Promise.all([
      loadB64Image(headerLogoB64),
      loadB64Image(watermarkB64)
    ]);

    // Standard 150 DPI A4 dimensions: 8.27in x 11.69in = 1240px x 1754px
    const PAGE_W = 1240;
    const PAGE_H = 1754;
    const MARGIN_X = 150; // 1.0in left & right margins
    const CONTENT_W = PAGE_W - (MARGIN_X * 2); // 940px
    const HEADER_TOP = 38; // 0.25in header margin
    const HEADER_LINE_Y = 122;
    const CONTENT_TOP = 165;
    const CONTENT_BOTTOM = 1620;
    const FOOTER_LINE_Y = 1665;
    const FOOTER_TEXT_Y = 1696;
    const FONT_STACK = "'Inter', 'Noto Sans Tamil', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

    const colName = result.collectionName || (state.exportModalData && state.exportModalData.collectionName) || 'Song Collection';
    const songs = Array.isArray(result.songs) ? result.songs : [];

    function wrapTextLines(ctx, text, maxWidth) {
      const rawLines = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      const wrapped = [];
      for (let r = 0; r < rawLines.length; r++) {
        const line = rawLines[r];
        if (!line || line.trim().length === 0) {
          wrapped.push('');
          continue;
        }
        const words = line.split(' ');
        let currentLine = words[0] || '';
        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + ' ' + word;
          if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
          } else {
            wrapped.push(currentLine);
            currentLine = word;
          }
        }
        wrapped.push(currentLine);
      }
      return wrapped;
    }

    function createPageCanvas(pageNumberText) {
      const canvas = document.createElement('canvas');
      canvas.width = PAGE_W;
      canvas.height = PAGE_H;
      const ctx = canvas.getContext('2d');

      // White page background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);

      // 1. Center Watermark behind text (matching ExportService.gs watermark)
      if (watermarkImg && watermarkImg.width > 0) {
        const wmWidth = 820;
        const wmHeight = (watermarkImg.height / watermarkImg.width) * wmWidth;
        const wmX = (PAGE_W - wmWidth) / 2;
        const wmY = (PAGE_H - wmHeight) / 2;
        ctx.save();
        ctx.drawImage(watermarkImg, wmX, wmY, wmWidth, wmHeight);
        ctx.restore();
      }

      // 2. Header: Logo on bottom-left (0.54in x 0.5in = 81px x 75px), Collection Name on bottom-right, Horizontal Rule below
      if (logoImg && logoImg.width > 0) {
        ctx.drawImage(logoImg, MARGIN_X, HEADER_TOP, 81, 75);
      } else {
        ctx.font = `bold 20px ${FONT_STACK}`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.fillText('OmkaarSSL', MARGIN_X, HEADER_LINE_Y - 12);
      }

      ctx.font = `400 19px ${FONT_STACK}`;
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(colName, PAGE_W - MARGIN_X, HEADER_LINE_Y - 10);

      ctx.beginPath();
      ctx.moveTo(MARGIN_X, HEADER_LINE_Y);
      ctx.lineTo(PAGE_W - MARGIN_X, HEADER_LINE_Y);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Footer: Horizontal Rule above, © OmkaarSSL on left, Page Number on right (blank on Page 1, 1..N on Pages 2+)
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, FOOTER_LINE_Y);
      ctx.lineTo(PAGE_W - MARGIN_X, FOOTER_LINE_Y);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `400 19px ${FONT_STACK}`;
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('© OmkaarSSL', MARGIN_X, FOOTER_TEXT_Y);

      if (pageNumberText !== '') {
        ctx.textAlign = 'right';
        ctx.fillText(String(pageNumberText), PAGE_W - MARGIN_X, FOOTER_TEXT_Y);
      }

      return { canvas, ctx };
    }

    const pageJpegs = [];

    function pushCanvasToJpegs(canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const b64 = dataUrl.split(',')[1];
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      pageJpegs.push({ bytes, width: PAGE_W, height: PAGE_H });
    }

    // --- PAGE 1: COVER PAGE (No page number in footer) ---
    const coverPage = createPageCanvas('');
    const cCtx = coverPage.ctx;
    cCtx.font = `bold 62px ${FONT_STACK}`;
    cCtx.fillStyle = '#0f172a';
    cCtx.textAlign = 'center';
    const coverTitleLines = wrapTextLines(cCtx, colName, CONTENT_W - 60);
    const totalCoverHeight = coverTitleLines.length * 78;
    let coverY = (PAGE_H / 2) - (totalCoverHeight / 2) + 20;
    for (let i = 0; i < coverTitleLines.length; i++) {
      cCtx.fillText(coverTitleLines[i], PAGE_W / 2, coverY);
      coverY += 78;
    }
    pushCanvasToJpegs(coverPage.canvas);

    // --- SUBSEQUENT PAGES: SONGS (Numbered starting at 1 on Page 2) ---
    let songPageNum = 1;
    let currentPage = createPageCanvas(songPageNum);
    let curY = CONTENT_TOP;

    const TITLE_LINE_H = 44;
    const LYRIC_LINE_H = 42;

    for (let sIdx = 0; sIdx < songs.length; sIdx++) {
      const song = songs[sIdx];
      const ctx = currentPage.ctx;

      ctx.font = `bold 31px ${FONT_STACK}`;
      const titleLines = wrapTextLines(ctx, song.title || '', CONTENT_W);

      ctx.font = `400 29px ${FONT_STACK}`;
      const lyricLines = wrapTextLines(ctx, song.lyrics || '', CONTENT_W);

      // Ensure song title + at least 2 lines of lyrics fit on current page before starting song
      const minRequiredHeight = (titleLines.length * TITLE_LINE_H) + 14 + Math.min(2, lyricLines.length) * LYRIC_LINE_H;
      if (curY > CONTENT_TOP && (curY + minRequiredHeight > CONTENT_BOTTOM)) {
        pushCanvasToJpegs(currentPage.canvas);
        songPageNum++;
        currentPage = createPageCanvas(songPageNum);
        curY = CONTENT_TOP;
      }

      // Draw Song Title (Heading 2 style: #4338ca bold, no song numbering)
      currentPage.ctx.font = `bold 31px ${FONT_STACK}`;
      currentPage.ctx.fillStyle = '#4338ca';
      currentPage.ctx.textAlign = 'left';
      for (let t = 0; t < titleLines.length; t++) {
        if (curY + TITLE_LINE_H > CONTENT_BOTTOM) {
          pushCanvasToJpegs(currentPage.canvas);
          songPageNum++;
          currentPage = createPageCanvas(songPageNum);
          curY = CONTENT_TOP;
          currentPage.ctx.font = `bold 31px ${FONT_STACK}`;
          currentPage.ctx.fillStyle = '#4338ca';
          currentPage.ctx.textAlign = 'left';
        }
        currentPage.ctx.fillText(titleLines[t], MARGIN_X, curY + 28);
        curY += TITLE_LINE_H;
      }

      curY += 12;

      // Draw Song Lyrics (14pt = 29px at 150 DPI, #0f172a)
      currentPage.ctx.font = `400 29px ${FONT_STACK}`;
      currentPage.ctx.fillStyle = '#0f172a';
      currentPage.ctx.textAlign = 'left';

      for (let l = 0; l < lyricLines.length; l++) {
        if (curY + LYRIC_LINE_H > CONTENT_BOTTOM) {
          pushCanvasToJpegs(currentPage.canvas);
          songPageNum++;
          currentPage = createPageCanvas(songPageNum);
          curY = CONTENT_TOP;
          currentPage.ctx.font = `400 29px ${FONT_STACK}`;
          currentPage.ctx.fillStyle = '#0f172a';
          currentPage.ctx.textAlign = 'left';
        }
        if (lyricLines[l] !== '') {
          currentPage.ctx.fillText(lyricLines[l], MARGIN_X, curY + 26);
        }
        curY += LYRIC_LINE_H;
      }

      curY += 42; // Space after song
    }

    pushCanvasToJpegs(currentPage.canvas);

    // Build standard PDF-1.4 binary with /DCTDecode JPEG page streams
    const pdfBytes = buildPdfFromJpegPages(pageJpegs);
    if (window.NativeMobileBridge && window.NativeMobileBridge.isNativeApp()) {
      const shared = await window.NativeMobileBridge.saveAndShareFile(pdfBytes, result.filename, 'application/pdf');
      if (shared) return;
    }
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  } catch (pdfErr) {
    console.warn('Canvas PDF generation fallback to binary blob download:', pdfErr);
    if (result.base64Data) {
      downloadExportBlob(result.base64Data, result.filename, 'application/pdf');
    }
  }
}

/**
 * Assemble array of { bytes: Uint8Array, width, height } JPEG images into a valid multi-page PDF-1.4 Uint8Array
 */
function buildPdfFromJpegPages(jpegPages) {
  const chunks = [];
  const offsets = [];
  let byteOffset = 0;

  function pushStr(str) {
    const arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i) & 0xFF;
    }
    chunks.push(arr);
    byteOffset += arr.length;
  }

  function pushBytes(arr) {
    chunks.push(arr);
    byteOffset += arr.length;
  }

  function startObj(id) {
    offsets[id] = byteOffset;
    pushStr(id + ' 0 obj\n');
  }

  function endObj() {
    pushStr('\nendobj\n');
  }

  // PDF Header
  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  startObj(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  const numPages = jpegPages.length;
  const pageIds = [];
  let nextObjId = 3;

  for (let i = 0; i < numPages; i++) {
    pageIds.push({
      pageId: nextObjId,
      contentId: nextObjId + 1,
      imgId: nextObjId + 2,
      page: jpegPages[i]
    });
    nextObjId += 3;
  }

  // Object 2: Pages
  startObj(2);
  const kids = pageIds.map(p => p.pageId + ' 0 R').join(' ');
  pushStr('<< /Type /Pages /Kids [' + kids + '] /Count ' + numPages + ' >>');
  endObj();

  // Page, Content Stream, and Image XObject for each page (A4: 595.28 x 841.89 pt)
  const PDF_W = 595.28;
  const PDF_H = 841.89;

  for (let i = 0; i < pageIds.length; i++) {
    const item = pageIds[i];
    const imgName = '/Im' + i;
    const contentStream = 'q\n' + PDF_W + ' 0 0 ' + PDF_H + ' 0 0 cm\n' + imgName + ' Do\nQ\n';

    // Page object
    startObj(item.pageId);
    pushStr(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PDF_W + ' ' + PDF_H + '] ' +
      '/Resources << /XObject << ' + imgName + ' ' + item.imgId + ' 0 R >> >> ' +
      '/Contents ' + item.contentId + ' 0 R >>'
    );
    endObj();

    // Content stream object
    startObj(item.contentId);
    pushStr('<< /Length ' + contentStream.length + ' >>\nstream\n' + contentStream + 'endstream');
    endObj();

    // JPEG Image XObject
    startObj(item.imgId);
    pushStr(
      '<< /Type /XObject /Subtype /Image ' +
      '/Width ' + item.page.width + ' /Height ' + item.page.height + ' ' +
      '/ColorSpace /DeviceRGB /BitsPerComponent 8 ' +
      '/Filter /DCTDecode /Length ' + item.page.bytes.length + ' >>\nstream\n'
    );
    pushBytes(item.page.bytes);
    pushStr('\nendstream');
    endObj();
  }

  const totalObjs = nextObjId;
  const xrefStart = byteOffset;
  pushStr('xref\n0 ' + totalObjs + '\n0000000000 65535 f \n');
  for (let id = 1; id < totalObjs; id++) {
    pushStr(String(offsets[id]).padStart(10, '0') + ' 00000 n \n');
  }
  pushStr('trailer\n<< /Size ' + totalObjs + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n');

  const out = new Uint8Array(byteOffset);
  let pos = 0;
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], pos);
    pos += chunks[i].length;
  }
  return out;
}

/**
 * Base64 file download trigger
 */
function downloadExportBlob(base64Data, filename, mimeType) {
  try {
    if (window.NativeMobileBridge && window.NativeMobileBridge.isNativeApp()) {
      window.NativeMobileBridge.saveAndShareFile(base64Data, filename, mimeType);
      return;
    }
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  } catch (e) {
    console.error('Download trigger error:', e);
  }
}

/**
 * Tab Navigation
 */
window.switchTab = function(tabName) {
  state.activeTab = tabName;
  if (tabName === 'library') {
    elements.tabLibrary.classList.add('active');
    elements.tabLibrary.setAttribute('aria-selected', 'true');
    elements.tabCollections.classList.remove('active');
    elements.tabCollections.setAttribute('aria-selected', 'false');
    elements.viewLibrary.style.display = 'block';
    elements.viewCollections.style.display = 'none';
  } else {
    elements.tabLibrary.classList.remove('active');
    elements.tabLibrary.setAttribute('aria-selected', 'false');
    elements.tabCollections.classList.add('active');
    elements.tabCollections.setAttribute('aria-selected', 'true');
    elements.viewLibrary.style.display = 'none';
    elements.viewCollections.style.display = 'block';
    loadCollections();
  }
  setTimeout(adjustEmbedHeight, 60);
};

/**
 * Modal Management with Accessibility Focus Restoration
 */
let lastFocusedElement = null;

function openModal(id) {
  lastFocusedElement = document.activeElement;
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    // In iframe or mobile view, scroll to ensure modal is in visible viewport
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const firstInteractive = modal.querySelector('input:not([type="hidden"]), button.btn-primary-action, .lyrics-content-area');
    if (firstInteractive) {
      setTimeout(() => firstInteractive.focus(), 60);
    }
    setTimeout(adjustEmbedHeight, 100);
  }
  document.body.style.overflow = 'hidden';
}

window.closeModal = function(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
  setTimeout(adjustEmbedHeight, 80);
};

/**
 * Lyrics Font Size Scaling Controls for Responsive & Mobile Reader
 */
let currentLyricsFontSize = parseInt(localStorage.getItem('LYRICS_FONT_SIZE') || '16', 10);
if (isNaN(currentLyricsFontSize)) currentLyricsFontSize = 16;
document.documentElement.style.setProperty('--lyrics-font-size', currentLyricsFontSize + 'px');

window.adjustLyricsFontSize = function(delta) {
  currentLyricsFontSize = Math.min(28, Math.max(12, currentLyricsFontSize + delta * 2));
  localStorage.setItem('LYRICS_FONT_SIZE', currentLyricsFontSize);
  document.documentElement.style.setProperty('--lyrics-font-size', currentLyricsFontSize + 'px');
  const contentArea = document.getElementById('lyrics-content-area');
  if (contentArea) contentArea.style.fontSize = currentLyricsFontSize + 'px';
};

window.resetLyricsFontSize = function() {
  currentLyricsFontSize = 16;
  localStorage.setItem('LYRICS_FONT_SIZE', currentLyricsFontSize);
  document.documentElement.style.setProperty('--lyrics-font-size', '16px');
  const contentArea = document.getElementById('lyrics-content-area');
  if (contentArea) contentArea.style.fontSize = '16px';
};

/**
 * Check if Edit Lyrics feature is disabled (disabled in Mobile App & mobile viewports)
 */
function isEditLyricsDisabled() {
  if (window.NativeMobileBridge && typeof window.NativeMobileBridge.isNativeApp === 'function' && window.NativeMobileBridge.isNativeApp()) {
    return true;
  }
  if (typeof document !== 'undefined' && document.body && document.body.classList.contains('capacitor-native')) {
    return true;
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
    return true;
  }
  return false;
}

/**
 * Open Song & Lyrics Editor Modal
 */
window.openSongEditor = function(songId) {
  if (isEditLyricsDisabled()) {
    return;
  }
  const song = state.songs.find(s => s.id === songId);
  if (!song) return;

  state.activeEditingSongId = songId;

  document.getElementById('modal-edit-song-id').textContent = `ID: ${song.id}`;
  document.getElementById('edit-song-english-title').value = song.englishTitle || '';
  document.getElementById('edit-song-tamil-title').value = song.tamilTitle || '';
  document.getElementById('edit-song-hindi-title').value = song.hindiTitle || song.devanagariTitle || '';
  document.getElementById('edit-song-tamil-lyrics').value = song.tamilLyrics || '';
  document.getElementById('edit-song-english-lyrics').value = song.englishLyrics || '';
  document.getElementById('edit-song-hindi-lyrics').value = song.devanagariLyrics || '';

  const emailEl = document.getElementById('edit-song-current-user-email');
  if (emailEl) {
    emailEl.textContent = (state.currentUser && state.currentUser.email) ? state.currentUser.email : 'active user';
  }

  // Set initial tab to Tamil or first available
  switchEditLyricsTab(song.hasTamil ? 'tamil' : (song.hasEnglish ? 'english' : 'hindi'));

  openModal('modal-edit-song');
};

/**
 * Switch Edit Lyrics Tab (Tamil, English, Hindi)
 */
window.switchEditLyricsTab = function(lang) {
  state.activeEditLyricsTab = lang;
  
  const tabTamil = document.getElementById('tab-edit-tamil');
  const tabEnglish = document.getElementById('tab-edit-english');
  const tabHindi = document.getElementById('tab-edit-hindi');

  const paneTamil = document.getElementById('pane-edit-tamil');
  const paneEnglish = document.getElementById('pane-edit-english');
  const paneHindi = document.getElementById('pane-edit-hindi');

  if (tabTamil) tabTamil.className = `lyrics-tab-btn ${lang === 'tamil' ? 'active' : ''}`;
  if (tabEnglish) tabEnglish.className = `lyrics-tab-btn ${lang === 'english' ? 'active' : ''}`;
  if (tabHindi) tabHindi.className = `lyrics-tab-btn ${lang === 'hindi' ? 'active' : ''}`;

  if (paneTamil) paneTamil.style.display = lang === 'tamil' ? 'block' : 'none';
  if (paneEnglish) paneEnglish.style.display = lang === 'english' ? 'block' : 'none';
  if (paneHindi) paneHindi.style.display = lang === 'hindi' ? 'block' : 'none';
};

/**
 * Save Song Edits (English Title, Tamil Title, English, Tamil, Hindi Lyrics)
 * Strictly captures user email in Updated By
 */
window.saveSongEdits = async function() {
  if (isEditLyricsDisabled()) {
    return;
  }
  const songId = state.activeEditingSongId;
  if (!songId) return;

  const englishTitle = document.getElementById('edit-song-english-title').value.trim();
  const tamilTitle = document.getElementById('edit-song-tamil-title').value.trim();
  const hindiTitle = document.getElementById('edit-song-hindi-title').value.trim();
  const tamilLyrics = document.getElementById('edit-song-tamil-lyrics').value.trim();
  const englishLyrics = document.getElementById('edit-song-english-lyrics').value.trim();
  const hindiLyrics = document.getElementById('edit-song-hindi-lyrics').value.trim();

  if (!englishTitle && !tamilTitle && !hindiTitle) {
    showToast('Please provide at least one title (English, Tamil, or Hindi).', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-song-edit');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:-2px;margin-right:6px;"></span>
      <span>Saving changes...</span>
    `;
  }

  try {
    const updated = await API.call('apiUpdateSong', songId, {
      englishTitle: englishTitle,
      tamilTitle: tamilTitle,
      hindiTitle: hindiTitle,
      devanagariTitle: hindiTitle,
      tamilLyrics: tamilLyrics,
      englishLyrics: englishLyrics,
      devanagariLyrics: hindiLyrics,
      hindiLyrics: hindiLyrics
    });

    // Update in-memory state
    const index = state.songs.findIndex(s => s.id === songId);
    if (index !== -1) {
      state.songs[index] = Object.assign({}, state.songs[index], updated);
    }

    if (state.activeLyricsSong && state.activeLyricsSong.id === songId) {
      state.activeLyricsSong = state.songs[index];
      renderLyricsModalBody();
    }

    closeModal('modal-edit-song');
    filterSongs();
    showToast(`✓ Song lyrics and titles updated by ${updated.updatedBy || 'you'}.`);
  } catch (err) {
    console.error('Failed to update song:', err);
    showToast('Unable to save changes: ' + (err.message || 'Please try again.'), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        Save Changes
      `;
    }
  }
};

/**
 * Confirm Deletion of a Collection (Collections only, NOT songs)
 */
window.confirmDeleteCollection = function(collectionId, collectionName) {
  if (!collectionId) return;
  state.pendingDeleteCollectionId = collectionId;
  const targetEl = document.getElementById('delete-collection-name-target');
  if (targetEl) targetEl.textContent = `"${collectionName || collectionId}"`;
  const idLabel = document.getElementById('delete-collection-id-label');
  if (idLabel) idLabel.textContent = `ID: ${collectionId}`;
  openModal('modal-delete-collection');
};

/**
 * Executes Collection Deletion
 * Deletes ONLY the collection record, NEVER deletes any songs from library
 */
window.executeDeleteCollection = async function() {
  const collectionId = state.pendingDeleteCollectionId;
  if (!collectionId) return;

  const btn = document.getElementById('btn-confirm-delete-collection');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:-2px;margin-right:6px;"></span>
      <span>Deleting...</span>
    `;
  }

  try {
    await API.call('apiDeleteCollection', collectionId);

    // Update in-memory collections list
    state.collections = state.collections.filter(c => c.collectionId !== collectionId);
    
    // Update indicator if present
    const countEl = document.getElementById('collections-tab-count');
    if (countEl) {
      countEl.textContent = state.collections.length;
    }

    closeModal('modal-delete-collection');
    closeModal('modal-open-collection');
    renderCollections();
    showToast('✓ Collection deleted successfully. Songs in your library remain untouched.');
  } catch (err) {
    console.error('Failed to delete collection:', err);
    showToast(err.message || 'Unable to delete collection. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        Delete Collection
      `;
    }
  }
};

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery.length > 0) {
        elements.searchClearBtn.style.display = 'block';
      } else {
        elements.searchClearBtn.style.display = 'none';
      }
      filterSongs();
    });
  }

  // Close modals on escape key or clicking backdrop
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
      setTimeout(adjustEmbedHeight, 80);
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(adjustEmbedHeight, 80);
      }
    });
  });

  // Handle window resizing and mobile orientation changes
  window.addEventListener('resize', adjustEmbedHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(adjustEmbedHeight, 200);
  });

  // Observe content/DOM changes to dynamically adapt height in Google Sites
  if (typeof ResizeObserver !== 'undefined' && document.body) {
    let roTimer = null;
    const ro = new ResizeObserver(() => {
      if (roTimer) clearTimeout(roTimer);
      roTimer = setTimeout(adjustEmbedHeight, 80);
    });
    ro.observe(document.body);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

