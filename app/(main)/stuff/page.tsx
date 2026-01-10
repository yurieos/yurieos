import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import { StuffGallery } from './stuff-gallery'

export const metadata = {
  title: 'Your Stuff - Yurie',
  description: 'View and manage your saved AI-generated images'
}

export default async function StuffPage() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Not Available</h1>
          <p className="text-muted-foreground">
            Image storage is not configured. Please set up Supabase to enable
            this feature.
          </p>
        </div>
      </div>
    )
  }

  // Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/stuff')
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-0.5">Your Stuff</h1>
        <p className="text-sm text-muted-foreground">
          Your saved AI-generated images
        </p>
      </div>
      <StuffGallery />
    </div>
  )
}
