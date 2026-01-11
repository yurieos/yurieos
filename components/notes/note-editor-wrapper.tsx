'use client'

import { forwardRef } from 'react'
import dynamic from 'next/dynamic'

import type { PartialBlock } from '@blocknote/core'

import type { NoteBlock } from '@/lib/types/notes'

import { Skeleton } from '@/components/ui/skeleton'

import type { NoteEditorHandle } from './note-editor'

// Dynamically import the editor with SSR disabled
// BlockNote uses browser APIs that aren't available during SSR
const NoteEditorDynamic = dynamic(
  () => import('./note-editor').then(mod => ({ default: mod.NoteEditor })),
  {
    ssr: false,
    loading: () => <NoteEditorSkeleton />
  }
)

// Loading skeleton for the editor
function NoteEditorSkeleton() {
  return (
    <div className="w-full space-y-3 py-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4">
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

// Props interface - matches NoteEditor props
interface NoteEditorWrapperProps {
  noteId: string
  initialBlocks?: NoteBlock[]
  onSave?: (blocks: PartialBlock[]) => void | Promise<void>
  readOnly?: boolean
  autoSaveDelay?: number
}

// Re-export the handle type for consumers
export type { NoteEditorHandle }

// Wrapper component that handles dynamic loading with ref forwarding
export const NoteEditorWrapper = forwardRef<
  NoteEditorHandle,
  NoteEditorWrapperProps
>(function NoteEditorWrapper(props, ref) {
  return <NoteEditorDynamic {...props} ref={ref} />
})
