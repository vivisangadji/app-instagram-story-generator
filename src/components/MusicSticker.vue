<script setup>
import { ref, computed } from 'vue'
import { Volume2, VolumeX, Music } from 'lucide-vue-next'
import { storyState, isAudioPlaying, useStoryState } from '../composables/useStoryState'

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

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const startPos = ref({ x: 50, y: 75 })

const onMouseDown = (e) => {
  if (!props.interactive) return
  // Don't drag if clicking buttons directly
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  startPos.value = { ...storyState.stickerPos }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (!isDragging.value || !props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = ((e.clientX - dragStart.value.x) / rect.width) * 100
  const deltaY = ((e.clientY - dragStart.value.y) / rect.height) * 100

  // Constrain inside container bounds (10% - 90%)
  const newX = Math.max(15, Math.min(85, startPos.value.x + deltaX))
  const newY = Math.max(15, Math.min(85, startPos.value.y + deltaY))

  storyState.stickerPos.x = Math.round(newX * 10) / 10
  storyState.stickerPos.y = Math.round(newY * 10) / 10
}

const onMouseUp = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// Touch support for mobile/touch screens
const onTouchStart = (e) => {
  if (!props.interactive || !e.touches[0]) return
  isDragging.value = true
  const touch = e.touches[0]
  dragStart.value = { x: touch.clientX, y: touch.clientY }
  startPos.value = { ...storyState.stickerPos }

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

  storyState.stickerPos.x = Math.round(newX * 10) / 10
  storyState.stickerPos.y = Math.round(newY * 10) / 10
}

const onTouchEnd = () => {
  isDragging.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

// Theme classes
const themeClasses = computed(() => {
  switch (storyState.stickerStyle) {
    case 'dark':
      return 'bg-black/75 text-white backdrop-blur-md border border-white/15 shadow-2xl'
    case 'transparent':
      return 'bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-xl'
    case 'minimal':
      return 'bg-neutral-900/90 text-white shadow-xl'
    case 'classic':
    default:
      return 'bg-white text-neutral-900 shadow-xl border border-black/5'
  }
})

const subTextClasses = computed(() => {
  switch (storyState.stickerStyle) {
    case 'dark':
    case 'transparent':
    case 'minimal':
      return 'text-white/70'
    case 'classic':
    default:
      return 'text-neutral-500'
  }
})
</script>

<template>
  <div 
    v-if="storyState.hasMusic && storyState.showMusicSticker"
    class="absolute select-none transition-shadow z-30 group"
    :style="{
      left: `${storyState.stickerPos.x}%`,
      top: `${storyState.stickerPos.y}%`,
      transform: `translate(-50%, -50%) scale(${storyState.stickerScale})`,
      cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default'
    }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
  >
    <div 
      class="flex items-center gap-2.5 px-3 py-2 rounded-2xl max-w-[280px] sm:max-w-[320px] transition-all"
      :class="[themeClasses, isDragging ? 'scale-105 shadow-2xl' : '']"
    >
      <!-- Cover Art with Play overlay on hover -->
      <div 
        @click.stop="togglePlayAudio"
        class="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm cursor-pointer group/art"
        title="Klik untuk putar/jeda audio"
      >
        <img 
          :src="storyState.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80'" 
          :alt="storyState.songTitle"
          class="w-full h-full object-cover"
          crossorigin="anonymous"
        />
        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center">
          <Volume2 v-if="!isAudioPlaying" class="w-4 h-4 text-white" />
          <VolumeX v-else class="w-4 h-4 text-white" />
        </div>
      </div>

      <!-- Song & Artist Details -->
      <div class="flex flex-col min-w-0 pr-1 leading-tight">
        <span class="font-bold text-[13px] tracking-tight truncate max-w-[150px]">
          {{ storyState.songTitle || 'Judul Lagu' }}
        </span>
        <span class="text-[11px] truncate max-w-[150px] font-medium" :class="subTextClasses">
          {{ storyState.artistName || 'Nama Artis' }}
        </span>
      </div>

      <!-- Animated Instagram-style Equalizer Bars -->
      <div 
        v-if="storyState.showEqualizer"
        class="flex items-end gap-[2px] h-4 ml-auto pl-1 flex-shrink-0 cursor-pointer"
        @click.stop="togglePlayAudio"
        title="Status equalizer musik"
      >
        <span 
          class="w-[2.5px] rounded-full transition-all"
          :class="[
            storyState.stickerStyle === 'classic' ? 'bg-neutral-900' : 'bg-white',
            isAudioPlaying ? 'animate-bar-1' : 'h-[6px]'
          ]"
        ></span>
        <span 
          class="w-[2.5px] rounded-full transition-all"
          :class="[
            storyState.stickerStyle === 'classic' ? 'bg-neutral-900' : 'bg-white',
            isAudioPlaying ? 'animate-bar-2' : 'h-[12px]'
          ]"
        ></span>
        <span 
          class="w-[2.5px] rounded-full transition-all"
          :class="[
            storyState.stickerStyle === 'classic' ? 'bg-neutral-900' : 'bg-white',
            isAudioPlaying ? 'animate-bar-3' : 'h-[8px]'
          ]"
        ></span>
        <span 
          class="w-[2.5px] rounded-full transition-all"
          :class="[
            storyState.stickerStyle === 'classic' ? 'bg-neutral-900' : 'bg-white',
            isAudioPlaying ? 'animate-bar-4' : 'h-[4px]'
          ]"
        ></span>
      </div>
    </div>

    <!-- Drag hint tooltip when hovering over sticker in preview -->
    <div 
      v-if="interactive"
      class="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/80 text-white px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap"
    >
      Geser untuk pindah posisi
    </div>
  </div>
</template>
