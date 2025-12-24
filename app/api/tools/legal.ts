/**
 * Legal Research Tools
 *
 * Provides access to legal databases:
 *
 * 1. CourtListener - US Case Law and Court Opinions
 *    @see https://www.courtlistener.com/api/
 *
 * No API key required for basic access (rate limited).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const COURTLISTENER_API_BASE = "https://www.courtlistener.com/api/rest/v4";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_OPINION_LENGTH = 3000;

// =============================================================================
// Types
// =============================================================================

type CourtListenerOpinion = {
  id: number;
  absolute_url: string;
  cluster: string;
  cluster_id: number;
  author?: {
    name_full: string;
  };
  type: string;
  plain_text?: string;
  html?: string;
  date_created: string;
  date_modified: string;
};

type CourtListenerCluster = {
  id: number;
  absolute_url: string;
  case_name: string;
  case_name_full?: string;
  date_filed: string;
  docket?: {
    id: number;
    court: string;
    court_id: string;
    docket_number?: string;
  };
  citation_count: number;
  precedential_status: string;
  judges?: string;
  syllabus?: string;
  headnotes?: string;
  attorneys?: string;
  nature_of_suit?: string;
  sub_opinions?: CourtListenerOpinion[];
};

type CourtListenerSearchResult = {
  count: number;
  next?: string;
  previous?: string;
  results: CourtListenerCluster[];
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatCaseMarkdown(cluster: CourtListenerCluster): string {
  const parts: string[] = [];

  // Case name with link
  const url = `https://www.courtlistener.com${cluster.absolute_url}`;
  parts.push(`### [${cluster.case_name}](${url})`);

  // Date and court
  const meta: string[] = [];
  meta.push(`**Filed:** ${cluster.date_filed}`);
  if (cluster.docket?.court) {
    meta.push(`**Court:** ${cluster.docket.court}`);
  }
  if (cluster.precedential_status) {
    meta.push(`**Status:** ${cluster.precedential_status}`);
  }
  parts.push(meta.join(" | "));

  // Docket number
  if (cluster.docket?.docket_number) {
    parts.push(`**Docket:** ${cluster.docket.docket_number}`);
  }

  // Judges
  if (cluster.judges) {
    parts.push(`**Judges:** ${cluster.judges}`);
  }

  // Citations
  if (cluster.citation_count > 0) {
    parts.push(`**Cited by:** ${cluster.citation_count} opinions`);
  }

  // Nature of suit
  if (cluster.nature_of_suit) {
    parts.push(`**Nature of Suit:** ${cluster.nature_of_suit}`);
  }

  // Syllabus
  if (cluster.syllabus) {
    const syllabusText = truncateText(cluster.syllabus, 500);
    parts.push(`\n**Syllabus:** ${syllabusText}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Court Opinions
// =============================================================================

export type CourtCaseItem = {
  id: number;
  caseName: string;
  caseNameFull?: string;
  dateFiled: string;
  court?: string;
  courtId?: string;
  docketNumber?: string;
  judges?: string;
  citationCount: number;
  precedentialStatus: string;
  syllabus?: string;
  natureOfSuit?: string;
  url: string;
  markdown: string;
};

export type CourtSearchResult = {
  success: boolean;
  query: string;
  total: number;
  cases: CourtCaseItem[];
  error?: string;
  markdown: string;
};

export const courtOpinionSearchTool = tool({
  description:
    "Search US court opinions and case law from CourtListener. " +
    "Contains 8M+ legal opinions from federal and state courts. " +
    "Use for: legal research, case law analysis, finding precedents, " +
    "understanding court decisions, legal scholarship.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Legal search query. Can include case names, legal concepts, or keywords. " +
          "Examples: 'Miranda rights', 'Roe v Wade', 'first amendment speech', " +
          "'patent infringement software'"
      ),
    court: z
      .string()
      .optional()
      .describe(
        "Filter by court. Examples: 'scotus' (Supreme Court), 'ca9' (9th Circuit), " +
          "'nysd' (S.D.N.Y). Leave empty for all courts."
      ),
    dateFiled_gte: z
      .string()
      .optional()
      .describe("Filter cases filed on or after this date (YYYY-MM-DD)."),
    dateFiled_lte: z
      .string()
      .optional()
      .describe("Filter cases filed on or before this date (YYYY-MM-DD)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum cases to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, court, dateFiled_gte, dateFiled_lte, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        page_size: searchLimit.toString(),
        order_by: "-score",
      });

      if (court) {
        params.append("court", court);
      }
      if (dateFiled_gte) {
        params.append("date_filed__gte", dateFiled_gte);
      }
      if (dateFiled_lte) {
        params.append("date_filed__lte", dateFiled_lte);
      }

      const response = await fetch(
        `${COURTLISTENER_API_BASE}/search/?${params.toString()}&type=o`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CourtListener API error: ${response.status}`);
      }

      const data = (await response.json()) as CourtListenerSearchResult;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          cases: [],
          error: "No court opinions found. Try different search terms.",
          markdown: `No cases found for "${query}".`,
        } satisfies CourtSearchResult;
      }

      const cases: CourtCaseItem[] = data.results.map((cluster) => ({
        id: cluster.id,
        caseName: cluster.case_name,
        caseNameFull: cluster.case_name_full,
        dateFiled: cluster.date_filed,
        court: cluster.docket?.court,
        courtId: cluster.docket?.court_id,
        docketNumber: cluster.docket?.docket_number,
        judges: cluster.judges,
        citationCount: cluster.citation_count,
        precedentialStatus: cluster.precedential_status,
        syllabus: cluster.syllabus,
        natureOfSuit: cluster.nature_of_suit,
        url: `https://www.courtlistener.com${cluster.absolute_url}`,
        markdown: formatCaseMarkdown(cluster),
      }));

      // Build markdown
      let markdown = `### Court Opinions: "${query}"\n\n`;
      markdown += `Found ${data.count} cases.\n\n`;

      for (const caseItem of cases.slice(0, 10)) {
        markdown += `**[${caseItem.caseName}](${caseItem.url})**\n`;
        markdown += `${caseItem.dateFiled}`;
        if (caseItem.court) {
          markdown += ` | ${caseItem.court}`;
        }
        markdown += "\n";
        if (caseItem.syllabus) {
          markdown += `> ${truncateText(caseItem.syllabus, 150)}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: CourtListener (Free Law Project)*";

      return {
        success: true,
        query,
        total: data.count,
        cases,
        markdown,
      } satisfies CourtSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        cases: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies CourtSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Court Opinion Details
// =============================================================================

export type CourtOpinionDetailsResult = {
  success: boolean;
  id: number;
  caseDetails?: CourtCaseItem & {
    fullText?: string;
    attorneys?: string;
    headnotes?: string;
    opinions: Array<{
      id: number;
      type: string;
      author?: string;
      textExcerpt?: string;
    }>;
  };
  error?: string;
};

export const getCourtOpinionTool = tool({
  description:
    "Get detailed information about a specific court opinion by cluster ID. " +
    "Returns full case details including opinion text, judges, and citations. " +
    "Use after searching to get complete case information.",
  inputSchema: z.object({
    clusterId: z
      .number()
      .int()
      .positive()
      .describe("CourtListener cluster ID for the case."),
  }),
  execute: async ({ clusterId }) => {
    try {
      const response = await fetch(
        `${COURTLISTENER_API_BASE}/clusters/${clusterId}/`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            id: clusterId,
            error: `Case not found: ${clusterId}`,
          } satisfies CourtOpinionDetailsResult;
        }
        throw new Error(`CourtListener API error: ${response.status}`);
      }

      const cluster = (await response.json()) as CourtListenerCluster;

      const opinions =
        cluster.sub_opinions?.map((op) => ({
          id: op.id,
          type: op.type,
          author: op.author?.name_full,
          textExcerpt: op.plain_text
            ? truncateText(op.plain_text, MAX_OPINION_LENGTH)
            : undefined,
        })) || [];

      const caseDetails = {
        id: cluster.id,
        caseName: cluster.case_name,
        caseNameFull: cluster.case_name_full,
        dateFiled: cluster.date_filed,
        court: cluster.docket?.court,
        courtId: cluster.docket?.court_id,
        docketNumber: cluster.docket?.docket_number,
        judges: cluster.judges,
        citationCount: cluster.citation_count,
        precedentialStatus: cluster.precedential_status,
        syllabus: cluster.syllabus,
        natureOfSuit: cluster.nature_of_suit,
        url: `https://www.courtlistener.com${cluster.absolute_url}`,
        markdown: formatCaseMarkdown(cluster),
        fullText: cluster.sub_opinions?.[0]?.plain_text
          ? truncateText(
              cluster.sub_opinions[0].plain_text,
              MAX_OPINION_LENGTH * 2
            )
          : undefined,
        attorneys: cluster.attorneys,
        headnotes: cluster.headnotes,
        opinions,
      };

      return {
        success: true,
        id: clusterId,
        caseDetails,
      } satisfies CourtOpinionDetailsResult;
    } catch (error) {
      return {
        success: false,
        id: clusterId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies CourtOpinionDetailsResult;
    }
  },
});
