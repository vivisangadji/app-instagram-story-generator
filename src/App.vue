<script setup>
import { ref } from 'vue'
import { Sparkles, Sliders, Smartphone, Github } from 'lucide-vue-next'
import ControlPanel from './components/ControlPanel.vue'
import StoryPreview from './components/StoryPreview.vue'
import ExportModal from './components/ExportModal.vue'
import { useMediaExporter } from './composables/useMediaExporter'
import { storyState } from './composables/useStoryState'

const previewRef = ref(null)
const mobileTab = ref('preview') // 'editor' | 'preview' on small screens

const {
  isExporting,
  exportProgress,
  exportStatus,
  isExportDone,
  exportError,
  downloadUrl,
  downloadFilename,
  exportImage,
  exportVideo,
  cancelExport,
  closeExportModal
} = useMediaExporter()

const handleExportImage = (format) => {
  if (previewRef.value) {
    const el = previewRef.value.getStoryElement()
    exportImage(el, format)
  }
}

const handleExportVideo = (duration) => {
  exportVideo({ duration, fps: 30 })
}
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0e12] text-white">
    <!-- Top Mobile Header / Switcher (Only visible on small screens < 1024px) -->
    <header class="lg:hidden flex items-center justify-between px-4 py-2.5 bg-[#141418] border-b border-white/10 z-40">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center">
          <Sparkles class="w-3.5 h-3.5 text-white" />
        </div>
        <span class="text-xs font-bold tracking-tight">IG Story Generator</span>
      </div>

      <!-- Segmented switch for mobile -->
      <div class="flex p-0.5 rounded-lg bg-black/50 border border-white/10">
        <button 
          @click="mobileTab = 'editor'"
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
          :class="mobileTab === 'editor' ? 'bg-pink-600 text-white shadow' : 'text-neutral-400 hover:text-white'"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button 
          @click="mobileTab = 'preview'"
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
          :class="mobileTab === 'preview' ? 'bg-pink-600 text-white shadow' : 'text-neutral-400 hover:text-white'"
        >
          <Smartphone class="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace Layout -->
    <main class="flex-1 flex overflow-hidden relative">
      <!-- 1. Left / Sidebar Control Panel -->
      <div 
        class="h-full z-10 transition-all duration-200"
        :class="[
          'lg:flex',
          mobileTab === 'editor' ? 'flex w-full absolute inset-0' : 'hidden'
        ]"
      >
        <ControlPanel 
          :on-export-image="handleExportImage"
          :on-export-video="handleExportVideo"
          :is-exporting="isExporting"
        />
      </div>

      <!-- 2. Right / Center Live 9:16 Story Preview -->
      <div 
        class="h-full flex-1 bg-[#0a0a0d] relative overflow-hidden flex flex-col"
        :class="[
          'lg:flex',
          mobileTab === 'preview' ? 'flex w-full' : 'hidden'
        ]"
      >
        <!-- Background decorative ambient glow -->
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div class="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <!-- Live Preview Component -->
        <StoryPreview ref="previewRef" />
      </div>
    </main>

    <!-- Export Progress & Notification Modal -->
    <ExportModal 
      :is-open="isExporting"
      :progress="exportProgress"
      :status-text="exportStatus"
      :is-done="isExportDone"
      :error-text="exportError"
      :download-url="downloadUrl"
      :download-filename="downloadFilename"
      @cancel="cancelExport"
      @close="closeExportModal"
    />
  </div>
</template>
