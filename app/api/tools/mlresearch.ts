/**
 * Machine Learning Research Tools
 *
 * Provides access to ML research resources:
 *
 * 1. Papers With Code - ML papers linked to code and benchmarks
 *    - State-of-the-art tracking
 *    - Method implementations
 *    - Dataset benchmarks
 *
 * @see https://paperswithcode.com/api/v1/docs/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const PAPERS_WITH_CODE_API_BASE = "https://paperswithcode.com/api/v1";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_ABSTRACT_LENGTH = 1000;

// =============================================================================
// Types
// =============================================================================

type PwcPaper = {
  id: string;
  arxiv_id?: string;
  url_abs?: string;
  url_pdf?: string;
  title: string;
  abstract?: string;
  authors: string[];
  published: string;
  conference?: string;
  tasks?: string[];
  methods?: string[];
  repository_url?: string;
};

type PwcMethod = {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  paper?: {
    id: string;
    title: string;
    arxiv_id?: string;
  };
  introduced_year?: number;
  main_collection?: {
    id: string;
    name: string;
    area: string;
  };
};

type PwcDataset = {
  id: string;
  name: string;
  full_name: string;
  homepage?: string;
  description?: string;
  paper?: {
    id: string;
    title: string;
    arxiv_id?: string;
  };
  introduced_year?: number;
  modalities?: string[];
  languages?: string[];
  num_papers?: number;
};

type PwcTask = {
  id: string;
  name: string;
  description?: string;
  area?: string;
  parent_task?: {
    id: string;
    name: string;
  };
  num_papers?: number;
  num_benchmarks?: number;
};

type PwcSearchResponse<T> = {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
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

function formatPaperMarkdown(paper: PwcPaper): string {
  const parts: string[] = [];

  // Title with link
  const url = paper.url_abs || `https://paperswithcode.com/paper/${paper.id}`;
  parts.push(`### [${paper.title}](${url})`);

  // Authors
  if (paper.authors?.length) {
    const authors = paper.authors.slice(0, 5).join(", ");
    const more = paper.authors.length > 5 ? " et al." : "";
    parts.push(`**Authors:** ${authors}${more}`);
  }

  // Metadata
  const meta: string[] = [];
  if (paper.published) {
    meta.push(`**Published:** ${paper.published}`);
  }
  if (paper.conference) {
    meta.push(`**Venue:** ${paper.conference}`);
  }
  if (paper.arxiv_id) {
    meta.push(`**arXiv:** ${paper.arxiv_id}`);
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Tasks
  if (paper.tasks?.length) {
    parts.push(`**Tasks:** ${paper.tasks.slice(0, 5).join(", ")}`);
  }

  // Methods
  if (paper.methods?.length) {
    parts.push(`**Methods:** ${paper.methods.slice(0, 5).join(", ")}`);
  }

  // Abstract
  if (paper.abstract) {
    const truncated = truncateText(paper.abstract, MAX_ABSTRACT_LENGTH);
    parts.push(`**Abstract:** ${truncated}`);
  }

  // Links
  const links: string[] = [];
  if (paper.url_pdf) {
    links.push(`[PDF](${paper.url_pdf})`);
  }
  if (paper.repository_url) {
    links.push(`[Code](${paper.repository_url})`);
  }
  if (links.length > 0) {
    parts.push(`📎 ${links.join(" | ")}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Papers
// =============================================================================

export type PwcPaperItem = {
  id: string;
  title: string;
  authors: string[];
  published: string;
  conference?: string;
  arxivId?: string;
  abstract?: string;
  tasks: string[];
  methods: string[];
  pdfUrl?: string;
  codeUrl?: string;
  url: string;
  markdown: string;
};

export type PwcPaperSearchResult = {
  success: boolean;
  query: string;
  total: number;
  papers: PwcPaperItem[];
  error?: string;
  markdown: string;
};

export const pwcPaperSearchTool = tool({
  description:
    "Search Papers With Code for machine learning research papers. " +
    "Returns papers with links to implementations, benchmarks, and datasets. " +
    "Use for: finding ML papers with code, tracking state-of-the-art, " +
    "discovering methods and implementations.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for ML papers. Use keywords or paper titles. " +
          "Examples: 'transformer attention', 'BERT language model', " +
          "'graph neural network', 'diffusion models image generation'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum papers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        items_per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${PAPERS_WITH_CODE_API_BASE}/papers/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Papers With Code API error: ${response.status}`);
      }

      const data = (await response.json()) as PwcSearchResponse<PwcPaper>;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          papers: [],
          error: "No papers found. Try different search terms.",
          markdown: `No Papers With Code results for "${query}".`,
        } satisfies PwcPaperSearchResult;
      }

      const papers: PwcPaperItem[] = data.results.map((paper) => ({
        id: paper.id,
        title: paper.title,
        authors: paper.authors || [],
        published: paper.published,
        conference: paper.conference,
        arxivId: paper.arxiv_id,
        abstract: paper.abstract,
        tasks: paper.tasks || [],
        methods: paper.methods || [],
        pdfUrl: paper.url_pdf,
        codeUrl: paper.repository_url,
        url: paper.url_abs || `https://paperswithcode.com/paper/${paper.id}`,
        markdown: formatPaperMarkdown(paper),
      }));

      // Build markdown
      let markdown = `### Papers With Code: "${query}"\n\n`;
      markdown += `Found **${data.count.toLocaleString()}** papers.\n\n`;

      for (const paper of papers.slice(0, 10)) {
        markdown += `**[${paper.title}](${paper.url})**\n`;
        markdown += `${paper.published}`;
        if (paper.conference) markdown += ` | ${paper.conference}`;
        if (paper.codeUrl) markdown += " | 💻 Has Code";
        markdown += "\n";
        if (paper.tasks.length > 0) {
          markdown += `*Tasks: ${paper.tasks.slice(0, 3).join(", ")}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Papers With Code*";

      return {
        success: true,
        query,
        total: data.count,
        papers,
        markdown,
      } satisfies PwcPaperSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        papers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PwcPaperSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search Methods
// =============================================================================

export type PwcMethodItem = {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  introducedYear?: number;
  area?: string;
  paperTitle?: string;
  paperArxivId?: string;
  url: string;
};

export type PwcMethodSearchResult = {
  success: boolean;
  query: string;
  total: number;
  methods: PwcMethodItem[];
  error?: string;
  markdown: string;
};

export const pwcMethodSearchTool = tool({
  description:
    "Search Papers With Code for ML methods and techniques. " +
    "Find methods like attention mechanisms, activation functions, optimizers, etc. " +
    "Use for: understanding ML techniques, finding method papers, " +
    "learning about algorithm implementations.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for ML methods. " +
          "Examples: 'attention mechanism', 'batch normalization', " +
          "'Adam optimizer', 'ReLU activation', 'dropout regularization'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum methods to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        items_per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${PAPERS_WITH_CODE_API_BASE}/methods/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Papers With Code API error: ${response.status}`);
      }

      const data = (await response.json()) as PwcSearchResponse<PwcMethod>;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          methods: [],
          error: "No methods found. Try different search terms.",
          markdown: `No methods found for "${query}".`,
        } satisfies PwcMethodSearchResult;
      }

      const methods: PwcMethodItem[] = data.results.map((method) => ({
        id: method.id,
        name: method.name,
        fullName: method.full_name,
        description: method.description,
        introducedYear: method.introduced_year,
        area: method.main_collection?.area,
        paperTitle: method.paper?.title,
        paperArxivId: method.paper?.arxiv_id,
        url: `https://paperswithcode.com/method/${method.id}`,
      }));

      // Build markdown
      let markdown = `### ML Methods: "${query}"\n\n`;
      markdown += `Found **${data.count.toLocaleString()}** methods.\n\n`;

      for (const method of methods.slice(0, 10)) {
        markdown += `**[${method.fullName}](${method.url})**\n`;
        if (method.introducedYear) {
          markdown += `Introduced: ${method.introducedYear}`;
          if (method.area) markdown += ` | Area: ${method.area}`;
          markdown += "\n";
        }
        if (method.description) {
          markdown += `*${truncateText(method.description, 200)}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Papers With Code*";

      return {
        success: true,
        query,
        total: data.count,
        methods,
        markdown,
      } satisfies PwcMethodSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        methods: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PwcMethodSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search Datasets
// =============================================================================

export type PwcDatasetItem = {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  homepage?: string;
  introducedYear?: number;
  modalities: string[];
  languages: string[];
  numPapers?: number;
  paperTitle?: string;
  url: string;
};

export type PwcDatasetSearchResult = {
  success: boolean;
  query: string;
  total: number;
  datasets: PwcDatasetItem[];
  error?: string;
  markdown: string;
};

export const pwcDatasetSearchTool = tool({
  description:
    "Search Papers With Code for ML datasets and benchmarks. " +
    "Find popular datasets used in ML research with associated papers. " +
    "Use for: finding training datasets, benchmark datasets, " +
    "discovering datasets for specific tasks.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for ML datasets. " +
          "Examples: 'image classification', 'question answering', " +
          "'object detection', 'sentiment analysis', 'medical imaging'"
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
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        items_per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${PAPERS_WITH_CODE_API_BASE}/datasets/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Papers With Code API error: ${response.status}`);
      }

      const data = (await response.json()) as PwcSearchResponse<PwcDataset>;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          datasets: [],
          error: "No datasets found. Try different search terms.",
          markdown: `No datasets found for "${query}".`,
        } satisfies PwcDatasetSearchResult;
      }

      const datasets: PwcDatasetItem[] = data.results.map((dataset) => ({
        id: dataset.id,
        name: dataset.name,
        fullName: dataset.full_name,
        description: dataset.description,
        homepage: dataset.homepage,
        introducedYear: dataset.introduced_year,
        modalities: dataset.modalities || [],
        languages: dataset.languages || [],
        numPapers: dataset.num_papers,
        paperTitle: dataset.paper?.title,
        url: `https://paperswithcode.com/dataset/${dataset.id}`,
      }));

      // Build markdown
      let markdown = `### ML Datasets: "${query}"\n\n`;
      markdown += `Found **${data.count.toLocaleString()}** datasets.\n\n`;

      for (const dataset of datasets.slice(0, 10)) {
        markdown += `**[${dataset.fullName}](${dataset.url})**`;
        if (dataset.homepage) {
          markdown += ` ([Homepage](${dataset.homepage}))`;
        }
        markdown += "\n";
        const info: string[] = [];
        if (dataset.introducedYear) info.push(`${dataset.introducedYear}`);
        if (dataset.numPapers) info.push(`${dataset.numPapers} papers`);
        if (dataset.modalities.length > 0)
          info.push(`Modalities: ${dataset.modalities.join(", ")}`);
        if (info.length > 0) markdown += info.join(" | ") + "\n";
        if (dataset.description) {
          markdown += `*${truncateText(dataset.description, 150)}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Papers With Code*";

      return {
        success: true,
        query,
        total: data.count,
        datasets,
        markdown,
      } satisfies PwcDatasetSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        datasets: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PwcDatasetSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search Tasks
// =============================================================================

export type PwcTaskItem = {
  id: string;
  name: string;
  description?: string;
  area?: string;
  parentTask?: string;
  numPapers?: number;
  numBenchmarks?: number;
  url: string;
};

export type PwcTaskSearchResult = {
  success: boolean;
  query: string;
  total: number;
  tasks: PwcTaskItem[];
  error?: string;
  markdown: string;
};

export const pwcTaskSearchTool = tool({
  description:
    "Search Papers With Code for ML tasks and problems. " +
    "Find tasks like image classification, object detection, NLP tasks, etc. " +
    "Use for: discovering ML research areas, finding task benchmarks, " +
    "understanding problem categories.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for ML tasks. " +
          "Examples: 'image classification', 'machine translation', " +
          "'object detection', 'text generation', 'speech recognition'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum tasks to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        items_per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${PAPERS_WITH_CODE_API_BASE}/tasks/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Papers With Code API error: ${response.status}`);
      }

      const data = (await response.json()) as PwcSearchResponse<PwcTask>;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          tasks: [],
          error: "No tasks found. Try different search terms.",
          markdown: `No tasks found for "${query}".`,
        } satisfies PwcTaskSearchResult;
      }

      const tasks: PwcTaskItem[] = data.results.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        area: task.area,
        parentTask: task.parent_task?.name,
        numPapers: task.num_papers,
        numBenchmarks: task.num_benchmarks,
        url: `https://paperswithcode.com/task/${task.id}`,
      }));

      // Build markdown
      let markdown = `### ML Tasks: "${query}"\n\n`;
      markdown += `Found **${data.count.toLocaleString()}** tasks.\n\n`;

      for (const task of tasks.slice(0, 10)) {
        markdown += `**[${task.name}](${task.url})**\n`;
        const info: string[] = [];
        if (task.area) info.push(`Area: ${task.area}`);
        if (task.numPapers) info.push(`${task.numPapers} papers`);
        if (task.numBenchmarks) info.push(`${task.numBenchmarks} benchmarks`);
        if (info.length > 0) markdown += info.join(" | ") + "\n";
        if (task.description) {
          markdown += `*${truncateText(task.description, 150)}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Papers With Code*";

      return {
        success: true,
        query,
        total: data.count,
        tasks,
        markdown,
      } satisfies PwcTaskSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        tasks: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PwcTaskSearchResult;
    }
  },
});
