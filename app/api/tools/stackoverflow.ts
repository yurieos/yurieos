/**
 * Stack Exchange API Tools
 *
 * Provides access to Stack Overflow and the Stack Exchange network:
 *
 * 1. Stack Overflow - Programming Q&A (20M+ questions)
 * 2. Stack Exchange Network - 170+ Q&A communities
 *    - Math, Physics, Chemistry, Biology, and more
 *
 * @see https://api.stackexchange.com/docs
 *
 * No API key required (300 requests/day without key, 10K with free key).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const STACKEXCHANGE_API_BASE = "https://api.stackexchange.com/2.3";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 30;
const MAX_BODY_LENGTH = 2000;

// =============================================================================
// Types
// =============================================================================

type StackExchangeQuestion = {
  question_id: number;
  title: string;
  body?: string;
  body_markdown?: string;
  link: string;
  tags: string[];
  score: number;
  view_count: number;
  answer_count: number;
  is_answered: boolean;
  accepted_answer_id?: number;
  creation_date: number;
  last_activity_date: number;
  owner?: {
    display_name: string;
    reputation?: number;
    link?: string;
  };
};

type StackExchangeAnswer = {
  answer_id: number;
  question_id: number;
  body?: string;
  body_markdown?: string;
  score: number;
  is_accepted: boolean;
  creation_date: number;
  owner?: {
    display_name: string;
    reputation?: number;
  };
};

type StackExchangeSearchResponse = {
  items: StackExchangeQuestion[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
};

type StackExchangeAnswersResponse = {
  items: StackExchangeAnswer[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
};

// =============================================================================
// Helpers
// =============================================================================

function truncateBody(body: string | undefined, maxLength: number): string {
  if (!body) return "";
  // Remove HTML tags for cleaner output
  const cleanBody = body
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanBody.length <= maxLength) return cleanBody;
  return `${cleanBody.slice(0, maxLength)}...`;
}

function formatDateFromUnix(unixTime: number): string {
  return new Date(unixTime * 1000).toLocaleDateString();
}

function formatQuestionMarkdown(q: StackExchangeQuestion): string {
  const parts: string[] = [];

  // Title with link
  parts.push(`### [${q.title}](${q.link})`);

  // Metadata
  const meta: string[] = [];
  meta.push(`**Score:** ${q.score}`);
  meta.push(`**Answers:** ${q.answer_count}`);
  meta.push(`**Views:** ${q.view_count.toLocaleString()}`);
  if (q.is_answered) {
    meta.push(q.accepted_answer_id ? "✅ Accepted Answer" : "✓ Answered");
  }
  parts.push(meta.join(" | "));

  // Tags
  if (q.tags?.length) {
    parts.push(`**Tags:** ${q.tags.map((t) => `\`${t}\``).join(", ")}`);
  }

  // Author and date
  if (q.owner?.display_name) {
    parts.push(
      `*Asked by ${q.owner.display_name} on ${formatDateFromUnix(q.creation_date)}*`
    );
  }

  // Body preview
  if (q.body) {
    const preview = truncateBody(q.body, MAX_BODY_LENGTH);
    if (preview) {
      parts.push(`\n${preview}`);
    }
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Stack Overflow
// =============================================================================

export type StackOverflowQuestionItem = {
  questionId: number;
  title: string;
  link: string;
  tags: string[];
  score: number;
  viewCount: number;
  answerCount: number;
  isAnswered: boolean;
  hasAcceptedAnswer: boolean;
  createdAt: string;
  authorName?: string;
  bodyPreview?: string;
  markdown: string;
};

export type StackOverflowSearchResult = {
  success: boolean;
  query: string;
  site: string;
  total: number;
  questions: StackOverflowQuestionItem[];
  quotaRemaining: number;
  error?: string;
  markdown: string;
};

export const stackOverflowSearchTool = tool({
  description:
    "Search Stack Overflow for programming questions and answers. " +
    "Access 20M+ solved programming problems with community-vetted solutions. " +
    "Use for: debugging issues, finding code examples, understanding APIs, " +
    "learning best practices, solving technical problems.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for programming questions. Use keywords and error messages. " +
          "Examples: 'React useEffect infinite loop', 'Python async await', " +
          "'TypeScript generic constraints', 'node.js memory leak'"
      ),
    tagged: z
      .string()
      .optional()
      .describe(
        "Filter by tags (semicolon-separated). " +
          "Examples: 'javascript', 'python;django', 'react;typescript'"
      ),
    sort: z
      .string()
      .optional()
      .default("relevance")
      .describe(
        "Sort order: 'relevance' (default), 'votes', 'creation', 'activity'"
      ),
    accepted: z
      .boolean()
      .optional()
      .describe("If true, only return questions with accepted answers."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum questions to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, tagged, sort, accepted, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        order: "desc",
        sort: sort || "relevance",
        intitle: query,
        site: "stackoverflow",
        pagesize: searchLimit.toString(),
        filter: "withbody", // Include body in response
      });

      if (tagged) {
        params.append("tagged", tagged);
      }

      if (accepted) {
        params.append("accepted", "True");
      }

      const response = await fetch(
        `${STACKEXCHANGE_API_BASE}/search/advanced?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Stack Exchange API error: ${response.status}`);
      }

      const data = (await response.json()) as StackExchangeSearchResponse;

      if (!data.items?.length) {
        return {
          success: true,
          query,
          site: "stackoverflow",
          total: 0,
          questions: [],
          quotaRemaining: data.quota_remaining,
          error: "No questions found. Try different search terms or tags.",
          markdown: `No Stack Overflow questions found for "${query}".`,
        } satisfies StackOverflowSearchResult;
      }

      const questions: StackOverflowQuestionItem[] = data.items.map((q) => ({
        questionId: q.question_id,
        title: q.title,
        link: q.link,
        tags: q.tags,
        score: q.score,
        viewCount: q.view_count,
        answerCount: q.answer_count,
        isAnswered: q.is_answered,
        hasAcceptedAnswer: Boolean(q.accepted_answer_id),
        createdAt: formatDateFromUnix(q.creation_date),
        authorName: q.owner?.display_name,
        bodyPreview: truncateBody(q.body, 500),
        markdown: formatQuestionMarkdown(q),
      }));

      // Build markdown
      let markdown = `### Stack Overflow: "${query}"\n\n`;
      markdown += `Found **${data.items.length}** questions.\n\n`;

      for (const q of questions.slice(0, 10)) {
        markdown += `**[${q.title}](${q.link})**\n`;
        markdown += `Score: ${q.score} | Answers: ${q.answerCount} | Views: ${q.viewCount.toLocaleString()}`;
        if (q.hasAcceptedAnswer) markdown += " | ✅ Accepted";
        markdown += "\n";
        markdown += `Tags: ${q.tags
          .slice(0, 5)
          .map((t) => `\`${t}\``)
          .join(", ")}\n\n`;
      }

      markdown += `\n*API quota remaining: ${data.quota_remaining}*`;

      return {
        success: true,
        query,
        site: "stackoverflow",
        total: data.items.length,
        questions,
        quotaRemaining: data.quota_remaining,
        markdown,
      } satisfies StackOverflowSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        site: "stackoverflow",
        total: 0,
        questions: [],
        quotaRemaining: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies StackOverflowSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Question Answers
// =============================================================================

export type StackOverflowAnswerItem = {
  answerId: number;
  questionId: number;
  score: number;
  isAccepted: boolean;
  createdAt: string;
  authorName?: string;
  body: string;
};

export type StackOverflowAnswersResult = {
  success: boolean;
  questionId: number;
  answers: StackOverflowAnswerItem[];
  error?: string;
  markdown: string;
};

export const stackOverflowAnswersTool = tool({
  description:
    "Get answers for a specific Stack Overflow question. " +
    "Use this after searching to retrieve the actual solutions. " +
    "Answers are sorted by score (best answers first).",
  inputSchema: z.object({
    questionId: z
      .number()
      .int()
      .describe("Question ID from Stack Overflow search results."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Maximum answers to return (1-10)."),
  }),
  execute: async ({ questionId, limit }) => {
    try {
      const searchLimit = Math.min(limit ?? 5, 10);

      const params = new URLSearchParams({
        order: "desc",
        sort: "votes",
        site: "stackoverflow",
        pagesize: searchLimit.toString(),
        filter: "withbody",
      });

      const response = await fetch(
        `${STACKEXCHANGE_API_BASE}/questions/${questionId}/answers?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Stack Exchange API error: ${response.status}`);
      }

      const data = (await response.json()) as StackExchangeAnswersResponse;

      if (!data.items?.length) {
        return {
          success: true,
          questionId,
          answers: [],
          error: "No answers found for this question.",
          markdown: `No answers found for question ${questionId}.`,
        } satisfies StackOverflowAnswersResult;
      }

      const answers: StackOverflowAnswerItem[] = data.items.map((a) => ({
        answerId: a.answer_id,
        questionId: a.question_id,
        score: a.score,
        isAccepted: a.is_accepted,
        createdAt: formatDateFromUnix(a.creation_date),
        authorName: a.owner?.display_name,
        body: truncateBody(a.body, MAX_BODY_LENGTH),
      }));

      // Build markdown
      let markdown = `### Answers for Question ${questionId}\n\n`;

      for (const a of answers) {
        markdown += "---\n";
        markdown += `**Score: ${a.score}**`;
        if (a.isAccepted) markdown += " ✅ *Accepted Answer*";
        markdown += `\n*By ${a.authorName || "Anonymous"} on ${a.createdAt}*\n\n`;
        markdown += `${a.body}\n\n`;
      }

      return {
        success: true,
        questionId,
        answers,
        markdown,
      } satisfies StackOverflowAnswersResult;
    } catch (error) {
      return {
        success: false,
        questionId,
        answers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies StackOverflowAnswersResult;
    }
  },
});

// =============================================================================
// Tool: Search Stack Exchange Network
// =============================================================================

export const stackExchangeSearchTool = tool({
  description:
    "Search the Stack Exchange network beyond Stack Overflow. " +
    "Access 170+ specialized Q&A communities including Math, Physics, " +
    "Chemistry, Biology, Academia, Computer Science, and more. " +
    "Use for: academic questions, scientific problems, specialized topics.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for the specified Stack Exchange site. " +
          "Examples: 'eigenvalue decomposition', 'CRISPR mechanism', 'PhD advisor conflict'"
      ),
    site: z
      .string()
      .describe(
        "Stack Exchange site to search. Options: 'math', 'physics', 'chemistry', " +
          "'biology', 'academia', 'cs' (computer science), 'stats' (statistics), " +
          "'datascience', 'ai', 'astronomy', 'economics', 'philosophy', 'linguistics', " +
          "'history', 'law', 'security' (information security), 'crypto' (cryptography)"
      ),
    sort: z
      .string()
      .optional()
      .default("relevance")
      .describe(
        "Sort order: 'relevance' (default), 'votes', 'creation', 'activity'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum questions to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, site, sort, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        order: "desc",
        sort: sort || "relevance",
        intitle: query,
        site,
        pagesize: searchLimit.toString(),
        filter: "withbody",
      });

      const response = await fetch(
        `${STACKEXCHANGE_API_BASE}/search/advanced?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Stack Exchange API error: ${response.status}`);
      }

      const data = (await response.json()) as StackExchangeSearchResponse;

      if (!data.items?.length) {
        return {
          success: true,
          query,
          site,
          total: 0,
          questions: [],
          quotaRemaining: data.quota_remaining,
          error: `No questions found on ${site}.stackexchange.com. Try different search terms.`,
          markdown: `No questions found on ${site}.stackexchange.com for "${query}".`,
        } satisfies StackOverflowSearchResult;
      }

      const questions: StackOverflowQuestionItem[] = data.items.map((q) => ({
        questionId: q.question_id,
        title: q.title,
        link: q.link,
        tags: q.tags,
        score: q.score,
        viewCount: q.view_count,
        answerCount: q.answer_count,
        isAnswered: q.is_answered,
        hasAcceptedAnswer: Boolean(q.accepted_answer_id),
        createdAt: formatDateFromUnix(q.creation_date),
        authorName: q.owner?.display_name,
        bodyPreview: truncateBody(q.body, 500),
        markdown: formatQuestionMarkdown(q),
      }));

      // Build markdown
      let markdown = `### ${site}.stackexchange.com: "${query}"\n\n`;
      markdown += `Found **${data.items.length}** questions.\n\n`;

      for (const q of questions.slice(0, 10)) {
        markdown += `**[${q.title}](${q.link})**\n`;
        markdown += `Score: ${q.score} | Answers: ${q.answerCount}`;
        if (q.hasAcceptedAnswer) markdown += " | ✅ Accepted";
        markdown += "\n";
        markdown += `Tags: ${q.tags
          .slice(0, 5)
          .map((t) => `\`${t}\``)
          .join(", ")}\n\n`;
      }

      markdown += `\n*API quota remaining: ${data.quota_remaining}*`;

      return {
        success: true,
        query,
        site,
        total: data.items.length,
        questions,
        quotaRemaining: data.quota_remaining,
        markdown,
      } satisfies StackOverflowSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        site,
        total: 0,
        questions: [],
        quotaRemaining: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies StackOverflowSearchResult;
    }
  },
});
