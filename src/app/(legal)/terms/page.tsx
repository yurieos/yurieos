import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | Yurie',
  description:
    'Terms of Service for Yurie AI - Read our terms and conditions for using the service.'
}

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: January 17, 2026
          </p>
        </header>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-foreground prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground max-w-none">
          <p className="text-base leading-relaxed">
            Welcome to Yurie. These Terms of Service (&quot;Terms&quot;) govern
            your access to and use of the Yurie Agentic AI service at{' '}
            <a href="https://www.yurie.ai">www.yurie.ai</a> (the
            &quot;Service&quot;), operated by Yurie (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;).
          </p>
          <p>
            <strong>
              By accessing or using the Service, you agree to be bound by these
              Terms. If you do not agree to these Terms, do not use the Service.
              These Terms contain an arbitration agreement and class action
              waiver that affect your legal rights. Please read Section 17
              carefully.
            </strong>
          </p>

          {/* Section 1: Description of Service */}
          <h2>1. Description of Service</h2>
          <p>
            Yurie is an Agentic AI assistant that uses Google&apos;s Gemini AI
            models to provide research assistance, answer questions, and
            generate creative content.{' '}
            <strong>
              Please note that the Service utilizes &quot;Preview&quot; and
              &quot;Experimental&quot; AI models which are subject to frequent
              updates, changes, or discontinuation without notice.
            </strong>{' '}
            The Service includes:
          </p>
          <ul>
            <li>
              Agentic AI chat with real-time search and code execution
              capabilities
            </li>
            <li>Chat history storage and synchronization</li>
            <li>Multiple AI model options with configurable thinking levels</li>
            <li>File and media attachment processing</li>
          </ul>
          <p>
            <strong>AI Disclosure:</strong> You acknowledge that you are
            interacting with an AI-powered system, not a human. This disclosure
            is provided in compliance with the EU AI Act and other applicable
            transparency requirements.
          </p>

          {/* Section 2: Eligibility */}
          <h2>2. Eligibility</h2>
          <p>To use the Service, you must:</p>
          <ul>
            <li>
              Be at least 13 years old (or 16 in jurisdictions where required)
            </li>
            <li>Have the legal capacity to enter into a binding agreement</li>
            <li>
              Not be prohibited from using the Service under applicable law
            </li>
            <li>
              Not be located in a country subject to US export restrictions
            </li>
          </ul>
          <p>
            If you are using the Service on behalf of an organization, you
            represent that you have authority to bind that organization to these
            Terms.
          </p>

          {/* Section 3: User Accounts */}
          <h2>3. User Accounts</h2>

          <h3>3.1 Account Creation</h3>
          <p>
            To access certain features of the Service, you may create an account
            using Google OAuth authentication. By creating an account, you agree
            to provide accurate and complete information.
          </p>

          <h3>3.2 Account Security</h3>
          <p>
            You are responsible for maintaining the security of your Google
            account and for all activities that occur under your Yurie account.
            You must notify us immediately at{' '}
            <a href="mailto:os@yurie.ai">os@yurie.ai</a> of any unauthorized
            use.
          </p>

          <h3>3.3 Account Termination</h3>
          <p>
            You may delete your account at any time through the Service or by
            contacting us. We may suspend or terminate your account if you
            violate these Terms or engage in prohibited conduct. Upon
            termination, your right to use the Service ceases immediately.
          </p>

          {/* Section 4: Acceptable Use Policy */}
          <h2>4. Acceptable Use Policy</h2>
          <p>You agree not to use the Service to:</p>

          <h3>4.1 Illegal Activities</h3>
          <ul>
            <li>
              Violate any applicable laws, regulations, or third-party rights
            </li>
            <li>
              Generate or distribute Child Sexual Abuse Material (CSAM) or any
              content sexualizing minors
            </li>
            <li>
              Create non-consensual intimate imagery (including deepfakes)
            </li>
            <li>Engage in fraud, phishing, or other deceptive practices</li>
            <li>Facilitate terrorism, violence, or illegal weapons</li>
          </ul>

          <h3>4.2 Harmful Content</h3>
          <ul>
            <li>
              Generate content that promotes violence, hatred, or discrimination
            </li>
            <li>
              Create content designed to harass, bully, or intimidate
              individuals
            </li>
            <li>Produce malware, viruses, or other harmful code</li>
            <li>Generate spam or deceptive content</li>
          </ul>

          <h3>4.3 System Abuse</h3>
          <ul>
            <li>Attempt to bypass, disable, or circumvent safety filters</li>
            <li>Reverse engineer, decompile, or disassemble the Service</li>
            <li>Conduct automated scraping, crawling, or data extraction</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Attempt to gain unauthorized access to systems or accounts</li>
            <li>Use the Service to build competing products or services</li>
          </ul>

          <h3>4.4 Misrepresentation</h3>
          <ul>
            <li>
              Impersonate others or misrepresent your identity or affiliation
            </li>
            <li>
              Present AI-generated content as human-created in contexts where
              disclosure is required
            </li>
            <li>Create fake reviews, testimonials, or endorsements</li>
          </ul>

          <h3>4.5 Third-Party Policies</h3>
          <p>
            You must also comply with Google&apos;s{' '}
            <a
              href="https://ai.google.dev/gemini-api/terms/aup"
              target="_blank"
              rel="noopener noreferrer"
            >
              Generative AI Prohibited Use Policy
            </a>
            , which is incorporated by reference.
          </p>

          {/* Section 5: AI-Generated Content */}
          <h2>5. AI-Generated Content</h2>

          <h3>5.1 Content Ownership</h3>
          <p>
            <strong>Your Inputs:</strong> You retain ownership of the prompts,
            queries, and content you submit to the Service.
          </p>
          <p>
            <strong>AI Outputs:</strong> Subject to these Terms and applicable
            law, you may use AI-generated text, images, and videos created
            through the Service. We do not claim ownership of AI-generated
            outputs.
          </p>

          <h3>5.2 Copyright Considerations</h3>
          <p>
            <strong>Important:</strong> Under current US copyright law,
            AI-generated content without sufficient human creative contribution
            may not be eligible for copyright protection. The US Copyright
            Office requires &quot;human authorship&quot; for copyright
            registration. If you intend to claim copyright in AI-generated
            works, you should:
          </p>
          <ul>
            <li>
              Make substantial creative contributions (editing, selection,
              arrangement)
            </li>
            <li>Document your creative process and human contributions</li>
            <li>Consult with a qualified attorney for specific guidance</li>
          </ul>
          <p>
            We make no representations about the copyrightability of
            AI-generated content.
          </p>

          <h3>5.3 Commercial Use</h3>
          <p>
            You may use AI-generated content for personal and commercial
            purposes, subject to:
          </p>
          <ul>
            <li>Compliance with these Terms and applicable law</li>
            <li>
              Compliance with Google&apos;s Generative AI terms and policies
            </li>
            <li>
              Disclosure requirements under applicable law (e.g., EU AI Act)
            </li>
          </ul>

          <h3>5.4 Disclosure Requirements</h3>
          <p>
            Under the EU AI Act and similar regulations, you may be required to
            disclose when sharing AI-generated content publicly, particularly
            for images and videos that could be mistaken for authentic content.
            AI-generated images and videos from our Service may contain
            machine-readable markers indicating AI generation.
          </p>

          <h3>5.5 Content Accuracy Disclaimer</h3>
          <p>
            <strong>Important:</strong> AI-generated content may be inaccurate,
            incomplete, outdated, biased, or misleading. You acknowledge that:
          </p>
          <ul>
            <li>
              <strong>No guarantees:</strong> We do not guarantee the accuracy,
              reliability, completeness, or usefulness of any AI-generated
              content
            </li>
            <li>
              <strong>Not professional advice:</strong> AI outputs are not a
              substitute for professional legal, medical, financial, or other
              specialized advice
            </li>
            <li>
              <strong>Verification required:</strong> You should verify
              important information from authoritative sources
            </li>
            <li>
              <strong>Your responsibility:</strong> You are solely responsible
              for how you use and rely on AI-generated content
            </li>
          </ul>

          <h3>5.6 Content Moderation</h3>
          <p>
            AI-generated content is subject to automated safety filters that may
            block outputs violating our policies or Google&apos;s policies. We
            reserve the right to remove content that violates these Terms.
          </p>

          <h3>5.7 No Indemnification for AI Outputs</h3>
          <p>
            We do not indemnify you against claims that AI-generated content
            infringes third-party intellectual property rights. You are
            responsible for ensuring your use of AI outputs does not infringe on
            others&apos; rights.
          </p>

          {/* Section 6: Intellectual Property */}
          <h2>6. Intellectual Property</h2>

          <h3>6.1 Our Intellectual Property</h3>
          <p>
            The Service, including its design, features, user interface, and
            underlying technology, is owned by us and protected by copyright,
            trademark, and other intellectual property laws. The Yurie name and
            logo are our trademarks.
          </p>

          <h3>6.2 Open Source</h3>
          <p>
            The source code for Yurie is licensed under the{' '}
            <a
              href="https://www.apache.org/licenses/LICENSE-2.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apache License 2.0
            </a>
            . This license grants you certain rights to use, modify, and
            distribute the source code, subject to its terms.
          </p>

          <h3>6.3 Third-Party Components</h3>
          <p>
            The Service incorporates open-source software components, each
            subject to their respective licenses. A list of major dependencies
            and their licenses is available in our source code repository.
          </p>

          <h3>6.4 Feedback</h3>
          <p>
            If you provide feedback, suggestions, or ideas about the Service, we
            may use them without obligation to you.
          </p>

          {/* Section 7: User Content License */}
          <h2>7. User Content License</h2>
          <p>
            By submitting content to the Service (prompts, uploads, etc.), you
            grant us a limited, non-exclusive, worldwide, royalty-free license
            to:
          </p>
          <ul>
            <li>Process your content to provide the Service</li>
            <li>Store your content for chat history and synchronization</li>
            <li>Display your content back to you</li>
          </ul>
          <p>
            This license is solely for operating the Service and does not grant
            us rights to use your content for other purposes. We do not use your
            content to train AI models (see our{' '}
            <Link href="/privacy">Privacy Policy</Link> for details).
          </p>

          {/* Section 8: Privacy */}
          <h2>8. Privacy</h2>
          <p>
            Your use of the Service is subject to our{' '}
            <Link href="/privacy">Privacy Policy</Link>, which describes how we
            collect, use, and protect your information. By using the Service,
            you consent to the data practices described in the Privacy Policy.
          </p>

          {/* Section 9: Third-Party Services */}
          <h2>9. Third-Party Services</h2>
          <p>The Service integrates with third-party services, including:</p>
          <ul>
            <li>
              <strong>Google Gemini API:</strong> For AI processing (subject to{' '}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&apos;s Terms
              </a>
              )
            </li>
            <li>
              <strong>Supabase:</strong> For authentication and storage
            </li>
            <li>
              <strong>Upstash:</strong> For chat history storage
            </li>
            <li>
              <strong>Vercel:</strong> For hosting and analytics
            </li>
          </ul>
          <p>
            Your use of these integrated services is subject to their respective
            terms and policies. We are not responsible for the practices or
            availability of third-party services.
          </p>

          {/* Section 10: Service Availability */}
          <h2>10. Service Availability</h2>
          <p>
            We strive to maintain Service availability but do not guarantee
            uninterrupted access. The Service may be temporarily unavailable due
            to:
          </p>
          <ul>
            <li>
              Scheduled maintenance (we will try to provide advance notice)
            </li>
            <li>Technical issues, bugs, or outages</li>
            <li>Third-party service disruptions (e.g., Google API outages)</li>
            <li>Security incidents requiring immediate action</li>
            <li>Events beyond our reasonable control</li>
          </ul>
          <p>
            <strong>No SLA:</strong> We do not provide a Service Level Agreement
            (SLA) or guarantee any specific uptime percentage.
          </p>

          {/* Section 11: Beta and Preview Features */}
          <h2>11. Beta and Preview Features</h2>
          <p>
            The Service uses AI models designated as &quot;Preview&quot; or
            &quot;Experimental&quot; by Google. Additionally, we may offer beta
            features. You acknowledge that:
          </p>
          <ul>
            <li>
              Preview and experimental features may change or be discontinued
              without notice
            </li>
            <li>
              Beta features may contain bugs, errors, or unexpected behavior
            </li>
            <li>
              These features are provided &quot;as is&quot; with no warranties
            </li>
            <li>
              We may collect feedback on beta features to improve the Service
            </li>
          </ul>

          {/* Section 12: Fees and Payment */}
          <h2>12. Fees and Payment</h2>
          <p>
            The Service is currently provided free of charge. We reserve the
            right to introduce paid features or subscription plans in the
            future. If we do:
          </p>
          <ul>
            <li>We will provide advance notice of pricing changes</li>
            <li>Current free features may remain free or become paid</li>
            <li>Paid features will have clear pricing before purchase</li>
          </ul>

          {/* Section 13: Export Compliance */}
          <h2>13. Export Compliance</h2>
          <p>
            The Service is subject to US export control laws and regulations.
            You represent and warrant that:
          </p>
          <ul>
            <li>
              You are not located in, or a resident of, a country subject to US
              trade sanctions (currently Cuba, Iran, North Korea, Syria, and the
              Crimea, Donetsk, and Luhansk regions)
            </li>
            <li>You are not on any US government prohibited party list</li>
            <li>You will not use the Service in violation of US export laws</li>
          </ul>

          {/* Section 14: Limitation of Liability */}
          <h2>14. Limitation of Liability</h2>
          <p>
            <strong>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED
              &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
              OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT.
            </strong>
          </p>
          <p>
            <strong>
              WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE,
              UNINTERRUPTED, SECURE, OR THAT AI-GENERATED CONTENT WILL BE
              ACCURATE, COMPLETE, OR SUITABLE FOR ANY PURPOSE.
            </strong>
          </p>
          <p>
            To the maximum extent permitted by law, we shall not be liable for
            any indirect, incidental, special, consequential, or punitive
            damages, including but not limited to:
          </p>
          <ul>
            <li>Loss of profits, revenue, data, or goodwill</li>
            <li>Service interruption or data loss</li>
            <li>Errors, inaccuracies, or omissions in AI-generated content</li>
            <li>Decisions made based on AI-generated content</li>
            <li>Unauthorized access to your account</li>
            <li>Third-party claims related to your use of the Service</li>
            <li>Any other damages arising from use of the Service</li>
          </ul>
          <p>
            <strong>
              OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED TO
              THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A)
              THE AMOUNT YOU PAID US (IF ANY) IN THE TWELVE MONTHS PRECEDING THE
              CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).
            </strong>
          </p>
          <p>
            Some jurisdictions do not allow limitation of liability for certain
            damages. In such jurisdictions, our liability is limited to the
            maximum extent permitted by law.
          </p>

          {/* Section 15: Indemnification */}
          <h2>15. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Yurie and its
            officers, directors, employees, and agents from any claims, damages,
            losses, liabilities, costs, and expenses (including reasonable legal
            fees) arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you submit through the Service</li>
            <li>Your use of AI-generated content</li>
          </ul>
          <p>
            This indemnification obligation will survive termination of these
            Terms and your use of the Service.
          </p>

          {/* Section 16: Dispute Resolution and Arbitration */}
          <h2 className="font-bold!">16. Dispute Resolution and Arbitration</h2>
          <p>
            <strong>
              PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS,
              INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.
            </strong>
          </p>

          <h3>16.1 Informal Resolution</h3>
          <p>
            Before filing any formal dispute, you agree to contact us at{' '}
            <a href="mailto:os@yurie.ai">os@yurie.ai</a> and attempt to resolve
            the dispute informally for at least 30 days.
          </p>

          <h3>16.2 Binding Arbitration</h3>
          <p>
            If we cannot resolve the dispute informally, you and we agree to
            resolve any dispute, claim, or controversy arising out of or
            directly relating to these Terms or the Service through binding
            arbitration, rather than in court, except as provided below.
          </p>
          <p>
            Arbitration will be administered by the American Arbitration
            Association (&quot;AAA&quot;) under its Consumer Arbitration Rules
            (effective May 1, 2025), available at{' '}
            <a
              href="https://www.adr.org/consumer"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.adr.org/consumer
            </a>
            .
          </p>

          <h3>16.3 Arbitration Procedures</h3>
          <ul>
            <li>
              <strong>Virtual hearings:</strong> Hearings will be conducted
              virtually by default, unless otherwise agreed or required
            </li>
            <li>
              <strong>Single arbitrator:</strong> The dispute will be decided by
              a single neutral arbitrator
            </li>
            <li>
              <strong>Limited discovery:</strong> Discovery will be limited as
              provided in the AAA rules
            </li>
            <li>
              <strong>Confidentiality:</strong> Arbitration proceedings are
              confidential
            </li>
          </ul>

          <h3>16.4 Arbitration Fees</h3>
          <p>
            If you initiate arbitration, you will pay the AAA consumer filing
            fee (currently $225 or less for claims under $10,000). We will pay
            all other AAA fees and arbitrator compensation. If the arbitrator
            finds your claim frivolous, you may be required to pay our fees.
          </p>

          <h3>16.5 California Residents</h3>
          <p>
            <strong>
              If you are a California resident, arbitration will be held in
              California and governed by California law, in compliance with
              California Civil Code Section 1799.208.
            </strong>{' '}
            For residents of other states, arbitration may be conducted in your
            state of residence or another mutually agreed location.
          </p>

          <h3>16.6 Exceptions to Arbitration</h3>
          <p>
            Either party may bring claims in small claims court if the claim
            qualifies. Either party may seek injunctive relief in court for
            intellectual property infringement or unauthorized access to the
            Service.
          </p>

          <h3>16.7 Opt-Out Right</h3>
          <p>
            <strong>
              You may opt out of this arbitration agreement by sending written
              notice to <a href="mailto:os@yurie.ai">os@yurie.ai</a> within 30
              days of first accepting these Terms.
            </strong>{' '}
            Your notice must include your name, email address, and a clear
            statement that you wish to opt out of arbitration. If you opt out,
            you and we may resolve disputes in court.
          </p>

          {/* Section 17: Class Action Waiver */}
          <h2 className="font-bold!">17. Class Action Waiver</h2>
          <p>
            <strong>
              YOU AND WE AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS, WHETHER
              IN ARBITRATION OR COURT, WILL BE CONDUCTED ONLY ON AN INDIVIDUAL
              BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
            </strong>
          </p>
          <p>
            If this class action waiver is found unenforceable, then the
            entirety of Section 16 (Arbitration) shall be null and void, and the
            dispute shall proceed in court.
          </p>

          {/* Section 18: Governing Law */}
          <h2>18. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the State of California, United States, without regard
            to its conflict of law provisions.
          </p>
          <p>
            For disputes not subject to arbitration, you consent to the
            exclusive jurisdiction of the state and federal courts located in
            San Francisco County, California.
          </p>
          <p>
            If you are a consumer in the European Economic Area, you retain any
            mandatory consumer protection rights under the laws of your country
            of residence.
          </p>

          {/* Section 19: Force Majeure */}
          <h2>19. Force Majeure</h2>
          <p>
            We shall not be liable for any failure or delay in performing our
            obligations under these Terms due to circumstances beyond our
            reasonable control, including but not limited to:
          </p>
          <ul>
            <li>Natural disasters, acts of God, or severe weather</li>
            <li>War, terrorism, civil unrest, or government actions</li>
            <li>Pandemics or public health emergencies</li>
            <li>Internet or telecommunications failures</li>
            <li>Third-party service outages (e.g., Google, cloud providers)</li>
            <li>Cyberattacks or security incidents</li>
            <li>Labor disputes or shortages</li>
          </ul>

          {/* Section 20: Electronic Communications */}
          <h2>20. Electronic Communications</h2>
          <p>
            By using the Service, you consent to receive communications from us
            electronically, including:
          </p>
          <ul>
            <li>Service announcements and updates</li>
            <li>Security alerts</li>
            <li>Changes to these Terms or Privacy Policy</li>
            <li>Responses to your inquiries</li>
          </ul>
          <p>
            You agree that all agreements, notices, and communications we
            provide electronically satisfy any legal requirement that such
            communications be in writing.
          </p>

          {/* Section 21: Changes to Terms */}
          <h2>21. Changes to Terms</h2>
          <p>We may modify these Terms at any time. When we make changes:</p>
          <ul>
            <li>
              We will update the &quot;Last updated&quot; date and version
              number at the top of this page
            </li>
            <li>
              For material changes, we will provide notice via email or in-app
              notification
            </li>
            <li>
              Changes take effect immediately upon posting unless otherwise
              stated
            </li>
            <li>
              Your continued use of the Service after changes constitutes
              acceptance of the modified Terms
            </li>
          </ul>
          <p>
            If you do not agree to the modified Terms, you must stop using the
            Service.
          </p>

          {/* Section 22: Assignment */}
          <h2>22. Assignment</h2>
          <p>
            You may not assign or transfer these Terms or your rights under them
            without our prior written consent. We may assign these Terms without
            restriction. Any attempted assignment in violation of this section
            is void.
          </p>

          {/* Section 23: Severability */}
          <h2>23. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or
            invalid by a court of competent jurisdiction, that provision will be
            modified to the minimum extent necessary to make it enforceable, or
            if modification is not possible, severed. The remaining provisions
            will continue in full force and effect.
          </p>

          {/* Section 24: Waiver */}
          <h2>24. Waiver</h2>
          <p>
            Our failure to enforce any provision of these Terms shall not be
            deemed a waiver of that provision or our right to enforce it later.
            Any waiver must be in writing and signed by us to be effective.
          </p>

          {/* Section 25: Survival */}
          <h2>25. Survival</h2>
          <p>
            The following sections survive termination of these Terms: Section 5
            (AI-Generated Content), Section 6 (Intellectual Property), Section
            14 (Limitation of Liability), Section 15 (Indemnification), Section
            16 (Dispute Resolution), Section 17 (Class Action Waiver), Section
            18 (Governing Law), and any other provisions that by their nature
            should survive.
          </p>

          {/* Section 26: Entire Agreement */}
          <h2>26. Entire Agreement</h2>
          <p>
            These Terms, together with our{' '}
            <Link href="/privacy">Privacy Policy</Link> and any other agreements
            expressly incorporated by reference, constitute the entire agreement
            between you and us regarding the Service. These Terms supersede any
            prior agreements, communications, or understandings regarding the
            Service.
          </p>

          {/* Section 27: Contact Us */}
          <h2>27. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us:</p>
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
            For formal legal notices, please send correspondence to the email
            address above with &quot;Legal Notice&quot; in the subject line.
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
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
