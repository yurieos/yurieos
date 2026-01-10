import { AuthFooter } from '@/components/auth-footer'

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <AuthFooter />
    </>
  )
}
