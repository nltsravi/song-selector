# Song Collection & Lyrics Library

A responsive, Google-native web application embedded inside **Google Sites**, powered by **Google Apps Script** and backed by **Google Sheets**.

---

## Features

- **Google Account Authentication**: Automatic identification of authenticated Google users (`userEmail`) without untrusted client inputs.
- **Configurable Domain Restrictions**: Restrict access to enterprise domains (e.g. `@tirwin.in`) or permit general Google accounts via central configuration.
- **Dynamic Google Sheets Song Database**: Real-time loading from the `Songs` sheet with caching via `CacheService`.
- **Full Multi-Lingual Unicode Support**: Preserves exact Tamil, English, and Devanagari lyrics without automated translation corruption.
- **Client-Side Unicode Search**: Instant search across Song Title, Tags, and Song ID with multi-script awareness.
- **Interactive Tag Management**: Add, remove, and normalize tags with concurrent write safety via `LockService`; preserves `Updated At` and `Updated By` audit trails.
- **Custom Collections & Reordering**: Create named collections with custom song ordering preserved in backend storage.
- **Strict Backend Ownership Isolation**: Users only have visibility and access to their own collections.
- **High-Fidelity PDF & DOCX Export**: Server-side document generation using Google Docs and Drive export for typographic Unicode fidelity.
- **Missing Lyrics Pre-Flight Warnings**: Pre-export validation flagging missing song lyrics with options to continue or cancel.
- **Embedded Google Sites Readiness**: Full viewport adaptability, `ALLOWALL` frame options mode, and zero external backend dependencies.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        Google Site                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     Apps Script Web App (Embedded via iframe URL)     │  │
│  │                                                       │  │
│  │  [Song Library]  [Tag Editor]  [Collections]  [Export]│  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ google.script.run
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Google Apps Script Backend                  │
│                                                             │
│   AuthService ──► ConfigService ──► SongService             │
│        │                                 │                  │
│   ExportService ◄────────────── CollectionService           │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Google Drive API        │ │    Google Sheets Store     │
│   - DocumentApp (DOCX/PDF)   │ │  - Songs                   │
│   - Dedicated Export Folder  │ │  - Collections             │
│   - Base64 Stream & Download │ │  - ExportHistory           │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## Directory Structure

```text
song-selector/
├── apps-script/                 # Production Google Apps Script files
│   ├── appsscript.json          # Manifest with OAuth scopes & execution settings
│   ├── Config.gs                # Central configuration & Script Properties
│   ├── Auth.gs                  # Google Session auth & domain restrictions
│   ├── Utils.gs                 # Formatting, IDs, tags, sanitization
│   ├── SongService.gs           # Sheet reader, search, tag updater with LockService
│   ├── CollectionService.gs     # Collections CRUD, order preservation & ownership
│   ├── ExportService.gs         # PDF & DOCX generation, missing lyrics validation
│   ├── SetupSheet.gs            # One-click sheet structure initializer
│   ├── Code.gs                  # Web App entry point (doGet) & public API handlers
│   ├── index.html               # Main HTML template
│   ├── styles.html              # Modern responsive CSS design system
│   └── javascript.html          # Client application controller
├── docs/                        # Deployment guides & sheet templates
│   ├── DEPLOYMENT_GUIDE.md      # Step-by-step Google Sheets & Sites deployment guide
│   ├── Songs_Template.csv       # Multi-lingual sample song library CSV
│   ├── Collections_Template.csv # Collections sheet structure template
│   └── ExportHistory_Template.csv
├── public/                      # Local standalone simulator & preview app
│   ├── index.html               # Preview testbed with Google Auth mode switcher
│   ├── styles.css               # Extracted CSS design system
│   ├── app.js                   # Client controller
│   └── mock-backend.js          # Local mock API reproducing Apps Script endpoints
├── src/
│   └── sample-songs.json        # 10 realistic sample songs (Tamil, English, Devanagari)
├── tests/
│   └── test-backend.js          # Automated Node.js test suite
└── package.json                 # Dev scripts & configuration
```

---

## Local Development & Testing

You can run and test the complete application locally without deploying to Google Apps Script first:

```bash
# Start local preview server on port 3000
npm run dev

# Run automated tests
npm test
```

Open [http://localhost:3000/index.html](http://localhost:3000/index.html) in your browser.

The top **Google Auth Simulator** bar allows testing:
1. **Logged In (`user@example.com`)**: Full access to song library, collections, and export.
2. **Workspace Domain (`sarah@tirwin.in`)**: Validates domain restriction handling.
3. **Unauthorized Domain (`outsider@otherdomain.com`)**: Displays the "Access Restricted" alert.
4. **Unauthenticated**: Displays the "Sign in required" screen; song data is securely hidden.

---

## Deploying to Google Sites

For complete deployment instructions, see the [`DEPLOYMENT_GUIDE.md`](file:///Users/ravij/AntiGravityProjects/song-selector/docs/DEPLOYMENT_GUIDE.md):

1. **Google Sheet**: Create sheet and run `populateSampleSongsAndStructure()` in Apps Script.
2. **Apps Script**: Copy files from `apps-script/` into your project, configure `SPREADSHEET_ID`, and deploy as Web App (`Execute as: User accessing`, `Who has access: Anyone with Google account`).
3. **Google Sites**: Insert Web App URL via **Insert > Embed > By URL** and publish.

---

## Acceptance Criteria Verification

- [x] **Google login is mandatory**: Unauthenticated users cannot view songs or collections.
- [x] **Authenticated email is detected automatically**: Backend reads `Session.getActiveUser().getEmail()`.
- [x] **Unauthorized users cannot access the application**: Protected by `AuthService.requireAuthUserEmail()`.
- [x] **Optional Workspace-domain restriction works**: Configurable `REQUIRE_DOMAIN_RESTRICTION` and `ALLOWED_DOMAIN`.
- [x] **Songs load dynamically from Google Sheets**: Efficient batch retrieval with header indexing.
- [x] **Song search works**: Instant client search across title, tags, and song ID with full Unicode support (Tamil, English, Hindi).
- [x] **Multiple songs can be selected**: Interactive checkboxes with floating selection action bar.
- [x] **Existing tags are displayed**: Displayed as pills on each card with an inline quick-add trigger.
- [x] **Tags can be added and removed**: Interactive tag editor with duplicate removal and title-casing.
- [x] **Tags saved back to correct row**: Updates ONLY `Tags`, `Updated At`, and `Updated By` via `LockService`.
- [x] **Collections created with metadata**: Backend-generated timestamp in `Asia/Kolkata` and unique ID.
- [x] **Song order preserved**: Custom order stored and exported accurately.
- [x] **Users can only view their own collections**: Strict backend filtering by authenticated email.
- [x] **Multi-language export (Tamil, English, Devanagari)**: Exact Unicode lyrics used for exports.
- [x] **PDF and DOCX generation**: High-fidelity documents generated via Google Docs and Drive export.
- [x] **Missing lyrics warnings**: Pre-flight validation flagging missing songs with opt-in bypass.
- [x] **Responsive design**: Seamless layout on desktop, laptop, tablet, and mobile with touch-friendly controls.