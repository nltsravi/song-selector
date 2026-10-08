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
    ],
    [
      'S003',
      'Thanksgiving & Gratitude (நன்றி நிறைந்த உள்ளத்தோடு)',
      'நன்றி நிறைந்த உள்ளத்தோடு\nஉம் வாசஸ்தலம் பிரவேசிப்பேன்\nசெய்த நன்மைகள் ஆயிரம் நினைத்தே\nஓயாமல் நன்றி பாடுவேன்!\n\nபல்லவி:\nநன்றி இயேசுவே, நன்றி இயேசுவே\nவாழ்நாளெல்லாம் நன்றி சொல்வேன்\nஜீவனுள்ள நாளெல்லாம் துதிப்பேன்\nஎன் முழு பெலத்தோடும் பாடுவேன்!',
      'With a heart full of thanksgiving\nI enter into Your courts with praise\nRemembering the thousand blessings given\nCeaselessly I will sing my thanks!\n\nChorus:\nThank You Jesus, thank You Lord\nAll the days of my life I will give thanks\nAs long as I have breath I will praise\nSinging with all my strength and soul!',
      'धन्यवाद से भरे हृदय के साथ\nमैं तेरे आंगनों में प्रवेश करता हूँ\nतेरी दी हुई हज़ारों आशीषों को याद कर\nनिरंतर धन्यवाद गाता रहूँगा!\n\nकोरस:\nधन्यवाद प्रभु यीशु, धन्यवाद मेरे स्वामी\nजीवन भर मैं तेरा धन्यवाद करूँगा\nजब तक मुझमें सांस है स्तुति करूँगा\nअपने पूरे सामर्थ्य से गाऊँगा!',
      'Thanksgiving, Praise, Joy',
      'Praise',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S004',
      'Children of Light (வெளிச்சத்தின் பிள்ளைகள்)',
      'சின்னஞ்சிறு மலர்கள் நாங்கள்\nஇயேசுவின் நேச பிள்ளைகள்\nஉலகில் ஒளியாய் பிரகாசிப்போம்\nஅன்பின் பாதையில் நடந்திடுவோம்!\n\nபல்லவி:\nமகிழ்ச்சியாய் கைதட்டி பாடுவோம்\nஉண்மையும் நீதியும் காப்போம்\nஎங்கள் இதயம் உமக்கே சொந்தம்\nநல்வழி காட்டும் எங்கள் தேவனே!',
      'We are tender blooming blossoms\nPrecious children loved by God\nWe will shine as lights in the world\nWalking on the pathway of sweet love!\n\nChorus:\nJoyfully we clap our hands and sing\nUpholding truth and righteousness\nOur little hearts belong to You alone\nGuide our steps, our loving Father!',
      'हम सब नन्हें फूल हैं\nईश्वर के प्रिय बच्चे हैं\nजगत में ज्योति बनकर चमकेंगे\nप्रेम के मार्ग पर चलेंगे!\n\nकोरस:\nआनंद से ताली बजाकर गाएंगे\nसच्चाई और भलाई अपनाएंगे\nहमारे हृदय केवल तेरे हैं\nहमें नेक राह दिखाओ प्रभु!',
      'Children, Joy, Youth',
      'Children',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S005',
      'Evening Meditation (மாலை நேர தியானம்)',
      'பகலின் உழைப்பு முடிந்ததுவே\nமாலை பொழுதில் அமர்ந்தேன்\nதூய மனதோடு உம்மை நோக்கினேன்\nஇரவிலும் என்னை காத்தருளும்!\n\nபல்லவி:\nஉம் சிறகுகளின் நிழலில் அடைக்கலம்\nஅமைதியான நித்திரை தாருமே\nநாளை விடியலில் மீண்டும் பாடுவேன்\nஉம் பேரன்பை உலகிற்கு கூறுவேன்!',
      'The toil of the day is now done\nIn the quiet dusk I sit before You\nWith a pure heart I lift my gaze\nSafeguard me through the night!\n\nChorus:\nUnder the shelter of Your wings I abide\nGrant me peaceful and sweet sleep\nAt tomorrow's dawn I will sing anew\nProclaiming Your love to all the earth!',
      'दिन भर का परिश्रम अब समाप्त हुआ\nशाम के सन्नाटे में तेरे पास बैठा हूँ\nपवित्र मन से तुझे निहारता हूँ\nरात के अंधकार में मेरी रक्षा कर!\n\nकोरस:\nतेरे पंखों की ओट में मेरी शरण है\nमुझे मीठी और शांत नींद दे\nकल सुबह फिर गाऊँगा\nतेरी असीम कृपा की घोषणा करूँगा!',
      'Evening, Meditation, Prayer',
      'Prayer',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S006',
      'The Lord is My Shepherd (கர்த்தர் என் மேய்ப்பராய் இருக்கிறார்)',
      'கர்த்தர் என் மேய்ப்பராய் இருக்கிறார்\nதாழ்ச்சி அடையேன் என்றென்றுமே\nபுல்லுள்ள இடங்களில் மேய்க்கின்றார்\nஅமர்ந்த தண்ணீரண்டை நடத்துகிறார்!\n\nபல்லவி:\nஆத்துமாவை அவர் தேற்றுகிறார்\nநீதியின் பாதையில் நடத்துகிறார்\nமரண இருளின் பள்ளத்தாக்கில் நடந்தாலும்\nபொல்லாப்புக்கு அஞ்சிடேன்!',
      'The Lord is my Shepherd, I shall not want\nHe makes me lie down in green pastures\nHe leads me beside the still waters\nHe restores and revives my soul!\n\nChorus:\nHe leads me in paths of righteousness\nFor His holy name's sake\nEven though I walk through the valley of the shadow of death\nI will fear no evil!',
      'प्रभु मेरा चरवाहा है, मुझे कोई घटी न होगी\nवह मुझे हरी चराइयों में बैठाता है\nवह मुझे शांत जलों के पास ले चलता है\nवह मेरे प्राण में नया जीवन भरता है!\n\nकोरस:\nवह मुझे धर्म के मार्गों पर चलाता है\nअपने पवित्र नाम के निमित्त\nचाहे मैं घोर अंधकार से भरी तराई में भी चलूँ\nमैं किसी विपत्ति से न डरूँगा!',
      'Worship, Scripture, Faith',
      'Scripture',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S007',
      'Grace Unmeasured (அளவற்ற கிருபை)',
      'ஆழமான சமுத்திரத்தை பார்க்கிலும்\nபெரியது உம் கிருபையே\nவானங்களை விட உயர்ந்ததுவே\nஎன்றும் அழியாத உம் தயவே!\n\nபல்லவி:\nகிருபையே தேவ கிருபையே\nதாங்கி நடத்தும் கிருபையே\nசோர்ந்து போகாமல் காத்தருளும்\nஎன் வாழ்வின் ஆதரவே!',
      'Deeper than the deepest ocean blue\nIs Your overflowing boundless grace\nHigher than the highest heavens above\nIs Your unfailing steadfast love!\n\nChorus:\nGrace, marvelous grace of God\nGrace that holds and carries me through\nKeeping me when my spirit grows weary\nThe eternal anchor of my life!',
      'गहरे सागर से भी गहरी है\nतेरी यह अपार करुणा\nऊँचे आकाश से भी ऊँची है\nतेरी सदा बनी रहने वाली भलाई!',
      'Grace, Worship, Devotion',
      'Worship',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S008',
      'Celebration of Joy (மகிழ்ச்சியின் கீதம்)',
      'ஆனந்தமாய் கொண்டாடுவோம்\nஆண்டவர் செய்த நன்மைகட்காய்\nதுயரங்கள் யாவும் நீங்கிற்றே\nபுதிய பாடலை பாடுவோம்!\n\nபல்லவி:\nமகிழ்ச்சி மகிழ்ச்சி உள்ளத்திலே\nசந்தோஷ கீதம் நம் நாவினிலே\nஜெய கீதம் பாடி ஆர்ப்பரிப்போம்\nஎன்றென்றும் வெற்றிகொள்வோம்!',
      'Let us celebrate with great joy\nFor all the wondrous things God has done\nSorrow and sighing flee away\nLet us sing a brand new song!\n\nChorus:\nJoy, boundless joy in our hearts\nA song of gladness on our tongue\nShouting victory and rejoicing\nTriumph is ours forevermore!',
      'आओ मिलकर आनंद मनाएं\nप्रभु के उपकारों का गुणगान करें\nसारे शोक और दुःख दूर हो गए\nएक नया गीत मिलकर गाएं!',
      'Celebration, Joy, Praise',
      'Praise',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S009',
      'Ancient Heritage Chant (English & Tamil only)',
      'தொன்மையான இறை வாக்கே\nஎங்கள் தலைமுறையின் ஒளியே\nஆதி முதல் அந்தம் வரை\nமாறாத உம் சத்தியமே!',
      'Ancient Word of everlasting truth\nLight unto every generation\nFrom the beginning unto the end\nUnchanging is Your sacred truth!',
      '',
      'Heritage, Tradition, Tamil',
      'Heritage',
      true,
      DateHelper.getFormattedTimestamp(),
      'system@admin'
    ],
    [
      'S010',
      'Divine Anthem (English & Hindi only)',
      '',
      'O God our help in ages past\nOur hope for years to come\nOur shelter from the stormy blast\nAnd our eternal home!',
      'हे हमारे ईश्वर, तू ही हमारा सनातन सहारा\nआने वाले वर्षों की हमारी आशा\nतूफानी आंधियों से हमारी शरण\nऔर हमारा अनंत निवास!',
      'Anthem, Classic, Devanagari',
      'Classic',
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
