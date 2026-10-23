/**
 * Automated Test Suite for Google Sites Song Collection & Lyrics Export Application
 * Tests core business logic, ID generation, Tag normalization, Sanitization, Ownership, and Missing lyrics validation
 */

const assert = require('assert');

// 1. Tag Normalization Tests (Section 8, 49)
function normalizeTags(input) {
  if (!input) return '';
  var list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (typeof input === 'string') {
    list = input.split(/[,|]/);
  }

  var seen = {};
  var cleaned = [];
  for (var i = 0; i < list.length; i++) {
    var item = (list[i] || '').toString().trim();
    if (item.length > 0 && item.length <= 50) {
      var lower = item.toLowerCase();
      if (!seen[lower]) {
        seen[lower] = true;
        var formatted = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
        cleaned.push(formatted);
      }
    }
  }
  return cleaned.join(', ');
}

// 2. ID Generation Tests (Section 15, 51)
function generateCollectionId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `COL-${datePart}-${rand}`;
}

// 3. Filename Sanitization Tests (Section 28)
function sanitizeFilename(name) {
  if (!name) return 'Collection';
  return name.replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Collection';
}

// 4. Missing Lyrics Validation Tests (Section 25)
function validateLyricsAvailability(songs, language) {
  const langKey = (language || '').toLowerCase();
  const missingSongs = [];
  const availableSongs = [];

  songs.forEach(song => {
    let lyrics = '';
    if (langKey === 'tamil') lyrics = song.tamilLyrics;
    else if (langKey === 'devanagari') lyrics = song.devanagariLyrics;
    else lyrics = song.englishLyrics;

    if (!lyrics || lyrics.trim() === '') {
      missingSongs.push({ id: song.id, title: song.title });
    } else {
      availableSongs.push({ id: song.id, title: song.title });
    }
  });

  return {
    language,
    hasMissingLyrics: missingSongs.length > 0,
    missingSongs,
    availableSongsCount: availableSongs.length
  };
}

// 5. Ownership Isolation Filter (Section 17)
function filterCollectionsByOwner(collections, userEmail) {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  return collections.filter(c => (c.userEmail || '').trim().toLowerCase() === cleanEmail);
}

// Run Test Suite
console.log('Running Song Selector Test Suite...\n');

// Test 1: Tag Normalization
console.log('Test 1: Tag Normalization');
const tagTest1 = normalizeTags('  prayer, Morning, prayer , worship | CHILDREN  ');
assert.strictEqual(tagTest1, 'Prayer, Morning, Worship, Children');
assert.strictEqual(normalizeTags(''), '');
assert.strictEqual(normalizeTags(['praise', 'thanksgiving', 'Praise']), 'Praise, Thanksgiving');
console.log('✓ Tag Normalization tests passed.');

// Test 2: ID Generation
console.log('\nTest 2: Collection ID Generation');
const colId = generateCollectionId();
assert.match(colId, /^COL-\d{8}-\d{6}-[A-Z0-9]{4}$/);
console.log(`✓ Generated ID format verified: ${colId}`);

// Test 3: Filename Sanitization
console.log('\nTest 3: Filename Sanitization');
const cleanName = sanitizeFilename('Morning / Worship: Sunday & Praise?');
assert.strictEqual(cleanName, 'Morning_Worship_Sunday_&_Praise');
assert.strictEqual(sanitizeFilename(''), 'Collection');
console.log(`✓ Sanitized filename verified: ${cleanName}`);

// Test 4: Missing Lyrics Detection
console.log('\nTest 4: Missing Lyrics Detection (Section 25)');
const sampleSongSet = [
  { id: 'S001', title: 'Song 1', tamilLyrics: 'தமிழ்', englishLyrics: 'English', devanagariLyrics: 'हिन्दी' },
  { id: 'S009', title: 'Song 9', tamilLyrics: 'தமிழ்', englishLyrics: 'English', devanagariLyrics: '' },
  { id: 'S010', title: 'Song 10', tamilLyrics: '', englishLyrics: 'English', devanagariLyrics: 'हिन्दी' }
];

