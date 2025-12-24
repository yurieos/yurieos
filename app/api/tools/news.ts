/**
 * News & Current Events Tools
 *
 * Provides access to news and global events data:
 *
 * 1. GDELT (Global Database of Events, Language, and Tone)
 *    - Real-time global news monitoring and event tracking
 *    @see https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 *
 * No API key required for GDELT.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const GDELT_DOC_API_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_SNIPPET_LENGTH = 500;

// =============================================================================
// Types
// =============================================================================

type GdeltArticle = {
  url: string;
  url_mobile?: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
  sourcelocations?: string;
};

type GdeltDocResponse = {
  articles?: GdeltArticle[];
};

// =============================================================================
// Helpers
// =============================================================================

function formatGdeltDate(dateStr: string): string {
  // GDELT dates are in format: YYYYMMDDHHMMSS
  if (dateStr.length < 8) {
    return dateStr;
  }

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  if (dateStr.length >= 12) {
    const hour = dateStr.slice(8, 10);
    const minute = dateStr.slice(10, 12);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return `${year}-${month}-${day}`;
}

function formatArticleMarkdown(article: GdeltArticle): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${article.title}](${article.url})`);

  // Source and date
  const meta: string[] = [];
  meta.push(`**Source:** ${article.domain}`);
  meta.push(`**Date:** ${formatGdeltDate(article.seendate)}`);
  if (article.sourcecountry) {
    meta.push(`**Country:** ${article.sourcecountry}`);
  }
  parts.push(meta.join(" | "));

  return parts.join("\n");
}

// =============================================================================
// Tool: Search News Articles
// =============================================================================

export type NewsArticleItem = {
  url: string;
  title: string;
  date: string;
  formattedDate: string;
  domain: string;
  language: string;
  country: string;
  imageUrl?: string;
  markdown: string;
};

export type NewsSearchResult = {
  success: boolean;
  query: string;
  total: number;
  articles: NewsArticleItem[];
  error?: string;
  markdown: string;
};

export const newsSearchTool = tool({
  description:
    "Search real-time global news articles using GDELT. " +
    "GDELT monitors news from across the world in 100+ languages. " +
    "Use for: current events, breaking news, geopolitical analysis, " +
    "tracking news coverage of topics, fact-checking recent events. " +
    "Note: Returns articles from the last 3 months.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for news articles. Use keywords or phrases. " +
          "Examples: 'climate summit', 'tech layoffs', 'election results', " +
          "'AI regulation', 'economic recession'"
      ),
    mode: z
      .string()
      .optional()
      .default("artlist")
      .describe(
        "Search mode: 'artlist' for article list (default), " +
          "'timelinevol' for volume timeline."
      ),
    maxRecords: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum articles to return (1-${MAX_RESULTS_LIMIT}).`),
    sourceCountry: z
      .string()
      .optional()
      .describe(
        "Filter by source country code. Examples: 'US', 'UK', 'FR', 'DE', 'CN'"
      ),
    sourceLanguage: z
      .string()
      .optional()
      .describe(
        "Filter by language. Examples: 'english', 'spanish', 'french', 'chinese'"
      ),
    sort: z
      .string()
      .optional()
      .default("datedesc")
      .describe(
        "Sort order: 'datedesc' (newest first), 'dateasc' (oldest first), " +
          "'rel' (relevance)"
      ),
  }),
  execute: async ({
    query,
    mode,
    maxRecords,
    sourceCountry,
    sourceLanguage,
    sort,
  }) => {
    try {
      const limit = Math.min(
        maxRecords ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build GDELT DOC API URL
      const params = new URLSearchParams({
        query,
        mode: mode || "artlist",
        format: "json",
        maxrecords: limit.toString(),
        sort: sort || "datedesc",
      });

      if (sourceCountry) {
        params.append("sourcecountry", sourceCountry);
      }
      if (sourceLanguage) {
        params.append("sourcelang", sourceLanguage);
      }

      const response = await fetch(
        `${GDELT_DOC_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GDELT API error: ${response.status}`);
      }

      const data = (await response.json()) as GdeltDocResponse;

      if (!data.articles?.length) {
        return {
          success: true,
          query,
          total: 0,
          articles: [],
          error: "No news articles found. Try different search terms.",
          markdown: `No news found for "${query}".`,
        } satisfies NewsSearchResult;
      }

      const articles: NewsArticleItem[] = data.articles.map((article) => ({
        url: article.url,
        title: article.title,
        date: article.seendate,
        formattedDate: formatGdeltDate(article.seendate),
        domain: article.domain,
        language: article.language,
        country: article.sourcecountry,
        imageUrl: article.socialimage,
        markdown: formatArticleMarkdown(article),
      }));

      // Build markdown
      let markdown = `### News: "${query}"\n\n`;
      markdown += `Found ${articles.length} articles.\n\n`;

      for (const article of articles.slice(0, 15)) {
        markdown += `**[${article.title}](${article.url})**\n`;
        markdown += `${article.domain} • ${article.formattedDate}`;
        if (article.country) {
          markdown += ` • ${article.country}`;
        }
        markdown += "\n\n";
      }

      if (articles.length > 15) {
        markdown += `*... and ${articles.length - 15} more articles*\n\n`;
      }

      markdown += "*Source: GDELT Project*";

      return {
        success: true,
        query,
        total: articles.length,
        articles,
        markdown,
      } satisfies NewsSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        articles: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error searching news: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies NewsSearchResult;
    }
  },
});

// =============================================================================
// Tool: News Timeline/Trend Analysis
// =============================================================================

export type NewsTrendDataPoint = {
  date: string;
  value: number;
};

export type NewsTrendResult = {
  success: boolean;
  query: string;
  data: NewsTrendDataPoint[];
  error?: string;
  markdown: string;
};

export const newsTrendTool = tool({
  description:
    "Analyze news coverage trends over time using GDELT. " +
    "Shows how much news coverage a topic has received over time. " +
    "Use for: tracking media attention, identifying news cycles, " +
    "comparing coverage of different topics.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Topic to analyze news coverage for. " +
          "Examples: 'artificial intelligence', 'electric vehicles', 'cryptocurrency'"
      ),
    timespan: z
      .string()
      .optional()
      .default("3months")
      .describe(
        "Time span for analysis. Options: '24hours', '7days', '1month', '3months'"
      ),
  }),
  execute: async ({ query, timespan }) => {
    try {
      // Map timespan to GDELT format
      const timespanMap: Record<string, string> = {
        "24hours": "1d",
        "7days": "7d",
        "1month": "1m",
        "3months": "3m",
      };

      const gdeltTimespan = timespanMap[timespan || "3months"] || "3m";

      const params = new URLSearchParams({
        query,
        mode: "timelinevol",
        format: "json",
        timespan: gdeltTimespan,
      });

      const response = await fetch(
        `${GDELT_DOC_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GDELT API error: ${response.status}`);
      }

      const data = await response.json();

      // GDELT timeline returns data in a specific format
      const timelineData = data.timeline?.[0]?.data || [];

      const dataPoints: NewsTrendDataPoint[] = timelineData.map(
        (point: { date: string; value: number }) => ({
          date: point.date,
          value: point.value,
        })
      );

      // Build markdown
      let markdown = `### News Coverage Trend: "${query}"\n\n`;
      markdown += `**Period:** ${timespan}\n\n`;

      if (dataPoints.length > 0) {
        markdown += "| Date | Volume |\n";
        markdown += "|------|--------|\n";
        for (const point of dataPoints.slice(0, 30)) {
          markdown += `| ${point.date} | ${point.value} |\n`;
        }
      } else {
        markdown += "No trend data available for this query.\n";
      }

      markdown += "\n*Source: GDELT Project*";

      return {
        success: true,
        query,
        data: dataPoints,
        markdown,
      } satisfies NewsTrendResult;
    } catch (error) {
      return {
        success: false,
        query,
        data: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error analyzing news trend: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies NewsTrendResult;
    }
  },
});
