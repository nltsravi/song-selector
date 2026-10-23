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
   * Header logo: 0.54in x 0.5in, opacity 90%, brightness 20%
   */
  getLogoBlob: function() {
    try {
      if (typeof LOGO_HEADER_BASE64 !== 'undefined' && LOGO_HEADER_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_HEADER_BASE64);
        return Utilities.newBlob(bytes, 'image/png', 'omkaarssl-logo-header.png');
      } else if (typeof LOGO_IMAGE_50_BASE64 !== 'undefined' && LOGO_IMAGE_50_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_IMAGE_50_BASE64);
        return Utilities.newBlob(bytes, 'image/png', 'omkaarssl-logo-header.png');
      } else if (typeof LOGO_IMAGE_BASE64 !== 'undefined' && LOGO_IMAGE_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_IMAGE_BASE64);
        var mime = (typeof LOGO_IMAGE_MIME !== 'undefined' && LOGO_IMAGE_MIME) ? LOGO_IMAGE_MIME : 'image/png';
        return Utilities.newBlob(bytes, mime, 'omkaarssl-logo-header.png');
      }
    } catch (e) {
      Logger.log('Could not decode logo blob: ' + e);
    }
    return null;
  },

  /**
   * Helper to retrieve watermark image blob (very light colour / 7% opacity) from embedded base64 in Logo.gs
   */
  getWatermarkBlob: function() {
    try {
      if (typeof LOGO_IMAGE_WATERMARK_BASE64 !== 'undefined' && LOGO_IMAGE_WATERMARK_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_IMAGE_WATERMARK_BASE64);
        return Utilities.newBlob(bytes, 'image/png', 'omkaarssl-watermark.png');
      } else if (typeof LOGO_IMAGE_BASE64 !== 'undefined' && LOGO_IMAGE_BASE64) {
        var bytes = Utilities.base64Decode(LOGO_IMAGE_BASE64);
        return Utilities.newBlob(bytes, 'image/png', 'omkaarssl-watermark.png');
      }
    } catch (e) {
      Logger.log('Could not decode watermark blob: ' + e);
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

    // Create export document via template (enables Different First Page and Page Numbering starting from 1)
    var exportFolder = ConfigService.getExportFolder();
    var tempDocName = 'TEMP_' + exportId + '_' + sanitizedName;
    var doc = null;
    var docFile = null;
    var templateId = ConfigService.getExportTemplateId();

    if (templateId) {
      try {
        var templateFile = DriveApp.getFileById(templateId);
        docFile = templateFile.makeCopy(tempDocName, exportFolder);
        doc = DocumentApp.openById(docFile.getId());
      } catch (copyErr) {
        Logger.log('Could not copy template, falling back to DocumentApp.create: ' + copyErr);
      }
    }

    if (!doc) {
      doc = DocumentApp.create(tempDocName);
      docFile = DriveApp.getFileById(doc.getId());
      docFile.moveTo(exportFolder);
    }

    try {
      var logoBlob = this.getLogoBlob();
      var watermarkBlob = this.getWatermarkBlob();

      // 0. Setup Document Margins (0.25in = 18pt)
      try {
        var bodyInit = doc.getBody();
        if (bodyInit) {
          bodyInit.setMarginTop(18);
          bodyInit.setMarginBottom(18);
        }
      } catch (marginErr) {
        Logger.log('Could not set initial body margins: ' + marginErr);
      }

      // Update header/footer distance and page margins via Docs API batchUpdate
      try {
        var docsApiUrl = 'https://docs.googleapis.com/v1/documents/' + doc.getId() + ':batchUpdate';
        UrlFetchApp.fetch(docsApiUrl, {
          method: 'post',
          contentType: 'application/json',
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
          },
          payload: JSON.stringify({
            requests: [{
              updateDocumentStyle: {
                documentStyle: {
                  marginHeader: { magnitude: 18, unit: 'PT' }, // 0.25 in
                  marginFooter: { magnitude: 18, unit: 'PT' }, // 0.25 in
                  marginTop: { magnitude: 18, unit: 'PT' },    // 0.25 in
                  marginBottom: { magnitude: 18, unit: 'PT' } // 0.25 in
                },
                fields: 'marginHeader,marginFooter,marginTop,marginBottom'
              }
            }]
          }),
          muteHttpExceptions: true
        });
      } catch (docsApiErr) {
        Logger.log('Could not update document header/footer margins via Docs API: ' + docsApiErr);
      }

      // 1. Setup Header across all pages (both first page header and default header)
      // Header has logo on the left, collection name on the right, horizontal rule below,
      // and centered light watermark across all pages.
      var headers = [];
      try {
        var docParent = doc.getHeader() ? doc.getHeader().getParent() : null;
        if (docParent) {
          for (var hIdx = 0; hIdx < docParent.getNumChildren(); hIdx++) {
            var cEl = docParent.getChild(hIdx);
            if (cEl.getType() === DocumentApp.ElementType.HEADER_SECTION) {
              headers.push(cEl.asHeaderSection());
            }
          }
        }
      } catch (e) {}

      if (headers.length === 0) {
        var h = doc.getHeader() || doc.addHeader();
        headers.push(h);
      }

      for (var hI = 0; hI < headers.length; hI++) {
        var header = headers[hI];
        header.clear();

        var headerPara = header.appendParagraph('');
        headerPara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        headerPara.setSpacingBefore(0);
        headerPara.setSpacingAfter(0);

        // Watermark: Anchored in header so it automatically repeats centered across all pages
        if (watermarkBlob) {
          try {
            var pageWidth = 612;
            var pageHeight = 792;
            var marginLeft = 72;
            try {
              var bodyRef = doc.getBody();
              if (bodyRef) {
                pageWidth = bodyRef.getPageWidth() || 612;
                pageHeight = bodyRef.getPageHeight() || 792;
                marginLeft = bodyRef.getMarginLeft() || 72;
              }
            } catch (dimErr) {}

            var targetWidthPt = pageWidth - (marginLeft * 2); // 468 pt
            var targetHeightPt = Math.round(targetWidthPt / 1.2818); // ~365 pt

            var targetLeftPt = Math.round((pageWidth - targetWidthPt) / 2); // 72 pt
            var targetTopPt = Math.round((pageHeight - targetHeightPt) / 2); // 213.5 pt

            var leftOffsetPt = targetLeftPt - marginLeft; // 0 pt
            var topOffsetPt = targetTopPt - 78;

            var ptToPx = 96 / 72;

            var posImg = headerPara.addPositionedImage(watermarkBlob);
            posImg.setWidth(Math.round(targetWidthPt * ptToPx));
            posImg.setHeight(Math.round(targetHeightPt * ptToPx));
            posImg.setLeftOffset(Math.round(leftOffsetPt * ptToPx));
            posImg.setTopOffset(Math.round(topOffsetPt * ptToPx));
            posImg.setLayout(DocumentApp.PositionedLayout.ABOVE_TEXT);
          } catch (wmErr) {
            Logger.log('Error adding watermark image: ' + wmErr);
          }
        }

        // Header Table: Logo on left, Collection Name on right side
        var headerTable = header.appendTable([
          ['', collection.name]
        ]);
        headerTable.setBorderWidth(0);
        headerTable.setColumnWidth(0, 234);
        headerTable.setColumnWidth(1, 234);

        // Header padding: 0.25in (18pt)
        for (var c = 0; c < 2; c++) {
          try {
            var hCell = headerTable.getCell(0, c);
            hCell.setPaddingTop(18);
            hCell.setPaddingBottom(18);
            hCell.setPaddingLeft(0);
            hCell.setPaddingRight(0);
          } catch (padErr) {}
        }

        if (logoBlob) {
          try {
            var cellLeft = headerTable.getCell(0, 0);
            var pLeft = cellLeft.getChild(0).asParagraph();
            pLeft.setSpacingBefore(0);
            pLeft.setSpacingAfter(0);
            var inlineImg = pLeft.appendInlineImage(logoBlob);
            inlineImg.setWidth(39);
            inlineImg.setHeight(36);
          } catch (imgErr) {
            Logger.log('Error adding logo to header: ' + imgErr);
          }
        }

        var cellRight = headerTable.getCell(0, 1);
        var pRight = cellRight.getChild(0).asParagraph();
        pRight.setSpacingBefore(0);
        pRight.setSpacingAfter(0);
        pRight.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        pRight.setFontSize(9);
        pRight.setForegroundColor('#64748b');

        header.appendHorizontalRule();
      }

      // 2. Setup Footer (If not already configured by template)
      if (!doc.getFooter()) {
        var footer = doc.addFooter();
        footer.clear();
        footer.appendHorizontalRule();
        var footerTable = footer.appendTable([
          ['© OmkaarSSL', '']
        ]);
        footerTable.setBorderWidth(0);
        footerTable.setColumnWidth(0, 234);
        footerTable.setColumnWidth(1, 234);

        // Footer padding: 0.25in (18pt)
        for (var fc = 0; fc < 2; fc++) {
          try {
            var fCell = footerTable.getCell(0, fc);
            fCell.setPaddingTop(18);
            fCell.setPaddingBottom(18);
            fCell.setPaddingLeft(0);
            fCell.setPaddingRight(0);
          } catch (fPadErr) {}
        }

        var fCellLeft = footerTable.getCell(0, 0);
        var fPLeft = fCellLeft.getChild(0).asParagraph();
        fPLeft.setSpacingBefore(0);
        fPLeft.setSpacingAfter(0);
        fPLeft.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        fPLeft.setFontSize(9);
        fPLeft.setForegroundColor('#64748b');
      } else {
        // Adjust padding for footers configured by template
        try {
          var footers = [];
          var docFooterParent = doc.getFooter() ? doc.getFooter().getParent() : null;
          if (docFooterParent) {
            for (var ftIdx = 0; ftIdx < docFooterParent.getNumChildren(); ftIdx++) {
              var fChild = docFooterParent.getChild(ftIdx);
              if (fChild.getType() === DocumentApp.ElementType.FOOTER_SECTION) {
                footers.push(fChild.asFooterSection());
              }
            }
          }
          if (footers.length === 0 && doc.getFooter()) {
            footers.push(doc.getFooter());
          }
          for (var fI = 0; fI < footers.length; fI++) {
            var fSec = footers[fI];
            for (var tIdx = 0; tIdx < fSec.getNumChildren(); tIdx++) {
              var ch = fSec.getChild(tIdx);
              if (ch.getType() === DocumentApp.ElementType.TABLE) {
                var tbl = ch.asTable();
                for (var r = 0; r < tbl.getNumRows(); r++) {
                  var row = tbl.getRow(r);
                  for (var cl = 0; cl < row.getNumCells(); cl++) {
                    row.getCell(cl).setPaddingTop(18);
                    row.getCell(cl).setPaddingBottom(18);
                  }
                }
              }
            }
          }
        } catch (tfErr) {
          Logger.log('Could not update template footer padding: ' + tfErr);
        }
      }

      // 3. Document Body
      var body = doc.getBody();
      body.clear();
      try {
        body.setMarginTop(18);
        body.setMarginBottom(18);
      } catch (bodyMargErr) {
        Logger.log('Could not set body margins: ' + bodyMargErr);
      }

      // First Page: Collection name in the center with increased font size
      for (var sp = 0; sp < 6; sp++) {
        body.appendParagraph('');
      }

      var titlePara = body.appendParagraph(collection.name);
      titlePara.setFontSize(30).setBold(true);
      titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

      // Page break to end first page so songs begin on page 2 (with page number starting at 1)
      body.appendPageBreak();

      // Add each song with preserved order (Section 20, 26, 27)
      for (var sIdx = 0; sIdx < songsToExport.length; sIdx++) {
        var curSong = songsToExport[sIdx];

        // Song title without numbering
        var songHeading = body.appendParagraph(curSong.title);
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