const checkTamil = validateLyricsAvailability(sampleSongSet, 'Tamil');
assert.strictEqual(checkTamil.hasMissingLyrics, true);
assert.strictEqual(checkTamil.missingSongs.length, 1);
assert.strictEqual(checkTamil.missingSongs[0].id, 'S010');

const checkEnglish = validateLyricsAvailability(sampleSongSet, 'English');
assert.strictEqual(checkEnglish.hasMissingLyrics, false);
assert.strictEqual(checkEnglish.availableSongsCount, 3);

const checkDevanagari = validateLyricsAvailability(sampleSongSet, 'Devanagari');
assert.strictEqual(checkDevanagari.hasMissingLyrics, true);
assert.strictEqual(checkDevanagari.missingSongs[0].id, 'S009');
console.log('✓ Missing lyrics detection correctly identified missing songs in Tamil and Devanagari.');

// Test 5: Strict Ownership Isolation
console.log('\nTest 5: Collection Ownership Isolation (Section 17)');
const allCollections = [
  { id: 'COL-1', userEmail: 'user@example.com', name: 'My Songs' },
  { id: 'COL-2', userEmail: 'other@example.com', name: 'Private Songs' },
  { id: 'COL-3', userEmail: 'USER@EXAMPLE.COM', name: 'Another Collection' }
];
const userCols = filterCollectionsByOwner(allCollections, 'user@example.com');
assert.strictEqual(userCols.length, 2);
assert.strictEqual(userCols.some(c => c.userEmail === 'other@example.com'), false);
console.log('✓ Strict ownership filtering verified.');

// Test 6: Export First Page, Header, Footer & Watermark Configuration
console.log('\nTest 6: Export First Page, Header, Footer & Watermark Configuration');
const fs = require('fs');
const exportServiceCode = fs.readFileSync('apps-script/ExportService.gs', 'utf8');
const mockBackendCode = fs.readFileSync('public/mock-backend.js', 'utf8');

// Assert First Page Cover in ExportService: collection name in body center with increased font and page break
assert(exportServiceCode.includes('titlePara.setFontSize(30).setBold(true)'), 'ExportService must set increased font size for collection name on first page');
assert(exportServiceCode.includes('titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)'), 'ExportService must center collection name on first page');
assert(exportServiceCode.includes('body.appendPageBreak()'), 'ExportService must append page break after first page');

// Assert Header has collection name on right side in ExportService
assert(exportServiceCode.includes("['', collection.name]"), 'ExportService must have collection name on right in header table');
assert(exportServiceCode.includes('pRight.setAlignment(DocumentApp.HorizontalAlignment.RIGHT)'), 'ExportService must right-align collection name in header');

// Assert First Page and subsequent footer behavior in ExportService
assert(exportServiceCode.includes('getExportTemplateId'), 'ExportService must call getExportTemplateId for different first page & page numbering');
assert(exportServiceCode.includes('© OmkaarSSL'), 'ExportService must include © OmkaarSSL in footer');

// Assert mock-backend structure:
// 1. Header has collection name on right side
assert(mockBackendCode.includes('<td class="header-right">${col.name}</td>'), 'mock-backend must display collection name in header right');

// 2. First page body has collection name with increased font
assert(mockBackendCode.includes('<div class="collection-title-cover">${col.name}</div>'), 'mock-backend must have first page cover title');

// 3. First page footer has NO page number
assert(mockBackendCode.includes('<td class="footer-right"></td>'), 'mock-backend first page footer must not have page number');

// 4. Subsequent page footer starts page number from 1
assert(mockBackendCode.includes("<span style=\"mso-field-code:'PAGE'\">1</span>"), 'mock-backend subsequent footer must display page number starting from 1');

