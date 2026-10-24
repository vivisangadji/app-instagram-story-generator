<script setup>
import { computed } from 'vue'
import { storyState } from '../composables/useStoryState'
import confetti from 'canvas-confetti'

const emit = defineEmits(['heart', 'send'])

const replyPlaceholder = computed(() => {
  if (storyState.customPlaceholder) {
    return storyState.customPlaceholder
  }
  return `Reply to ${storyState.username || 'user'}...`
})

const toggleLike = () => {
  storyState.isLiked = !storyState.isLiked
  if (storyState.isLiked) {
    try {
      confetti({
        particleCount: 22,
        spread: 45,
        origin: { y: 0.9, x: 0.82 },
        colors: ['#ff3040', '#ff5268', '#ffffff']
      })
    } catch (e) {}
  }
  emit('heart', storyState.isLiked)
}
</script>

<template>
  <div 
    v-if="storyState.showMessageBar || storyState.showHeartBtn || storyState.showSendBtn"
    class="relative z-30 w-full px-3.5 pb-5 pt-2 select-none"
  >
    <div class="flex items-center gap-3">
      <!-- "Reply to [username]..." Capsule Input (Exact IG Screenshot Look) -->
      <div 
        v-if="storyState.showMessageBar"
        class="flex-1 flex items-center h-[44px] px-4 rounded-full border border-white/80 bg-black/10 backdrop-blur-[2px] shadow-sm cursor-text group transition-colors hover:border-white"
      >
        <span class="text-[13.5px] text-white/90 font-normal tracking-wide select-none truncate">
          {{ replyPlaceholder }}
        </span>
      </div>

      <!-- Action Icons (Heart + Paper Plane) -->
      <div class="flex items-center gap-3.5 flex-shrink-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <!-- Instagram Heart (Like) Icon -->
        <button 
          v-if="storyState.showHeartBtn"
          @click="toggleLike"
          class="p-1 hover:opacity-90 active:scale-125 transition-all"
          :class="storyState.isLiked ? 'text-[#ff3040]' : 'text-white'"
          aria-label="Suka Story"
        >
          <svg 
            class="w-[25px] h-[25px] transition-transform" 
            :class="storyState.isLiked ? 'scale-110' : ''"
            viewBox="0 0 24 24"
          >
            <path 
              v-if="!storyState.isLiked"
              d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.437-.283-1.79-1.509-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.117 1.763s.278-.588 1.117-1.763a4.21 4.21 0 0 1 3.675-1.941z" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="1.8" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />
            <path 
              v-else
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
              fill="#ff3040"
            />
          </svg>
        </button>

        <!-- Instagram Direct Message / Paper Plane Icon -->
        <button 
          v-if="storyState.showSendBtn"
          @click="$emit('send')"
          class="p-1 hover:opacity-90 active:scale-95 transition-transform"
          aria-label="Kirim Story"
        >
          <svg class="w-[25px] h-[25px]" viewBox="0 0 24 24" fill="none">
            <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
