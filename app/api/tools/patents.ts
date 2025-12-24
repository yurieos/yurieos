/**
 * Patent Search Tools
 *
 * Provides access to patent databases:
 *
 * USPTO PatentsView API - 12M+ US patents with full text, citations, claims
 * @see https://patentsview.org/apis/api-endpoints
 *
 * No API key required for basic access.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const PATENTSVIEW_API_BASE = "https://api.patentsview.org/patents/query";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 25;
const MAX_ABSTRACT_LENGTH = 1500;

// Regex patterns (declared at top level for performance)
const US_PREFIX_REGEX = /^US/i;

// =============================================================================
// Types
// =============================================================================

type PatentInventor = {
  inventor_first_name?: string;
  inventor_last_name?: string;
  inventor_city?: string;
  inventor_state?: string;
  inventor_country?: string;
};

type PatentAssignee = {
  assignee_organization?: string;
  assignee_first_name?: string;
  assignee_last_name?: string;
  assignee_type?: string;
};

type PatentCPC = {
  cpc_section_id?: string;
  cpc_subsection_id?: string;
  cpc_group_id?: string;
  cpc_subgroup_id?: string;
  cpc_category?: string;
};

type PatentCitation = {
  cited_patent_number?: string;
  cited_patent_title?: string;
  cited_patent_date?: string;
};

type PatentResult = {
  patent_number: string;
  patent_title: string;
  patent_abstract?: string;
  patent_date?: string;
  patent_year?: number;
  patent_type?: string;
  patent_num_claims?: number;
  patent_num_cited_by_us_patents?: number;
  inventors?: PatentInventor[];
  assignees?: PatentAssignee[];
  cpcs?: PatentCPC[];
  cited_patents?: PatentCitation[];
};

type PatentsViewResponse = {
  patents: PatentResult[];
  count: number;
  total_patent_count: number;
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

function formatInventorName(inventor: PatentInventor): string {
  const parts: string[] = [];
  if (inventor.inventor_first_name) {
    parts.push(inventor.inventor_first_name);
  }
  if (inventor.inventor_last_name) {
    parts.push(inventor.inventor_last_name);
  }
  return parts.join(" ") || "Unknown";
}

function formatPatentMarkdown(patent: PatentResult): string {
  const parts: string[] = [];

  // Title with link
  const url = `https://patents.google.com/patent/US${patent.patent_number}`;
  parts.push(`### [${patent.patent_title}](${url})`);

  // Patent number and date
  parts.push(
    `**Patent:** US${patent.patent_number} | **Date:** ${patent.patent_date || "N/A"}`
  );

  // Inventors
  if (patent.inventors?.length) {
    const inventorList = patent.inventors
      .slice(0, 5)
      .map(formatInventorName)
      .join(", ");
    const moreInventors =
      patent.inventors.length > 5
        ? ` (+${patent.inventors.length - 5} more)`
        : "";
    parts.push(`**Inventors:** ${inventorList}${moreInventors}`);
  }

  // Assignees (companies/organizations)
  if (patent.assignees?.length) {
    const assigneeList = patent.assignees
      .slice(0, 3)
      .map(
        (a) =>
          a.assignee_organization ||
          `${a.assignee_first_name || ""} ${a.assignee_last_name || ""}`.trim() ||
          "Unknown"
      )
      .join(", ");
    parts.push(`**Assignee:** ${assigneeList}`);
  }

  // Metadata
  const meta: string[] = [];
  if (patent.patent_type) {
    meta.push(`**Type:** ${patent.patent_type}`);
  }
  if (patent.patent_num_claims !== undefined) {
    meta.push(`**Claims:** ${patent.patent_num_claims}`);
  }
  if (patent.patent_num_cited_by_us_patents !== undefined) {
    meta.push(`**Cited by:** ${patent.patent_num_cited_by_us_patents} patents`);
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // CPC Classifications
  if (patent.cpcs?.length) {
    const cpcList = patent.cpcs
      .slice(0, 3)
      .map((c) => c.cpc_group_id || c.cpc_subsection_id)
      .filter(Boolean)
      .join(", ");
    if (cpcList) {
      parts.push(`**CPC Classifications:** ${cpcList}`);
    }
  }

  // Abstract
  if (patent.patent_abstract) {
    const truncatedAbstract = truncateText(
      patent.patent_abstract,
      MAX_ABSTRACT_LENGTH
    );
    parts.push(`**Abstract:** ${truncatedAbstract}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Patents
// =============================================================================

export type PatentResultItem = {
  patentNumber: string;
  title: string;
  abstract?: string;
  date?: string;
  year?: number;
  type?: string;
  numClaims?: number;
  citedByCount?: number;
  inventors: string[];
  assignees: string[];
  cpcClassifications: string[];
  url: string;
  markdown: string;
};

export type PatentSearchResult = {
  success: boolean;
  query: string;
  total: number;
  patents: PatentResultItem[];
  error?: string;
};

export const patentSearchTool = tool({
  description:
    "Search USPTO patents by keywords, inventors, assignees, or technology areas. " +
    "Access 12M+ US patents with full text, claims, and citations. " +
    "Use for: prior art research, technology trends, competitive intelligence, " +
    "innovation research, finding patents by company or inventor.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for patents. Can be keywords, technology terms, or concepts. " +
          "Examples: 'machine learning neural network', 'CRISPR gene editing', " +
          "'electric vehicle battery', 'smartphone display'"
      ),
    inventor: z
      .string()
      .optional()
      .describe("Filter by inventor name. Example: 'Musk' or 'Elon Musk'"),
    assignee: z
      .string()
      .optional()
      .describe(
        "Filter by assignee/company. Examples: 'Apple', 'Google', 'Microsoft', 'IBM'"
      ),
    yearFrom: z
      .number()
      .int()
      .min(1790)
      .max(2030)
      .optional()
      .describe("Filter patents from this year onwards."),
    yearTo: z
      .number()
      .int()
      .min(1790)
      .max(2030)
      .optional()
      .describe("Filter patents up to this year."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, inventor, assignee, yearFrom, yearTo, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build the query object for PatentsView API
      // The API uses a specific JSON query format
      const queryConditions: unknown[] = [
        { _text_any: { patent_title: query } },
        { _text_any: { patent_abstract: query } },
      ];

      // Add inventor filter if provided
      if (inventor) {
        queryConditions.push({
          _text_any: { inventor_last_name: inventor },
        });
      }

      // Add assignee filter if provided
      if (assignee) {
        queryConditions.push({
          _text_any: { assignee_organization: assignee },
        });
      }

      // Build date range filter
      const dateConditions: unknown[] = [];
      if (yearFrom) {
        dateConditions.push({
          _gte: { patent_date: `${yearFrom}-01-01` },
        });
      }
      if (yearTo) {
        dateConditions.push({
          _lte: { patent_date: `${yearTo}-12-31` },
        });
      }

      // Combine all conditions
      let finalQuery: unknown;
      if (dateConditions.length > 0) {
        finalQuery = {
          _and: [{ _or: queryConditions }, ...dateConditions],
        };
      } else {
        finalQuery = { _or: queryConditions };
      }

      // Fields to retrieve
      const fields = [
        "patent_number",
        "patent_title",
        "patent_abstract",
        "patent_date",
        "patent_year",
        "patent_type",
        "patent_num_claims",
        "patent_num_cited_by_us_patents",
        "inventor_first_name",
        "inventor_last_name",
        "inventor_city",
        "inventor_country",
        "assignee_organization",
        "assignee_type",
        "cpc_section_id",
        "cpc_subsection_id",
        "cpc_group_id",
      ];

      const requestBody = {
        q: finalQuery,
        f: fields,
        o: {
          page: 1,
          per_page: searchLimit,
        },
        s: [{ patent_date: "desc" }],
      };

      const response = await fetch(PATENTSVIEW_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `PatentsView API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = (await response.json()) as PatentsViewResponse;

      if (!data.patents?.length) {
        return {
          success: true,
          query,
          total: 0,
          patents: [],
          error:
            "No patents found. Try different search terms or broader criteria.",
        } satisfies PatentSearchResult;
      }

      const patents: PatentResultItem[] = data.patents.map((patent) => ({
        patentNumber: patent.patent_number,
        title: patent.patent_title,
        abstract: patent.patent_abstract,
        date: patent.patent_date,
        year: patent.patent_year,
        type: patent.patent_type,
        numClaims: patent.patent_num_claims,
        citedByCount: patent.patent_num_cited_by_us_patents,
        inventors: patent.inventors?.map(formatInventorName) || [],
        assignees:
          patent.assignees?.map(
            (a) =>
              a.assignee_organization ||
              `${a.assignee_first_name || ""} ${a.assignee_last_name || ""}`.trim()
          ) || [],
        cpcClassifications:
          patent.cpcs
            ?.map((c) => c.cpc_group_id || c.cpc_subsection_id)
            .filter((c): c is string => c !== undefined) || [],
        url: `https://patents.google.com/patent/US${patent.patent_number}`,
        markdown: formatPatentMarkdown(patent),
      }));

      return {
        success: true,
        query,
        total: data.total_patent_count,
        patents,
      } satisfies PatentSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        patents: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PatentSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Patent Details
// =============================================================================

export type PatentDetailResult = {
  success: boolean;
  patentNumber: string;
  patent?: PatentResultItem & {
    citedPatents: Array<{
      number?: string;
      title?: string;
      date?: string;
    }>;
  };
  error?: string;
};

export const getPatentTool = tool({
  description:
    "Get detailed information about a specific US patent by patent number. " +
    "Returns full abstract, inventors, assignees, claims count, and citations. " +
    "Use after searching to get complete patent details.",
  inputSchema: z.object({
    patentNumber: z
      .string()
      .min(1)
      .describe(
        "US patent number. Examples: '7654321', '10123456', 'US7654321'"
      ),
  }),
  execute: async ({ patentNumber }) => {
    try {
      // Clean patent number (remove 'US' prefix and any non-digit characters except commas)
      const cleanNumber = patentNumber
        .replace(US_PREFIX_REGEX, "")
        .replaceAll(/[^0-9]/g, "");

      const requestBody = {
        q: { patent_number: cleanNumber },
        f: [
          "patent_number",
          "patent_title",
          "patent_abstract",
          "patent_date",
          "patent_year",
          "patent_type",
          "patent_num_claims",
          "patent_num_cited_by_us_patents",
          "inventor_first_name",
          "inventor_last_name",
          "inventor_city",
          "inventor_state",
          "inventor_country",
          "assignee_organization",
          "assignee_first_name",
          "assignee_last_name",
          "assignee_type",
          "cpc_section_id",
          "cpc_subsection_id",
          "cpc_group_id",
          "cpc_subgroup_id",
          "cited_patent_number",
          "cited_patent_title",
          "cited_patent_date",
        ],
        o: { page: 1, per_page: 1 },
      };

      const response = await fetch(PATENTSVIEW_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`PatentsView API error: ${response.status}`);
      }

      const data = (await response.json()) as PatentsViewResponse;

      if (!data.patents?.length) {
        return {
          success: false,
          patentNumber: cleanNumber,
          error: `Patent not found: US${cleanNumber}`,
        } satisfies PatentDetailResult;
      }

      const patent = data.patents[0];

      const result = {
        patentNumber: patent.patent_number,
        title: patent.patent_title,
        abstract: patent.patent_abstract,
        date: patent.patent_date,
        year: patent.patent_year,
        type: patent.patent_type,
        numClaims: patent.patent_num_claims,
        citedByCount: patent.patent_num_cited_by_us_patents,
        inventors: patent.inventors?.map(formatInventorName) || [],
        assignees:
          patent.assignees?.map(
            (a) =>
              a.assignee_organization ||
              `${a.assignee_first_name || ""} ${a.assignee_last_name || ""}`.trim()
          ) || [],
        cpcClassifications:
          patent.cpcs
            ?.map((c) => c.cpc_group_id || c.cpc_subsection_id)
            .filter((c): c is string => c !== undefined) || [],
        citedPatents:
          patent.cited_patents?.slice(0, 20).map((c) => ({
            number: c.cited_patent_number,
            title: c.cited_patent_title,
            date: c.cited_patent_date,
          })) || [],
        url: `https://patents.google.com/patent/US${patent.patent_number}`,
        markdown: formatPatentMarkdown(patent),
      };

      return {
        success: true,
        patentNumber: cleanNumber,
        patent: result,
      } satisfies PatentDetailResult;
    } catch (error) {
      return {
        success: false,
        patentNumber,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PatentDetailResult;
    }
  },
});
