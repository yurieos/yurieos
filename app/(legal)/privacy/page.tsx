import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Yurie',
  description:
    'Privacy Policy for Yurie AI - Learn how we collect, use, and protect your information.'
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-svh w-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        {/* Header */}
        <header className="mb-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition-colors mb-8"
          >
            <span className="text-xl">🧸</span>
            <span className="text-xl font-medium">Yurie</span>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 17, 2026
          </p>
        </header>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-foreground prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground max-w-none">
          <p className="text-base leading-relaxed">
            This Privacy Policy describes how Yurie (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares
            information about you when you use our Agentic AI service at{' '}
            <a href="https://www.yurie.ai">www.yurie.ai</a> (the
            &quot;Service&quot;). This policy applies to all users worldwide,
            including users in the European Economic Area (EEA), United Kingdom,
            Switzerland, California, and other jurisdictions with specific
            privacy requirements.
          </p>
          <p>
            <strong>
              By using the Service, you acknowledge that you are interacting
              with an AI-powered system. This disclosure is provided in
              compliance with the EU AI Act and other applicable transparency
              requirements.
            </strong>
          </p>

          {/* Section 1: Information We Collect */}
          <h2>1. Information We Collect</h2>

          <h3>1.1 Account Information</h3>
          <p>When you sign in using Google OAuth, we collect:</p>
          <ul>
            <li>Your email address</li>
            <li>Your name (as provided by Google)</li>
            <li>Your profile picture URL (as provided by Google)</li>
            <li>Google account identifier (for authentication purposes)</li>
          </ul>
          <p>
            We use this information solely for authentication purposes and to
            personalize your experience.
          </p>

          <h3>1.2 Chat and Media Data</h3>
          <p>When you use our Service, we collect:</p>
          <ul>
            <li>Your search queries, prompts, and messages</li>
            <li>
              Media attachments you upload (images, videos, documents, and
              audio)
            </li>
            <li>AI-generated responses, images, and videos</li>
            <li>Chat history and conversation metadata</li>
            <li>Model preferences and settings</li>
          </ul>

          <h3>1.3 AI-Generated Content</h3>
          <p>When you use our AI generation features, we collect:</p>
          <ul>
            <li>Prompts used for image generation</li>
            <li>Prompts used for video generation</li>
            <li>Generated images and videos you choose to save</li>
            <li>Metadata associated with generated content</li>
          </ul>

          <h3>1.4 Usage Data</h3>
          <p>
            We automatically collect certain information when you use the
            Service:
          </p>
          <ul>
            <li>Device and browser information (type, version, operating system)</li>
            <li>IP address (used for security and approximate location)</li>
            <li>Pages visited and features used</li>
            <li>Time and date of your visits</li>
            <li>Referring website or application</li>
            <li>Performance and error data</li>
          </ul>

          <h3>1.5 Categories of Personal Information (CCPA)</h3>
          <p>
            Under the California Consumer Privacy Act (CCPA), we collect the
            following categories of personal information:
          </p>
          <ul>
            <li>
              <strong>Identifiers:</strong> Name, email address, IP address,
              account ID
            </li>
            <li>
              <strong>Internet Activity:</strong> Browsing history, search
              history, interaction with the Service
            </li>
            <li>
              <strong>Geolocation Data:</strong> Approximate location based on
              IP address
            </li>
            <li>
              <strong>Inferences:</strong> Preferences and characteristics
              derived from usage patterns
            </li>
          </ul>

          {/* Section 2: How We Use Your Information */}
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service</li>
            <li>Process your queries and generate AI responses</li>
            <li>Generate AI images and videos based on your prompts</li>
            <li>Save and sync your chat history across devices</li>
            <li>Authenticate your identity and secure your account</li>
            <li>Analyze usage patterns to improve user experience</li>
            <li>Communicate with you about the Service</li>
            <li>Detect, prevent, and address technical issues and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            <strong>
              We do not sell or share your personal information with third
              parties for their marketing purposes.
            </strong>
          </p>

          {/* Section 3: Legal Basis for Processing (GDPR) */}
          <h2>3. Legal Basis for Processing (GDPR)</h2>
          <p>
            For users in the European Economic Area (EEA), United Kingdom, and
            Switzerland, we process your personal data based on the following
            legal grounds:
          </p>

          <h3>3.1 Contract Performance</h3>
          <p>
            Processing necessary to provide the Service you requested, including
            account creation, chat functionality, and AI generation features.
          </p>

          <h3>3.2 Legitimate Interests</h3>
          <p>
            Processing necessary for our legitimate interests, including:
          </p>
          <ul>
            <li>Improving and optimizing the Service</li>
            <li>Ensuring security and preventing fraud</li>
            <li>Analyzing usage to enhance user experience</li>
            <li>Sending service-related communications</li>
          </ul>

          <h3>3.3 Consent</h3>
          <p>
            Where required by law, we obtain your consent before processing,
            such as for optional analytics cookies.
          </p>

          <h3>3.4 Legal Obligations</h3>
          <p>
            Processing necessary to comply with legal requirements, such as
            responding to lawful requests from authorities.
          </p>

          <h3>3.5 Automated Decision-Making</h3>
          <p>
            Our Service uses AI to generate responses, images, and videos based
            on your prompts. This constitutes automated processing. However,
            these AI outputs are informational and creative in nature and do not
            produce legal effects or similarly significant effects concerning
            you as defined under GDPR Article 22. The AI does not make decisions
            about your access to services, creditworthiness, employment, or
            other significant matters.
          </p>
          <p>
            If you believe an automated process has significantly affected you,
            you may contact us to request human review.
          </p>

          {/* Section 4: AI-Specific Data Practices */}
          <h2>4. AI-Specific Data Practices</h2>

          <h3>4.1 How Your Data is Processed by AI</h3>
          <p>
            When you submit prompts or queries, they are sent to Google&apos;s
            Gemini AI models for processing. We use a paid API subscription,
            which means:
          </p>
          <ul>
            <li>
              <strong>No model training:</strong> Your prompts and the
              AI&apos;s responses are NOT used to train or improve Google&apos;s
              AI models
            </li>
            <li>
              <strong>Limited retention:</strong> Google retains prompts and
              responses for up to 55 days solely for abuse monitoring and legal
              compliance
            </li>
            <li>
              <strong>Grounding features:</strong> When using Google Search
              integration, data may be retained for up to 30 days
            </li>
            <li>
              <strong>No human review:</strong> Your data is not reviewed by
              humans except in cases of suspected abuse or legal requirements
            </li>
          </ul>

          <h3>4.2 AI-Generated Images and Videos</h3>
          <p>
            When you generate images or videos using our Service:
          </p>
          <ul>
            <li>Your prompts are processed by Google&apos;s Gemini Image and Veo models</li>
            <li>Generated content is returned to you and may be saved to your account</li>
            <li>
              Content is subject to safety filters that may block certain
              outputs
            </li>
            <li>
              Generated content may contain machine-readable markers indicating
              AI generation (per EU AI Act requirements)
            </li>
          </ul>

          <h3>4.3 Temporary File Storage</h3>
          <p>
            For video processing and large file uploads, we use Google&apos;s
            Gemini Files API:
          </p>
          <ul>
            <li>
              Files are temporarily stored on Google&apos;s infrastructure
            </li>
            <li>Files are automatically deleted after 48 hours</li>
            <li>Files are used solely for processing your request</li>
          </ul>

          <h3>4.4 Content Moderation</h3>
          <p>
            AI-generated content is subject to automated safety filters that may
            block outputs containing:
          </p>
          <ul>
            <li>Harmful or dangerous content</li>
            <li>Sexually explicit material</li>
            <li>Content depicting minors inappropriately</li>
            <li>Hate speech or discriminatory content</li>
            <li>Content that violates Google&apos;s Generative AI Prohibited Use Policy</li>
          </ul>

          {/* Section 5: Third-Party Services */}
          <h2>5. Third-Party Services</h2>
          <p>
            We use the following third-party services to operate Yurie. Each
            service processes data according to their respective privacy
            policies:
          </p>

          <h3>5.1 Google Gemini API</h3>
          <p>
            <strong>Purpose:</strong> AI processing for chat, image generation,
            and video generation
          </p>
          <p>
            <strong>Data processed:</strong> Prompts, queries, uploaded media,
            generated content
          </p>
          <p>
            <strong>Location:</strong> United States (with global
            infrastructure)
          </p>
          <p>
            See Google&apos;s{' '}
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gemini API Terms
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>

          <h3>5.2 Supabase</h3>
          <p>
            <strong>Purpose:</strong> Authentication, user management, and cloud
            storage
          </p>
          <p>
            <strong>Data processed:</strong> Account data, uploaded media
            assets, saved images and videos
          </p>
          <p>
            <strong>Location:</strong> United States
          </p>
          <p>
            See Supabase&apos;s{' '}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>

          <h3>5.3 Upstash Redis</h3>
          <p>
            <strong>Purpose:</strong> Chat history storage and retrieval
          </p>
          <p>
            <strong>Data processed:</strong> Chat messages, conversation
            metadata
          </p>
          <p>
            <strong>Location:</strong> United States
          </p>
          <p>
            See Upstash&apos;s{' '}
            <a
              href="https://upstash.com/trust/privacy.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>

          <h3>5.4 Vercel</h3>
          <p>
            <strong>Purpose:</strong> Hosting and analytics
          </p>
          <p>
            <strong>Data processed:</strong> Usage data, performance metrics
          </p>
          <p>
            <strong>Location:</strong> Global CDN with US primary
          </p>
          <p>
            See Vercel&apos;s{' '}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>

          {/* Section 6: International Data Transfers */}
          <h2>6. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries
            other than your country of residence, including the United States.
            These countries may have data protection laws that differ from your
            jurisdiction.
          </p>

          <h3>6.1 Transfer Mechanisms</h3>
          <p>
            For transfers from the EEA, UK, or Switzerland to countries without
            an adequacy decision, we rely on:
          </p>
          <ul>
            <li>
              <strong>Standard Contractual Clauses (SCCs):</strong> EU-approved
              contractual terms that provide appropriate safeguards
            </li>
            <li>
              <strong>Data Processing Agreements:</strong> Contracts with our
              service providers that include data protection commitments
            </li>
          </ul>

          <h3>6.2 Third-Party Locations</h3>
          <p>Our primary service providers process data in:</p>
          <ul>
            <li>
              <strong>Google:</strong> United States (with global
              infrastructure)
            </li>
            <li>
              <strong>Supabase:</strong> United States
            </li>
            <li>
              <strong>Upstash:</strong> United States
            </li>
            <li>
              <strong>Vercel:</strong> Global CDN (US primary)
            </li>
          </ul>
          <p>
            You may request a copy of the safeguards we use by contacting us at{' '}
            <a href="mailto:os@yurie.ai">os@yurie.ai</a>.
          </p>

          {/* Section 7: Data Retention and Deletion */}
          <h2>7. Data Retention and Deletion</h2>

          <h3>7.1 Retention Periods</h3>
          <ul>
            <li>
              <strong>Account data:</strong> Retained while your account is
              active
            </li>
            <li>
              <strong>Chat history:</strong> Retained until you delete it or
              your account
            </li>
            <li>
              <strong>Saved images/videos:</strong> Retained until you delete
              them or your account
            </li>
            <li>
              <strong>AI processing logs (Google):</strong> Up to 55 days for
              abuse monitoring
            </li>
            <li>
              <strong>Temporary uploads:</strong> 48 hours on Google&apos;s
              servers
            </li>
            <li>
              <strong>Analytics data:</strong> As per Vercel&apos;s retention
              policies
            </li>
          </ul>

          <h3>7.2 Account Deletion</h3>
          <p>
            If you delete your account, we will initiate deletion of your
            personal information within 30 days, including:
          </p>
          <ul>
            <li>Your account profile and authentication data</li>
            <li>Your chat history</li>
            <li>Your saved images and videos</li>
            <li>Your uploaded attachments</li>
          </ul>
          <p>
            Some data may be retained longer if required by law or for
            legitimate business purposes (e.g., fraud prevention, legal
            disputes).
          </p>

          <h3>7.3 Chat History Deletion</h3>
          <p>
            You may delete individual chats or your entire chat history at any
            time through the application. Deletion is permanent and cannot be
            undone.
          </p>

          {/* Section 8: Your Privacy Rights */}
          <h2>8. Your Privacy Rights</h2>
          <p>
            Depending on your location, you may have the following rights
            regarding your personal information:
          </p>

          <h3>8.1 General Rights (All Users)</h3>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of your personal
              information
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate
              information
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your personal
              information
            </li>
            <li>
              <strong>Export:</strong> Download your chat history and saved
              content
            </li>
            <li>
              <strong>Opt-out:</strong> Disable analytics tracking where
              available
            </li>
          </ul>

          <h3>8.2 European Privacy Rights (GDPR)</h3>
          <p>
            If you are in the EEA, UK, or Switzerland, you additionally have the
            right to:
          </p>
          <ul>
            <li>
              <strong>Restriction:</strong> Request restriction of processing in
              certain circumstances
            </li>
            <li>
              <strong>Portability:</strong> Receive your data in a structured,
              machine-readable format
            </li>
            <li>
              <strong>Object:</strong> Object to processing based on legitimate
              interests
            </li>
            <li>
              <strong>Withdraw consent:</strong> Withdraw previously given
              consent at any time
            </li>
            <li>
              <strong>Lodge a complaint:</strong> File a complaint with your
              local data protection authority
            </li>
          </ul>
          <p>
            <strong>Supervisory Authorities:</strong> You may lodge a complaint
            with your local supervisory authority. A list of EU/EEA data
            protection authorities is available at{' '}
            <a
              href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
              target="_blank"
              rel="noopener noreferrer"
            >
              edpb.europa.eu
            </a>
            .
          </p>

          <h3>8.3 California Privacy Rights (CCPA/CPRA)</h3>
          <p>
            If you are a California resident, you have the following rights
            under the California Consumer Privacy Act and California Privacy
            Rights Act:
          </p>
          <ul>
            <li>
              <strong>Right to Know:</strong> Request disclosure of the
              categories and specific pieces of personal information we have
              collected about you in the past 12 months
            </li>
            <li>
              <strong>Right to Delete:</strong> Request deletion of your
              personal information, subject to certain exceptions
            </li>
            <li>
              <strong>Right to Correct:</strong> Request correction of
              inaccurate personal information
            </li>
            <li>
              <strong>Right to Opt-Out:</strong> Opt out of the &quot;sale&quot;
              or &quot;sharing&quot; of personal information. Note: We do not
              sell or share your personal information as defined by the CCPA
            </li>
            <li>
              <strong>Right to Limit:</strong> Limit the use of sensitive
              personal information. Note: We only use sensitive personal
              information for purposes permitted by the CCPA
            </li>
            <li>
              <strong>Non-Discrimination:</strong> You will not be discriminated
              against for exercising your privacy rights
            </li>
          </ul>

          <h3>8.4 Automated Decision-Making Disclosure</h3>
          <p>
            We use AI technology to generate responses, images, and videos. This
            automated processing does not produce decisions with legal or
            similarly significant effects. If you have concerns about automated
            processing, you may contact us to request human review.
          </p>

          <h3>8.5 How to Exercise Your Rights</h3>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:os@yurie.ai">os@yurie.ai</a>. We will respond to
            verifiable requests within:
          </p>
          <ul>
            <li>
              <strong>GDPR:</strong> One month (extendable by two months for
              complex requests)
            </li>
            <li>
              <strong>CCPA:</strong> 45 days (extendable by an additional 45
              days)
            </li>
          </ul>
          <p>
            <strong>Authorized Agents:</strong> California residents may
            designate an authorized agent to make requests on their behalf. The
            agent must provide proof of authorization.
          </p>

          {/* Section 9: Data Security */}
          <h2>9. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your information, including:
          </p>
          <ul>
            <li>
              <strong>Encryption in transit:</strong> All data transmitted
              between your device and our servers uses HTTPS/TLS encryption
            </li>
            <li>
              <strong>Encryption at rest:</strong> Stored data is encrypted
              using industry-standard encryption
            </li>
            <li>
              <strong>Secure authentication:</strong> OAuth 2.0 with Google for
              secure sign-in
            </li>
            <li>
              <strong>Access controls:</strong> Role-based access controls for
              our team
            </li>
            <li>
              <strong>Security monitoring:</strong> Continuous monitoring for
              security threats
            </li>
            <li>
              <strong>Regular updates:</strong> Security patches and updates
              applied promptly
            </li>
          </ul>

          <h3>9.1 Security Incident Response</h3>
          <p>
            In the event of a data breach that affects your personal
            information:
          </p>
          <ul>
            <li>
              We will notify affected users without undue delay
            </li>
            <li>
              For GDPR-covered breaches, we will notify the relevant supervisory
              authority within 72 hours where required
            </li>
            <li>
              We will provide information about the breach and steps you can
              take to protect yourself
            </li>
          </ul>

          <h3>9.2 Your Security Responsibilities</h3>
          <p>
            You are responsible for maintaining the security of your Google
            account used to sign in to the Service. We recommend enabling
            two-factor authentication on your Google account.
          </p>

          {/* Section 10: Cookies and Tracking */}
          <h2>10. Cookies and Tracking Technologies</h2>

          <h3>10.1 Types of Cookies We Use</h3>
          <ul>
            <li>
              <strong>Essential Cookies:</strong> Required for the Service to
              function, including authentication session cookies and security
              cookies. These cannot be disabled.
            </li>
            <li>
              <strong>Functional Cookies:</strong> Remember your preferences
              such as theme settings and selected AI model. These enhance your
              experience but are not strictly necessary.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Used by Vercel Analytics to
              understand how the Service is used. These help us improve the
              Service.
            </li>
          </ul>

          <h3>10.2 Cookie Details</h3>
          <ul>
            <li>
              <strong>Authentication cookies:</strong> Session duration, first-party
            </li>
            <li>
              <strong>Preference cookies:</strong> Persistent (1 year),
              first-party
            </li>
            <li>
              <strong>Analytics cookies:</strong> As per Vercel&apos;s cookie
              policy, may include third-party cookies
            </li>
          </ul>

          <h3>10.3 Managing Cookies</h3>
          <p>
            You can manage cookies through your browser settings. Note that
            disabling essential cookies will prevent the Service from
            functioning properly.
          </p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                target="_blank"
                rel="noopener noreferrer"
              >
                Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
              >
                Edge
              </a>
            </li>
          </ul>

          <h3>10.4 Do Not Track Signals</h3>
          <p>
            Some browsers offer a &quot;Do Not Track&quot; (DNT) feature. We
            currently do not respond to DNT signals as there is no industry
            standard for compliance. However, you can opt out of analytics
            tracking through your browser settings or by contacting us.
          </p>

          {/* Section 11: Children's Privacy */}
          <h2>11. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under 13 years of age (or 16
            in certain jurisdictions, including parts of the EU). We do not
            knowingly collect personal information from children.
          </p>
          <ul>
            <li>
              <strong>Age requirement:</strong> Users must be at least 13 years
              old (16 in the EU for certain processing)
            </li>
            <li>
              <strong>Parental consent:</strong> If parental consent is required
              in your jurisdiction, a parent or guardian must provide consent
            </li>
            <li>
              <strong>Discovery of minor data:</strong> If we discover we have
              collected information from a child under the applicable age
              threshold without proper consent, we will delete it promptly
            </li>
          </ul>
          <p>
            If you believe we have collected information from a child, please
            contact us immediately at{' '}
            <a href="mailto:os@yurie.ai">os@yurie.ai</a>.
          </p>

          {/* Section 12: Changes to This Policy */}
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in our practices, technology, legal requirements, or other
            factors.
          </p>
          <ul>
            <li>
              <strong>Notification:</strong> We will notify you of material
              changes by posting the new policy on this page and updating the
              &quot;Last updated&quot; date and version number
            </li>
            <li>
              <strong>Significant changes:</strong> For significant changes
              affecting your rights, we may also notify you via email or
              in-product notification
            </li>
            <li>
              <strong>Continued use:</strong> Your continued use of the Service
              after changes constitutes acceptance of the updated policy
            </li>
            <li>
              <strong>Review:</strong> We encourage you to review this policy
              periodically
            </li>
          </ul>

          {/* Section 13: Contact Us */}
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, our data
            practices, or wish to exercise your privacy rights, please contact
            us:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:os@yurie.ai">os@yurie.ai</a>
            </li>
            <li>
              <strong>Website:</strong>{' '}
              <a href="https://www.yurie.ai">www.yurie.ai</a>
            </li>
          </ul>
          <p>
            <strong>Response times:</strong> We aim to respond to all inquiries
            within 5 business days. For formal privacy rights requests, we will
            respond within the timeframes required by applicable law.
          </p>
          <p>
            <strong>Data Protection Officer:</strong> Given the nature and scale
            of our processing, we are not required to appoint a Data Protection
            Officer under GDPR. However, you may direct all privacy-related
            inquiries to the contact information above.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/50">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
            <span className="text-muted-foreground/50">|</span>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
