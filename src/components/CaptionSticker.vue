<script setup>
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { storyState } from '../composables/useStoryState'

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

const lines = computed(() => {
  if (!storyState.captionText) return []
  return storyState.captionText.split('\n')
})

// Dragging position logic
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const startPos = ref({ x: 50, y: 50 })

// Canva-like resize width logic
const isResizing = ref(false)
const resizeSide = ref('right') // 'left' | 'right'
const resizeStartX = ref(0)
const resizeStartWidth = ref(80)

const onMouseDown = (e) => {
  if (!props.interactive || isResizing.value) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  startPos.value = { ...storyState.captionPos }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  if (!isDragging.value || !props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = ((e.clientX - dragStart.value.x) / rect.width) * 100
  const deltaY = ((e.clientY - dragStart.value.y) / rect.height) * 100

  const newX = Math.max(10, Math.min(90, startPos.value.x + deltaX))
  const newY = Math.max(10, Math.min(90, startPos.value.y + deltaY))

  storyState.captionPos.x = Math.round(newX * 10) / 10
  storyState.captionPos.y = Math.round(newY * 10) / 10
}

const onMouseUp = () => {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// Touch support for mobile AU writers
const onTouchStart = (e) => {
  if (!props.interactive || isResizing.value || !e.touches[0]) return
  isDragging.value = true
  const touch = e.touches[0]
  dragStart.value = { x: touch.clientX, y: touch.clientY }
  startPos.value = { ...storyState.captionPos }

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

  const newX = Math.max(10, Math.min(90, startPos.value.x + deltaX))
  const newY = Math.max(10, Math.min(90, startPos.value.y + deltaY))

  storyState.captionPos.x = Math.round(newX * 10) / 10
  storyState.captionPos.y = Math.round(newY * 10) / 10
}

const onTouchEnd = () => {
  isDragging.value = false
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

// Canva-style horizontal resize handles
const onResizeMouseDown = (e, side) => {
  if (!props.interactive) return
  e.stopPropagation()
  e.preventDefault()
  isResizing.value = true
  resizeSide.value = side
  resizeStartX.value = e.clientX
  resizeStartWidth.value = storyState.captionWidth || 80

  window.addEventListener('mousemove', onResizeMouseMove)
  window.addEventListener('mouseup', onResizeMouseUp)
}

const onResizeMouseMove = (e) => {
  if (!isResizing.value || !props.containerRef) return
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = e.clientX - resizeStartX.value
  const deltaPercent = (deltaX / rect.width) * 100
  const factor = resizeSide.value === 'right' ? deltaPercent * 2 : -deltaPercent * 2

  const newW = Math.max(30, Math.min(95, Math.round(resizeStartWidth.value + factor)))
  storyState.captionWidth = newW
}

const onResizeMouseUp = () => {
  isResizing.value = false
  window.removeEventListener('mousemove', onResizeMouseMove)
  window.removeEventListener('mouseup', onResizeMouseUp)
}

const onResizeTouchStart = (e, side) => {
  if (!props.interactive || !e.touches[0]) return
  e.stopPropagation()
  isResizing.value = true
  resizeSide.value = side
  resizeStartX.value = e.touches[0].clientX
  resizeStartWidth.value = storyState.captionWidth || 80

  window.addEventListener('touchmove', onResizeTouchMove, { passive: false })
  window.addEventListener('touchend', onResizeTouchEnd)
}

const onResizeTouchMove = (e) => {
  if (!isResizing.value || !props.containerRef || !e.touches[0]) return
  e.preventDefault()
  const rect = props.containerRef.getBoundingClientRect()
  const deltaX = e.touches[0].clientX - resizeStartX.value
  const deltaPercent = (deltaX / rect.width) * 100
  const factor = resizeSide.value === 'right' ? deltaPercent * 2 : -deltaPercent * 2

  const newW = Math.max(30, Math.min(95, Math.round(resizeStartWidth.value + factor)))
  storyState.captionWidth = newW
}

const onResizeTouchEnd = () => {
  isResizing.value = false
  window.removeEventListener('touchmove', onResizeTouchMove)
  window.removeEventListener('touchend', onResizeTouchEnd)
}

const textAlignClass = computed(() => {
  if (storyState.captionAlign === 'left') return 'text-left items-start'
  if (storyState.captionAlign === 'right') return 'text-right items-end'
  return 'text-center items-center'
})

// Dynamic sharp & subtle text shadow (Clean / Flat if captionShadow <= 0)
const textShadowStyle = computed(() => {
  const val = storyState.captionShadow ?? 0
  if (val <= 0) return 'none'
  const opacity = Math.min(0.85, (val / 100) * 0.85).toFixed(2)
  const blur = ((val / 100) * 3.5).toFixed(1)
  const y = ((val / 100) * 1.5).toFixed(1)
  return `0 ${y}px ${blur}px rgba(0, 0, 0, ${opacity})`
})
</script>

<template>
  <div 
    v-if="storyState.hasCaption && storyState.captionText && storyState.captionText.trim().length > 0"
    class="absolute select-none z-25 group transition-all"
    :style="{
      left: `${storyState.captionPos.x}%`,
      top: `${storyState.captionPos.y}%`,
      width: `${storyState.captionWidth || 80}%`,
      transform: `translate(-50%, -50%)`,
      cursor: interactive ? (isDragging ? 'grabbing' : 'grab') : 'default'
    }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
  >
    <!-- Canva-style selection border outline on hover/active -->
    <div 
      v-if="interactive"
      class="absolute inset-0 pointer-events-none rounded-xl border border-transparent group-hover:border-white/30 group-hover:ring-1 group-hover:ring-pink-500/30 transition-all"
    ></div>

    <!-- Canva-style Left Resize Handle -->
    <div 
      v-if="interactive"
      @mousedown="onResizeMouseDown($event, 'left')"
      @touchstart="onResizeTouchStart($event, 'left')"
      class="absolute -left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-full bg-white shadow-md border border-neutral-300 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:scale-110 active:scale-95"
      title="Tarik untuk atur lebar tulisan"
    >
      <div class="w-[2px] h-3 bg-neutral-600 rounded-full"></div>
    </div>

    <!-- Canva-style Right Resize Handle -->
    <div 
      v-if="interactive"
      @mousedown="onResizeMouseDown($event, 'right')"
      @touchstart="onResizeTouchStart($event, 'right')"
      class="absolute -right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-full bg-white shadow-md border border-neutral-300 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:scale-110 active:scale-95"
      title="Tarik untuk atur lebar tulisan"
    >
      <div class="w-[2px] h-3 bg-neutral-600 rounded-full"></div>
    </div>

    <!-- GAYA 1: MODERN BOLD (Default Instagram Story Sans-serif) -->
    <div 
      v-if="storyState.captionStyle === 'modern'"
      class="w-full flex flex-col select-none transition-all"
      :class="textAlignClass"
      :style="{ 
        fontSize: `${storyState.captionFontSize || 24}px`,
        color: storyState.captionColor || '#ffffff'
      }"
    >
      <div 
        v-for="(line, idx) in lines" 
        :key="idx"
        class="w-full my-0.5"
        :class="[
          storyState.captionAlign === 'left' ? 'text-left' :
          storyState.captionAlign === 'right' ? 'text-right' : 'text-center'
        ]"
      >
        <span 
          class="font-black uppercase tracking-tight leading-[1.2] inline break-words [box-decoration-break:clone] [-webkit-box-decoration-break:clone] transition-all"
          :class="[
            storyState.hasCaptionHighlight 
              ? 'px-3 py-1 rounded-xl shadow-sm' 
              : ''
          ]"
          :style="{
            backgroundColor: storyState.hasCaptionHighlight ? (storyState.captionBgColor || '#000000') : 'transparent',
            textShadow: storyState.hasCaptionHighlight ? 'none' : textShadowStyle
          }"
        >
          {{ line }}
        </span>
      </div>
    </div>

    <!-- GAYA 2: HIGHLIGHT KOTAK (Instagram White/Black Box Karaoke Pill) -->
    <div 
      v-else-if="storyState.captionStyle === 'highlight'"
      class="w-full flex flex-col select-none transition-all"
      :class="textAlignClass"
      :style="{ 
        fontSize: `${Math.max(16, (storyState.captionFontSize || 24) - 2)}px`
      }"
    >
      <div 
        v-for="(line, idx) in lines" 
        :key="idx"
        class="w-full my-0.5"
        :class="[
          storyState.captionAlign === 'left' ? 'text-left' :
          storyState.captionAlign === 'right' ? 'text-right' : 'text-center'
        ]"
      >
        <span 
          class="font-black uppercase tracking-tight leading-snug px-3.5 py-1.5 rounded-2xl shadow-md inline break-words [box-decoration-break:clone] [-webkit-box-decoration-break:clone] transition-all"
          :style="{
            backgroundColor: storyState.captionBgColor || '#ffffff',
            color: storyState.captionColor || '#000000'
          }"
        >
          {{ line }}
        </span>
      </div>
    </div>

    <!-- GAYA 3: MESIN KETIK (Typewriter Monospace) -->
    <div 
      v-else-if="storyState.captionStyle === 'typewriter'"
      class="w-full flex flex-col select-none font-mono font-bold leading-snug transition-all"
      :class="textAlignClass"
      :style="{ 
        fontSize: `${Math.max(15, (storyState.captionFontSize || 24) - 2)}px`,
        color: storyState.captionColor || '#ffffff'
      }"
    >
      <div 
        v-for="(line, idx) in lines" 
        :key="idx"
        class="w-full my-0.5"
        :class="[
          storyState.captionAlign === 'left' ? 'text-left' :
          storyState.captionAlign === 'right' ? 'text-right' : 'text-center'
        ]"
      >
        <span 
          class="px-3 py-1 rounded-lg inline break-words [box-decoration-break:clone] [-webkit-box-decoration-break:clone] transition-all"
          :class="[
            storyState.hasCaptionHighlight 
              ? 'shadow-sm border border-white/20' 
              : ''
          ]"
          :style="{
            backgroundColor: storyState.hasCaptionHighlight ? (storyState.captionBgColor || 'rgba(0,0,0,0.7)') : 'transparent',
            textShadow: storyState.hasCaptionHighlight ? 'none' : textShadowStyle
          }"
        >
          {{ line }}
        </span>
      </div>
    </div>

    <!-- GAYA 4: NEON GLOW -->
    <div 
      v-else-if="storyState.captionStyle === 'neon'"
      class="w-full flex flex-col select-none font-sans font-extrabold italic transition-all"
      :class="textAlignClass"
      :style="{ 
        fontSize: `${storyState.captionFontSize || 24}px`,
        color: storyState.captionColor || '#ffffff'
      }"
    >
      <div 
        v-for="(line, idx) in lines" 
        :key="idx"
        class="w-full my-0.5"
        :class="[
          storyState.captionAlign === 'left' ? 'text-left' :
          storyState.captionAlign === 'right' ? 'text-right' : 'text-center'
        ]"
      >
        <span 
          class="leading-tight inline break-words"
          :style="{
            textShadow: `0 0 4px ${storyState.captionColor || '#ffffff'}, 0 0 10px ${storyState.captionColor || '#ff4081'}, 0 0 16px ${storyState.captionColor || '#ff4081'}`
          }"
        >
          {{ line }}
        </span>
      </div>
    </div>

    <!-- GAYA 5: SERIF ELEGANT (Novel / Aesthetic AU Quote) -->
    <div 
      v-else-if="storyState.captionStyle === 'serif'"
      class="w-full flex flex-col select-none font-serif italic transition-all"
      :class="textAlignClass"
      :style="{ 
        fontSize: `${storyState.captionFontSize || 24}px`,
        color: storyState.captionColor || '#ffffff'
      }"
    >
      <div 
        v-for="(line, idx) in lines" 
        :key="idx"
        class="w-full my-0.5"
        :class="[
          storyState.captionAlign === 'left' ? 'text-left' :
          storyState.captionAlign === 'right' ? 'text-right' : 'text-center'
        ]"
      >
        <span 
          class="leading-[1.25] inline break-words transition-all"
          :style="{
            textShadow: textShadowStyle
          }"
        >
          {{ line }}
        </span>
      </div>
    </div>

    <!-- Drag hint on hover -->
    <div 
      v-if="interactive"
      class="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/80 text-white px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap shadow flex items-center gap-1.5"
    >
      <span>Geser posisi · Tarik handle samping untuk lebar ({{ storyState.captionWidth || 80 }}%)</span>
    </div>

    <!-- Quick Dismiss (X) button -->
    <button 
      v-if="interactive"
      @click.stop="storyState.hasCaption = false; storyState.captionText = ''"
      class="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-black/80 text-white hover:bg-red-600 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
      title="Hapus Tulisan"
    >
      <X class="w-3 h-3 stroke-[2.5]" />
    </button>
  </div>
</template>
