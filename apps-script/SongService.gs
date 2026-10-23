/**
 * Song Service and Repository for Google Sites Song Collection & Lyrics Export Application
 * Section 7, 8, 9, 10, 11, 12, 13, 39, 42, 43, 48
 */

var SongService = {
  REQUIRED_HEADERS: [
    'Song ID',
    'Song Title',
    'Tamil Lyrics',
    'English Lyrics',
    'Devanagari Lyrics',
    'Tags',
    'Active'
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

    // Validate required headers (Section 48)
    var missing = [];
    for (var i = 0; i < this.REQUIRED_HEADERS.length; i++) {
      var req = this.REQUIRED_HEADERS[i].toLowerCase();
      if (!map[req]) {
        missing.push(this.REQUIRED_HEADERS[i]);
      }
    }

    if (missing.length > 0) {
      throw new Error('CONFIG_ERROR: Songs sheet is missing required column(s): ' + missing.join(', '));
    }

    return map;
  },

  /**
   * Retrieves all songs from the Google Sheet
   * Uses CacheService to optimize read performance (Section 42, 43)
   */
  getSongs: function(forceRefresh) {
    var cacheKey = 'SONGS_CACHE_LIST';
    var cache = CacheService.getScriptCache();

    if (!forceRefresh) {
      try {
        var cached = cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        Logger.log('Cache read error: ' + e);
      }
    }

    var spreadsheet = ConfigService.getSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.SONGS_SHEET);
    if (!sheet) {
      throw new Error('Sheet "' + CONFIG.SONGS_SHEET + '" was not found in the spreadsheet.');
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return []; // Empty sheet (only headers or blank)
    }

    var headerMap = this.getHeaderMap(sheet);
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    var colId = headerMap['song id'] - 1;
    var colTitle = headerMap['song title'] - 1;
    var colEnglishTitle = headerMap['english title'] ? headerMap['english title'] - 1 : -1;
    var colTamilTitle = headerMap['tamil title'] ? headerMap['tamil title'] - 1 : -1;
    var colHindiTitle = headerMap['hindi title'] ? headerMap['hindi title'] - 1 : (headerMap['devanagari title'] ? headerMap['devanagari title'] - 1 : -1);
    var colTamil = headerMap['tamil lyrics'] - 1;
    var colEnglish = headerMap['english lyrics'] - 1;
    var colDevanagari = headerMap['devanagari lyrics'] - 1;
    var colTags = headerMap['tags'] - 1;
    var colCategory = headerMap['category'] ? headerMap['category'] - 1 : -1;
    var colImageUrl = headerMap['image url'] ? headerMap['image url'] - 1 : (headerMap['image'] ? headerMap['image'] - 1 : -1);
    var colAudioUrl = headerMap['audio url'] ? headerMap['audio url'] - 1 : (headerMap['audio'] ? headerMap['audio'] - 1 : -1);
    var colVideoUrl = headerMap['video url'] ? headerMap['video url'] - 1 : (headerMap['video'] ? headerMap['video'] - 1 : -1);
    var colMediaUrl = headerMap['media url'] ? headerMap['media url'] - 1 : -1;
    var colActive = headerMap['active'] - 1;
    var colUpdatedAt = headerMap['updated at'] ? headerMap['updated at'] - 1 : -1;
    var colUpdatedBy = headerMap['updated by'] ? headerMap['updated by'] - 1 : -1;

    var songs = [];
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var id = (row[colId] || '').toString().trim();
      var rawTitle = (row[colTitle] || '').toString().trim();
      if (!id && !rawTitle) continue;

      var englishTitle = colEnglishTitle >= 0 ? (row[colEnglishTitle] || '').toString().trim() : '';
      var tamilTitle = colTamilTitle >= 0 ? (row[colTamilTitle] || '').toString().trim() : '';
      var hindiTitle = colHindiTitle >= 0 ? (row[colHindiTitle] || '').toString().trim() : '';

      // Graceful extraction from "English Title (Tamil Title)" if columns are blank
      if (!englishTitle && !tamilTitle && rawTitle) {
        var match = rawTitle.match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (match) {
          englishTitle = match[1].trim();
          tamilTitle = match[2].trim();
        } else if (/[\u0B80-\u0BFF]/.test(rawTitle)) {
          tamilTitle = rawTitle;
        } else {
          englishTitle = rawTitle;
        }
      }

      var displayTitle = rawTitle;
      if (!displayTitle) {
        if (englishTitle && tamilTitle) {
          displayTitle = englishTitle + ' (' + tamilTitle + ')';
        } else {
          displayTitle = englishTitle || tamilTitle || id;
        }
      }

      var activeVal = row[colActive];
      var isActive = (activeVal === true || activeVal === 'TRUE' || activeVal === 'true' || activeVal === 'Yes' || activeVal === 1 || activeVal === '' || activeVal === undefined);

      if (!isActive) continue;

      var rawTags = (row[colTags] || '').toString();
      var normalizedTags = TagHelper.normalizeTags(rawTags);
      var tagList = TagHelper.parseTagsToArray(normalizedTags);

      var tamilLyrics = (row[colTamil] || '').toString().trim();
      var englishLyrics = (row[colEnglish] || '').toString().trim();
      var devanagariLyrics = (row[colDevanagari] || '').toString().trim();

      var imageUrl = colImageUrl >= 0 ? (row[colImageUrl] || '').toString().trim() : '';
      var audioUrl = colAudioUrl >= 0 ? (row[colAudioUrl] || '').toString().trim() : '';
      var videoUrl = colVideoUrl >= 0 ? (row[colVideoUrl] || '').toString().trim() : '';
      if (!audioUrl && colMediaUrl >= 0) {
        audioUrl = (row[colMediaUrl] || '').toString().trim();
      }

      songs.push({
        id: id,
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
        category: colCategory >= 0 ? (row[colCategory] || '').toString().trim() : '',
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        videoUrl: videoUrl,
        updatedAt: colUpdatedAt >= 0 ? (row[colUpdatedAt] || '').toString().trim() : '',
        updatedBy: colUpdatedBy >= 0 ? (row[colUpdatedBy] || '').toString().trim() : ''
      });
    }

    try {
      cache.put(cacheKey, JSON.stringify(songs), CONFIG.CACHE_DURATION_SECONDS);
    } catch (e) {
      Logger.log('Cache write error: ' + e);
    }

    return songs;
  },

  /**
   * Retrieves single song by ID
   */
  getSongById: function(songId) {
    var songs = this.getSongs(false);
    for (var i = 0; i < songs.length; i++) {
      if (songs[i].id === songId) {
        return songs[i];
      }
    }
    return null;
  },

  /**
   * Updates tags for a specific song safely using LockService (Section 8, 9, 39, 40)
   */
  updateSongTags: function(songId, newTags) {
    var userEmail = AuthService.requireAuthUserEmail();

    if (!songId || songId.trim() === '') {
      throw new Error('Song ID is required.');
    }
    songId = songId.trim();

    var normalizedTags = TagHelper.normalizeTags(newTags);
    var timestamp = DateHelper.getFormattedTimestamp();

    // Use LockService to prevent race conditions during concurrent tag edits (Section 39)
    var lock = LockService.getScriptLock();
    var hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) {
      throw new Error('System is currently busy updating another record. Please try again.');
    }

    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.SONGS_SHEET);
      if (!sheet) {
        throw new Error('Sheet "' + CONFIG.SONGS_SHEET + '" was not found.');
      }

      var headerMap = this.getHeaderMap(sheet);
      var idColIdx = headerMap['song id'];
      var tagsColIdx = headerMap['tags'];
      var updatedAtColIdx = headerMap['updated at'];
      var updatedByColIdx = headerMap['updated by'];

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        throw new Error('No songs found in the database.');
      }

      var idsRange = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
      var targetRow = -1;

      for (var r = 0; r < idsRange.length; r++) {
        if ((idsRange[r][0] || '').toString().trim() === songId) {
          targetRow = r + 2; // +2 for 1-based indexing and header row offset
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error('Song with ID "' + songId + '" was not found.');
      }

      // Update ONLY the Tags column, Updated At, and Updated By cells (Section 9)
      sheet.getRange(targetRow, tagsColIdx).setValue(normalizedTags);

      if (updatedAtColIdx) {
        sheet.getRange(targetRow, updatedAtColIdx).setValue(timestamp);
      }
      if (updatedByColIdx) {
        sheet.getRange(targetRow, updatedByColIdx).setValue(userEmail);
      }

      // Invalidate cache
      try {
        CacheService.getScriptCache().remove('SONGS_CACHE_LIST');
      } catch (e) {}

      return {
        songId: songId,
        tags: normalizedTags,
        tagList: TagHelper.parseTagsToArray(normalizedTags),
        updatedAt: timestamp,
        updatedBy: userEmail
      };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Updates lyrics, titles, and metadata for a song
   * Strictly records the authenticated user's email into 'Updated By'
   */
  updateSong: function(songId, songData) {
    var userEmail = AuthService.requireAuthUserEmail();

    if (!songId || songId.trim() === '') {
      throw new Error('Song ID is required.');
    }
    songId = songId.trim();

    if (!songData || typeof songData !== 'object') {
      throw new Error('Song data is required.');
    }

    var timestamp = DateHelper.getFormattedTimestamp();

    var lock = LockService.getScriptLock();
    var hasLock = lock.tryLock(CONFIG.LOCK_TIMEOUT_MS);
    if (!hasLock) {
      throw new Error('System is currently busy updating another record. Please try again.');
    }

    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.SONGS_SHEET);
      if (!sheet) {
        throw new Error('Sheet "' + CONFIG.SONGS_SHEET + '" was not found.');
      }

      // Check if English Title or Tamil Title columns need to be added to existing sheet
      var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var colMap = {};
      for (var c = 0; c < headerRow.length; c++) {
        var hName = (headerRow[c] || '').toString().trim().toLowerCase();
        if (hName) colMap[hName] = c + 1;
      }

      if (!colMap['english title'] && colMap['song title']) {
        sheet.insertColumnAfter(colMap['song title']);
        var newColIdx = colMap['song title'] + 1;
        sheet.getRange(1, newColIdx).setValue('English Title');
        sheet.getRange(1, newColIdx).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      }

      headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      colMap = {};
      for (var c2 = 0; c2 < headerRow.length; c2++) {
        var hName2 = (headerRow[c2] || '').toString().trim().toLowerCase();
        if (hName2) colMap[hName2] = c2 + 1;
      }

      if (!colMap['tamil title'] && colMap['english title']) {
        sheet.insertColumnAfter(colMap['english title']);
        var newColIdx2 = colMap['english title'] + 1;
        sheet.getRange(1, newColIdx2).setValue('Tamil Title');
        sheet.getRange(1, newColIdx2).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      }

      headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      colMap = {};
      for (var c3 = 0; c3 < headerRow.length; c3++) {
        var hName3 = (headerRow[c3] || '').toString().trim().toLowerCase();
        if (hName3) colMap[hName3] = c3 + 1;
      }

      if (!colMap['hindi title'] && colMap['tamil title']) {
        sheet.insertColumnAfter(colMap['tamil title']);
        var newColIdx3 = colMap['tamil title'] + 1;
        sheet.getRange(1, newColIdx3).setValue('Hindi Title');
        sheet.getRange(1, newColIdx3).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
      }

      var headerMap = this.getHeaderMap(sheet);
      var idColIdx = headerMap['song id'];
      var titleColIdx = headerMap['song title'];
      var englishTitleColIdx = headerMap['english title'];
      var tamilTitleColIdx = headerMap['tamil title'];
      var hindiTitleColIdx = headerMap['hindi title'] || headerMap['devanagari title'];
      var tamilColIdx = headerMap['tamil lyrics'];
      var englishColIdx = headerMap['english lyrics'];
      var devanagariColIdx = headerMap['devanagari lyrics'];
      var updatedAtColIdx = headerMap['updated at'];
      var updatedByColIdx = headerMap['updated by'];

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        throw new Error('No songs found in the database.');
      }

      var idsRange = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
      var targetRow = -1;

      for (var r = 0; r < idsRange.length; r++) {
        if ((idsRange[r][0] || '').toString().trim() === songId) {
          targetRow = r + 2;
          break;
        }
      }

      if (targetRow === -1) {
        throw new Error('Song with ID "' + songId + '" was not found.');
      }

      var englishTitle = songData.englishTitle !== undefined ? songData.englishTitle.toString().trim() : '';
      var tamilTitle = songData.tamilTitle !== undefined ? songData.tamilTitle.toString().trim() : '';
      var hindiTitle = (songData.hindiTitle !== undefined ? songData.hindiTitle : (songData.devanagariTitle !== undefined ? songData.devanagariTitle : '')).toString().trim();
      var tamilLyrics = songData.tamilLyrics !== undefined ? songData.tamilLyrics.toString().trim() : '';
      var englishLyrics = songData.englishLyrics !== undefined ? songData.englishLyrics.toString().trim() : '';
      var devanagariLyrics = (songData.devanagariLyrics !== undefined ? songData.devanagariLyrics : (songData.hindiLyrics !== undefined ? songData.hindiLyrics : '')).toString().trim();

      var combinedTitle = '';
      if (englishTitle && tamilTitle) {
        combinedTitle = englishTitle + ' (' + tamilTitle + ')';
      } else {
        combinedTitle = englishTitle || tamilTitle || hindiTitle || (songData.title || '').toString().trim();
      }

      if (titleColIdx && combinedTitle) {
        sheet.getRange(targetRow, titleColIdx).setValue(combinedTitle);
      }
      if (englishTitleColIdx && songData.englishTitle !== undefined) {
        sheet.getRange(targetRow, englishTitleColIdx).setValue(englishTitle);
      }
      if (tamilTitleColIdx && songData.tamilTitle !== undefined) {
        sheet.getRange(targetRow, tamilTitleColIdx).setValue(tamilTitle);
      }
      if (hindiTitleColIdx && (songData.hindiTitle !== undefined || songData.devanagariTitle !== undefined)) {
        sheet.getRange(targetRow, hindiTitleColIdx).setValue(hindiTitle);
      }
      if (tamilColIdx && songData.tamilLyrics !== undefined) {
        sheet.getRange(targetRow, tamilColIdx).setValue(tamilLyrics);
      }
      if (englishColIdx && songData.englishLyrics !== undefined) {
        sheet.getRange(targetRow, englishColIdx).setValue(englishLyrics);
      }
      if (devanagariColIdx && (songData.devanagariLyrics !== undefined || songData.hindiLyrics !== undefined)) {
        sheet.getRange(targetRow, devanagariColIdx).setValue(devanagariLyrics);
      }

      // Record Updated At and Updated By
      if (updatedAtColIdx) {
        sheet.getRange(targetRow, updatedAtColIdx).setValue(timestamp);
      }
      if (updatedByColIdx) {
        sheet.getRange(targetRow, updatedByColIdx).setValue(userEmail);
      }

      // Invalidate cache
      try {
        CacheService.getScriptCache().remove('SONGS_CACHE_LIST');
      } catch (e) {}

      return {
        songId: songId,
        id: songId,
        title: combinedTitle,
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
        updatedAt: timestamp,
        updatedBy: userEmail
      };
    } finally {
      lock.releaseLock();
    }
  }
};
