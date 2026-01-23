import { createClient } from '@/lib/supabase/server'

import { SidebarProvider } from '@/components/ui/sidebar'

import AppSidebar from '@/components/app-sidebar'
import Header from '@/components/header'

export default async function MainLayout({
  children
}: {
  children: React.ReactNode
}) {
  let user = null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser }
    } = await supabase.auth.getUser()
    user = supabaseUser
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar user={user} />
      <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden">
        <Header user={user} />
        <main className="flex flex-1 min-h-0 min-w-0 overflow-x-hidden">
          <div className="flex-1 min-h-0 h-screen flex min-w-0 overflow-x-hidden max-w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
