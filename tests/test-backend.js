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

console.log('\n========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (5/5)');
console.log('========================================\n');
