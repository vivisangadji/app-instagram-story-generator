import { ref } from 'vue'
import { toPng, toJpeg } from 'html-to-image'
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { storyState } from './useStoryState'

export function useMediaExporter() {
  const isExporting = ref(false)
  const exportProgress = ref(0)
  const exportStatus = ref('')
  const isExportDone = ref(false)
  const exportError = ref('')
  const downloadUrl = ref('')
  const downloadFilename = ref('')
  const lastExportedBlob = ref(null)
  const lastExportedType = ref('')

  let mediaRecorder = null
  let recordedChunks = []
  let isCancelled = false
  let audioContext = null
  let audioSourceNode = null

  // 1. Export as High-Resolution Image (PNG or JPG)
  const exportImage = async (previewElement, format = 'png') => {
    if (!previewElement) {
      throw new Error('Elemen preview tidak ditemukan')
    }

    isExporting.value = true
    exportStatus.value = `Menyiapkan gambar resolusi tinggi (${format.toUpperCase()})...`
    exportProgress.value = 30
    exportError.value = ''
    isExportDone.value = false

    try {
      // Calculate 1080x1920 scale
      const rect = previewElement.getBoundingClientRect()
      const scale = Math.max(2, 1080 / rect.width)

      exportProgress.value = 60
      const options = {
        quality: 0.98,
        pixelRatio: scale,
        cacheBust: true,
        style: {
          transform: 'none',
          borderRadius: '0px' // Pure rectangular story when downloading
        }
      }

      let dataUrl = ''
      const mimeType = (format === 'jpg' || format === 'jpeg') ? 'image/jpeg' : 'image/png'
      if (format === 'jpg' || format === 'jpeg') {
        dataUrl = await toJpeg(previewElement, options)
      } else {
        dataUrl = await toPng(previewElement, options)
      }

      exportProgress.value = 95
      exportStatus.value = 'Menyiapkan berkas gambar...'

      const imageBlob = dataUrlToBlob(dataUrl)
      const filename = `ig-story-${storyState.username || 'user'}-${Date.now()}.${format}`

      if (downloadUrl.value) {
        try { URL.revokeObjectURL(downloadUrl.value) } catch (e) {}
      }
      downloadUrl.value = URL.createObjectURL(imageBlob)
      downloadFilename.value = filename
      lastExportedBlob.value = imageBlob
      lastExportedType.value = mimeType

      exportProgress.value = 100
      isExportDone.value = true
      exportStatus.value = 'Gambar berhasil disimpan!'

      saveMediaFile(imageBlob, filename, mimeType)

      // Auto close modal
      setTimeout(() => {
        if (!exportError.value) {
          isExporting.value = false
        }
      }, 1500)

      return true
    } catch (err) {
      console.error('Image export error:', err)
      exportError.value = 'Gagal menyimpan gambar: ' + (err.message || err)
      return false
    } finally {
      if (exportError.value) {
        setTimeout(() => {
          isExporting.value = false
        }, 3000)
      }
    }
  }

  // 2. Export as Video with Audio (Real MP4 for iOS & Android)
  const exportVideo = async (options = { duration: 15, fps: 30 }) => {
    isExporting.value = true
    exportProgress.value = 0
    exportStatus.value = 'Memuat aset gambar & audio...'
    exportError.value = ''
    isExportDone.value = false
    isCancelled = false
    recordedChunks = []

    const duration = options.duration || 15
    const fps = options.fps || 30
    const totalFrames = duration * fps
    const width = 1080
    const height = 1920

    try {
      // Create offscreen high-res canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      // Preload background image/video and avatar/cover
      exportStatus.value = 'Memuat aset grafis...'
      const [bgImg, avatarImg, coverImg] = await Promise.all([
        loadImage(storyState.mediaUrl),
        loadImage(storyState.avatarUrl),
        storyState.hasMusic ? loadImage(storyState.coverUrl) : Promise.resolve(null)
      ])

      // Setup Web Audio API
      exportStatus.value = 'Menyiapkan audio lagu...'
      audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 })
      let audioBuffer = null
      let hasAudioTrack = false

      if (storyState.audioUrl) {
        try {
          const response = await fetch(storyState.audioUrl)
          const arrayBuffer = await response.arrayBuffer()
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          hasAudioTrack = true
        } catch (audioErr) {
          console.warn('Audio decoding warning, creating fallback melodic audio:', audioErr)
        }
      }

      // If user hasn't uploaded local audio but enabled music, generate melodic music track automatically
      if (!audioBuffer && storyState.hasMusic) {
        try {
          audioBuffer = createSynthBuffer(audioContext, duration)
          hasAudioTrack = true
        } catch (synthErr) {
          console.warn('Synth error:', synthErr)
        }
      }

      // Check if WebCodecs VideoEncoder is supported (Chrome, Edge, Safari on macOS & Windows)
      const hasWebCodecs = typeof window.VideoEncoder !== 'undefined'
      let usedWebCodecs = false

      if (hasWebCodecs) {
        try {
          exportStatus.value = 'Menginisialisasi MP4 Video Encoder...'

          // Check AudioEncoder for AAC support
          let audioEncoder = null
          if (hasAudioTrack && audioBuffer && typeof window.AudioEncoder !== 'undefined') {
            try {
              const aacCheck = await AudioEncoder.isConfigSupported({
                codec: 'mp4a.40.2',
                numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
                sampleRate: 44100,
                bitrate: 128000
              })
              if (aacCheck && aacCheck.supported) {
                audioEncoder = new AudioEncoder({
                  output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                  error: (e) => console.error('AudioEncoder error:', e)
                })
                audioEncoder.configure({
                  codec: 'mp4a.40.2',
                  numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
                  sampleRate: 44100,
                  bitrate: 128000
                })
              }
            } catch (e) {
              console.warn('AAC AudioEncoder configuration failed:', e)
            }
          }

          // Create MP4 Muxer with fastStart for instant mobile playback on iOS & Android
          const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
              codec: 'avc',
              width: width,
              height: height
            },
            audio: audioEncoder ? {
              codec: 'aac',
              numberOfChannels: Math.min(2, audioBuffer.numberOfChannels),
              sampleRate: 44100
            } : undefined,
            fastStart: 'in-memory'
          })

          const videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error('VideoEncoder error:', e)
          })

          // Select best supported H.264 profile (High Profile > Main Profile > Baseline) for razor-sharp text clarity
          const candidateCodecs = [
            'avc1.64002a', // High Profile Level 4.2 (CABAC + 8x8 DCT transform - prevents text blur)
            'avc1.640028', // High Profile Level 4.0
            'avc1.4d002a', // Main Profile Level 4.2
            'avc1.4d001f', // Main Profile Level 3.1
            'avc1.42001f'  // Baseline Profile
          ]
          let selectedCodec = 'avc1.42001f'
          for (const c of candidateCodecs) {
            try {
              const check = await VideoEncoder.isConfigSupported({
                codec: c,
                width: width,
                height: height,
                bitrate: 12_000_000
              })
              if (check && check.supported) {
                selectedCodec = c
                break
              }
            } catch (e) {}
          }

          videoEncoder.configure({
            codec: selectedCodec,
            width: width,
            height: height,
            bitrate: 12_000_000, // 12 Mbps crystal-clear high-definition (guarantees sharp text on mobile)
            framerate: fps,
            latencyMode: 'quality'
          })

          // Feed Audio to AudioEncoder if available
          if (audioEncoder && audioBuffer) {
            exportStatus.value = 'Mengodekan audio lagu...'
            const sampleRate = audioBuffer.sampleRate
            const numChannels = Math.min(2, audioBuffer.numberOfChannels)
            const totalAudioFrames = Math.min(audioBuffer.length, Math.floor(duration * sampleRate))
            const chunkSize = 1024
            let offset = 0

            while (offset < totalAudioFrames) {
              const framesToEncode = Math.min(chunkSize, totalAudioFrames - offset)
              const planarData = new Float32Array(framesToEncode * numChannels)

              for (let ch = 0; ch < numChannels; ch++) {
                const chData = audioBuffer.getChannelData(ch)
                planarData.set(chData.subarray(offset, offset + framesToEncode), ch * framesToEncode)
              }

              const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: framesToEncode,
                numberOfChannels: numChannels,
                timestamp: Math.round((offset / sampleRate) * 1_000_000), // in microseconds
                data: planarData
              })

              audioEncoder.encode(audioData)
              audioData.close()
              offset += framesToEncode
            }
            await audioEncoder.flush()
          }

          // Render Video Frames
          exportStatus.value = 'Merender frame video MP4...'
          for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
            if (isCancelled) throw new Error('Perekaman dibatalkan')

            const elapsedSec = frameIndex / fps
            drawStoryToCanvas(ctx, width, height, {
              bgImg,
              avatarImg,
              coverImg,
              time: elapsedSec,
              duration: duration
            })

            const timestamp = Math.round((frameIndex / fps) * 1_000_000) // in microseconds
            const videoFrame = new VideoFrame(canvas, { timestamp })
            videoEncoder.encode(videoFrame, { keyFrame: frameIndex % (fps * 2) === 0 })
            videoFrame.close()

            // Update UI progress
            if (frameIndex % 5 === 0 || frameIndex === totalFrames - 1) {
              exportProgress.value = Math.min(95, Math.round((frameIndex / totalFrames) * 95))
              await new Promise(r => setTimeout(r, 0))
            }
          }

          exportStatus.value = 'Menyelesaikan berkas MP4...'
          exportProgress.value = 98
          await videoEncoder.flush()
          muxer.finalize()

          const mp4Blob = new Blob([muxer.target.buffer], { type: 'video/mp4' })
          const videoFilename = `ig-story-${storyState.username || 'user'}-${Date.now()}.mp4`

          if (downloadUrl.value) {
            try { URL.revokeObjectURL(downloadUrl.value) } catch (e) {}
          }
          downloadUrl.value = URL.createObjectURL(mp4Blob)
          downloadFilename.value = videoFilename
          lastExportedBlob.value = mp4Blob
          lastExportedType.value = 'video/mp4'

          exportProgress.value = 100
          isExportDone.value = true
          exportStatus.value = 'Video MP4 berhasil dibuat!'

          saveMediaFile(mp4Blob, videoFilename, 'video/mp4')
          usedWebCodecs = true

          // Auto close modal
          setTimeout(() => {
            if (!exportError.value) {
              isExporting.value = false
            }
          }, 1500)
        } catch (wcErr) {
          console.warn('WebCodecs MP4 generation failed or was cancelled, falling back to MediaRecorder:', wcErr)
          if (isCancelled) throw wcErr
        }
      }

      // Fallback: MediaRecorder if WebCodecs is not supported or failed
      if (!usedWebCodecs && !isCancelled) {
        exportStatus.value = 'Merekam dengan MediaRecorder...'
        const audioDest = audioContext.createMediaStreamDestination()
        if (hasAudioTrack && audioBuffer) {
          audioSourceNode = audioContext.createBufferSource()
          audioSourceNode.buffer = audioBuffer
          audioSourceNode.connect(audioDest)
        }

        const canvasStream = canvas.captureStream(fps)
        const tracks = [...canvasStream.getVideoTracks()]
        if (hasAudioTrack && audioDest.stream.getAudioTracks().length > 0) {
          tracks.push(audioDest.stream.getAudioTracks()[0])
        }
        const combinedStream = new MediaStream(tracks)

        const mimeTypes = [
          'video/mp4;codecs=avc1,mp4a.40.2',
          'video/mp4;codecs=avc1',
          'video/mp4;codecs=h264,aac',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ]
        let selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/mp4'

        mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMime || undefined,
          videoBitsPerSecond: 12_000_000
        })
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data)
        }

        const recordPromise = new Promise((resolve, reject) => {
          mediaRecorder.onstop = () => {
            if (isCancelled) return reject(new Error('Perekaman dibatalkan'))
            const blob = new Blob(recordedChunks, { type: selectedMime || 'video/mp4' })
            resolve(blob)
          }
          mediaRecorder.onerror = (e) => reject(e)
        })

        mediaRecorder.start(100)
        if (audioSourceNode) audioSourceNode.start(0)

        const startTime = performance.now()
        await new Promise((resolve, reject) => {
          const renderStep = () => {
            if (isCancelled) return reject(new Error('Dibatalkan'))
            const elapsedSec = (performance.now() - startTime) / 1000
            exportProgress.value = Math.min(99, Math.round((elapsedSec / duration) * 100))
            drawStoryToCanvas(ctx, width, height, { bgImg, avatarImg, coverImg, time: elapsedSec, duration })
            if (elapsedSec >= duration) resolve()
            else requestAnimationFrame(renderStep)
          }
          renderStep()
        })

        if (audioSourceNode) {
          try { audioSourceNode.stop() } catch (e) {}
        }
        exportStatus.value = 'Mengompilasi berkas video...'
        exportProgress.value = 100
        mediaRecorder.stop()

        const videoBlob = await recordPromise
        const isMp4 = selectedMime.includes('mp4')
        const ext = isMp4 ? 'mp4' : 'webm'
        const mimeType = isMp4 ? 'video/mp4' : 'video/webm'
        const videoFilename = `ig-story-${storyState.username || 'user'}-${Date.now()}.${ext}`

        if (downloadUrl.value) {
          try { URL.revokeObjectURL(downloadUrl.value) } catch (e) {}
        }
        downloadUrl.value = URL.createObjectURL(videoBlob)
        downloadFilename.value = videoFilename
        lastExportedBlob.value = videoBlob
        lastExportedType.value = mimeType

        exportProgress.value = 100
        isExportDone.value = true
        exportStatus.value = `Video ${ext.toUpperCase()} berhasil dibuat!`

        saveMediaFile(videoBlob, videoFilename, mimeType)

        // Auto close modal
        setTimeout(() => {
          if (!exportError.value) {
            isExporting.value = false
          }
        }, 1500)
      }

      exportProgress.value = 100
      isExportDone.value = true
      exportStatus.value = 'Video berhasil dibuat!'
    } catch (err) {
      if (!isCancelled) {
        console.error('Video export error:', err)
        exportError.value = 'Gagal membuat video: ' + (err.message || err)
      }
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
    }
  }

  const cancelExport = () => {
    isCancelled = true
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (audioSourceNode) {
      try { audioSourceNode.stop() } catch (e) {}
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
    }
    isExporting.value = false
    exportProgress.value = 0
  }

  const closeExportModal = () => {
    isExporting.value = false
    exportProgress.value = 0
    isExportDone.value = false
    exportError.value = ''
    if (downloadUrl.value) {
      const urlToRevoke = downloadUrl.value
      downloadUrl.value = ''
      // Delay revocation so background download has plenty of time to finish
      setTimeout(() => {
        try { URL.revokeObjectURL(urlToRevoke) } catch (e) {}
      }, 20000)
    }
    lastExportedBlob.value = null
    lastExportedType.value = ''
  }

  return {
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
  }
}

