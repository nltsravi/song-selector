/**
 * Script to download the Song List from Google Sheets / Excel
 * and generate structured JSON files for the static SPA.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1fnXOKgH3jBPabwpod7-kCdZNa30_RD65a-4k4f9-xGw';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
const XLSX_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;

const ALLOWED_FETCH_HOSTS = [
  'docs.google.com',
  'drive.google.com'
];

function isTrustedGoogleHost(hostname) {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return (
    ALLOWED_FETCH_HOSTS.includes(host) ||
    host.endsWith('.google.com') ||
    host.endsWith('.googleusercontent.com')
  );
}

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects while fetching Google Sheet.'));
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      return reject(new Error(`Invalid URL: ${url}`));
    }
    if (parsedUrl.protocol !== 'https:') {
      return reject(new Error(`Refusing insecure non-HTTPS URL: ${url}`));
    }
    if (!isTrustedGoogleHost(parsedUrl.hostname)) {
      return reject(new Error(`Refusing untrusted redirect host: ${parsedUrl.hostname}`));
    }

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).toString();
        return fetchUrl(nextUrl, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: Status ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out for ${url}`));
    });
    req.on('error', reject);
  });
}

/**
 * Standard CSV parser handling quotes, commas, and newlines
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && currentRow.some(field => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes tags following TagHelper rules
 */
function normalizeTags(input) {
  if (!input) return '';
  const list = Array.isArray(input) ? input : String(input).split(/[,|]/);
  const seen = new Set();
  const cleaned = [];

  for (let item of list) {
    item = (item || '').trim();
    if (item.length > 0 && item.length <= 50) {
      const lower = item.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        const formatted = item.charAt(0).toUpperCase() + item.slice(1);
        cleaned.push(formatted);
      }
    }
  }
  return cleaned.join(', ');
}

