<script setup>
import { Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  progress: Number,
  statusText: String,
  isDone: Boolean,
  errorText: String,
  downloadUrl: String,
  downloadFilename: String
})

const emit = defineEmits(['close', 'cancel'])
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
  >
    <div class="w-full max-w-sm bg-[#18181c] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
      <!-- Icon Indicator -->
      <div 
        class="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all"
        :class="[
          errorText ? 'bg-red-500/10 text-red-400' : 
          isDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-pink-500/10 text-pink-500'
        ]"
      >
        <AlertCircle v-if="errorText" class="w-8 h-8" />
        <CheckCircle2 v-else-if="isDone" class="w-8 h-8 animate-bounce" />
        <Loader2 v-else class="w-8 h-8 animate-spin text-pink-500" />
      </div>

      <!-- Title -->
      <h3 class="text-base font-bold text-white mb-1">
        {{ errorText ? 'Gagal Memproses' : isDone ? 'Story Berhasil Disimpan!' : 'Memproses Story...' }}
      </h3>

      <!-- Status detail text -->
      <p class="text-xs text-neutral-400 mb-4 px-2 leading-relaxed">
        {{ errorText || statusText || 'Harap tunggu, sedang memproses...' }}
      </p>

      <!-- Progress bar -->
      <div v-if="!errorText && !isDone" class="w-full bg-neutral-800 rounded-full h-2 mb-2 overflow-hidden">
        <div 
          class="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300 ease-out" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>

      <div v-if="!errorText && !isDone" class="text-xs font-semibold text-neutral-400 mb-4">
        {{ progress }}%
      </div>

      <!-- Re-download fallback link if needed -->
      <div v-if="isDone && downloadUrl" class="mb-4">
        <a 
          :href="downloadUrl" 
          :download="downloadFilename"
          class="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 underline"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Unduh lagi ({{ downloadFilename }})</span>
        </a>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 w-full mt-1">
        <button 
          v-if="!isDone && !errorText"
          @click="$emit('cancel')"
          class="flex-1 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
        >
          Batalkan
        </button>

        <button 
          v-if="isDone || errorText"
          @click="$emit('close')"
          class="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/10"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