// Helper: Load an image with CORS anonymous
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.warn('Failed to load image for canvas render, creating fallback:', src)
      // Return a 1x1 neutral fallback so rendering won't fail
      const fallback = new Image()
      fallback.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23222"/></svg>'
      fallback.onload = () => resolve(fallback)
    }
    img.src = src
  })
}

// Helper: Convert Data URL (base64) to a real binary Blob with strict MIME type
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

// Helper: Detect mobile devices (iPhone, iPad, Android)
function isMobileUser() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
}

// Helper: Save a media file directly via standard browser download
function saveMediaFile(blob, filename, mimeType) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  setTimeout(() => {
    try {
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {}
  }, 20000)

  return true
}

// Helper: Draw razor-sharp text with tight contrast drop-shadow (prevents blur & pixelation)
function drawCrispText(ctx, text, x, y, font, color, options = {}) {
  if (!text) return
  ctx.save()
  ctx.font = font
  ctx.textBaseline = options.baseline || 'middle'
  ctx.textAlign = options.align || 'left'

  // Pass 1: Crisp tight shadow for contrast against bright backgrounds
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 2.5
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 1.2
  ctx.fillStyle = color
  ctx.fillText(text, x, y)

  // Pass 2: Solid unblurred text to ensure 100% razor-sharp glyph edges
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

// Canvas Drawing Engine for 1080x1920 Story
function drawStoryToCanvas(ctx, width, height, assets) {
  const { bgImg, avatarImg, coverImg, time, duration } = assets

  // Set high quality smoothing & text rendering
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 1. Clear Canvas
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  // 2. Draw Background Media (Cover mode)
  if (bgImg) {
    const imgRatio = bgImg.width / bgImg.height
    const canvasRatio = width / height
    let renderW, renderH, offsetX, offsetY

    if (storyState.mediaFit === 'cover') {
      if (imgRatio > canvasRatio) {
        renderH = height
        renderW = height * imgRatio
        offsetX = (width - renderW) / 2
        offsetY = 0
      } else {
        renderW = width
        renderH = width / imgRatio
        offsetX = 0
        offsetY = (height - renderH) / 2
      }
    } else {
      // Contain mode
      if (imgRatio > canvasRatio) {
        renderW = width
        renderH = width / imgRatio
        offsetX = 0
        offsetY = (height - renderH) / 2
      } else {
        renderH = height
        renderW = height * imgRatio
        offsetX = (width - renderW) / 2
        offsetY = 0
      }
    }
    ctx.drawImage(bgImg, offsetX, offsetY, renderW, renderH)
  }

  // 3. Subtle Instagram Top & Bottom Gradients (for text legibility)
  const topGradH = 370
  const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH)
  const topOpacity = 0.55 + (storyState.overlayDarkness / 150)
  topGrad.addColorStop(0, `rgba(0, 0, 0, ${topOpacity})`)
  topGrad.addColorStop(0.5, `rgba(0, 0, 0, ${topOpacity * 0.35})`)
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, width, topGradH)

  const botGradH = 410
  const bottomGrad = ctx.createLinearGradient(0, height - botGradH, 0, height)
  const botOpacity = 0.6 + (storyState.overlayDarkness / 150)
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
  bottomGrad.addColorStop(0.5, `rgba(0, 0, 0, ${botOpacity * 0.35})`)
  bottomGrad.addColorStop(1, `rgba(0, 0, 0, ${botOpacity})`)
  ctx.fillStyle = bottomGrad
  ctx.fillRect(0, height - botGradH, width, botGradH)

  // 4. Top Segmented Progress Bar (Identical to IG Screenshot)
  if (storyState.showProgressBar) {
    const barY = 32
    const barH = 7
    const barPad = 32
    const count = Math.max(1, Math.min(10, storyState.segmentCount || 1))
    const activeIdx = Math.max(0, Math.min(count - 1, (storyState.activeSegment || 1) - 1))
    const gap = 8
    const totalGap = gap * (count - 1)
    const segW = (width - (barPad * 2) - totalGap) / count

    for (let i = 0; i < count; i++) {
      const sx = barPad + i * (segW + gap)
      // Background track
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      roundRect(ctx, sx, barY, segW, barH, 3.5, true, false)

      // Active fill
      let fillRatio = 0
      if (i < activeIdx) {
        fillRatio = 1
      } else if (i === activeIdx) {
        fillRatio = Math.min(1, Math.max(0, time / duration))
      }

      if (fillRatio > 0) {
        ctx.fillStyle = '#ffffff'
        roundRect(ctx, sx, barY, segW * fillRatio, barH, 3.5, true, false)
      }
    }
  }

  // 5. Header (Profile Avatar, Username, Verified, Time, Pause, More)
  const headerY = 66
  let curX = 32

  // Optional Close Button (Left)
  if (storyState.showCloseBtn && storyState.closeBtnPosition === 'left') {
    drawCloseIcon(ctx, curX + 16, headerY + 44, 36)
    curX += 64
  }

  // Avatar
  if (avatarImg) {
    const avatarSize = 88
    ctx.save()
    ctx.beginPath()
    ctx.arc(curX + avatarSize / 2, headerY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatarImg, curX, headerY, avatarSize, avatarSize)
    ctx.restore()

    // Avatar ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(curX + avatarSize / 2, headerY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.stroke()

    curX += avatarSize + 20
  }

  // Username & Music Attribution Column
  const hasHeaderMusic = storyState.hasMusic && storyState.showMusicInHeader
  const textY = hasHeaderMusic ? headerY + 28 : headerY + 44
  const musicStartX = curX

  const username = storyState.username || 'username'
  const usernameFont = '700 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  drawCrispText(ctx, username, curX, textY, usernameFont, '#ffffff')
  ctx.font = usernameFont
  const usernameWidth = ctx.measureText(username).width
  curX += usernameWidth + 12

  // Verified Badge
  if (storyState.isVerified) {
    drawVerifiedBadge(ctx, curX, textY - 17, 34)
    curX += 42
  }

  // Time (Muted white, without bullet as in modern IG screenshot)
  const timeFont = '500 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  drawCrispText(ctx, storyState.timeAgo || '17h', curX, textY, timeFont, 'rgba(255, 255, 255, 0.72)')

  // Music Attribution line under username (exact IG screenshot)
  if (hasHeaderMusic) {
    const musicY = headerY + 70
    let mx = musicStartX

    // Draw 3 animated wave bars (crisp 4px width)
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = 2.5
    ctx.shadowOffsetY = 1.2
    const barW = 4
    const gap = 3.5
    const h1 = 15 + Math.sin(time * 8.5) * 7
    const h2 = 9 + Math.sin(time * 11.2) * 6
    const h3 = 17 + Math.sin(time * 9.5) * 7

    roundRect(ctx, mx, musicY - h1 / 2, barW, h1, 2, true, false)
    roundRect(ctx, mx + barW + gap, musicY - h2 / 2, barW, h2, 2, true, false)
    roundRect(ctx, mx + (barW + gap) * 2, musicY - h3 / 2, barW, h3, 2, true, false)
    ctx.restore()

    mx += (barW + gap) * 2 + 12

    // Artist
    const artist = storyState.artistName || 'Artist'
    const artistFont = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    drawCrispText(ctx, artist, mx, musicY, artistFont, '#ffffff')
    ctx.font = artistFont
    const artistW = ctx.measureText(artist).width
    mx += artistW + 8

    // Dot separator
    const dotFont = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    drawCrispText(ctx, '·', mx, musicY, dotFont, 'rgba(255, 255, 255, 0.7)')
    mx += 14

    // Song title
    const song = storyState.songTitle || 'Song'
    const songTrunc = song.length > 25 ? song.substring(0, 24) + '…' : song
    const songFont = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    drawCrispText(ctx, songTrunc, mx, musicY, songFont, 'rgba(255, 255, 255, 0.95)')
  }

  // Right Header Icons
  let rightX = width - 40
  // Close button (right)
  if (storyState.showCloseBtn && storyState.closeBtnPosition === 'right') {
    drawCloseIcon(ctx, rightX, headerY + 44, 36)
    rightX -= 60
  }

  // 3-dots '•••'
  if (storyState.showMenuBtn) {
    drawMoreIcon(ctx, rightX - 10, headerY + 44)
    rightX -= 65
  }

  // Pause button '||'
  if (storyState.showPauseBtn) {
    drawPauseIcon(ctx, rightX - 10, headerY + 44)
    rightX -= 60
  }

  // Speaker Icon
  if (storyState.hasMusic && storyState.showSpeakerBtn) {
    drawSpeakerIcon(ctx, rightX - 10, headerY + 44)
  }

  // 6. Floating Music Sticker (Only if enabled)
  if (storyState.hasMusic && storyState.showMusicSticker) {
    drawMusicSticker(ctx, width, height, coverImg, time)
  }

  // 6b. Instagram Music Lyrics Sticker (If enabled)
  if (storyState.hasMusic && storyState.showLyrics && storyState.lyricsRawText && storyState.lyricsRawText.trim().length > 0) {
    drawLyricsToCanvas(ctx, width, height, time, duration)
  }

  // 6c. Caption / AU Dialogue Text Sticker (If enabled)
  if (storyState.hasCaption && storyState.captionText && storyState.captionText.trim().length > 0) {
    drawCaptionToCanvas(ctx, width, height)
  }

  // 7. Footer
  drawFooter(ctx, width, height)
}

