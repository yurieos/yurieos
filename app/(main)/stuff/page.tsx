import { FolderHeart } from 'lucide-react'

import { checkProtectedAccess } from '@/lib/utils/protected-page'

import { NotAvailable } from '@/components/not-available'
import { PageLayout } from '@/components/page-layout'

import { StuffGallery } from './stuff-gallery'

export const metadata = {
  title: 'Your Stuff - Yurie',
  description: 'View and manage your saved AI-generated images'
}

export default async function StuffPage() {
  const access = await checkProtectedAccess('/stuff')

  if (access.status === 'not-configured') {
    return (
      <NotAvailable
        feature="Your Stuff"
        description="Image storage requires Supabase to be configured. Please set up your environment variables."
        icon={FolderHeart}
      />
    )
  }

  return (
    <PageLayout
      title="Your Stuff"
      description="Your saved AI-generated images"
      maxWidth="7xl"
    >
      <StuffGallery />
    </PageLayout>
  )
}
