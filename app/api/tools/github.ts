/**
 * GitHub Open Source Research Tools
 *
 * Provides access to GitHub's public API:
 *
 * 1. GitHub Search API - Repositories, code, issues, users
 *    @see https://docs.github.com/en/rest/search
 *
 * No API key required (rate limited to 10 requests/minute for unauthenticated).
 * Set GITHUB_TOKEN for higher rate limits.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const GITHUB_API_BASE = "https://api.github.com";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 30;

// =============================================================================
// Types
// =============================================================================

type GitHubOwner = {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
};

type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  topics: string[];
  visibility: string;
  default_branch: string;
  archived: boolean;
};

type GitHubSearchReposResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
};

type GitHubUser = {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
};

type GitHubSearchUsersResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubUser[];
};

// =============================================================================
// Helpers
// =============================================================================

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function formatNumber(num: number): string {
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

function formatRepoMarkdown(repo: GitHubRepository): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${repo.full_name}](${repo.html_url})`);

  // Description
  if (repo.description) {
    parts.push(`*${repo.description}*`);
  }

  // Stats
  const stats: string[] = [];
  stats.push(`⭐ ${formatNumber(repo.stargazers_count)}`);
  stats.push(`🍴 ${formatNumber(repo.forks_count)}`);
  if (repo.language) {
    stats.push(`💻 ${repo.language}`);
  }
  parts.push(stats.join(" | "));

  // License
  if (repo.license) {
    parts.push(`**License:** ${repo.license.name}`);
  }

  // Topics
  if (repo.topics?.length > 0) {
    parts.push(`**Topics:** ${repo.topics.slice(0, 5).join(", ")}`);
  }

  // Dates
  const updated = new Date(repo.updated_at).toISOString().split("T")[0];
  parts.push(`**Last updated:** ${updated}`);

  // Status badges
  const badges: string[] = [];
  if (repo.archived) badges.push("📦 Archived");
  if (repo.fork) badges.push("🔀 Fork");
  if (badges.length > 0) {
    parts.push(badges.join(" | "));
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search GitHub Repositories
// =============================================================================

export type GitHubRepoItem = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerType: string;
  url: string;
  description?: string;
  stars: number;
  forks: number;
  openIssues: number;
  language?: string;
  license?: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
  markdown: string;
};

export type GitHubRepoSearchResult = {
  success: boolean;
  query: string;
  total: number;
  repositories: GitHubRepoItem[];
  error?: string;
  markdown: string;
};

export const githubRepoSearchTool = tool({
  description:
    "Search GitHub for open source repositories. " +
    "Find projects by name, description, language, or topic. " +
    "Use for: technology research, finding libraries, open source analysis, " +
    "competitive intelligence, discovering tools and frameworks.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for repositories. Can include qualifiers. " +
          "Examples: 'machine learning python', 'react component library', " +
          "'kubernetes operator', 'llm framework', 'game engine rust'"
      ),
    language: z
      .string()
      .optional()
      .describe(
        "Filter by programming language. Examples: 'python', 'javascript', 'rust', 'go'"
      ),
    topic: z
      .string()
      .optional()
      .describe(
        "Filter by topic/tag. Examples: 'machine-learning', 'react', 'cli'"
      ),
    sort: z
      .enum(["stars", "forks", "help-wanted-issues", "updated"])
      .optional()
      .default("stars")
      .describe(
        "Sort order: 'stars' (most popular), 'forks', 'updated' (recent activity)."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum repositories to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, language, topic, sort, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = query;
      if (language) {
        searchQuery += ` language:${language}`;
      }
      if (topic) {
        searchQuery += ` topic:${topic}`;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        sort: sort || "stars",
        order: "desc",
        per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${GITHUB_API_BASE}/search/repositories?${params.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits."
          );
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubSearchReposResponse;

      if (!data.items?.length) {
        return {
          success: true,
          query,
          total: 0,
          repositories: [],
          error: "No repositories found. Try different search terms.",
          markdown: `No GitHub repositories found for "${query}".`,
        } satisfies GitHubRepoSearchResult;
      }

      const repositories: GitHubRepoItem[] = data.items.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        ownerType: repo.owner.type,
        url: repo.html_url,
        description: repo.description || undefined,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language || undefined,
        license: repo.license?.name,
        topics: repo.topics || [],
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        isArchived: repo.archived,
        isFork: repo.fork,
        markdown: formatRepoMarkdown(repo),
      }));

      // Build markdown
      let markdown = `### GitHub Repositories: "${query}"\n\n`;
      markdown += `Found ${formatNumber(data.total_count)} repositories.\n\n`;

      for (const repo of repositories.slice(0, 10)) {
        markdown += `**[${repo.fullName}](${repo.url})**`;
        if (repo.isArchived) markdown += " 📦";
        markdown += "\n";
        if (repo.description) {
          markdown += `${repo.description.slice(0, 100)}${repo.description.length > 100 ? "..." : ""}\n`;
        }
        markdown += `⭐ ${formatNumber(repo.stars)} | 🍴 ${formatNumber(repo.forks)}`;
        if (repo.language) {
          markdown += ` | ${repo.language}`;
        }
        markdown += "\n\n";
      }

      markdown += "*Source: GitHub*";

      return {
        success: true,
        query,
        total: data.total_count,
        repositories,
        markdown,
      } satisfies GitHubRepoSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        repositories: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies GitHubRepoSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get GitHub Repository Details
// =============================================================================

export type GitHubRepoDetailsResult = {
  success: boolean;
  fullName: string;
  repository?: GitHubRepoItem & {
    homepage?: string;
    size: number;
    defaultBranch: string;
    watchers: number;
    hasIssues: boolean;
    hasProjects: boolean;
    hasWiki: boolean;
  };
  error?: string;
};

export const getGithubRepoTool = tool({
  description:
    "Get detailed information about a specific GitHub repository. " +
    "Returns full metadata including description, stats, and links. " +
    "Use after searching to get complete repository details.",
  inputSchema: z.object({
    owner: z
      .string()
      .min(1)
      .describe(
        "Repository owner (user or organization). Example: 'facebook', 'microsoft'"
      ),
    repo: z
      .string()
      .min(1)
      .describe("Repository name. Example: 'react', 'vscode'"),
  }),
  execute: async ({ owner, repo }) => {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            fullName: `${owner}/${repo}`,
            error: `Repository not found: ${owner}/${repo}`,
          } satisfies GitHubRepoDetailsResult;
        }
        if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded.");
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubRepository;

      const repository = {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        owner: data.owner.login,
        ownerType: data.owner.type,
        url: data.html_url,
        description: data.description || undefined,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        language: data.language || undefined,
        license: data.license?.name,
        topics: data.topics || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isArchived: data.archived,
        isFork: data.fork,
        markdown: formatRepoMarkdown(data),
        homepage: data.homepage || undefined,
        size: data.size,
        defaultBranch: data.default_branch,
        watchers: data.watchers_count,
        hasIssues: data.open_issues_count > 0,
        hasProjects: true,
        hasWiki: true,
      };

      return {
        success: true,
        fullName: data.full_name,
        repository,
      } satisfies GitHubRepoDetailsResult;
    } catch (error) {
      return {
        success: false,
        fullName: `${owner}/${repo}`,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies GitHubRepoDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Search GitHub Users/Organizations
// =============================================================================

export type GitHubUserItem = {
  login: string;
  id: number;
  avatarUrl: string;
  url: string;
  type: string;
  name?: string;
  company?: string;
  location?: string;
  bio?: string;
  publicRepos?: number;
  followers?: number;
};

export type GitHubUserSearchResult = {
  success: boolean;
  query: string;
  total: number;
  users: GitHubUserItem[];
  error?: string;
  markdown: string;
};

export const githubUserSearchTool = tool({
  description:
    "Search GitHub for users and organizations. " +
    "Find developers, companies, and open source organizations. " +
    "Use for: finding contributors, researching companies, developer discovery.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for users. Can include qualifiers. " +
          "Examples: 'machine learning', 'location:san francisco', 'followers:>1000'"
      ),
    type: z
      .enum(["user", "org"])
      .optional()
      .describe("Filter by account type: 'user' or 'org' (organization)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum users to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, type, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = query;
      if (type) {
        searchQuery += ` type:${type}`;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${GITHUB_API_BASE}/search/users?${params.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("GitHub API rate limit exceeded.");
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubSearchUsersResponse;

      if (!data.items?.length) {
        return {
          success: true,
          query,
          total: 0,
          users: [],
          error: "No users found. Try different search terms.",
          markdown: `No GitHub users found for "${query}".`,
        } satisfies GitHubUserSearchResult;
      }

      const users: GitHubUserItem[] = data.items.map((user) => ({
        login: user.login,
        id: user.id,
        avatarUrl: user.avatar_url,
        url: user.html_url,
        type: user.type,
      }));

      // Build markdown
      let markdown = `### GitHub Users: "${query}"\n\n`;
      markdown += `Found ${formatNumber(data.total_count)} users/organizations.\n\n`;

      for (const user of users.slice(0, 10)) {
        const typeIcon = user.type === "Organization" ? "🏢" : "👤";
        markdown += `${typeIcon} **[${user.login}](${user.url})**\n\n`;
      }

      markdown += "*Source: GitHub*";

      return {
        success: true,
        query,
        total: data.total_count,
        users,
        markdown,
      } satisfies GitHubUserSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        users: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies GitHubUserSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Trending Repositories
// =============================================================================

export type TrendingReposResult = {
  success: boolean;
  language?: string;
  repositories: GitHubRepoItem[];
  error?: string;
  markdown: string;
};

export const githubTrendingTool = tool({
  description:
    "Get trending GitHub repositories (recently popular projects). " +
    "Finds repositories with recent star growth and activity. " +
    "Use for: discovering new projects, tracking trends, finding popular tools.",
  inputSchema: z.object({
    language: z
      .string()
      .optional()
      .describe(
        "Filter by programming language. Examples: 'python', 'typescript', 'rust'"
      ),
    since: z
      .enum(["daily", "weekly", "monthly"])
      .optional()
      .default("weekly")
      .describe("Time period: 'daily', 'weekly', or 'monthly'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum repositories to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ language, since, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Calculate date range
      const now = new Date();
      let daysAgo = 7;
      if (since === "daily") daysAgo = 1;
      else if (since === "monthly") daysAgo = 30;

      const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dateStr = dateFrom.toISOString().split("T")[0];

      // Build search query for recently created/updated popular repos
      let searchQuery = `created:>${dateStr}`;
      if (language) {
        searchQuery += ` language:${language}`;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        sort: "stars",
        order: "desc",
        per_page: searchLimit.toString(),
      });

      const response = await fetch(
        `${GITHUB_API_BASE}/search/repositories?${params.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubSearchReposResponse;

      const repositories: GitHubRepoItem[] = (data.items || []).map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        ownerType: repo.owner.type,
        url: repo.html_url,
        description: repo.description || undefined,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        language: repo.language || undefined,
        license: repo.license?.name,
        topics: repo.topics || [],
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        isArchived: repo.archived,
        isFork: repo.fork,
        markdown: formatRepoMarkdown(repo),
      }));

      // Build markdown
      let markdown = `### Trending GitHub Repositories (${since})\n\n`;
      if (language) {
        markdown += `**Language:** ${language}\n\n`;
      }

      for (const repo of repositories.slice(0, 10)) {
        markdown += `🔥 **[${repo.fullName}](${repo.url})**\n`;
        if (repo.description) {
          markdown += `${repo.description.slice(0, 80)}${repo.description.length > 80 ? "..." : ""}\n`;
        }
        markdown += `⭐ ${formatNumber(repo.stars)}`;
        if (repo.language) {
          markdown += ` | ${repo.language}`;
        }
        markdown += "\n\n";
      }

      markdown += "*Source: GitHub*";

      return {
        success: true,
        language,
        repositories,
        markdown,
      } satisfies TrendingReposResult;
    } catch (error) {
      return {
        success: false,
        language,
        repositories: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies TrendingReposResult;
    }
  },
});
