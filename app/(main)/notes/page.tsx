import { redirect } from 'next/navigation'

import { FileText } from 'lucide-react'

import { getNotes } from '@/lib/actions/notes'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import { NotesListClient } from './notes-list-client'

export const metadata = {
  title: 'Notes - Yurie',
  description: 'Your personal notes and documents'
}

export default async function NotesPage() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="size-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
            <FileText className="size-10 text-muted-foreground/40" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Not Available</h1>
          <p className="text-muted-foreground leading-relaxed">
            Notes require Supabase to be configured. Please set up your
            environment variables.
          </p>
        </div>
      </div>
    )
  }

  // Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/notes')
  }

  // Fetch user's notes (flat list)
  const { notes, favorites } = await getNotes()

  return <NotesListClient notes={notes} favorites={favorites} />
}