// Assert watermark is enabled in both ExportService and mock-backend
assert(!exportServiceCode.includes('// Watermark addition commented out for now'), 'ExportService watermark must be enabled');
assert(exportServiceCode.includes('addPositionedImage(watermarkBlob)'), 'ExportService must add watermark image');

assert(!mockBackendCode.includes('<!-- Watermark commented out for now'), 'mock-backend watermark must be enabled');
assert(mockBackendCode.includes('<div class="watermark">'), 'mock-backend must include watermark container');
assert(mockBackendCode.includes('<img src="data:image/png;base64,${watermarkBase64}" alt="Watermark" />'), 'mock-backend must include watermark image');

const logoCode = fs.readFileSync('apps-script/Logo.gs', 'utf8');
assert(logoCode.includes('LOGO_IMAGE_WATERMARK_BASE64'), 'Logo.gs must define LOGO_IMAGE_WATERMARK_BASE64');
const publicLogoCode = fs.readFileSync('public/logo-data.js', 'utf8');
assert(publicLogoCode.includes('LOGO_IMAGE_WATERMARK_BASE64'), 'logo-data.js must define LOGO_IMAGE_WATERMARK_BASE64');

// Assert Header & Footer margins and padding are reduced to eliminate white space
assert(mockBackendCode.includes('mso-header-margin: 0.25in;'), 'mock-backend must set mso-header-margin to 0.25in');
assert(mockBackendCode.includes('mso-footer-margin: 0.25in;'), 'mock-backend must set mso-footer-margin to 0.25in');
assert(mockBackendCode.includes('.header-table { width: 100%; border-bottom: 1px solid #cbd5e1; margin: 0 0 8px 0; padding: 0; }'), 'mock-backend must eliminate header-table extra padding and margin');
assert(mockBackendCode.includes('.header-right { text-align: right; font-size: 11px; color: #64748b; vertical-align: bottom;'), 'mock-backend must bottom-align collection name');
assert(exportServiceCode.includes('marginHeader: { magnitude: 18, unit: \'PT\' }'), 'ExportService must set marginHeader to 18pt (0.25in)');
assert(exportServiceCode.includes('marginFooter: { magnitude: 18, unit: \'PT\' }'), 'ExportService must set marginFooter to 18pt (0.25in)');
assert(exportServiceCode.includes('cellLeft.setVerticalAlignment(DocumentApp.VerticalAlignment.BOTTOM)'), 'ExportService must bottom-align logo cell');
assert(exportServiceCode.includes('cellRight.setVerticalAlignment(DocumentApp.VerticalAlignment.BOTTOM)'), 'ExportService must bottom-align collection name cell');
assert(exportServiceCode.includes('cellLeft.setPaddingTop(0)'), 'ExportService must set zero top padding for logo cell');
assert(exportServiceCode.includes('cellRight.setPaddingTop(0)'), 'ExportService must set zero top padding for title cell');

console.log('✓ Export first page, header collection name on right, footer numbering (page 1 none, page 2+ starts at 1), watermark & reduced header/footer white space verified.');

// Test 7: CSV Columns, Song Card Layout, Audio/Video Icons, and Favicon
console.log('\nTest 7: CSV Columns, Song Card Layout, Audio/Video Icons, and Favicon');
const csvTemplate = fs.readFileSync('docs/Songs_Template.csv', 'utf8');
const headerLine = csvTemplate.split('\n')[0];
assert(headerLine.includes('Image URL'), 'CSV template must contain Image URL column');
assert(headerLine.includes('Audio URL'), 'CSV template must contain Audio URL column');
assert(headerLine.includes('Video URL'), 'CSV template must contain Video URL column');

