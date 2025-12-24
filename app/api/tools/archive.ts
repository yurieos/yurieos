/**
 * Web Archive Tools
 *
 * Provides access to historical web content:
 *
 * Internet Archive Wayback Machine - 850B+ archived web pages
 * @see https://archive.org/help/wayback_api.php
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const WAYBACK_AVAILABILITY_API = "https://archive.org/wayback/available";
const WAYBACK_CDX_API = "https://web.archive.org/cdx/search/cdx";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type WaybackAvailabilityResponse = {
  url: string;
  archived_snapshots: {
    closest?: {
      status: string;
      available: boolean;
      url: string;
      timestamp: string;
    };
  };
};

// =============================================================================
// Helpers
// =============================================================================

function formatTimestamp(timestamp: string): string {
  // Wayback timestamps are in format: YYYYMMDDhhmmss
  if (timestamp.length < 8) {
    return timestamp;
  }

  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);

  if (timestamp.length >= 14) {
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  return `${year}-${month}-${day}`;
}

function buildWaybackUrl(timestamp: string, originalUrl: string): string {
  return `https://web.archive.org/web/${timestamp}/${originalUrl}`;
}

// =============================================================================
// Tool: Check Wayback Availability
// =============================================================================

export type WaybackAvailabilityResult = {
  success: boolean;
  url: string;
  available: boolean;
  snapshot?: {
    timestamp: string;
    formattedDate: string;
    archiveUrl: string;
    status: string;
  };
  error?: string;
  markdown: string;
};

export const waybackAvailabilityTool = tool({
  description:
    "Check if a URL has been archived by the Internet Archive Wayback Machine. " +
    "Returns the most recent archived snapshot if available. " +
    "Use for: verifying if historical content exists, finding archived versions of removed pages, " +
    "fact-checking past content.",
  inputSchema: z.object({
    url: z
      .string()
      .min(1)
      .describe(
        "The URL to check for archived versions. " +
          "Examples: 'https://example.com', 'twitter.com/username/status/123'"
      ),
    timestamp: z
      .string()
      .optional()
      .describe(
        "Optional: Find snapshot closest to this date. Format: YYYYMMDD or YYYYMMDDHHMMSS. " +
          "Examples: '20200101', '20191231235959'"
      ),
  }),
  execute: async ({ url, timestamp }) => {
    try {
      // Build query URL
      const params = new URLSearchParams({ url });
      if (timestamp) {
        params.append("timestamp", timestamp);
      }

      const response = await fetch(
        `${WAYBACK_AVAILABILITY_API}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Wayback Machine API error: ${response.status}`);
      }

      const data = (await response.json()) as WaybackAvailabilityResponse;

      const closest = data.archived_snapshots.closest;

      if (!closest?.available) {
        return {
          success: true,
          url,
          available: false,
          markdown: `### Wayback Machine Check\n\n**URL:** ${url}\n\n❌ No archived snapshots found for this URL.`,
        } satisfies WaybackAvailabilityResult;
      }

      const result = {
        timestamp: closest.timestamp,
        formattedDate: formatTimestamp(closest.timestamp),
        archiveUrl: closest.url,
        status: closest.status,
      };

      const markdown =
        "### Wayback Machine Snapshot\n\n" +
        `**Original URL:** ${url}\n` +
        `**Archived:** ${result.formattedDate}\n` +
        `**Status:** ${result.status}\n\n` +
        `📜 [View Archived Version](${result.archiveUrl})`;

      return {
        success: true,
        url,
        available: true,
        snapshot: result,
        markdown,
      } satisfies WaybackAvailabilityResult;
    } catch (error) {
      return {
        success: false,
        url,
        available: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error checking Wayback Machine: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WaybackAvailabilityResult;
    }
  },
});

// =============================================================================
// Tool: Search Wayback History
// =============================================================================

export type WaybackSnapshot = {
  timestamp: string;
  formattedDate: string;
  archiveUrl: string;
  originalUrl: string;
  mimeType: string;
  statusCode: string;
};

export type WaybackHistoryResult = {
  success: boolean;
  url: string;
  total: number;
  snapshots: WaybackSnapshot[];
  error?: string;
  markdown: string;
};

export const waybackHistoryTool = tool({
  description:
    "Get the complete archive history of a URL from the Wayback Machine. " +
    "Returns all available snapshots with timestamps. " +
    "Use for: tracking changes over time, finding specific historical versions, " +
    "research on website evolution.",
  inputSchema: z.object({
    url: z.string().min(1).describe("The URL to get archive history for."),
    from: z
      .string()
      .optional()
      .describe(
        "Start date for history. Format: YYYYMMDD. Example: '20200101'"
      ),
    to: z
      .string()
      .optional()
      .describe("End date for history. Format: YYYYMMDD. Example: '20231231'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum snapshots to return (1-${MAX_RESULTS_LIMIT}).`),
    collapse: z
      .string()
      .optional()
      .default("timestamp:8")
      .describe(
        "Collapse results by timestamp prefix. 'timestamp:8' = one per day, " +
          "'timestamp:6' = one per month, 'timestamp:4' = one per year."
      ),
  }),
  execute: async ({ url, from, to, limit, collapse }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build CDX API query
      const params = new URLSearchParams({
        url,
        output: "json",
        limit: searchLimit.toString(),
        fl: "timestamp,original,mimetype,statuscode",
        collapse: collapse || "timestamp:8",
      });

      if (from) {
        params.append("from", from);
      }
      if (to) {
        params.append("to", to);
      }

      const response = await fetch(`${WAYBACK_CDX_API}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Wayback CDX API error: ${response.status}`);
      }

      const data = (await response.json()) as string[][];

      // First row is header, skip it
      if (!data || data.length <= 1) {
        return {
          success: true,
          url,
          total: 0,
          snapshots: [],
          markdown: `### Wayback Machine History\n\n**URL:** ${url}\n\n❌ No archived snapshots found for this URL.`,
        } satisfies WaybackHistoryResult;
      }

      // Parse results (skip header row)
      const snapshots: WaybackSnapshot[] = data.slice(1).map((row) => ({
        timestamp: row[0],
        formattedDate: formatTimestamp(row[0]),
        archiveUrl: buildWaybackUrl(row[0], row[1]),
        originalUrl: row[1],
        mimeType: row[2],
        statusCode: row[3],
      }));

      // Build markdown
      let markdown = "### Wayback Machine History\n\n";
      markdown += `**URL:** ${url}\n`;
      markdown += `**Snapshots Found:** ${snapshots.length}\n\n`;

      if (snapshots.length > 0) {
        markdown += "| Date | Status | Archive Link |\n";
        markdown += "|------|--------|-------------|\n";
        for (const s of snapshots.slice(0, 20)) {
          markdown += `| ${s.formattedDate} | ${s.statusCode} | [View](${s.archiveUrl}) |\n`;
        }
        if (snapshots.length > 20) {
          markdown += `\n*... and ${snapshots.length - 20} more snapshots*`;
        }
      }

      markdown += "\n\n*Source: Internet Archive Wayback Machine*";

      return {
        success: true,
        url,
        total: snapshots.length,
        snapshots,
        markdown,
      } satisfies WaybackHistoryResult;
    } catch (error) {
      return {
        success: false,
        url,
        total: 0,
        snapshots: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error fetching Wayback history: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WaybackHistoryResult;
    }
  },
});

// =============================================================================
// Tool: Get Archived Page Content Summary
// =============================================================================

export type WaybackContentResult = {
  success: boolean;
  url: string;
  timestamp: string;
  archiveUrl: string;
  available: boolean;
  error?: string;
  markdown: string;
};

export const waybackSnapshotTool = tool({
  description:
    "Get a specific archived snapshot of a URL from a particular date. " +
    "Returns the archive URL for the snapshot closest to the specified date. " +
    "Use for: accessing specific historical versions, comparing past and present content.",
  inputSchema: z.object({
    url: z.string().min(1).describe("The URL to get an archived version of."),
    date: z
      .string()
      .min(1)
      .describe(
        "Target date for the snapshot. Format: YYYYMMDD. Example: '20200315'"
      ),
  }),
  execute: async ({ url, date }) => {
    try {
      const response = await fetch(
        `${WAYBACK_AVAILABILITY_API}?url=${encodeURIComponent(url)}&timestamp=${date}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Wayback Machine API error: ${response.status}`);
      }

      const data = (await response.json()) as WaybackAvailabilityResponse;

      const closest = data.archived_snapshots.closest;

      if (!closest?.available) {
        return {
          success: true,
          url,
          timestamp: date,
          archiveUrl: "",
          available: false,
          markdown: `### Wayback Machine Snapshot\n\n**URL:** ${url}\n**Target Date:** ${formatTimestamp(date)}\n\n❌ No snapshot found near this date.`,
        } satisfies WaybackContentResult;
      }

      const markdown =
        "### Wayback Machine Snapshot\n\n" +
        `**Original URL:** ${url}\n` +
        `**Target Date:** ${formatTimestamp(date)}\n` +
        `**Actual Snapshot:** ${formatTimestamp(closest.timestamp)}\n\n` +
        `📜 [View Archived Version](${closest.url})`;

      return {
        success: true,
        url,
        timestamp: closest.timestamp,
        archiveUrl: closest.url,
        available: true,
        markdown,
      } satisfies WaybackContentResult;
    } catch (error) {
      return {
        success: false,
        url,
        timestamp: date,
        archiveUrl: "",
        available: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WaybackContentResult;
    }
  },
});
