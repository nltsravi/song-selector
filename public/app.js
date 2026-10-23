
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
  isLoadingCollections: false
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
  checkEmbeddedMode();
  setupEventListeners();
  await checkAuthentication();
  setTimeout(adjustEmbedHeight, 300);
}

/**
 * Check Authentication Status (Section 4, 5, 6, 53)
 */
async function checkAuthentication() {
  try {
    const user = await API.call('apiGetCurrentUser');
    state.currentUser = user;

    if (!user || !user.isAuthenticated || !user.email) {
      renderUnauthenticatedState(user ? user.error : null);
      return;
    }

    if (user.isDomainAllowed === false) {
      renderRequestAccessState(user);
      return;
    }

    renderAuthenticatedState(user);
    loadSongs();
    loadCollections();
  } catch (err) {
    console.error('Auth check failure:', err);
    renderUnauthenticatedState({
      message: 'Unable to verify your Google session. Please sign in to your Google account and reload.'
    });
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
      
      <button type="button" class="btn-google-signin" id="btn-google-login" onclick="window.MockBackend ? window.MockBackend.setSimulatedUser('logged_in_gmail') : window.open('https://accounts.google.com/signin', '_blank')">
        <svg style="width:18px;height:18px;" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Sign in with Google
      </button>
      <div class="domain-note">Enterprise Google Accounts & Gmail supported</div>
    `;
  }
}

/**
 * Render Request Access Screen (Section 4, 6)
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
          Once the administrator approves your request in the Google Sheet, clicking "Check Access Status" will immediately take you into the library.
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.75rem; width:100%; margin-top:1rem;">
        <button type="button" class="btn-primary btn-request-access" id="btn-refresh-status" onclick="window.checkAuthStatus()">
          <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          <span>Check Access Status / Refresh</span>
        </button>

        <a href="https://accounts.google.com/AccountChooser" target="_blank" class="btn-google-signin" style="background:#f8fafc; color:#0f172a; text-decoration:none;">
          Switch Google Account
        </a>
      </div>
    `;
  } else {
    authCard.innerHTML = `
      <div class="auth-card-icon" style="background:rgba(99,102,241,0.12); border-color:rgba(99,102,241,0.25); color:var(--primary);">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <h2>Request Library Access</h2>
      <p style="margin-bottom:0.75rem;">You need permission to access the Song Collection & Lyrics Library. Submit an access request for your Google account below:</p>

      <div class="user-pill-highlight">
        <span class="user-pill-dot"></span>
        <span>Signed in as: <strong>${escapeHtml(email)}</strong></span>
      </div>

      <div class="access-form-wrapper" style="width:100%; margin-top:0.75rem; text-align:left;">
        <label for="access-reason-input" style="display:block; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.4rem;">
          Note or Reason for Access (Optional)
        </label>
        <input type="text" id="access-reason-input" class="access-reason-input" placeholder="e.g. Choir member, worship leader..." maxlength="150" />
        
        <button type="button" class="btn-primary btn-request-access" id="btn-submit-access-request" onclick="window.submitAccessRequest()">
          <svg style="width:18px;height:18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <span>Request Access for ${escapeHtml(email)}</span>
        </button>

        <div style="text-align:center; margin-top:1.25rem;">
          <a href="https://accounts.google.com/AccountChooser" target="_blank" style="font-size:0.85rem; color:var(--text-muted); text-decoration:none;">
            Want to use another account? <strong style="color:var(--primary);">Switch Account</strong>
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
  elements.userAvatar.textContent = email.charAt(0).toUpperCase() || 'U';

  if (user.domain) {
    elements.userStatusPill.textContent = user.domain;
  }
}

/**
 * Load Songs from Backend (Section 10, 42, 43)
 */
async function loadSongs() {
  state.isLoadingSongs = true;
  renderSongsLoading();

  try {
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
    const tagsMatch = (song.tags || '').toLowerCase().includes(query);

    return idMatch || titleMatch || tagsMatch;
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
      <button class="tag-pill ${isActive ? 'active' : ''}" onclick="selectFilterTag('${escapeHtml(tag)}')">
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
    : 'images/omkaarssl-logo-transperent-black.png';

  state.filteredSongs.forEach(song => {
    const isSelected = state.selectedSongIds.has(song.id);
    const tagBadges = (song.tagList || []).map(t =>
      `<span class="song-tag-badge">${escapeHtml(t)}</span>`
    ).join('');

    const hasCustomImage = Boolean(song.imageUrl && song.imageUrl.trim());
    const displayImg = hasCustomImage ? song.imageUrl.trim() : defaultSongImage;

    const hasAudio = Boolean(song.audioUrl && song.audioUrl.trim());
    const audioBtnHtml = hasAudio
      ? `<a href="${escapeHtml(song.audioUrl.trim())}" target="_blank" rel="noopener noreferrer" class="media-btn audio-btn enabled" title="Listen Audio: ${escapeHtml(song.audioUrl.trim())}" onclick="event.stopPropagation();" aria-label="Listen audio for ${escapeHtml(song.title)}">
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

    const hasVideo = Boolean(song.videoUrl && song.videoUrl.trim());
    const videoBtnHtml = hasVideo
      ? `<a href="${escapeHtml(song.videoUrl.trim())}" target="_blank" rel="noopener noreferrer" class="media-btn video-btn enabled" title="Watch Video: ${escapeHtml(song.videoUrl.trim())}" onclick="event.stopPropagation();" aria-label="Watch video for ${escapeHtml(song.title)}">
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
              <input type="checkbox" class="custom-checkbox-input" id="check-${escapeHtml(song.id)}" ${isSelected ? 'checked' : ''} onchange="toggleSongSelection('${escapeHtml(song.id)}')" aria-label="Select song ${escapeHtml(song.title)}">
              <span class="custom-checkbox-box" aria-hidden="true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              </span>
            </label>
            <div class="song-info">
              <h3 class="song-title">${escapeHtml(song.title)}</h3>
              <span class="song-id-badge" style="display: none;" aria-hidden="true">${escapeHtml(song.id)}</span>
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
            <button class="btn-add-tag-inline" onclick="openTagEditor('${escapeHtml(song.id)}')" title="Edit tags" aria-label="Add or edit tags for ${escapeHtml(song.title)}">
              <svg style="width:12px;height:12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              + Tags
            </button>
          </div>
        </div>

        <div class="song-card-actions">
          <button class="btn-secondary-action" onclick="openLyricsPreview('${escapeHtml(song.id)}')" aria-label="View lyrics for ${escapeHtml(song.title)}">
            <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            View Lyrics
          </button>
          <button class="btn-secondary-action" onclick="openTagEditor('${escapeHtml(song.id)}')" aria-label="Edit tags for ${escapeHtml(song.title)}">
            <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            Edit Tags
          </button>
        </div>
      </div>
    `;
  });

  elements.songsGrid.innerHTML = html;
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

  contentArea.className = `lyrics-content-area ${fontClass}`;
  contentArea.textContent = lyricsText;
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
          <button class="btn-secondary-action" onclick="openCollectionDetails('${escapeHtml(col.collectionId)}')" style="flex:1;">
            Open Collection
          </button>
          <button class="btn-primary-action" onclick="openExportModal('${escapeHtml(col.collectionId)}')" style="padding:0.5rem 1rem;">
            Export
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

    // Trigger direct browser download of base64 blob
    downloadExportBlob(result.base64Data, result.filename, result.mimeType);

    showToast(`✓ ${result.format} generated successfully.`);
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
 * Base64 file download trigger
 */
function downloadExportBlob(base64Data, filename, mimeType) {
  try {
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

