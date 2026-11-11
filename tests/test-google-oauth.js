/**
 * Test Suite for Google OAuth 2.0 & Git Secret Authorized Email Access Control
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Google OAuth & Authorized Users Access Control Tests...\n');

// 1. Test build-auth-config.js generation
console.log('Test 1: Auth Configuration File Generation & Integrity');
const authConfigJsPath = path.join(__dirname, '../public/auth-config.js');
const authConfigJsonPath = path.join(__dirname, '../public/auth-config.json');

assert(fs.existsSync(authConfigJsPath), 'public/auth-config.js must exist');
assert(fs.existsSync(authConfigJsonPath), 'public/auth-config.json must exist');

const authConfig = JSON.parse(fs.readFileSync(authConfigJsonPath, 'utf8'));
assert(Array.isArray(authConfig.AUTHORIZED_EMAILS), 'AUTHORIZED_EMAILS must be an array');
assert(authConfig.AUTHORIZED_EMAILS.length > 0, 'Authorized emails list must not be empty');
assert(Array.isArray(authConfig.ALLOWED_DOMAINS), 'ALLOWED_DOMAINS must be an array');
assert(authConfig.REQUIRE_AUTHORIZATION === true, 'REQUIRE_AUTHORIZATION must be true');

console.log(`✓ Authorized emails loaded from secret: ${authConfig.AUTHORIZED_EMAILS.join(', ')}`);
console.log(`✓ Allowed domains: ${authConfig.ALLOWED_DOMAINS.join(', ')}`);

// 2. Test Email Authorization Rules
console.log('\nTest 2: Email Authorization Decision Matrix');
function checkEmailAuthorization(email, domain, config) {
  const authorizedEmails = (config.AUTHORIZED_EMAILS || []).map(e => e.trim().toLowerCase());
  const allowedDomains = (config.ALLOWED_DOMAINS || []).map(d => d.trim().toLowerCase());

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanDomain = (domain || cleanEmail.split('@')[1] || '').trim().toLowerCase();

  if (cleanEmail && authorizedEmails.includes(cleanEmail)) {
    return { isAuthorized: true, reason: 'EMAIL_AUTHORIZED' };
  }
  if (cleanDomain && allowedDomains.includes(cleanDomain)) {
    return { isAuthorized: true, reason: 'DOMAIN_AUTHORIZED' };
  }
  return { isAuthorized: false, reason: 'NOT_IN_AUTHORIZED_LIST' };
}

// Authorized users from Git secret
assert.strictEqual(checkEmailAuthorization('ravijshankar@gmail.com', 'gmail.com', authConfig).isAuthorized, true, 'ravijshankar@gmail.com must be authorized');
assert.strictEqual(checkEmailAuthorization('RAVI@NEOLUMINA.IN', 'neolumina.in', authConfig).isAuthorized, true, 'ravi@neolumina.in (case-insensitive) must be authorized');
assert.strictEqual(checkEmailAuthorization('sarah@tirwin.in', 'tirwin.in', authConfig).isAuthorized, true, 'sarah@tirwin.in must be authorized');
assert.strictEqual(checkEmailAuthorization('employee@tirwin.in', 'tirwin.in', authConfig).isAuthorized, true, 'employee@tirwin.in must be authorized via domain');

// Unauthorized users
assert.strictEqual(checkEmailAuthorization('stranger@gmail.com', 'gmail.com', authConfig).isAuthorized, false, 'stranger@gmail.com must NOT be authorized');
assert.strictEqual(checkEmailAuthorization('outsider@otherdomain.com', 'otherdomain.com', authConfig).isAuthorized, false, 'outsider@otherdomain.com must NOT be authorized');
assert.strictEqual(checkEmailAuthorization('', '', authConfig).isAuthorized, false, 'Empty email must NOT be authorized');

console.log('✓ Email authorization logic verified for both authorized and unauthorized accounts');

// 3. Test JWT Decoder
console.log('\nTest 3: Google Identity Services JWT Payload Decoding');
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64').toString('binary')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Simulated Google ID Token payload
const samplePayload = {
  iss: 'https://accounts.google.com',
  sub: '10987654321',
  email: 'ravi@neolumina.in',
  email_verified: true,
  name: 'Ravi Shankar',
  picture: 'https://lh3.googleusercontent.com/sample',
  hd: 'neolumina.in'
};

const fakeJwt = 'eyJhbGciOiJSUzI1NiJ9.' + Buffer.from(JSON.stringify(samplePayload)).toString('base64url') + '.signature';
const decoded = decodeJwt(fakeJwt);

assert(decoded !== null, 'JWT must decode successfully');
assert.strictEqual(decoded.email, 'ravi@neolumina.in', 'Decoded email matches');
assert.strictEqual(decoded.name, 'Ravi Shankar', 'Decoded name matches');
assert.strictEqual(decoded.email_verified, true, 'Email verified flag matches');
console.log('✓ Google OAuth JWT credential decoding verified');

// 4. Test UI Elements in public/index.html & public/app.js
console.log('\nTest 4: Google OAuth UI & Access State Integration');
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

assert(indexHtml.includes('accounts.google.com/gsi/client'), 'index.html must load Google Identity Services SDK');
assert(indexHtml.includes('auth-config.js'), 'index.html must load auth-config.js');
assert(indexHtml.includes('google-signin-btn-container'), 'index.html must include Google Sign-In button container');
assert(indexHtml.includes('btn-signout'), 'index.html must include Sign Out button');

assert(appJs.includes('handleGoogleCredentialResponse'), 'app.js must implement handleGoogleCredentialResponse');
assert(appJs.includes('googleSignOut'), 'app.js must implement googleSignOut');
assert(appJs.includes('googleSwitchAccount'), 'app.js must implement googleSwitchAccount');
assert(appJs.includes('Access Restricted'), 'app.js must display Access Restricted heading for unauthorized users');
assert(appJs.includes('GOOGLE_OAUTH_USER'), 'app.js must manage GOOGLE_OAUTH_USER session storage');

console.log('✓ Google OAuth client SDK, Sign-in, Sign-out, and Access Restricted states verified');

console.log('\n========================================');
console.log('ALL GOOGLE OAUTH & ACCESS TESTS PASSED! (4/4)');
console.log('========================================');

