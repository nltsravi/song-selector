/**
 * Authentication Service for Google Sites Song Collection & Lyrics Export Application
 * Section 4, 5, 6, 34, 53
 */

var AuthService = {
  /**
   * Retrieves the currently authenticated Google user.
   * Never trusts any email sent from the frontend.
   */
  getCurrentUser: function() {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail();
      if (!email || email.trim() === '') {
        // Fallback check
        email = Session.getEffectiveUser().getEmail();
      }
    } catch (e) {
      Logger.log('Error determining active user: ' + e);
    }

    email = (email || '').trim().toLowerCase();

    if (!email) {
      return {
        isAuthenticated: false,
        email: null,
        domain: null,
        isDomainAllowed: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please sign in with your Google account to access the Song Collection & Lyrics Library.'
        }
      };
    }

    var emailParts = email.split('@');
    var domain = emailParts.length > 1 ? emailParts[1].toLowerCase() : '';

    var isRestricted = ConfigService.isDomainRestricted();
    var allowedDomain = ConfigService.getAllowedDomain();
    var isDomainAllowed = true;
    var hasPendingRequest = false;
    var requestDate = '';

    if (isRestricted && allowedDomain) {
      if (domain === allowedDomain) {
        isDomainAllowed = true;
      } else {
        // Check AccessRequests sheet for individual user approval
        var reqStatus = this.getUserRequestStatus(email);
        if (reqStatus.status === 'APPROVED') {
          isDomainAllowed = true;
        } else {
          isDomainAllowed = false;
          hasPendingRequest = (reqStatus.status === 'PENDING');
          requestDate = reqStatus.requestDate || '';
        }
      }
    } else {
      var reqStatus = this.getUserRequestStatus(email);
      if (reqStatus.status === 'PENDING') {
        hasPendingRequest = true;
        requestDate = reqStatus.requestDate || '';
      }
    }

    if (!isDomainAllowed) {
      return {
        isAuthenticated: true,
        email: email,
        domain: domain,
        isDomainAllowed: false,
        hasPendingRequest: hasPendingRequest,
        requestDate: requestDate,
        allowedDomain: allowedDomain,
        error: {
          code: hasPendingRequest ? 'ACCESS_PENDING' : 'ACCESS_REQUIRED',
          message: hasPendingRequest
            ? 'Your access request for ' + email + ' is currently pending review by the administrator.'
            : 'You need permission to access the Song Collection & Lyrics Library.'
        }
      };
    }

    return {
      isAuthenticated: true,
      email: email,
      domain: domain,
      isDomainAllowed: true,
      hasPendingRequest: false,
      allowedDomain: allowedDomain,
      error: null
    };
  },

  /**
   * Retrieves user access request status from AccessRequests sheet
   */
  getUserRequestStatus: function(email) {
    try {
      var spreadsheet = ConfigService.getSpreadsheet();
      var sheet = spreadsheet.getSheetByName(CONFIG.ACCESS_REQUESTS_SHEET || 'AccessRequests');
      if (!sheet || sheet.getLastRow() <= 1) {
        return { status: 'NONE', requestDate: '' };
      }
      var data = sheet.getDataRange().getValues();
      var normEmail = (email || '').toLowerCase().trim();
      for (var i = 1; i < data.length; i++) {
        var rowEmail = (data[i][1] || '').toString().toLowerCase().trim();
        if (rowEmail === normEmail) {
          var status = (data[i][4] || '').toString().toUpperCase().trim();
          var reqDate = (data[i][2] || '').toString();
          return { status: status, requestDate: reqDate };
        }
      }
    } catch (e) {
      Logger.log('Error checking user request status: ' + e);
    }
    return { status: 'NONE', requestDate: '' };
  },

  /**
   * Submits an access request for the current user
   */
  submitAccessRequest: function(reason) {
    var email = '';
    try {
      email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (e) {}
    email = (email || '').trim().toLowerCase();

    if (!email) {
      throw new Error('Authentication required to submit an access request.');
    }

    var spreadsheet = ConfigService.getSpreadsheet();
    var sheetName = CONFIG.ACCESS_REQUESTS_SHEET || 'AccessRequests';
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      var reqHeaders = [
        'Request ID',
        'Email',
        'Request Date',
        'Request Timestamp',
        'Status',
        'Reason',
        'Reviewed At',
        'Reviewed By'
      ];
      sheet.appendRow(reqHeaders);
      var range = sheet.getRange(1, 1, 1, reqHeaders.length);
      range.setFontWeight('bold');
      range.setBackground('#0f172a');
      range.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    var data = sheet.getDataRange().getValues();
    var existingRow = -1;
    for (var i = 1; i < data.length; i++) {
      if ((data[i][1] || '').toString().trim().toLowerCase() === email) {
        existingRow = i + 1;
        break;
      }
    }

    var requestId = 'REQ-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss');
    var dateStr = DateHelper.getFormattedDate();
    var timestampStr = DateHelper.getFormattedTimestamp();
    var cleanReason = (reason || '').toString().trim();

    if (existingRow > 0) {
      sheet.getRange(existingRow, 3).setValue(dateStr);
      sheet.getRange(existingRow, 4).setValue(timestampStr);
      sheet.getRange(existingRow, 5).setValue('PENDING');
      sheet.getRange(existingRow, 6).setValue(cleanReason);
    } else {
      sheet.appendRow([requestId, email, dateStr, timestampStr, 'PENDING', cleanReason, '', '']);
    }

    // Attempt to notify administrator via email
    try {
      var adminEmail = Session.getEffectiveUser().getEmail();
      if (adminEmail && adminEmail.indexOf('@') !== -1) {
        var subject = '[Song Library] Access Request from ' + email;
        var body = 'Hello Administrator,\n\n' +
          'User ' + email + ' has requested access to the Song Collection & Lyrics Library.\n\n' +
          'Details:\n' +
          '• Email: ' + email + '\n' +
          '• Reason: ' + (cleanReason || 'No reason specified') + '\n' +
          '• Time: ' + timestampStr + '\n\n' +
          'To approve this request, open the spreadsheet and change the Status in the "' + sheetName + '" sheet to APPROVED:\n' +
          spreadsheet.getUrl() + '\n\n' +
          'Thank you.';
        MailApp.sendEmail(adminEmail, subject, body);
      }
    } catch (mailErr) {
      Logger.log('Could not send access request notification email: ' + mailErr);
    }

    return {
      success: true,
      requestId: requestId,
      email: email,
      status: 'PENDING',
      message: 'Access request submitted successfully for ' + email + '.'
    };
  },

  /**
   * Enforces authentication. Throws or returns error if not authenticated or unauthorized.
   * Returns valid user email string.
   */
  requireAuthUserEmail: function() {
    var user = this.getCurrentUser();
    if (!user.isAuthenticated) {
      throw new Error('UNAUTHORIZED: ' + (user.error ? user.error.message : 'Authentication required.'));
    }
    if (!user.isDomainAllowed) {
      throw new Error('FORBIDDEN: ' + (user.error ? user.error.message : 'Domain restriction violation.'));
    }
    return user.email;
  }
};
