import type { Metadata } from 'next'

import {
  BulletList,
  ExternalLink,
  InternalLink,
  LegalDocument,
  type LegalSection,
  ListItem,
  Paragraph,
  Strong,
  Subsection
} from '@/components/legal-document'

export const metadata: Metadata = {
  title: 'Terms of Service | Yurie',
  description:
    'Terms of Service for Yurie AI - Read our terms and conditions for using the service.'
}

const sections: LegalSection[] = [
  {
    id: 'description-of-service',
    title: '1. Description of Service',
    content: (
      <>
        <Paragraph>
          Yurie is an AI-powered answer engine that uses Google&apos;s Gemini AI
          models to provide research assistance and answer questions. The
          Service includes:
        </Paragraph>
        <BulletList>
          <ListItem>
            Standard mode with real-time search and code execution capabilities
          </ListItem>
          <ListItem>
            Deep Research mode for comprehensive multi-step research
          </ListItem>
          <ListItem>Chat history storage and synchronization</ListItem>
          <ListItem>
            Multiple AI model options with configurable thinking levels
          </ListItem>
        </BulletList>
      </>
    )
  },
  {
    id: 'user-accounts',
    title: '2. User Accounts',
    content: (
      <>
        <Subsection title="2.1 Account Creation">
          <Paragraph>
            To access certain features of the Service, you may create an account
            using Google OAuth authentication. By creating an account, you agree
            to provide accurate and complete information.
          </Paragraph>
        </Subsection>

        <Subsection title="2.2 Account Security">
          <Paragraph>
            You are responsible for maintaining the security of your account and
            for all activities that occur under your account. You must notify us
            immediately of any unauthorized use.
          </Paragraph>
        </Subsection>

        <Subsection title="2.3 Account Termination">
          <Paragraph>
            You may delete your account at any time. We may suspend or terminate
            your account if you violate these Terms or engage in prohibited
            conduct.
          </Paragraph>
        </Subsection>
      </>
    )
  },
  {
    id: 'acceptable-use',
    title: '3. Acceptable Use Policy',
    content: (
      <>
        <Paragraph>You agree not to use the Service to:</Paragraph>
        <BulletList>
          <ListItem>Violate any applicable laws or regulations</ListItem>
          <ListItem>
            Infringe on the intellectual property rights of others
          </ListItem>
          <ListItem>
            Generate or distribute harmful, illegal, or offensive content
          </ListItem>
          <ListItem>
            Attempt to bypass safety filters or manipulate AI responses
          </ListItem>
          <ListItem>Conduct automated scraping or data extraction</ListItem>
          <ListItem>
            Interfere with or disrupt the Service or its infrastructure
          </ListItem>
          <ListItem>
            Impersonate others or misrepresent your affiliation
          </ListItem>
          <ListItem>
            Use the Service for spam, phishing, or fraudulent activities
          </ListItem>
          <ListItem>
            Generate content that promotes violence, hatred, or discrimination
          </ListItem>
          <ListItem>Create malware, viruses, or other harmful code</ListItem>
        </BulletList>
      </>
    )
  },
  {
    id: 'ai-content-disclaimer',
    title: '4. AI-Generated Content Disclaimer',
    content: (
      <>
        <Paragraph>
          <Strong>Important:</Strong> The Service uses artificial intelligence
          to generate responses. You acknowledge and agree that:
        </Paragraph>
        <BulletList>
          <ListItem>
            <Strong>AI responses may contain errors.</Strong> AI-generated
            content may be inaccurate, incomplete, outdated, or misleading.
            Always verify important information from authoritative sources.
          </ListItem>
          <ListItem>
            <Strong>Not professional advice.</Strong> AI responses are not a
            substitute for professional legal, medical, financial, or other
            specialized advice. Consult qualified professionals for such
            matters.
          </ListItem>
          <ListItem>
            <Strong>No guarantees.</Strong> We do not guarantee the accuracy,
            reliability, completeness, or usefulness of any AI-generated
            content.
          </ListItem>
          <ListItem>
            <Strong>Your responsibility.</Strong> You are solely responsible for
            how you use and rely on AI-generated content.
          </ListItem>
        </BulletList>
      </>
    )
  },
  {
    id: 'intellectual-property',
    title: '5. Intellectual Property',
    content: (
      <>
        <Subsection title="5.1 Our Content">
          <Paragraph>
            The Service, including its design, features, and underlying
            technology, is owned by us and protected by copyright, trademark,
            and other intellectual property laws.
          </Paragraph>
        </Subsection>

        <Subsection title="5.2 Your Content">
          <Paragraph>
            You retain ownership of the content you submit to the Service (your
            queries and inputs). By using the Service, you grant us a limited
            license to process your content solely to provide the Service.
          </Paragraph>
        </Subsection>

        <Subsection title="5.3 AI Output">
          <Paragraph>
            AI-generated responses are provided for your personal use. You may
            use AI outputs in accordance with applicable laws and these Terms,
            subject to any restrictions imposed by our third-party AI providers.
          </Paragraph>
        </Subsection>
      </>
    )
  },
  {
    id: 'privacy',
    title: '6. Privacy',
    content: (
      <Paragraph>
        Your use of the Service is subject to our{' '}
        <InternalLink href="/privacy">Privacy Policy</InternalLink>, which
        describes how we collect, use, and protect your information. By using
        the Service, you consent to the data practices described in the Privacy
        Policy.
      </Paragraph>
    )
  },
  {
    id: 'third-party-services',
    title: '7. Third-Party Services',
    content: (
      <Paragraph>
        The Service integrates with third-party services including Google Gemini
        API, Supabase, Upstash, and Vercel. Your use of these integrated
        services is subject to their respective terms and policies. We are not
        responsible for the practices of third-party services.
      </Paragraph>
    )
  },
  {
    id: 'service-availability',
    title: '8. Service Availability',
    content: (
      <>
        <Paragraph>
          We strive to maintain Service availability but do not guarantee
          uninterrupted access. The Service may be temporarily unavailable due
          to:
        </Paragraph>
        <BulletList>
          <ListItem>Scheduled maintenance</ListItem>
          <ListItem>Technical issues or outages</ListItem>
          <ListItem>Third-party service disruptions</ListItem>
          <ListItem>Events beyond our reasonable control</ListItem>
        </BulletList>
      </>
    )
  },
  {
    id: 'limitation-of-liability',
    title: '9. Limitation of Liability',
    content: (
      <>
        <Paragraph>
          <Strong>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED
            &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
            ANY KIND.
          </Strong>
        </Paragraph>
        <Paragraph>
          We shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to:
        </Paragraph>
        <BulletList>
          <ListItem>Loss of profits, data, or goodwill</ListItem>
          <ListItem>Service interruption or data loss</ListItem>
          <ListItem>Errors or inaccuracies in AI-generated content</ListItem>
          <ListItem>Unauthorized access to your account</ListItem>
          <ListItem>Any third-party conduct or content</ListItem>
        </BulletList>
        <Paragraph>
          Our total liability shall not exceed the amount you paid us (if any)
          in the twelve months preceding the claim.
        </Paragraph>
      </>
    )
  },
  {
    id: 'indemnification',
    title: '10. Indemnification',
    content: (
      <>
        <Paragraph>
          You agree to indemnify and hold us harmless from any claims, damages,
          losses, or expenses (including legal fees) arising from:
        </Paragraph>
        <BulletList>
          <ListItem>Your use of the Service</ListItem>
          <ListItem>Your violation of these Terms</ListItem>
          <ListItem>Your violation of any third-party rights</ListItem>
          <ListItem>Content you submit through the Service</ListItem>
        </BulletList>
      </>
    )
  },
  {
    id: 'changes-to-terms',
    title: '11. Changes to Terms',
    content: (
      <Paragraph>
        We may modify these Terms at any time. We will notify you of material
        changes by posting the updated Terms on this page and updating the
        &quot;Last updated&quot; date. Your continued use of the Service after
        changes constitutes acceptance of the modified Terms.
      </Paragraph>
    )
  },
  {
    id: 'governing-law',
    title: '12. Governing Law',
    content: (
      <Paragraph>
        These Terms shall be governed by and construed in accordance with the
        laws of the State of California, United States, without regard to its
        conflict of law provisions. Any disputes shall be resolved in the courts
        of California.
      </Paragraph>
    )
  },
  {
    id: 'severability',
    title: '13. Severability',
    content: (
      <Paragraph>
        If any provision of these Terms is found to be unenforceable, the
        remaining provisions shall continue in full force and effect.
      </Paragraph>
    )
  },
  {
    id: 'entire-agreement',
    title: '14. Entire Agreement',
    content: (
      <Paragraph>
        These Terms, together with our Privacy Policy, constitute the entire
        agreement between you and us regarding the Service and supersede any
        prior agreements.
      </Paragraph>
    )
  }
]

const introduction = (
  <>
    <Paragraph>
      Welcome to Yurie. These Terms of Service (&quot;Terms&quot;) govern your
      access to and use of the Yurie AI-powered answer engine service at{' '}
      <ExternalLink href="https://www.yurie.ai">www.yurie.ai</ExternalLink> (the
      &quot;Service&quot;), operated by Yurie (&quot;we&quot;, &quot;us&quot;,
      or &quot;our&quot;).
    </Paragraph>
    <Paragraph>
      <Strong>
        By accessing or using the Service, you agree to be bound by these Terms.
        If you do not agree to these Terms, do not use the Service.
      </Strong>
    </Paragraph>
  </>
)

const contactSection = (
  <>
    <Paragraph>
      If you have any questions about these Terms, please contact us:
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

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdated="January 8, 2026"
      introduction={introduction}
      sections={sections}
      contactSection={contactSection}
    />
  )
}
