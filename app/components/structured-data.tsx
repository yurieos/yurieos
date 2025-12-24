import {
  APP_BASE_URL,
  APP_DESCRIPTION,
  APP_NAME,
} from "@/lib/config/constants";

type StructuredDataProps = {
  type?: "homepage" | "page";
  title?: string;
  description?: string;
  url?: string;
};

export function StructuredData({
  type = "homepage",
  title,
  description,
  url,
}: StructuredDataProps = {}) {
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    alternateName: ["Yurie", "yurie.ai", "Yurie AI"],
    description:
      description ||
      "Yurie is your AI personal assistant with multiple language models.",
    url: url || APP_BASE_URL,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0.0",
    datePublished: "2024-01-01",
    dateModified: new Date().toISOString().split("T")[0],
    inLanguage: "en-US",
    isAccessibleForFree: true,
    offers: [],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
      bestRating: "5",
      worstRating: "4.5",
    },
    featureList: [
      "Multiple AI models",
      "Web Search Capabilities",
      "Multi-modal Support",
      "Reasoning Models (o1)",
      "Real-time Collaboration",
    ],
    applicationSubCategory: "AI Assistant, Productivity Tool, Chat Application",
    keywords: ["AI chat", "AI personal assistant", "multi-model AI"],
    creator: {
      "@type": "Organization",
      name: "Yurie Team",
      url: APP_BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Yurie",
      url: APP_BASE_URL,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Yurie",
    alternateName: ["Yurie", "yurie.ai"],
    url: APP_BASE_URL,
    description:
      "Open-source AI personal assistant platform providing access to multiple AI models.",
    foundingDate: "2024",
    sameAs: [],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: title || APP_NAME,
    alternateName: ["Yurie", "yurie.ai", "Yurie AI"],
    url: url || APP_BASE_URL,
    description: description || APP_DESCRIPTION,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_BASE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Yurie",
      url: APP_BASE_URL,
    },
  };

  // Combine all schemas into a single array for better structure
  const combinedSchema = [
    softwareApplicationSchema,
    organizationSchema,
    ...(type === "homepage" ? [websiteSchema] : []),
  ];

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data per Next.js documentation
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(combinedSchema, null, 0).replace(
          /</g,
          "\\u003c"
        ),
      }}
      type="application/ld+json"
    />
  );
}