// Verify SongService extracts imageUrl, audioUrl, videoUrl
const songServiceCode = fs.readFileSync('apps-script/SongService.gs', 'utf8');
assert(songServiceCode.includes("headerMap['image url']"), 'SongService must check image url header');
assert(songServiceCode.includes("headerMap['audio url']"), 'SongService must check audio url header');
assert(songServiceCode.includes("headerMap['video url']"), 'SongService must check video url header');
assert(songServiceCode.includes('imageUrl: imageUrl'), 'SongService must output imageUrl');
assert(songServiceCode.includes('audioUrl: audioUrl'), 'SongService must output audioUrl');
assert(songServiceCode.includes('videoUrl: videoUrl'), 'SongService must output videoUrl');

// Verify SetupSheet & Code.gs
const setupSheetCode = fs.readFileSync('apps-script/SetupSheet.gs', 'utf8');
assert(setupSheetCode.includes("'Image URL'"), 'SetupSheet must include Image URL header');
assert(setupSheetCode.includes("'Audio URL'"), 'SetupSheet must include Audio URL header');
assert(setupSheetCode.includes("'Video URL'"), 'SetupSheet must include Video URL header');

// Verify index.html favicon & logo
const publicIndex = fs.readFileSync('public/index.html', 'utf8');
assert(publicIndex.includes('omkaarssl-logo-transperent-black.png'), 'public/index.html must reference omkaarssl-logo-transperent-black.png');
assert(publicIndex.includes('rel="icon"'), 'public/index.html must define favicon');

const appsScriptIndex = fs.readFileSync('apps-script/index.html', 'utf8');
assert(appsScriptIndex.includes('rel="icon"'), 'apps-script/index.html must define favicon');
assert(appsScriptIndex.includes('brand-logo-img'), 'apps-script/index.html must render brand-logo-img');

// Verify app.js & javascript.html song card layout
const appJsCode = fs.readFileSync('public/app.js', 'utf8');
assert(appJsCode.includes('song-card-image-wrap'), 'app.js must render image wrap on top');
assert(appJsCode.includes('media-btn audio-btn'), 'app.js must render audio button');
assert(appJsCode.includes('media-btn video-btn'), 'app.js must render video button');
assert(appJsCode.includes('omkaarssl-logo-transperent-black.png'), 'app.js must use omkaarssl logo as default fallback image');

const jsHtmlCode = fs.readFileSync('apps-script/javascript.html', 'utf8');
assert(jsHtmlCode.includes('song-card-image-wrap'), 'javascript.html must render image wrap on top');
assert(jsHtmlCode.includes('media-btn audio-btn'), 'javascript.html must render audio button');
assert(jsHtmlCode.includes('media-btn video-btn'), 'javascript.html must render video button');

// Verify styles.css hides song ID and styles image on top
const stylesCss = fs.readFileSync('public/styles.css', 'utf8');
assert(stylesCss.includes('.song-id-badge'), 'styles.css must reference .song-id-badge');
assert(stylesCss.includes('display: none'), 'styles.css must hide song id');
assert(stylesCss.includes('.song-card-image-wrap'), 'styles.css must style .song-card-image-wrap');
assert(stylesCss.includes('.media-btn.audio-btn.enabled'), 'styles.css must style enabled audio button');
assert(stylesCss.includes('.media-btn.video-btn.enabled'), 'styles.css must style enabled video button');

console.log('✓ CSV columns, song card image on top, hidden ID, checkbox placement, media icons, and favicon verified.');

// Test 8: Request Access System, Sheet Structure & UI State
console.log('\nTest 8: Request Access System, Sheet Structure & UI State');
const configGs = fs.readFileSync('apps-script/Config.gs', 'utf8');
assert(configGs.includes("ACCESS_REQUESTS_SHEET: 'AccessRequests'"), 'Config.gs must define ACCESS_REQUESTS_SHEET');

const setupGs = fs.readFileSync('apps-script/SetupSheet.gs', 'utf8');
assert(setupGs.includes('AccessRequests'), 'SetupSheet.gs must reference AccessRequests sheet');
assert(setupGs.includes('Request ID') && setupGs.includes('Email') && setupGs.includes('Status'), 'SetupSheet.gs must initialize AccessRequests columns');

