/**
 * Collection Service and Repository for Google Sites Song Collection & Lyrics Export Application
 * Section 14, 15, 16, 17, 18, 19, 20, 39, 49, 50, 51
 */

var CollectionService = {
  REQUIRED_HEADERS: [
    'Collection ID',
    'Collection Name',
    'User Email',
    'Created Date',
    'Created Timestamp',
    'Song IDs',
    'Song Count'
  ],

  /**
   * Helper to locate header indices dynamically
   */
  getHeaderMap: function(sheet) {
    var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var map = {};
    for (var col = 0; col < headerRow.length; col++) {
      var headerName = (headerRow[col] || '').toString().trim();
      if (headerName) {
        map[headerName.toLowerCase()] = col + 1; // 1-based column index
      }
    }

    var missing = [];
    for (var i = 0; i < this.REQUIRED_HEADERS.length; i++) {
      var req = this.REQUIRED_HEADERS[i].toLowerCase();
      if (!map[req]) {
        missing.push(this.REQUIRED_HEADERS[i]);
      }
    }

    if (missing.length > 0) {
      throw new Error('CONFIG_ERROR: Collections sheet is missing required column(s): ' + missing.join(', '));
    }

    return map;
  },

  /**
   * Creates a new collection for the authenticated user (Section 14, 15, 16, 50, 51)
   */
  createCollection: function(name, songIds) {
    var userEmail = AuthService.requireAuthUserEmail();

    // Data validation (Section 49)
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Collection name is required.');
    }
    var cleanName = name.trim();
    if (cleanName.length > CONFIG.MAX_COLLECTION_NAME_LENGTH) {
      throw new Error('Collection name exceeds maximum length of ' + CONFIG.MAX_COLLECTION_NAME_LENGTH + ' characters.');
    }

    if (!Array.isArray(songIds) || songIds.length === 0) {
      throw new Error('Please select at least one song to create a collection.');
    }

    // Clean & validate song IDs while preserving order (Section 20)
    var cleanSongIds = [];
    var seen = {};
    for (var i = 0; i < songIds.length; i++) {
      var sid = (songIds[i] || '').toString().trim();
      if (sid && !seen[sid]) {
        seen[sid] = true;
        cleanSongIds.push(sid);
      }
    }

    if (cleanSongIds.length === 0) {
      throw new Error('At least one valid song ID must be provided.');
    }

    var collectionId = IdHelper.generateCollectionId();
    var createdDate = DateHelper.getFormattedDate();
    var createdTimestamp = DateHelper.getFormattedTimestamp();
    var songIdsJson = JSON.stringify(cleanSongIds);
    var songCount = cleanSongIds.length;

    var lock = LockService.getScriptLock();
    var hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) {
      throw new Error('System is currently busy. Please try again.');
    }

    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
      if (!sheet) {
        throw new Error('Sheet "' + CONFIG.COLLECTIONS_SHEET + '" was not found.');
      }

      var headerMap = this.getHeaderMap(sheet);
      var maxCol = sheet.getLastColumn();
      var newRow = new Array(maxCol);
      for (var c = 0; c < maxCol; c++) newRow[c] = '';

      newRow[headerMap['collection id'] - 1] = collectionId;
      newRow[headerMap['collection name'] - 1] = cleanName;
      newRow[headerMap['user email'] - 1] = userEmail;
      newRow[headerMap['created date'] - 1] = createdDate;
      newRow[headerMap['created timestamp'] - 1] = createdTimestamp;
      newRow[headerMap['song ids'] - 1] = songIdsJson;
      newRow[headerMap['song count'] - 1] = songCount;

      sheet.appendRow(newRow);

      return {
        collectionId: collectionId,
        name: cleanName,
        userEmail: userEmail,
        createdDate: createdDate,
        createdTimestamp: createdTimestamp,
        songIds: cleanSongIds,
        songCount: songCount
      };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Retrieves all collections belonging strictly to the authenticated user (Section 17, 18)
   */
  getMyCollections: function() {
    var userEmail = AuthService.requireAuthUserEmail();

    var spreadsheet = ConfigService.getSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
    if (!sheet) {
      throw new Error('Sheet "' + CONFIG.COLLECTIONS_SHEET + '" was not found.');
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    var headerMap = this.getHeaderMap(sheet);
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    var colId = headerMap['collection id'] - 1;
    var colName = headerMap['collection name'] - 1;
    var colEmail = headerMap['user email'] - 1;
    var colDate = headerMap['created date'] - 1;
    var colTimestamp = headerMap['created timestamp'] - 1;
    var colSongs = headerMap['song ids'] - 1;
    var colCount = headerMap['song count'] - 1;
    var colLastExport = headerMap['last exported'] ? headerMap['last exported'] - 1 : -1;
    var colExportFmt = headerMap['export format'] ? headerMap['export format'] - 1 : -1;
    var colExportLang = headerMap['export language'] ? headerMap['export language'] - 1 : -1;

    var collections = [];

    // Reverse iterate to present newest collections first (Section 18)
    for (var r = data.length - 1; r >= 0; r--) {
      var row = data[r];
      var ownerEmail = (row[colEmail] || '').toString().trim().toLowerCase();

      // Backend ownership enforcement (Section 17)
      if (ownerEmail !== userEmail) {
        continue;
      }

      var rawSongIds = (row[colSongs] || '').toString().trim();
      var parsedSongIds = [];
      try {
        if (rawSongIds.indexOf('[') === 0) {
          parsedSongIds = JSON.parse(rawSongIds);
        } else if (rawSongIds) {
          parsedSongIds = rawSongIds.split(',').map(function(s) { return s.trim(); });
        }
      } catch (e) {
        parsedSongIds = [];
      }

      collections.push({
        collectionId: (row[colId] || '').toString().trim(),
        name: (row[colName] || '').toString().trim(),
        userEmail: ownerEmail,
        createdDate: (row[colDate] || '').toString().trim(),
        createdTimestamp: (row[colTimestamp] || '').toString().trim(),
        songIds: parsedSongIds,
        songCount: Number(row[colCount]) || parsedSongIds.length,
        lastExported: colLastExport >= 0 ? (row[colLastExport] || '').toString().trim() : '',
        exportFormat: colExportFmt >= 0 ? (row[colExportFmt] || '').toString().trim() : '',
        exportLanguage: colExportLang >= 0 ? (row[colExportLang] || '').toString().trim() : ''
      });
    }

    return collections;
  },

  /**
   * Retrieves a single collection by ID and hydrates with songs in exact preserved order (Section 19, 20)
   */
  getCollection: function(collectionId) {
    var userEmail = AuthService.requireAuthUserEmail();

    if (!collectionId) {
      throw new Error('Collection ID is required.');
    }

    var spreadsheet = ConfigService.getSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
    if (!sheet) {
      throw new Error('Sheet "' + CONFIG.COLLECTIONS_SHEET + '" was not found.');
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      throw new Error('Collection not found.');
    }

    var headerMap = this.getHeaderMap(sheet);
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    var colId = headerMap['collection id'] - 1;
    var colName = headerMap['collection name'] - 1;
    var colEmail = headerMap['user email'] - 1;
    var colDate = headerMap['created date'] - 1;
    var colTimestamp = headerMap['created timestamp'] - 1;
    var colSongs = headerMap['song ids'] - 1;
    var colCount = headerMap['song count'] - 1;

    var found = null;
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      if ((row[colId] || '').toString().trim() === collectionId) {
        var ownerEmail = (row[colEmail] || '').toString().trim().toLowerCase();
        // Ownership verification (Section 17)
        if (ownerEmail !== userEmail) {
          throw new Error('FORBIDDEN: You do not have permission to view this collection.');
        }

        var rawSongIds = (row[colSongs] || '').toString().trim();
        var parsedSongIds = [];
        try {
          if (rawSongIds.indexOf('[') === 0) {
            parsedSongIds = JSON.parse(rawSongIds);
          } else if (rawSongIds) {
            parsedSongIds = rawSongIds.split(',').map(function(s) { return s.trim(); });
          }
        } catch (e) {
          parsedSongIds = [];
        }

        found = {
          collectionId: collectionId,
          name: (row[colName] || '').toString().trim(),
          userEmail: ownerEmail,
          createdDate: (row[colDate] || '').toString().trim(),
          createdTimestamp: (row[colTimestamp] || '').toString().trim(),
          songIds: parsedSongIds,
          songCount: Number(row[colCount]) || parsedSongIds.length
        };
        break;
      }
    }

    if (!found) {
      throw new Error('Collection with ID "' + collectionId + '" was not found.');
    }

    // Hydrate songs preserving exact collection order (Section 19, 20)
    var allSongs = SongService.getSongs(false);
    var songMap = {};
    for (var s = 0; s < allSongs.length; s++) {
      songMap[allSongs[s].id] = allSongs[s];
    }

    var hydratedSongs = [];
    for (var i = 0; i < found.songIds.length; i++) {
      var sid = found.songIds[i];
      if (songMap[sid]) {
        hydratedSongs.push(songMap[sid]);
      } else {
        // Fallback placeholder if a song was removed from library
        hydratedSongs.push({
          id: sid,
          title: 'Unknown Song (' + sid + ')',
          tamilLyrics: '',
          englishLyrics: '',
          devanagariLyrics: '',
          tags: '',
          tagList: []
        });
      }
    }

    found.songs = hydratedSongs;
    return found;
  },

  /**
   * Updates an existing collection (name and/or song list with order) (Section 19)
   */
  updateCollection: function(collectionId, name, songIds) {
    var userEmail = AuthService.requireAuthUserEmail();

    if (!collectionId) throw new Error('Collection ID is required.');
    if (!name || name.trim() === '') throw new Error('Collection name cannot be empty.');
    if (!Array.isArray(songIds) || songIds.length === 0) throw new Error('Collection must contain at least one song.');

    var cleanName = name.trim();
    var cleanSongIds = songIds.map(function(s) { return (s || '').toString().trim(); }).filter(function(s) { return s.length > 0; });
    var songIdsJson = JSON.stringify(cleanSongIds);

    var lock = LockService.getScriptLock();
    var hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) throw new Error('System is busy. Please try again.');

    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
      var headerMap = this.getHeaderMap(sheet);
      var lastRow = sheet.getLastRow();

      var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      var colId = headerMap['collection id'] - 1;
      var colEmail = headerMap['user email'] - 1;
      var colName = headerMap['collection name'];
      var colSongs = headerMap['song ids'];
      var colCount = headerMap['song count'];

      var targetRow = -1;
      for (var r = 0; r < data.length; r++) {
        if ((data[r][colId] || '').toString().trim() === collectionId) {
          var ownerEmail = (data[r][colEmail] || '').toString().trim().toLowerCase();
          if (ownerEmail !== userEmail) {
            throw new Error('FORBIDDEN: You do not have permission to modify this collection.');
          }
          targetRow = r + 2;
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error('Collection not found.');
      }

      sheet.getRange(targetRow, colName).setValue(cleanName);
      sheet.getRange(targetRow, colSongs).setValue(songIdsJson);
      sheet.getRange(targetRow, colCount).setValue(cleanSongIds.length);

      return this.getCollection(collectionId);
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Updates last export metadata on the collection
   */
  updateLastExport: function(collectionId, format, language) {
    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
      var headerMap = this.getHeaderMap(sheet);
      var lastExportCol = headerMap['last exported'];
      var formatCol = headerMap['export format'];
      var langCol = headerMap['export language'];

      if (!lastExportCol) return;

      var lastRow = sheet.getLastRow();
      var ids = sheet.getRange(2, headerMap['collection id'], lastRow - 1, 1).getValues();
      for (var r = 0; r < ids.length; r++) {
        if ((ids[r][0] || '').toString().trim() === collectionId) {
          var rowIdx = r + 2;
          sheet.getRange(rowIdx, lastExportCol).setValue(DateHelper.getFormattedTimestamp());
          if (formatCol) sheet.getRange(rowIdx, formatCol).setValue(format);
          if (langCol) sheet.getRange(rowIdx, langCol).setValue(language);
          break;
        }
      }
    } catch (e) {
      Logger.log('Could not update last export metadata: ' + e);
    }
  }
};
