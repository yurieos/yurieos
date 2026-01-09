import type { Metadata } from 'next'

import {
  BulletList,
  ExternalLink,
  LegalDocument,
  type LegalSection,
  ListItem,
  Paragraph,
  Strong,
  Subsection
} from '@/components/legal-document'

export const metadata: Metadata = {
  title: 'Privacy Policy | Yurie',
  description:
    'Privacy Policy for Yurie AI - Learn how we collect, use, and protect your information.'
}

const sections: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: (
      <>
        <Subsection title="1.1 Account Information">
          <Paragraph>
            When you sign in using Google OAuth, we collect:
          </Paragraph>
          <BulletList>
            <ListItem>Your email address</ListItem>
            <ListItem>Your name (as provided by Google)</ListItem>
            <ListItem>
              Your profile picture URL (as provided by Google)
            </ListItem>
          </BulletList>
          <Paragraph>
            We use this information solely for authentication purposes and to
            personalize your experience.
          </Paragraph>
        </Subsection>

        <Subsection title="1.2 Chat Data">
          <Paragraph>When you use our Service, we collect:</Paragraph>
          <BulletList>
            <ListItem>Your search queries and messages</ListItem>
            <ListItem>AI-generated responses to your queries</ListItem>
            <ListItem>Chat history and conversation metadata</ListItem>
          </BulletList>
        </Subsection>

        <Subsection title="1.3 Usage Data">
          <Paragraph>
            We automatically collect certain information when you use the
            Service:
          </Paragraph>
          <BulletList>
            <ListItem>Device and browser information</ListItem>
            <ListItem>IP address</ListItem>
            <ListItem>Pages visited and features used</ListItem>
            <ListItem>Time and date of your visits</ListItem>
          </BulletList>
        </Subsection>
      </>
    )
  },
  {
    id: 'how-we-use-information',
    title: '2. How We Use Your Information',
    content: (
      <>
        <Paragraph>We use the information we collect to:</Paragraph>
        <BulletList>
          <ListItem>Provide, maintain, and improve the Service</ListItem>
          <ListItem>Process your queries and generate AI responses</ListItem>
          <ListItem>Save and sync your chat history across devices</ListItem>
          <ListItem>
            Authenticate your identity and secure your account
          </ListItem>
          <ListItem>Analyze usage patterns to improve user experience</ListItem>
          <ListItem>Communicate with you about the Service</ListItem>
        </BulletList>
        <Paragraph>
          <Strong>
            We do not sell your personal information to third parties.
          </Strong>
        </Paragraph>
      </>
    )
  },
  {
    id: 'third-party-services',
    title: '3. Third-Party Services',
    content: (
      <>
        <Paragraph>
          We use the following third-party services to operate Yurie:
        </Paragraph>

        <Subsection title="3.1 Google Gemini API">
          <Paragraph>
            Your queries are processed by Google&apos;s Gemini AI models. Google
            may process this data according to their{' '}
            <ExternalLink href="https://policies.google.com/privacy">
              Privacy Policy
            </ExternalLink>
            .
          </Paragraph>
        </Subsection>

        <Subsection title="3.2 Supabase">
          <Paragraph>
            We use Supabase for authentication and user management. Your account
            data is stored securely on Supabase&apos;s infrastructure. See their{' '}
            <ExternalLink href="https://supabase.com/privacy">
              Privacy Policy
            </ExternalLink>
            .
          </Paragraph>
        </Subsection>

        <Subsection title="3.3 Upstash Redis">
          <Paragraph>
            Your chat history is stored using Upstash Redis for fast retrieval
            and persistence. See their{' '}
            <ExternalLink href="https://upstash.com/trust/privacy.pdf">
              Privacy Policy
            </ExternalLink>
            .
          </Paragraph>
        </Subsection>

        <Subsection title="3.4 Vercel">
          <Paragraph>
            Our Service is hosted on Vercel, and we use Vercel Analytics for
            usage statistics. See their{' '}
            <ExternalLink href="https://vercel.com/legal/privacy-policy">
              Privacy Policy
            </ExternalLink>
            .
          </Paragraph>
        </Subsection>
      </>
    )
  },
  {
    id: 'data-retention',
    title: '4. Data Retention',
    content: (
      <Paragraph>
        We retain your information for as long as your account is active or as
        needed to provide you the Service. You may delete your chat history at
        any time through the application. If you delete your account, we will
        delete your personal information within 30 days, except as required by
        law.
      </Paragraph>
    )
  },
  {
    id: 'your-rights',
    title: '5. Your Rights',
    content: (
      <>
        <Paragraph>You have the right to:</Paragraph>
        <BulletList>
          <ListItem>
            <Strong>Access</Strong> your personal information
          </ListItem>
          <ListItem>
            <Strong>Correct</Strong> inaccurate or incomplete information
          </ListItem>
          <ListItem>
            <Strong>Delete</Strong> your account and associated data
          </ListItem>
          <ListItem>
            <Strong>Export</Strong> your chat history
          </ListItem>
          <ListItem>
            <Strong>Opt out</Strong> of analytics tracking
          </ListItem>
        </BulletList>
        <Paragraph>
          To exercise these rights, please contact us at{' '}
          <ExternalLink href="mailto:os@yurie.ai">os@yurie.ai</ExternalLink>.
        </Paragraph>
      </>
    )
  },
  {
    id: 'data-security',
    title: '6. Data Security',
    content: (
      <>
        <Paragraph>
          We implement appropriate technical and organizational measures to
          protect your information, including:
        </Paragraph>
        <BulletList>
          <ListItem>HTTPS encryption for all data in transit</ListItem>
          <ListItem>Secure authentication via OAuth 2.0</ListItem>
          <ListItem>Regular security audits and updates</ListItem>
          <ListItem>Access controls and monitoring</ListItem>
        </BulletList>
        <Paragraph>
          However, no method of transmission over the Internet is 100% secure.
          We cannot guarantee absolute security of your data.
        </Paragraph>
      </>
    )
  },
  {
    id: 'cookies',
    title: '7. Cookies',
    content: (
      <>
        <Paragraph>We use essential cookies to:</Paragraph>
        <BulletList>
          <ListItem>Maintain your authentication session</ListItem>
          <ListItem>Remember your preferences (e.g., theme settings)</ListItem>
          <ListItem>Store your selected AI model preference</ListItem>
        </BulletList>
        <Paragraph>
          We use Vercel Analytics which may use cookies for usage analysis. You
          can disable cookies in your browser settings, but this may affect
          Service functionality.
        </Paragraph>
      </>
    )
  },
  {
    id: 'childrens-privacy',
    title: "8. Children's Privacy",
    content: (
      <Paragraph>
        The Service is not intended for users under 13 years of age. We do not
        knowingly collect information from children under 13. If we learn we
        have collected such information, we will delete it promptly.
      </Paragraph>
    )
  },
  {
    id: 'changes-to-policy',
    title: '9. Changes to This Policy',
    content: (
      <Paragraph>
        We may update this Privacy Policy from time to time. We will notify you
        of any material changes by posting the new policy on this page and
        updating the &quot;Last updated&quot; date. Your continued use of the
        Service after changes constitutes acceptance of the updated policy.
      </Paragraph>
    )
  }
]

const introduction = (
  <>
    <Paragraph>
      This Privacy Policy describes how Yurie (&quot;we&quot;, &quot;us&quot;,
      or &quot;our&quot;) collects, uses, and shares information about you when
      you use our AI-powered answer engine service at{' '}
      <ExternalLink href="https://www.yurie.ai">www.yurie.ai</ExternalLink> (the
      &quot;Service&quot;).
    </Paragraph>
  </>
)

const contactSection = (
  <>
    <Paragraph>
      If you have any questions about this Privacy Policy or our data practices,
      please contact us:
    </Paragraph>
    <BulletList>
      <ListItem>
        Email:{' '}
        <ExternalLink href="mailto:os@yurie.ai">os@yurie.ai</ExternalLink>
      </ListItem>
      <ListItem>
        Website:{' '}
        <ExternalLink href="https://www.yurie.ai">www.yurie.ai</ExternalLink>
      </ListItem>
    </BulletList>
  </>
)

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdated="January 8, 2026"
      introduction={introduction}
      sections={sections}
      contactSection={contactSection}
    />
  )
}