// Draw Verified Blue Badge
function drawVerifiedBadge(ctx, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  const scale = size / 40
  ctx.scale(scale, scale)

  // Blue star/seal
  ctx.fillStyle = '#0095f6'
  const path1 = new Path2D("M19.998 3.094 14.638 0l-5.9 3.094-6.33-1.637L.77 7.73l-1.637 6.33 3.094 5.9L0 25.362l1.637 6.33 6.33 1.637 3.094 5.9 5.36-3.094 5.36 3.094 3.094-5.9 6.33-1.637 1.637-6.33 3.094-5.9-3.094-5.402 1.637-6.33-6.33-1.637-3.094-5.9-5.36 3.094z")
  ctx.fill(path1)

  // White checkmark
  ctx.fillStyle = '#ffffff'
  const path2 = new Path2D("m16.892 28.535-7.7-7.7 2.828-2.829 4.872 4.872 11.872-11.872 2.828 2.828-14.7 14.7z")
  ctx.fill(path2)

  ctx.restore()
}

// Draw Close 'X'
function drawCloseIcon(ctx, cx, cy, size = 32) {
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 6
  const half = size / 2
  ctx.beginPath()
  ctx.moveTo(cx - half, cy - half)
  ctx.lineTo(cx + half, cy + half)
  ctx.moveTo(cx + half, cy - half)
  ctx.lineTo(cx - half, cy + half)
  ctx.stroke()
  ctx.restore()
}

