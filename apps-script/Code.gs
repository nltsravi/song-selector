/**
 * Main Controller and API Gateway for Google Sites Song Collection & Lyrics Export Application
 * Section 2, 3, 35, 52, 54, 56
 */

/**
 * Entry point for Google Apps Script Web App
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');

  // Pre-load user state so client knows authentication immediately
  var currentUser = AuthService.getCurrentUser();
  template.initialUser = currentUser;

  var output = template.evaluate();
  output.setTitle('Song Collection & Lyrics Library');

  // Critical for Google Sites embedding (Section 54)
  output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');

  return output;
}

/**
 * Helper to include partial HTML files (styles, scripts)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ==========================================================================
   PUBLIC API ENDPOINTS (Invoked via google.script.run)
   ========================================================================== */

/**
 * Retrieves authenticated user information (Section 4, 5, 6)
 */
function apiGetCurrentUser() {
  try {
    var user = AuthService.getCurrentUser();
    return ResponseHelper.success(user);
  } catch (err) {
    Logger.log('apiGetCurrentUser error: ' + err);
    return ResponseHelper.error('AUTH_ERROR', err.message);
  }
}

/**
 * Loads songs dynamically from Google Sheets (Section 10, 42, 43)
 */
function apiGetSongs() {
  try {
    AuthService.requireAuthUserEmail();
    var songs = SongService.getSongs(false);
    return ResponseHelper.success(songs);
  } catch (err) {
    Logger.log('apiGetSongs error: ' + err);
    return ResponseHelper.error('SHEET_ERROR', err.message);
  }
}

/**
 * Loads a single song by ID (Section 13)
 */
function apiGetSong(songId) {
  try {
    AuthService.requireAuthUserEmail();
    var song = SongService.getSongById(songId);
    if (!song) {
      return ResponseHelper.error('NOT_FOUND', 'Song not found.');
    }
    return ResponseHelper.success(song);
  } catch (err) {
    Logger.log('apiGetSong error: ' + err);
    return ResponseHelper.error('ERROR', err.message);
  }
}

/**
 * Updates tags for a song in Google Sheets (Section 8, 9, 39, 40)
 */
function apiUpdateSongTags(songId, tags) {
  try {
    var result = SongService.updateSongTags(songId, tags);
    return ResponseHelper.success(result);
  } catch (err) {
    Logger.log('apiUpdateSongTags error: ' + err);
    return ResponseHelper.error('TAG_UPDATE_ERROR', err.message);
  }
}

/**
 * Creates a new named collection (Section 14, 15, 16, 50, 51)
 */
function apiCreateCollection(name, songIds) {
  try {
    var result = CollectionService.createCollection(name, songIds);
    return ResponseHelper.success(result);
  } catch (err) {
    Logger.log('apiCreateCollection error: ' + err);
    return ResponseHelper.error('COLLECTION_CREATE_ERROR', err.message);
  }
}

/**
 * Retrieves current user's collections (Section 17, 18)
 */
function apiGetMyCollections() {
  try {
    var collections = CollectionService.getMyCollections();
    return ResponseHelper.success(collections);
  } catch (err) {
    Logger.log('apiGetMyCollections error: ' + err);
    return ResponseHelper.error('COLLECTIONS_ERROR', err.message);
  }
}

/**
 * Retrieves a single collection hydrated with songs (Section 19, 20)
 */
function apiGetCollection(collectionId) {
  try {
    var collection = CollectionService.getCollection(collectionId);
    return ResponseHelper.success(collection);
  } catch (err) {
    Logger.log('apiGetCollection error: ' + err);
    return ResponseHelper.error('COLLECTION_ERROR', err.message);
  }
}

/**
 * Updates a collection's name or songs (Section 19)
 */
function apiUpdateCollection(collectionId, name, songIds) {
  try {
    var updated = CollectionService.updateCollection(collectionId, name, songIds);
    return ResponseHelper.success(updated);
  } catch (err) {
    Logger.log('apiUpdateCollection error: ' + err);
    return ResponseHelper.error('UPDATE_ERROR', err.message);
  }
}

