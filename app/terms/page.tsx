import type { Metadata } from 'next'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Terms of Service | Yurie',
  description:
    'Terms of Service for Yurie AI - Read our terms and conditions for using the service.'
}

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center gap-6">
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex flex-col items-center justify-center gap-4">
                <span className="text-5xl">🧸</span>
                Terms of Service
              </CardTitle>
              <CardDescription>Last updated: January 8, 2026</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <p>
                Welcome to Yurie. These Terms of Service (&quot;Terms&quot;)
                govern your access to and use of the Yurie AI-powered answer
                engine service at{' '}
                <a
                  href="https://www.yurie.ai"
                  className="text-primary hover:underline"
                >
                  www.yurie.ai
                </a>{' '}
                (the &quot;Service&quot;), operated by Yurie (&quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;).
              </p>
              <p>
                <strong>
                  By accessing or using the Service, you agree to be bound by
                  these Terms. If you do not agree to these Terms, do not use
                  the Service.
                </strong>
              </p>

              <h2>1. Description of Service</h2>
              <p>
                Yurie is an AI-powered answer engine that uses Google&apos;s
                Gemini AI models to provide research assistance and answer
                questions. The Service includes:
              </p>
              <ul>
                <li>
                  Standard mode with real-time search and code execution
                  capabilities
                </li>
                <li>
                  Deep Research mode for comprehensive multi-step research
                </li>
                <li>Chat history storage and synchronization</li>
                <li>
                  Multiple AI model options with configurable thinking levels
                </li>
              </ul>

              <h2>2. User Accounts</h2>

              <h3>2.1 Account Creation</h3>
              <p>
                To access certain features of the Service, you may create an
                account using Google OAuth authentication. By creating an
                account, you agree to provide accurate and complete information.
              </p>

              <h3>2.2 Account Security</h3>
              <p>
                You are responsible for maintaining the security of your account
                and for all activities that occur under your account. You must
                notify us immediately of any unauthorized use.
              </p>

              <h3>2.3 Account Termination</h3>
              <p>
                You may delete your account at any time. We may suspend or
                terminate your account if you violate these Terms or engage in
                prohibited conduct.
              </p>

              <h2>3. Acceptable Use Policy</h2>
              <p>You agree not to use the Service to:</p>
              <ul>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the intellectual property rights of others</li>
                <li>
                  Generate or distribute harmful, illegal, or offensive content
                </li>
                <li>
                  Attempt to bypass safety filters or manipulate AI responses
                </li>
                <li>Conduct automated scraping or data extraction</li>
                <li>
                  Interfere with or disrupt the Service or its infrastructure
                </li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>
                  Use the Service for spam, phishing, or fraudulent activities
                </li>
                <li>
                  Generate content that promotes violence, hatred, or
                  discrimination
                </li>
                <li>Create malware, viruses, or other harmful code</li>
              </ul>

              <h2>4. AI-Generated Content Disclaimer</h2>
              <p>
                <strong>Important:</strong> The Service uses artificial
                intelligence to generate responses. You acknowledge and agree
                that:
              </p>
              <ul>
                <li>
                  <strong>AI responses may contain errors.</strong> AI-generated
                  content may be inaccurate, incomplete, outdated, or
                  misleading. Always verify important information from
                  authoritative sources.
                </li>
                <li>
                  <strong>Not professional advice.</strong> AI responses are not
                  a substitute for professional legal, medical, financial, or
                  other specialized advice. Consult qualified professionals for
                  such matters.
                </li>
                <li>
                  <strong>No guarantees.</strong> We do not guarantee the
                  accuracy, reliability, completeness, or usefulness of any
                  AI-generated content.
                </li>
                <li>
                  <strong>Your responsibility.</strong> You are solely
                  responsible for how you use and rely on AI-generated content.
                </li>
              </ul>

              <h2>5. Intellectual Property</h2>

              <h3>5.1 Our Content</h3>
              <p>
                The Service, including its design, features, and underlying
                technology, is owned by us and protected by copyright,
                trademark, and other intellectual property laws.
              </p>

              <h3>5.2 Your Content</h3>
              <p>
                You retain ownership of the content you submit to the Service
                (your queries and inputs). By using the Service, you grant us a
                limited license to process your content solely to provide the
                Service.
              </p>

              <h3>5.3 AI Output</h3>
              <p>
                AI-generated responses are provided for your personal use. You
                may use AI outputs in accordance with applicable laws and these
                Terms, subject to any restrictions imposed by our third-party AI
                providers.
              </p>

              <h2>6. Privacy</h2>
              <p>
                Your use of the Service is subject to our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                , which describes how we collect, use, and protect your
                information. By using the Service, you consent to the data
                practices described in the Privacy Policy.
              </p>

              <h2>7. Third-Party Services</h2>
              <p>
                The Service integrates with third-party services including
                Google Gemini API, Supabase, Upstash, and Vercel. Your use of
                these integrated services is subject to their respective terms
                and policies. We are not responsible for the practices of
                third-party services.
              </p>

              <h2>8. Service Availability</h2>
              <p>
                We strive to maintain Service availability but do not guarantee
                uninterrupted access. The Service may be temporarily unavailable
                due to:
              </p>
              <ul>
                <li>Scheduled maintenance</li>
                <li>Technical issues or outages</li>
                <li>Third-party service disruptions</li>
                <li>Events beyond our reasonable control</li>
              </ul>

              <h2>9. Limitation of Liability</h2>
              <p>
                <strong>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS
                  PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
                  WITHOUT WARRANTIES OF ANY KIND.
                </strong>
              </p>
              <p>
                We shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited
                to:
              </p>
              <ul>
                <li>Loss of profits, data, or goodwill</li>
                <li>Service interruption or data loss</li>
                <li>Errors or inaccuracies in AI-generated content</li>
                <li>Unauthorized access to your account</li>
                <li>Any third-party conduct or content</li>
              </ul>
              <p>
                Our total liability shall not exceed the amount you paid us (if
                any) in the twelve months preceding the claim.
              </p>

              <h2>10. Indemnification</h2>
              <p>
                You agree to indemnify and hold us harmless from any claims,
                damages, losses, or expenses (including legal fees) arising
                from:
              </p>
              <ul>
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Content you submit through the Service</li>
              </ul>

              <h2>11. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on this page and
                updating the &quot;Last updated&quot; date. Your continued use
                of the Service after changes constitutes acceptance of the
                modified Terms.
              </p>

              <h2>12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of the State of California, United States, without
                regard to its conflict of law provisions. Any disputes shall be
                resolved in the courts of California.
              </p>

              <h2>13. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions shall continue in full force and
                effect.
              </p>

              <h2>14. Entire Agreement</h2>
              <p>
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and us regarding the Service and
                supersede any prior agreements.
              </p>

              <h2>15. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us:
              </p>
              <ul>
                <li>
                  Email:{' '}
                  <a
                    href="mailto:os@yurie.ai"
                    className="text-primary hover:underline"
                  >
                    os@yurie.ai
                  </a>
                </li>
                <li>
                  Website:{' '}
                  <a
                    href="https://www.yurie.ai"
                    className="text-primary hover:underline"
                  >
                    www.yurie.ai
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
          <div className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              &larr; Back to Home
            </Link>
            <span className="mx-2">·</span>
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