// Draw 3-Dots More Icon
function drawMoreIcon(ctx, cx, cy) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 6
  for (let offset of [-16, 0, 16]) {
    ctx.beginPath()
    ctx.arc(cx + offset, cy, 4.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// Draw Pause '||' Icon (Exact symmetrical bars with identical stroke width)
function drawPauseIcon(ctx, cx, cy) {
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
  ctx.shadowBlur = 6

  const barH = 22
  const halfH = barH / 2
  const gap = 12
  const leftX = Math.round(cx - gap / 2)
  const rightX = Math.round(cx + gap / 2)

  ctx.beginPath()
  // Left vertical bar
  ctx.moveTo(leftX, cy - halfH)
  ctx.lineTo(leftX, cy + halfH)
  // Right vertical bar
  ctx.moveTo(rightX, cy - halfH)
  ctx.lineTo(rightX, cy + halfH)
  ctx.stroke()

  ctx.restore()
}

// Draw Speaker Icon
function drawSpeakerIcon(ctx, cx, cy) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 6

  // Speaker cone
  ctx.beginPath()
  ctx.moveTo(-10, -6)
  ctx.lineTo(-4, -6)
  ctx.lineTo(2, -12)
  ctx.lineTo(2, 12)
  ctx.lineTo(-4, 6)
  ctx.lineTo(-10, 6)
  ctx.closePath()
  ctx.fill()

  // Sound wave arc
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(3, 0, 7, -Math.PI / 3, Math.PI / 3)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(3, 0, 13, -Math.PI / 3, Math.PI / 3)
  ctx.stroke()

  ctx.restore()
}

// Synthesize soothing melodic chord buffer when no local audio is uploaded
function createSynthBuffer(audioCtx, duration) {
  const sampleRate = audioCtx.sampleRate
  const length = sampleRate * duration
  const buffer = audioCtx.createBuffer(2, length, sampleRate)
  const channelL = buffer.getChannelData(0)
  const channelR = buffer.getChannelData(1)

  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 392.00]  // G
  ]
  const chordDuration = duration / chords.length

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
    const kick = Math.exp(-beatTime * 15) * Math.sin(2 * Math.PI * 65 * beatTime) * 0.2
    channelL[i] = sample + kick
    channelR[i] = sample + kick
  }
  return buffer
}

