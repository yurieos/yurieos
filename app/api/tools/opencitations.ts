/**
 * OpenCitations API Tools
 *
 * Provides access to open citation data for bibliometric analysis:
 *
 * 1. COCI (OpenCitations Index of Crossref open DOI-to-DOI citations)
 *    - Citation network analysis
 *    - Impact assessment
 *    - Literature mapping
 *
 * @see https://opencitations.net/index/coci/api/v1
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const OPENCITATIONS_API_BASE = "https://opencitations.net/index/coci/api/v1";

const MAX_RESULTS_DEFAULT = 50;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type CitationRecord = {
  oci: string;
  citing: string;
  cited: string;
  creation: string;
  timespan: string;
  journal_sc: string;
  author_sc: string;
};

type CitationCountRecord = {
  count: string;
  doi: string;
};

// =============================================================================
// Helpers
// =============================================================================

function cleanDoi(doi: string): string {
  // Remove common prefixes
  return doi
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .trim();
}

function formatCitationMarkdown(
  citation: CitationRecord,
  direction: "citing" | "cited"
): string {
  const doi = direction === "citing" ? citation.citing : citation.cited;
  const parts: string[] = [];

  parts.push(`- **DOI:** [${doi}](https://doi.org/${doi})`);

  if (citation.creation) {
    parts.push(`  Created: ${citation.creation}`);
  }

  if (citation.timespan && citation.timespan !== "P0D") {
    parts.push(`  Timespan: ${citation.timespan}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Get Citations (Papers citing this work)
// =============================================================================

export type CitationItem = {
  oci: string;
  doi: string;
  citingDoi?: string;
  citedDoi?: string;
  creationDate?: string;
  timespan?: string;
  url: string;
};

export type CitationsResult = {
  success: boolean;
  doi: string;
  direction: string;
  total: number;
  citations: CitationItem[];
  error?: string;
  markdown: string;
};

export const getCitationsTool = tool({
  description:
    "Get papers that cite a specific work using OpenCitations. " +
    "Returns DOIs of all papers that have cited the given DOI. " +
    "Use for: impact assessment, finding follow-up research, literature mapping, " +
    "understanding how research has been built upon.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "DOI of the paper to find citations for. " +
          "Examples: '10.1038/nature12373', '10.1145/3292500.3330919'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum citations to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ doi, limit }) => {
    try {
      const cleanedDoi = cleanDoi(doi);
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const response = await fetch(
        `${OPENCITATIONS_API_BASE}/citations/${encodeURIComponent(cleanedDoi)}`,
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
            success: true,
            doi: cleanedDoi,
            direction: "citations",
            total: 0,
            citations: [],
            error: "No citations found for this DOI in OpenCitations.",
            markdown: `No citations found for DOI: ${cleanedDoi}`,
          } satisfies CitationsResult;
        }
        throw new Error(`OpenCitations API error: ${response.status}`);
      }

      const data = (await response.json()) as CitationRecord[];

      if (!data.length) {
        return {
          success: true,
          doi: cleanedDoi,
          direction: "citations",
          total: 0,
          citations: [],
          markdown: `No citations found for DOI: ${cleanedDoi}`,
        } satisfies CitationsResult;
      }

      const citations: CitationItem[] = data
        .slice(0, searchLimit)
        .map((record) => ({
          oci: record.oci,
          doi: record.citing,
          citingDoi: record.citing,
          citedDoi: record.cited,
          creationDate: record.creation,
          timespan: record.timespan,
          url: `https://doi.org/${record.citing}`,
        }));

      // Build markdown
      let markdown = `### Citations for DOI: ${cleanedDoi}\n\n`;
      markdown += `Found **${data.length}** papers citing this work.\n\n`;

      for (const citation of citations.slice(0, 20)) {
        markdown += `- [${citation.doi}](https://doi.org/${citation.doi})`;
        if (citation.creationDate) {
          markdown += ` (${citation.creationDate})`;
        }
        markdown += "\n";
      }

      if (data.length > 20) {
        markdown += `\n*... and ${data.length - 20} more citations*\n`;
      }

      markdown += "\n*Source: OpenCitations COCI*";

      return {
        success: true,
        doi: cleanedDoi,
        direction: "citations",
        total: data.length,
        citations,
        markdown,
      } satisfies CitationsResult;
    } catch (error) {
      return {
        success: false,
        doi,
        direction: "citations",
        total: 0,
        citations: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies CitationsResult;
    }
  },
});

// =============================================================================
// Tool: Get References (Papers this work cites)
// =============================================================================

export const getReferencesTool = tool({
  description:
    "Get papers that a specific work cites (its references) using OpenCitations. " +
    "Returns DOIs of all papers in the reference list of the given DOI. " +
    "Use for: understanding research foundations, finding seminal works, " +
    "tracing intellectual lineage.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "DOI of the paper to get references for. " +
          "Examples: '10.1038/nature12373', '10.1145/3292500.3330919'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum references to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ doi, limit }) => {
    try {
      const cleanedDoi = cleanDoi(doi);
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const response = await fetch(
        `${OPENCITATIONS_API_BASE}/references/${encodeURIComponent(cleanedDoi)}`,
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
            success: true,
            doi: cleanedDoi,
            direction: "references",
            total: 0,
            citations: [],
            error: "No references found for this DOI in OpenCitations.",
            markdown: `No references found for DOI: ${cleanedDoi}`,
          } satisfies CitationsResult;
        }
        throw new Error(`OpenCitations API error: ${response.status}`);
      }

      const data = (await response.json()) as CitationRecord[];

      if (!data.length) {
        return {
          success: true,
          doi: cleanedDoi,
          direction: "references",
          total: 0,
          citations: [],
          markdown: `No references found for DOI: ${cleanedDoi}`,
        } satisfies CitationsResult;
      }

      const citations: CitationItem[] = data
        .slice(0, searchLimit)
        .map((record) => ({
          oci: record.oci,
          doi: record.cited,
          citingDoi: record.citing,
          citedDoi: record.cited,
          creationDate: record.creation,
          timespan: record.timespan,
          url: `https://doi.org/${record.cited}`,
        }));

      // Build markdown
      let markdown = `### References for DOI: ${cleanedDoi}\n\n`;
      markdown += `Found **${data.length}** references.\n\n`;

      for (const citation of citations.slice(0, 20)) {
        markdown += `- [${citation.doi}](https://doi.org/${citation.doi})\n`;
      }

      if (data.length > 20) {
        markdown += `\n*... and ${data.length - 20} more references*\n`;
      }

      markdown += "\n*Source: OpenCitations COCI*";

      return {
        success: true,
        doi: cleanedDoi,
        direction: "references",
        total: data.length,
        citations,
        markdown,
      } satisfies CitationsResult;
    } catch (error) {
      return {
        success: false,
        doi,
        direction: "references",
        total: 0,
        citations: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies CitationsResult;
    }
  },
});

// =============================================================================
// Tool: Get Citation Count
// =============================================================================

export type CitationCountResult = {
  success: boolean;
  doi: string;
  citationCount: number;
  error?: string;
  markdown: string;
};

export const getCitationCountTool = tool({
  description:
    "Get the total citation count for a DOI from OpenCitations. " +
    "Quick way to assess impact without retrieving all citation details. " +
    "Use for: quick impact assessment, comparing paper influence.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "DOI of the paper to get citation count for. " +
          "Examples: '10.1038/nature12373', '10.1145/3292500.3330919'"
      ),
  }),
  execute: async ({ doi }) => {
    try {
      const cleanedDoi = cleanDoi(doi);

      const response = await fetch(
        `${OPENCITATIONS_API_BASE}/citation-count/${encodeURIComponent(cleanedDoi)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OpenCitations API error: ${response.status}`);
      }

      const data = (await response.json()) as CitationCountRecord[];

      const count = data.length > 0 ? Number.parseInt(data[0].count, 10) : 0;

      return {
        success: true,
        doi: cleanedDoi,
        citationCount: count,
        markdown: `**Citation Count for ${cleanedDoi}:** ${count} citations\n\n*Source: OpenCitations COCI*`,
      } satisfies CitationCountResult;
    } catch (error) {
      return {
        success: false,
        doi,
        citationCount: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies CitationCountResult;
    }
  },
});
