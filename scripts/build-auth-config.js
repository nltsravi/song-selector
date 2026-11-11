/**
 * Script to read Authorized Users and Google OAuth Client ID from Git Secrets / Environment
 * and generate public/auth-config.js for the static Single Page Application.
 */

const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.substring(0, eqIdx).trim();
      let val = line.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    }
  });
  return env;
}

function parseEmailList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw)
    .split(/[,;\n\r\t]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0 && e.includes('@'));
}

function main() {
  const envPath = path.join(__dirname, '../.env');
  const fileEnv = parseEnvFile(envPath);

  // 1. Read Google Client ID from Git Secrets / Process Env or .env
  const googleClientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.CLIENT_ID ||
    fileEnv.GOOGLE_CLIENT_ID ||
    fileEnv.CLIENT_ID ||
    ''
  ).trim();

  // 2. Read Authorized Email IDs from Git Variable / Secret (AUTHORIZED_EMAIL_IDS) / Process Env or .env
  const rawEmails = (
    process.env.AUTHORIZED_EMAIL_IDS ||
    process.env.AUTHORIZED_USERS ||
    process.env.AUTHORIZED_EMAILS ||
    process.env.GIT_SECRET_AUTHORIZED_EMAILS ||
    fileEnv.AUTHORIZED_EMAIL_IDS ||
    fileEnv.AUTHORIZED_USERS ||
    fileEnv.AUTHORIZED_EMAILS ||
    fileEnv.GIT_SECRET_AUTHORIZED_EMAILS ||
    'ravijshankar@gmail.com, ravi@neolumina.in, sarah@tirwin.in'
  );

  const rawDomains = (
    process.env.ALLOWED_DOMAIN ||
    process.env.ALLOWED_DOMAINS ||
    fileEnv.ALLOWED_DOMAIN ||
    fileEnv.ALLOWED_DOMAINS ||
    'tirwin.in'
  );

  const authorizedEmails = Array.from(new Set(parseEmailList(rawEmails)));
  const allowedDomains = Array.from(new Set(
    String(rawDomains)
      .split(/[,;\n\r\t]+/)
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0)
  ));

  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const pad3 = (n) => String(n).padStart(3, '0');
  const buildNumber =
    String(now.getFullYear()) +
    pad2(now.getMonth() + 1) +
    pad2(now.getDate()) +
    pad2(now.getHours()) +
    pad2(now.getMinutes()) +
    pad2(now.getSeconds()) +
    pad3(now.getMilliseconds());

  const authConfig = {
    GOOGLE_CLIENT_ID: googleClientId,
    AUTHORIZED_EMAIL_IDS: authorizedEmails.join(', '),
    AUTHORIZED_EMAILS: authorizedEmails,
    ALLOWED_DOMAINS: allowedDomains,
    REQUIRE_AUTHORIZATION: true,
    BUILD_NUMBER: buildNumber,
    GENERATED_AT: now.toISOString()
  };

  const jsContent = `/**
 * Google OAuth 2.0 & Authorized Users Configuration
 * Auto-generated from Git Secret / Environment Variables
 * Run 'node scripts/build-auth-config.js' to update.
 */
window.AUTH_CONFIG = ${JSON.stringify(authConfig, null, 2)};
`;

  const publicJsPath = path.join(__dirname, '../public/auth-config.js');
  fs.writeFileSync(publicJsPath, jsContent, 'utf8');
  console.log(`Wrote ${publicJsPath}`);

  const publicJsonPath = path.join(__dirname, '../public/auth-config.json');
  fs.writeFileSync(publicJsonPath, JSON.stringify(authConfig, null, 2), 'utf8');
  console.log(`Wrote ${publicJsonPath}`);

  // Update footer build number in all public HTML files
  const htmlFiles = ['index.html', '404.html', 'about.html', 'contact.html', 'terms.html', 'privacy.html'];
  htmlFiles.forEach((file) => {
    const filePath = path.join(__dirname, '../public', file);
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      const updated = html.replace(
        /<div class="footer-build-number" id="app-build-number">[^<]*<\/div>/g,
        `<div class="footer-build-number" id="app-build-number">${buildNumber}</div>`
      );
      if (updated !== html) {
        fs.writeFileSync(filePath, updated, 'utf8');
      }
    }
  });

  console.log('Build Number (yyyymmddhhmmssms):', buildNumber);
  console.log('Authorized Users Count:', authorizedEmails.length);
  console.log('Authorized Emails:', authorizedEmails.join(', '));
  console.log('Allowed Domains:', allowedDomains.join(', '));
  console.log('Google Client ID Configured:', googleClientId ? 'Yes' : 'Not configured (Development mode)');
}

main();