// Draw Instagram Music Sticker
function drawMusicSticker(ctx, canvasW, canvasH, coverImg, time) {
  ctx.save()

  const centerX = (storyState.stickerPos.x / 100) * canvasW
  const centerY = (storyState.stickerPos.y / 100) * canvasH
  const scale = storyState.stickerScale || 1.0

  ctx.translate(centerX, centerY)
  ctx.scale(scale * 2.3, scale * 2.3) // Scale up for 1080p canvas

  const stickerW = 320
  const stickerH = 80
  const halfW = stickerW / 2
  const halfH = stickerH / 2

  // Background Capsule
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 8

  if (storyState.stickerStyle === 'dark') {
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)'
  } else if (storyState.stickerStyle === 'transparent') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
  } else {
    ctx.fillStyle = '#ffffff'
  }

  roundRect(ctx, -halfW, -halfH, stickerW, stickerH, 20, true, false)

  // Border if needed
  ctx.shadowColor = 'transparent'
  if (storyState.stickerStyle === 'dark' || storyState.stickerStyle === 'transparent') {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1.5
    roundRect(ctx, -halfW, -halfH, stickerW, stickerH, 20, false, true)
  }

  // Cover Image
  const artSize = 56
  const artX = -halfW + 12
  const artY = -halfH + 12

  if (coverImg) {
    ctx.save()
    roundRect(ctx, artX, artY, artSize, artSize, 12, false, false)
    ctx.clip()
    ctx.drawImage(coverImg, artX, artY, artSize, artSize)
    ctx.restore()
  }

  // Text
  const textX = artX + artSize + 14
  const isLightSticker = storyState.stickerStyle === 'classic'

  ctx.fillStyle = isLightSticker ? '#111111' : '#ffffff'
  ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
  ctx.textBaseline = 'top'

  // Title
  const title = (storyState.songTitle || 'Judul Lagu').toUpperCase()
  ctx.fillText(title.length > 15 ? title.substring(0, 14) + '…' : title, textX, -halfH + 18)

  // Artist
  ctx.fillStyle = isLightSticker ? '#777777' : 'rgba(255, 255, 255, 0.75)'
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
  const artist = storyState.artistName || 'Nama Artis'
  ctx.fillText(artist.length > 18 ? artist.substring(0, 17) + '…' : artist, textX, -halfH + 44)

  // Dynamic Equalizer Bars
  if (storyState.showEqualizer) {
    const eqX = halfW - 40
    const eqY = 0
    const barWidth = 4
    const barGap = 4
    const barColor = isLightSticker ? '#111111' : '#ffffff'

    ctx.fillStyle = barColor

    // 4 bars with sinusoidal animated heights based on time
    const h1 = 10 + Math.sin(time * 8.5) * 8
    const h2 = 18 + Math.sin(time * 11.2 + 1) * 12
    const h3 = 14 + Math.sin(time * 9.1 + 2) * 10
    const h4 = 8 + Math.sin(time * 12.4 + 3) * 6

    const heights = [h1, h2, h3, h4]

    heights.forEach((h, i) => {
      const bx = eqX + i * (barWidth + barGap)
      const by = eqY - (h / 2)
      roundRect(ctx, bx, by, barWidth, h, 2, true, false)
    })
  }

  ctx.restore()
}

