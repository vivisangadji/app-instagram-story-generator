<script setup>
import { computed } from 'vue'
import { X, Play, Volume2, VolumeX } from 'lucide-vue-next'
import { storyState, audioProgress, isAudioPlaying, useStoryState } from '../composables/useStoryState'

const emit = defineEmits(['close', 'menu', 'pause'])
const { togglePlayAudio } = useStoryState()

const segments = computed(() => {
  const count = Math.max(1, Math.min(10, storyState.segmentCount || 1))
  const activeIdx = Math.max(0, Math.min(count - 1, (storyState.activeSegment || 1) - 1))
  
  return Array.from({ length: count }, (_, i) => {
    let fill = 0
    if (i < activeIdx) {
      fill = 100
    } else if (i === activeIdx) {
      fill = storyState.hasMusic && audioProgress.value > 0 ? audioProgress.value : 100
    } else {
      fill = 0
    }
    return { id: i, fill }
  })
})
</script>

<template>
  <div class="relative z-30 w-full pt-3 px-3 pb-2 select-none pointer-events-none">
    <!-- Top Segmented Progress Bar (Identical to IG Screenshot) -->
    <div v-if="storyState.showProgressBar" class="w-full flex items-center gap-[3px] mb-2.5">
      <div 
        v-for="seg in segments" 
        :key="seg.id"
        class="flex-1 h-[2px] bg-white/40 rounded-full overflow-hidden"
      >
        <div 
          class="h-full bg-white transition-all duration-100 ease-linear rounded-full"
          :style="{ width: `${seg.fill}%` }"
        ></div>
      </div>
    </div>

    <!-- Header Main Row -->
    <div class="flex items-center justify-between pointer-events-auto">
      <!-- Left: Profile Info & Music Attribution Line -->
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- Close Button (if left aligned) -->
        <button 
          v-if="storyState.showCloseBtn && storyState.closeBtnPosition === 'left'"
          @click="$emit('close')"
          class="p-1 -ml-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:opacity-80 active:scale-95 transition-transform"
        >
          <X class="w-5 h-5 stroke-[2.2]" />
        </button>

        <!-- Profile Avatar -->
        <div class="relative flex-shrink-0">
          <div class="w-8 h-8 rounded-full overflow-hidden ring-[1px] ring-white/30 shadow-sm bg-neutral-900">
            <img 
              :src="storyState.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'" 
              :alt="storyState.username"
              class="w-full h-full object-cover"
              crossorigin="anonymous"
            />
          </div>
        </div>

        <!-- Name & Music Meta Column -->
        <div class="flex flex-col min-w-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">
          <!-- Line 1: Username, Verified Badge, Time Ago -->
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-semibold text-[13.5px] tracking-tight truncate max-w-[140px]">
              {{ storyState.username || 'username' }}
            </span>

            <!-- Official Instagram Verified Badge SVG -->
            <svg 
              v-if="storyState.isVerified" 
              class="w-[13px] h-[13px] flex-shrink-0 text-[#0095f6] fill-current" 
              viewBox="0 0 40 40" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.998 3.094 14.638 0l-5.9 3.094-6.33-1.637L.77 7.73l-1.637 6.33 3.094 5.9L0 25.362l1.637 6.33 6.33 1.637 3.094 5.9 5.36-3.094 5.36 3.094 3.094-5.9 6.33-1.637 1.637-6.33 3.094-5.9-3.094-5.402 1.637-6.33-6.33-1.637-3.094-5.9-5.36 3.094z" />
              <path fill="#ffffff" d="m16.892 28.535-7.7-7.7 2.828-2.829 4.872 4.872 11.872-11.872 2.828 2.828-14.7 14.7z" />
            </svg>

            <!-- Time Ago -->
            <span class="text-[12.5px] text-white/60 font-normal ml-0.5 flex-shrink-0">
              {{ storyState.timeAgo || '17h' }}
            </span>
          </div>

          <!-- Line 2: Music Track Attribution (Under username, exact IG screenshot) -->
          <div 
            v-if="storyState.hasMusic && storyState.showMusicInHeader"
            @click="togglePlayAudio"
            class="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-[11px] text-white/95 truncate max-w-[170px] sm:max-w-[200px]"
            title="Klik untuk putar/jeda audio musik"
          >
            <!-- Animated 3-bar Sound Wave Icon |ı| -->
            <div class="flex items-center gap-[1.5px] h-3 flex-shrink-0">
              <span 
                class="w-[2px] bg-white rounded-full transition-all"
                :class="isAudioPlaying ? 'animate-bar-1' : 'h-[8px]'"
              ></span>
              <span 
                class="w-[2px] bg-white rounded-full transition-all"
                :class="isAudioPlaying ? 'animate-bar-2' : 'h-[5px]'"
              ></span>
              <span 
                class="w-[2px] bg-white rounded-full transition-all"
                :class="isAudioPlaying ? 'animate-bar-3' : 'h-[10px]'"
              ></span>
            </div>

            <!-- Artist and Song Title: smked · honeybee (...) -->
            <div class="flex items-center gap-1 truncate font-normal">
              <span class="font-semibold text-white truncate max-w-[80px]">
                {{ storyState.artistName || 'Artist' }}
              </span>
              <span class="text-white/60 text-[10px]">·</span>
              <span class="text-white/90 truncate max-w-[95px]">
                {{ storyState.songTitle || 'Song' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Speaker icon, Pause button, 3 dots, and optional Close button -->
      <div class="flex items-center gap-2 flex-shrink-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <!-- Speaker / Volume Icon (Shown in modern IG music story) -->
        <button 
          v-if="storyState.hasMusic && storyState.showSpeakerBtn"
          @click="togglePlayAudio"
          class="p-1 hover:opacity-80 active:scale-90 transition-transform"
          :title="isAudioPlaying ? 'Jeda Suara' : 'Putar Musik'"
        >
          <!-- Modern Instagram Speaker SVG with Sound Wave -->
          <svg v-if="isAudioPlaying" class="w-[18px] h-[18px] fill-white" viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else class="w-[18px] h-[18px] fill-white" viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Modern Instagram Pause/Play button '||' -->
        <button 
          v-if="storyState.showPauseBtn"
          @click="togglePlayAudio"
          class="p-1 hover:opacity-80 active:scale-90 transition-transform"
          :title="isAudioPlaying ? 'Jeda Story' : 'Putar Story'"
        >
          <svg 
            v-if="isAudioPlaying || !storyState.hasMusic" 
            class="w-3.5 h-3.5 fill-current text-white" 
            viewBox="0 0 16 16"
          >
            <rect x="3.5" y="2" width="3" height="12" rx="1.5" />
            <rect x="9.5" y="2" width="3" height="12" rx="1.5" />
          </svg>
          <Play v-else class="w-3.5 h-3.5 fill-white text-white" />
        </button>

        <!-- Modern Instagram Three Dots '•••' -->
        <button 
          v-if="storyState.showMenuBtn"
          @click="$emit('menu')"
          class="p-1 hover:opacity-80 active:scale-90 transition-transform"
          title="Opsi Lainnya"
        >
          <svg class="w-5 h-5 fill-white" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

        <!-- Optional Close Button (Right) -->
        <button 
          v-if="storyState.showCloseBtn && storyState.closeBtnPosition === 'right'"
          @click="$emit('close')"
          class="p-1 hover:opacity-80 active:scale-95 transition-transform"
          title="Tutup Story"
        >
          <X class="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </div>
  </div>
</template>
