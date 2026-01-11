import { FileText } from 'lucide-react'

import { getNotes } from '@/lib/actions/notes'
import { checkProtectedAccess } from '@/lib/utils/protected-page'

import { NotAvailable } from '@/components/not-available'

import { NotesListClient } from './notes-list-client'

export const metadata = {
  title: 'Notes - Yurie',
  description: 'Your personal notes and documents'
}

export default async function NotesPage() {
  const access = await checkProtectedAccess('/notes')

  if (access.status === 'not-configured') {
    return (
      <NotAvailable
        feature="Notes"
        description="Notes require Supabase to be configured. Please set up your environment variables."
        icon={FileText}
      />
    )
  }

  const { notes, favorites } = await getNotes()

  return <NotesListClient notes={notes} favorites={favorites} />
}
