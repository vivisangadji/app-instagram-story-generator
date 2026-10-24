<script setup>
import { ref, computed } from 'vue'
import { ZoomIn, ZoomOut, RotateCcw, Smartphone, Play, Pause, Layers } from 'lucide-vue-next'
import { storyState, isAudioPlaying, useStoryState } from '../composables/useStoryState'
import StoryHeader from './StoryHeader.vue'
import CaptionSticker from './CaptionSticker.vue'
import MusicSticker from './MusicSticker.vue'
import LyricsSticker from './LyricsSticker.vue'
import StoryFooter from './StoryFooter.vue'

const storyContentRef = ref(null)
const { togglePlayAudio, isAudioPlaying: audioPlaying } = useStoryState()

const resetSticker = () => {
  storyState.stickerPos = { x: 50, y: 75 }
  storyState.stickerScale = 1.0
  storyState.captionPos = { x: 50, y: 55 }
  storyState.lyricsPos = { x: 50, y: 55 }
}

defineExpose({
  getStoryElement: () => storyContentRef.value
})
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-2 sm:p-5 lg:p-6 min-h-full overflow-hidden select-none">
    <!-- Top Floating Toolbar -->
    <div class="mb-3.5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181e]/90 backdrop-blur-md border border-white/10 text-xs text-neutral-300 shadow-xl z-20">
      <!-- Device Bezel Frame Toggle -->
      <button 
        @click="storyState.showDeviceFrame = !storyState.showDeviceFrame"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
        :class="storyState.showDeviceFrame ? 'bg-white/15 text-white font-medium' : 'hover:bg-white/5 text-neutral-400'"
        title="Toggle Bingkai HP atau Frameless"
      >
        <Smartphone class="w-3.5 h-3.5" />
        <span>{{ storyState.showDeviceFrame ? 'Mode HP' : 'Mode Layar Penuh' }}</span>
      </button>

      <span class="w-[1px] h-3 bg-white/10"></span>

      <!-- Audio Preview Button -->
      <button 
        v-if="storyState.hasMusic"
        @click="togglePlayAudio"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
        :class="audioPlaying ? 'bg-pink-600 text-white font-medium animate-pulse' : 'hover:bg-white/5 text-neutral-300'"
        title="Dengarkan Musik Story"
      >
        <component :is="audioPlaying ? Pause : Play" class="w-3.5 h-3.5" />
        <span>{{ audioPlaying ? 'Audio Berputar' : 'Putar Musik' }}</span>
      </button>

      <span v-if="storyState.hasMusic" class="w-[1px] h-3 bg-white/10"></span>

      <!-- Reset Sticker Pos -->
      <button 
        v-if="storyState.hasMusic"
        @click="resetSticker"
        class="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
        title="Reset Posisi Stiker Musik"
      >
        <RotateCcw class="w-3 h-3" />
        <span>Reset Stiker</span>
      </button>
    </div>

    <!-- Phone Wrapper / Mockup Container -->
    <div 
      class="relative transition-all duration-300 ease-out flex items-center justify-center max-h-[85vh]"
      :style="{
        transform: `scale(${storyState.previewZoom / 100})`,
        transformOrigin: 'center center'
      }"
    >
      <!-- Smartphone Frame Container -->
      <div 
        class="relative transition-all duration-300"
        :class="[
          storyState.showDeviceFrame 
            ? 'p-2.5 bg-[#1a1a20] rounded-[48px] ring-1 ring-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]' 
            : 'p-0 shadow-2xl ring-1 ring-white/10 rounded-2xl overflow-hidden'
        ]"
      >
        <!-- Speaker / Dynamic Island on Phone Bezel -->
        <div 
          v-if="storyState.showDeviceFrame"
          class="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-24 h-4 bg-black rounded-full flex items-center justify-center gap-2 pointer-events-none ring-1 ring-neutral-800"
        >
          <div class="w-2.5 h-2.5 rounded-full bg-[#0d0d12]"></div>
        </div>

        <!-- 9:16 Aspect Ratio Canvas Container -->
        <div 
          ref="storyContentRef"
          class="relative overflow-hidden aspect-story w-[320px] sm:w-[350px] md:w-[375px] bg-black select-none flex flex-col justify-between"
          :class="[storyState.showDeviceFrame ? 'rounded-[38px]' : 'rounded-none']"
        >
          <!-- Background Media: Video or Image -->
          <div class="absolute inset-0 z-0 overflow-hidden bg-neutral-900">
            <!-- If Video -->
            <video 
              v-if="storyState.mediaType === 'video' && storyState.mediaUrl"
              :src="storyState.mediaUrl"
              class="w-full h-full object-cover"
              autoplay
              loop
              muted
              playsinline
            ></video>

            <!-- If Image -->
            <img 
              v-else-if="storyState.mediaUrl"
              :src="storyState.mediaUrl"
              alt="Story Background"
              class="w-full h-full transition-all duration-200"
              :class="storyState.mediaFit === 'cover' ? 'object-cover' : 'object-contain'"
              crossorigin="anonymous"
            />

            <!-- Fallback if no media -->
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-stone-900 via-neutral-900 to-stone-900 text-white/50 text-xs">
              <span>Pilih Gambar atau Video</span>
            </div>

            <!-- Authentic Instagram Gradient Vignettes (Top & Bottom subtle contrast shadows) -->
            <div 
              class="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none transition-opacity"
              :style="{ opacity: 0.4 + (storyState.overlayDarkness / 100) }"
            ></div>
            <div 
              class="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none transition-opacity"
              :style="{ opacity: 0.4 + (storyState.overlayDarkness / 100) }"
            ></div>
          </div>

          <!-- 1. Instagram Story Header (Progress Bar, Avatar, Username, Time, Pause, 3-dots) -->
          <StoryHeader />

          <!-- 2. Instagram Story Caption / Text Sticker (Aa - Draggable) -->
          <CaptionSticker :container-ref="storyContentRef" />

          <!-- 3. Instagram Music Sticker (Draggable) -->
          <MusicSticker :container-ref="storyContentRef" />

          <!-- 4. Instagram Lyrics Sticker (Draggable & Animated) -->
          <LyricsSticker :container-ref="storyContentRef" />

          <!-- 4. Instagram Story Footer ("Reply to...", Heart, DM) -->
          <div>
            <StoryFooter />
            <!-- Smartphone Home Indicator bar at bottom -->
            <div class="w-28 h-[3.5px] bg-white/40 rounded-full mx-auto mb-2 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom & Scale Controls Bottom Bar -->
    <div class="mt-3.5 flex items-center gap-2 text-xs text-neutral-400 bg-[#16161c]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
      <span>Skala:</span>
      <button 
        @click="storyState.previewZoom = Math.max(60, storyState.previewZoom - 10)" 
        class="hover:text-white p-0.5"
        title="Perkecil"
      >
        <ZoomOut class="w-3.5 h-3.5" />
      </button>
      <span class="font-mono text-neutral-200">{{ storyState.previewZoom }}%</span>
      <button 
        @click="storyState.previewZoom = Math.min(120, storyState.previewZoom + 10)" 
        class="hover:text-white p-0.5"
        title="Perbesar"
      >
        <ZoomIn class="w-3.5 h-3.5" />
      </button>
      <button 
        @click="storyState.previewZoom = 100" 
        class="ml-1 text-[11px] underline hover:text-white"
      >
        100%
      </button>
    </div>
  </div>
</template>