function parseTagsToArray(tagString) {
  if (!tagString) return [];
  return tagString.split(/[,|]/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// Category fallback assignment based on tags/title
function detectCategory(tags, title) {
  const lower = `${tags} ${title}`.toLowerCase();
  if (lower.includes('shiva') || lower.includes('shambho') || lower.includes('linga')) return 'Shiva';
  if (lower.includes('devi') || lower.includes('amman') || lower.includes('ambike') || lower.includes('lalitha') || lower.includes('durga')) return 'Devi';
  if (lower.includes('muruga') || lower.includes('pazhani') || lower.includes('subrahmanya') || lower.includes('kartikeya')) return 'Muruga';
  if (lower.includes('hanuman') || lower.includes('anjaneya')) return 'Hanuman';
  if (lower.includes('rama') || lower.includes('ram')) return 'Rama';
  if (lower.includes('narayana') || lower.includes('krishna') || lower.includes('vishnu') || lower.includes('andaal') || lower.includes('thiruppaavai')) return 'Narayana';
  if (lower.includes('ganesha') || lower.includes('vinayaga') || lower.includes('ganapathi')) return 'Ganesha';
  return 'Devotional';
}

async function main() {
  console.log('Downloading live Songs sheet from Google Sheets...');
  console.log(`URL: ${CSV_URL}`);

  let csvBuffer;
  try {
    csvBuffer = await fetchUrl(CSV_URL);
    console.log(`Successfully downloaded CSV (${csvBuffer.length} bytes).`);
  } catch (err) {
    console.error('Error downloading CSV from Google Sheets:', err.message);
    process.exit(1);
  }

  // Also download XLSX backup if possible
  try {
    const xlsxBuffer = await fetchUrl(XLSX_URL);
    fs.writeFileSync(path.join(__dirname, '../docs/Songs_Live.xlsx'), xlsxBuffer);
    console.log(`Saved Excel backup to docs/Songs_Live.xlsx (${xlsxBuffer.length} bytes).`);
  } catch (e) {
    console.warn('Could not save XLSX backup:', e.message);
  }

  fs.writeFileSync(path.join(__dirname, '../docs/Songs_Live.csv'), csvBuffer);
  console.log('Saved CSV to docs/Songs_Live.csv');

  const csvText = csvBuffer.toString('utf-8');
  const rawRows = parseCSV(csvText);

  if (rawRows.length < 2) {
    console.error('No data found in downloaded CSV.');
    process.exit(1);
  }

  const headers = rawRows[0].map(h => h.trim().toLowerCase());
  console.log(`Found headers: ${headers.join(', ')}`);

  const colMap = {};
  headers.forEach((h, i) => { colMap[h] = i; });

  const songs = [];

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const id = (row[colMap['song id']] || '').trim();
    const rawTitle = (row[colMap['song title']] || '').trim();

    if (!id && !rawTitle) continue;

    let englishTitle = colMap['english title'] !== undefined ? (row[colMap['english title']] || '').trim() : '';
    let tamilTitle = colMap['tamil title'] !== undefined ? (row[colMap['tamil title']] || '').trim() : '';
    let hindiTitle = colMap['hindi title'] !== undefined ? (row[colMap['hindi title']] || '').trim() : '';

    if (!englishTitle && !tamilTitle && rawTitle) {
      const match = rawTitle.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (match) {
        englishTitle = match[1].trim();
        tamilTitle = match[2].trim();
      } else if (/[\u0B80-\u0BFF]/.test(rawTitle)) {
        tamilTitle = rawTitle;
      } else {
        englishTitle = rawTitle;
      }
    }

    let displayTitle = rawTitle;
    if (!displayTitle) {
      if (englishTitle && tamilTitle) {
        displayTitle = `${englishTitle} (${tamilTitle})`;
      } else {
        displayTitle = englishTitle || tamilTitle || id;
      }
    }

    const tamilLyrics = colMap['tamil lyrics'] !== undefined ? (row[colMap['tamil lyrics']] || '').trim() : '';
    const englishLyrics = colMap['english lyrics'] !== undefined ? (row[colMap['english lyrics']] || '').trim() : '';
    const devanagariLyrics = colMap['devanagari lyrics'] !== undefined ? (row[colMap['devanagari lyrics']] || '').trim() : '';

    const rawTags = colMap['tags'] !== undefined ? (row[colMap['tags']] || '').trim() : '';
    const normalizedTags = normalizeTags(rawTags);
    const tagList = parseTagsToArray(normalizedTags);

    let category = colMap['category'] !== undefined ? (row[colMap['category']] || '').trim() : '';
    if (!category) {
      category = detectCategory(normalizedTags, displayTitle);
    }

    const activeVal = colMap['active'] !== undefined ? (row[colMap['active']] || '').trim() : '';
    const isActive = activeVal === '' || activeVal === 'TRUE' || activeVal === 'true' || activeVal === 'Yes' || activeVal === '1';

    const updatedAt = colMap['updated at'] !== undefined ? (row[colMap['updated at']] || '').trim() : '';
    const updatedBy = colMap['updated by'] !== undefined ? (row[colMap['updated by']] || '').trim() : '';

    songs.push({
      id: id || `SID${String(songs.length + 1).padStart(6, '0')}`,
      title: displayTitle,
      englishTitle: englishTitle,
      tamilTitle: tamilTitle,
      hindiTitle: hindiTitle,
      devanagariTitle: hindiTitle,
      tamilLyrics: tamilLyrics,
      englishLyrics: englishLyrics,
      devanagariLyrics: devanagariLyrics,
      hasTamil: tamilLyrics.length > 0,
      hasEnglish: englishLyrics.length > 0,
      hasDevanagari: devanagariLyrics.length > 0,
      tags: normalizedTags,
      tagList: tagList,
      category: category,
      imageUrl: '',
      audioUrl: '',
      videoUrl: '',
      active: isActive,
      updatedAt: updatedAt,
      updatedBy: updatedBy
    });
  }

  console.log(`Parsed ${songs.length} songs successfully.`);

  const jsonContent = JSON.stringify(songs, null, 2);

  // Write to src/songs.json
  const srcPath = path.join(__dirname, '../src/songs.json');
  fs.writeFileSync(srcPath, jsonContent, 'utf-8');
  console.log(`Wrote ${srcPath}`);

  // Write to public/songs.json
  const publicPath = path.join(__dirname, '../public/songs.json');
  fs.writeFileSync(publicPath, jsonContent, 'utf-8');
  console.log(`Wrote ${publicPath}`);

  // Write to public/data/songs.json
  const publicDataPath = path.join(__dirname, '../public/data/songs.json');
  fs.writeFileSync(publicDataPath, jsonContent, 'utf-8');
  console.log(`Wrote ${publicDataPath}`);

  // Write to public/songs-data.js (for offline file:/// and mobile webview support)
  const songsDataJs = `/**\n * Embedded Song Database for Static App & Mobile Offline Mode\n */\nwindow.SONGS_DATABASE = ${jsonContent};\n`;
  const publicJsPath = path.join(__dirname, '../public/songs-data.js');
  fs.writeFileSync(publicJsPath, songsDataJs, 'utf-8');
  console.log(`Wrote ${publicJsPath}`);

  // Also update Auth Configuration from Git Secrets / .env
  try {
    require('./build-auth-config.js');
  } catch (authErr) {
    console.warn('Could not run build-auth-config:', authErr.message);
  }

  console.log('Song list download and JSON generation complete!');
}

main().catch(err => {
  console.error('Fatal error in download-songs:', err);
  process.exit(1);
});