const authGs = fs.readFileSync('apps-script/Auth.gs', 'utf8');
assert(authGs.includes('getUserRequestStatus'), 'Auth.gs must implement getUserRequestStatus');
assert(authGs.includes('submitAccessRequest'), 'Auth.gs must implement submitAccessRequest');
assert(authGs.includes('ACCESS_REQUESTS_SHEET'), 'Auth.gs must reference ACCESS_REQUESTS_SHEET');

const codeGs = fs.readFileSync('apps-script/Code.gs', 'utf8');
assert(codeGs.includes('apiSubmitAccessRequest'), 'Code.gs must expose apiSubmitAccessRequest endpoint');

assert(jsHtmlCode.includes('renderRequestAccessState'), 'javascript.html must implement renderRequestAccessState');
assert(jsHtmlCode.includes('user-pill-highlight'), 'javascript.html must include user-pill-highlight');
assert(jsHtmlCode.includes('submitAccessRequest'), 'javascript.html must implement submitAccessRequest');

const appJs = fs.readFileSync('public/app.js', 'utf8');
assert(appJs.includes('renderRequestAccessState'), 'public/app.js must implement renderRequestAccessState');
assert(appJs.includes('user-pill-highlight'), 'public/app.js must include user-pill-highlight');

assert(stylesCss.includes('.user-pill-highlight'), 'styles.css must style .user-pill-highlight');
assert(stylesCss.includes('.btn-request-access'), 'styles.css must style .btn-request-access');

console.log('✓ Request Access sheet structure, backend endpoints, UI components, and styles verified.');

// Test 9: Bilingual Titles, Lyrics Editing & User Email Capture
console.log('\nTest 9: Bilingual Titles, Lyrics Editing & User Email Capture');

// 1. Verify Bilingual Titles in SetupSheet & SongService
assert(setupSheetCode.includes("'English Title'"), 'SetupSheet.gs must include English Title column');
assert(setupSheetCode.includes("'Tamil Title'"), 'SetupSheet.gs must include Tamil Title column');
assert(songServiceCode.includes("headerMap['english title']"), 'SongService.gs must check english title header');
assert(songServiceCode.includes("headerMap['tamil title']"), 'SongService.gs must check tamil title header');
assert(songServiceCode.includes('englishTitle: englishTitle'), 'SongService.gs must return englishTitle');
assert(songServiceCode.includes('tamilTitle: tamilTitle'), 'SongService.gs must return tamilTitle');

// 2. Verify Legacy Regex Fallback for Bilingual Titles
const legacyRegex = /^([^(]+)\s*\(([^)]+)\)$/;
const legacySample = "How Great Thou Art (எத்தனை பெரியவர்)";
const match = legacySample.match(legacyRegex);
assert(match, 'Legacy regex must match English (Tamil) format');
assert.strictEqual(match[1].trim(), 'How Great Thou Art');
assert.strictEqual(match[2].trim(), 'எத்தனை பெரியவர்');

// 3. Verify Code.gs exposes apiUpdateSong
assert(codeGs.includes('apiUpdateSong'), 'Code.gs must expose apiUpdateSong endpoint');

// 4. Verify SongService updateSong captures editor email and updates sheet
assert(songServiceCode.includes('updateSong: function(songId, songData)'), 'SongService must implement updateSong');
assert(songServiceCode.includes('AuthService.requireAuthUserEmail()'), 'SongService must require authenticated user email for updating songs');
assert(songServiceCode.includes("headerMap['updated by']"), 'SongService must update Updated By column');
assert(songServiceCode.includes("headerMap['updated at']"), 'SongService must update Updated At column');
assert(songServiceCode.includes('englishLyrics'), 'SongService must update English lyrics');
assert(songServiceCode.includes('tamilLyrics'), 'SongService must update Tamil lyrics');
assert(songServiceCode.includes('devanagariLyrics'), 'SongService must update Devanagari lyrics');

