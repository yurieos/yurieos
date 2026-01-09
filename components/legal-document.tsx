'use client'

import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

// ============================================
// Types
// ============================================

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

export interface LegalDocumentProps {
  title: string
  lastUpdated: string
  introduction: React.ReactNode
  sections: LegalSection[]
  contactSection?: React.ReactNode
}

// ============================================
// Section Component
// ============================================

function Section({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold text-foreground mb-3 pb-2 border-b">
        {section.title}
      </h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">
        {section.content}
      </div>
    </section>
  )
}

// ============================================
// External Link Component
// ============================================

export function ExternalLink({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </a>
  )
}

// ============================================
// Internal Link Component
// ============================================

export function InternalLink({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </Link>
  )
}

// ============================================
// List Components
// ============================================

export function BulletList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-outside ml-5 space-y-1.5">{children}</ul>
}

export function ListItem({ children }: { children: React.ReactNode }) {
  return <li className="text-muted-foreground">{children}</li>
}

// ============================================
// Subsection Component
// ============================================

export function Subsection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {children}
    </div>
  )
}

// ============================================
// Paragraph Component
// ============================================

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground leading-relaxed">{children}</p>
}

// ============================================
// Strong/Bold Text Component
// ============================================

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground font-medium">{children}</strong>
}

// ============================================
// Main Legal Document Component
// ============================================

export function LegalDocument({
  title,
  lastUpdated,
  introduction,
  sections,
  contactSection
}: LegalDocumentProps) {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl" role="img" aria-label="Yurie mascot">
              🧸
            </span>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          </div>
          <CardDescription>Last updated: {lastUpdated}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Introduction */}
          <div className="text-muted-foreground leading-relaxed space-y-3">
            {introduction}
          </div>

          {/* Table of Contents */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium">
                Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <nav className="space-y-1">
                {sections.map(section => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm py-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Sections */}
          {sections.map(section => (
            <Section key={section.id} section={section} />
          ))}

          {/* Contact Section */}
          {contactSection && (
            <section className="pt-4 border-t">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                Contact Us
              </h2>
              <div className="text-muted-foreground leading-relaxed">
                {contactSection}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
