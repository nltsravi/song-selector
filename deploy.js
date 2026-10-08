#!/usr/bin/env node

/**
 * Google Apps Script Direct Deployment Script
 * Deploys all code in the apps-script/ folder directly to Google Apps Script.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function error(msg) {
  console.error(`${RED}${BOLD}✖ Error:${RESET} ${RED}${msg}${RESET}`);
}

function success(msg) {
  console.log(`${GREEN}${BOLD}✔ Success:${RESET} ${GREEN}${msg}${RESET}`);
}

function info(msg) {
  console.log(`${CYAN}ℹ ${msg}${RESET}`);
}

function warn(msg) {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

// 1. Parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const examplePath = path.join(__dirname, '.env.example');

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      warn('Created .env from .env.example.');
    } else {
      fs.writeFileSync(envPath, 'SCRIPT_ID=\nSPREADSHEET_ID=\nDEPLOYMENT_ID=\n');
      warn('Created blank .env file.');
    }
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });

  return env;
}

// 2. Sync .clasp.json to target the apps-script folder directly
function syncClaspJson(scriptId) {
  const claspJsonPath = path.join(__dirname, '.clasp.json');
  const claspConfig = {
    scriptId: scriptId,
    rootDir: './apps-script'
  };
  fs.writeFileSync(claspJsonPath, JSON.stringify(claspConfig, null, 2) + '\n');
}

// 3. Ensure .claspignore exists
function ensureClaspIgnore() {
  const ignorePath = path.join(__dirname, '.claspignore');
  const ignoreContent = `# Ignore everything except Apps Script source files
**/**
!appsscript.json
!*.gs
!*.html
`;
  fs.writeFileSync(ignorePath, ignoreContent);
}

// 4. Update apps-script/Config.gs with environment values if provided
function syncConfigWithEnv(env) {
  const configPath = path.join(__dirname, 'apps-script', 'Config.gs');
  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, 'utf8');
  let modified = false;

  if (env.SPREADSHEET_ID && env.SPREADSHEET_ID.trim()) {
    const sId = env.SPREADSHEET_ID.trim();
    const regex = /SPREADSHEET_ID:\s*['"][^'"]*['"]/;
    if (regex.test(content)) {
      content = content.replace(regex, `SPREADSHEET_ID: '${sId}'`);
      modified = true;
    }
  }

  if (env.ALLOWED_DOMAIN && env.ALLOWED_DOMAIN.trim()) {
    const domain = env.ALLOWED_DOMAIN.trim();
    const regex = /ALLOWED_DOMAIN:\s*['"][^'"]*['"]/;
    if (regex.test(content)) {
      content = content.replace(regex, `ALLOWED_DOMAIN: '${domain}'`);
      modified = true;
    }
  }

  if (env.REQUIRE_DOMAIN_RESTRICTION !== undefined && env.REQUIRE_DOMAIN_RESTRICTION !== '') {
    const req = env.REQUIRE_DOMAIN_RESTRICTION === 'true';
    const regex = /REQUIRE_DOMAIN_RESTRICTION:\s*(true|false)/;
    if (regex.test(content)) {
      content = content.replace(regex, `REQUIRE_DOMAIN_RESTRICTION: ${req}`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(configPath, content);
    info('Updated apps-script/Config.gs with values from .env.');
  }
}

// 5. Check if user is logged into clasp
function isClaspLoggedIn() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const rcPath = path.join(homeDir, '.clasprc.json');
  return fs.existsSync(rcPath);
}

// 6. Execute clasp command using npx
function runClasp(args) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return spawnSync(npxCmd, ['--yes', '@google/clasp', ...args], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: false
  });
}

function printHelp() {
  console.log(`
${BOLD}Song Collection & Lyrics Library — Apps Script Deployment Tool${RESET}

${BOLD}Usage:${RESET}
  ${CYAN}npm run deploy${RESET}          Push apps-script/ files and deploy new Web App version
  ${CYAN}npm run push${RESET}            Push apps-script/ files directly without creating a new version
  ${CYAN}npm run status${RESET}          Check active deployments and get Web App URL
  ${CYAN}npm run login${RESET}           Authenticate Google account via clasp in browser
  ${CYAN}npm run open${RESET}            Open Google Apps Script editor in your browser
  ${CYAN}node deploy.js pull${RESET}     Pull files from Google Apps Script project into apps-script/
