<script setup>
import { ref, computed } from 'vue'
import { 
  User, Image as ImageIcon, Music, Sliders, Download, Check, 
  Upload, Play, Pause, Video, RotateCcw, Sparkles, FileAudio, ShieldCheck,
  Plus, Trash2, Users, Search, Link as LinkIcon, FileVideo, Flame, Music2, Loader2,
  Type, AlignLeft, AlignCenter, AlignRight
} from 'lucide-vue-next'
import { 
  storyState, isAudioPlaying, useStoryState, fileToDataUrl 
} from '../composables/useStoryState'

const props = defineProps({
  onExportImage: Function,
  onExportVideo: Function,
  isExporting: Boolean
})

const { 
  resetToDefaults, setAudioFile, setAudioUrl, togglePlayAudio, generateSampleAudio,
  savedAccounts, activeAccountId, switchAccount, addAccount, deleteAccount,
  searchOnlineMusic, applyOnlineTrack, isSearchingMusic, musicSearchResults,
  musicSearchError, isExtractingAudio, extractAudioFromVideo,
  fetchLyrics, isFetchingLyrics, lyricsFetchStatus, lyricsFetchMessage
} = useStoryState()

const handleAddNewAccount = () => {
  const count = savedAccounts.value.length + 1
  addAccount({
    username: `akun_${count}`,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    timeAgo: '1h',
    isVerified: false
  })
}

const activeTab = ref('profile')
const videoDuration = ref(15)

// Music Import Tabs
const musicImportTab = ref('search') // 'search' | 'local' | 'video' | 'url'
const musicSearchQuery = ref('')
const customAudioUrlInput = ref('')

// File Input Refs
const avatarInputRef = ref(null)
const mediaInputRef = ref(null)
const musicCoverInputRef = ref(null)
const audioInputRef = ref(null)
const videoExtractInputRef = ref(null)

const handleSearchMusic = () => {
  if (musicSearchQuery.value.trim()) {
    searchOnlineMusic(musicSearchQuery.value)
  }
}

const handleQuickSearch = (query) => {
  musicSearchQuery.value = query
  searchOnlineMusic(query)
}

const handleExtractVideo = (e) => {
  const file = e.target.files[0]
  if (file) {
    extractAudioFromVideo(file)
  }
}

const handleApplyCustomAudioUrl = () => {
  if (customAudioUrlInput.value.trim()) {
    setAudioUrl(customAudioUrlInput.value.trim())
    customAudioUrlInput.value = ''
  }
}

// Handlers for File Uploads (Converting to Base64 to survive page refresh & persist in storage)
const onAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (file) {
    const base64 = await fileToDataUrl(file, 400, 400, 0.88)
    if (base64) {
      storyState.avatarUrl = base64
    }
  }
}

const onMediaUpload = async (e) => {
  const file = e.target.files[0]
  if (file) {
    const isVid = file.type.startsWith('video/')
    storyState.mediaType = isVid ? 'video' : 'image'
    if (isVid) {
      if (file.size < 25 * 1024 * 1024) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          storyState.mediaUrl = ev.target.result
        }
        reader.readAsDataURL(file)
      } else {
        storyState.mediaUrl = URL.createObjectURL(file)
      }
    } else {
      const base64 = await fileToDataUrl(file, 1080, 1920, 0.85)
      storyState.mediaUrl = base64 || URL.createObjectURL(file)
    }
  }
}

const onMusicCoverUpload = async (e) => {
  const file = e.target.files[0]
  if (file) {
    const base64 = await fileToDataUrl(file, 400, 400, 0.85)
    storyState.coverUrl = base64 || URL.createObjectURL(file)
  }
}

const onAudioUpload = (e) => {
  const file = e.target.files[0]
  if (file) {
    setAudioFile(file)
  }
}

