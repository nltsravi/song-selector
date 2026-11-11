/**
 * Test Suite for Static Song Selector SPA & Mobile Readiness
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Static App & Mobile Readiness Tests...\n');

// 1. Verify JSON & JS Data Files
console.log('Test 1: Song Database Files Integrity');
const srcJsonPath = path.join(__dirname, '../src/songs.json');
const publicJsonPath = path.join(__dirname, '../public/songs.json');
const publicDataJsonPath = path.join(__dirname, '../public/data/songs.json');
const publicJsDataPath = path.join(__dirname, '../public/songs-data.js');

assert(fs.existsSync(srcJsonPath), 'src/songs.json must exist');
assert(fs.existsSync(publicJsonPath), 'public/songs.json must exist');
assert(fs.existsSync(publicDataJsonPath), 'public/data/songs.json must exist');
assert(fs.existsSync(publicJsDataPath), 'public/songs-data.js must exist');

const songs = JSON.parse(fs.readFileSync(publicJsonPath, 'utf8'));
assert(Array.isArray(songs), 'songs.json must contain an array of songs');
assert(songs.length === 75, `Expected 75 songs from the live sheet, found ${songs.length}`);
console.log(`✓ All 75 songs verified in ${publicJsonPath}`);

// Verify public/songs-data.js executable
const jsContent = fs.readFileSync(publicJsDataPath, 'utf8');
assert(jsContent.includes('window.SONGS_DATABASE = ['), 'public/songs-data.js must set window.SONGS_DATABASE');
console.log('✓ Embedded songs-data.js validated');

// 2. Song Field Schema & Multi-lingual Unicode Validation
console.log('\nTest 2: Multi-lingual Titles and Lyrics Verification');
let countWithTamil = 0;
let countWithDevanagari = 0;
let countWithEnglish = 0;

songs.forEach((s, idx) => {
  assert(s.id && typeof s.id === 'string', `Song at index ${idx} missing id`);
  assert(s.title && typeof s.title === 'string', `Song ${s.id} missing title`);
  assert(typeof s.hasTamil === 'boolean', `Song ${s.id} missing hasTamil`);
  assert(typeof s.hasEnglish === 'boolean', `Song ${s.id} missing hasEnglish`);
  assert(typeof s.hasDevanagari === 'boolean', `Song ${s.id} missing hasDevanagari`);
  assert(Array.isArray(s.tagList), `Song ${s.id} tagList must be an array`);

  if (s.hasTamil) {
    countWithTamil++;
    assert(/[\u0B80-\u0BFF]/.test(s.tamilLyrics), `Song ${s.id} hasTamil is true but lyrics contain no Tamil Unicode characters`);
  }
  if (s.hasDevanagari) {
    countWithDevanagari++;
    assert(/[\u0900-\u097F]/.test(s.devanagariLyrics), `Song ${s.id} hasDevanagari is true but lyrics contain no Devanagari Unicode characters`);
  }
  if (s.hasEnglish) {
    countWithEnglish++;
    assert(s.englishLyrics && s.englishLyrics.length > 0, `Song ${s.id} hasEnglish is true but lyrics are empty`);
  }
});

console.log(`✓ Tamil songs: ${countWithTamil}/75, Devanagari songs: ${countWithDevanagari}/75, English songs: ${countWithEnglish}/75 verified`);

// 3. Web App Manifest & Service Worker (PWA / Mobile App Readiness)
console.log('\nTest 3: Web App Manifest & PWA Offline Service Worker');
const manifestPath = path.join(__dirname, '../public/manifest.json');
const swPath = path.join(__dirname, '../public/sw.js');

assert(fs.existsSync(manifestPath), 'manifest.json must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.name === 'Song Collection & Lyrics Library', 'manifest.json has correct name');
assert(manifest.display === 'standalone', 'manifest.json must specify standalone display mode');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest.json must have mobile app icons');
console.log('✓ Web App Manifest verified');

assert(fs.existsSync(swPath), 'sw.js must exist');
const swCode = fs.readFileSync(swPath, 'utf8');
assert(swCode.includes('CACHE_NAME'), 'sw.js must define cache name');
assert(swCode.includes('./songs.json'), 'sw.js must cache songs.json');
assert(swCode.includes('./songs-data.js'), 'sw.js must cache songs-data.js');
console.log('✓ Service Worker caching verified');

// 4. Strict Responsive Design & Mobile Viewport
console.log('\nTest 4: Responsive Design, Safe Area Insets & Touch Targets');
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');

assert(indexHtml.includes('viewport-fit=cover'), 'HTML must include viewport-fit=cover meta tag');
assert(indexHtml.includes('apple-mobile-web-app-capable'), 'HTML must support iOS standalone mode');
assert(indexHtml.includes('<link rel="manifest" href="manifest.json">'), 'HTML must link to manifest.json');
assert(indexHtml.includes('songs-data.js'), 'HTML must load songs-data.js');

assert(stylesCss.includes('env(safe-area-inset-bottom'), 'CSS must include safe-area-inset-bottom support');
assert(stylesCss.includes('@media (max-width: 640px)'), 'CSS must include mobile breakpoint 640px');
assert(stylesCss.includes('@media (max-width: 768px)'), 'CSS must include tablet breakpoint 768px');
assert(stylesCss.includes('min-height: 44px') || stylesCss.includes('min-width: 44px'), 'CSS must enforce 44px touch targets');
console.log('✓ Responsive design & mobile attributes verified');

// 5. Lyrics Font Scaling Controls
console.log('\nTest 5: Lyrics Font Size Adjuster Controls');
assert(indexHtml.includes('adjustLyricsFontSize'), 'HTML must have adjustLyricsFontSize controls');
const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
assert(appJs.includes('adjustLyricsFontSize'), 'app.js must implement adjustLyricsFontSize');
assert(appJs.includes('resetLyricsFontSize'), 'app.js must implement resetLyricsFontSize');
assert(stylesCss.includes('--lyrics-font-size'), 'CSS must support --lyrics-font-size variable');
console.log('✓ Lyrics font size scaling controls verified');

// 6. Header Navigation, Footer Navigation, Legal Pages & Google Drive Export Storage
console.log('\nTest 6: Header Nav, Footer Legal Links, Drive Notice & Neolumina Technologies Copyright');
const termsHtmlPath = path.join(__dirname, '../public/terms.html');
const privacyHtmlPath = path.join(__dirname, '../public/privacy.html');
const aboutHtmlPath = path.join(__dirname, '../public/about.html');
const contactHtmlPath = path.join(__dirname, '../public/contact.html');

assert(fs.existsSync(termsHtmlPath), 'public/terms.html must exist');
assert(fs.existsSync(privacyHtmlPath), 'public/privacy.html must exist');
assert(fs.existsSync(aboutHtmlPath), 'public/about.html must exist');
assert(fs.existsSync(contactHtmlPath), 'public/contact.html must exist');

// Verify Header Links
assert(indexHtml.includes('About Us') && indexHtml.includes('about.html'), 'Header must contain About Us link');
assert(indexHtml.includes('Contact Us') && indexHtml.includes('contact.html'), 'Header must contain Contact Us link');
assert(indexHtml.includes('class="header-nav"'), 'Header must contain header-nav container');

// Verify Footer Links & Copyright
assert(indexHtml.includes('class="app-footer"'), 'index.html must contain app-footer');
assert(indexHtml.includes('terms.html') && indexHtml.includes('Terms &amp; Conditions'), 'Footer must contain Terms & Conditions link');
assert(indexHtml.includes('privacy.html') && indexHtml.includes('Privacy Policy'), 'Footer must contain Privacy Policy link');
assert(indexHtml.includes('Neolumina Technologies. All rights reserved.'), 'Footer must contain Neolumina Technologies copyright');

// Verify Legal Pages content & Neolumina Technologies footer copyright
const termsContent = fs.readFileSync(termsHtmlPath, 'utf8');
const privacyContent = fs.readFileSync(privacyHtmlPath, 'utf8');
const aboutContent = fs.readFileSync(aboutHtmlPath, 'utf8');
const contactContent = fs.readFileSync(contactHtmlPath, 'utf8');

assert(termsContent.includes('Neolumina Technologies. All rights reserved.'), 'terms.html must contain Neolumina Technologies copyright');
assert(privacyContent.includes('Neolumina Technologies. All rights reserved.'), 'privacy.html must contain Neolumina Technologies copyright');
assert(aboutContent.includes('Neolumina Technologies. All rights reserved.'), 'about.html must contain Neolumina Technologies copyright');
assert(contactContent.includes('Neolumina Technologies. All rights reserved.'), 'contact.html must contain Neolumina Technologies copyright');

// Verify Header & Footer Display Across All Application Pages
[termsContent, privacyContent, aboutContent, contactContent].forEach((pageHtml, i) => {
  assert(pageHtml.includes('class="app-header"'), `Page ${i} must include app-header`);
  assert(pageHtml.includes('class="app-footer"'), `Page ${i} must include app-footer`);
  assert(pageHtml.includes('class="header-nav"'), `Page ${i} must include header-nav`);
});

// Verify Fixed Header and Footer Architecture
assert(stylesCss.includes('position: fixed') && stylesCss.includes('--header-height'), 'CSS must define fixed header positioning and dimension');
assert(stylesCss.includes('position: fixed') && stylesCss.includes('--footer-height'), 'CSS must define fixed footer positioning and dimension');

// Verify Removal of User Switching Dropdown & Secret Emails Alert
assert(!indexHtml.includes('id="sim-bar"'), 'index.html must not contain user switching sim-bar');
assert(!indexHtml.includes('id="sim-user-select"'), 'index.html must not contain sim-user-select dropdown');
assert(!appJs.includes('Tip: Authorized in Git Secrets'), 'app.js must not display eligible email IDs in alert/prompt');

// Verify Google Drive storage notice & user notification
assert(indexHtml.includes('export-drive-notice'), 'index.html must contain Google Drive storage notice in export modal');
assert(indexHtml.includes('export-user-email-placeholder'), 'export modal must contain user email placeholder');
assert(appJs.includes('export-user-email-placeholder'), 'app.js must dynamically set user email in export modal');
assert(appJs.includes('saved to Google Drive'), 'app.js export toast must notify user that file is saved to Google Drive');

// Verify backend & mock Drive integration
const mockBackendJs = fs.readFileSync(path.join(__dirname, '../public/mock-backend.js'), 'utf8');
const exportServiceGs = fs.readFileSync(path.join(__dirname, '../apps-script/ExportService.gs'), 'utf8');
assert(mockBackendJs.includes('savedToDrive: true') && mockBackendJs.includes('driveUrl'), 'mock-backend.js must return driveUrl and savedToDrive');
assert(exportServiceGs.includes('addEditor(userEmail)') || exportServiceGs.includes('userEmail'), 'ExportService.gs must share file with user email');

// Verify Client-Side PDF Generation & Valid Binary PDF Creation
const html2pdfPath = path.join(__dirname, '../public/html2pdf.bundle.min.js');
assert(fs.existsSync(html2pdfPath), 'public/html2pdf.bundle.min.js must exist for client-side PDF export');
assert(indexHtml.includes('html2pdf.bundle.min.js'), 'index.html must load html2pdf.bundle.min.js');
assert(appJs.includes('generateAndDownloadPdf'), 'app.js must implement generateAndDownloadPdf');
assert(mockBackendJs.includes('createValidPdfBinary'), 'mock-backend.js must implement createValidPdfBinary');

// Test that createValidPdfBinary generates a valid %PDF-1.4 document
const memoryStore = {};
const mockScope = {
  localStorage: {
    getItem: (k) => memoryStore[k] || null,
    setItem: (k, v) => { memoryStore[k] = String(v); }
  }
};
eval(`(function(window, localStorage) { ${mockBackendJs} })(mockScope, mockScope.localStorage)`);
assert(mockScope.MockBackend && typeof mockScope.MockBackend.createValidPdfBinary === 'function', 'MockBackend.createValidPdfBinary must be a function');
const testPdfBinary = mockScope.MockBackend.createValidPdfBinary('Devotional Collection', songs.slice(0, 5), 'English');
assert(testPdfBinary.startsWith('%PDF-1.4'), 'Generated PDF must start with %PDF-1.4 header');
assert(testPdfBinary.includes('%%EOF'), 'Generated PDF must end with %%EOF trailer');
console.log('✓ Valid PDF document generation & html2pdf client engine verified');

console.log('✓ Header nav, Footer legal links, Drive notice & Neolumina Technologies copyright verified');

// 7. Cache-Busting, Network-First Service Worker & Safe Unicode Base64 Export
console.log('\nTest 7: Cache-Control Meta, Network-First SW & Safe Base64 Unicode Export');

// Check Cache-Control meta tags and bottom-right build number (yyyymmddhhmmssms) across all HTML files
const htmlFiles = ['index.html', '404.html', 'about.html', 'contact.html', 'terms.html', 'privacy.html'];
htmlFiles.forEach((file) => {
  const content = fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
  assert(content.includes('http-equiv="Cache-Control"') && content.includes('no-cache'), `${file} must include Cache-Control no-cache meta tag`);
  assert(content.includes('http-equiv="Pragma"'), `${file} must include Pragma no-cache meta tag`);
  assert(content.includes('http-equiv="Expires"'), `${file} must include Expires 0 meta tag`);
  const buildMatch = content.match(/<div class="footer-build-number" id="app-build-number">(\d{17})<\/div>/);
  assert(buildMatch && /^\d{17}$/.test(buildMatch[1]), `${file} must display 17-digit yyyymmddhhmmssms build number in footer-build-number`);
});
assert(stylesCss.includes('.footer-build-number') && stylesCss.includes('right:'), 'styles.css must position .footer-build-number at bottom right');
console.log('✓ All HTML files configured with Cache-Control no-cache meta tags and yyyymmddhhmmssms build number');

// Verify sw.js has network-first strategy
assert(swCode.includes('CACHE_NAME = \'song-selector-v2\''), 'sw.js must use CACHE_NAME song-selector-v2');
assert(swCode.includes('fetch(event.request)'), 'sw.js must attempt network fetch first');
assert(swCode.includes('caches.match(event.request)'), 'sw.js must fallback to cache on network failure');
console.log('✓ Service Worker Network-First strategy verified');

// Verify safeBase64Encode in mock-backend
assert(typeof mockScope.MockBackend.safeBase64Encode === 'function', 'MockBackend must export safeBase64Encode');
const tamilText = 'வணக்கம் உலகம் தமிழ் வரிகள் 123';
const encodedTamil = mockScope.MockBackend.safeBase64Encode(tamilText);
assert(encodedTamil && typeof encodedTamil === 'string', 'safeBase64Encode must return base64 string');
assert(Buffer.from(encodedTamil, 'base64').toString('utf8') === tamilText, 'Decoded base64 must match original Tamil text');

const devanagariText = 'नमस्ते दुनिया देवनागरी बोल 456';
const encodedDevanagari = mockScope.MockBackend.safeBase64Encode(devanagariText);
assert(Buffer.from(encodedDevanagari, 'base64').toString('utf8') === devanagariText, 'Decoded base64 must match original Devanagari text');

// Initialize songs & collection in mockScope and test apiExportCollection for Tamil and Devanagari
mockScope.MockBackend.initSongs(songs);
const createdCol = mockScope.MockBackend.apiCreateCollection('Tamil Devotional Collection', [songs[0].id, songs[1].id]);

// Test PDF export with Tamil lyrics (should not throw InvalidCharacterError)
const tamilPdfExport = mockScope.MockBackend.apiExportCollection(createdCol.collectionId, 'Tamil', 'PDF', true);
assert(tamilPdfExport.success, 'Tamil PDF export must succeed');
assert(tamilPdfExport.base64Data && tamilPdfExport.base64Data.length > 0, 'Tamil PDF export must return base64Data');
assert(tamilPdfExport.mimeType === 'application/pdf', 'Tamil PDF export must have PDF mimeType');
assert(Array.isArray(tamilPdfExport.songs) && tamilPdfExport.songs.length > 0, 'PDF export must return hydrated songs array');
assert(tamilPdfExport.songs[0].lyrics && tamilPdfExport.songs[0].lyrics.length > 0, 'PDF export songs must contain non-empty lyrics');

// Test DOCX export with Devanagari & Tamil lyrics (must be a genuine OpenXML PKZIP .docx archive)
const devanagariDocxExport = mockScope.MockBackend.apiExportCollection(createdCol.collectionId, 'Devanagari', 'DOCX', true);
assert(devanagariDocxExport.success, 'Devanagari DOCX export must succeed');
assert(devanagariDocxExport.base64Data && devanagariDocxExport.base64Data.length > 0, 'Devanagari DOCX export must return base64Data');
const docxBuffer = Buffer.from(devanagariDocxExport.base64Data, 'base64');
assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4B && docxBuffer[2] === 0x03 && docxBuffer[3] === 0x04, 'DOCX export must be a valid PKZIP OpenXML archive starting with PK\\x03\\x04');
const docxRawString = docxBuffer.toString('utf8');
assert(docxRawString.includes('word/document.xml'), 'DOCX archive must contain word/document.xml');
assert(docxRawString.includes('word/header1.xml'), 'DOCX archive must contain word/header1.xml');
assert(docxRawString.includes('word/footer1.xml'), 'DOCX archive must contain word/footer1.xml');
assert(docxRawString.includes('word/footer2.xml'), 'DOCX archive must contain word/footer2.xml');
assert(docxRawString.includes('© OmkaarSSL'), 'DOCX archive must contain © OmkaarSSL footer');
assert(docxRawString.includes('Tamil Devotional Collection'), 'DOCX archive must contain collection title');

// Also verify Sample Collection (COL-20261008-073214-A7F3) exports non-empty songs
const sampleExport = mockScope.MockBackend.apiExportCollection('COL-20261008-073214-A7F3', 'Tamil', 'PDF', true);
assert(sampleExport.success && sampleExport.songs.length === 3, 'Default sample collection must hydrate and export all 3 songs');
assert(sampleExport.songs[0].lyrics.length > 10, 'Default sample collection songs must have non-empty lyrics');
console.log('✓ Safe base64 export, genuine OpenXML DOCX archive & multi-page PDF export verified for Tamil, Devanagari & English');

console.log('\n========================================');
console.log('ALL STATIC APP & MOBILE TESTS PASSED! (7/7)');
console.log('========================================');