// Helper: Wrap text into multiple lines so it never exceeds maxWidth
function wrapCanvasText(ctx, text, maxWidth) {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

// Draw Instagram Music Lyrics Sticker to Canvas (Synced with time & Wrapped)
function drawLyricsToCanvas(ctx, width, height, time, duration) {
  if (!storyState.lyricsRawText) return

  const rawLines = storyState.lyricsRawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (rawLines.length === 0) return

  let activeIdx = storyState.activeLyricIndex || 0
  if (time > 0 && duration > 0) {
    if (storyState.syncedLyrics) {
      const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{1,3})?\]/
      const lrcLines = storyState.syncedLyrics.split('\n')
      let matchedIdx = -1
      for (let i = 0; i < lrcLines.length; i++) {
        const match = timeRegex.exec(lrcLines[i])
        if (match) {
          const t = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + (match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0)
          if (t <= time) {
            matchedIdx = i
          } else {
            break
          }
        }
      }
      if (matchedIdx !== -1) {
        const cleanMatched = lrcLines[matchedIdx].replace(timeRegex, '').trim().toLowerCase()
        const found = rawLines.findIndex(l => l.toLowerCase() === cleanMatched)
        if (found !== -1) {
          activeIdx = found
        } else {
          activeIdx = Math.min(matchedIdx, rawLines.length - 1)
        }
      }
    } else {
      const progress = Math.min(0.99, Math.max(0, time / duration))
      activeIdx = Math.floor(progress * rawLines.length)
    }
  }
  activeIdx = Math.max(0, Math.min(rawLines.length - 1, activeIdx))

  const currentLine = rawLines[activeIdx] || ''
  const prevLine = activeIdx > 0 ? rawLines[activeIdx - 1] : ''
  const nextLine = activeIdx < rawLines.length - 1 ? rawLines[activeIdx + 1] : ''

  const cx = (storyState.lyricsPos.x / 100) * width
  const cy = (storyState.lyricsPos.y / 100) * height

  ctx.save()
  ctx.translate(cx, cy)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxTextW = Math.min(840, width * 0.82)
  let baseFontSize = (storyState.lyricsFontSize || 22) * 2.5 // scale for 1080p canvas

  if (storyState.lyricsStyle === 'box') {
    // 1. GAYA KOTAK KARAOKE (Instagram White Box Highlight)
    let fontSize = Math.max(34, baseFontSize - 8)
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    
    let wrapped = wrapCanvasText(ctx, currentLine.toUpperCase(), maxTextW - 80)
    if (wrapped.length > 3) {
      fontSize = Math.max(28, fontSize * (3 / wrapped.length))
      ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      wrapped = wrapCanvasText(ctx, currentLine.toUpperCase(), maxTextW - 80)
    }

    const padX = 36
    const padY = 16
    const pillH = fontSize + padY * 2
    const lineGap = 12
    const totalBlockH = wrapped.length * pillH + (wrapped.length - 1) * lineGap
    const startY = -(totalBlockH / 2) + (pillH / 2)

    wrapped.forEach((lineText, idx) => {
      const textMetrics = ctx.measureText(lineText)
      const pillW = textMetrics.width + padX * 2
      const py = startY + idx * (pillH + lineGap)

      // White pill with shadow
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 6
      roundRect(ctx, -pillW / 2, py - pillH / 2, pillW, pillH, 22, true, false)

      // Black text
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = '#000000'
      ctx.fillText(lineText, 0, py + 2)
    })
  } else if (storyState.lyricsStyle === 'multiline') {
    // 2. GAYA 3 BARIS BERGULIR
    let fontSize = Math.max(32, baseFontSize - 6)
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
    let wrapped = wrapCanvasText(ctx, currentLine.toUpperCase(), maxTextW)

    const lineHeight = fontSize * 1.25
    const totalCurrentH = wrapped.length * lineHeight

    // Prev line (faded)
    if (prevLine) {
      ctx.font = `600 ${fontSize * 0.62}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 10
      const prevTrunc = prevLine.length > 35 ? prevLine.substring(0, 34) + '…' : prevLine
      ctx.fillText(prevTrunc, 0, -(totalCurrentH / 2) - 34)
    }

    // Current line (highlighted with glass capsule)
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
    ctx.fillStyle = storyState.lyricsColor || '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 6

    const startY = -(totalCurrentH / 2) + (lineHeight / 2)
    wrapped.forEach((lineText, idx) => {
      ctx.fillText(lineText, 0, startY + (idx * lineHeight))
    })

    // Next line (faded)
    if (nextLine) {
      ctx.font = `600 ${fontSize * 0.62}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 10
      const nextTrunc = nextLine.length > 35 ? nextLine.substring(0, 34) + '…' : nextLine
      ctx.fillText(nextTrunc, 0, (totalCurrentH / 2) + 34)
    }
  } else if (storyState.lyricsStyle === 'typewriter') {
    // 3. GAYA MESIN KETIK (Typewriter)
    let fontSize = Math.max(30, baseFontSize - 8)
    ctx.font = `700 ${fontSize}px "Courier New", Courier, monospace`
    let wrapped = wrapCanvasText(ctx, currentLine, maxTextW - 70)

    let maxW = 0
    wrapped.forEach(l => {
      const w = ctx.measureText(l).width
      if (w > maxW) maxW = w
    })

    const padX = 36
    const padY = 22
    const lineHeight = fontSize * 1.3
    const boxW = Math.min(maxTextW, maxW + padX * 2)
    const boxH = wrapped.length * lineHeight + padY * 2

    // Dark glass box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 2.5
    roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 20, true, true)

    // Monospace lines
    ctx.fillStyle = storyState.lyricsColor || '#ffffff'
    const startY = -(boxH / 2) + padY + (lineHeight / 2)
    wrapped.forEach((lineText, idx) => {
      ctx.fillText(lineText, 0, startY + (idx * lineHeight))
    })
  } else {
    // 4. GAYA BOLD TYPOGRAPHY (Iconic Instagram Large Floating Text - Default)
    let fontSize = baseFontSize * 1.15
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
    let wrapped = wrapCanvasText(ctx, currentLine.toUpperCase(), maxTextW)

    // If lyrics are very long, scale down gracefully to fit in screen
    if (wrapped.length > 3) {
      fontSize = Math.max(36, fontSize * (3 / wrapped.length))
      ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      wrapped = wrapCanvasText(ctx, currentLine.toUpperCase(), maxTextW)
    }

    ctx.fillStyle = storyState.lyricsColor || '#ffffff'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 5
    ctx.shadowOffsetY = 1.5

    const lineHeight = fontSize * 1.2
    const totalH = wrapped.length * lineHeight
    const startY = -(totalH / 2) + (lineHeight / 2)

    wrapped.forEach((lineText, idx) => {
      ctx.fillText(lineText, 0, startY + (idx * lineHeight))
    })
  }

  ctx.restore()
}