// Preset Backgrounds
const presetBackgrounds = [
  { name: 'Architecture & Portrait', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=80' },
  { name: 'Pantai Tropis', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80' },
  { name: 'Pemandangan Kota', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1080&q=80' },
  { name: 'Aesthetic Sunset', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1080&q=80' },
  { name: 'Cafe & Coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80' }
]

const selectPresetBg = (url) => {
  storyState.mediaType = 'image'
  storyState.mediaUrl = url
}

// Preset Songs
const presetSongs = [
  { 
    title: 'honeybee (Orchestral Version)', 
    artist: 'smked', 
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80' 
  },
  { 
    title: 'BIRDS OF A FEATHER', 
    artist: 'Billie Eilish', 
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80' 
  },
  { 
    title: 'Die With A Smile', 
    artist: 'Lady Gaga & Bruno Mars', 
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80' 
  }
]

const handleFetchLyrics = () => {
  fetchLyrics(storyState.songTitle, storyState.artistName)
}

const lyricLinesList = computed(() => {
  if (!storyState.lyricsRawText) return []
  return storyState.lyricsRawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
})

const selectPresetSong = (song) => {
  storyState.songTitle = song.title
  storyState.artistName = song.artist
  storyState.coverUrl = song.cover
  fetchLyrics(song.title, song.artist)
}

const applySafieraPreset = () => {
  storyState.username = 'safieranrl_'
  storyState.timeAgo = '17h'
  storyState.artistName = 'smked'
  storyState.songTitle = 'honeybee (Orchestral Version)'
  storyState.segmentCount = 4
  storyState.activeSegment = 1
  storyState.hasMusic = true
  storyState.showMusicInHeader = true
  storyState.showMusicSticker = false
  storyState.showSpeakerBtn = true
  storyState.showPauseBtn = true
  storyState.showMenuBtn = true
  storyState.showMessageBar = true
  storyState.showHeartBtn = true
  storyState.showSendBtn = true
  fetchLyrics('honeybee', 'smked')
}
</script>

<template>
  <div class="w-full lg:w-[450px] xl:w-[480px] h-full flex flex-col bg-[#141418] border-r border-white/10 shadow-2xl flex-shrink-0">
    <!-- Panel Header -->
    <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#191920]">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shadow-md">
          <Sparkles class="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 class="text-xs font-bold tracking-tight text-white leading-none">IG Story Generator</h1>
          <p class="text-[10px] text-neutral-400 mt-0.5">Versi Terbaru · Presisi Piksel Instagram</p>
        </div>
      </div>

      <!-- Reset button -->
      <button 
        @click="resetToDefaults"
        class="text-xs text-neutral-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        title="Kembalikan ke pengaturan awal"
      >
        <RotateCcw class="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center border-b border-white/10 bg-[#121216] px-2 overflow-x-auto scrollbar-none">
      <button 
        @click="activeTab = 'profile'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'profile' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <User class="w-3.5 h-3.5" />
        <span>Profil</span>
      </button>

      <button 
        @click="activeTab = 'content'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'content' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <ImageIcon class="w-3.5 h-3.5" />
        <span>Konten</span>
      </button>

      <button 
        @click="activeTab = 'caption'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'caption' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <Type class="w-3.5 h-3.5 text-pink-400" />
        <span>Tulisan (Aa)</span>
      </button>

      <button 
        @click="activeTab = 'elements'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'elements' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <Sliders class="w-3.5 h-3.5" />
        <span>Elemen IG</span>
      </button>

      <button 
        @click="activeTab = 'music'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'music' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <Music class="w-3.5 h-3.5" />
        <span>Musik</span>
      </button>

      <button 
        @click="activeTab = 'export'"
        class="flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap"
        :class="activeTab === 'export' ? 'border-pink-500 text-white bg-white/5' : 'border-transparent text-neutral-400 hover:text-neutral-200'"
      >
        <Download class="w-3.5 h-3.5" />
        <span>Ekspor</span>
      </button>
    </div>

    <!-- Tab Contents (Scrollable) -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
      
      <!-- TAB 1: DATA PROFIL -->
      <div v-show="activeTab === 'profile'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Identitas Akun Story</h2>
          <p class="text-xs text-neutral-500">Kelola dan ganti akun secara instan (tersimpan di cookies/storage).</p>
        </div>

        <!-- Manajemen Multi-Akun (Tersimpan di Cookies/Storage) -->
        <div class="p-3 bg-black/40 border border-white/10 rounded-2xl space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5 text-pink-400" />
              <span class="text-xs font-bold text-white">Akun Tersimpan</span>
              <span class="text-[10px] px-1.5 py-0.2 bg-white/10 text-neutral-300 rounded-full font-mono">{{ savedAccounts.length }}</span>
            </div>
            <button 
              @click="handleAddNewAccount"
              class="text-[11px] font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 transition-colors"
            >
              <Plus class="w-3 h-3" />
              <span>Tambah Akun</span>
            </button>
          </div>

          <!-- Account Carousel / List -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <div 
              v-for="acc in savedAccounts" 
              :key="acc.id"
              @click="switchAccount(acc.id)"
              class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all flex-shrink-0 group relative select-none"
              :class="activeAccountId === acc.id 
                ? 'bg-pink-600/20 border-pink-500 shadow-md ring-1 ring-pink-500/50' 
                : 'bg-black/30 border-white/10 hover:border-white/20 text-neutral-300'"
            >
              <div class="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/30 flex-shrink-0">
                <img :src="acc.avatarUrl" :alt="acc.username" class="w-full h-full object-cover" />
              </div>

              <div class="flex flex-col pr-1">
                <span class="text-xs font-semibold max-w-[100px] truncate leading-tight" :class="activeAccountId === acc.id ? 'text-white' : 'text-neutral-300'">
                  @{{ acc.username }}
                </span>
                <span class="text-[9px] text-neutral-400 leading-none mt-0.5">
                  {{ acc.isVerified ? 'Verified' : acc.timeAgo }}
                </span>
              </div>

              <!-- Delete account button (if more than 1) -->
              <button 
                v-if="savedAccounts.length > 1"
                @click.stop="deleteAccount(acc.id)"
                class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-neutral-500 transition-opacity ml-0.5"
                title="Hapus akun ini"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
          <p class="text-[10px] text-neutral-500 italic">Data akun otomatis tersimpan di cookies & storage browser Anda.</p>
        </div>

        <!-- Foto Profil -->
        <div class="space-y-2">
          <label class="block text-xs font-medium text-neutral-300">Foto Profil Akun</label>
          <div class="flex items-center gap-3.5">
            <div class="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/20 flex-shrink-0">
              <img 
                :src="storyState.avatarUrl" 
                alt="Avatar" 
                class="w-full h-full object-cover"
                crossorigin="anonymous"
              />
            </div>
            <div class="flex-1 space-y-1.5">
              <input 
                type="file" 
                ref="avatarInputRef" 
                accept="image/*" 
                class="hidden" 
                @change="onAvatarUpload"
              />
              <button 
                @click="avatarInputRef.click()"
                class="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>Unggah Foto Profil</span>
              </button>
              <input 
                type="text" 
                v-model="storyState.avatarUrl" 
                placeholder="Atau link URL avatar..." 
                class="w-full px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <!-- Username -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-neutral-300">Username</label>
          <input 
            type="text" 
            v-model="storyState.username" 
            placeholder="Contoh: teduh.photo" 
            class="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <!-- Waktu Posting -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-neutral-300">Waktu Posting</label>
          <div class="flex gap-2">
            <input 
              type="text" 
              v-model="storyState.timeAgo" 
              placeholder="Contoh: 22h, 45m" 
              class="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
            />
            <div class="flex gap-1">
              <button 
                v-for="t in ['15m', '2h', '18h', '22h']" 
                :key="t" 
                @click="storyState.timeAgo = t"
                class="px-2.5 py-1.5 rounded-lg text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
              >
                {{ t }}
              </button>
            </div>
          </div>
        </div>

        <!-- Centang Biru (Verified Toggle) -->
        <div class="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-[#0095f6]/10 flex items-center justify-center text-[#0095f6]">
              <ShieldCheck class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs font-semibold text-white">Centang Biru (Verified)</div>
              <div class="text-[10px] text-neutral-400">Badge verifikasi resmi Instagram</div>
            </div>
          </div>

          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="storyState.isVerified" class="sr-only peer" />
            <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0095f6]"></div>
          </label>
        </div>
      </div>

      <!-- TAB 2: KONTEN UTAMA -->
      <div v-show="activeTab === 'content'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Latar Belakang Story</h2>
          <p class="text-xs text-neutral-500">Foto atau video berasio 9:16.</p>
        </div>

        <!-- Tipe Media -->
        <div class="flex rounded-xl p-1 bg-black/40 border border-white/10">
          <button 
            @click="storyState.mediaType = 'image'"
            class="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            :class="storyState.mediaType === 'image' ? 'bg-pink-600 text-white shadow' : 'text-neutral-400 hover:text-white'"
          >
            <ImageIcon class="w-3.5 h-3.5" />
            <span>Foto</span>
          </button>
          <button 
            @click="storyState.mediaType = 'video'"
            class="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
            :class="storyState.mediaType === 'video' ? 'bg-pink-600 text-white shadow' : 'text-neutral-400 hover:text-white'"
          >
            <Video class="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
        </div>

        <!-- Upload File Media -->
        <div class="space-y-2">
          <input 
            type="file" 
            ref="mediaInputRef" 
            :accept="storyState.mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'" 
            class="hidden" 
            @change="onMediaUpload"
          />
          <div 
            @click="mediaInputRef.click()"
            class="border-2 border-dashed border-white/15 hover:border-pink-500/50 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-black/20 hover:bg-black/40 text-center group"
          >
            <div class="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-pink-500/10 flex items-center justify-center text-neutral-300 group-hover:text-pink-400 transition-colors mb-2">
              <Upload class="w-5 h-5" />
            </div>
            <p class="text-xs font-semibold text-white">Pilih File {{ storyState.mediaType === 'video' ? 'Video' : 'Foto' }}</p>
            <p class="text-[10px] text-neutral-400 mt-0.5">JPG, PNG, WEBP, MP4</p>
          </div>

          <input 
            type="text" 
            v-model="storyState.mediaUrl" 
            placeholder="Atau tempel link URL foto..." 
            class="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <!-- Preset Backgrounds -->
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-neutral-300">Pilihan Latar Belakang Cepat</label>
          <div class="grid grid-cols-5 gap-2">
            <button 
              v-for="bg in presetBackgrounds" 
              :key="bg.name"
              @click="selectPresetBg(bg.url)"
              class="group relative aspect-[9/16] rounded-lg overflow-hidden border border-white/10 hover:border-pink-500 transition-all shadow-sm"
              :title="bg.name"
            >
              <img :src="bg.url" :alt="bg.name" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            </button>
          </div>
        </div>

        <!-- Overlay Vignette -->
        <div class="space-y-2 p-3 bg-black/30 border border-white/10 rounded-xl">
          <div class="flex items-center justify-between text-xs">
            <span class="text-neutral-300 font-medium">Gradasi Kontras Teks (Vignette)</span>
            <span class="text-neutral-400 font-mono">{{ storyState.overlayDarkness }}%</span>
          </div>
          <input 
            type="range" 
            v-model.number="storyState.overlayDarkness" 
            min="0" 
            max="70" 
            class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <!-- TAB: TULISAN / CAPTION STORY (Aa) -->
      <div v-show="activeTab === 'caption'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2 flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Tulisan / Caption Story (Aa)</h2>
            <p class="text-xs text-neutral-500">Ketik dialog AU, kutipan, atau narasi cerita.</p>
          </div>
          <!-- Toggle Caption On/Off -->
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="storyState.hasCaption" class="sr-only peer" />
            <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        <div v-if="storyState.hasCaption" class="space-y-3.5">
          <!-- Textarea Input -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-medium text-neutral-300">Teks Tulisan (Enter untuk baris baru):</label>
              <div class="flex items-center gap-2">
                <button 
                  v-if="storyState.captionText"
                  @click="storyState.captionText = ''; storyState.hasCaption = false"
                  class="text-[10px] text-red-400 hover:text-red-300 underline"
                >
                  Hapus Tulisan
                </button>
                <span class="text-[10px] text-pink-400">Bisa digeser di preview</span>
              </div>
            </div>
            <textarea 
              v-model="storyState.captionText"
              rows="4"
              placeholder="Ketik teks cerita atau dialog AU di sini..."
              class="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 resize-none font-sans leading-relaxed"
            ></textarea>
          </div>

          <!-- Quick AU Quotes / Preset Chips -->
          <div class="space-y-1">
            <span class="text-[10px] text-neutral-400">Contoh Tulisan AU Cepat:</span>
            <div class="flex items-center gap-1 flex-wrap">
              <button 
                v-for="quote in [
                  'SELUCU APA ANAK-ANAK\nKARENA IBUNYA MANIS\nSEKALI?',
                  'hari ini rasanya tenang banget.',
                  'kita tidak pernah benar-benar asing,\nhanya memilih diam.',
                  'you will always be my favorite what if.',
                  'bisa diulang gak hari ini?'
                ]"
                :key="quote"
                @click="storyState.captionText = quote"
                class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 truncate max-w-[200px]"
              >
                {{ quote.replace('\n', ' ') }}
              </button>
            </div>
          </div>

          <!-- Gaya Huruf Instagram (5 Pilihan) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-neutral-300">Gaya Huruf Instagram:</label>
            <div class="grid grid-cols-5 gap-1.5">
              <button 
                v-for="st in [
                  { id: 'modern', label: 'Modern' },
                  { id: 'highlight', label: 'Kotak' },
                  { id: 'typewriter', label: 'Ketik' },
                  { id: 'neon', label: 'Neon' },
                  { id: 'serif', label: 'Serif' }
                ]"
                :key="st.id"
                @click="storyState.captionStyle = st.id"
                class="py-2 px-1 rounded-xl text-xs font-semibold border text-center transition-all flex flex-col items-center justify-center gap-0.5"
                :class="storyState.captionStyle === st.id ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow' : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'"
              >
                <span>{{ st.label }}</span>
              </button>
            </div>
          </div>

          <!-- Tombol Highlight Background [A*] & Rata Teks (Alignment) -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl space-y-3">
            <div class="flex items-center justify-between">
              <!-- Instagram [A] Highlight Toggle -->
              <div class="flex items-center gap-2">
                <button 
                  @click="storyState.hasCaptionHighlight = !storyState.hasCaptionHighlight"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5"
                  :class="storyState.hasCaptionHighlight ? 'bg-white text-black border-white shadow' : 'bg-black/50 text-neutral-400 border-white/20 hover:text-white'"
                >
                  <span>[A]</span>
                  <span>Highlight Blok</span>
                </button>
              </div>

              <!-- Alignment Buttons (Left, Center, Right) -->
              <div class="flex p-0.5 rounded-lg bg-black/50 border border-white/10">
                <button 
                  @click="storyState.captionAlign = 'left'"
                  class="p-1.5 rounded-md transition-colors"
                  :class="storyState.captionAlign === 'left' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'"
                  title="Rata Kiri"
                >
                  <AlignLeft class="w-3.5 h-3.5" />
                </button>
                <button 
                  @click="storyState.captionAlign = 'center'"
                  class="p-1.5 rounded-md transition-colors"
                  :class="storyState.captionAlign === 'center' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'"
                  title="Rata Tengah"
                >
                  <AlignCenter class="w-3.5 h-3.5" />
                </button>
                <button 
                  @click="storyState.captionAlign = 'right'"
                  class="p-1.5 rounded-md transition-colors"
                  :class="storyState.captionAlign === 'right' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'"
                  title="Rata Kanan"
                >
                  <AlignRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Warna Huruf & Warna Highlight -->
            <div class="space-y-2 pt-2 border-t border-white/5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-300">Warna Teks:</span>
                <div class="flex items-center gap-1.5">
                  <button 
                    v-for="c in ['#ffffff', '#000000', '#facc15', '#fb7185', '#38bdf8', '#a3e635', '#c084fc']" 
                    :key="c"
                    @click="storyState.captionColor = c"
                    class="w-5 h-5 rounded-full border transition-all"
                    :style="{ backgroundColor: c }"
                    :class="storyState.captionColor === c ? 'ring-2 ring-pink-500 scale-110 border-white' : 'border-white/20'"
                  ></button>
                </div>
              </div>

              <!-- Pilihan Warna Background Highlight jika diaktifkan -->
              <div v-if="storyState.hasCaptionHighlight || storyState.captionStyle === 'highlight'" class="flex items-center justify-between text-xs pt-1">
                <span class="text-neutral-300">Warna Highlight:</span>
                <div class="flex items-center gap-1.5">
                  <button 
                    v-for="bc in ['#000000', '#ffffff', '#e11d48', '#2563eb', '#16a34a', '#d97706', '#9333ea']" 
                    :key="bc"
                    @click="storyState.captionBgColor = bc"
                    class="w-5 h-5 rounded-full border transition-all"
                    :style="{ backgroundColor: bc }"
                    :class="storyState.captionBgColor === bc ? 'ring-2 ring-pink-500 scale-110 border-white' : 'border-white/20'"
                  ></button>
                </div>
              </div>
            </div>

            <!-- Slider Ukuran Huruf -->
            <div class="space-y-1 pt-1 border-t border-white/5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-300">Ukuran Huruf:</span>
                <span class="font-mono text-neutral-400">{{ storyState.captionFontSize }}px</span>
              </div>
              <input 
                type="range" 
                v-model.number="storyState.captionFontSize" 
                min="16" 
                max="44" 
                class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- Slider Lebar Blok Tulisan (Canva-style Text Width) -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-300">Lebar Blok Tulisan:</span>
                <span class="font-mono text-pink-400 font-medium">{{ storyState.captionWidth || 80 }}%</span>
              </div>
              <input 
                type="range" 
                v-model.number="storyState.captionWidth" 
                min="30" 
                max="95" 
                class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
              <div class="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                <button 
                  @click="storyState.captionWidth = 50" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionWidth === 50 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Sempit (50%)
                </button>
                <button 
                  @click="storyState.captionWidth = 75" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionWidth === 75 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Sedang (75%)
                </button>
                <button 
                  @click="storyState.captionWidth = 90" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionWidth === 90 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Lebar (90%)
                </button>
              </div>
            </div>

            <!-- Slider & Preset Intensitas Bayangan Teks (Shadow) -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-300">Bayangan Teks (Shadow):</span>
                <span class="font-mono text-pink-400 font-medium">
                  {{ (storyState.captionShadow ?? 0) === 0 ? 'Mati (0%)' : `${storyState.captionShadow}%` }}
                </span>
              </div>
              <input 
                type="range" 
                v-model.number="storyState.captionShadow" 
                min="0" 
                max="100" 
                class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
              <div class="flex items-center justify-between text-[10px] text-neutral-500 pt-0.5">
                <button 
                  @click="storyState.captionShadow = 0" 
                  class="hover:text-pink-300 transition-colors"
                  :class="(storyState.captionShadow ?? 0) === 0 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Mati (0%)
                </button>
                <button 
                  @click="storyState.captionShadow = 20" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionShadow === 20 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Tipis (20%)
                </button>
                <button 
                  @click="storyState.captionShadow = 45" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionShadow === 45 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Sedang (45%)
                </button>
                <button 
                  @click="storyState.captionShadow = 75" 
                  class="hover:text-pink-300 transition-colors"
                  :class="storyState.captionShadow === 75 ? 'text-pink-400 font-semibold underline' : ''"
                >
                  Tebal (75%)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: ELEMEN UI INSTAGRAM (DIPERKAYA SESUAI SCREENSHOT) -->
      <div v-show="activeTab === 'elements'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Elemen UI Instagram Story</h2>
          <p class="text-xs text-neutral-500">Konfigurasi bar, ikon, dan kontrol persis seperti IG saat ini.</p>
        </div>

        <!-- Segmented Progress Bar Settings -->
        <div class="p-3.5 bg-black/30 border border-white/10 rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Garis Story Progress Bar</div>
              <div class="text-[10px] text-neutral-400">Garis durasi segmen di bagian atas</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showProgressBar" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <div v-if="storyState.showProgressBar" class="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
            <div class="space-y-1">
              <span class="text-[11px] text-neutral-400">Jumlah Segmen:</span>
              <div class="flex gap-1">
                <button 
                  v-for="n in [1, 2, 3, 4]" 
                  :key="n"
                  @click="storyState.segmentCount = n"
                  class="flex-1 py-1 rounded text-xs border text-center transition-all"
                  :class="storyState.segmentCount === n ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-bold' : 'bg-black/30 border-white/10 text-neutral-400'"
                >
                  {{ n }}
                </button>
              </div>
            </div>

            <div class="space-y-1">
              <span class="text-[11px] text-neutral-400">Segmen Aktif:</span>
              <div class="flex gap-1">
                <button 
                  v-for="s in storyState.segmentCount" 
                  :key="s"
                  @click="storyState.activeSegment = s"
                  class="flex-1 py-1 rounded text-xs border text-center transition-all"
                  :class="storyState.activeSegment === s ? 'bg-white/20 border-white text-white font-bold' : 'bg-black/30 border-white/10 text-neutral-400'"
                >
                  {{ s }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <!-- Tombol Pause/Play '||' -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Tombol Jeda / Pause '||'</div>
              <div class="text-[10px] text-neutral-400">Ikon pause di kanan atas (seperti di screenshot IG)</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showPauseBtn" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <!-- Titik Tiga (Menu '•••') -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Titik Tiga '•••'</div>
              <div class="text-[10px] text-neutral-400">Menu tiga titik di kanan atas</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showMenuBtn" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <!-- Tombol Silang (X) -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Tombol Silang 'X'</div>
              <div class="text-[10px] text-neutral-400">Biasa muncul jika dibuka dari direct message</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showCloseBtn" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <!-- Kolom "Reply to [username]..." -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-medium text-white">Kolom Kapsul Balas Cerita</div>
                <div class="text-[10px] text-neutral-400">Format default: "Reply to {{ storyState.username }}..."</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="storyState.showMessageBar" class="sr-only peer" />
                <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
            <input 
              v-if="storyState.showMessageBar"
              type="text" 
              v-model="storyState.customPlaceholder" 
              placeholder="Kosongkan untuk otomatis 'Reply to {username}...'" 
              class="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-neutral-500"
            />
          </div>

          <!-- Ikon Hati (Love) -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Ikon Hati (Love Button)</div>
              <div class="text-[10px] text-neutral-400">Ikon suka di samping kanan kapsul</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showHeartBtn" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>

          <!-- Ikon Pesawat Kertas (Share) -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-white">Ikon Pesawat Kertas (Share / DM)</div>
              <div class="text-[10px] text-neutral-400">Ikon kirim direct message</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="storyState.showSendBtn" class="sr-only peer" />
              <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- TAB 4: FITUR MUSIK -->
      <div v-show="activeTab === 'music'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2 flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Stiker & Audio Musik</h2>
            <p class="text-xs text-neutral-500">Stiker musik Instagram interaktif.</p>
          </div>

          <!-- Toggle Music On/Off -->
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="storyState.hasMusic" class="sr-only peer" />
            <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        <div v-if="storyState.hasMusic" class="space-y-3.5">
          <!-- Quick Preset Button for the user's reference -->
          <div class="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-pink-300">Preset Contoh IG (safieranrl_)</div>
              <div class="text-[10px] text-neutral-400">smked · honeybee (Orchestral Version)</div>
            </div>
            <button 
              @click="applySafieraPreset"
              class="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold transition-colors shadow"
            >
              Gunakan
            </button>
          </div>

          <!-- Pilihan Lokasi Tampilan Musik -->
          <div class="p-3 bg-black/30 border border-white/10 rounded-xl space-y-2.5">
            <span class="block text-xs font-semibold text-neutral-200">Penempatan Tampilan Musik:</span>

            <!-- Toggle Musik di Header (Bawah Username) -->
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-white">Di Header Bawah Nama Akun</div>
                <div class="text-[10px] text-neutral-400">Seperti contoh screenshot IG: |•| artist · song</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="storyState.showMusicInHeader" class="sr-only peer" />
                <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            <!-- Toggle Ikon Speaker Suara di Kanan Atas -->
            <div class="flex items-center justify-between pt-1 border-t border-white/5">
              <div>
                <div class="text-xs text-white">Ikon Speaker Suara di Kanan Atas</div>
                <div class="text-[10px] text-neutral-400">Ikon speaker di samping tombol pause</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="storyState.showSpeakerBtn" class="sr-only peer" />
                <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            <!-- Toggle Stiker Melayang -->
            <div class="flex items-center justify-between pt-1 border-t border-white/5">
              <div>
                <div class="text-xs text-white">Stiker Musik Melayang di Kanvas</div>
                <div class="text-[10px] text-neutral-400">Stiker kapsul cover album yang bisa digeser</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="storyState.showMusicSticker" class="sr-only peer" />
                <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            <!-- Toggle Lirik Lagu (Instagram Live Lyrics) -->
            <div class="flex items-center justify-between pt-1 border-t border-white/5">
              <div>
                <div class="text-xs text-white font-medium flex items-center gap-1.5">
                  <span>Lirik Lagu (Instagram Lyrics)</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-300 font-bold">BARU</span>
                </div>
                <div class="text-[10px] text-neutral-400">Tampilkan teks lirik lagu yang sinkron dengan lagu</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="storyState.showLyrics" class="sr-only peer" />
                <div class="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
          </div>

          <!-- PENGATURAN LIRIK LAGU (INSTAGRAM LYRICS) -->
          <div v-if="storyState.showLyrics" class="p-3.5 bg-black/40 border border-pink-500/30 rounded-2xl space-y-3 animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-pink-400" />
                <span class="text-xs font-bold text-white">Gaya & Pengaturan Lirik</span>
              </div>
              <button 
                @click="storyState.showLyrics = false"
                class="text-[10px] px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                title="Sembunyikan stiker lirik dari kanvas"
              >
                Sembunyikan Lirik
              </button>
            </div>

            <!-- KOTAK FITUR AMBIL LIRIK OTOMATIS -->
            <div class="p-3 rounded-xl bg-gradient-to-r from-pink-500/15 to-purple-500/15 border border-pink-500/30 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <Flame class="w-3.5 h-3.5 text-pink-400" />
                  <span class="text-xs font-bold text-white">Ambil Lirik Otomatis</span>
                </div>
                <button 
                  @click="handleFetchLyrics"
                  :disabled="isFetchingLyrics"
                  class="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-[11px] font-semibold flex items-center gap-1 shadow transition-all active:scale-95"
                >
                  <Loader2 v-if="isFetchingLyrics" class="w-3 h-3 animate-spin" />
                  <Sparkles v-else class="w-3 h-3" />
                  <span>{{ isFetchingLyrics ? 'Mengunduh Lirik...' : 'Cari Lirik Sekarang' }}</span>
                </button>
              </div>
              <p class="text-[10px] text-neutral-300 leading-relaxed">
                Mencari lirik otomatis dari database online untuk: <span class="text-pink-300 font-semibold">{{ storyState.songTitle || 'Judul Lagu' }}</span> · <span class="text-white">{{ storyState.artistName || 'Artis' }}</span>
              </p>
              <div 
                v-if="lyricsFetchMessage" 
                class="text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                :class="lyricsFetchStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : lyricsFetchStatus === 'error' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-pink-500/20 text-pink-200 border border-pink-500/30'"
              >
                <Check v-if="lyricsFetchStatus === 'success'" class="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span class="leading-tight">{{ lyricsFetchMessage }}</span>
              </div>
            </div>

            <!-- Pilihan Gaya Tampilan Lirik -->
            <div class="grid grid-cols-4 gap-1.5">
              <button 
                v-for="st in [
                  { id: 'bold', label: 'Bold IG' },
                  { id: 'box', label: 'Kotak IG' },
                  { id: 'multiline', label: '3 Baris' },
                  { id: 'typewriter', label: 'Ketik' }
                ]"
                :key="st.id"
                @click="storyState.lyricsStyle = st.id"
                class="py-1.5 px-1 rounded-xl text-[11px] font-medium border text-center transition-all"
                :class="storyState.lyricsStyle === st.id ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-bold' : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'"
              >
                {{ st.label }}
              </button>
            </div>

            <!-- Warna Teks Lirik -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-neutral-300">Warna Teks Lirik:</span>
              <div class="flex items-center gap-1.5">
                <button 
                  v-for="c in ['#ffffff', '#facc15', '#fb7185', '#38bdf8', '#a3e635']" 
                  :key="c"
                  @click="storyState.lyricsColor = c"
                  class="w-5 h-5 rounded-full border transition-all"
                  :style="{ backgroundColor: c }"
                  :class="storyState.lyricsColor === c ? 'ring-2 ring-pink-500 scale-110 border-white' : 'border-white/20'"
                ></button>
              </div>
            </div>

            <!-- Ukuran Huruf Slider -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-300">Ukuran Teks:</span>
                <span class="font-mono text-neutral-400">{{ storyState.lyricsFontSize }}px</span>
              </div>
              <input 
                type="range" 
                v-model.number="storyState.lyricsFontSize" 
                min="16" 
                max="32" 
                class="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- Interactive Line Selector: Pilih Baris yang Ditampilkan -->
            <div v-if="lyricLinesList.length > 0" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-medium text-neutral-300">Pilih Baris yang Ditampilkan ({{ lyricLinesList.length }} baris):</label>
                <span class="text-[10px] text-pink-300">Klik baris di bawah</span>
              </div>
              <div class="max-h-36 overflow-y-auto space-y-1 p-1.5 bg-black/50 border border-white/10 rounded-xl">
                <div 
                  v-for="(line, idx) in lyricLinesList" 
                  :key="idx"
                  @click="storyState.activeLyricIndex = idx"
                  class="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors"
                  :class="storyState.activeLyricIndex === idx ? 'bg-pink-600/30 text-pink-200 border border-pink-500/50 font-semibold' : 'text-neutral-300 hover:bg-white/5'"
                >
                  <span class="truncate pr-2">{{ line }}</span>
                  <Check v-if="storyState.activeLyricIndex === idx" class="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                </div>
              </div>
            </div>

            <!-- Input / Edit Baris Lirik Lagu Manual -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-medium text-neutral-300">Edit / Tempel Teks Lirik:</label>
                <div class="flex items-center gap-2">
                  <button 
                    v-if="storyState.lyricsRawText" 
                    @click="storyState.lyricsRawText = ''; storyState.showLyrics = false"
                    class="text-[10px] text-red-400 hover:text-red-300 underline"
                  >
                    Hapus Lirik
                  </button>
                  <span class="text-[10px] text-neutral-400">1 baris per enter</span>
                </div>
              </div>
              <textarea 
                v-model="storyState.lyricsRawText"
                rows="3"
                placeholder="Tulis atau tempel baris lirik di sini..."
                class="w-full p-2.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 resize-none font-sans"
              ></textarea>
            </div>

            <!-- Preset Lirik Cepat -->
            <div class="space-y-1">
              <span class="text-[10px] text-neutral-400">Contoh Lirik Cepat:</span>
              <div class="flex items-center gap-1 flex-wrap">
                <button 
                  @click="storyState.lyricsRawText = 'Belum ada satu bulan\nKu yakin kau sudah temukan\nPengganti diriku\nYang lebih bisa membuatmu tertawa'"
                  class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                >
                  Satu Bulan
                </button>
                <button 
                  @click="storyState.lyricsRawText = 'Birds of a feather, we should stick together\nI want you to stay\n\'Til I\'m in the grave\n\'Til I rot away, dead and buried'"
                  class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                >
                  Birds of a Feather
                </button>
                <button 
                  @click="storyState.lyricsRawText = 'I\'m buzzing like a honeybee\nWaiting for you to come to me\nSweet like summer in the afternoon\nUnderneath the golden moon'"
                  class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                >
                  honeybee
                </button>
                <button 
                  @click="storyState.lyricsRawText = 'If the world was ending\nI\'d wanna be next to you\nIf the party was over\nAnd die with a smile'"
                  class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                >
                  Die With A Smile
                </button>
              </div>
            </div>
          </div>

          <!-- Form Judul & Artis -->
          <div class="grid grid-cols-2 gap-2.5">
            <div class="space-y-1">
              <label class="block text-xs font-medium text-neutral-300">Judul Lagu</label>
              <input 
                type="text" 
                v-model="storyState.songTitle" 
                placeholder="Judul Lagu..." 
                class="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-medium text-neutral-300">Nama Artis</label>
              <input 
                type="text" 
                v-model="storyState.artistName" 
                placeholder="Nama Artis..." 
                class="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <!-- Cover Art Lagu -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-neutral-300">Cover Art Album/Lagu</label>
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 ring-1 ring-white/20 flex-shrink-0">
                <img :src="storyState.coverUrl" alt="Cover Art" class="w-full h-full object-cover" crossorigin="anonymous" />
              </div>
              <div class="flex-1 space-y-1">
                <input 
                  type="file" 
                  ref="musicCoverInputRef" 
                  accept="image/*" 
                  class="hidden" 
                  @change="onMusicCoverUpload"
                />
                <button 
                  @click="musicCoverInputRef.click()"
                  class="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium flex items-center justify-center gap-2 border border-white/10 transition-colors"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>Ganti Cover Art</span>
                </button>
                <input 
                  type="text" 
                  v-model="storyState.coverUrl" 
                  placeholder="URL Cover Art..." 
                  class="w-full px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- HUB IMPORT MUSIK (CARI ONLINE, UPLOAD MP3, EKSTRAK VIDEO, LINK) -->
          <div class="p-3.5 rounded-2xl bg-black/35 border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Music2 class="w-4 h-4 text-pink-400" />
                <span class="text-xs font-bold text-white">Sumber / Import Musik</span>
              </div>

              <!-- Play/Pause Button -->
              <button 
                @click="togglePlayAudio"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                :class="isAudioPlaying ? 'bg-pink-600 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-neutral-200'"
              >
                <component :is="isAudioPlaying ? Pause : Play" class="w-3 h-3" />
                <span>{{ isAudioPlaying ? 'Jeda' : 'Putar Musik' }}</span>
              </button>
            </div>

            <!-- Segmented Import Navigation -->
            <div class="grid grid-cols-4 gap-1 p-1 bg-black/50 border border-white/10 rounded-xl text-[11px]">
              <button 
                @click="musicImportTab = 'search'"
                class="py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all"
                :class="musicImportTab === 'search' ? 'bg-pink-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-white'"
              >
                <Search class="w-3 h-3" />
                <span>Online</span>
              </button>

              <button 
                @click="musicImportTab = 'local'"
                class="py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all"
                :class="musicImportTab === 'local' ? 'bg-pink-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-white'"
              >
                <FileAudio class="w-3 h-3" />
                <span>MP3</span>
              </button>

              <button 
                @click="musicImportTab = 'video'"
                class="py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all"
                :class="musicImportTab === 'video' ? 'bg-pink-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-white'"
              >
                <FileVideo class="w-3 h-3" />
                <span>Video</span>
              </button>

              <button 
                @click="musicImportTab = 'url'"
                class="py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all"
                :class="musicImportTab === 'url' ? 'bg-pink-600 text-white font-bold shadow' : 'text-neutral-400 hover:text-white'"
              >
                <LinkIcon class="w-3 h-3" />
                <span>Link URL</span>
              </button>
            </div>

            <!-- TAB 1: CARI LAGU ONLINE (iTunes / Apple Music Search) -->
            <div v-show="musicImportTab === 'search'" class="space-y-2.5">
              <div class="flex gap-1.5">
                <div class="relative flex-1">
                  <Search class="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                  <input 
                    type="text" 
                    v-model="musicSearchQuery" 
                    @keyup.enter="handleSearchMusic"
                    placeholder="Cari lagu apa pun (artis / judul)..." 
                    class="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
                <button 
                  @click="handleSearchMusic"
                  :disabled="isSearchingMusic"
                  class="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow"
                >
                  <Loader2 v-if="isSearchingMusic" class="w-3.5 h-3.5 animate-spin" />
                  <span v-else>Cari</span>
                </button>
              </div>

              <!-- Quick Search Chips -->
              <div class="flex items-center gap-1 flex-wrap pt-0.5">
                <span class="text-[10px] text-neutral-400 mr-1 flex items-center gap-0.5">
                  <Flame class="w-3 h-3 text-amber-400" /> Populer:
                </span>
                <button 
                  v-for="q in ['Bernadya', 'Billie Eilish', 'smked honeybee', 'Nadhif Basalamah', 'Die With A Smile', 'Coldplay']" 
                  :key="q"
                  @click="handleQuickSearch(q)"
                  class="px-2 py-0.5 rounded-md text-[10px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 transition-colors"
                >
                  {{ q }}
                </button>
              </div>

              <!-- Results List -->
              <div v-if="musicSearchResults.length > 0" class="max-h-56 overflow-y-auto space-y-1.5 pr-1 mt-2">
                <div 
                  v-for="track in musicSearchResults" 
                  :key="track.id"
                  @click="applyOnlineTrack(track)"
                  class="flex items-center justify-between p-2 rounded-xl bg-black/40 hover:bg-pink-600/15 border border-white/5 hover:border-pink-500/40 cursor-pointer transition-all group select-none"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <img :src="track.coverUrl" :alt="track.title" class="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-white/10" />
                    <div class="flex flex-col min-w-0 leading-tight">
                      <span class="text-xs font-semibold text-white group-hover:text-pink-300 truncate max-w-[170px]">
                        {{ track.title }}
                      </span>
                      <span class="text-[10px] text-neutral-400 truncate max-w-[170px] mt-0.5">
                        {{ track.artist }}
                      </span>
                    </div>
                  </div>

                  <button 
                    class="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/10 group-hover:bg-pink-600 text-white transition-colors flex-shrink-0"
                  >
                    Pasang
                  </button>
                </div>
              </div>

              <div v-else-if="!isSearchingMusic" class="p-3 text-center bg-black/20 rounded-xl border border-white/5">
                <p class="text-[11px] text-neutral-400">Ketik nama artis atau judul lagu di atas untuk mencari jutaan lagu online secara otomatis lengkap dengan cover dan audio preview 30 detik!</p>
              </div>
            </div>

            <!-- TAB 2: UNGGAH MP3 LOKAL -->
            <div v-show="musicImportTab === 'local'" class="space-y-2">
              <input 
                type="file" 
                ref="audioInputRef" 
                accept="audio/mp3,audio/wav,audio/m4a,audio/*" 
                class="hidden" 
                @change="onAudioUpload"
              />
              <div class="flex gap-2">
                <button 
                  @click="audioInputRef.click()"
                  class="flex-1 py-2 px-3 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload class="w-3.5 h-3.5" />
                  <span>Pilih File MP3 dari Laptop</span>
                </button>

                <button 
                  @click="generateSampleAudio"
                  class="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/10 transition-colors"
                  title="Hasilkan demo audio synth lo-fi"
                >
                  Demo Suara
                </button>
              </div>
              <p class="text-[10px] text-neutral-500">Mendukung berkas audio MP3, WAV, M4A, AAC dari komputer Anda.</p>
            </div>

            <!-- TAB 3: EKSTRAK AUDIO DARI VIDEO -->
            <div v-show="musicImportTab === 'video'" class="space-y-2">
              <input 
                type="file" 
                ref="videoExtractInputRef" 
                accept="video/mp4,video/webm,video/quicktime,video/*" 
                class="hidden" 
                @change="handleExtractVideo"
              />
              <button 
                @click="videoExtractInputRef.click()"
                :disabled="isExtractingAudio"
                class="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Loader2 v-if="isExtractingAudio" class="w-4 h-4 animate-spin" />
                <FileVideo v-else class="w-4 h-4" />
                <span>{{ isExtractingAudio ? 'Mengekstrak audio video...' : 'Unggah Video untuk Ambil Audionya' }}</span>
              </button>
              <p class="text-[10px] text-neutral-400">Punya video TikTok, Reel, atau video HP yang lagunya bagus? Unggah di sini dan sistem akan otomatis mengambil trek audionya!</p>
            </div>

            <!-- TAB 4: IMPORT DARI LINK / URL -->
            <div v-show="musicImportTab === 'url'" class="space-y-2">
              <div class="flex gap-2">
                <input 
                  type="text" 
                  v-model="customAudioUrlInput" 
                  placeholder="https://contoh.com/lagu.mp3" 
                  class="flex-1 px-3 py-1.5 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                />
                <button 
                  @click="handleApplyCustomAudioUrl"
                  class="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold"
                >
                  Terapkan
                </button>
              </div>
              <p class="text-[10px] text-neutral-500">Tempel URL tautan langsung ke file MP3 atau CDN audio.</p>
            </div>

            <!-- Audio Active Status Bar -->
            <div class="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-neutral-400">
              <div class="flex items-center gap-1.5 truncate max-w-[240px]">
                <span class="w-2 h-2 rounded-full" :class="storyState.audioUrl ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'"></span>
                <span class="truncate">{{ storyState.audioUrl ? (storyState.songTitle || 'Audio aktif') : 'Belum ada audio aktif' }}</span>
              </div>
              <span v-if="storyState.audioUrl" class="text-neutral-500 font-mono flex-shrink-0">
                {{ Math.round(audioDuration) }}s
              </span>
            </div>
          </div>

          <!-- Gaya Stiker Musik -->
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-neutral-300">Desain Stiker Musik</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="style in [
                  { id: 'classic', label: 'Classic White' },
                  { id: 'dark', label: 'Dark Glass' },
                  { id: 'transparent', label: 'Translucent' }
                ]"
                :key="style.id"
                @click="storyState.stickerStyle = style.id"
                class="py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all"
                :class="storyState.stickerStyle === style.id ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-black/20 border-white/10 text-neutral-400 hover:text-white'"
              >
                {{ style.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: EKSPOR -->
      <div v-show="activeTab === 'export'" class="space-y-4 animate-fade-in">
        <div class="border-b border-white/5 pb-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Unduh & Ekspor</h2>
          <p class="text-xs text-neutral-500">Hasil resolusi tinggi 1080 x 1920 Instagram 9:16.</p>
        </div>

        <!-- 1. Ekspor Gambar -->
        <div class="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <ImageIcon class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-white">Simpan sebagai Gambar</h3>
              <p class="text-[10px] text-neutral-400">Snapshot jernih resolusi tinggi 1080x1920</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <button 
              @click="props.onExportImage('png')"
              :disabled="props.isExporting"
              class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Unduh PNG</span>
            </button>

            <button 
              @click="props.onExportImage('jpg')"
              :disabled="props.isExporting"
              class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Unduh JPG</span>
            </button>
          </div>
        </div>

        <!-- 2. Ekspor Video dengan Lagu -->
        <div class="p-4 rounded-2xl bg-black/30 border border-pink-500/30 space-y-3 relative overflow-hidden">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <Video class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-white">Simpan sebagai Video (+ Lagu)</h3>
              <p class="text-[10px] text-neutral-400">Canvas capture + Web Audio API</p>
            </div>
          </div>

          <!-- Pilihan Durasi -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-neutral-300 font-medium">Durasi:</span>
              <span class="font-bold text-pink-400 font-mono">{{ videoDuration }} Detik</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="dur in [5, 10, 15]" 
                :key="dur"
                @click="videoDuration = dur"
                class="py-1 rounded-lg text-xs font-medium border text-center transition-all"
                :class="videoDuration === dur ? 'bg-pink-600/30 border-pink-500 text-pink-300 font-bold' : 'bg-black/30 border-white/10 text-neutral-400'"
              >
                {{ dur }}s
              </button>
            </div>
          </div>

          <button 
            @click="props.onExportVideo(videoDuration)"
            :disabled="props.isExporting"
            class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-600/25 active:scale-95 disabled:opacity-50"
          >
            <Video class="w-3.5 h-3.5" />
            <span>Unduh Video ({{ videoDuration }}s)</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
