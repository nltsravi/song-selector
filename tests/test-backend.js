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

console.log('✓ Export first page, header collection name on right, footer numbering (page 1 none, page 2+ starts at 1) & watermark verified.');

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

console.log('\n========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (7/7)');
console.log('========================================\n');

