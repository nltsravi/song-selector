/**
 * Mock Backend Service for Local Simulation & Testing
 * Mirrors the exact Google Apps Script API endpoints
 */

(function() {
  // Sample song database initialized from src/sample-songs.json
  const defaultSongs = [
    {
      "id": "S001",
      "title": "Morning Worship (காலை ஆராதனை)",
      "tamilLyrics": "காலை நேரம் உம் பாதம் வந்தேன்\nகர்த்தாவே உம் கிருபையைத் தந்தருளும்\nபுது நாளின் தொடக்கத்தில் உம்மைப் பாடுவேன்\nஎன் வாழ்வின் வழிகாட்டி நீர் அல்லவோ!\n\nபல்லவி:\nஅல்லேலூயா உம்மைத் துதிப்பேன்\nஎன்றென்றும் உம்மைப் போற்றுவேன்\nகாலைதோறும் உம் கிருபைகள் புதிதாம்\nஉண்மைத்துவத்தில் பெரியவர் நீர்!",
      "englishLyrics": "Early in the morning I come to Your presence\nLord grant me Your boundless grace\nAt the dawn of this brand new day I will sing\nFor You are the trusted guide of my life!\n\nChorus:\nHallelujah I will praise Your name\nForever and ever I will lift You high\nYour mercies are new every morning\nGreat is Your faithfulness, O Lord!",
      "devanagariLyrics": "सुबह सवेरे तेरे चरणों में आते हैं\nप्रभु अपनी असीम अनुग्रह हमें दीजिए\nइस नए दिन की शुरुआत में हम गाएंगे\nक्योंकि तू ही हमारे जीवन का सच्चा मार्गदर्शक है!\n\nकोरस:\nहाल्लेलूयाह हम तेरी स्तुति करेंगे\nसदा सर्वदा तेरा गुणगान करेंगे\nतेरी दया हर सुबह नई होती है\nतेरी सच्चाई कितनी महान है!",
      "tags": "Morning, Worship, Praise",
      "tagList": ["Morning", "Worship", "Praise"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Worship",
      "active": true
    },
    {
      "id": "S002",
      "title": "Prayer for Peace (சமாதானத்தின் பாடல்)",
      "tamilLyrics": "சமாதானம் தரும் தேவ மைந்தனே\nஎன் உள்ளத்தில் அமைதி அருளுமே\nபுயல் வீசும் காலத்திலும் காப்பவரே\nஉம் நிழலில் நான் தங்கி வாழ்வேனே!\n\nபல்லவி:\nஅமைதி தரும் உந்தன் சத்தம் கேட்குதே\nபயம் நீங்கி உள்ளம் மகிழுதே\nஎன்னைத் தாங்கும் கரம் உந்தன் கரமே\nஎன்றென்றும் நான் உம்மில் வாழ்வேன்!",
      "englishLyrics": "Prince of Peace, Divine Savior\nBestow peace into my troubled heart\nEven when fierce storms rage around me\nIn Your shadow I will find my rest!\n\nChorus:\nYour gentle whisper brings sweet peace\nAll fears vanish and my soul rejoices\nThe hand that upholds me is Your loving hand\nForever in You I shall dwell!",
      "devanagariLyrics": "शांति के राजकुमार, प्यारे प्रभु\nमेरे अशांत मन को शांति दीजिए\nजब भी तूफ़ान जीवन में आते हैं\nतेरी छाया में मुझे विश्राम मिलता है!\n\nकोरस:\nतेरी मधुर आवाज़ शांति लाती है\nहर डर दूर होता है और दिल गाता है\nजो हाथ मुझे संभालता है वह तेरा ही हाथ है\nसदा तेरे साथ मैं रहूँगा!",
      "tags": "Prayer, Peace, Comfort",
      "tagList": ["Prayer", "Peace", "Comfort"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Prayer",
      "active": true
    },
    {
      "id": "S003",
      "title": "Thanksgiving & Gratitude (நன்றி நிறைந்த உள்ளத்தோடு)",
      "tamilLyrics": "நன்றி நிறைந்த உள்ளத்தோடு\nஉம் வாசஸ்தலம் பிரவேசிப்பேன்\nசெய்த நன்மைகள் ஆயிரம் நினைத்தே\nஓயாமல் நன்றி பாடுவேன்!\n\nபல்லவி:\nநன்றி இயேசுவே, நன்றி இயேசுவே\nவாழ்நாளெல்லாம் நன்றி சொல்வேன்\nஜீவனுள்ள நாளெல்லாம் துதிப்பேன்\nஎன் முழு பெலத்தோடும் பாடுவேன்!",
      "englishLyrics": "With a heart full of thanksgiving\nI enter into Your courts with praise\nRemembering the thousand blessings given\nCeaselessly I will sing my thanks!\n\nChorus:\nThank You Jesus, thank You Lord\nAll the days of my life I will give thanks\nAs long as I have breath I will praise\nSinging with all my strength and soul!",
      "devanagariLyrics": "धन्यवाद से भरे हृदय के साथ\nमैं तेरे आंगनों में प्रवेश करता हूँ\nतेरी दी हुई हज़ारों आशीषों को याद कर\nनिरंतर धन्यवाद गाता रहूँगा!\n\nकोरस:\nधन्यवाद प्रभु यीशु, धन्यवाद मेरे स्वामी\nजीवन भर मैं तेरा धन्यवाद करूँगा\nजब तक मुझमें सांस है स्तुति करूँगा\nअपने पूरे सामर्थ्य से गाऊँगा!",
      "tags": "Thanksgiving, Praise, Joy",
      "tagList": ["Thanksgiving", "Praise", "Joy"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Praise",
      "active": true
    },
    {
      "id": "S004",
      "title": "Children of Light (வெளிச்சத்தின் பிள்ளைகள்)",
      "tamilLyrics": "சின்னஞ்சிறு மலர்கள் நாங்கள்\nஇயேசுவின் நேச பிள்ளைகள்\nஉலகில் ஒளியாய் பிரகாசிப்போம்\nஅன்பின் பாதையில் நடந்திடுவோம்!\n\nபல்லவி:\nமகிழ்ச்சியாய் கைதட்டி பாடுவோம்\nஉண்மையும் நீதியும் காப்போம்\nஎங்கள் இதயம் உமக்கே சொந்தம்\nநல்வழி காட்டும் எங்கள் தேவனே!",
      "englishLyrics": "We are tender blooming blossoms\nPrecious children loved by God\nWe will shine as lights in the world\nWalking on the pathway of sweet love!\n\nChorus:\nJoyfully we clap our hands and sing\nUpholding truth and righteousness\nOur little hearts belong to You alone\nGuide our steps, our loving Father!",
      "devanagariLyrics": "हम सब नन्हें फूल हैं\nईश्वर के प्रिय बच्चे हैं\nजगत में ज्योति बनकर चमकेंगे\nप्रेम के मार्ग पर चलेंगे!\n\nकोरस:\nआनंद से ताली बजाकर गाएंगे\nसच्चाई और भलाई अपनाएंगे\nहमारे हृदय केवल तेरे हैं\nहमें नेक राह दिखाओ प्रभु!",
      "tags": "Children, Joy, Youth",
      "tagList": ["Children", "Joy", "Youth"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Children",
      "active": true
    },
    {
      "id": "S005",
      "title": "Evening Meditation (மாலை நேர தியானம்)",
      "tamilLyrics": "பகலின் உழைப்பு முடிந்ததுவே\nமாலை பொழுதில் அமர்ந்தேன்\nதூய மனதோடு உம்மை நோக்கினேன்\nஇரவிலும் என்னை காத்தருளும்!\n\nபல்லவி:\nஉம் சிறகுகளின் நிழலில் அடைக்கலம்\nஅமைதியான நித்திரை தாருமே\nநாளை விடியலில் மீண்டும் பாடுவேன்\nஉம் பேரன்பை உலகிற்கு கூறுவேன்!",
      "englishLyrics": "The toil of the day is now done\nIn the quiet dusk I sit before You\nWith a pure heart I lift my gaze\nSafeguard me through the night!\n\nChorus:\nUnder the shelter of Your wings I abide\nGrant me peaceful and sweet sleep\nAt tomorrow's dawn I will sing anew\nProclaiming Your love to all the earth!",
      "devanagariLyrics": "दिन भर का परिश्रम अब समाप्त हुआ\nशाम के सन्नाटे में तेरे पास बैठा हूँ\nपवित्र मन से तुझे निहारता हूँ\nरात के अंधकार में मेरी रक्षा कर!\n\nकोरस:\nतेरे पंखों की ओट में मेरी शरण है\nमुझे मीठी और शांत नींद दे\nकल सुबह फिर गाऊँगा\nतेरी असीम कृपा की घोषणा करूँगा!",
      "tags": "Evening, Meditation, Prayer",
      "tagList": ["Evening", "Meditation", "Prayer"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Prayer",
      "active": true
    },
    {
      "id": "S006",
      "title": "The Lord is My Shepherd (கர்த்தர் என் மேய்ப்பராய் இருக்கிறார்)",
      "tamilLyrics": "கர்த்தர் என் மேய்ப்பராய் இருக்கிறார்\nதாழ்ச்சி அடையேன் என்றென்றுமே\nபுல்லுள்ள இடங்களில் மேய்க்கின்றார்\nஅமர்ந்த தண்ணீரண்டை நடத்துகிறார்!\n\nபல்லவி:\nஆத்துமாவை அவர் தேற்றுகிறார்\nநீதியின் பாதையில் நடத்துகிறார்\nமரண இருளின் பள்ளத்தாக்கில் நடந்தாலும்\nபொல்லாப்புக்கு அஞ்சிடேன்!",
      "englishLyrics": "The Lord is my Shepherd, I shall not want\nHe makes me lie down in green pastures\nHe leads me beside the still waters\nHe restores and revives my soul!\n\nChorus:\nHe leads me in paths of righteousness\nFor His holy name's sake\nEven though I walk through the valley of the shadow of death\nI will fear no evil!",
      "devanagariLyrics": "प्रभु मेरा चरवाहा है, मुझे कोई घटी न होगी\nवह मुझे हरी चराइयों में बैठाता है\nवह मुझे शांत जलों के पास ले चलता है\nवह मेरे प्राण में नया जीवन भरता है!\n\nकोरस:\nवह मुझे धर्म के मार्गों पर चलाता है\nअपने पवित्र नाम के निमित्त\nचाहे मैं घोर अंधकार से भरी तराई में भी चलूँ\nमैं किसी विपत्ति से न डरूँगा!",
      "tags": "Worship, Scripture, Faith",
      "tagList": ["Worship", "Scripture", "Faith"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Scripture",
      "active": true
    },
    {
      "id": "S007",
      "title": "Grace Unmeasured (அளவற்ற கிருபை)",
      "tamilLyrics": "ஆழமான சமுத்திரத்தை பார்க்கிலும்\nபெரியது உம் கிருபையே\nவானங்களை விட உயர்ந்ததுவே\nஎன்றும் அழியாத உம் தயவே!",
      "englishLyrics": "Deeper than the deepest ocean blue\nIs Your overflowing boundless grace\nHigher than the highest heavens above\nIs Your unfailing steadfast love!",
      "devanagariLyrics": "गहरे सागर से भी गहरी है\nतेरी यह अपार करुणा\nऊँचे आकाश से भी ऊँची है\nतेरी सदा बनी रहने वाली भलाई!",
      "tags": "Grace, Worship, Devotion",
      "tagList": ["Grace", "Worship", "Devotion"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Worship",
      "active": true
    },
    {
      "id": "S008",
      "title": "Celebration of Joy (மகிழ்ச்சியின் கீதம்)",
      "tamilLyrics": "ஆனந்தமாய் கொண்டாடுவோம்\nஆண்டவர் செய்த நன்மைகட்காய்\nதுயரங்கள் யாவும் நீங்கிற்றே\nபுதிய பாடலை பாடுவோம்!",
      "englishLyrics": "Let us celebrate with great joy\nFor all the wondrous things God has done\nSorrow and sighing flee away\nLet us sing a brand new song!",
      "devanagariLyrics": "आओ मिलकर आनंद मनाएं\nप्रभु के उपकारों का गुणगान करें\nसारे शोक और दुःख दूर हो गए\nएक नया गीत मिलकर गाएं!",
      "tags": "Celebration, Joy, Praise",
      "tagList": ["Celebration", "Joy", "Praise"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Praise",
      "active": true
    },
    {
      "id": "S009",
      "title": "Ancient Heritage Chant (English & Tamil only)",
      "tamilLyrics": "தொன்மையான இறை வாக்கே\nஎங்கள் தலைமுறையின் ஒளியே\nஆதி முதல் அந்தம் வரை\nமாறாத உம் சத்தியமே!",
      "englishLyrics": "Ancient Word of everlasting truth\nLight unto every generation\nFrom the beginning unto the end\nUnchanging is Your sacred truth!",
      "devanagariLyrics": "",
      "tags": "Heritage, Tradition, Tamil",
      "tagList": ["Heritage", "Tradition", "Tamil"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": false,
      "category": "Heritage",
      "active": true
    },
    {
      "id": "S010",
      "title": "Divine Anthem (English & Hindi only)",
      "tamilLyrics": "",
      "englishLyrics": "O God our help in ages past\nOur hope for years to come\nOur shelter from the stormy blast\nAnd our eternal home!",
      "devanagariLyrics": "हे हमारे ईश्वर, तू ही हमारा सनातन सहारा\nआने वाले वर्षों की हमारी आशा\nतूफानी आंधियों से हमारी शरण\nऔर हमारा अनंत निवास!",
      "tags": "Anthem, Classic, Devanagari",
      "tagList": ["Anthem", "Classic", "Devanagari"],
      "hasTamil": false,
      "hasEnglish": true,
      "hasDevanagari": true,
      "category": "Classic",
      "active": true
    }
  ];

  // Storage in localStorage or memory
  function getStoredSongs() {
    const raw = localStorage.getItem('SONGS_DATABASE');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    localStorage.setItem('SONGS_DATABASE', JSON.stringify(defaultSongs));
    return defaultSongs;
  }

  function saveStoredSongs(songs) {
    localStorage.setItem('SONGS_DATABASE', JSON.stringify(songs));
  }

  function getStoredCollections() {
    const raw = localStorage.getItem('COLLECTIONS_DATABASE');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    const sampleCols = [
      {
        collectionId: 'COL-20261008-073214-A7F3',
        name: 'Morning Worship Collection',
        userEmail: 'user@example.com',
        createdDate: '08-Oct-2026',
        createdTimestamp: '08-Oct-2026 07:32:14 PM IST',
        songIds: ['S001', 'S002', 'S003'],
        songCount: 3,
        lastExported: '08-Oct-2026 07:45:00 PM IST',
        exportFormat: 'PDF',
        exportLanguage: 'Tamil'
      }
    ];
    localStorage.setItem('COLLECTIONS_DATABASE', JSON.stringify(sampleCols));
    return sampleCols;
  }

  function saveStoredCollections(cols) {
    localStorage.setItem('COLLECTIONS_DATABASE', JSON.stringify(cols));
  }

  // Active simulated user
  let activeSimulatedUser = {
    isAuthenticated: true,
    email: 'user@example.com',
    domain: 'example.com',
    isDomainAllowed: true,
    error: null
  };

  const storedUser = localStorage.getItem('SIMULATED_USER');
  if (storedUser) {
    try { activeSimulatedUser = JSON.parse(storedUser); } catch (e) {}
  }

  // Format timestamp in Asia/Kolkata style
  function getKolkataTimestamp() {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    let hrs = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    const strHrs = String(hrs).padStart(2, '0');
    return `${day}-${mon}-${yr} ${strHrs}:${mins}:${secs} ${ampm} IST`;
  }

  function getKolkataDate() {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`;
  }

  window.MockBackend = {
    setSimulatedUser: function(userType) {
      if (userType === 'logged_in_gmail') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'user@example.com',
          domain: 'example.com',
          isDomainAllowed: true,
          error: null
        };
      } else if (userType === 'logged_in_tirwin') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'sarah@tirwin.in',
          domain: 'tirwin.in',
          isDomainAllowed: true,
          error: null
        };
      } else if (userType === 'unauthorized_domain') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'outsider@otherdomain.com',
          domain: 'otherdomain.com',
          isDomainAllowed: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access is restricted to @tirwin.in accounts. Your account (outsider@otherdomain.com) is not permitted.'
          }
        };
      } else if (userType === 'unauthenticated') {
        activeSimulatedUser = {
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
      localStorage.setItem('SIMULATED_USER', JSON.stringify(activeSimulatedUser));
      window.location.reload();
    },

    getSimulatedUser: function() {
      return activeSimulatedUser;
    },

    apiGetCurrentUser: function() {
      return activeSimulatedUser;
    },

    apiGetSongs: function() {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      return getStoredSongs();
    },

    apiGetSong: function(songId) {
      const songs = getStoredSongs();
      return songs.find(s => s.id === songId) || null;
    },

    apiUpdateSongTags: function(songId, tagsString) {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const songs = getStoredSongs();
      const song = songs.find(s => s.id === songId);
      if (!song) throw new Error('Song not found.');

      // Normalize tags
      const list = (tagsString || '').split(/[,|]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
      const unique = [];
      const seen = new Set();
      list.forEach(t => {
        const lower = t.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          unique.push(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
        }
      });

      const normalized = unique.join(', ');
      const timestamp = getKolkataTimestamp();

      song.tags = normalized;
      song.tagList = unique;
      song.updatedAt = timestamp;
      song.updatedBy = activeSimulatedUser.email;

      saveStoredSongs(songs);

      return {
        songId: songId,
        tags: normalized,
        tagList: unique,
        updatedAt: timestamp,
        updatedBy: activeSimulatedUser.email
      };
    },

    apiCreateCollection: function(name, songIds) {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      if (!name || !name.trim()) throw new Error('Collection name is required.');
      if (!songIds || songIds.length === 0) throw new Error('At least one song is required.');

      const cleanName = name.trim();
      const collId = 'COL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const date = getKolkataDate();
      const timestamp = getKolkataTimestamp();

      const newCol = {
        collectionId: collId,
        name: cleanName,
        userEmail: activeSimulatedUser.email,
        createdDate: date,
        createdTimestamp: timestamp,
        songIds: songIds,
        songCount: songIds.length,
        lastExported: '',
        exportFormat: '',
        exportLanguage: ''
      };

      const cols = getStoredCollections();
      cols.unshift(newCol);
      saveStoredCollections(cols);

      return newCol;
    },

    apiGetMyCollections: function() {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      // Strict backend ownership filtering (Section 17)
      return cols.filter(c => c.userEmail === activeSimulatedUser.email);
    },

    apiGetCollection: function(collectionId) {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      const col = cols.find(c => c.collectionId === collectionId);
      if (!col) throw new Error('Collection not found.');

      if (col.userEmail !== activeSimulatedUser.email) {
        throw new Error('FORBIDDEN: You do not have permission to view this collection.');
      }

      const allSongs = getStoredSongs();
      const songMap = {};
      allSongs.forEach(s => songMap[s.id] = s);

      const hydrated = (col.songIds || []).map(id => songMap[id] || {
        id: id,
        title: 'Song ' + id,
        tamilLyrics: '',
        englishLyrics: '',
        devanagariLyrics: ''
      });

      return {
        ...col,
        songs: hydrated
      };
    },

    apiUpdateCollection: function(collectionId, name, songIds) {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      const col = cols.find(c => c.collectionId === collectionId);
      if (!col) throw new Error('Collection not found.');

      if (col.userEmail !== activeSimulatedUser.email) {
        throw new Error('FORBIDDEN: You do not have permission to modify this collection.');
      }

      col.name = name.trim();
      col.songIds = songIds;
      col.songCount = songIds.length;

      saveStoredCollections(cols);
      return this.apiGetCollection(collectionId);
    },

    apiValidateExport: function(collectionId, language) {
      const col = this.apiGetCollection(collectionId);
      const lang = (language || '').toLowerCase();
      const missing = [];
      let available = 0;

      col.songs.forEach(s => {
        let text = '';
        if (lang === 'tamil') text = s.tamilLyrics;
        else if (lang === 'devanagari') text = s.devanagariLyrics;
        else text = s.englishLyrics;

        if (!text || !text.trim()) {
          missing.push({ id: s.id, title: s.title });
        } else {
          available++;
        }
      });

      return {
        collectionId: collectionId,
        collectionName: col.name,
        language: language,
        totalSongs: col.songs.length,
        hasMissingLyrics: missing.length > 0,
        missingSongs: missing,
        availableSongsCount: available
      };
    },

    apiExportCollection: function(collectionId, language, format, skipMissing) {
      const col = this.apiGetCollection(collectionId);
      const lang = language || 'English';
      const fmt = (format || 'PDF').toUpperCase();

      const validation = this.apiValidateExport(collectionId, lang);
      if (validation.hasMissingLyrics && !skipMissing) {
        return {
          success: false,
          requiresConfirmation: true,
          validation: validation,
          message: 'Some songs in this collection do not have lyrics in ' + lang + '.'
        };
      }

      const songsToExport = col.songs.filter(s => {
        let text = '';
        if (lang.toLowerCase() === 'tamil') text = s.tamilLyrics;
        else if (lang.toLowerCase() === 'devanagari') text = s.devanagariLyrics;
        else text = s.englishLyrics;
        return text && text.trim().length > 0;
      });

      const cleanColName = col.name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
      const filename = `${cleanColName}_${lang}.${fmt.toLowerCase()}`;

      // Build document text content with Header and Footer structure
      let docContent = `[HEADER - Left Aligned: Logo (0.54" x 0.5", 90% Opacity, 20% Brightness)]\n`;
      docContent += `----------------------------------------------------------\n\n`;
      docContent += `[WATERMARK - Center of Page: OmkaarSSL logo, Full Size, 25% Opacity, 0% Brightness & Contrast]\n\n`;
      docContent += `${col.name}\n\n`;

      songsToExport.forEach((s) => {
        let lyrics = '';
        if (lang.toLowerCase() === 'tamil') lyrics = s.tamilLyrics;
        else if (lang.toLowerCase() === 'devanagari') lyrics = s.devanagariLyrics;
        else lyrics = s.englishLyrics;

        docContent += `${s.title}\n\n${lyrics}\n\n`;
      });

      docContent += `\n----------------------------------------------------------\n`;
      docContent += `[FOOTER: © OmkaarSSL                     ${col.name}]\n`;

      // Encode document to base64
      let mimeType = 'text/plain;charset=utf-8';
      let binaryString = unescape(encodeURIComponent(docContent));

      const headerLogoBase64 = typeof LOGO_HEADER_BASE64 !== 'undefined' ? LOGO_HEADER_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');
      const watermarkBase64 = typeof LOGO_IMAGE_WATERMARK_BASE64 !== 'undefined' ? LOGO_IMAGE_WATERMARK_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');

      if (fmt === 'DOCX') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        // HTML wrapper with header logo, center watermark, and footer structure
        const htmlDoc = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>${col.name}</title>
          <style>
            @page { margin: 1in; }
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; margin: 30px; position: relative; }
            .header-table { width: 100%; border-bottom: 1px solid #cbd5e1; margin-bottom: 24px; padding-bottom: 8px; }
            .header-logo { text-align: left; }
            .header-logo img { width: 0.54in; height: 0.5in; opacity: 0.9; object-fit: contain; filter: brightness(1.2); }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); -webkit-transform: translate(-50%, -50%); opacity: 0.25; z-index: -1000; pointer-events: none; text-align: center; width: 80%; max-width: 600px; }
            .watermark img { width: 100%; height: auto; opacity: 1; display: block; margin: 0 auto; filter: brightness(1.0) contrast(1.0); }
            .collection-title { text-align: center; color: #0f172a; font-size: 24px; font-weight: bold; margin: 16px 0 24px 0; }
            h2 { color: #4338ca; margin-top: 24px; }
            .lyrics { white-space: pre-wrap; margin-bottom: 24px; font-size: 14px; line-height: 1.8; }
            .footer-table { width: 100%; border-top: 1px solid #cbd5e1; margin-top: 36px; padding-top: 8px; font-size: 11px; color: #64748b; }
            .footer-left { text-align: left; }
            .footer-right { text-align: right; }
          </style>
          </head>
          <body>
            <!-- Center of page full-size watermark with opacity 25%, brightness & contrast 0% -->
            <div class="watermark">
              <img src="data:image/png;base64,${watermarkBase64}" alt="Watermark" />
            </div>

            <!-- Header with 0.54in x 0.5in logo on the left with opacity 90%, brightness 20%, and horizontal rule below -->
            <div class="header-table">
              <div class="header-logo"><img src="data:image/png;base64,${headerLogoBase64}" alt="Logo" style="width:0.54in;height:0.5in;opacity:0.9;object-fit:contain;filter:brightness(1.2);" /></div>
            </div>

            <div class="collection-title">${col.name}</div>

            ${songsToExport.map((s) => {
              let l = (lang.toLowerCase() === 'tamil' ? s.tamilLyrics : (lang.toLowerCase() === 'devanagari' ? s.devanagariLyrics : s.englishLyrics)) || '';
              return `<h2>${s.title}</h2><div class="lyrics">${l.replace(/\n/g, '<br>')}</div><div style="margin-bottom:24px;"></div>`;
            }).join('')}

            <!-- Footer with horizontal rule above -->
            <table class="footer-table">
              <tr>
                <td class="footer-left">© OmkaarSSL</td>
                <td class="footer-right">${col.name}</td>
              </tr>
            </table>
          </body></html>
        `;
        binaryString = unescape(encodeURIComponent(htmlDoc));
      } else {
        // PDF MIME type
        mimeType = 'application/pdf';
      }

      const base64Data = btoa(binaryString);

      // Update last exported
      const cols = getStoredCollections();
      const targetCol = cols.find(c => c.collectionId === collectionId);
      if (targetCol) {
        targetCol.lastExported = getKolkataTimestamp();
        targetCol.exportFormat = fmt;
        targetCol.exportLanguage = lang;
        saveStoredCollections(cols);
      }

      return {
        success: true,
        exportId: 'EXP-' + Date.now(),
        filename: filename,
        mimeType: mimeType,
        base64Data: base64Data,
        songCount: songsToExport.length,
        language: lang,
        format: fmt
      };
    }
  };
})();
