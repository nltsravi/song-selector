# Google Sites Song Collection & Lyrics Library - Deployment Guide

This guide walks you through setting up, deploying, and embedding the **Song Collection & Lyrics Library** into **Google Sites** using **Google Apps Script** and **Google Sheets**.

---

## 1. Google Spreadsheet Setup

### Step 1.1: Create a new Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new).
2. Name the spreadsheet: **Song Database & Collections**.
3. Note the **Spreadsheet ID** from the URL:
   ```text
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

### Step 1.2: Prepare Sheet Structure & Sample Data
You can set up the sheets either automatically (via Apps Script) or manually via CSV:

#### Option A: One-Click Automatic Setup (Recommended)
1. Open **Extensions > Apps Script** from the Google Sheet.
2. Paste the provided backend code (detailed in Step 2).
3. In the function dropdown, select `populateSampleSongsAndStructure` and click **Run**.
4. Grant the initial execution permissions.
5. The script will automatically create, format, and populate:
   - **`Songs`** (with 10 multi-lingual songs in Tamil, English, and Devanagari)
   - **`Collections`** (with metadata headers and frozen rows)
   - **`ExportHistory`** (with audit columns)

#### Option B: Manual CSV Import
You can import the CSV templates provided in `docs/`:
- [`Songs_Template.csv`](file:///Users/ravij/AntiGravityProjects/song-selector/docs/Songs_Template.csv)
- [`Collections_Template.csv`](file:///Users/ravij/AntiGravityProjects/song-selector/docs/Collections_Template.csv)
- [`ExportHistory_Template.csv`](file:///Users/ravij/AntiGravityProjects/song-selector/docs/ExportHistory_Template.csv)

### Step 1.3: Required Sheet Columns Reference

#### `Songs` Sheet
| Column | Header | Description |
|:---|:---|:---|
| A | **Song ID** | Unique song identifier (e.g., `S001`) |
| B | **Song Title** | Title in English / native script |
| C | **Tamil Lyrics** | Exact Tamil Unicode text (தமிழ் வரிகள்) |
| D | **English Lyrics** | Exact English lyrics |
| E | **Devanagari Lyrics**| Exact Devanagari Unicode text (हिन्दी गीत) |
| F | **Tags** | Comma-separated normalized tags (e.g., `Prayer, Morning`) |
| G | **Category** | Song category (e.g., `Worship`, `Prayer`) |
| H | **Active** | `TRUE` to display in library, `FALSE` to hide |
| I | **Updated At** | Timestamp of last tag update |
| J | **Updated By** | Authenticated user email of last tag editor |

#### `Collections` Sheet
| Column | Header | Description |
|:---|:---|:---|
| A | **Collection ID** | Backend-generated ID (e.g. `COL-20261008-073214-A7F3`) |
| B | **Collection Name** | User-defined collection title |
| C | **User Email** | Authenticated creator Google email (backend enforced) |
| D | **Created Date** | Formatted date (e.g. `08-Oct-2026`) |
| E | **Created Timestamp** | Timestamp in Asia/Kolkata timezone |
| F | **Song IDs** | Ordered JSON array of song IDs (e.g. `["S001","S002"]`) |
| G | **Song Count** | Number of songs in collection |
| H | **Last Exported** | Timestamp of most recent export |
| I | **Export Format** | `PDF` or `DOCX` |
| J | **Export Language** | `Tamil`, `English`, or `Devanagari` |

#### `ExportHistory` Sheet
| Column | Header | Description |
|:---|:---|:---|
| A | **Export ID** | Backend-generated audit ID (`EXP-...`) |
| B | **Collection ID** | Reference to collection |
| C | **User Email** | Authenticated user who performed the export |
| D | **Export Date** | Date of export |
| E | **Export Timestamp**| Timestamp of export |
| F | **Language** | Exported lyrics language |
| G | **Format** | Document format (`PDF` / `DOCX`) |
| H | **Song Count** | Number of songs exported |

---

## 2. Google Apps Script Deployment

### Step 2.1: Open Apps Script Project
In your Google Sheet, click **Extensions > Apps Script** (or create a standalone Apps Script project at [script.google.com](https://script.google.com)).

### Step 2.2: Add Files
Add the following files from the `apps-script/` folder into your Apps Script project:

1. **`appsscript.json`** (View > Show manifest file `appsscript.json`):
   Contains the required OAuth scopes and Web App configuration:
   ```json
   {
     "timeZone": "Asia/Kolkata",
     "dependencies": { "enabledAdvancedServices": [] },
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "webapp": {
       "executeAs": "USER_ACCESSING",
       "access": "ANYONE"
     },
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/documents",
       "https://www.googleapis.com/auth/drive",
       "https://www.googleapis.com/auth/userinfo.email",
       "https://www.googleapis.com/auth/script.external_request"
     ]
   }
   ```
2. **`Config.gs`**: Update `SPREADSHEET_ID` if using a standalone script (or leave as-is if container-bound).
3. **`Auth.gs`**: Google Account identification and domain restriction logic.
4. **`Utils.gs`**: Date, ID, tag normalization, and sanitization utilities.
5. **`SongService.gs`**: Song data retrieval, caching, and concurrent tag updates via `LockService`.
6. **`CollectionService.gs`**: Collection creation, ordering, and strict backend ownership isolation.
7. **`ExportService.gs`**: Unicode-safe PDF and DOCX generation, missing lyrics validation, and auditing.
8. **`Code.gs`**: Web App entry point `doGet()`, iframe permissions (`ALLOWALL`), and API endpoints.
9. **`SetupSheet.gs`**: One-click sheet structure initializer.
10. **`index.html`**: Main HTML structure.
11. **`styles.html`**: Embedded stylesheet.
12. **`javascript.html`**: Embedded client logic.

### Step 2.3: Configure Script Properties (Optional & Secure)
Instead of hard-coding configuration in `Config.gs`, you can store them in **Project Settings > Script Properties**:
- `SPREADSHEET_ID`: `{YOUR_SPREADSHEET_ID}`
- `REQUIRE_DOMAIN_RESTRICTION`: `true` or `false`
- `ALLOWED_DOMAIN`: `tirwin.in`

### Step 2.4: Deploy as Web App
1. In Apps Script, click the blue **Deploy > New deployment** button.
2. Click the gear icon (**Select type**) and select **Web app**.
3. Configure the deployment settings:
   - **Description**: `Song Collection & Lyrics Library v1.0`
   - **Execute as**: **User accessing the web app** (CRITICAL: this ensures `Session.getActiveUser().getEmail()` accurately detects the logged-in user)
   - **Who has access**: **Anyone with a Google Account** (or "Anyone within your Workspace domain" if using enterprise Workspace)
4. Click **Deploy**.
5. Copy the **Web App URL**:
   ```text
   https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
   ```

---

## 3. Google Sites Embedding

### Step 3.1: Open your Google Site
1. Go to [Google Sites](https://sites.google.com) and open or create your site.
2. Select the page where you want the Song Library application to appear.

### Step 3.2: Embed the Web App URL
1. In the right-hand sidebar, click **Insert > Embed** (or double-click the page area and click the Embed icon).
2. In the modal, select the **By URL** tab.
3. Paste your **Web App URL** (`https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`).
4. Click **Insert**.

### Step 3.3: Adjust Layout and Dimensions
1. Drag the embedded frame edges so the application occupies the **full width** of the page section.
2. Set the height to at least **850px** or longer so the song cards, search toolbar, and tabs fit without clipping.
3. Because the Web App includes `HtmlService.XFrameOptionsMode.ALLOWALL`, it renders smoothly inside the Google Sites iframe.

### Step 3.4: Publish Google Site
1. Click **Publish** in the top right of Google Sites.
2. Set your Site's web address and viewing permissions.
3. Click **Publish**.

---

## 4. Verification and Security Testing

| Test Scenario | Expected Outcome |
|:---|:---|
| **Unauthenticated User** | Displays the "Sign in required" card; song list, collections, and export buttons are hidden. |
| **Gmail User** (`user@gmail.com`) | Automatically authenticated; email badge shows `user@gmail.com`; full access enabled. |
| **Workspace Domain Restriction** | When enabled (`REQUIRE_DOMAIN_RESTRICTION = true`), users outside `ALLOWED_DOMAIN` see "Access Restricted". |
| **Tag Editing** | Updating tags updates ONLY the `Tags`, `Updated At`, and `Updated By` cells in Google Sheets; no lyrics overwritten. |
| **Collection Ownership** | User A cannot view, modify, or export User B's collections (enforced on backend). |
| **Song Ordering** | Songs are exported in the exact custom order configured by the user. |
| **Tamil & Devanagari Unicode** | PDF and DOCX files render native Tamil and Devanagari script cleanly without missing glyphs. |
| **Missing Lyrics Warning** | When exporting a language missing from a song, a warning card appears with the option to continue without that song. |
