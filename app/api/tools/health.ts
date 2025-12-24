/**
 * Consumer Health Information Tools
 *
 * Provides access to consumer health databases:
 *
 * 1. MedlinePlus - NIH consumer health information
 *    @see https://medlineplus.gov/about/developers/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const MEDLINEPLUS_API_BASE = "https://wsearch.nlm.nih.gov/ws/query";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;

// =============================================================================
// Types
// =============================================================================

type MedlinePlusDocument = {
  url: string;
  title: string;
  snippet: string;
  FullSummary?: string;
  organizationName?: string;
  lastUpdate?: string;
  rank: number;
};

type MedlinePlusSearchResponse = {
  nlmSearchResult?: {
    list?: MedlinePlusDocument[];
    count?: number;
  };
};

// XML parsing helper for MedlinePlus Connect API
type HealthTopicInfo = {
  title: string;
  url: string;
  language: string;
  dateCreated?: string;
  fullSummary?: string;
  alsoKnownAs?: string[];
  primaryInstitute?: string;
  seeReferences?: Array<{ title: string; url: string }>;
  relatedTopics?: Array<{ title: string; url: string }>;
  sites?: Array<{
    title: string;
    url: string;
    organizationName?: string;
    snippet?: string;
  }>;
};

// =============================================================================
// Helpers
// =============================================================================

function cleanHtmlTags(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formatHealthTopicMarkdown(doc: MedlinePlusDocument): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${cleanHtmlTags(doc.title)}](${doc.url})`);

  // Source
  if (doc.organizationName) {
    parts.push(`**Source:** ${doc.organizationName}`);
  }

  // Last updated
  if (doc.lastUpdate) {
    parts.push(`**Last Updated:** ${doc.lastUpdate}`);
  }

  // Summary/Snippet
  if (doc.FullSummary) {
    parts.push(`${cleanHtmlTags(doc.FullSummary).slice(0, 500)}...`);
  } else if (doc.snippet) {
    parts.push(cleanHtmlTags(doc.snippet));
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search MedlinePlus Health Topics
// =============================================================================

export type HealthTopicItem = {
  title: string;
  url: string;
  snippet: string;
  fullSummary?: string;
  source?: string;
  lastUpdate?: string;
  rank: number;
  markdown: string;
};

export type HealthSearchResult = {
  success: boolean;
  query: string;
  total: number;
  topics: HealthTopicItem[];
  error?: string;
  markdown: string;
};

export const healthSearchTool = tool({
  description:
    "Search MedlinePlus for consumer health information. " +
    "MedlinePlus is the NIH's consumer health information service with trusted, " +
    "easy-to-understand health content. " +
    "Use for: health conditions, symptoms, treatments, medications, wellness, " +
    "patient education, health literacy, medical procedures.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Health topic to search. Use plain language terms. " +
          "Examples: 'diabetes symptoms', 'high blood pressure', 'COVID-19 vaccine', " +
          "'pregnancy nutrition', 'anxiety treatment', 'heart disease prevention'"
      ),
    language: z
      .enum(["en", "es"])
      .optional()
      .default("en")
      .describe("Language: 'en' (English) or 'es' (Spanish)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, language, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );
      const lang = language || "en";

      const db = lang === "es" ? "healthTopicsSpanish" : "healthTopics";

      const params = new URLSearchParams({
        db,
        term: query,
        retmax: searchLimit.toString(),
      });

      const response = await fetch(
        `${MEDLINEPLUS_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`MedlinePlus API error: ${response.status}`);
      }

      const data = (await response.json()) as MedlinePlusSearchResponse;

      if (!data.nlmSearchResult?.list?.length) {
        return {
          success: true,
          query,
          total: 0,
          topics: [],
          error: "No health topics found. Try different search terms.",
          markdown: `No health information found for "${query}".`,
        } satisfies HealthSearchResult;
      }

      const topics: HealthTopicItem[] = data.nlmSearchResult.list.map(
        (doc) => ({
          title: cleanHtmlTags(doc.title),
          url: doc.url,
          snippet: cleanHtmlTags(doc.snippet || ""),
          fullSummary: doc.FullSummary
            ? cleanHtmlTags(doc.FullSummary)
            : undefined,
          source: doc.organizationName,
          lastUpdate: doc.lastUpdate,
          rank: doc.rank,
          markdown: formatHealthTopicMarkdown(doc),
        })
      );

      // Build markdown
      let markdown = `### MedlinePlus: "${query}"\n\n`;
      markdown += `Found ${data.nlmSearchResult.count || topics.length} health topics.\n\n`;
      markdown +=
        "⚠️ *This information is for educational purposes. Consult a healthcare provider for medical advice.*\n\n";

      for (const topic of topics.slice(0, 10)) {
        markdown += `**[${topic.title}](${topic.url})**\n`;
        if (topic.snippet) {
          markdown += `${topic.snippet.slice(0, 200)}${topic.snippet.length > 200 ? "..." : ""}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: MedlinePlus (NIH/NLM)*";

      return {
        success: true,
        query,
        total: data.nlmSearchResult.count || topics.length,
        topics,
        markdown,
      } satisfies HealthSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        topics: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies HealthSearchResult;
    }
  },
});

// =============================================================================
// Tool: Drug Information Search
// =============================================================================

export type DrugInfoItem = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  rank: number;
};

export type DrugSearchResult = {
  success: boolean;
  query: string;
  total: number;
  drugs: DrugInfoItem[];
  error?: string;
  markdown: string;
};

export const drugInfoSearchTool = tool({
  description:
    "Search MedlinePlus for drug and medication information. " +
    "Get consumer-friendly information about prescription and OTC medications. " +
    "Use for: medication information, side effects, drug interactions, " +
    "dosage information, medication safety.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Drug or medication name to search. " +
          "Examples: 'ibuprofen', 'metformin', 'lisinopril', 'aspirin side effects'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        db: "drugInfo",
        term: query,
        retmax: searchLimit.toString(),
      });

      const response = await fetch(
        `${MEDLINEPLUS_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`MedlinePlus API error: ${response.status}`);
      }

      const data = (await response.json()) as MedlinePlusSearchResponse;

      if (!data.nlmSearchResult?.list?.length) {
        return {
          success: true,
          query,
          total: 0,
          drugs: [],
          error: "No drug information found. Try a different drug name.",
          markdown: `No drug information found for "${query}".`,
        } satisfies DrugSearchResult;
      }

      const drugs: DrugInfoItem[] = data.nlmSearchResult.list.map((doc) => ({
        title: cleanHtmlTags(doc.title),
        url: doc.url,
        snippet: cleanHtmlTags(doc.snippet || ""),
        source: doc.organizationName,
        rank: doc.rank,
      }));

      // Build markdown
      let markdown = `### Drug Information: "${query}"\n\n`;
      markdown += `Found ${data.nlmSearchResult.count || drugs.length} results.\n\n`;
      markdown +=
        "⚠️ *Always consult a pharmacist or healthcare provider about medication use.*\n\n";

      for (const drug of drugs.slice(0, 10)) {
        markdown += `**[${drug.title}](${drug.url})**\n`;
        if (drug.snippet) {
          markdown += `${drug.snippet.slice(0, 200)}${drug.snippet.length > 200 ? "..." : ""}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: MedlinePlus (NIH/NLM)*";

      return {
        success: true,
        query,
        total: data.nlmSearchResult.count || drugs.length,
        drugs,
        markdown,
      } satisfies DrugSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        drugs: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DrugSearchResult;
    }
  },
});

// =============================================================================
// Tool: Medical Encyclopedia Search
// =============================================================================

export type EncyclopediaItem = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  rank: number;
};

export type EncyclopediaSearchResult = {
  success: boolean;
  query: string;
  total: number;
  articles: EncyclopediaItem[];
  error?: string;
  markdown: string;
};

export const medicalEncyclopediaTool = tool({
  description:
    "Search the MedlinePlus Medical Encyclopedia for detailed health articles. " +
    "Access A.D.A.M. medical encyclopedia content covering anatomy, conditions, " +
    "tests, procedures, and more. " +
    "Use for: detailed medical explanations, anatomy, diagnostic tests, " +
    "medical procedures, disease information.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Medical topic to search. " +
          "Examples: 'MRI scan', 'appendicitis', 'blood pressure test', " +
          "'kidney function', 'colonoscopy procedure'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        db: "medlineplus",
        term: query,
        retmax: searchLimit.toString(),
      });

      const response = await fetch(
        `${MEDLINEPLUS_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`MedlinePlus API error: ${response.status}`);
      }

      const data = (await response.json()) as MedlinePlusSearchResponse;

      if (!data.nlmSearchResult?.list?.length) {
        return {
          success: true,
          query,
          total: 0,
          articles: [],
          error: "No encyclopedia articles found. Try different search terms.",
          markdown: `No medical encyclopedia articles found for "${query}".`,
        } satisfies EncyclopediaSearchResult;
      }

      const articles: EncyclopediaItem[] = data.nlmSearchResult.list.map(
        (doc) => ({
          title: cleanHtmlTags(doc.title),
          url: doc.url,
          snippet: cleanHtmlTags(doc.snippet || ""),
          source: doc.organizationName,
          rank: doc.rank,
        })
      );

      // Build markdown
      let markdown = `### Medical Encyclopedia: "${query}"\n\n`;
      markdown += `Found ${data.nlmSearchResult.count || articles.length} articles.\n\n`;

      for (const article of articles.slice(0, 10)) {
        markdown += `**[${article.title}](${article.url})**\n`;
        if (article.snippet) {
          markdown += `${article.snippet.slice(0, 200)}${article.snippet.length > 200 ? "..." : ""}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: MedlinePlus Medical Encyclopedia (NIH/NLM)*";

      return {
        success: true,
        query,
        total: data.nlmSearchResult.count || articles.length,
        articles,
        markdown,
      } satisfies EncyclopediaSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        articles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies EncyclopediaSearchResult;
    }
  },
});