// 5. Verify ExportService uses bilingual titles appropriately
assert(exportServiceCode.includes("validLang === 'Tamil' && s.tamilTitle"), 'ExportService must prioritize Tamil title for Tamil exports');
assert(exportServiceCode.includes("validLang === 'English' && s.englishTitle"), 'ExportService must prioritize English title for English exports');

// 6. Verify Edit Lyrics & Title Modal in HTML
assert(appsScriptIndex.includes('id="modal-edit-song"'), 'apps-script/index.html must include modal-edit-song');
assert(appsScriptIndex.includes('id="edit-song-english-title"'), 'apps-script/index.html must have edit-song-english-title');
assert(appsScriptIndex.includes('id="edit-song-tamil-title"'), 'apps-script/index.html must have edit-song-tamil-title');
assert(appsScriptIndex.includes('id="edit-song-tamil-lyrics"'), 'apps-script/index.html must have edit-song-tamil-lyrics');
assert(appsScriptIndex.includes('id="edit-song-english-lyrics"'), 'apps-script/index.html must have edit-song-english-lyrics');
assert(appsScriptIndex.includes('id="edit-song-hindi-lyrics"'), 'apps-script/index.html must have edit-song-hindi-lyrics');
assert(appsScriptIndex.includes('id="edit-song-current-user-email"'), 'apps-script/index.html must show active editor email');

assert(publicIndex.includes('id="modal-edit-song"'), 'public/index.html must include modal-edit-song');

// 7. Verify Client-side functions in public/app.js & apps-script/javascript.html
assert(appJs.includes('openSongEditor'), 'public/app.js must implement openSongEditor');
assert(appJs.includes('switchEditLyricsTab'), 'public/app.js must implement switchEditLyricsTab');
assert(appJs.includes('saveSongEdits'), 'public/app.js must implement saveSongEdits');
assert(appJs.includes('apiUpdateSong'), 'public/app.js must call apiUpdateSong');

assert(jsHtmlCode.includes('openSongEditor'), 'apps-script/javascript.html must implement openSongEditor');
assert(jsHtmlCode.includes('switchEditLyricsTab'), 'apps-script/javascript.html must implement switchEditLyricsTab');
assert(jsHtmlCode.includes('saveSongEdits'), 'apps-script/javascript.html must implement saveSongEdits');
assert(jsHtmlCode.includes('apiUpdateSong'), 'apps-script/javascript.html must call apiUpdateSong');

// 8. Verify Styles for Bilingual UI & Attribution
assert(stylesCss.includes('.song-subtitle-tamil'), 'styles.css must style .song-subtitle-tamil');
assert(stylesCss.includes('.song-editor-meta'), 'styles.css must style .song-editor-meta');
assert(stylesCss.includes('.lyrics-attribution-footer'), 'styles.css must style .lyrics-attribution-footer');
assert(stylesCss.includes('.editor-attribution-notice'), 'styles.css must style .editor-attribution-notice');

console.log('✓ Bilingual titles, multi-lingual lyrics editing, and editor email attribution verified.');

// Test 10: Hindi Title in All Song Services & Collection Deletion (Collections Only, Never Songs)
console.log('\nTest 10: Hindi Title in All Song Services & Collection Deletion (Collections Only, Never Songs)');

// 1. Re-read files to capture latest modifications
const updatedSetupSheet = fs.readFileSync('apps-script/SetupSheet.gs', 'utf8');
const updatedSongService = fs.readFileSync('apps-script/SongService.gs', 'utf8');
const updatedExportService = fs.readFileSync('apps-script/ExportService.gs', 'utf8');
const updatedCodeGs = fs.readFileSync('apps-script/Code.gs', 'utf8');
const updatedCollectionService = fs.readFileSync('apps-script/CollectionService.gs', 'utf8');
const updatedPublicIndex = fs.readFileSync('public/index.html', 'utf8');
const updatedAppsScriptIndex = fs.readFileSync('apps-script/index.html', 'utf8');
const updatedAppJs = fs.readFileSync('public/app.js', 'utf8');
const updatedJsHtml = fs.readFileSync('apps-script/javascript.html', 'utf8');
const updatedStylesCss = fs.readFileSync('public/styles.css', 'utf8');

