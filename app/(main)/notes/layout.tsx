import { Suspense } from 'react'

import NotesLoading from './loading'

export default function NotesLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<NotesLoading />}>{children}</Suspense>
}
