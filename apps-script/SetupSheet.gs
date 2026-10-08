/**
 * Spreadsheet Setup and Sample Data Populator for Google Apps Script
 * Run this function once from the Apps Script Editor: populateSampleSongsAndStructure()
 */

function populateSampleSongsAndStructure() {
  var spreadsheet = ConfigService.getSpreadsheet();

  // 1. Setup Songs Sheet
  var songsSheet = spreadsheet.getSheetByName(CONFIG.SONGS_SHEET);
  if (!songsSheet) {
    songsSheet = spreadsheet.insertSheet(CONFIG.SONGS_SHEET);
  }

  // Ensure Sheet is clear if initializing
  songsSheet.clear();

  // Add Headers (Section 7, 48)
  var songHeaders = [
    'Song ID',
    'Song Title',
    'Tamil Lyrics',
    'English Lyrics',
    'Devanagari Lyrics',
    'Tags',
    'Category',
    'Active',
    'Updated At',
    'Updated By'
  ];
  songsSheet.appendRow(songHeaders);

  // Style Header Row
  var headerRange = songsSheet.getRange(1, 1, 1, songHeaders.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0f172a');
  headerRange.setFontColor('#ffffff');
  songsSheet.setFrozenRows(1);

  // Sample Songs Dataset (Multi-lingual Tamil, English, Devanagari with realistic tags)
  var sampleRows = [
    [
      'S001',
      'Morning Worship (காலை ஆராதனை)',
      'காலை நேரம் உம் பாதம் வந்தேன்\nகர்த்தாவே உம் கிருபையைத் தந்தருளும்\nபுது நாளின் தொடக்கத்தில் உம்மைப் பாடுவேன்\nஎன் வாழ்வின் வழிகாட்டி நீர் அல்லவோ!\n\nபல்லவி:\nஅல்லேலூயா உம்மைத் துதிப்பேன்\nஎன்றென்றும் உம்மைப் போற்றுவேன்\nகாலைதோறும் உம் கிருபைகள் புதிதாம்\nஉண்மைத்துவத்தில் பெரியவர் நீர்!',
      'Early in the morning I come to Your presence\nLord grant me Your boundless grace\nAt the dawn of this brand new day I will sing\nFor You are the trusted guide of my life!\n\nChorus:\nHallelujah I will praise Your name\nForever and ever I will lift You high\nYour mercies are new every morning\nGreat is Your faithfulness, O Lord!',
      'सुबह सवेरे तेरे चरणों में आते हैं\nप्रभु अपनी असीम अनुग्रह हमें दीजिए\nइस नए दिन की शुरुआत में हम गाएंगे\nक्योंकि तू ही हमारे जीवन का सच्चा मार्गदर्शक है!\n\nकोरस:\nहाल्लेलूयाह हम तेरी स्तुति करेंगे\nसदा सर्वदा तेरा गुणगान करेंगे\nतेरी दया हर सुबह नई होती है\nतेरी सच्चाई कितनी महान है!',
      'Morning, Worship, Praise',
      'Worship',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S002',
      'Prayer for Peace (சமாதானத்தின் பாடல்)',
      'சமாதானம் தரும் தேவ மைந்தனே\nஎன் உள்ளத்தில் அமைதி அருளுமே\nபுயல் வீசும் காலத்திலும் காப்பவரே\nஉம் நிழலில் நான் தங்கி வாழ்வேனே!\n\nபல்லவி:\nஅமைதி தரும் உந்தன் சத்தம் கேட்குதே\nபயம் நீங்கி உள்ளம் மகிழுதே\nஎன்னைத் தாங்கும் கரம் உந்தன் கரமே\nஎன்றென்றும் நான் உம்மில் வாழ்வேன்!',
      'Prince of Peace, Divine Savior\nBestow peace into my troubled heart\nEven when fierce storms rage around me\nIn Your shadow I will find my rest!\n\nChorus:\nYour gentle whisper brings sweet peace\nAll fears vanish and my soul rejoices\nThe hand that upholds me is Your loving hand\nForever in You I shall dwell!',
      'शांति के राजकुमार, प्यारे प्रभु\nमेरे अशांत मन को शांति दीजिए\nजब भी तूफ़ान जीवन में आते हैं\nतेरी छाया में मुझे विश्राम मिलता है!\n\nकोरस:\nतेरी मधुर आवाज़ शांति लाती है\nहर डर दूर होता है और दिल गाता है\nजो हाथ मुझे संभालता है वह तेरा ही हाथ है\nसदा तेरे साथ मैं रहूँगा!',
      'Prayer, Peace, Comfort',
      'Prayer',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ]
  ];

  for (var r = 0; r < sampleRows.length; r++) {
    songsSheet.appendRow(sampleRows[r]);
  }

  // Auto-resize columns
  for (var c = 1; c <= songHeaders.length; c++) {
    songsSheet.autoResizeColumn(c);
  }

  // 2. Setup Collections Sheet (Section 16)
  var collSheet = spreadsheet.getSheetByName(CONFIG.COLLECTIONS_SHEET);
  if (!collSheet) {
    collSheet = spreadsheet.insertSheet(CONFIG.COLLECTIONS_SHEET);
  }
  collSheet.clear();
  var collHeaders = [
    'Collection ID',
    'Collection Name',
    'User Email',
    'Created Date',
    'Created Timestamp',
    'Song IDs',
    'Song Count',
    'Last Exported',
    'Export Format',
    'Export Language'
  ];
  collSheet.appendRow(collHeaders);
  var collRange = collSheet.getRange(1, 1, 1, collHeaders.length);
  collRange.setFontWeight('bold');
  collRange.setBackground('#0f172a');
  collRange.setFontColor('#ffffff');
  collSheet.setFrozenRows(1);

  // 3. Setup Export History Sheet (Section 29)
  var histSheet = spreadsheet.getSheetByName(CONFIG.EXPORT_HISTORY_SHEET);
  if (!histSheet) {
    histSheet = spreadsheet.insertSheet(CONFIG.EXPORT_HISTORY_SHEET);
  }
  histSheet.clear();
  var histHeaders = [
    'Export ID',
    'Collection ID',
    'User Email',
    'Export Date',
    'Export Timestamp',
    'Language',
    'Format',
    'Song Count'
  ];
  histSheet.appendRow(histHeaders);
  var histRange = histSheet.getRange(1, 1, 1, histHeaders.length);
  histRange.setFontWeight('bold');
  histRange.setBackground('#0f172a');
  histRange.setFontColor('#ffffff');
  histSheet.setFrozenRows(1);

  Logger.log('Spreadsheet successfully initialized with Songs, Collections, and ExportHistory!');
}
