'use client'

import { useCallback, useRef, useState } from 'react'

import {
  Check,
  Download,
  Film,
  FolderHeart,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Paintbrush,
  Video,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { saveImage } from '@/lib/actions/images'
import { saveVideo } from '@/lib/actions/videos'
import { MAX_REFERENCE_IMAGES } from '@/lib/gemini/image-generation'
import {
  IMAGE_SIZES,
  ImageAspectRatio,
  ImageGenerationChunk,
  ImageSize,
  VideoAspectRatio,
  VideoDuration,
  VideoGenerationChunk,
  VideoGenerationMode,
  VideoResolution
} from '@/lib/gemini/types'
import { MAX_VIDEO_REFERENCE_IMAGES } from '@/lib/gemini/video-generation'
import { SUPPORTED_IMAGE_TYPES, SupportedImageType } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

// ============================================
// Types
// ============================================

type MediaType = 'image' | 'video'

interface ReferenceImagePreview {
  id: string
  data: string
  mimeType: SupportedImageType
  previewUrl: string
}

// ============================================
// Constants
// ============================================

/** Curated aspect ratios for cleaner UI */
const CURATED_IMAGE_ASPECT_RATIOS: ImageAspectRatio[] = [
  '1:1',
  '3:2',
  '2:3',
  '16:9',
  '9:16'
]

const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16']
const VIDEO_DURATIONS: VideoDuration[] = ['4', '6', '8']
const VIDEO_RESOLUTIONS: VideoResolution[] = ['720p', '1080p']

const VIDEO_MODE_OPTIONS: { value: VideoGenerationMode; label: string }[] = [
  { value: 'text-to-video', label: 'Text' },
  { value: 'image-to-video', label: 'Image' },
  { value: 'interpolation', label: 'Frames' },
  { value: 'reference', label: 'Reference' }
]

// ============================================
// Component
// ============================================

export function ImagineClient() {
  // Media type toggle
  const [mediaType, setMediaType] = useState<MediaType>('image')

  // Common state
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastFrameInputRef = useRef<HTMLInputElement>(null)

  // Image-specific state
  const [imageAspectRatio, setImageAspectRatio] =
    useState<ImageAspectRatio>('1:1')
  const [imageSize, setImageSize] = useState<ImageSize>('1K')
  const [referenceImages, setReferenceImages] = useState<
    ReferenceImagePreview[]
  >([])
  const [generatedImage, setGeneratedImage] = useState<{
    data: string
    mimeType: string
  } | null>(null)

  // Video-specific state
  const [videoAspectRatio, setVideoAspectRatio] =
    useState<VideoAspectRatio>('16:9')
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('8')
  const [videoResolution, setVideoResolution] =
    useState<VideoResolution>('720p')
  const [videoMode, setVideoMode] =
    useState<VideoGenerationMode>('text-to-video')
  const [useFastModel, setUseFastModel] = useState(false)
  const [negativePrompt, setNegativePrompt] = useState('')
  const [firstFrameImage, setFirstFrameImage] =
    useState<ReferenceImagePreview | null>(null)
  const [lastFrameImage, setLastFrameImage] =
    useState<ReferenceImagePreview | null>(null)
  const [generatedVideo, setGeneratedVideo] = useState<{
    data: string
    mimeType: string
  } | null>(null)

  // Convert file to base64
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle reference image selection for image generation
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const maxImages =
        mediaType === 'image'
          ? MAX_REFERENCE_IMAGES
          : MAX_VIDEO_REFERENCE_IMAGES
      const remainingSlots = maxImages - referenceImages.length
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxImages} reference images allowed`)
        return
      }

      const filesToProcess = Array.from(files).slice(0, remainingSlots)

      for (const file of filesToProcess) {
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
          toast.error(`${file.name}: Unsupported image type`)
          continue
        }

        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name}: Image too large (max 20MB)`)
          continue
        }

        try {
          const base64 = await fileToBase64(file)
          const preview: ReferenceImagePreview = {
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            data: base64,
            mimeType: file.type as SupportedImageType,
            previewUrl: URL.createObjectURL(file)
          }
          setReferenceImages(prev => [...prev, preview])
        } catch {
          toast.error(`${file.name}: Failed to process image`)
        }
      }

      e.target.value = ''
    },
    [referenceImages.length, mediaType]
  )

  // Handle first frame image selection for video
  const handleFirstFrameSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
        toast.error('Unsupported image type')
        return
      }

      try {
        const base64 = await fileToBase64(file)
        setFirstFrameImage({
          id: `first-${Date.now()}`,
          data: base64,
          mimeType: file.type as SupportedImageType,
          previewUrl: URL.createObjectURL(file)
        })
      } catch {
        toast.error('Failed to process image')
      }

      e.target.value = ''
    },
    []
  )

  // Handle last frame image selection for interpolation
  const handleLastFrameSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
        toast.error('Unsupported image type')
        return
      }

      try {
        const base64 = await fileToBase64(file)
        setLastFrameImage({
          id: `last-${Date.now()}`,
          data: base64,
          mimeType: file.type as SupportedImageType,
          previewUrl: URL.createObjectURL(file)
        })
      } catch {
        toast.error('Failed to process image')
      }

      e.target.value = ''
    },
    []
  )

  // Remove reference image
  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages(prev => {
      const img = prev.find(i => i.id === id)
      if (img) {
        URL.revokeObjectURL(img.previewUrl)
      }
      return prev.filter(i => i.id !== id)
    })
  }, [])

  // Generate image
  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)
    setGenerationStatus('Starting generation...')
    setIsSaved(false)

    try {
      const response = await fetch('/api/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio: imageAspectRatio,
          imageSize,
          referenceImages:
            referenceImages.length > 0
              ? referenceImages.map(img => ({
                  data: img.data,
                  mimeType: img.mimeType
                }))
              : undefined,
          includeText: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const chunk: ImageGenerationChunk = JSON.parse(data)

              switch (chunk.type) {
                case 'image-generating':
                  setGenerationStatus(chunk.status || 'Generating...')
                  break
                case 'image-thought':
                  setGenerationStatus('Processing thinking image...')
                  break
                case 'image-output':
                  if (chunk.imageData) {
                    setGeneratedImage({
                      data: chunk.imageData.data,
                      mimeType: chunk.imageData.mimeType
                    })
                    setGenerationStatus('Image generated!')
                  }
                  break
                case 'image-complete':
                  setGenerationStatus(chunk.status || 'Complete')
                  break
                case 'image-error':
                  if (chunk.blocked) {
                    toast.error(
                      chunk.blockReason || 'Content blocked by safety filters'
                    )
                  } else {
                    toast.error(chunk.error || 'Generation failed')
                  }
                  break
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate image'
      toast.error(message)
      setGenerationStatus('')
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, imageAspectRatio, imageSize, referenceImages])

  // Generate video
  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description')
      return
    }

    // Validate mode-specific requirements
    if (videoMode === 'image-to-video' && !firstFrameImage) {
      toast.error('Please add a first frame image')
      return
    }
    if (
      videoMode === 'interpolation' &&
      (!firstFrameImage || !lastFrameImage)
    ) {
      toast.error('Please add both first and last frame images')
      return
    }
    if (videoMode === 'reference' && referenceImages.length === 0) {
      toast.error('Please add at least one reference image')
      return
    }

    setIsGenerating(true)
    setGeneratedVideo(null)
    setGenerationStatus('Starting video generation...')
    setGenerationProgress(0)
    setIsSaved(false)

    try {
      const requestBody: Record<string, unknown> = {
        prompt,
        mode: videoMode,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        durationSeconds: videoDuration,
        useFastModel,
        negativePrompt: negativePrompt || undefined
      }

      // Add mode-specific fields
      if (videoMode === 'image-to-video' && firstFrameImage) {
        requestBody.firstFrameImage = {
          data: firstFrameImage.data,
          mimeType: firstFrameImage.mimeType
        }
      }

      if (videoMode === 'interpolation') {
        if (firstFrameImage) {
          requestBody.firstFrameImage = {
            data: firstFrameImage.data,
            mimeType: firstFrameImage.mimeType
          }
        }
        if (lastFrameImage) {
          requestBody.lastFrameImage = {
            data: lastFrameImage.data,
            mimeType: lastFrameImage.mimeType
          }
        }
      }

      if (videoMode === 'reference' && referenceImages.length > 0) {
        requestBody.referenceImages = referenceImages.map(img => ({
          data: img.data,
          mimeType: img.mimeType
        }))
      }

      const response = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const chunk: VideoGenerationChunk = JSON.parse(data)

              switch (chunk.type) {
                case 'video-starting':
                  setGenerationStatus(chunk.status || 'Starting...')
                  setGenerationProgress(5)
                  break
                case 'video-progress':
                  setGenerationStatus(chunk.status || 'Generating...')
                  if (chunk.progress) {
                    setGenerationProgress(chunk.progress)
                  }
                  break
                case 'video-complete':
                  if (chunk.videoData) {
                    setGeneratedVideo({
                      data: chunk.videoData.data,
                      mimeType: chunk.videoData.mimeType
                    })
                  }
                  setGenerationStatus('Video generated!')
                  setGenerationProgress(100)
                  break
                case 'video-error':
                  if (chunk.blocked) {
                    toast.error(
                      chunk.blockReason || 'Content blocked by safety filters'
                    )
                  } else {
                    toast.error(chunk.error || 'Generation failed')
                  }
                  break
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate video'
      toast.error(message)
      setGenerationStatus('')
    } finally {
      setIsGenerating(false)
    }
  }, [
    prompt,
    videoMode,
    videoAspectRatio,
    videoResolution,
    videoDuration,
    useFastModel,
    negativePrompt,
    firstFrameImage,
    lastFrameImage,
    referenceImages
  ])

  // Handle generate based on media type
  const handleGenerate = useCallback(() => {
    if (mediaType === 'image') {
      handleGenerateImage()
    } else {
      handleGenerateVideo()
    }
  }, [mediaType, handleGenerateImage, handleGenerateVideo])

  // Download generated media
  const handleDownload = useCallback(() => {
    if (mediaType === 'image' && generatedImage) {
      const link = document.createElement('a')
      link.href = `data:${generatedImage.mimeType};base64,${generatedImage.data}`
      link.download = `generated-image-${Date.now()}.${generatedImage.mimeType.split('/')[1]}`
      link.click()
    } else if (mediaType === 'video' && generatedVideo) {
      const link = document.createElement('a')
      link.href = `data:${generatedVideo.mimeType};base64,${generatedVideo.data}`
      link.download = `generated-video-${Date.now()}.mp4`
      link.click()
    }
  }, [mediaType, generatedImage, generatedVideo])

  // Save to Your Stuff
  const handleSaveToStuff = useCallback(async () => {
    if (isSaving || isSaved) return

    if (mediaType === 'image') {
      if (!generatedImage) return

      setIsSaving(true)

      try {
        const result = await saveImage({
          imageData: generatedImage.data,
          mimeType: generatedImage.mimeType as
            | 'image/png'
            | 'image/jpeg'
            | 'image/webp',
          prompt: prompt || undefined,
          aspectRatio: imageAspectRatio,
          imageSize
        })

        if ('error' in result) {
          toast.error(result.error)
        } else {
          setIsSaved(true)
          toast.success('Saved to Your Stuff')
        }
      } catch {
        toast.error('Failed to save image')
      } finally {
        setIsSaving(false)
      }
    } else {
      if (!generatedVideo) return

      setIsSaving(true)

      try {
        const result = await saveVideo({
          videoData: generatedVideo.data,
          mimeType: generatedVideo.mimeType as 'video/mp4' | 'video/webm',
          prompt: prompt || undefined,
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          durationSeconds: videoDuration
        })

        if ('error' in result) {
          toast.error(result.error)
        } else {
          setIsSaved(true)
          toast.success('Saved to Your Stuff')
        }
      } catch {
        toast.error('Failed to save video')
      } finally {
        setIsSaving(false)
      }
    }
  }, [
    mediaType,
    generatedImage,
    generatedVideo,
    isSaving,
    isSaved,
    prompt,
    imageAspectRatio,
    imageSize,
    videoAspectRatio,
    videoResolution,
    videoDuration
  ])

  // Clear frame images when changing video mode
  const handleVideoModeChange = useCallback(
    (mode: VideoGenerationMode) => {
      setVideoMode(mode)
      // Clear frame images when switching away from modes that use them
      if (mode !== 'image-to-video' && mode !== 'interpolation') {
        if (firstFrameImage) {
          URL.revokeObjectURL(firstFrameImage.previewUrl)
          setFirstFrameImage(null)
        }
        if (lastFrameImage) {
          URL.revokeObjectURL(lastFrameImage.previewUrl)
          setLastFrameImage(null)
        }
      }
      // Clear reference images when switching away from reference mode
      if (mode !== 'reference' && referenceImages.length > 0) {
        referenceImages.forEach(img => URL.revokeObjectURL(img.previewUrl))
        setReferenceImages([])
      }
    },
    [firstFrameImage, lastFrameImage, referenceImages]
  )

  // Get max reference images based on context
  const maxRefImages =
    mediaType === 'image' ? MAX_REFERENCE_IMAGES : MAX_VIDEO_REFERENCE_IMAGES

  const hasOutput =
    (mediaType === 'image' && generatedImage) ||
    (mediaType === 'video' && generatedVideo)

  return (
    <div className="space-y-6">
      {/* Media Type Toggle */}
      <div className="flex items-center justify-center gap-1 bg-muted/50 rounded-lg p-1 w-fit mx-auto">
        <button
          type="button"
          onClick={() => setMediaType('image')}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-1.5 h-8 px-4 text-sm rounded-md transition-all',
            mediaType === 'image'
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          <ImageIcon size={14} />
          Image
        </button>
        <button
          type="button"
          onClick={() => setMediaType('video')}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-1.5 h-8 px-4 text-sm rounded-md transition-all',
            mediaType === 'video'
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          <Film size={14} />
          Video
        </button>
      </div>

      {/* Generated Output Preview */}
      {(hasOutput || isGenerating) && (
        <div className="flex flex-col items-center">
          {hasOutput ? (
            <>
              {/* Media preview */}
              <div className="relative p-2 bg-gradient-to-b from-muted/80 to-muted/40 rounded-lg shadow-sm">
                <div className="relative rounded overflow-hidden ring-1 ring-border/50 shadow-inner">
                  {mediaType === 'image' && generatedImage ? (
                    <img
                      src={`data:${generatedImage.mimeType};base64,${generatedImage.data}`}
                      alt="Generated"
                      className="w-full h-auto max-h-[400px] object-contain bg-black/5"
                    />
                  ) : mediaType === 'video' && generatedVideo ? (
                    <video
                      src={`data:${generatedVideo.mimeType};base64,${generatedVideo.data}`}
                      controls
                      autoPlay
                      loop
                      className="w-full h-auto max-h-[400px] object-contain bg-black"
                    />
                  ) : null}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="h-8"
                >
                  <Download size={14} className="mr-1.5" />
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isSaved ? 'secondary' : 'outline'}
                  onClick={handleSaveToStuff}
                  disabled={isSaving || isSaved}
                  className="h-8"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : isSaved ? (
                    <Check size={14} className="mr-1.5" />
                  ) : (
                    <FolderHeart size={14} className="mr-1.5" />
                  )}
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">{generationStatus}</span>
              {mediaType === 'video' && generationProgress > 0 && (
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/70 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div className="space-y-2">
        <textarea
          id="prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={
            mediaType === 'image'
              ? 'A serene mountain lake at sunset with golden reflections...'
              : 'A cinematic shot of a majestic lion walking through the savannah at sunset, warm golden light, shallow depth of field...'
          }
          className="flex min-h-24 w-full rounded-lg border-0 bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          disabled={isGenerating}
        />
      </div>

      {/* Video Mode Selector */}
      {mediaType === 'video' && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Mode:</span>
          {VIDEO_MODE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleVideoModeChange(option.value)}
              disabled={isGenerating}
              className={cn(
                'h-7 px-2.5 text-xs rounded-md transition-all',
                videoMode === option.value
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                'disabled:opacity-50 disabled:pointer-events-none'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Frame Images for Video (image-to-video and interpolation modes) */}
      {mediaType === 'video' &&
        (videoMode === 'image-to-video' || videoMode === 'interpolation') && (
          <div className="flex items-center gap-3">
            {/* First Frame */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                First frame:
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_IMAGE_TYPES.join(',')}
                onChange={handleFirstFrameSelect}
                className="hidden"
              />
              {firstFrameImage ? (
                <div className="relative group">
                  <img
                    src={firstFrameImage.previewUrl}
                    alt="First frame"
                    className="size-10 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(firstFrameImage.previewUrl)
                      setFirstFrameImage(null)
                    }}
                    className="absolute -top-1 -right-1 size-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="size-10 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ImagePlus size={16} />
                </button>
              )}
            </div>

            {/* Last Frame (interpolation only) */}
            {videoMode === 'interpolation' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Last frame:
                </span>
                <input
                  ref={lastFrameInputRef}
                  type="file"
                  accept={SUPPORTED_IMAGE_TYPES.join(',')}
                  onChange={handleLastFrameSelect}
                  className="hidden"
                />
                {lastFrameImage ? (
                  <div className="relative group">
                    <img
                      src={lastFrameImage.previewUrl}
                      alt="Last frame"
                      className="size-10 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(lastFrameImage.previewUrl)
                        setLastFrameImage(null)
                      }}
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => lastFrameInputRef.current?.click()}
                    disabled={isGenerating}
                    className="size-10 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ImagePlus size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      {/* Reference Images (for image generation or video reference mode) */}
      {(mediaType === 'image' || videoMode === 'reference') && (
        <>
          <input
            ref={mediaType === 'image' ? fileInputRef : undefined}
            type="file"
            accept={SUPPORTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="reference-images-input"
          />
          <div className="flex items-center gap-2">
            {referenceImages.map(img => (
              <div key={img.id} className="relative group">
                <img
                  src={img.previewUrl}
                  alt="Reference"
                  className="size-10 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeReferenceImage(img.id)}
                  className="absolute -top-1 -right-1 size-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {referenceImages.length < maxRefImages && (
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(
                    'reference-images-input'
                  ) as HTMLInputElement
                  input?.click()
                }}
                disabled={isGenerating}
                className="size-10 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                title="Add reference image"
              >
                <ImagePlus size={16} />
              </button>
            )}
            {referenceImages.length === 0 && (
              <span className="text-xs text-muted-foreground/50">
                Reference images (optional, max {maxRefImages})
              </span>
            )}
          </div>
        </>
      )}

      {/* Image Options */}
      {mediaType === 'image' && (
        <div className="flex items-center justify-between gap-4">
          {/* Aspect Ratio */}
          <div className="flex items-center gap-1.5">
            {CURATED_IMAGE_ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio}
                type="button"
                onClick={() => setImageAspectRatio(ratio)}
                disabled={isGenerating}
                className={cn(
                  'h-7 px-2.5 text-xs rounded-md transition-all',
                  imageAspectRatio === ratio
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                {ratio}
              </button>
            ))}
          </div>

          {/* Resolution */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
            {IMAGE_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setImageSize(size)}
                disabled={isGenerating}
                className={cn(
                  'h-6 px-2.5 text-xs rounded transition-all',
                  imageSize === size
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                  'disabled:opacity-50 disabled:pointer-events-none'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Options */}
      {mediaType === 'video' && (
        <div className="space-y-3">
          {/* Row 1: Aspect Ratio, Duration, Resolution */}
          <div className="flex items-center justify-between gap-4">
            {/* Aspect Ratio */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Ratio:</span>
              {VIDEO_ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setVideoAspectRatio(ratio)}
                  disabled={isGenerating || videoMode === 'reference'}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all',
                    videoAspectRatio === ratio
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">
                Duration:
              </span>
              {VIDEO_DURATIONS.map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setVideoDuration(dur)}
                  disabled={
                    isGenerating ||
                    videoMode === 'interpolation' ||
                    videoMode === 'reference' ||
                    (videoResolution === '1080p' && dur !== '8')
                  }
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all',
                    videoDuration === dur
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
                >
                  {dur}s
                </button>
              ))}
            </div>

            {/* Resolution */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {VIDEO_RESOLUTIONS.map(res => (
                <button
                  key={res}
                  type="button"
                  onClick={() => {
                    setVideoResolution(res)
                    // 1080p requires 8s duration
                    if (res === '1080p') {
                      setVideoDuration('8')
                    }
                  }}
                  disabled={isGenerating}
                  className={cn(
                    'h-6 px-2.5 text-xs rounded transition-all',
                    videoResolution === res
                      ? 'bg-background text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Fast Model Toggle & Negative Prompt Toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={useFastModel}
                onChange={e => setUseFastModel(e.target.checked)}
                disabled={isGenerating}
                className="rounded border-muted-foreground/30"
              />
              <span className="text-muted-foreground">Fast model</span>
            </label>

            {/* Negative Prompt (collapsible) */}
            <details className="flex-1">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Negative prompt
              </summary>
              <input
                type="text"
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="cartoon, drawing, low quality..."
                className="mt-2 w-full h-8 rounded-md border-0 bg-muted/50 px-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                disabled={isGenerating}
              />
            </details>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full h-10"
      >
        {isGenerating ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            {mediaType === 'video' ? 'Generating Video...' : 'Generating...'}
          </>
        ) : (
          <>
            {mediaType === 'video' ? (
              <Video className="size-4 mr-2" />
            ) : (
              <Paintbrush className="size-4 mr-2" />
            )}
            Generate {mediaType === 'video' ? 'Video' : 'Image'}
          </>
        )}
      </Button>

      {/* Video generation hint */}
      {mediaType === 'video' && !isGenerating && !generatedVideo && (
        <p className="text-xs text-muted-foreground/60 text-center">
          Video generation takes 1-6 minutes. Include audio cues in your prompt
          for sound effects and dialogue.
        </p>
      )}
    </div>
  )
}
