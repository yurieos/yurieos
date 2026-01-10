import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 pb-16 md:p-10 md:pb-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex flex-col items-center justify-center gap-4">
                <span className="text-5xl">🧸</span>
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
            </CardContent>
          </Card>
          <div className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
