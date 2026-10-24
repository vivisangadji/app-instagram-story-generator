import { reactive, ref, watch } from 'vue'

// Cookie Helpers
function getCookie(name) {
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return matches ? decodeURIComponent(matches[1]) : undefined
}

function setCookie(name, value, days = 365) {
  const d = new Date()
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

// Default Presets for Accounts
const defaultAccounts = [
  {
    id: 'acc_safiera',
    username: 'safieranrl_',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    timeAgo: '17h',
    isVerified: false
  },
  {
    id: 'acc_teduh',
    username: 'teduh.photo',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    timeAgo: '22h',
    isVerified: false
  },
  {
    id: 'acc_wanderer',
    username: 'alex.wanderer',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    timeAgo: '2h',
    isVerified: true
  }
]

// Convert uploaded File to compressed Base64 Data URL (Survives page refresh & localStorage)
export function fileToDataUrl(file, maxWidth = 500, maxHeight = 500, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const rawDataUrl = e.target.result
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return resolve(rawDataUrl)
      }
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', quality)
        resolve(compressed)
      }
      img.onerror = () => resolve(rawDataUrl)
      img.src = rawDataUrl
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Lightweight IndexedDB Storage for Media & Content (Survives full browser refresh without quota limits)
const DB_NAME = 'FakeStoryDB'
const DB_VERSION = 1
const STORE_NAME = 'story_storage'

function openStoryDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) return resolve(null)
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function idbGet(key) {
  try {
    const db = await openStoryDB()
    if (!db) return localStorage.getItem(key)
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ?? localStorage.getItem(key))
      req.onerror = () => resolve(localStorage.getItem(key))
    })
  } catch (e) {
    return localStorage.getItem(key)
  }
}

