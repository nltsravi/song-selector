/**
 * Utilities for Google Sites Song Collection & Lyrics Export Application
 */

var ResponseHelper = {
  success: function(data) {
    return {
      success: true,
      data: data === undefined ? null : data
    };
  },

  error: function(code, message) {
    return {
      success: false,
      error: {
        code: code || 'UNKNOWN_ERROR',
        message: message || 'An unexpected error occurred.'
      }
    };
  }
};

var DateHelper = {
  /**
   * Formats a date or current time to: '08-Oct-2026 07:32:14 PM IST'
   */
  getFormattedTimestamp: function(date) {
    var d = date || new Date();
    var tz = CONFIG.TIMEZONE;
    // Format: dd-MMM-yyyy hh:mm:ss a z
    return Utilities.formatDate(d, tz, "dd-MMM-yyyy hh:mm:ss a 'IST'");
  },

  /**
   * Formats a date to: '08-Oct-2026'
   */
  getFormattedDate: function(date) {
    var d = date || new Date();
    var tz = CONFIG.TIMEZONE;
    return Utilities.formatDate(d, tz, "dd-MMM-yyyy");
  },

  /**
   * Formats date for IDs: '20261008-193214'
   */
  getIdTimestamp: function(date) {
    var d = date || new Date();
    var tz = CONFIG.TIMEZONE;
    return Utilities.formatDate(d, tz, "yyyyMMdd-HHmmss");
  }
};

var IdHelper = {
  /**
   * Generates a unique backend-generated Collection ID
   * Example: COL-20261008-193214-A7F3
   */
  generateCollectionId: function() {
    var timePart = DateHelper.getIdTimestamp();
    var randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'COL-' + timePart + '-' + randomPart;
  },

  /**
   * Generates a unique backend-generated Export ID
   * Example: EXP-20261008-193214-B2C1
   */
  generateExportId: function() {
    var timePart = DateHelper.getIdTimestamp();
    var randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'EXP-' + timePart + '-' + randomPart;
  }
};

var TagHelper = {
  /**
   * Normalizes tags from string or array into standard comma-separated format
   * Example: " prayer, Morning , prayer " -> "Prayer, Morning"
   */
  normalizeTags: function(input) {
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
          // Capitalize first letter and lowercase rest for clean normalization
          var formatted = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
          cleaned.push(formatted);
        }
      }
    }
    return cleaned.join(', ');
  },

  /**
   * Converts comma-separated tags string to array
   */
  parseTagsToArray: function(tagString) {
    if (!tagString) return [];
    return tagString.split(/[,|]/)
      .map(function(t) { return t.trim(); })
      .filter(function(t) { return t.length > 0; });
  }
};

var SanitizeHelper = {
  /**
   * Sanitizes collection name for safe file export
   * Example: "Morning Worship / Hymns: Vol 1" -> "Morning_Worship_Hymns_Vol_1"
   */
  sanitizeFilename: function(name) {
    if (!name) return 'Collection';
    var clean = name.replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return clean || 'Collection';
  }
};
