/**
 * Automated Test Suite for Hybrid Mobile App (Android & iOS via Capacitor)
 * Verifies Capacitor configuration, Android & iOS native projects,
 * NativeMobileBridge file export/share integration, and mobile OAuth flow.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Hybrid Mobile App (Android & iOS) Verification Tests...\n');

// 1. Verify capacitor.config.json
console.log('Test 1: Capacitor Configuration & App Metadata');
const capConfigPath = path.join(__dirname, '../capacitor.config.json');
assert(fs.existsSync(capConfigPath), 'capacitor.config.json must exist');

const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
assert.strictEqual(capConfig.appId, 'com.neolumina.songselector', 'App ID must be com.neolumina.songselector');
assert.strictEqual(capConfig.appName, 'Song Collection & Lyrics Library', 'App Name must match');
assert.strictEqual(capConfig.webDir, 'public', 'webDir must point to public/');
assert(capConfig.server && Array.isArray(capConfig.server.allowNavigation), 'allowNavigation must be configured for Google OAuth');
assert(capConfig.server.allowNavigation.includes('accounts.google.com'), 'allowNavigation must permit accounts.google.com');
console.log('✓ capacitor.config.json verified');

// 2. Verify Native Android Project Structure
console.log('\nTest 2: Native Android Project Structure (android/)');
const androidDir = path.join(__dirname, '../android');
const androidManifestPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
const androidBuildGradlePath = path.join(androidDir, 'app/build.gradle');
const androidMainActivityPath = path.join(androidDir, 'app/src/main/java/com/neolumina/songselector/MainActivity.java');
const androidWebAssetsIndex = path.join(androidDir, 'app/src/main/assets/public/index.html');

assert(fs.existsSync(androidDir), 'android/ directory must exist');
assert(fs.existsSync(androidManifestPath), 'AndroidManifest.xml must exist');
const buildGradleCode = fs.readFileSync(androidBuildGradlePath, 'utf8');
assert(buildGradleCode.includes('signingConfigs') && buildGradleCode.includes('release'), 'android/app/build.gradle must configure production release signingConfig for Play Store AAB');
assert(buildGradleCode.includes('upload-keystore.jks'), 'android/app/build.gradle must reference upload-keystore.jks');
assert(fs.existsSync(path.join(androidDir, 'app/upload-keystore.jks')), 'Production upload keystore (android/app/upload-keystore.jks) must exist');
assert(fs.existsSync(androidMainActivityPath), 'Android MainActivity.java must exist');
assert(fs.existsSync(androidWebAssetsIndex), 'Android bundled web assets (index.html) must be synced');

const manifestXml = fs.readFileSync(androidManifestPath, 'utf8');
assert(manifestXml.includes('android.permission.INTERNET'), 'AndroidManifest.xml must include INTERNET permission');
assert(manifestXml.includes('android.permission.ACCESS_NETWORK_STATE'), 'AndroidManifest.xml must include ACCESS_NETWORK_STATE permission');
assert(manifestXml.includes('android:scheme="com.neolumina.songselector"'), 'AndroidManifest.xml must register OAuth deep-link scheme');
console.log('✓ Native Android project, MainActivity, OAuth deep link, and bundled web assets verified');

// 3. Verify Native iOS Project Structure
console.log('\nTest 3: Native iOS Project Structure (ios/)');
const iosDir = path.join(__dirname, '../ios');
const iosInfoPlistPath = path.join(iosDir, 'App/App/Info.plist');
const iosAppDelegatePath = path.join(iosDir, 'App/App/AppDelegate.swift');
const iosXcodeProjPath = path.join(iosDir, 'App/App.xcodeproj/project.pbxproj');
const iosWebAssetsIndex = path.join(iosDir, 'App/App/public/index.html');

assert(fs.existsSync(iosDir), 'ios/ directory must exist');
assert(fs.existsSync(iosInfoPlistPath), 'iOS Info.plist must exist');
assert(fs.existsSync(iosAppDelegatePath), 'iOS AppDelegate.swift must exist');
assert(fs.existsSync(iosXcodeProjPath), 'iOS Xcode project (App.xcodeproj) must exist');
assert(fs.existsSync(iosWebAssetsIndex), 'iOS bundled web assets (index.html) must be synced');

const infoPlist = fs.readFileSync(iosInfoPlistPath, 'utf8');
assert(infoPlist.includes('Song Collection &amp; Lyrics Library') || infoPlist.includes('CFBundleDisplayName'), 'iOS Info.plist must include display name');
assert(infoPlist.includes('UIFileSharingEnabled'), 'iOS Info.plist must enable UIFileSharingEnabled for exported songbooks');
assert(infoPlist.includes('CFBundleURLSchemes'), 'iOS Info.plist must configure CFBundleURLSchemes for OAuth redirect');
console.log('✓ Native iOS Xcode project, AppDelegate.swift, file sharing, and bundled web assets verified');

// 4. Verify NativeMobileBridge (public/capacitor-bridge.js) & Feature Parity
console.log('\nTest 4: Native Mobile Bridge (PDF/DOCX Share Sheet, Back Button, OAuth)');
const bridgePath = path.join(__dirname, '../public/capacitor-bridge.js');
assert(fs.existsSync(bridgePath), 'public/capacitor-bridge.js must exist');

const bridgeCode = fs.readFileSync(bridgePath, 'utf8');
assert(bridgeCode.includes('saveAndShareFile'), 'capacitor-bridge.js must implement saveAndShareFile for PDF/DOCX export');
assert(bridgeCode.includes('Filesystem.writeFile'), 'capacitor-bridge.js must write exported files via Capacitor Filesystem');
assert(bridgeCode.includes('Share.share'), 'capacitor-bridge.js must invoke native Android/iOS Share sheet');
assert(bridgeCode.includes('backButton'), 'capacitor-bridge.js must handle Android hardware back button');
assert(bridgeCode.includes('openMobileGoogleSignInModal'), 'capacitor-bridge.js must provide mobile Google OAuth sign-in modal');

const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const workflowYaml = fs.readFileSync(path.join(__dirname, '../.github/workflows/deploy.yml'), 'utf8');
assert(indexHtml.includes('capacitor-bridge.js'), 'public/index.html must load capacitor-bridge.js');
assert(appJs.includes('NativeMobileBridge.saveAndShareFile'), 'public/app.js must invoke NativeMobileBridge.saveAndShareFile for mobile PDF/DOCX exports');
assert(appJs.includes('NativeMobileBridge.openMobileGoogleSignInModal'), 'public/app.js must support NativeMobileBridge.openMobileGoogleSignInModal');
assert(workflowYaml.includes('bundleRelease'), 'deploy.yml must build the production Play Store AAB (bundleRelease)');
assert(workflowYaml.includes('assembleDebug'), 'deploy.yml must build the Android hybrid APK');
assert(workflowYaml.includes('npx cap copy'), 'deploy.yml must sync web assets to Android and iOS projects');

console.log('✓ Native Mobile Bridge, File Export/Share Sheet, Back Button, Mobile OAuth & CI Build Pipeline verified');

console.log('\n========================================');
console.log('ALL HYBRID MOBILE APP TESTS PASSED! (4/4)');
console.log('========================================');

