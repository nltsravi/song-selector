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

console.log('\n========================================');
console.log('ALL STATIC APP & MOBILE TESTS PASSED! (5/5)');
console.log('========================================');
