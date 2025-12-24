/**
 * Historical Archives & Digital Collections Tools
 *
 * Provides access to historical research resources:
 *
 * 1. Internet Archive - Full-text search across 40M+ scanned books
 * 2. Library of Congress - Digital collections and Chronicling America newspapers
 * 3. Digital Public Library of America - 47M+ items from US libraries
 *
 * @see https://archive.org/developers/
 * @see https://www.loc.gov/apis/
 * @see https://pro.dp.la/developers/api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const INTERNET_ARCHIVE_API_BASE = "https://archive.org";
const LOC_API_BASE = "https://www.loc.gov";
const DPLA_API_BASE = "https://api.dp.la/v2";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;
const MAX_DESCRIPTION_LENGTH = 800;

// =============================================================================
// Types
// =============================================================================

type InternetArchiveItem = {
  identifier: string;
  title: string;
  description?: string | string[];
  creator?: string | string[];
  date?: string;
  year?: string;
  mediatype: string;
  collection?: string[];
  downloads?: number;
  item_count?: number;
  language?: string | string[];
  subject?: string | string[];
};

type InternetArchiveSearchResponse = {
  response: {
    numFound: number;
    start: number;
    docs: InternetArchiveItem[];
  };
};

type LocItem = {
  id: string;
  title: string;
  description?: string[];
  contributor?: string[];
  date?: string;
  subject?: string[];
  type?: string[];
  language?: string[];
  url: string;
  image_url?: string[];
  online_format?: string[];
};

type LocSearchResponse = {
  results: LocItem[];
  pagination: {
    total: number;
    current: number;
    of: number;
  };
};

type DplaItem = {
  id: string;
  sourceResource: {
    title: string | string[];
    description?: string | string[];
    creator?: string | string[];
    date?: {
      displayDate?: string;
      begin?: string;
      end?: string;
    };
    subject?: Array<{ name: string }>;
    type?: string | string[];
    language?: Array<{ name: string }>;
    format?: string | string[];
    rights?: string;
  };
  dataProvider: string;
  isShownAt: string;
  object?: string;
};

type DplaSearchResponse = {
  count: number;
  start: number;
  limit: number;
  docs: DplaItem[];
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

function normalizeStringOrArray(value: string | string[] | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  return value;
}

function normalizeArrayToString(
  value: string | string[] | undefined
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// =============================================================================
// Tool: Internet Archive Full-Text Search
// =============================================================================

export type InternetArchiveResultItem = {
  identifier: string;
  title: string;
  creator?: string;
  date?: string;
  description?: string;
  mediaType: string;
  downloads?: number;
  subjects: string[];
  url: string;
  markdown: string;
};

export type InternetArchiveSearchResult = {
  success: boolean;
  query: string;
  total: number;
  items: InternetArchiveResultItem[];
  error?: string;
  markdown: string;
};

export const internetArchiveSearchTool = tool({
  description:
    "Search the Internet Archive for books, texts, audio, video, and more. " +
    "Access 40M+ scanned books and documents, audio recordings, videos, and software. " +
    "Use for: historical research, public domain books, archived websites, " +
    "primary sources, rare documents, historical recordings.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for Internet Archive items. Use keywords or phrases. " +
          "Examples: 'civil war letters', 'shakespeare first folio', " +
          "'1920s jazz recordings', 'vintage computer manuals'"
      ),
    mediaType: z
      .string()
      .optional()
      .describe(
        "Filter by media type. Options: 'texts', 'audio', 'movies', 'image', " +
          "'software', 'etree' (live concerts), 'collection', 'web'"
      ),
    collection: z
      .string()
      .optional()
      .describe(
        "Filter by collection. Examples: 'gutenberg' (Project Gutenberg), " +
          "'americana', 'librivoxaudio', 'prelinger' (Prelinger Archives)"
      ),
    year: z
      .string()
      .optional()
      .describe(
        "Filter by year or year range. Examples: '1950', '[1900 TO 1950]'"
      ),
    sort: z
      .string()
      .optional()
      .default("downloads desc")
      .describe(
        "Sort order. Options: 'downloads desc', 'date desc', 'date asc', " +
          "'title asc', 'createdate desc'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum items to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, mediaType, collection, year, sort, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build the search query
      let searchQuery = query;
      if (collection) {
        searchQuery += ` AND collection:${collection}`;
      }
      if (year) {
        searchQuery += ` AND year:${year}`;
      }

      const params = new URLSearchParams({
        q: searchQuery,
        output: "json",
        rows: searchLimit.toString(),
        page: "1",
        "fl[]":
          "identifier,title,description,creator,date,year,mediatype,collection,downloads,language,subject",
      });

      if (mediaType) {
        params.append("mediatype", mediaType);
      }

      if (sort) {
        params.append("sort", sort);
      }

      const response = await fetch(
        `${INTERNET_ARCHIVE_API_BASE}/advancedsearch.php?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Internet Archive API error: ${response.status}`);
      }

      const data = (await response.json()) as InternetArchiveSearchResponse;

      if (!data.response?.docs?.length) {
        return {
          success: true,
          query,
          total: 0,
          items: [],
          error: "No items found. Try different search terms.",
          markdown: `No Internet Archive items found for "${query}".`,
        } satisfies InternetArchiveSearchResult;
      }

      const items: InternetArchiveResultItem[] = data.response.docs.map(
        (item) => ({
          identifier: item.identifier,
          title: item.title,
          creator: normalizeStringOrArray(item.creator),
          date: item.date || item.year,
          description: truncateText(
            normalizeStringOrArray(item.description),
            MAX_DESCRIPTION_LENGTH
          ),
          mediaType: item.mediatype,
          downloads: item.downloads,
          subjects: normalizeArrayToString(item.subject).slice(0, 10),
          url: `https://archive.org/details/${item.identifier}`,
          markdown: `### [${item.title}](https://archive.org/details/${item.identifier})\n${normalizeStringOrArray(item.creator) ? `**Creator:** ${normalizeStringOrArray(item.creator)}\n` : ""}**Type:** ${item.mediatype} | ${item.date || item.year || "Date unknown"}${item.downloads ? ` | Downloads: ${item.downloads.toLocaleString()}` : ""}`,
        })
      );

      // Build markdown
      let markdown = `### Internet Archive: "${query}"\n\n`;
      markdown += `Found **${data.response.numFound.toLocaleString()}** items.\n\n`;

      for (const item of items.slice(0, 10)) {
        markdown += `**[${item.title}](${item.url})**\n`;
        if (item.creator) markdown += `By ${item.creator} | `;
        markdown += `${item.mediaType} | ${item.date || "Date unknown"}`;
        if (item.downloads)
          markdown += ` | ${item.downloads.toLocaleString()} downloads`;
        markdown += "\n\n";
      }

      markdown += "*Source: Internet Archive*";

      return {
        success: true,
        query,
        total: data.response.numFound,
        items,
        markdown,
      } satisfies InternetArchiveSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        items: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies InternetArchiveSearchResult;
    }
  },
});

// =============================================================================
// Tool: Library of Congress Search
// =============================================================================

export type LocResultItem = {
  id: string;
  title: string;
  contributors: string[];
  date?: string;
  subjects: string[];
  types: string[];
  description?: string;
  url: string;
  imageUrl?: string;
  formats: string[];
};

export type LocSearchResult = {
  success: boolean;
  query: string;
  total: number;
  items: LocResultItem[];
  error?: string;
  markdown: string;
};

export const locSearchTool = tool({
  description:
    "Search the Library of Congress digital collections. " +
    "Access millions of digitized items including books, photographs, maps, " +
    "manuscripts, newspapers, films, and audio recordings. " +
    "Use for: American history research, primary sources, historical photographs, " +
    "government documents, cultural heritage.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for Library of Congress collections. " +
          "Examples: 'civil rights movement photographs', 'Lincoln letters', " +
          "'World War II posters', 'jazz recordings 1920s'"
      ),
    format: z
      .string()
      .optional()
      .describe(
        "Filter by format. Options: 'photo,print,drawing', 'map', " +
          "'manuscript/mixed material', 'newspaper', 'audio', 'film,video'"
      ),
    dates: z
      .string()
      .optional()
      .describe("Filter by date range. Examples: '1800-1850', '1900/1950'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum items to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, format, dates, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        fo: "json",
        c: searchLimit.toString(),
      });

      if (format) {
        params.append("fa", `original_format:${format}`);
      }

      if (dates) {
        params.append("dates", dates);
      }

      const response = await fetch(
        `${LOC_API_BASE}/search/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Library of Congress API error: ${response.status}`);
      }

      const data = (await response.json()) as LocSearchResponse;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          items: [],
          error: "No items found. Try different search terms.",
          markdown: `No Library of Congress items found for "${query}".`,
        } satisfies LocSearchResult;
      }

      const items: LocResultItem[] = data.results.map((item) => ({
        id: item.id,
        title: item.title,
        contributors: item.contributor || [],
        date: item.date,
        subjects: item.subject || [],
        types: item.type || [],
        description: item.description
          ? truncateText(item.description[0], MAX_DESCRIPTION_LENGTH)
          : undefined,
        url: item.url || item.id,
        imageUrl: item.image_url?.[0],
        formats: item.online_format || [],
      }));

      // Build markdown
      let markdown = `### Library of Congress: "${query}"\n\n`;
      markdown += `Found **${data.pagination.total.toLocaleString()}** items.\n\n`;

      for (const item of items.slice(0, 10)) {
        markdown += `**[${item.title}](${item.url})**\n`;
        if (item.date) markdown += `Date: ${item.date} | `;
        if (item.types.length > 0) markdown += `Type: ${item.types[0]}`;
        markdown += "\n";
        if (item.subjects.length > 0) {
          markdown += `*${item.subjects.slice(0, 3).join(", ")}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Library of Congress*";

      return {
        success: true,
        query,
        total: data.pagination.total,
        items,
        markdown,
      } satisfies LocSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        items: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies LocSearchResult;
    }
  },
});

// =============================================================================
// Tool: Chronicling America (Historic Newspapers)
// =============================================================================

export type NewspaperPageItem = {
  id: string;
  title: string;
  date: string;
  edition?: string;
  page?: string;
  state?: string;
  city?: string;
  ocr?: string;
  url: string;
  pdfUrl?: string;
  jpgUrl?: string;
};

export type ChroniclingAmericaSearchResult = {
  success: boolean;
  query: string;
  total: number;
  pages: NewspaperPageItem[];
  error?: string;
  markdown: string;
};

export const chroniclingAmericaSearchTool = tool({
  description:
    "Search Chronicling America for historic American newspapers (1777-1963). " +
    "Full-text search across millions of digitized newspaper pages from the Library of Congress. " +
    "Use for: historical news coverage, primary sources, genealogy research, " +
    "understanding historical events through contemporary reporting.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for newspaper content. Use keywords or phrases. " +
          "Examples: 'titanic sinking', 'women suffrage', 'stock market crash 1929', " +
          "'Abraham Lincoln assassination'"
      ),
    state: z
      .string()
      .optional()
      .describe("Filter by state. Examples: 'New York', 'California', 'Texas'"),
    dateFrom: z
      .string()
      .optional()
      .describe("Start date in YYYY or YYYY-MM-DD format. Example: '1900'"),
    dateTo: z
      .string()
      .optional()
      .describe("End date in YYYY or YYYY-MM-DD format. Example: '1920'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum pages to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, state, dateFrom, dateTo, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        andtext: query,
        format: "json",
        rows: searchLimit.toString(),
        page: "1",
      });

      if (state) {
        params.append("state", state);
      }

      if (dateFrom) {
        // Convert to YYYYMMDD format
        const date = dateFrom.replace(/-/g, "").padEnd(8, "0");
        params.append("date1", date);
      }

      if (dateTo) {
        const date = dateTo.replace(/-/g, "").padEnd(8, "9");
        params.append("date2", date);
      }

      const response = await fetch(
        `https://chroniclingamerica.loc.gov/search/pages/results/?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Chronicling America API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        totalItems: number;
        items: Array<{
          id: string;
          title: string;
          date: string;
          edition?: number;
          page?: string;
          state?: string[];
          city?: string[];
          ocr_eng?: string;
          url: string;
          pdf?: string;
          jp2?: string;
        }>;
      };

      if (!data.items?.length) {
        return {
          success: true,
          query,
          total: 0,
          pages: [],
          error:
            "No newspaper pages found. Try different search terms or dates.",
          markdown: `No Chronicling America pages found for "${query}".`,
        } satisfies ChroniclingAmericaSearchResult;
      }

      const pages: NewspaperPageItem[] = data.items.map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        edition: item.edition?.toString(),
        page: item.page,
        state: item.state?.[0],
        city: item.city?.[0],
        ocr: item.ocr_eng ? truncateText(item.ocr_eng, 500) : undefined,
        url: item.url,
        pdfUrl: item.pdf,
        jpgUrl: item.jp2?.replace(".jp2", ".jpg"),
      }));

      // Build markdown
      let markdown = `### Chronicling America: "${query}"\n\n`;
      markdown += `Found **${data.totalItems.toLocaleString()}** newspaper pages.\n\n`;

      for (const page of pages.slice(0, 10)) {
        markdown += `**[${page.title}](${page.url})**\n`;
        markdown += `${page.date}`;
        if (page.state) markdown += ` | ${page.city || ""}, ${page.state}`;
        if (page.page) markdown += ` | Page ${page.page}`;
        markdown += "\n";
        if (page.ocr) {
          markdown += `> ${page.ocr}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Chronicling America (Library of Congress)*";

      return {
        success: true,
        query,
        total: data.totalItems,
        pages,
        markdown,
      } satisfies ChroniclingAmericaSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        pages: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ChroniclingAmericaSearchResult;
    }
  },
});

// =============================================================================
// Tool: Digital Public Library of America Search
// =============================================================================

export type DplaResultItem = {
  id: string;
  title: string;
  creators: string[];
  date?: string;
  description?: string;
  subjects: string[];
  types: string[];
  format?: string;
  dataProvider: string;
  url: string;
  thumbnailUrl?: string;
};

export type DplaSearchResult = {
  success: boolean;
  query: string;
  total: number;
  items: DplaResultItem[];
  error?: string;
  markdown: string;
};

export const dplaSearchTool = tool({
  description:
    "Search the Digital Public Library of America (DPLA) for cultural heritage items. " +
    "Access 47M+ photographs, books, maps, recordings, and more from US libraries and museums. " +
    "Use for: American cultural history, regional history, visual materials, " +
    "educational resources, primary sources.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for DPLA items. Use keywords or phrases. " +
          "Examples: 'Great Depression photographs', 'Native American artifacts', " +
          "'immigrant letters', 'civil war maps'"
      ),
    type: z
      .string()
      .optional()
      .describe(
        "Filter by type. Options: 'image', 'text', 'sound', 'moving image', " +
          "'physical object', 'collection', 'interactive resource'"
      ),
    provider: z
      .string()
      .optional()
      .describe(
        "Filter by data provider. Examples: 'Smithsonian Institution', " +
          "'New York Public Library', 'Internet Archive'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum items to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, type, provider, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        page_size: searchLimit.toString(),
        api_key: "0", // DPLA accepts any value for public access
      });

      if (type) {
        params.append("sourceResource.type", type);
      }

      if (provider) {
        params.append("dataProvider", provider);
      }

      const response = await fetch(
        `${DPLA_API_BASE}/items?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DPLA API error: ${response.status}`);
      }

      const data = (await response.json()) as DplaSearchResponse;

      if (!data.docs?.length) {
        return {
          success: true,
          query,
          total: 0,
          items: [],
          error: "No items found. Try different search terms.",
          markdown: `No DPLA items found for "${query}".`,
        } satisfies DplaSearchResult;
      }

      const items: DplaResultItem[] = data.docs.map((item) => ({
        id: item.id,
        title: normalizeStringOrArray(item.sourceResource.title),
        creators: normalizeArrayToString(item.sourceResource.creator),
        date: item.sourceResource.date?.displayDate,
        description: item.sourceResource.description
          ? truncateText(
              normalizeStringOrArray(item.sourceResource.description),
              MAX_DESCRIPTION_LENGTH
            )
          : undefined,
        subjects: (item.sourceResource.subject || []).map((s) => s.name),
        types: normalizeArrayToString(item.sourceResource.type),
        format: normalizeStringOrArray(item.sourceResource.format),
        dataProvider: item.dataProvider,
        url: item.isShownAt,
        thumbnailUrl: item.object,
      }));

      // Build markdown
      let markdown = `### DPLA Search: "${query}"\n\n`;
      markdown += `Found **${data.count.toLocaleString()}** items.\n\n`;

      for (const item of items.slice(0, 10)) {
        markdown += `**[${item.title}](${item.url})**\n`;
        if (item.creators.length > 0)
          markdown += `By ${item.creators.slice(0, 2).join(", ")} | `;
        if (item.date) markdown += `${item.date} | `;
        markdown += `${item.dataProvider}\n`;
        if (item.types.length > 0) markdown += `Type: ${item.types[0]}\n`;
        markdown += "\n";
      }

      markdown += "*Source: Digital Public Library of America*";

      return {
        success: true,
        query,
        total: data.count,
        items,
        markdown,
      } satisfies DplaSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        items: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DplaSearchResult;
    }
  },
});
