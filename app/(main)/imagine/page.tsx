import { ImageIcon } from 'lucide-react'

import { checkProtectedAccess } from '@/lib/utils/protected-page'

import { NotAvailable } from '@/components/not-available'
import { PageLayout } from '@/components/page-layout'

import { ImagineClient } from './imagine-client'

export const metadata = {
  title: 'Imagine - Yurie',
  description: 'Generate images with AI'
}

export default async function ImaginePage() {
  const access = await checkProtectedAccess('/imagine')

  if (access.status === 'not-configured') {
    return (
      <NotAvailable
        feature="Image generation"
        description="Image generation requires Supabase to be configured. Please set up your environment variables."
        icon={ImageIcon}
      />
    )
  }

  return (
    <PageLayout title="Imagine" description="Generate images with AI">
      <ImagineClient />
    </PageLayout>
  )
}