export async function idbSet(key, value) {
  try {
    if (typeof value === 'string' && value.length < 500000) {
      try { localStorage.setItem(key, value) } catch (e) {}
    }
    const db = await openStoryDB()
    if (!db) return
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(value, key)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch (e) {
    console.warn('idbSet error:', e)
  }
}

// Synchronously check localStorage for instant render without white flash
function loadSavedContentSync() {
  try {
    const raw = localStorage.getItem('ig_saved_story_content_v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    }
  } catch (e) {}
  return null
}

const savedContentSync = loadSavedContentSync()

// Load initial accounts from localStorage or cookies
function loadInitialAccounts() {
  try {
    const raw = localStorage.getItem('ig_saved_accounts_v1')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean up any stale blob: URLs that might have been saved before
        parsed.forEach(acc => {
          if (acc.avatarUrl && acc.avatarUrl.startsWith('blob:')) {
            acc.avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
          }
        })
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to load accounts from storage:', e)
  }
  return JSON.parse(JSON.stringify(defaultAccounts))
}

export const savedAccounts = ref(loadInitialAccounts())
const initialActiveId = getCookie('ig_active_acc_id') || savedAccounts.value[0]?.id || 'acc_safiera'
export const activeAccountId = ref(initialActiveId)

const activeAcc = savedAccounts.value.find(a => a.id === activeAccountId.value) || savedAccounts.value[0] || defaultAccounts[0]

const defaultState = {
  // Profile (Bound to active account)
  username: activeAcc.username,
  avatarUrl: activeAcc.avatarUrl,
  timeAgo: activeAcc.timeAgo,
  isVerified: activeAcc.isVerified,

  // Progress Bar Segments
  segmentCount: 1, // Total story bars at top (Default: 1)
  activeSegment: 1, // Currently viewing segment (1-indexed)

  // Main Content
  mediaType: savedContentSync?.mediaType || 'image', // 'image' | 'video'
  mediaUrl: savedContentSync?.mediaUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80',
  mediaFit: savedContentSync?.mediaFit || 'cover', // 'cover' | 'contain'
  overlayDarkness: typeof savedContentSync?.overlayDarkness === 'number' ? savedContentSync.overlayDarkness : 25, // 0 - 100 gradient overlay for text readability
  
  // UI Toggles
  showProgressBar: true,
  showCloseBtn: false, // In modern IG viewer, there's no X, only pause and 3-dots
  closeBtnPosition: 'right', // 'left' or 'right'
  showPauseBtn: true, // Pause '||' button in top right
  showMenuBtn: true, // 3 dots '•••' in top right
  showMessageBar: true,
  customPlaceholder: '', // If empty, will auto-format to 'Reply to {username}...'
  showHeartBtn: true,
  showSendBtn: true,
  isLiked: false,

  // Music Feature (Default OFF as requested by user)
  hasMusic: false,
  showMusicInHeader: false, // Default OFF
  showMusicSticker: false, // Display floating draggable sticker (optional)
  showLyrics: false, // Display Instagram music lyrics sticker
  lyricsStyle: 'bold', // 'bold' | 'box' | 'multiline' | 'typewriter'
  lyricsColor: '#ffffff',
  lyricsFontSize: 22,
  lyricsPos: { x: 50, y: 55 },
  activeLyricIndex: 0,
  lyricsRawText: "I'll love you 'til the day that I die\n'Til the day that I rot away, dead and buried\nBirds of a feather, we should stick together\nI want you to stay",
  syncedLyrics: '',
  hasSyncedLyrics: false,
  showSpeakerBtn: true, // Speaker volume icon in top right
  songTitle: 'honeybee (Orchestral Version)',
  artistName: 'smked',
  coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
  audioUrl: null,
  stickerStyle: 'classic', // 'classic' (white pill), 'dark' (black glass), 'transparent', 'compact'
  stickerPos: { x: 50, y: 75 }, // percentage (50% center, 75% height)
  stickerScale: 1.0,
  showEqualizer: true,

  // Story Text / Caption Feature (Instagram 'Aa' Text Sticker for AU)
  hasCaption: (savedContentSync?.hasCaption && savedContentSync?.captionText && savedContentSync?.captionText !== 'SELUCU APA ANAK-ANAK\nKARENA IBUNYA MANIS\nSEKALI?') ? true : false,
  captionText: (savedContentSync?.captionText && savedContentSync?.captionText !== 'SELUCU APA ANAK-ANAK\nKARENA IBUNYA MANIS\nSEKALI?') ? savedContentSync.captionText : '',
  captionStyle: savedContentSync?.captionStyle || 'modern', // 'modern' | 'highlight' | 'typewriter' | 'neon' | 'serif'
  captionColor: savedContentSync?.captionColor || '#ffffff',
  captionBgColor: savedContentSync?.captionBgColor || '#000000',
  hasCaptionHighlight: savedContentSync?.hasCaptionHighlight ?? false,
  captionFontSize: savedContentSync?.captionFontSize || 24,
  captionWidth: savedContentSync?.captionWidth || 80, // percentage (30 - 95%)
  captionShadow: typeof savedContentSync?.captionShadow === 'number' ? savedContentSync.captionShadow : 0, // 0: None / Flat, 25: Subtle, 50: Medium, 80: High
  captionAlign: savedContentSync?.captionAlign || 'center', // 'left' | 'center' | 'right'
  captionPos: savedContentSync?.captionPos || { x: 50, y: 55 }, // percentage (50% center, 55% height)
  
  // Device & Preview Settings
  showDeviceFrame: true,
  previewZoom: 100, // percentage 50 - 120
}

export const storyState = reactive({ ...defaultState })

// Asynchronously hydrate larger media items from IndexedDB
idbGet('ig_saved_story_media_v1').then((savedMedia) => {
  if (savedMedia && typeof savedMedia === 'object') {
    if (savedMedia.mediaUrl && !savedMedia.mediaUrl.startsWith('blob:')) {
      storyState.mediaUrl = savedMedia.mediaUrl
    }
    if (savedMedia.mediaType) storyState.mediaType = savedMedia.mediaType
    if (savedMedia.mediaFit) storyState.mediaFit = savedMedia.mediaFit
    if (typeof savedMedia.overlayDarkness === 'number') {
      storyState.overlayDarkness = savedMedia.overlayDarkness
    }
    if (savedMedia.captionText !== undefined) {
      if (savedMedia.captionText === 'SELUCU APA ANAK-ANAK\nKARENA IBUNYA MANIS\nSEKALI?') {
        storyState.captionText = ''
        storyState.hasCaption = false
      } else {
        storyState.captionText = savedMedia.captionText
      }
    }
    if (savedMedia.hasCaption !== undefined) {
      storyState.hasCaption = Boolean(savedMedia.hasCaption && storyState.captionText && storyState.captionText.trim().length > 0)
    }
    if (savedMedia.captionStyle) storyState.captionStyle = savedMedia.captionStyle
    if (savedMedia.captionColor) storyState.captionColor = savedMedia.captionColor
    if (savedMedia.captionBgColor) storyState.captionBgColor = savedMedia.captionBgColor
    if (savedMedia.hasCaptionHighlight !== undefined) storyState.hasCaptionHighlight = savedMedia.hasCaptionHighlight
    if (savedMedia.captionFontSize) storyState.captionFontSize = savedMedia.captionFontSize
    if (savedMedia.captionWidth) storyState.captionWidth = savedMedia.captionWidth
    if (savedMedia.captionShadow !== undefined) storyState.captionShadow = savedMedia.captionShadow
    if (savedMedia.captionAlign) storyState.captionAlign = savedMedia.captionAlign
    if (savedMedia.captionPos) storyState.captionPos = savedMedia.captionPos
  }
})

// Auto-save media content & caption changes to IndexedDB and localStorage
watch(
  [
    () => storyState.mediaUrl,
    () => storyState.mediaType,
    () => storyState.mediaFit,
    () => storyState.overlayDarkness,
    () => storyState.hasCaption,
    () => storyState.captionText,
    () => storyState.captionStyle,
    () => storyState.captionColor,
    () => storyState.captionBgColor,
    () => storyState.hasCaptionHighlight,
    () => storyState.captionFontSize,
    () => storyState.captionWidth,
    () => storyState.captionShadow,
    () => storyState.captionAlign,
    () => storyState.captionPos
  ],
  () => {
    const urlToSave = (storyState.mediaUrl && storyState.mediaUrl.startsWith('blob:')) ? '' : storyState.mediaUrl
    const contentPayload = {
      mediaUrl: urlToSave,
      mediaType: storyState.mediaType,
      mediaFit: storyState.mediaFit,
      overlayDarkness: storyState.overlayDarkness,
      hasCaption: storyState.hasCaption,
      captionText: storyState.captionText,
      captionStyle: storyState.captionStyle,
      captionColor: storyState.captionColor,
      captionBgColor: storyState.captionBgColor,
      hasCaptionHighlight: storyState.hasCaptionHighlight,
      captionFontSize: storyState.captionFontSize,
      captionWidth: storyState.captionWidth,
      captionShadow: storyState.captionShadow,
      captionAlign: storyState.captionAlign,
      captionPos: storyState.captionPos
    }
    idbSet('ig_saved_story_media_v1', contentPayload)
    try {
      if (!urlToSave || urlToSave.length < 1500000) {
        localStorage.setItem('ig_saved_story_content_v1', JSON.stringify(contentPayload))
      }
    } catch (e) {}
  },
  { deep: true }
)

// Auto-save accounts to localStorage and update cookies
function persistAccounts() {
  try {
    localStorage.setItem('ig_saved_accounts_v1', JSON.stringify(savedAccounts.value))
    setCookie('ig_active_acc_id', activeAccountId.value)
    // Also save lightweight account summary in cookie for fast access
    const summary = savedAccounts.value.map(a => a.username).join(',')
    setCookie('ig_accounts_list', summary)
  } catch (e) {
    console.warn('Storage sync error:', e)
  }
}

// Watch profile modifications to automatically save into the active account
let isInternalSwitch = false
watch(
  [() => storyState.username, () => storyState.avatarUrl, () => storyState.timeAgo, () => storyState.isVerified],
  ([username, avatarUrl, timeAgo, isVerified]) => {
    if (isInternalSwitch) return
    const acc = savedAccounts.value.find(a => a.id === activeAccountId.value)
    if (acc) {
      acc.username = username
      acc.avatarUrl = avatarUrl
      acc.timeAgo = timeAgo
      acc.isVerified = isVerified
      persistAccounts()
    }
  }
)

// Audio player instance for live preview
let previewAudio = null
export const isAudioPlaying = ref(false)
export const audioProgress = ref(0)
export const audioCurrentTime = ref(0)
export const audioDuration = ref(15)

// Automatically disable all music stickers & stop playback when music is turned off
watch(
  () => storyState.hasMusic,
  (enabled) => {
    if (!enabled) {
      storyState.showLyrics = false
      storyState.showMusicInHeader = false
      storyState.showMusicSticker = false
      if (previewAudio) {
        previewAudio.pause()
        previewAudio.currentTime = 0
      }
      isAudioPlaying.value = false
      audioProgress.value = 0
      audioCurrentTime.value = 0
    }
  }
)

export function useStoryState() {
  // Multi-Account Management Methods
  const switchAccount = (accId) => {
    const acc = savedAccounts.value.find(a => a.id === accId)
    if (!acc) return

    isInternalSwitch = true
    activeAccountId.value = acc.id
    storyState.username = acc.username
    storyState.avatarUrl = acc.avatarUrl
    storyState.timeAgo = acc.timeAgo
    storyState.isVerified = acc.isVerified
    persistAccounts()
    setTimeout(() => {
      isInternalSwitch = false
    }, 50)
  }

  const addAccount = (newAccData = {}) => {
    const newId = 'acc_' + Date.now()
    const newAccount = {
      id: newId,
      username: newAccData.username || 'user_baru',
      avatarUrl: newAccData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      timeAgo: newAccData.timeAgo || '1h',
      isVerified: newAccData.isVerified || false
    }
    savedAccounts.value.push(newAccount)
    switchAccount(newId)
    return newAccount
  }

  const deleteAccount = (accId) => {
    if (savedAccounts.value.length <= 1) {
      alert('Minimal harus ada satu akun tersimpan.')
      return
    }
    const idx = savedAccounts.value.findIndex(a => a.id === accId)
    if (idx !== -1) {
      savedAccounts.value.splice(idx, 1)
      if (activeAccountId.value === accId) {
        switchAccount(savedAccounts.value[0].id)
      } else {
        persistAccounts()
      }
    }
  }

  const resetToDefaults = () => {
    Object.assign(storyState, defaultState)
    stopAudio()
  }

  const setAudioFile = (file) => {
    if (!file) return
    if (storyState.audioUrl && storyState.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(storyState.audioUrl)
    }
    stopAudio()
    storyState.audioUrl = URL.createObjectURL(file)
    initAudioElement()
  }

  const setAudioUrl = (url) => {
    stopAudio()
    storyState.audioUrl = url
    initAudioElement()
  }

  const initAudioElement = () => {
    if (!storyState.audioUrl) return
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.src = ''
    }
    previewAudio = new Audio(storyState.audioUrl)
    previewAudio.crossOrigin = 'anonymous'
    
    previewAudio.addEventListener('loadedmetadata', () => {
      audioDuration.value = previewAudio.duration || 15
    })

    previewAudio.addEventListener('timeupdate', () => {
      if (previewAudio) {
        audioCurrentTime.value = previewAudio.currentTime
        audioProgress.value = (previewAudio.currentTime / (previewAudio.duration || 15)) * 100
      }
    })

    previewAudio.addEventListener('ended', () => {
      isAudioPlaying.value = false
      audioProgress.value = 0
      audioCurrentTime.value = 0
    })
  }

  const togglePlayAudio = () => {
    if (!storyState.audioUrl) {
      generateSampleAudio()
      return
    }

    if (!previewAudio) {
      initAudioElement()
    }

    if (previewAudio) {
      if (isAudioPlaying.value) {
        previewAudio.pause()
        isAudioPlaying.value = false
      } else {
        previewAudio.play().then(() => {
          isAudioPlaying.value = true
        }).catch(err => {
          console.error("Playback error:", err)
        })
      }
    }
  }

  const stopAudio = () => {
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
    }
    isAudioPlaying.value = false
    audioProgress.value = 0
    audioCurrentTime.value = 0
  }

  // Generates an offline audio buffer synthesized with Web Audio
  const generateSampleAudio = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const sampleRate = audioCtx.sampleRate
      const durationSeconds = 15
      const length = sampleRate * durationSeconds
      const buffer = audioCtx.createBuffer(2, length, sampleRate)

      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 392.00]  // G
      ]

      const channelL = buffer.getChannelData(0)
      const channelR = buffer.getChannelData(1)
      const chordDuration = durationSeconds / chords.length

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate
        const chordIndex = Math.min(Math.floor(t / chordDuration), chords.length - 1)
        const chord = chords[chordIndex]
        
        let sample = 0
        chord.forEach((freq, idx) => {
          const env = Math.sin((t % chordDuration) / chordDuration * Math.PI)
          sample += Math.sin(2 * Math.PI * freq * t) * (0.15 / (idx + 1)) * env
        })

        const beatTime = t % 1.0
        const kick = Math.exp(-beatTime * 15) * Math.sin(2 * Math.PI * 65 * beatTime) * 0.25

        channelL[i] = sample + kick
        channelR[i] = sample + kick
      }

      const wavBlob = audioBufferToWav(buffer)
      const url = URL.createObjectURL(wavBlob)
      storyState.audioUrl = url
      initAudioElement()
      togglePlayAudio()
    } catch (e) {
      console.warn("Could not generate synthesized audio demo:", e)
    }
  }

  // Online Music Search (iTunes / Apple Music Library API)
  const isSearchingMusic = ref(false)
  const musicSearchResults = ref([])
  const musicSearchError = ref('')

  const searchOnlineMusic = async (query) => {
    if (!query || !query.trim()) return []
    isSearchingMusic.value = true
    musicSearchError.value = ''
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`)
      const data = await res.json()
      if (data && data.results) {
        musicSearchResults.value = data.results.map(item => ({
          id: item.trackId,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName,
          coverUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg') : '',
          audioUrl: item.previewUrl,
          duration: Math.round((item.trackTimeMillis || 30000) / 1000)
        }))
        return musicSearchResults.value
      }
      return []
    } catch (err) {
      console.error('Music search error:', err)
      musicSearchError.value = 'Gagal mencari lagu: ' + (err.message || err)
      return []
    } finally {
      isSearchingMusic.value = false
    }
  }

  // Auto Lyrics Fetch API (Free lrclib.net integration)
  const isFetchingLyrics = ref(false)
  const lyricsFetchStatus = ref('') // 'success' | 'loading' | 'error' | ''
  const lyricsFetchMessage = ref('')

  const fetchLyrics = async (rawTitle, rawArtist) => {
    const title = (rawTitle || storyState.songTitle || '').trim()
    const artist = (rawArtist || storyState.artistName || '').trim()
    if (!title) return null

    isFetchingLyrics.value = true
    lyricsFetchStatus.value = 'loading'
    lyricsFetchMessage.value = `Mencari lirik otomatis untuk "${title}"...`

    // Clean up auxiliary words in song titles to maximize search hit rate
    const clean = (t) => t
      .replace(/\s*[\(\[](feat\.|with|version|remaster|orchestral|live|acoustic|slowed|reverb|from|soundtrack|sped up|remix).*?[\)\]]/gi, '')
      .replace(/\s*-\s*(single|remix|version|bonus track|from.*?)$/gi, '')
      .trim()

    const cleanTitle = clean(title) || title
    const cleanArtist = clean(artist) || artist

    try {
      let lyricData = null

      // Attempt 1: Exact match GET
      try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`
        const res = await fetch(url)
        if (res.ok) {
          lyricData = await res.json()
        }
      } catch (e) {
        console.warn('LRCLIB exact match attempt:', e)
      }

      // Attempt 2: Search with track and artist
      if (!lyricData || (!lyricData.plainLyrics && !lyricData.syncedLyrics)) {
        try {
          const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
          const res = await fetch(searchUrl)
          if (res.ok) {
            const list = await res.json()
            if (Array.isArray(list) && list.length > 0) {
              lyricData = list.find(item => item.syncedLyrics || item.plainLyrics) || list[0]
            }
          }
        } catch (e) {
          console.warn('LRCLIB track/artist search attempt:', e)
        }
      }

      // Attempt 3: General query search
      if (!lyricData || (!lyricData.plainLyrics && !lyricData.syncedLyrics)) {
        try {
          const q = `${cleanTitle} ${cleanArtist}`.trim()
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`
          const res = await fetch(searchUrl)
          if (res.ok) {
            const list = await res.json()
            if (Array.isArray(list) && list.length > 0) {
              lyricData = list.find(item => item.syncedLyrics || item.plainLyrics) || list[0]
            }
          }
        } catch (e) {
          console.warn('LRCLIB query search attempt:', e)
        }
      }

      if (lyricData && (lyricData.plainLyrics || lyricData.syncedLyrics)) {
        let text = lyricData.plainLyrics || ''
        if (!text && lyricData.syncedLyrics) {
          text = lyricData.syncedLyrics.replace(/\[\d{2}:\d{2}\.?\d{0,3}\]/g, '').trim()
        }

        const cleanLines = text
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0)

        storyState.lyricsRawText = cleanLines.join('\n')
        storyState.syncedLyrics = lyricData.syncedLyrics || ''
        storyState.hasSyncedLyrics = Boolean(lyricData.syncedLyrics)
        storyState.activeLyricIndex = 0
        storyState.showLyrics = true // Auto-activate lyrics sticker view

        lyricsFetchStatus.value = 'success'
        lyricsFetchMessage.value = `✓ Lirik otomatis berhasil dimuat (${cleanLines.length} baris${storyState.hasSyncedLyrics ? ', sinkron audio' : ''})!`
        return lyricData
      } else {
        lyricsFetchStatus.value = 'error'
        lyricsFetchMessage.value = `Lirik tidak ditemukan di database online. Kamu tetap bisa menulis/mengedit lirik secara manual di bawah.`
        return null
      }
    } catch (err) {
      console.error('Fetch lyrics error:', err)
      lyricsFetchStatus.value = 'error'
      lyricsFetchMessage.value = 'Gagal memuat lirik: ' + (err.message || 'Koneksi terganggu')
      return null
    } finally {
      isFetchingLyrics.value = false
    }
  }

  const applyOnlineTrack = (track) => {
    if (!track) return
    storyState.songTitle = track.title
    storyState.artistName = track.artist
    if (track.coverUrl) {
      storyState.coverUrl = track.coverUrl
    }
    if (track.audioUrl) {
      setAudioUrl(track.audioUrl)
      // Automatically preview audio
      setTimeout(() => {
        if (!isAudioPlaying.value) {
          togglePlayAudio()
        }
      }, 200)
    }

    // Automatically fetch lyrics from online database!
    fetchLyrics(track.title, track.artist)
  }

  // Extract Audio track from any uploaded Video (MP4 / WebM / TikTok / Reel)
  const isExtractingAudio = ref(false)
  const extractAudioFromVideo = async (videoFile) => {
    if (!videoFile) return
    isExtractingAudio.value = true
    try {
      const arrayBuffer = await videoFile.arrayBuffer()
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const wavBlob = audioBufferToWav(audioBuffer)
      setAudioFile(wavBlob)
      audioCtx.close()
      return true
    } catch (err) {
      console.error('Audio extraction error:', err)
      alert('Gagal mengekstrak audio dari video: Format video mungkin tidak memiliki trek audio standar.')
      return false
    } finally {
      isExtractingAudio.value = false
    }
  }

  return {
    storyState,
    savedAccounts,
    activeAccountId,
    switchAccount,
    addAccount,
    deleteAccount,
    isAudioPlaying,
    audioProgress,
    audioCurrentTime,
    audioDuration,
    resetToDefaults,
    setAudioFile,
    setAudioUrl,
    togglePlayAudio,
    stopAudio,
    generateSampleAudio,
    // New Music Import APIs
    isSearchingMusic,
    musicSearchResults,
    musicSearchError,
    searchOnlineMusic,
    applyOnlineTrack,
    isExtractingAudio,
    extractAudioFromVideo,
    // Auto Lyrics APIs
    fetchLyrics,
    isFetchingLyrics,
    lyricsFetchStatus,
    lyricsFetchMessage
  }
}

// Helper: Convert Web Audio AudioBuffer to WAV Blob
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const dataLength = buffer.length * blockAlign
  const bufferLength = 44 + dataLength
  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
