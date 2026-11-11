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
console.log('\nTest 6: Header Nav, Footer Legal Links, Drive Notice & NeoLumina Copyright');
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
assert(indexHtml.includes('NeoLumina. All rights reserved.'), 'Footer must contain NeoLumina copyright');

// Verify Legal Pages content & NeoLumina branding
const termsContent = fs.readFileSync(termsHtmlPath, 'utf8');
const privacyContent = fs.readFileSync(privacyHtmlPath, 'utf8');
const aboutContent = fs.readFileSync(aboutHtmlPath, 'utf8');
const contactContent = fs.readFileSync(contactHtmlPath, 'utf8');

assert(termsContent.includes('NeoLumina. All rights reserved.'), 'terms.html must contain NeoLumina copyright');
assert(privacyContent.includes('NeoLumina. All rights reserved.'), 'privacy.html must contain NeoLumina copyright');
assert(aboutContent.includes('NeoLumina. All rights reserved.'), 'about.html must contain NeoLumina copyright');
assert(contactContent.includes('NeoLumina. All rights reserved.'), 'contact.html must contain NeoLumina copyright');

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

console.log('✓ Header nav, Footer legal links, Drive notice & NeoLumina copyright verified');

console.log('\n========================================');
console.log('ALL STATIC APP & MOBILE TESTS PASSED! (6/6)');
console.log('========================================');