// 6c. Draw Instagram Story Caption / AU Dialogue Text
function drawCaptionToCanvas(ctx, width, height) {
  if (!storyState.hasCaption || !storyState.captionText) return

  const scale = width / 414 // Scale ratio from preview canvas (~414px) to 1080p canvas
  const fontSize = Math.round((storyState.captionFontSize || 24) * scale)
  const style = storyState.captionStyle || 'modern'
  const textColor = storyState.captionColor || (style === 'highlight' ? '#000000' : '#ffffff')
  const bgColor = storyState.captionBgColor || (style === 'highlight' ? '#ffffff' : '#000000')
  const hasHighlight = storyState.hasCaptionHighlight || style === 'highlight'
  const align = storyState.captionAlign || 'center'

  // Determine font family & weight
  let fontString = ''
  if (style === 'modern' || style === 'highlight') {
    fontString = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  } else if (style === 'typewriter') {
    fontString = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  } else if (style === 'neon') {
    fontString = `800 italic ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  } else if (style === 'serif') {
    fontString = `italic ${fontSize}px Georgia, Cambria, "Times New Roman", Times, serif`
  }

  ctx.save()
  ctx.font = fontString
  ctx.textBaseline = 'middle'

  // Split input into lines and handle word wrapping based on user's customizable captionWidth (Canva-style)
  const maxAllowedW = width * ((storyState.captionWidth || 80) / 100)
  const rawLines = storyState.captionText.split('\n')
  const processedLines = []

  for (const rawLine of rawLines) {
    const text = (style === 'modern' || style === 'highlight') ? rawLine.toUpperCase() : rawLine
    if (ctx.measureText(text).width > maxAllowedW) {
      const wrapped = wrapCanvasText(ctx, text, maxAllowedW)
      processedLines.push(...wrapped)
    } else {
      processedLines.push(text)
    }
  }

  if (processedLines.length === 0) {
    ctx.restore()
    return
  }

  const padX = Math.round(16 * scale)
  const lineH = Math.round(fontSize * (hasHighlight ? 1.38 : 1.25))
  const lineGap = Math.round(6 * scale)
  const cornerRadius = style === 'typewriter' ? Math.round(8 * scale) : Math.round(14 * scale)

  // Measure all line widths & box widths
  const measuredLines = processedLines.map(text => {
    const w = ctx.measureText(text).width
    const boxW = hasHighlight ? w + padX * 2 : w
    return { text, textW: w, boxW }
  })

  const maxBoxW = Math.max(...measuredLines.map(m => m.boxW))
  const totalH = measuredLines.length * lineH + (measuredLines.length - 1) * lineGap

  const cx = (storyState.captionPos.x / 100) * width
  const cy = (storyState.captionPos.y / 100) * height

  const startY = cy - totalH / 2

  measuredLines.forEach((item, idx) => {
    const itemY = startY + idx * (lineH + lineGap) + lineH / 2

    let boxX = 0
    let textX = 0

    if (align === 'center') {
      boxX = cx - item.boxW / 2
      textX = cx
      ctx.textAlign = 'center'
    } else if (align === 'left') {
      const blockLeft = cx - maxBoxW / 2
      boxX = blockLeft
      textX = hasHighlight ? blockLeft + padX : blockLeft
      ctx.textAlign = 'left'
    } else if (align === 'right') {
      const blockRight = cx + maxBoxW / 2
      boxX = blockRight - item.boxW
      textX = hasHighlight ? blockRight - padX : blockRight
      ctx.textAlign = 'right'
    }

    // 1. Draw Background Highlight Box (if enabled or 'highlight' style)
    if (hasHighlight) {
      ctx.save()
      ctx.fillStyle = bgColor
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
      ctx.shadowBlur = 4 * scale
      ctx.shadowOffsetY = 1.5 * scale
      roundRect(ctx, boxX, itemY - lineH / 2, item.boxW, lineH, cornerRadius, true, false)
      if (style === 'typewriter') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.lineWidth = 1.5 * scale
        roundRect(ctx, boxX, itemY - lineH / 2, item.boxW, lineH, cornerRadius, false, true)
      }
      ctx.restore()
    }

    // 2. Draw Text with specific style effects
    if (style === 'neon') {
      ctx.save()
      ctx.fillStyle = textColor
      ctx.shadowColor = textColor
      ctx.shadowBlur = 12 * scale
      ctx.fillText(item.text, textX, itemY)
      ctx.shadowBlur = 5 * scale
      ctx.fillText(item.text, textX, itemY)
      ctx.restore()
    } else if (hasHighlight) {
      ctx.save()
      ctx.fillStyle = textColor
      ctx.fillText(item.text, textX, itemY)
      ctx.restore()
    } else {
      // Modern / Typewriter / Serif without highlight (Clean & Flat if captionShadow <= 0)
      ctx.save()
      const shadowVal = storyState.captionShadow ?? 0
      if (shadowVal > 0) {
        const opacity = Math.min(0.85, (shadowVal / 100) * 0.85).toFixed(2)
        ctx.shadowColor = `rgba(0, 0, 0, ${opacity})`
        ctx.shadowBlur = Math.round(((shadowVal / 100) * 3) * scale)
        ctx.shadowOffsetY = Math.round(((shadowVal / 100) * 1.2) * scale)
        ctx.shadowOffsetX = 0
      } else {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
        ctx.shadowOffsetX = 0
      }
      ctx.fillStyle = textColor
      ctx.fillText(item.text, textX, itemY)
      ctx.restore()
    }
  })

  ctx.restore()
}

// Draw Footer elements (Send Message bar, Heart, Paper Plane)
function drawFooter(ctx, width, height) {
  const footerY = height - 165
  const padX = 35

  // Send Message Capsule
  if (storyState.showMessageBar) {
    const hasRightButtons = storyState.showHeartBtn || storyState.showSendBtn
    const inputW = hasRightButtons ? width - 250 : width - (padX * 2)
    const inputH = 110

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 2.4
    roundRect(ctx, padX, footerY, inputW, inputH, inputH / 2, true, true)

    // Placeholder text: Reply to {username}...
    const placeholder = storyState.customPlaceholder || `Reply to ${storyState.username || 'user'}...`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = '400 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
    ctx.textBaseline = 'middle'
    ctx.fillText(placeholder, padX + 36, footerY + inputH / 2)
    ctx.restore()
  }

  // Heart Icon
  if (storyState.showHeartBtn) {
    const heartX = width - 165
    const heartY = footerY + 55
    drawHeartIcon(ctx, heartX, heartY, 62, storyState.isLiked)
  }

  // Paper Plane / Direct Share Icon
  if (storyState.showSendBtn) {
    const planeX = width - 75
    const planeY = footerY + 55
    drawPlaneIcon(ctx, planeX, planeY, 58)
  }

  // Smartphone Home Indicator bar at bottom
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  roundRect(ctx, width / 2 - 160, height - 32, 320, 9, 4.5, true, false)
  ctx.restore()
}

// Draw Heart SVG (Exact match with StoryFooter.vue)
function drawHeartIcon(ctx, cx, cy, size, isFilled) {
  ctx.save()
  ctx.translate(cx, cy)
  const scale = size / 24
  ctx.scale(scale, scale)
  ctx.translate(-12, -12)

  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 6

  if (isFilled) {
    const heartPath = new Path2D("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")
    ctx.fillStyle = '#ff3040'
    ctx.fill(heartPath)
  } else {
    const heartPath = new Path2D("M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.437-.283-1.79-1.509-4.303-3.752C5.152 14.08 2.5 12.194 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.117 1.763s.278-.588 1.117-1.763a4.21 4.21 0 0 1 3.675-1.941z")
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.9
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(heartPath)
  }

  ctx.restore()
}

// Draw Paper Plane (Exact match with StoryFooter.vue)
function drawPlaneIcon(ctx, cx, cy, size) {
  ctx.save()
  ctx.translate(cx, cy)
  const scale = size / 24
  ctx.scale(scale, scale)
  ctx.translate(-12, -12)

  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 6

  const planeLine = new Path2D("M22 2 11 13")
  const planePoly = new Path2D("M22 2 15 22 11 13 2 9 22 2Z")
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.9
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(planeLine)
  ctx.stroke(planePoly)

  ctx.restore()
}

// Helper: Canvas Rounded Rectangle
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}
