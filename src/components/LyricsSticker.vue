<script setup>
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { 
  storyState, isAudioPlaying, audioCurrentTime, audioDuration, useStoryState 
} from '../composables/useStoryState'

const props = defineProps({
  containerRef: {
    type: Object,
    default: null
  },
  interactive: {
    type: Boolean,
    default: true
  }
})

const { togglePlayAudio } = useStoryState()

// Split raw lines
const lines = computed(() => {
  if (!storyState.lyricsRawText || !storyState.lyricsRawText.trim()) return []
  return storyState.lyricsRawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
})

// Parse synced lyrics (LRC format: [mm:ss.xx])
const parsedSyncedLines = computed(() => {
  if (!storyState.syncedLyrics) return []
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{1,3})?\]/
  const items = []
  const rawLines = storyState.syncedLyrics.split('\n')
  for (const line of rawLines) {
    const match = timeRegex.exec(line)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0
      const time = minutes * 60 + seconds + millis / 1000
      const text = line.replace(timeRegex, '').trim()
      if (text) {
        items.push({ time, text })
      }
    }
  }
  return items.sort((a, b) => a.time - b.time)
})

// Automatically advance active lyric line when audio plays
watch(audioCurrentTime, (currentTime) => {
  if (!isAudioPlaying.value) return

  // 1. If timestamped lyrics exist from online database, sync accurately to music position
  if (parsedSyncedLines.value.length > 0) {
    let matchedIdx = -1
    for (let i = 0; i < parsedSyncedLines.value.length; i++) {
      if (parsedSyncedLines.value[i].time <= currentTime) {
        matchedIdx = i
      } else {
        break
      }
    }
    if (matchedIdx !== -1) {
      const matchedText = parsedSyncedLines.value[matchedIdx].text.toLowerCase()
      const foundInLines = lines.value.findIndex(l => l.toLowerCase() === matchedText)
      if (foundInLines !== -1 && foundInLines !== storyState.activeLyricIndex) {
        storyState.activeLyricIndex = foundInLines
      } else if (foundInLines === -1 && matchedIdx !== storyState.activeLyricIndex) {
        storyState.activeLyricIndex = Math.min(matchedIdx, lines.value.length - 1)
      }
      return
    }
  }

  // 2. Proportional fallback when no timestamps exist
  if (lines.value.length > 1) {
    const dur = audioDuration.value || 15
    const progress = Math.min(0.99, Math.max(0, currentTime / dur))
    const targetIdx = Math.floor(progress * lines.value.length)
    if (targetIdx !== storyState.activeLyricIndex) {
      storyState.activeLyricIndex = targetIdx
    }
  }
})

const currentLine = computed(() => {
  const idx = Math.max(0, Math.min(lines.value.length - 1, storyState.activeLyricIndex || 0))
  return lines.value[idx] || lines.value[0] || ''
})

const prevLine = computed(() => {
  const idx = (storyState.activeLyricIndex || 0) - 1
  return idx >= 0 ? lines.value[idx] : ''
})

const nextLine = computed(() => {
  const idx = (storyState.activeLyricIndex || 0) + 1
  return idx < lines.value.length ? lines.value[idx] : ''
})

// Dragging logic
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const startPos = ref({ x: 50, y: 55 })

