export default function LegalLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden">
      <main className="flex flex-1 min-h-0 min-w-0 overflow-x-hidden">
        <div className="flex-1 min-h-0 h-screen flex min-w-0 overflow-x-hidden max-w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
