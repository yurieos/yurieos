/**
 * Research Data Repository Tools
 *
 * Provides access to research data and datasets:
 *
 * 1. Zenodo - Open research data repository from CERN
 *    - DOI-registered datasets, publications, software
 *    - Linked to research papers
 *
 * 2. DataCite - DOI metadata for research data
 *    - Find datasets by DOI
 *    - Track data citations
 *
 * @see https://developers.zenodo.org/
 * @see https://support.datacite.org/docs/api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const ZENODO_API_BASE = "https://zenodo.org/api";
const DATACITE_API_BASE = "https://api.datacite.org";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_DESCRIPTION_LENGTH = 1000;

// =============================================================================
// Types
// =============================================================================

type ZenodoRecord = {
  id: number;
  conceptrecid: number;
  doi: string;
  doi_url: string;
  metadata: {
    title: string;
    description?: string;
    creators: Array<{
      name: string;
      affiliation?: string;
      orcid?: string;
    }>;
    publication_date: string;
    resource_type: {
      type: string;
      subtype?: string;
      title: string;
    };
    keywords?: string[];
    license?: {
      id: string;
    };
    access_right: string;
    relations?: {
      version?: Array<{
        is_last: boolean;
        index: number;
      }>;
    };
  };
  links: {
    self: string;
    html: string;
    files?: string;
  };
  files?: Array<{
    key: string;
    size: number;
    type: string;
  }>;
  stats?: {
    downloads: number;
    views: number;
  };
};

type ZenodoSearchResponse = {
  hits: {
    hits: ZenodoRecord[];
    total: number;
  };
};

type DataCiteWork = {
  id: string;
  type: string;
  attributes: {
    doi: string;
    titles: Array<{ title: string }>;
    creators: Array<{ name: string; affiliation?: Array<{ name: string }> }>;
    publisher: string;
    publicationYear: number;
    descriptions?: Array<{ description: string; descriptionType: string }>;
    types: {
      resourceTypeGeneral: string;
      resourceType?: string;
    };
    url: string;
    registered: string;
    citationCount?: number;
    viewCount?: number;
    downloadCount?: number;
  };
};

type DataCiteSearchResponse = {
  data: DataCiteWork[];
  meta: {
    total: number;
    totalPages: number;
  };
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatZenodoMarkdown(record: ZenodoRecord): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${record.metadata.title}](${record.links.html})`);

  // Creators
  if (record.metadata.creators?.length) {
    const creators = record.metadata.creators
      .slice(0, 5)
      .map((c) => c.name)
      .join(", ");
    const more =
      record.metadata.creators.length > 5
        ? ` et al. (+${record.metadata.creators.length - 5})`
        : "";
    parts.push(`**Authors:** ${creators}${more}`);
  }

  // Metadata line
  const meta: string[] = [];
  meta.push(`**Type:** ${record.metadata.resource_type.title}`);
  meta.push(`**Published:** ${record.metadata.publication_date}`);
  if (record.metadata.access_right === "open") {
    meta.push("🔓 Open Access");
  }
  parts.push(meta.join(" | "));

  // DOI
  parts.push(`**DOI:** [${record.doi}](${record.doi_url})`);

  // Keywords
  if (record.metadata.keywords?.length) {
    parts.push(
      `**Keywords:** ${record.metadata.keywords.slice(0, 8).join(", ")}`
    );
  }

  // Description
  if (record.metadata.description) {
    // Remove HTML tags
    const cleanDesc = record.metadata.description
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const truncated = truncateText(cleanDesc, MAX_DESCRIPTION_LENGTH);
    parts.push(`**Description:** ${truncated}`);
  }

  // Files summary
  if (record.files?.length) {
    const totalSize = record.files.reduce((sum, f) => sum + f.size, 0);
    parts.push(
      `**Files:** ${record.files.length} files (${formatFileSize(totalSize)})`
    );
  }

  // Stats
  if (record.stats) {
    parts.push(
      `*Downloads: ${record.stats.downloads.toLocaleString()} | Views: ${record.stats.views.toLocaleString()}*`
    );
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Zenodo
// =============================================================================

export type ZenodoRecordItem = {
  id: number;
  doi: string;
  doiUrl: string;
  title: string;
  creators: string[];
  publicationDate: string;
  resourceType: string;
  keywords: string[];
  description?: string;
  accessRight: string;
  files: Array<{ name: string; size: number; type: string }>;
  downloads?: number;
  views?: number;
  url: string;
  markdown: string;
};

export type ZenodoSearchResult = {
  success: boolean;
  query: string;
  total: number;
  records: ZenodoRecordItem[];
  error?: string;
  markdown: string;
};

export const zenodoSearchTool = tool({
  description:
    "Search Zenodo for research datasets, publications, software, and other research outputs. " +
    "Zenodo is a CERN-hosted repository with DOI registration for all records. " +
    "Use for: finding datasets for research, supplementary materials, software releases, " +
    "preprints, presentations, and other research artifacts.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for Zenodo records. Use keywords or phrases. " +
          "Examples: 'machine learning dataset', 'climate change data', " +
          "'COVID-19 genome sequences', 'neural network model'"
      ),
    type: z
      .string()
      .optional()
      .describe(
        "Filter by resource type. Options: 'dataset', 'publication', 'software', " +
          "'image', 'video', 'lesson', 'presentation', 'poster', 'other'"
      ),
    keywords: z
      .string()
      .optional()
      .describe("Filter by keywords. Examples: 'machine-learning', 'genomics'"),
    communities: z
      .string()
      .optional()
      .describe(
        "Filter by Zenodo community. Examples: 'zenodo', 'lhcb-results'"
      ),
    openAccess: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true (default), only return open access records."),
    sort: z
      .string()
      .optional()
      .default("bestmatch")
      .describe(
        "Sort order: 'bestmatch' (default), 'mostrecent', 'mostviewed', '-mostrecent'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum records to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({
    query,
    type,
    keywords,
    communities,
    openAccess,
    sort,
    limit,
  }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        size: searchLimit.toString(),
        sort: sort || "bestmatch",
      });

      if (type) {
        params.append("type", type);
      }

      if (keywords) {
        params.append("keywords", keywords);
      }

      if (communities) {
        params.append("communities", communities);
      }

      if (openAccess !== false) {
        params.append("access_right", "open");
      }

      const response = await fetch(
        `${ZENODO_API_BASE}/records?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zenodo API error: ${response.status}`);
      }

      const data = (await response.json()) as ZenodoSearchResponse;

      if (!data.hits?.hits?.length) {
        return {
          success: true,
          query,
          total: 0,
          records: [],
          error: "No records found. Try different search terms.",
          markdown: `No Zenodo records found for "${query}".`,
        } satisfies ZenodoSearchResult;
      }

      const records: ZenodoRecordItem[] = data.hits.hits.map((record) => ({
        id: record.id,
        doi: record.doi,
        doiUrl: record.doi_url,
        title: record.metadata.title,
        creators: record.metadata.creators.map((c) => c.name),
        publicationDate: record.metadata.publication_date,
        resourceType: record.metadata.resource_type.title,
        keywords: record.metadata.keywords || [],
        description: record.metadata.description,
        accessRight: record.metadata.access_right,
        files: (record.files || []).map((f) => ({
          name: f.key,
          size: f.size,
          type: f.type,
        })),
        downloads: record.stats?.downloads,
        views: record.stats?.views,
        url: record.links.html,
        markdown: formatZenodoMarkdown(record),
      }));

      // Build markdown
      let markdown = `### Zenodo Search: "${query}"\n\n`;
      markdown += `Found **${data.hits.total.toLocaleString()}** research records.\n\n`;

      for (const record of records.slice(0, 10)) {
        markdown += `**[${record.title}](${record.url})**\n`;
        markdown += `${record.resourceType} | ${record.publicationDate} | DOI: ${record.doi}\n`;
        if (record.creators.length > 0) {
          markdown += `*${record.creators.slice(0, 3).join(", ")}${record.creators.length > 3 ? " et al." : ""}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Zenodo*";

      return {
        success: true,
        query,
        total: data.hits.total,
        records,
        markdown,
      } satisfies ZenodoSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        records: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ZenodoSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Zenodo Record Details
// =============================================================================

export type ZenodoRecordResult = {
  success: boolean;
  id: number;
  record?: ZenodoRecordItem;
  error?: string;
  markdown: string;
};

export const getZenodoRecordTool = tool({
  description:
    "Get detailed information about a specific Zenodo record by its ID. " +
    "Use this after searching to get full details including file information.",
  inputSchema: z.object({
    recordId: z
      .number()
      .int()
      .describe("Zenodo record ID from search results. Example: 1234567"),
  }),
  execute: async ({ recordId }) => {
    try {
      const response = await fetch(`${ZENODO_API_BASE}/records/${recordId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            id: recordId,
            error: `Record not found: ${recordId}`,
            markdown: `Zenodo record not found: ${recordId}`,
          } satisfies ZenodoRecordResult;
        }
        throw new Error(`Zenodo API error: ${response.status}`);
      }

      const record = (await response.json()) as ZenodoRecord;

      const item: ZenodoRecordItem = {
        id: record.id,
        doi: record.doi,
        doiUrl: record.doi_url,
        title: record.metadata.title,
        creators: record.metadata.creators.map((c) => c.name),
        publicationDate: record.metadata.publication_date,
        resourceType: record.metadata.resource_type.title,
        keywords: record.metadata.keywords || [],
        description: record.metadata.description,
        accessRight: record.metadata.access_right,
        files: (record.files || []).map((f) => ({
          name: f.key,
          size: f.size,
          type: f.type,
        })),
        downloads: record.stats?.downloads,
        views: record.stats?.views,
        url: record.links.html,
        markdown: formatZenodoMarkdown(record),
      };

      return {
        success: true,
        id: recordId,
        record: item,
        markdown: formatZenodoMarkdown(record),
      } satisfies ZenodoRecordResult;
    } catch (error) {
      return {
        success: false,
        id: recordId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ZenodoRecordResult;
    }
  },
});

// =============================================================================
// Tool: Search DataCite
// =============================================================================

export type DataCiteRecordItem = {
  doi: string;
  doiUrl: string;
  title: string;
  creators: string[];
  publisher: string;
  publicationYear: number;
  resourceType: string;
  description?: string;
  citationCount?: number;
  viewCount?: number;
  downloadCount?: number;
};

export type DataCiteSearchResult = {
  success: boolean;
  query: string;
  total: number;
  records: DataCiteRecordItem[];
  error?: string;
  markdown: string;
};

export const dataCiteSearchTool = tool({
  description:
    "Search DataCite for research data with DOIs. " +
    "DataCite is a leading DOI registration agency for research data. " +
    "Use for: finding datasets by DOI, tracking data citations, " +
    "discovering research data across multiple repositories.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for DataCite records. Use keywords or phrases. " +
          "Examples: 'genomics dataset', 'climate model data', 'survey data'"
      ),
    resourceType: z
      .string()
      .optional()
      .describe(
        "Filter by resource type. Options: 'Dataset', 'Software', 'Text', " +
          "'Collection', 'Image', 'Audiovisual', 'Model', 'Workflow'"
      ),
    publisher: z
      .string()
      .optional()
      .describe(
        "Filter by publisher/repository. Examples: 'Zenodo', 'Figshare', 'Dryad'"
      ),
    publicationYear: z
      .number()
      .int()
      .optional()
      .describe("Filter by publication year. Example: 2023"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum records to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({
    query,
    resourceType,
    publisher,
    publicationYear,
    limit,
  }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        query,
        "page[size]": searchLimit.toString(),
      });

      if (resourceType) {
        params.append("resource-type-id", resourceType.toLowerCase());
      }

      if (publisher) {
        params.append("publisher", publisher);
      }

      if (publicationYear) {
        params.append("published", publicationYear.toString());
      }

      const response = await fetch(
        `${DATACITE_API_BASE}/dois?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DataCite API error: ${response.status}`);
      }

      const data = (await response.json()) as DataCiteSearchResponse;

      if (!data.data?.length) {
        return {
          success: true,
          query,
          total: 0,
          records: [],
          error: "No records found. Try different search terms.",
          markdown: `No DataCite records found for "${query}".`,
        } satisfies DataCiteSearchResult;
      }

      const records: DataCiteRecordItem[] = data.data.map((work) => ({
        doi: work.attributes.doi,
        doiUrl: `https://doi.org/${work.attributes.doi}`,
        title: work.attributes.titles[0]?.title || "Untitled",
        creators: work.attributes.creators.map((c) => c.name),
        publisher: work.attributes.publisher,
        publicationYear: work.attributes.publicationYear,
        resourceType: work.attributes.types.resourceTypeGeneral,
        description: work.attributes.descriptions?.[0]?.description,
        citationCount: work.attributes.citationCount,
        viewCount: work.attributes.viewCount,
        downloadCount: work.attributes.downloadCount,
      }));

      // Build markdown
      let markdown = `### DataCite Search: "${query}"\n\n`;
      markdown += `Found **${data.meta.total.toLocaleString()}** records.\n\n`;

      for (const record of records.slice(0, 10)) {
        markdown += `**[${record.title}](${record.doiUrl})**\n`;
        markdown += `${record.resourceType} | ${record.publicationYear} | ${record.publisher}\n`;
        markdown += `DOI: ${record.doi}\n`;
        if (record.creators.length > 0) {
          markdown += `*${record.creators.slice(0, 3).join(", ")}${record.creators.length > 3 ? " et al." : ""}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: DataCite*";

      return {
        success: true,
        query,
        total: data.meta.total,
        records,
        markdown,
      } satisfies DataCiteSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        records: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DataCiteSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get DOI Metadata from DataCite
// =============================================================================

export type DataCiteDoiResult = {
  success: boolean;
  doi: string;
  record?: DataCiteRecordItem;
  error?: string;
  markdown: string;
};

export const getDataCiteDoiTool = tool({
  description:
    "Get metadata for a specific DOI from DataCite. " +
    "Use this to retrieve detailed information about any research dataset with a DOI.",
  inputSchema: z.object({
    doi: z
      .string()
      .min(1)
      .describe(
        "DOI to look up. Examples: '10.5281/zenodo.1234567', '10.6084/m9.figshare.12345'"
      ),
  }),
  execute: async ({ doi }) => {
    try {
      // Clean the DOI
      const cleanDoi = doi
        .replace(/^https?:\/\/doi\.org\//i, "")
        .replace(/^doi:/i, "")
        .trim();

      const response = await fetch(
        `${DATACITE_API_BASE}/dois/${encodeURIComponent(cleanDoi)}`,
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
            doi: cleanDoi,
            error: `DOI not found in DataCite: ${cleanDoi}`,
            markdown: `DOI not found: ${cleanDoi}`,
          } satisfies DataCiteDoiResult;
        }
        throw new Error(`DataCite API error: ${response.status}`);
      }

      const data = (await response.json()) as { data: DataCiteWork };
      const work = data.data;

      const record: DataCiteRecordItem = {
        doi: work.attributes.doi,
        doiUrl: `https://doi.org/${work.attributes.doi}`,
        title: work.attributes.titles[0]?.title || "Untitled",
        creators: work.attributes.creators.map((c) => c.name),
        publisher: work.attributes.publisher,
        publicationYear: work.attributes.publicationYear,
        resourceType: work.attributes.types.resourceTypeGeneral,
        description: work.attributes.descriptions?.[0]?.description,
        citationCount: work.attributes.citationCount,
        viewCount: work.attributes.viewCount,
        downloadCount: work.attributes.downloadCount,
      };

      // Build markdown
      let markdown = `### ${record.title}\n\n`;
      markdown += `**DOI:** [${record.doi}](${record.doiUrl})\n`;
      markdown += `**Type:** ${record.resourceType}\n`;
      markdown += `**Publisher:** ${record.publisher}\n`;
      markdown += `**Year:** ${record.publicationYear}\n`;

      if (record.creators.length > 0) {
        markdown += `**Creators:** ${record.creators.join(", ")}\n`;
      }

      if (record.description) {
        markdown += `\n**Description:** ${truncateText(record.description, MAX_DESCRIPTION_LENGTH)}\n`;
      }

      if (record.citationCount !== undefined) {
        markdown += `\n*Citations: ${record.citationCount}*`;
      }

      markdown += "\n\n*Source: DataCite*";

      return {
        success: true,
        doi: cleanDoi,
        record,
        markdown,
      } satisfies DataCiteDoiResult;
    } catch (error) {
      return {
        success: false,
        doi,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DataCiteDoiResult;
    }
  },
});
