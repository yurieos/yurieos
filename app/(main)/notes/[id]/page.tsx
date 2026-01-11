import { notFound } from 'next/navigation'

import { FileText } from 'lucide-react'

import { getNote } from '@/lib/actions/notes'
import { checkProtectedAccess } from '@/lib/utils/protected-page'

import { NotAvailable } from '@/components/not-available'

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
  const access = await checkProtectedAccess(`/notes/${id}`)

  if (access.status === 'not-configured') {
    return (
      <NotAvailable
        feature="Notes"
        description="Notes require Supabase to be configured."
        icon={FileText}
      />
    )
  }

  const { note, error } = await getNote(id)

  if (error || !note) {
    notFound()
  }

  return <NoteEditorClient note={note} />
}
