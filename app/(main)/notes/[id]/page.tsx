import { notFound, redirect } from 'next/navigation'

import { getNote } from '@/lib/actions/notes'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import { NoteEditorClient } from './note-editor-client'

interface NotePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: NotePageProps) {
  const { id } = await params
  const { note } = await getNote(id)

  return {
    title: note
      ? `${note.title || 'Untitled'} - Notes - Yurie`
      : 'Note Not Found',
    description: note?.title || 'View and edit your note'
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Not Available</h1>
          <p className="text-muted-foreground">
            Notes require Supabase to be configured.
          </p>
        </div>
      </div>
    )
  }

  // Check authentication
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/auth/login?redirect=/notes/${id}`)
  }

  // Fetch the note
  const { note, error } = await getNote(id)

  if (error || !note) {
    notFound()
  }

  return <NoteEditorClient note={note} />
}
