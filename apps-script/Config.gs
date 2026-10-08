/**
 * Central Configuration for Google Sites Song Collection & Lyrics Export Application
 * Section 6, 36, 37
 */
const CONFIG = {
  // Spreadsheet ID: Can be set here or in Script Properties ('SPREADSHEET_ID')
  SPREADSHEET_ID: '1fnXOKgH3jBPabwpod7-kCdZNa30_RD65a-4k4f9-xGw',

  // Sheet names
  SONGS_SHEET: 'Songs',
  COLLECTIONS_SHEET: 'Collections',
  EXPORT_HISTORY_SHEET: 'ExportHistory',

  // Domain restriction settings (Section 6)
  // When REQUIRE_DOMAIN_RESTRICTION is true, only emails ending in @ALLOWED_DOMAIN are permitted
  REQUIRE_DOMAIN_RESTRICTION: false,
  ALLOWED_DOMAIN: 'tirwin.in',

  // Timezone for backend timestamps and formatting (Section 41)
  TIMEZONE: 'Asia/Kolkata',

  // Google Drive folder name for generated export documents (Section 38)
  DRIVE_EXPORT_FOLDER_NAME: 'Song_Library_Exports',

  // Cache duration in seconds for song metadata (Section 43)
  CACHE_DURATION_SECONDS: 300,

  // Lock timeout in milliseconds for concurrent sheet operations (Section 39)
  LOCK_TIMEOUT_MS: 15000,

  // Maximum allowed collection name length
  MAX_COLLECTION_NAME_LENGTH: 100
};

/**
 * Configuration Service providing validated access to sheets and Drive
 */
var ConfigService = {
  /**
   * Retrieves the active Spreadsheet ID, preferring Script Properties over CONFIG constant
   */
  getSpreadsheetId: function() {
    try {
      var scriptProps = PropertiesService.getScriptProperties();
      var idFromProps = scriptProps.getProperty('SPREADSHEET_ID');
      if (idFromProps && idFromProps.trim() !== '') {
        return idFromProps.trim();
      }
    } catch (e) {
      Logger.log('Could not read ScriptProperties: ' + e);
    }
    return CONFIG.SPREADSHEET_ID;
  },

  /**
   * Gets the Spreadsheet instance, either bound or by ID
   */
  getSpreadsheet: function() {
    var id = this.getSpreadsheetId();
    if (id && id !== 'YOUR_SPREADSHEET_ID_HERE') {
      try {
        return SpreadsheetApp.openById(id);
      } catch (e) {
        throw new Error('Unable to open spreadsheet with ID "' + id + '". Please verify permissions and Spreadsheet ID.');
      }
    }
    // Fall back to active spreadsheet if script is container-bound
    try {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active;
    } catch (e) {}

    throw new Error('Spreadsheet ID is not configured. Please set SPREADSHEET_ID in Config.gs or Script Properties.');
  },

  /**
   * Gets or creates the Drive folder for exports
   */
  getExportFolder: function() {
    var folderName = CONFIG.DRIVE_EXPORT_FOLDER_NAME;
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder(folderName);
  },

  /**
   * Checks domain restriction setting
   */
  isDomainRestricted: function() {
    try {
      var props = PropertiesService.getScriptProperties();
      var val = props.getProperty('REQUIRE_DOMAIN_RESTRICTION');
      if (val !== null && val !== undefined) {
        return val === 'true';
      }
    } catch (e) {}
    return CONFIG.REQUIRE_DOMAIN_RESTRICTION;
  },

  /**
   * Gets the allowed domain
   */
  getAllowedDomain: function() {
    try {
      var props = PropertiesService.getScriptProperties();
      var domain = props.getProperty('ALLOWED_DOMAIN');
      if (domain && domain.trim() !== '') {
        return domain.trim().toLowerCase();
      }
    } catch (e) {}
    return (CONFIG.ALLOWED_DOMAIN || '').toLowerCase();
  }
};