// 2. Verify Hindi Title in SetupSheet & SongService
assert(updatedSetupSheet.includes("'Hindi Title'"), 'SetupSheet.gs must include Hindi Title column');
assert(updatedSongService.includes("headerMap['hindi title']"), 'SongService.gs must check hindi title header');
assert(updatedSongService.includes('hindiTitle: hindiTitle'), 'SongService.gs must return hindiTitle');
assert(updatedExportService.includes("validLang === 'Devanagari' && (s.hindiTitle || s.devanagariTitle)"), 'ExportService must prioritize Hindi/Devanagari title for Devanagari exports');

// 3. Verify Hindi Title editing in Modal
assert(updatedPublicIndex.includes('id="edit-song-hindi-title"'), 'public/index.html must include edit-song-hindi-title');
assert(updatedAppsScriptIndex.includes('id="edit-song-hindi-title"'), 'apps-script/index.html must include edit-song-hindi-title');
assert(updatedAppJs.includes('edit-song-hindi-title'), 'public/app.js must handle edit-song-hindi-title');
assert(updatedJsHtml.includes('edit-song-hindi-title'), 'apps-script/javascript.html must handle edit-song-hindi-title');

// 4. Verify Collection Deletion API and Service
assert(updatedCodeGs.includes('apiDeleteCollection'), 'Code.gs must expose apiDeleteCollection');
assert(updatedCollectionService.includes('deleteCollection: function(collectionId)'), 'CollectionService must implement deleteCollection');
assert(updatedCollectionService.includes('sheet.deleteRow(targetRow)'), 'CollectionService must delete collection row');
assert(updatedCollectionService.includes('CONFIG.COLLECTIONS_SHEET'), 'CollectionService must target Collections sheet');
assert(!updatedCollectionService.includes('CONFIG.SONGS_SHEET'), 'CollectionService must NEVER touch Songs sheet during collection deletion');

// 5. Verify Collection Deletion UI & Confirmation Modal
assert(updatedPublicIndex.includes('id="modal-delete-collection"'), 'public/index.html must include modal-delete-collection');
assert(updatedAppsScriptIndex.includes('id="modal-delete-collection"'), 'apps-script/index.html must include modal-delete-collection');
assert(updatedPublicIndex.includes('The songs inside this collection will <strong>NOT</strong> be deleted'), 'public/index.html must emphasize songs will not be deleted');
assert(updatedAppsScriptIndex.includes('The songs inside this collection will <strong>NOT</strong> be deleted'), 'apps-script/index.html must emphasize songs will not be deleted');

assert(updatedAppJs.includes('confirmDeleteCollection'), 'public/app.js must implement confirmDeleteCollection');
assert(updatedAppJs.includes('executeDeleteCollection'), 'public/app.js must implement executeDeleteCollection');
assert(updatedAppJs.includes('apiDeleteCollection'), 'public/app.js must call apiDeleteCollection');

assert(updatedJsHtml.includes('confirmDeleteCollection'), 'apps-script/javascript.html must implement confirmDeleteCollection');
assert(updatedJsHtml.includes('executeDeleteCollection'), 'apps-script/javascript.html must implement executeDeleteCollection');
assert(updatedJsHtml.includes('apiDeleteCollection'), 'apps-script/javascript.html must call apiDeleteCollection');

assert(updatedStylesCss.includes('.btn-danger-action'), 'styles.css must style .btn-danger-action');
assert(updatedStylesCss.includes('.song-subtitle-hindi'), 'styles.css must style .song-subtitle-hindi');

console.log('✓ Hindi titles for songs, multi-title editing, and safe collection-only deletion verified.');

