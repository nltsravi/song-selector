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
      "imageUrl": "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&auto=format&fit=crop",
      "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
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
      "imageUrl": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop",
      "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      "videoUrl": "",
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
      "imageUrl": "",
      "audioUrl": "",
      "videoUrl": "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
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
      "imageUrl": "",
      "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      "videoUrl": "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
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
      "imageUrl": "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop",
      "audioUrl": "",
      "videoUrl": "",
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
      "imageUrl": "",
      "audioUrl": "",
      "videoUrl": "",
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
      "imageUrl": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop",
      "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      "videoUrl": "",
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
      "imageUrl": "",
      "audioUrl": "",
      "videoUrl": "https://www.youtube.com/watch?v=L_LUpnjgPso",
      "active": true
    },
    {
      "id": "S009",
      "title": "Ancient Heritage Chant (English & Tamil only)",
      "tamilLyrics": "தொன்மையான இறை வாக்கே\nஎங்கள் தலைமுறையின் ஒளியே\nஆதி முதல் அந்தம் வரை\nமாறாத உம் சத்தியமே!\n\nபல்லவி:\nதலைமுறை தலைமுறையாக\nஉம்மை போற்றி பாடுவோம்\nநிலைத்திருக்கும் உம் நாமம்\nபூமியெங்கும் விளங்கிடவே!",
      "englishLyrics": "Ancient Word of everlasting truth\nLight unto every generation\nFrom the beginning unto the end\nUnchanging is Your sacred truth!",
      "devanagariLyrics": "",
      "tags": "Heritage, Tradition, Tamil",
      "tagList": ["Heritage", "Tradition", "Tamil"],
      "hasTamil": true,
      "hasEnglish": true,
      "hasDevanagari": false,
      "category": "Heritage",
      "imageUrl": "",
      "audioUrl": "",
      "videoUrl": "",
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
      "imageUrl": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop",
      "audioUrl": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
      "videoUrl": "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
      "active": true
    }
  ];

  // Storage in localStorage or memory
  function getStoredSongs() {
    let baseSongs = (typeof window !== 'undefined' && window.SONGS_DATABASE && Array.isArray(window.SONGS_DATABASE) && window.SONGS_DATABASE.length > 0)
      ? window.SONGS_DATABASE
      : defaultSongs;

    let songs = baseSongs;
    const raw = localStorage.getItem('SONGS_DATABASE');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= baseSongs.length) {
          songs = parsed;
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          const parsedMap = new Map(parsed.map(p => [p.id, p]));
          songs = baseSongs.map(base => {
            const saved = parsedMap.get(base.id);
            return saved ? Object.assign({}, base, saved) : base;
          });
          localStorage.setItem('SONGS_DATABASE', JSON.stringify(songs));
        }
      } catch (e) {}
    }
    // Ensure every song has englishTitle, tamilTitle, and hindiTitle
    songs.forEach(s => {
      if (!s.englishTitle || !s.tamilTitle || !s.hindiTitle) {
        const match = (s.title || '').match(/^([^(]+)\s*\(([^)]+)\)$/);
        if (match) {
          s.englishTitle = s.englishTitle || match[1].trim();
          s.tamilTitle = s.tamilTitle || match[2].trim();
        } else if (/[\u0B80-\u0BFF]/.test(s.title || '')) {
          s.tamilTitle = s.tamilTitle || s.title;
          s.englishTitle = s.englishTitle || s.title;
        } else {
          s.englishTitle = s.englishTitle || s.title;
          s.tamilTitle = s.tamilTitle || '';
        }
        if (!s.hindiTitle) {
          s.hindiTitle = s.devanagariTitle || '';
        }
      }
    });
    localStorage.setItem('SONGS_DATABASE', JSON.stringify(songs));
    return songs;
  }

  function saveStoredSongs(songs) {
    localStorage.setItem('SONGS_DATABASE', JSON.stringify(songs));
  }

  function getStoredCollections() {
    const raw = localStorage.getItem('COLLECTIONS_DATABASE');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    const hasLiveDb = (typeof window !== 'undefined' && Array.isArray(window.SONGS_DATABASE) && window.SONGS_DATABASE.length >= 3);
    const defaultIds = hasLiveDb
      ? [window.SONGS_DATABASE[0].id, window.SONGS_DATABASE[1].id, window.SONGS_DATABASE[2].id]
      : ['S001', 'S002', 'S003'];
    const sampleCols = [
      {
        collectionId: 'COL-20261008-073214-A7F3',
        name: 'Morning Worship Collection',
        userEmail: getActiveUser().email || 'user@example.com',
        createdDate: '08-Oct-2026',
        createdTimestamp: '08-Oct-2026 07:32:14 PM IST',
        songIds: defaultIds,
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

  function getActiveUser() {
    try {
      const oauthRaw = localStorage.getItem('GOOGLE_OAUTH_USER');
      if (oauthRaw) {
        const oauthUser = JSON.parse(oauthRaw);
        if (oauthUser && oauthUser.isAuthenticated && oauthUser.email) {
          activeSimulatedUser = {
            isAuthenticated: true,
            email: oauthUser.email,
            name: oauthUser.name || oauthUser.email.split('@')[0],
            domain: oauthUser.domain || oauthUser.email.split('@')[1] || '',
            isDomainAllowed: oauthUser.isDomainAllowed !== false,
            error: oauthUser.error || null
          };
          return activeSimulatedUser;
        }
      }
    } catch (e) {}
    return activeSimulatedUser;
  }

  function isOwnerOfCollection(col, user) {
    if (!col || !user || !user.email) return false;
    const colEmail = (col.userEmail || '').toLowerCase();
    const usrEmail = (user.email || '').toLowerCase();
    return colEmail === usrEmail || colEmail === 'user@example.com';
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

  function safeBase64Encode(str) {
    if (!str) return '';
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      if (typeof btoa !== 'undefined') {
        return btoa(binary);
      } else if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
      }
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      return btoa(str);
    }
  }

  window.MockBackend = {
    safeBase64Encode: safeBase64Encode,
    initSongs: function(newSongs) {
      if (Array.isArray(newSongs) && newSongs.length > 0) {
        window.SONGS_DATABASE = newSongs;
        localStorage.setItem('SONGS_DATABASE', JSON.stringify(newSongs));
        return newSongs;
      }
      return getStoredSongs();
    },

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
      } else if (userType === 'gmail_unauthorized') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'johndoe@gmail.com',
          domain: 'gmail.com',
          isDomainAllowed: false,
          hasPendingRequest: false,
          allowedDomain: 'tirwin.in',
          error: {
            code: 'ACCESS_REQUIRED',
            message: 'You need permission to access the Song Collection & Lyrics Library.'
          }
        };
      } else if (userType === 'gmail_pending') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'johndoe@gmail.com',
          domain: 'gmail.com',
          isDomainAllowed: false,
          hasPendingRequest: true,
          requestDate: getKolkataDate(),
          allowedDomain: 'tirwin.in',
          error: {
            code: 'ACCESS_PENDING',
            message: 'Your access request for johndoe@gmail.com is currently pending review by the administrator.'
          }
        };
      } else if (userType === 'unauthorized_domain') {
        activeSimulatedUser = {
          isAuthenticated: true,
          email: 'outsider@otherdomain.com',
          domain: 'otherdomain.com',
          isDomainAllowed: false,
          hasPendingRequest: false,
          allowedDomain: 'tirwin.in',
          error: {
            code: 'ACCESS_REQUIRED',
            message: 'You need permission to access the Song Collection & Lyrics Library.'
          }
        };
      } else if (userType === 'unauthenticated') {
        activeSimulatedUser = {
          isAuthenticated: false,
          email: null,
          domain: null,
          isDomainAllowed: false,
          hasPendingRequest: false,
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

    apiSubmitAccessRequest: function(reason) {
      if (!activeSimulatedUser.isAuthenticated || !activeSimulatedUser.email) {
        throw new Error('Authentication required to submit an access request.');
      }
      activeSimulatedUser.hasPendingRequest = true;
      activeSimulatedUser.requestDate = getKolkataDate();
      activeSimulatedUser.error = {
        code: 'ACCESS_PENDING',
        message: 'Your access request for ' + activeSimulatedUser.email + ' is currently pending review by the administrator.'
      };
      localStorage.setItem('SIMULATED_USER', JSON.stringify(activeSimulatedUser));
      return {
        success: true,
        requestId: 'REQ-' + Date.now(),
        email: activeSimulatedUser.email,
        status: 'PENDING',
        message: 'Access request submitted successfully for ' + activeSimulatedUser.email + '.'
      };
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

    apiUpdateSong: function(songId, songData) {
      if (!activeSimulatedUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const songs = getStoredSongs();
      const song = songs.find(s => s.id === songId);
      if (!song) throw new Error('Song with ID "' + songId + '" was not found.');

      const englishTitle = songData.englishTitle !== undefined ? songData.englishTitle.trim() : (song.englishTitle || '');
      const tamilTitle = songData.tamilTitle !== undefined ? songData.tamilTitle.trim() : (song.tamilTitle || '');
      const hindiTitle = (songData.hindiTitle !== undefined ? songData.hindiTitle : (songData.devanagariTitle !== undefined ? songData.devanagariTitle : (song.hindiTitle || ''))).trim();
      let combinedTitle = '';
      if (englishTitle && tamilTitle) {
        combinedTitle = `${englishTitle} (${tamilTitle})`;
      } else {
        combinedTitle = englishTitle || tamilTitle || hindiTitle || song.title;
      }

      song.title = combinedTitle;
      song.englishTitle = englishTitle;
      song.tamilTitle = tamilTitle;
      song.hindiTitle = hindiTitle;
      song.devanagariTitle = hindiTitle;

      if (songData.tamilLyrics !== undefined) {
        song.tamilLyrics = songData.tamilLyrics.trim();
        song.hasTamil = song.tamilLyrics.length > 0;
      }
      if (songData.englishLyrics !== undefined) {
        song.englishLyrics = songData.englishLyrics.trim();
        song.hasEnglish = song.englishLyrics.length > 0;
      }
      if (songData.devanagariLyrics !== undefined || songData.hindiLyrics !== undefined) {
        const hindi = songData.devanagariLyrics !== undefined ? songData.devanagariLyrics : songData.hindiLyrics;
        song.devanagariLyrics = (hindi || '').trim();
        song.hasDevanagari = song.devanagariLyrics.length > 0;
      }

      const timestamp = getKolkataTimestamp();
      song.updatedAt = timestamp;
      song.updatedBy = activeSimulatedUser.email || 'user@example.com';

      saveStoredSongs(songs);

      return {
        songId: songId,
        id: songId,
        title: combinedTitle,
        englishTitle: englishTitle,
        tamilTitle: tamilTitle,
        hindiTitle: hindiTitle,
        devanagariTitle: hindiTitle,
        tamilLyrics: song.tamilLyrics,
        englishLyrics: song.englishLyrics,
        devanagariLyrics: song.devanagariLyrics,
        hasTamil: song.hasTamil,
        hasEnglish: song.hasEnglish,
        hasDevanagari: song.hasDevanagari,
        updatedAt: timestamp,
        updatedBy: song.updatedBy
      };
    },

    apiCreateCollection: function(name, songIds) {
      const currentUser = getActiveUser();
      if (!currentUser.isAuthenticated) {
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
        userEmail: currentUser.email,
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
      const currentUser = getActiveUser();
      if (!currentUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      // Strict backend ownership filtering (Section 17)
      return cols.filter(c => isOwnerOfCollection(c, currentUser));
    },

    apiGetCollection: function(collectionId) {
      const currentUser = getActiveUser();
      if (!currentUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      const col = cols.find(c => c.collectionId === collectionId);
      if (!col) throw new Error('Collection not found.');

      if (!isOwnerOfCollection(col, currentUser)) {
        throw new Error('FORBIDDEN: You do not have permission to view this collection.');
      }

      const allSongs = getStoredSongs();
      const songMap = {};
      defaultSongs.forEach(s => { songMap[s.id] = s; });
      allSongs.forEach(s => { songMap[s.id] = s; });
      if (allSongs.length >= 3) {
        if (!songMap['S001']) songMap['S001'] = allSongs[0];
        if (!songMap['S002']) songMap['S002'] = allSongs[1];
        if (!songMap['S003']) songMap['S003'] = allSongs[2];
      }

      const hydrated = (col.songIds || []).map((id, idx) => songMap[id] || allSongs[idx] || defaultSongs[idx] || {
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
      const currentUser = getActiveUser();
      if (!currentUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      const col = cols.find(c => c.collectionId === collectionId);
      if (!col) throw new Error('Collection not found.');

      if (!isOwnerOfCollection(col, currentUser)) {
        throw new Error('FORBIDDEN: You do not have permission to modify this collection.');
      }

      col.name = name.trim();
      col.songIds = songIds;
      col.songCount = songIds.length;

      saveStoredCollections(cols);
      return this.apiGetCollection(collectionId);
    },

    apiDeleteCollection: function(collectionId) {
      const currentUser = getActiveUser();
      if (!currentUser.isAuthenticated) {
        throw new Error('UNAUTHORIZED: Authentication required.');
      }
      const cols = getStoredCollections();
      const colIndex = cols.findIndex(c => c.collectionId === collectionId);
      if (colIndex === -1) throw new Error('Collection not found.');

      if (!isOwnerOfCollection(cols[colIndex], currentUser)) {
        throw new Error('FORBIDDEN: You do not have permission to delete this collection.');
      }

      // STRICT REQUIREMENT: Delete the collection record only, never delete the songs!
      cols.splice(colIndex, 1);
      saveStoredCollections(cols);

      return {
        success: true,
        collectionId: collectionId,
        message: 'Collection deleted successfully.'
      };
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

    getExportSongTitle: function(s, validLang) {
      if (!s) return '';
      const langKey = (validLang || 'English').toLowerCase();
      if (langKey === 'tamil' && s.tamilTitle) {
        return s.tamilTitle + (s.englishTitle ? ' (' + s.englishTitle + ')' : '');
      } else if (langKey === 'english' && s.englishTitle) {
        return s.englishTitle + (s.tamilTitle ? ' (' + s.tamilTitle + ')' : '');
      } else if (langKey === 'devanagari' && (s.hindiTitle || s.devanagariTitle)) {
        const hTitle = s.hindiTitle || s.devanagariTitle;
        return hTitle + (s.englishTitle ? ' (' + s.englishTitle + ')' : '');
      }
      return s.title || s.englishTitle || s.tamilTitle || '';
    },

    createValidDocxBase64: function(colName, songs, lang) {
      const self = this;
      function escapeXml(str) {
        return String(str == null ? '' : str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      }

      function strToUtf8Bytes(str) {
        if (typeof TextEncoder !== 'undefined') {
          return new TextEncoder().encode(str);
        }
        const utf8 = unescape(encodeURIComponent(str));
        const arr = new Uint8Array(utf8.length);
        for (let i = 0; i < utf8.length; i++) arr[i] = utf8.charCodeAt(i);
        return arr;
      }

      function base64ToBytes(b64) {
        if (!b64) return new Uint8Array(0);
        const clean = String(b64).replace(/^data:[^;]+;base64,/, '').replace(/[\r\n\s]/g, '');
        if (typeof atob === 'function') {
          const bin = atob(clean);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          return arr;
        } else if (typeof Buffer !== 'undefined') {
          return new Uint8Array(Buffer.from(clean, 'base64'));
        }
        return new Uint8Array(0);
      }

      const crcTable = (function() {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
          let c = n;
          for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
          }
          table[n] = c >>> 0;
        }
        return table;
      })();

      function crc32(bytes) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
          crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }

      function createZipBytes(files) {
        const localParts = [];
        const centralParts = [];
        let offset = 0;

        for (let i = 0; i < files.length; i++) {
          const nameBytes = strToUtf8Bytes(files[i].name);
          const dataBytes = files[i].data instanceof Uint8Array ? files[i].data : strToUtf8Bytes(files[i].data);
          const crc = crc32(dataBytes);
          const size = dataBytes.length;

          const localHeader = new Uint8Array(30 + nameBytes.length);
          const lv = new DataView(localHeader.buffer);
          lv.setUint32(0, 0x04034b50, true);
          lv.setUint16(4, 20, true);
          lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
          lv.setUint16(8, 0, true); // STORE (no compression)
          lv.setUint16(10, 0, true);
          lv.setUint16(12, 0x2100, true);
          lv.setUint32(14, crc, true);
          lv.setUint32(18, size, true);
          lv.setUint32(22, size, true);
          lv.setUint16(26, nameBytes.length, true);
          lv.setUint16(28, 0, true);
          localHeader.set(nameBytes, 30);

          localParts.push(localHeader);
          localParts.push(dataBytes);

          const centralHeader = new Uint8Array(46 + nameBytes.length);
          const cv = new DataView(centralHeader.buffer);
          cv.setUint32(0, 0x02014b50, true);
          cv.setUint16(4, 20, true);
          cv.setUint16(6, 20, true);
          cv.setUint16(8, 0x0800, true);
          cv.setUint16(10, 0, true);
          cv.setUint16(12, 0, true);
          cv.setUint16(14, 0x2100, true);
          cv.setUint32(16, crc, true);
          cv.setUint32(20, size, true);
          cv.setUint32(24, size, true);
          cv.setUint16(28, nameBytes.length, true);
          cv.setUint16(30, 0, true);
          cv.setUint16(32, 0, true);
          cv.setUint16(34, 0, true);
          cv.setUint16(36, 0, true);
          cv.setUint32(38, 0, true);
          cv.setUint32(42, offset, true);
          centralHeader.set(nameBytes, 46);

          centralParts.push(centralHeader);
          offset += localHeader.length + dataBytes.length;
        }

        let centralSize = 0;
        for (let i = 0; i < centralParts.length; i++) centralSize += centralParts[i].length;

        const eocd = new Uint8Array(22);
        const ev = new DataView(eocd.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(4, 0, true);
        ev.setUint16(6, 0, true);
        ev.setUint16(8, files.length, true);
        ev.setUint16(10, files.length, true);
        ev.setUint32(12, centralSize, true);
        ev.setUint32(16, offset, true);
        ev.setUint16(20, 0, true);

        const totalLen = offset + centralSize + 22;
        const out = new Uint8Array(totalLen);
        let pos = 0;
        for (let i = 0; i < localParts.length; i++) {
          out.set(localParts[i], pos);
          pos += localParts[i].length;
        }
        for (let i = 0; i < centralParts.length; i++) {
          out.set(centralParts[i], pos);
          pos += centralParts[i].length;
        }
        out.set(eocd, pos);
        return out;
      }

      const headerLogoB64 = typeof LOGO_HEADER_BASE64 !== 'undefined' ? LOGO_HEADER_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');
      const watermarkB64 = typeof LOGO_IMAGE_WATERMARK_BASE64 !== 'undefined' ? LOGO_IMAGE_WATERMARK_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');
      const hasLogo = Boolean(headerLogoB64);
      const hasWatermark = Boolean(watermarkB64);

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`;

      const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>
</Relationships>`;

      const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${hasLogo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}
  ${hasWatermark ? '<Relationship Id="rIdWatermark" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/watermark.png"/>' : ''}
</Relationships>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Noto Sans Tamil" w:eastAsia="Noto Sans Devanagari"/>
        <w:sz w:val="28"/>
        <w:szCs w:val="28"/>
        <w:color w:val="0F172A"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="280" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:color w:val="4338CA"/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
    </w:rPr>
  </w:style>
</w:styles>`;

      const logoRunXml = hasLogo ? `
          <w:r xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <w:pict>
              <v:shape id="HeaderLogo" style="width:38.88pt;height:36pt;visibility:visible" stroked="f">
                <v:imagedata r:id="rIdLogo" o:title="OmkaarSSL Logo"/>
              </v:shape>
            </w:pict>
          </w:r>` : `<w:r><w:t>OmkaarSSL</w:t></w:r>`;

      const watermarkRunXml = hasWatermark ? `
          <w:r xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <w:pict>
              <v:shape id="PageWatermark" style="position:absolute;margin-left:0;margin-top:160pt;width:468pt;height:365pt;z-index:-251658752;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:page" stroked="f">
                <v:imagedata r:id="rIdWatermark" o:title="OmkaarSSL Watermark"/>
              </v:shape>
            </w:pict>
          </w:r>` : '';

      const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="6" w:space="2" w:color="CBD5E1"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="2500" w:type="pct"/>
          <w:vAlign w:val="bottom"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>
          ${logoRunXml}
          ${watermarkRunXml}
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="2500" w:type="pct"/>
          <w:vAlign w:val="bottom"/>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:jc w:val="right"/>
            <w:spacing w:before="0" w:after="40"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:color w:val="64748B"/>
              <w:sz w:val="18"/>
              <w:szCs w:val="18"/>
            </w:rPr>
            <w:t>${escapeXml(colName)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:hdr>`;

      const footer1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="2" w:color="CBD5E1"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="2500" w:type="pct"/><w:vAlign w:val="top"/></w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr>
          <w:r>
            <w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
            <w:t>© OmkaarSSL</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="2500" w:type="pct"/><w:vAlign w:val="top"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:before="40" w:after="0"/></w:pPr>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:ftr>`;

      const footer2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="2" w:color="CBD5E1"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="2500" w:type="pct"/><w:vAlign w:val="top"/></w:tcPr>
        <w:p>
          <w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr>
          <w:r>
            <w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
            <w:t>© OmkaarSSL</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="2500" w:type="pct"/><w:vAlign w:val="top"/></w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:before="40" w:after="0"/></w:pPr>
          <w:fldSimple w:instr="PAGE">
            <w:r>
              <w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
              <w:t>1</w:t>
            </w:r>
          </w:fldSimple>
        </w:p>
      </w:tc>
    </w:tr>
  </w:tbl>
</w:ftr>`;

      // Build document.xml body:
      // 1. Cover page: 6 empty paragraphs + centered 30pt (sz=60) bold collection name + page break
      let bodyXml = '';
      for (let i = 0; i < 6; i++) {
        bodyXml += `<w:p><w:pPr><w:spacing w:before="240" w:after="240"/></w:pPr></w:p>\n`;
      }
      bodyXml += `<w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="480" w:after="480"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:bCs/>
            <w:color w:val="0F172A"/>
            <w:sz w:val="60"/>
            <w:szCs w:val="60"/>
          </w:rPr>
          <w:t>${escapeXml(colName)}</w:t>
        </w:r>
      </w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>\n`;

      // 2. Subsequent pages: Songs in collection order
      const langKey = (lang || 'English').toLowerCase();
      (songs || []).forEach(s => {
        const displayTitle = self.getExportSongTitle(s, lang);
        const rawLyrics = (langKey === 'tamil' ? s.tamilLyrics : (langKey === 'devanagari' ? s.devanagariLyrics : s.englishLyrics)) || '';
        const cleanLyrics = String(rawLyrics).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
        const lines = cleanLyrics.split('\n');

        bodyXml += `<w:p>
          <w:pPr>
            <w:pStyle w:val="Heading2"/>
            <w:keepNext/>
            <w:spacing w:before="280" w:after="120"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:bCs/>
              <w:color w:val="4338CA"/>
              <w:sz w:val="32"/>
              <w:szCs w:val="32"/>
            </w:rPr>
            <w:t>${escapeXml(displayTitle)}</w:t>
          </w:r>
        </w:p>\n`;

        bodyXml += `<w:p>
          <w:pPr>
            <w:spacing w:before="60" w:after="320" w:line="276" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:color w:val="0F172A"/>
              <w:sz w:val="28"/>
              <w:szCs w:val="28"/>
            </w:rPr>`;

        for (let idx = 0; idx < lines.length; idx++) {
          if (idx > 0) bodyXml += `<w:br/>`;
          bodyXml += `<w:t xml:space="preserve">${escapeXml(lines[idx])}</w:t>`;
        }

        bodyXml += `</w:r></w:p>\n`;
      });

      // Section properties: A4/Letter with 0.25in top/bottom/header/footer (360 twips), 1in left/right (1440 twips), different first page (titlePg), page numbering starting at 0 so Page 2 is numbered 1
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:headerReference w:type="first" r:id="rId2"/>
      <w:headerReference w:type="default" r:id="rId3"/>
      <w:footerReference w:type="first" r:id="rId4"/>
      <w:footerReference w:type="default" r:id="rId5"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="360" w:right="1440" w:bottom="360" w:left="1440" w:header="360" w:footer="360" w:gutter="0"/>
      <w:pgNumType w:start="0"/>
      <w:titlePg/>
    </w:sectPr>
  </w:body>
</w:document>`;

      const zipFiles = [
        { name: '[Content_Types].xml', data: contentTypesXml },
        { name: '_rels/.rels', data: rootRelsXml },
        { name: 'word/_rels/document.xml.rels', data: docRelsXml },
        { name: 'word/_rels/header1.xml.rels', data: headerRelsXml },
        { name: 'word/_rels/header2.xml.rels', data: headerRelsXml },
        { name: 'word/styles.xml', data: stylesXml },
        { name: 'word/header1.xml', data: headerXml },
        { name: 'word/header2.xml', data: headerXml },
        { name: 'word/footer1.xml', data: footer1Xml },
        { name: 'word/footer2.xml', data: footer2Xml },
        { name: 'word/document.xml', data: documentXml }
      ];

      if (hasLogo) {
        zipFiles.push({ name: 'word/media/logo.png', data: base64ToBytes(headerLogoB64) });
      }
      if (hasWatermark) {
        zipFiles.push({ name: 'word/media/watermark.png', data: base64ToBytes(watermarkB64) });
      }

      const zipBytes = createZipBytes(zipFiles);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < zipBytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, zipBytes.subarray(i, i + chunkSize));
      }
      if (typeof btoa === 'function') {
        return btoa(binary);
      } else if (typeof Buffer !== 'undefined') {
        return Buffer.from(zipBytes).toString('base64');
      }
      return '';
    },

    createValidPdfBinary: function(colName, songs, lang) {
      const self = this;
      const pages = [];

      function getByteLength(str) {
        if (typeof TextEncoder !== 'undefined') {
          return new TextEncoder().encode(str).length;
        }
        return unescape(encodeURIComponent(str)).length;
      }

      function pdfEscape(str) {
        return String(str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]/g, '');
      }

      // Page 1: Cover Page
      let p1Stream = "BT\n/F1 10 Tf\n420 810 Td\n(" + pdfEscape(colName || 'Collection') + ") Tj\nET\n";
      p1Stream += "0.8 0.84 0.88 RG 0.75 w 72 802 m 523 802 l S\n";
      p1Stream += "BT\n/F1 26 Tf\n140 440 Td\n(" + pdfEscape(colName || 'Collection') + ") Tj\nET\n";
      p1Stream += "0.8 0.84 0.88 RG 0.75 w 72 42 m 523 42 l S\n";
      p1Stream += "BT\n/F1 9 Tf\n72 28 Td\n((c) OmkaarSSL) Tj\nET\n";
      pages.push(p1Stream);

      // Subsequent pages for songs
      let curStream = "";
      let curY = 765;

      function startNewPage() {
        if (curStream) pages.push(curStream);
        const pageNum = pages.length; // Page 2 -> 1, Page 3 -> 2, etc.
        curStream = "BT\n/F1 9 Tf\n72 810 Td\n(OmkaarSSL) Tj\nET\n";
        curStream += "BT\n/F1 9 Tf\n420 810 Td\n(" + pdfEscape(colName || '') + ") Tj\nET\n";
        curStream += "0.8 0.84 0.88 RG 0.75 w 72 802 m 523 802 l S\n";
        curStream += "0.8 0.84 0.88 RG 0.75 w 72 42 m 523 42 l S\n";
        curStream += "BT\n/F1 9 Tf\n72 28 Td\n((c) OmkaarSSL) Tj\nET\n";
        curStream += "BT\n/F1 9 Tf\n510 28 Td\n(" + pageNum + ") Tj\nET\n";
        curY = 765;
      }

      startNewPage();

      (songs || []).forEach(s => {
        const langKey = (lang || 'English').toLowerCase();
        const rawLyrics = (langKey === 'tamil' ? s.tamilLyrics : (langKey === 'devanagari' ? s.devanagariLyrics : s.englishLyrics)) || '';
        const lyricsLines = String(rawLyrics).split('\n');

        if (curY < 160) {
          startNewPage();
        }

        const displayTitle = self.getExportSongTitle(s, lang);
        const safeTitle = pdfEscape(displayTitle);
        curStream += "BT\n0.26 0.22 0.79 rg\n/F1 14 Tf\n72 " + curY + " Td\n(" + safeTitle + ") Tj\n0 0 0 rg\nET\n";
        curY -= 22;

        curStream += "BT\n/F1 12 Tf\n72 " + curY + " Td\n17 TL\n";
        for (let line of lyricsLines) {
          if (curY < 75) {
            curStream += "ET\n";
            startNewPage();
            curStream += "BT\n/F1 12 Tf\n72 " + curY + " Td\n17 TL\n";
          }
          const safeLine = pdfEscape(String(line || '').substring(0, 90));
          curStream += "(" + safeLine + ") '\n";
          curY -= 17;
        }
        curStream += "ET\n";
        curY -= 22;
      });

      if (curStream) pages.push(curStream);

      let out = "%PDF-1.4\n";
      const offsets = [];
      function addObj(str) {
        offsets.push(getByteLength(out));
        out += str + "\n";
      }

      addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
      const totalPages = pages.length;
      const pageObjIds = [];
      let nextId = 4;
      for (let i = 0; i < totalPages; i++) {
        pageObjIds.push({ pageId: nextId, contentId: nextId + 1, stream: pages[i] });
        nextId += 2;
      }

      const kidsStr = pageObjIds.map(p => p.pageId + " 0 R").join(" ");
      addObj("2 0 obj\n<< /Type /Pages /Kids [" + kidsStr + "] /Count " + totalPages + " >>\nendobj");
      addObj("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");

      for (let p of pageObjIds) {
        addObj(p.pageId + " 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents " + p.contentId + " 0 R >>\nendobj");
        const streamByteLen = getByteLength(p.stream);
        addObj(p.contentId + " 0 obj\n<< /Length " + streamByteLen + " >>\nstream\n" + p.stream + "endstream\nendobj");
      }

      const xrefOffset = getByteLength(out);
      out += "xref\n0 " + (offsets.length + 1) + "\n0000000000 65535 f \n";
      for (let o of offsets) {
        out += String(o).padStart(10, "0") + " 00000 n \n";
      }
      out += "trailer\n<< /Size " + (offsets.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";
      return out;
    },

    apiExportCollection: function(collectionId, language, format, skipMissing) {
      const self = this;
      const currentUser = getActiveUser();
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

      const exportedSongsData = songsToExport.map(s => {
        let lyrics = '';
        if (lang.toLowerCase() === 'tamil') lyrics = s.tamilLyrics;
        else if (lang.toLowerCase() === 'devanagari') lyrics = s.devanagariLyrics;
        else lyrics = s.englishLyrics;
        return {
          id: s.id,
          title: self.getExportSongTitle(s, lang),
          englishTitle: s.englishTitle || '',
          tamilTitle: s.tamilTitle || '',
          hindiTitle: s.hindiTitle || s.devanagariTitle || '',
          lyrics: String(lyrics || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
        };
      });

      const cleanColName = col.name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
      const filename = `${cleanColName}_${lang}.${fmt.toLowerCase()}`;

      // Build document text content with Header and Footer structure
      let docContent = `[HEADER - Left: Logo (0.54" x 0.5") | Right: ${col.name}]\n`;
      docContent += `----------------------------------------------------------\n\n`;
      docContent += `[WATERMARK - Center of Page: OmkaarSSL logo, Full Size, Very Light Colour (7% Opacity)]\n\n`;
      docContent += `[FIRST PAGE: COVER]\n\n`;
      docContent += `                      ${col.name}\n\n`;
      docContent += `[FOOTER (PAGE 1): © OmkaarSSL]\n\n`;
      docContent += `=================== PAGE BREAK ===================\n\n`;

      exportedSongsData.forEach((s) => {
        docContent += `${s.title}\n\n${s.lyrics}\n\n`;
      });

      docContent += `\n----------------------------------------------------------\n`;
      docContent += `[FOOTER: © OmkaarSSL                           1]\n`;

      let mimeType = 'text/plain;charset=utf-8';

      const headerLogoBase64 = typeof LOGO_HEADER_BASE64 !== 'undefined' ? LOGO_HEADER_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');
      const watermarkBase64 = typeof LOGO_IMAGE_WATERMARK_BASE64 !== 'undefined' ? LOGO_IMAGE_WATERMARK_BASE64 : (typeof LOGO_IMAGE_BASE64 !== 'undefined' ? LOGO_IMAGE_BASE64 : '');

      // HTML document structure with header logo, center watermark, cover page, and footer structure
      const htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${col.name}</title>
        <style>
          @page {
            margin: 0.25in 1in;
            margin-top: 0.25in;
            margin-bottom: 0.25in;
            mso-header-margin: 0.25in;
            mso-footer-margin: 0.25in;
            mso-header: h1;
            mso-footer: f1;
            mso-first-header: fh1;
            mso-first-footer: ff1;
            mso-title-page: yes;
          }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Tamil', 'Noto Sans Devanagari', Arial, sans-serif; line-height: 1.6; margin: 0.25in 30px; position: relative; color: #0f172a; }
          .header-table { width: 100%; border-bottom: 1px solid #cbd5e1; margin: 0 0 8px 0; padding: 0; }
          .header-left { text-align: left; vertical-align: bottom; padding: 0; }
          .header-left img { width: 0.54in; height: 0.5in; opacity: 0.9; object-fit: contain; filter: brightness(1.2); display: block; margin: 0; }
          .header-right { text-align: right; font-size: 11px; color: #64748b; vertical-align: bottom; padding: 0 0 2px 0; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); -webkit-transform: translate(-50%, -50%); opacity: 1; z-index: -1000; pointer-events: none; text-align: center; width: 80%; max-width: 600px; }
          .watermark img { width: 100%; height: auto; opacity: 1; display: block; margin: 0 auto; filter: brightness(1.0) contrast(1.0); }
          .first-page-body { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 55vh; margin: 100px 0; text-align: center; }
          .collection-title-cover { text-align: center; color: #0f172a; font-size: 32px; font-weight: bold; }
          h2 { color: #4338ca; margin-top: 24px; font-size: 18px; }
          .lyrics { white-space: pre-wrap; margin-bottom: 24px; font-size: 14px; line-height: 1.8; }
          .footer-table { width: 100%; border-top: 1px solid #cbd5e1; margin: 12px 0 0 0; padding: 0; font-size: 11px; color: #64748b; }
          .footer-left { text-align: left; vertical-align: top; padding: 2px 0 0 0; }
          .footer-right { text-align: right; vertical-align: top; padding: 2px 0 0 0; }
        </style>
        </head>
        <body>
          <!-- Center of page full-size watermark with very light color and subtle opacity -->
          <div class="watermark">
            <img src="data:image/png;base64,${watermarkBase64}" alt="Watermark" />
          </div>

          <!-- First Page Header: Logo on the left, collection name on the right side -->
          <table class="header-table">
            <tr>
              <td class="header-left"><img src="data:image/png;base64,${headerLogoBase64}" alt="Logo" style="width:0.54in;height:0.5in;opacity:0.9;object-fit:contain;filter:brightness(1.2);" /></td>
              <td class="header-right">${col.name}</td>
            </tr>
          </table>

          <!-- First Page Body: Collection name in the center with increased font -->
          <div class="first-page-body">
            <div class="collection-title-cover">${col.name}</div>
          </div>

          <!-- First Page Footer: No page number -->
          <table class="footer-table" style="page-break-after: always;">
            <tr>
              <td class="footer-left">© OmkaarSSL</td>
              <td class="footer-right"></td>
            </tr>
          </table>

          <!-- Subsequent Page Header: Logo on the left, collection name on the right side -->
          <table class="header-table">
            <tr>
              <td class="header-left"><img src="data:image/png;base64,${headerLogoBase64}" alt="Logo" style="width:0.54in;height:0.5in;opacity:0.9;object-fit:contain;filter:brightness(1.2);" /></td>
              <td class="header-right">${col.name}</td>
            </tr>
          </table>

          <!-- Subsequent Pages: Songs -->
          ${exportedSongsData.map((s) => {
            return `<div class="song-entry" style="page-break-inside: avoid; margin-bottom: 24px;"><h2>${s.title}</h2><div class="lyrics">${s.lyrics.replace(/\n/g, '<br>')}</div></div>`;
          }).join('')}

          <!-- Subsequent Page Footer: Page number starting from 1 -->
          <table class="footer-table">
            <tr>
              <td class="footer-left">© OmkaarSSL</td>
              <td class="footer-right"><span style="mso-field-code:'PAGE'">1</span></td>
            </tr>
          </table>
        </body></html>
      `;

      let base64Data = '';

      if (fmt === 'DOCX') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        base64Data = this.createValidDocxBase64(col.name, songsToExport, lang);
      } else {
        // PDF format: generate valid PDF-1.4 binary data
        mimeType = 'application/pdf';
        const pdfBinary = this.createValidPdfBinary(col.name, songsToExport, lang);
        base64Data = safeBase64Encode(pdfBinary);
      }

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
        htmlDoc: htmlDoc,
        collectionName: col.name,
        songs: exportedSongsData,
        driveUrl: 'https://drive.google.com/drive/u/0/my-drive',
        userEmail: currentUser && currentUser.email ? currentUser.email : 'user@example.com',
        savedToDrive: true,
        songCount: songsToExport.length,
        language: lang,
        format: fmt
      };
    }
  };
})();
