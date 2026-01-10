'use client'

import { useCallback, useRef, useState } from 'react'

import {
  Check,
  Download,
  FolderHeart,
  ImagePlus,
  Loader2,
  Paintbrush,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { saveImage } from '@/lib/actions/images'
import { MAX_REFERENCE_IMAGES } from '@/lib/gemini/image-generation'
import {
  IMAGE_SIZES,
  ImageAspectRatio,
  ImageGenerationChunk,
  ImageSize
} from '@/lib/gemini/types'
import { SUPPORTED_IMAGE_TYPES, SupportedImageType } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

// ============================================
// Types
// ============================================

interface ImagineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImageGenerated?: (imageData: string, mimeType: string) => void
  /** Whether the user is authenticated (enables save to Your Stuff) */
  isAuthenticated?: boolean
}

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
const CURATED_ASPECT_RATIOS: ImageAspectRatio[] = [
  '1:1',
  '3:2',
  '2:3',
  '16:9',
  '9:16'
]

// ============================================
// Component
// ============================================

export function ImagineModal({
  open,
  onOpenChange,
  onImageGenerated,
  isAuthenticated = false
}: ImagineModalProps) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1')
  const [imageSize, setImageSize] = useState<ImageSize>('1K')
  const [referenceImages, setReferenceImages] = useState<
    ReferenceImagePreview[]
  >([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{
    data: string
    mimeType: string
  } | null>(null)
  const [generationStatus, setGenerationStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Convert file to base64
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle reference image selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const remainingSlots = MAX_REFERENCE_IMAGES - referenceImages.length
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${MAX_REFERENCE_IMAGES} reference images allowed`)
        return
      }

      const filesToProcess = Array.from(files).slice(0, remainingSlots)

      for (const file of filesToProcess) {
        // Validate type
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type as SupportedImageType)) {
          toast.error(`${file.name}: Unsupported image type`)
          continue
        }

        // Validate size (20MB max)
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

      // Reset input
      e.target.value = ''
    },
    [referenceImages.length]
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
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)
    setGenerationStatus('Starting generation...')

    try {
      const response = await fetch('/api/imagine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          aspectRatio,
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

      // Process SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

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
                case 'image-text':
                  // Handle text response if needed
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
  }, [prompt, aspectRatio, imageSize, referenceImages])

  // Use generated image
  const handleUseImage = useCallback(() => {
    if (generatedImage && onImageGenerated) {
      onImageGenerated(generatedImage.data, generatedImage.mimeType)
      onOpenChange(false)
    }
  }, [generatedImage, onImageGenerated, onOpenChange])

  // Download generated image
  const handleDownload = useCallback(() => {
    if (!generatedImage) return

    const link = document.createElement('a')
    link.href = `data:${generatedImage.mimeType};base64,${generatedImage.data}`
    link.download = `generated-image-${Date.now()}.${generatedImage.mimeType.split('/')[1]}`
    link.click()
  }, [generatedImage])

  // Save to Your Stuff
  const handleSaveToStuff = useCallback(async () => {
    if (!generatedImage || isSaving || isSaved) return

    setIsSaving(true)

    try {
      const result = await saveImage({
        imageData: generatedImage.data,
        mimeType: generatedImage.mimeType as
          | 'image/png'
          | 'image/jpeg'
          | 'image/webp',
        prompt: prompt || undefined,
        aspectRatio,
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
  }, [generatedImage, isSaving, isSaved, prompt, aspectRatio, imageSize])

  // Reset state when modal closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Clean up reference image previews
        referenceImages.forEach(img => URL.revokeObjectURL(img.previewUrl))
        setPrompt('')
        setReferenceImages([])
        setGeneratedImage(null)
        setGenerationStatus('')
        setIsSaved(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, referenceImages]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-medium">Imagine</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Generated Image Preview - Show at top when available */}
          {(generatedImage || isGenerating) && (
            <div className="flex flex-col items-center">
              {generatedImage ? (
                <>
                  {/* Framed image */}
                  <div className="relative p-2 bg-gradient-to-b from-muted/80 to-muted/40 rounded-lg shadow-sm">
                    <div className="relative rounded overflow-hidden ring-1 ring-border/50 shadow-inner">
                      <img
                        src={`data:${generatedImage.mimeType};base64,${generatedImage.data}`}
                        alt="Generated"
                        className="w-full h-auto max-h-[300px] object-contain bg-black/5"
                      />
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
                    {isAuthenticated && (
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
                    )}
                    {onImageGenerated && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUseImage}
                        className="h-8"
                      >
                        Use in Chat
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-sm">{generationStatus}</span>
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
              placeholder="A serene mountain lake at sunset with golden reflections..."
              className="flex min-h-20 w-full rounded-lg border-0 bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Reference Images - Compact inline */}
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
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
            {referenceImages.length < MAX_REFERENCE_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="size-10 rounded-md border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                title="Add reference image"
              >
                <ImagePlus size={16} />
              </button>
            )}
            {referenceImages.length === 0 && (
              <span className="text-xs text-muted-foreground/50">
                Reference images (optional)
              </span>
            )}
          </div>

          {/* Options Row - Compact inline layout */}
          <div className="flex items-center justify-between gap-4">
            {/* Aspect Ratio */}
            <div className="flex items-center gap-1.5">
              {CURATED_ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  disabled={isGenerating}
                  className={cn(
                    'h-7 px-2.5 text-xs rounded-md transition-all',
                    aspectRatio === ratio
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    'disabled:opacity-50 disabled:pointer-events-none'
                  )}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Resolution - Minimal pills */}
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-10"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Paintbrush className="size-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