`);
}

function main() {
  const command = (process.argv[2] || 'deploy').toLowerCase();

  if (command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }

  ensureClaspIgnore();

  // If command is login
  if (command === 'login') {
    info('Logging into Google Apps Script...');
    info('A browser window will open for Google authentication.\n');
    const res = runClasp(['login']);
    if (res.status === 0) {
      success('Authentication successful! You can now run "npm run deploy".');
    }
    return;
  }

  // Load .env
  const env = loadEnv();
  const scriptId = env.SCRIPT_ID ? env.SCRIPT_ID.trim() : '';

  if (!scriptId || scriptId === 'your_script_id_here') {
    error('SCRIPT_ID is not configured in your .env file!');
    console.log(`
${BOLD}How to configure your SCRIPT_ID:${RESET}
1. Open your Google Sheet -> ${BOLD}Extensions${RESET} -> ${BOLD}Apps Script${RESET}
2. In the Apps Script editor, click ⚙️ ${BOLD}Project Settings${RESET} on the left sidebar
3. Under "IDs", copy the ${BOLD}Script ID${RESET}
4. Open ${CYAN}.env${RESET} in this project and paste it:
   ${BOLD}SCRIPT_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz...${RESET}
`);
    process.exit(1);
  }

  // Sync .clasp.json to point to apps-script folder
  syncClaspJson(scriptId);

  // Sync Config.gs with .env values
  syncConfigWithEnv(env);

  // Check login
  if (!isClaspLoggedIn()) {
    warn('You are not currently logged in to Google Apps Script via clasp.');
    info('Launching browser login now...\n');
    const loginRes = runClasp(['login']);
    if (loginRes.status !== 0) {
      error('Login failed or was cancelled. Please run "npm run login" and try again.');
      process.exit(1);
    }
  }

  if (command === 'status' || command === 'deployments') {
    info(`Checking deployments for script ID: ${scriptId}`);
    runClasp(['deployments']);
    return;
  }

  if (command === 'open') {
    info(`Opening Apps Script project...`);
    runClasp(['open']);
    return;
  }

  if (command === 'pull') {
    info(`Pulling project files from Apps Script...`);
    runClasp(['pull']);
    return;
  }

  // Step 1: Push code directly from apps-script/
  log(`\n${BOLD}${MAGENTA}==> Step 1: Pushing files from apps-script/ to Apps Script...${RESET}`);
  const pushRes = runClasp(['push', '--force']);

  if (pushRes.status !== 0) {
    error('Failed to push files to Google Apps Script.');
    console.log(`
${YELLOW}${BOLD}Common Fix:${RESET}
If you see ${CYAN}"User has not enabled the Google Apps Script API"${RESET}:
Visit ${BOLD}https://script.google.com/home/usersettings${RESET} in your browser and switch
${BOLD}"Google Apps Script API"${RESET} to ${GREEN}ON${RESET}, then run this command again.
`);
    process.exit(1);
  }

  success('Files in apps-script/ pushed successfully!');

  // If command is push only, stop here
  if (command === 'push') {
    log(`\n${GREEN}${BOLD}✔ Done! Code is updated in the Apps Script project.${RESET}\n`);
    return;
  }

  // Step 2: Deploy Web App version
  const now = new Date();
  log(`\n${BOLD}${MAGENTA}==> Step 2: Deploying Web App...${RESET}`);
  const desc = (env.DEPLOYMENT_DESC ? `${env.DEPLOYMENT_DESC} at ${now.toLocaleString()}` : `Deployed at ${now.toLocaleString()}`);
  const deployArgs = ['deploy', '-d', desc];

  if (env.DEPLOYMENT_ID && env.DEPLOYMENT_ID.trim()) {
    info(`Updating existing deployment ID: ${env.DEPLOYMENT_ID.trim()}`);
    deployArgs.push('-i', env.DEPLOYMENT_ID.trim());
  }

  const deployRes = runClasp(deployArgs);

  if (deployRes.status !== 0) {
    warn('Deploy command encountered an issue. Checking active deployments...');
    runClasp(['deployments']);
  } else {
    success('Web App deployment complete!');
  }

  log(`\n${BOLD}${CYAN}==> Active Deployments & Web App URLs:${RESET}`);
  runClasp(['deployments']);

  log(`\n${GREEN}${BOLD}✔ Deployment finished successfully!${RESET}\n`);
}

main();