const onMouseDown = (e) => {
  if (!props.interactive) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  startPos.value = { ...storyState.lyricsPos }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (!isDragging.value || !props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = ((e.clientX - dragStart.value.x) / rect.width) * 100
  const deltaY = ((e.clientY - dragStart.value.y) / rect.height) * 100

  const newX = Math.max(15, Math.min(85, startPos.value.x + deltaX))
  const newY = Math.max(15, Math.min(85, startPos.value.y + deltaY))

  storyState.lyricsPos.x = Math.round(newX * 10) / 10
  storyState.lyricsPos.y = Math.round(newY * 10) / 10
}

const onMouseUp = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// Touch support
const onTouchStart = (e) => {
  if (!props.interactive || !e.touches[0]) return
  isDragging.value = true
  const touch = e.touches[0]
  dragStart.value = { x: touch.clientX, y: touch.clientY }
  startPos.value = { ...storyState.lyricsPos }

  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
}

const onTouchMove = (e) => {
  if (!isDragging.value || !props.containerRef || !e.touches[0]) return
  e.preventDefault()
  const touch = e.touches[0]
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = ((touch.clientX - dragStart.value.x) / rect.width) * 100
  const deltaY = ((touch.clientY - dragStart.value.y) / rect.height) * 100

  const newX = Math.max(15, Math.min(85, startPos.value.x + deltaX))
  const newY = Math.max(15, Math.min(85, startPos.value.y + deltaY))

  storyState.lyricsPos.x = Math.round(newX * 10) / 10
  storyState.lyricsPos.y = Math.round(newY * 10) / 10
}

const onTouchEnd = () => {
  isDragging.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

const cycleNextLine = () => {
  if (lines.value.length > 0) {
    storyState.activeLyricIndex = (storyState.activeLyricIndex + 1) % lines.value.length
  }
}
</script>

<template>
  <div 
    v-if="storyState.hasMusic && storyState.showLyrics && lines.length > 0"
    class="absolute select-none z-30 group max-w-[85%] transition-all"
    :style="{
      left: `${storyState.lyricsPos.x}%`,
      top: `${storyState.lyricsPos.y}%`,
      transform: `translate(-50%, -50%)`,
      cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default'
    }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
  >
    <!-- GAYA 1: BOLD TYPOGRAPHY (Iconic Instagram Large Floating Text) -->
    <div 
      v-if="storyState.lyricsStyle === 'bold'"
      @dblclick.stop="cycleNextLine"
      class="text-center font-black uppercase tracking-tight text-white leading-[1.15] [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] select-none transition-all"
      :style="{ color: storyState.lyricsColor || '#ffffff', fontSize: `${storyState.lyricsFontSize || 22}px` }"
    >
      {{ currentLine }}
    </div>

    <!-- GAYA 2: KARAOKE BOX (Instagram White Box Highlight) -->
    <div 
      v-else-if="storyState.lyricsStyle === 'box'"
      @dblclick.stop="cycleNextLine"
      class="px-4 py-2.5 rounded-2xl bg-white text-black font-black uppercase tracking-tight shadow-2xl text-center leading-snug transition-all"
      :style="{ fontSize: `${Math.max(15, (storyState.lyricsFontSize || 22) - 4)}px` }"
    >
      {{ currentLine }}
    </div>

    <!-- GAYA 3: MULTI-LINE KARAOKE (3 Baris Bergulir) -->
    <div 
      v-else-if="storyState.lyricsStyle === 'multiline'"
      @dblclick.stop="cycleNextLine"
      class="flex flex-col items-center text-center space-y-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]"
      :style="{ color: storyState.lyricsColor || '#ffffff' }"
    >
      <span v-if="prevLine" class="text-xs font-semibold opacity-40 truncate max-w-[260px]">
        {{ prevLine }}
      </span>
      <span 
        class="font-black uppercase tracking-tight leading-tight px-3 py-1 rounded-xl bg-black/30 backdrop-blur-xs ring-1 ring-white/10"
        :style="{ fontSize: `${storyState.lyricsFontSize || 20}px` }"
      >
        {{ currentLine }}
      </span>
      <span v-if="nextLine" class="text-xs font-semibold opacity-40 truncate max-w-[260px]">
        {{ nextLine }}
      </span>
    </div>

    <!-- GAYA 4: TYPEWRITER (Instagram Typewriter font) -->
    <div 
      v-else-if="storyState.lyricsStyle === 'typewriter'"
      @dblclick.stop="cycleNextLine"
      class="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 font-mono font-bold text-center leading-snug text-white shadow-xl flex items-center justify-center gap-1"
      :style="{ fontSize: `${Math.max(14, (storyState.lyricsFontSize || 20) - 4)}px`, color: storyState.lyricsColor || '#ffffff' }"
    >
      <span>{{ currentLine }}</span>
      <span class="w-1.5 h-4 bg-pink-500 animate-pulse inline-block ml-0.5"></span>
    </div>

    <!-- Drag hint badge on hover -->
    <div 
      v-if="interactive"
      class="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/80 text-white px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap shadow flex items-center gap-1"
    >
      <span>Geser posisi · Klik 2x ganti baris</span>
    </div>

    <!-- Quick Dismiss (X) button -->
    <button 
      v-if="interactive"
      @click.stop="storyState.showLyrics = false"
      class="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/80 text-white hover:bg-red-600 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
      title="Sembunyikan / Hapus Lirik"
    >
      <X class="w-3 h-3 stroke-[2.5]" />
    </button>
  </div>
</template>
