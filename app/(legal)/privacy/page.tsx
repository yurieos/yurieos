import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Yurie',
  description: 'Privacy Policy for Yurie AI - Learn how we collect, use, and protect your information.'
}

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto px-6 py-12">
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: January 8, 2026</p>

      <p>
        This Privacy Policy describes how Yurie (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares
        information about you when you use our AI-powered answer engine service at{' '}
        <a href="https://www.yurie.ai">www.yurie.ai</a> (the &quot;Service&quot;).
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account Information</h3>
      <p>
        When you sign in using Google OAuth, we collect:
      </p>
      <ul>
        <li>Your email address</li>
        <li>Your name (as provided by Google)</li>
        <li>Your profile picture URL (as provided by Google)</li>
      </ul>
      <p>
        We use this information solely for authentication purposes and to personalize your experience.
      </p>

      <h3>1.2 Chat Data</h3>
      <p>
        When you use our Service, we collect:
      </p>
      <ul>
        <li>Your search queries and messages</li>
        <li>AI-generated responses to your queries</li>
        <li>Chat history and conversation metadata</li>
      </ul>

      <h3>1.3 Usage Data</h3>
      <p>
        We automatically collect certain information when you use the Service:
      </p>
      <ul>
        <li>Device and browser information</li>
        <li>IP address</li>
        <li>Pages visited and features used</li>
        <li>Time and date of your visits</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the Service</li>
        <li>Process your queries and generate AI responses</li>
        <li>Save and sync your chat history across devices</li>
        <li>Authenticate your identity and secure your account</li>
        <li>Analyze usage patterns to improve user experience</li>
        <li>Communicate with you about the Service</li>
      </ul>
      <p>
        <strong>We do not sell your personal information to third parties.</strong>
      </p>

      <h2>3. Third-Party Services</h2>
      <p>
        We use the following third-party services to operate Yurie:
      </p>

      <h3>3.1 Google Gemini API</h3>
      <p>
        Your queries are processed by Google&apos;s Gemini AI models. Google may process this data
        according to their{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>

      <h3>3.2 Supabase</h3>
      <p>
        We use Supabase for authentication and user management. Your account data is stored
        securely on Supabase&apos;s infrastructure. See their{' '}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>

      <h3>3.3 Upstash Redis</h3>
      <p>
        Your chat history is stored using Upstash Redis for fast retrieval and persistence.
        See their{' '}
        <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>

      <h3>3.4 Vercel</h3>
      <p>
        Our Service is hosted on Vercel, and we use Vercel Analytics for usage statistics.
        See their{' '}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        We retain your information for as long as your account is active or as needed to provide
        you the Service. You may delete your chat history at any time through the application.
        If you delete your account, we will delete your personal information within 30 days,
        except as required by law.
      </p>

      <h2>5. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> your personal information</li>
        <li><strong>Correct</strong> inaccurate or incomplete information</li>
        <li><strong>Delete</strong> your account and associated data</li>
        <li><strong>Export</strong> your chat history</li>
        <li><strong>Opt out</strong> of analytics tracking</li>
      </ul>
      <p>
        To exercise these rights, please contact us at{' '}
        <a href="mailto:os@yurie.ai">os@yurie.ai</a>.
      </p>

      <h2>6. Data Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect your information,
        including:
      </p>
      <ul>
        <li>HTTPS encryption for all data in transit</li>
        <li>Secure authentication via OAuth 2.0</li>
        <li>Regular security audits and updates</li>
        <li>Access controls and monitoring</li>
      </ul>
      <p>
        However, no method of transmission over the Internet is 100% secure. We cannot guarantee
        absolute security of your data.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use essential cookies to:
      </p>
      <ul>
        <li>Maintain your authentication session</li>
        <li>Remember your preferences (e.g., theme settings)</li>
        <li>Store your selected AI model preference</li>
      </ul>
      <p>
        We use Vercel Analytics which may use cookies for usage analysis. You can disable
        cookies in your browser settings, but this may affect Service functionality.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        The Service is not intended for users under 13 years of age. We do not knowingly collect
        information from children under 13. If we learn we have collected such information,
        we will delete it promptly.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material
        changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
        Your continued use of the Service after changes constitutes acceptance of the updated policy.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy or our data practices, please contact us:
      </p>
      <ul>
        <li>Email: <a href="mailto:os@yurie.ai">os@yurie.ai</a></li>
        <li>Website: <a href="https://www.yurie.ai">www.yurie.ai</a></li>
      </ul>
    </article>
  )
}
