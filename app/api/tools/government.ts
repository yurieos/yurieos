/**
 * Government & Public Data Tools
 *
 * Provides access to government open data:
 *
 * 1. Data.gov - US Government Open Data Portal
 *    @see https://catalog.data.gov/api/3
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const DATAGOV_API_BASE = "https://catalog.data.gov/api/3";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type DataGovResource = {
  id: string;
  name?: string;
  description?: string;
  format?: string;
  url?: string;
  created?: string;
  last_modified?: string;
  mimetype?: string;
};

type DataGovDataset = {
  id: string;
  name: string;
  title: string;
  notes?: string;
  author?: string;
  author_email?: string;
  maintainer?: string;
  maintainer_email?: string;
  organization?: {
    id: string;
    name: string;
    title: string;
    description?: string;
  };
  groups?: Array<{
    id: string;
    name: string;
    title: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  resources?: DataGovResource[];
  metadata_created?: string;
  metadata_modified?: string;
  license_title?: string;
  license_url?: string;
  num_resources?: number;
  num_tags?: number;
};

type DataGovSearchResponse = {
  success: boolean;
  result: {
    count: number;
    results: DataGovDataset[];
  };
};

// =============================================================================
// Helpers
// =============================================================================

function formatDatasetMarkdown(dataset: DataGovDataset): string {
  const parts: string[] = [];

  // Title with link
  const url = `https://catalog.data.gov/dataset/${dataset.name}`;
  parts.push(`### [${dataset.title}](${url})`);

  // Organization
  if (dataset.organization?.title) {
    parts.push(`**Agency:** ${dataset.organization.title}`);
  }

  // Description
  if (dataset.notes) {
    const desc = dataset.notes.slice(0, 500);
    parts.push(
      `**Description:** ${desc}${dataset.notes.length > 500 ? "..." : ""}`
    );
  }

  // Metadata
  const meta: string[] = [];
  if (dataset.num_resources) {
    meta.push(`${dataset.num_resources} resources`);
  }
  if (dataset.license_title) {
    meta.push(`License: ${dataset.license_title}`);
  }
  if (dataset.metadata_modified) {
    meta.push(`Updated: ${dataset.metadata_modified.split("T")[0]}`);
  }
  if (meta.length > 0) {
    parts.push(`*${meta.join(" | ")}*`);
  }

  // Tags
  if (dataset.tags && dataset.tags.length > 0) {
    const tags = dataset.tags
      .slice(0, 5)
      .map((t) => t.name)
      .join(", ");
    parts.push(`**Tags:** ${tags}`);
  }

  // Resources
  if (dataset.resources && dataset.resources.length > 0) {
    const resources = dataset.resources.slice(0, 3);
    const resourceList = resources
      .map((r) => `[${r.format || "Link"}](${r.url})`)
      .join(" | ");
    parts.push(`**Resources:** ${resourceList}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Data.gov Datasets
// =============================================================================

export type DataGovDatasetItem = {
  id: string;
  name: string;
  title: string;
  description?: string;
  organization?: string;
  organizationTitle?: string;
  license?: string;
  numResources: number;
  tags: string[];
  created?: string;
  modified?: string;
  resources: Array<{
    id: string;
    name?: string;
    format?: string;
    url?: string;
  }>;
  url: string;
  markdown: string;
};

export type DataGovSearchResult = {
  success: boolean;
  query: string;
  total: number;
  datasets: DataGovDatasetItem[];
  error?: string;
  markdown: string;
};

export const dataGovSearchTool = tool({
  description:
    "Search Data.gov for US government open datasets. " +
    "Contains 300,000+ datasets from federal agencies covering health, climate, " +
    "economics, education, and more. " +
    "Use for: public policy research, government data analysis, " +
    "finding official statistics, accessing public records.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for government datasets. " +
          "Examples: 'climate data', 'census population', 'COVID-19 statistics', " +
          "'education spending', 'crime statistics'"
      ),
    organization: z
      .string()
      .optional()
      .describe(
        "Filter by agency/organization. " +
          "Examples: 'census-gov', 'cdc-gov', 'epa-gov', 'noaa-gov'"
      ),
    format: z
      .string()
      .optional()
      .describe(
        "Filter by data format. " +
          "Examples: 'CSV', 'JSON', 'XML', 'API', 'PDF'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum datasets to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, organization, format, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        rows: searchLimit.toString(),
      });

      if (organization) {
        params.append("fq", `organization:${organization}`);
      }

      if (format) {
        params.append("fq", `res_format:${format.toUpperCase()}`);
      }

      const response = await fetch(
        `${DATAGOV_API_BASE}/action/package_search?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Data.gov API error: ${response.status}`);
      }

      const data = (await response.json()) as DataGovSearchResponse;

      if (!(data.success && data.result.results?.length)) {
        return {
          success: true,
          query,
          total: 0,
          datasets: [],
          error: "No datasets found. Try different search terms.",
          markdown: `No datasets found for "${query}".`,
        } satisfies DataGovSearchResult;
      }

      const datasets: DataGovDatasetItem[] = data.result.results.map((ds) => ({
        id: ds.id,
        name: ds.name,
        title: ds.title,
        description: ds.notes,
        organization: ds.organization?.name,
        organizationTitle: ds.organization?.title,
        license: ds.license_title,
        numResources: ds.num_resources || 0,
        tags: ds.tags?.map((t) => t.name) || [],
        created: ds.metadata_created,
        modified: ds.metadata_modified,
        resources:
          ds.resources?.slice(0, 5).map((r) => ({
            id: r.id,
            name: r.name,
            format: r.format,
            url: r.url,
          })) || [],
        url: `https://catalog.data.gov/dataset/${ds.name}`,
        markdown: formatDatasetMarkdown(ds),
      }));

      // Build markdown
      let markdown = `### Data.gov: "${query}"\n\n`;
      markdown += `Found ${data.result.count} datasets.\n\n`;

      for (const ds of datasets.slice(0, 10)) {
        markdown += `**[${ds.title}](${ds.url})**\n`;
        if (ds.organizationTitle) {
          markdown += `*${ds.organizationTitle}*\n`;
        }
        if (ds.description) {
          markdown += `${ds.description.slice(0, 150)}...\n`;
        }
        markdown += `Resources: ${ds.numResources} | `;
        const formats = [
          ...new Set(ds.resources.map((r) => r.format).filter(Boolean)),
        ];
        markdown += `Formats: ${formats.join(", ")}\n\n`;
      }

      markdown += "*Source: Data.gov (US Government Open Data)*";

      return {
        success: true,
        query,
        total: data.result.count,
        datasets,
        markdown,
      } satisfies DataGovSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        datasets: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DataGovSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Data.gov Dataset Details
// =============================================================================

export type DataGovDatasetDetailsResult = {
  success: boolean;
  id: string;
  dataset?: DataGovDatasetItem & {
    fullDescription?: string;
    maintainer?: string;
    maintainerEmail?: string;
    author?: string;
    groups: string[];
    allResources: Array<{
      id: string;
      name?: string;
      description?: string;
      format?: string;
      url?: string;
      lastModified?: string;
    }>;
  };
  error?: string;
};

export const getDataGovDatasetTool = tool({
  description:
    "Get detailed information about a specific Data.gov dataset. " +
    "Returns full metadata, all resources, and download links. " +
    "Use after searching to get complete dataset details.",
  inputSchema: z.object({
    datasetId: z.string().min(1).describe("Data.gov dataset ID or name-slug."),
  }),
  execute: async ({ datasetId }) => {
    try {
      const response = await fetch(
        `${DATAGOV_API_BASE}/action/package_show?id=${encodeURIComponent(datasetId)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            id: datasetId,
            error: `Dataset not found: ${datasetId}`,
          } satisfies DataGovDatasetDetailsResult;
        }
        throw new Error(`Data.gov API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        result: DataGovDataset;
      };

      if (!data.success) {
        return {
          success: false,
          id: datasetId,
          error: "Dataset not found.",
        } satisfies DataGovDatasetDetailsResult;
      }

      const ds = data.result;

      const dataset = {
        id: ds.id,
        name: ds.name,
        title: ds.title,
        description: ds.notes,
        organization: ds.organization?.name,
        organizationTitle: ds.organization?.title,
        license: ds.license_title,
        numResources: ds.num_resources || 0,
        tags: ds.tags?.map((t) => t.name) || [],
        created: ds.metadata_created,
        modified: ds.metadata_modified,
        resources:
          ds.resources?.slice(0, 5).map((r) => ({
            id: r.id,
            name: r.name,
            format: r.format,
            url: r.url,
          })) || [],
        url: `https://catalog.data.gov/dataset/${ds.name}`,
        markdown: formatDatasetMarkdown(ds),
        fullDescription: ds.notes,
        maintainer: ds.maintainer,
        maintainerEmail: ds.maintainer_email,
        author: ds.author,
        groups: ds.groups?.map((g) => g.title) || [],
        allResources:
          ds.resources?.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            format: r.format,
            url: r.url,
            lastModified: r.last_modified,
          })) || [],
      };

      return {
        success: true,
        id: datasetId,
        dataset,
      } satisfies DataGovDatasetDetailsResult;
    } catch (error) {
      return {
        success: false,
        id: datasetId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies DataGovDatasetDetailsResult;
    }
  },
});