/**
 * Pre-export check for missing lyrics (Section 25)
 */
function apiValidateExport(collectionId, language) {
  try {
    AuthService.requireAuthUserEmail();
    var validation = ExportService.validateLyricsAvailability(collectionId, language);
    return ResponseHelper.success(validation);
  } catch (err) {
    Logger.log('apiValidateExport error: ' + err);
    return ResponseHelper.error('VALIDATION_ERROR', err.message);
  }
}

/**
 * Exports collection to PDF or DOCX (Section 21 - 28)
 */
function apiExportCollection(collectionId, language, format, skipMissing) {
  try {
    var result = ExportService.exportCollection(collectionId, language, format, skipMissing);
    return ResponseHelper.success(result);
  } catch (err) {
    Logger.log('apiExportCollection error: ' + err);
    return ResponseHelper.error('EXPORT_ERROR', err.message);
  }
}

/**
 * Helper to bootstrap or format the spreadsheet sheets with correct headers (Section 48, 56)
 */
function apiSetupSheetStructure() {
  try {
    var spreadsheet = ConfigService.getSpreadsheet();

    // 1. Songs sheet
    var songsSheet = spreadsheet.getSheetByName(CONFIG.SONGS_SHEET);
    if (!songsSheet) {
      songsSheet = spreadsheet.insertSheet(CONFIG.SONGS_SHEET);
    }
    if (songsSheet.getLastRow() === 0) {
      songsSheet.appendRow([
        'Song ID',
        'Song Title',
        'Tamil Lyrics',
        'English Lyrics',
        'Devanagari Lyrics',
        'Tags',
        'Category',
        'Active',
        'Updated At',
        'Updated By'
      ]);
      var songHeaderRange = songsSheet.getRange(1, 1, 1, 10);
      songHeaderRange.setFontWeight('bold');
      songHeaderRange.setBackground('#1e293b');
      songHeaderRange.setFontColor('#ffffff');
      songsSheet.setFrozenRows(1);
    }

    // 2. Collections sheet
    var collSheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
    if (!collSheet) {
      collSheet = spreadsheet.insertSheet(CONFIG.COLLECTIONS_SHEET);
    }
    if (collSheet.getLastRow() === 0) {
      collSheet.appendRow([
        'Collection ID',
        'Collection Name',
        'User Email',
        'Created Date',
        'Created Timestamp',
        'Song IDs',
        'Song Count',
        'Last Exported',
        'Export Format',
        'Export Language'
      ]);
      var collHeaderRange = collSheet.getRange(1, 1, 1, 10);
      collHeaderRange.setFontWeight('bold');
      collHeaderRange.setBackground('#1e293b');
      collHeaderRange.setFontColor('#ffffff');
      collSheet.setFrozenRows(1);
    }

    // 3. Export History sheet
    var histSheet = spreadsheet.getSheetByName(CONFIG.EXPORT_HISTORY_SHEET);
    if (!histSheet) {
      histSheet = spreadsheet.insertSheet(CONFIG.EXPORT_HISTORY_SHEET);
    }
    if (histSheet.getLastRow() === 0) {
      histSheet.appendRow([
        'Export ID',
        'Collection ID',
        'User Email',
        'Export Date',
        'Export Timestamp',
        'Language',
        'Format',
        'Song Count'
      ]);
      var histHeaderRange = histSheet.getRange(1, 1, 1, 8);
      histHeaderRange.setFontWeight('bold');
      histHeaderRange.setBackground('#1e293b');
      histHeaderRange.setFontColor('#ffffff');
      histSheet.setFrozenRows(1);
    }

    return ResponseHelper.success({ message: 'Sheets initialized successfully.' });
  } catch (err) {
    Logger.log('apiSetupSheetStructure error: ' + err);
    return ResponseHelper.error('SETUP_ERROR', err.message);
  }
}
