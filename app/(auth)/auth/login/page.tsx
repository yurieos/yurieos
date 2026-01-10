import { LoginForm } from '@/components/auth-forms'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 pb-16 md:p-10 md:pb-16">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