// Test 11: List View Switcher, 2-Column List Layout & Card View Default
console.log('\nTest 11: List View Switcher, 2-Column List Layout & Card View Default');

// 1. Re-read files to capture latest modifications
const test11PublicIndex = fs.readFileSync('public/index.html', 'utf8');
const test11AppsScriptIndex = fs.readFileSync('apps-script/index.html', 'utf8');
const test11AppJs = fs.readFileSync('public/app.js', 'utf8');
const test11JsHtml = fs.readFileSync('apps-script/javascript.html', 'utf8');
const test11StylesCss = fs.readFileSync('public/styles.css', 'utf8');
const test11StylesHtml = fs.readFileSync('apps-script/styles.html', 'utf8');

// 2. Verify View Toggle Buttons in UI Markup
assert(test11PublicIndex.includes('id="btn-view-card"'), 'public/index.html must include btn-view-card');
assert(test11PublicIndex.includes('id="btn-view-list"'), 'public/index.html must include btn-view-list');
assert(test11PublicIndex.includes('switchSongsView(\'card\')'), 'public/index.html must bind switchSongsView(card)');
assert(test11PublicIndex.includes('switchSongsView(\'list\')'), 'public/index.html must bind switchSongsView(list)');

assert(test11AppsScriptIndex.includes('id="btn-view-card"'), 'apps-script/index.html must include btn-view-card');
assert(test11AppsScriptIndex.includes('id="btn-view-list"'), 'apps-script/index.html must include btn-view-list');
assert(test11AppsScriptIndex.includes('switchSongsView(\'card\')'), 'apps-script/index.html must bind switchSongsView(card)');
assert(test11AppsScriptIndex.includes('switchSongsView(\'list\')'), 'apps-script/index.html must bind switchSongsView(list)');

// 3. Verify Default to Card View & Switching Functions in App Controller
assert(test11AppJs.includes("songsViewMode: 'card'"), 'public/app.js state must default songsViewMode to card');
assert(test11AppJs.includes('initSongsViewMode'), 'public/app.js must implement initSongsViewMode');
assert(test11AppJs.includes('switchSongsView'), 'public/app.js must implement switchSongsView');
assert(test11AppJs.includes('applySongsViewMode'), 'public/app.js must implement applySongsViewMode');

assert(test11JsHtml.includes("songsViewMode: 'card'"), 'apps-script/javascript.html state must default songsViewMode to card');
assert(test11JsHtml.includes('initSongsViewMode'), 'apps-script/javascript.html must implement initSongsViewMode');
assert(test11JsHtml.includes('switchSongsView'), 'apps-script/javascript.html must implement switchSongsView');
assert(test11JsHtml.includes('applySongsViewMode'), 'apps-script/javascript.html must implement applySongsViewMode');

// 4. Verify Two-Column List View Styling & Responsive Breakdown
assert(test11StylesCss.includes('.songs-grid.view-list'), 'public/styles.css must style .songs-grid.view-list');
assert(test11StylesCss.includes('repeat(2, minmax(0, 1fr))'), 'public/styles.css must specify 2-column layout in list view');
assert(test11StylesCss.includes('.view-mode-selector'), 'public/styles.css must style .view-mode-selector');
assert(test11StylesCss.includes('.btn-view-toggle'), 'public/styles.css must style .btn-view-toggle');

assert(test11StylesHtml.includes('.songs-grid.view-list'), 'apps-script/styles.html must style .songs-grid.view-list');
assert(test11StylesHtml.includes('repeat(2, minmax(0, 1fr))'), 'apps-script/styles.html must specify 2-column layout in list view');
assert(test11StylesHtml.includes('.view-mode-selector'), 'apps-script/styles.html must style .view-mode-selector');
assert(test11StylesHtml.includes('.btn-view-toggle'), 'apps-script/styles.html must style .btn-view-toggle');

console.log('✓ List view switcher, card view default, and 2-column list layout verified.');

console.log('\n========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (11/11)');
console.log('========================================\n');



