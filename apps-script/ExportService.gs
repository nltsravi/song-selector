/**
 * Export Service for Google Sites Song Collection & Lyrics Export Application
 * Section 21, 22, 23, 24, 25, 26, 27, 28, 29, 38
 */

var ExportService = {
  REQUIRED_HISTORY_HEADERS: [
    'Export ID',
    'Collection ID',
    'User Email',
    'Export Date',
    'Export Timestamp',
    'Language',
    'Format',
    'Song Count'
  ],

  /**
   * Helper to retrieve logo image blob from embedded base64 in Logo.gs
   */
  getLogoBlob: function() {
    try {
      if (typeof LOGO_IMAGE_BASE64 !== 'undefined' && LOGO_IMAGE_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_IMAGE_BASE64);
        var mime = (typeof LOGO_IMAGE_MIME !== 'undefined' && LOGO_IMAGE_MIME) ? LOGO_IMAGE_MIME : 'image/jpeg';
        return Utilities.newBlob(bytes, mime, 'omkaar-ssl-logo.jpeg');
      }
    } catch (e) {
      Logger.log('Could not decode logo blob: ' + e);
    }
    return null;
  },

  /**
   * Detects any missing lyrics before export.
   */
  validateLyricsAvailability: function(collectionId, language) {
    var collection = CollectionService.getCollection(collectionId);
    var langKey = (language || '').toLowerCase();

    var missingSongs = [];
    var availableSongs = [];

    for (var i = 0; i < collection.songs.length; i++) {
      var song = collection.songs[i];
      var lyrics = '';

      if (langKey === 'tamil') {
        lyrics = song.tamilLyrics;
      } else if (langKey === 'devanagari') {
        lyrics = song.devanagariLyrics;
      } else {
        // default english
        lyrics = song.englishLyrics;
      }

      if (!lyrics || lyrics.trim() === '') {
        missingSongs.push({
          id: song.id,
          title: song.title
        });
      } else {
        availableSongs.push({
          id: song.id,
          title: song.title,
          lyrics: lyrics.trim()
        });
      }
    }

    return {
      collectionId: collectionId,
      collectionName: collection.name,
      language: language,
      totalSongs: collection.songs.length,
      hasMissingLyrics: missingSongs.length > 0,
      missingSongs: missingSongs,
      availableSongsCount: availableSongs.length
    };
  },

  /**
   * Generates export document (PDF or DOCX) in specified language (Section 21-28)
   */
  exportCollection: function(collectionId, language, format, skipMissing) {
    var userEmail = AuthService.requireAuthUserEmail();
    var collection = CollectionService.getCollection(collectionId);

    var validLang = 'English';
    var lLower = (language || '').toLowerCase();
    if (lLower === 'tamil') validLang = 'Tamil';
    else if (lLower === 'devanagari') validLang = 'Devanagari';

    var validFormat = (format || 'PDF').toUpperCase();
    if (validFormat !== 'DOCX' && validFormat !== 'PDF') {
      validFormat = 'PDF';
    }

    // Validate lyrics (Section 25)
    var validation = this.validateLyricsAvailability(collectionId, validLang);
    if (validation.hasMissingLyrics && !skipMissing) {
      return {
        success: false,
        requiresConfirmation: true,
        validation: validation,
        message: 'Some songs in this collection do not have lyrics in ' + validLang + '.'
      };
    }

    var songsToExport = [];
    for (var i = 0; i < collection.songs.length; i++) {
      var s = collection.songs[i];
      var lyrics = '';
      if (validLang === 'Tamil') lyrics = s.tamilLyrics;
      else if (validLang === 'Devanagari') lyrics = s.devanagariLyrics;
      else lyrics = s.englishLyrics;

      if (lyrics && lyrics.trim() !== '') {
        songsToExport.push({
          id: s.id,
          title: s.title,
          lyrics: lyrics.trim()
        });
      }
    }

    if (songsToExport.length === 0) {
      throw new Error('No songs available with ' + validLang + ' lyrics in this collection.');
    }

    var exportId = IdHelper.generateExportId();
    var sanitizedName = SanitizeHelper.sanitizeFilename(collection.name);
    var extension = (validFormat === 'PDF') ? 'pdf' : 'docx';
    var filename = sanitizedName + '_' + validLang + '.' + extension;

    // Create export document via Google Docs (ensures accurate Unicode typography for Indic scripts)
    var exportFolder = ConfigService.getExportFolder();
    var tempDocName = 'TEMP_' + exportId + '_' + sanitizedName;
    var doc = DocumentApp.create(tempDocName);
    var docFile = DriveApp.getFileById(doc.getId());

    // Move to designated export folder (Section 38)
    docFile.moveTo(exportFolder);

    try {
      // 1. Setup Header with Logo on the right and horizontal rule below
      var header = doc.addHeader();
      header.clear();

      var headerPara = header.appendParagraph('');
      headerPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      headerPara.setSpacingAfter(4);

      var logoBlob = this.getLogoBlob();
      if (logoBlob) {
        try {
          var inlineImg = headerPara.appendInlineImage(logoBlob);
          inlineImg.setWidth(50);
          inlineImg.setHeight(39);
        } catch (imgErr) {
          Logger.log('Error adding logo to header: ' + imgErr);
        }
      }

      // Horizontal line below logo in the header
      header.appendHorizontalRule();

      // 2. Setup Footer with horizontal rule, copyright on left, collection name and page on right
      var footer = doc.addFooter();
      footer.clear();

      // Horizontal line above copyright info and page number
      footer.appendHorizontalRule();

      var footerTable = footer.appendTable([
        ['© omkaarssl ', collection.name + ' | Page 1']
      ]);
      footerTable.setBorderWidth(0);

      try {
        footerTable.setColumnWidth(0, 234);
        footerTable.setColumnWidth(1, 234);

        var cellLeft = footerTable.getCell(0, 0);
        var cellRight = footerTable.getCell(0, 1);

        var pLeft = cellLeft.getChild(0).asParagraph();
        pLeft.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        pLeft.setFontSize(9);
        pLeft.setForegroundColor('#64748b');

        var pRight = cellRight.getChild(0).asParagraph();
        pRight.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        pRight.setFontSize(9);
        pRight.setForegroundColor('#64748b');
      } catch (tableErr) {
        Logger.log('Error formatting footer table: ' + tableErr);
      }

      // 3. Document Body (First page: Collection Name only below header; removed created by, date, count, language)
      var body = doc.getBody();
      body.clear();

      var titlePara = body.appendParagraph(collection.name);
      try {
        if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.TITLE) {
          titlePara.setHeading(DocumentApp.ParagraphHeading.TITLE);
        } else {
          titlePara.setFontSize(22).setBold(true);
        }
      } catch (headingErr) {
        titlePara.setFontSize(22).setBold(true);
      }
      titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      titlePara.setSpacingAfter(12);

      body.appendHorizontalRule();
      body.appendParagraph('');

      // Add each song with preserved order (Section 20, 26, 27)
      for (var sIdx = 0; sIdx < songsToExport.length; sIdx++) {
        var curSong = songsToExport[sIdx];

        var songHeading = body.appendParagraph((sIdx + 1) + '. ' + curSong.title);
        try {
          if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.HEADING2) {
            songHeading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
          } else {
            songHeading.setFontSize(14).setBold(true);
          }
        } catch (hErr) {
          songHeading.setFontSize(14).setBold(true);
        }

        var lyricsPara = body.appendParagraph(curSong.lyrics);
        lyricsPara.setLineSpacing(1.15);

        if (sIdx < songsToExport.length - 1) {
          body.appendHorizontalRule();
          body.appendParagraph('');
        }
      }

      doc.saveAndClose();

      var exportBlob = null;
      var mimeType = '';

      if (validFormat === 'PDF') {
        mimeType = MimeType.PDF;
        exportBlob = docFile.getAs(MimeType.PDF);
        exportBlob.setName(filename);
      } else {
        // DOCX format generation via Drive Doc export URL
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        var exportUrl = 'https://docs.google.com/feeds/download/documents/export/Export?id=' + doc.getId() + '&exportFormat=docx';
        var response = UrlFetchApp.fetch(exportUrl, {
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
          },
          muteHttpExceptions: true
        });

        if (response.getResponseCode() === 200) {
          exportBlob = response.getBlob();
          exportBlob.setName(filename);
          exportBlob.setContentType(mimeType);
        } else {
          // Fallback if UrlFetch is restricted
          exportBlob = docFile.getBlob();
          exportBlob.setName(sanitizedName + '_' + validLang + '.doc');
        }
      }

      // Convert to base64 for direct browser download (bypasses Google Sites iframe cookie limitations)
      var base64Data = Utilities.base64Encode(exportBlob.getBytes());

      // Save a file copy in dedicated export folder for auditing/archiving
      var savedExportFile = exportFolder.createFile(exportBlob);

      // Record export in ExportHistory sheet (Section 29)
      this.recordExportHistory(exportId, collectionId, userEmail, validLang, validFormat, songsToExport.length);

      // Update Collections sheet with last export info
      CollectionService.updateLastExport(collectionId, validFormat, validLang);

      return {
        success: true,
        exportId: exportId,
        filename: filename,
        mimeType: mimeType,
        base64Data: base64Data,
        downloadUrl: savedExportFile.getUrl(),
        songCount: songsToExport.length,
        language: validLang,
        format: validFormat
      };
    } finally {
      // Clean up temporary doc to avoid cluttering Drive (Section 38)
      try {
        docFile.setTrashed(true);
      } catch (cleanupErr) {
        Logger.log('Could not trash temp doc: ' + cleanupErr);
      }
    }
  },

  /**
   * Records export event into ExportHistory sheet (Section 29)
   */
  recordExportHistory: function(exportId, collectionId, userEmail, language, format, songCount) {
    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.EXPORT_HISTORY_SHEET);
      if (!sheet) return;

      var exportDate = DateHelper.getFormattedDate();
      var exportTimestamp = DateHelper.getFormattedTimestamp();

      sheet.appendRow([
        exportId,
        collectionId,
        userEmail,
        exportDate,
        exportTimestamp,
        language,
        format,
        songCount
      ]);
    } catch (e) {
      Logger.log('Failed to log ExportHistory: ' + e);
    }
  }
};
