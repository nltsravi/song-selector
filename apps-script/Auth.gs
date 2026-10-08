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

    if (isRestricted && allowedDomain) {
      isDomainAllowed = (domain === allowedDomain);
    }

    if (!isDomainAllowed) {
      return {
        isAuthenticated: true,
        email: email,
        domain: domain,
        isDomainAllowed: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access is restricted to @' + allowedDomain + ' accounts. Your account (' + email + ') is not permitted.'
        }
      };
    }

    return {
      isAuthenticated: true,
      email: email,
      domain: domain,
      isDomainAllowed: true,
      error: null
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
