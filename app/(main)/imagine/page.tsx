import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth/get-current-user'
import { isSupabaseConfigured } from '@/lib/supabase/server'

import { ImagineClient } from './imagine-client'

export const metadata = {
  title: 'Imagine - Yurie',
  description: 'Generate images with AI'
}

export default async function ImaginePage() {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Not Available</h1>
          <p className="text-muted-foreground">
            Image generation is not configured. Please set up Supabase to enable
            this feature.
          </p>
        </div>
      </div>
    )
  }

  // Check authentication
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/imagine')
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-0.5">Imagine</h1>
        <p className="text-sm text-muted-foreground">Generate images with AI</p>
      </div>
      <ImagineClient />
    </div>
  )
}
