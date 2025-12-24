/**
 * Open Library Books API Tools
 *
 * Provides access to the Open Library book database:
 *
 * 1. Open Library - 20M+ book records
 *    @see https://openlibrary.org/developers/api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const OPENLIBRARY_API_BASE = "https://openlibrary.org";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type OpenLibraryAuthor = {
  key: string;
  name?: string;
};

type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  publisher?: string[];
  isbn?: string[];
  language?: string[];
  subject?: string[];
  cover_i?: number;
  edition_count?: number;
  number_of_pages_median?: number;
  first_sentence?: string[];
  ratings_average?: number;
  ratings_count?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
};

type OpenLibrarySearchResponse = {
  numFound: number;
  start: number;
  docs: OpenLibraryDoc[];
};

type OpenLibraryWork = {
  key: string;
  title: string;
  authors?: Array<{ author: { key: string } }>;
  description?: string | { value: string };
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  subject_people?: string[];
  first_publish_date?: string;
  covers?: number[];
  links?: Array<{ title: string; url: string }>;
  excerpts?: Array<{ excerpt: string; comment?: string }>;
};

type OpenLibraryAuthorDetails = {
  key: string;
  name: string;
  birth_date?: string;
  death_date?: string;
  bio?: string | { value: string };
  wikipedia?: string;
  links?: Array<{ title: string; url: string }>;
  photos?: number[];
  alternate_names?: string[];
  personal_name?: string;
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function getCoverUrl(coverId: number, size: "S" | "M" | "L" = "M"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

function extractDescription(
  desc: string | { value: string } | undefined
): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  return desc.value || "";
}

function formatBookMarkdown(doc: OpenLibraryDoc): string {
  const parts: string[] = [];

  // Title with link
  const workKey = doc.key;
  const url = `${OPENLIBRARY_API_BASE}${workKey}`;
  parts.push(`### [${truncateText(doc.title, 150)}](${url})`);

  // Cover image (if available)
  if (doc.cover_i) {
    parts.push(`![Cover](${getCoverUrl(doc.cover_i, "M")})`);
  }

  // Authors
  if (doc.author_name && doc.author_name.length > 0) {
    const authorList =
      doc.author_name.length > 3
        ? `${doc.author_name.slice(0, 3).join(", ")} et al.`
        : doc.author_name.join(", ");
    parts.push(`**Authors:** ${authorList}`);
  }

  // Publication details
  const details: string[] = [];
  if (doc.first_publish_year) {
    details.push(`**First Published:** ${doc.first_publish_year}`);
  }
  if (doc.edition_count) {
    details.push(`**Editions:** ${doc.edition_count.toLocaleString()}`);
  }
  if (doc.number_of_pages_median) {
    details.push(`**Pages:** ~${doc.number_of_pages_median}`);
  }
  if (details.length > 0) {
    parts.push(details.join(" | "));
  }

  // Publishers
  if (doc.publisher && doc.publisher.length > 0) {
    const publishers = doc.publisher.slice(0, 3).join(", ");
    parts.push(`**Publishers:** ${publishers}`);
  }

  // Subjects
  if (doc.subject && doc.subject.length > 0) {
    const subjects = doc.subject.slice(0, 5).join(", ");
    parts.push(`**Subjects:** ${subjects}`);
  }

  // First sentence
  if (doc.first_sentence && doc.first_sentence.length > 0) {
    parts.push(`*"${truncateText(doc.first_sentence[0], 200)}"*`);
  }

  // Ratings
  if (doc.ratings_average && doc.ratings_count) {
    parts.push(
      `**Rating:** ${doc.ratings_average.toFixed(1)}/5 (${doc.ratings_count.toLocaleString()} ratings)`
    );
  }

  // Reading stats
  const readingStats: string[] = [];
  if (doc.want_to_read_count)
    readingStats.push(
      `Want to read: ${doc.want_to_read_count.toLocaleString()}`
    );
  if (doc.currently_reading_count)
    readingStats.push(
      `Reading: ${doc.currently_reading_count.toLocaleString()}`
    );
  if (doc.already_read_count)
    readingStats.push(`Read: ${doc.already_read_count.toLocaleString()}`);
  if (readingStats.length > 0) {
    parts.push(`📚 ${readingStats.join(" | ")}`);
  }

  // ISBN
  if (doc.isbn && doc.isbn.length > 0) {
    parts.push(`**ISBN:** ${doc.isbn[0]}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Books
// =============================================================================

export type OpenLibraryBookItem = {
  key: string;
  title: string;
  authors: string[];
  firstPublishYear?: number;
  editionCount?: number;
  coverUrl?: string;
  subjects: string[];
  isbn?: string;
  url: string;
  ratingsAverage?: number;
  ratingsCount?: number;
};

export type BookSearchResult = {
  success: boolean;
  query: string;
  total: number;
  books: OpenLibraryBookItem[];
  error?: string;
  markdown: string;
};

export const bookSearchTool = tool({
  description:
    "Search Open Library for books by title, author, or subject. " +
    "Open Library has 20M+ book records including editions, authors, and covers. " +
    "Use for: finding books, getting publication info, ISBNs, and cover images.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for books. Can include title, author, or subject. " +
          "Examples: 'The Great Gatsby', 'author:Hemingway', 'subject:machine learning'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum books to return (1-${MAX_RESULTS_LIMIT}).`),
    sort: z
      .enum(["relevance", "new", "rating"])
      .optional()
      .default("relevance")
      .describe(
        "Sort order: 'relevance' (default), 'new' (newest first), 'rating' (best rated)."
      ),
  }),
  execute: async ({ query, limit, sort }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        limit: searchLimit.toString(),
        fields:
          "key,title,author_name,author_key,first_publish_year,publisher,isbn,subject," +
          "cover_i,edition_count,number_of_pages_median,first_sentence,ratings_average," +
          "ratings_count,want_to_read_count,currently_reading_count,already_read_count",
      });

      if (sort === "new") {
        params.set("sort", "new");
      } else if (sort === "rating") {
        params.set("sort", "rating");
      }

      const response = await fetch(
        `${OPENLIBRARY_API_BASE}/search.json?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenLibrarySearchResponse;

      if (!data.docs?.length) {
        return {
          success: true,
          query,
          total: 0,
          books: [],
          error: "No books found. Try different search terms.",
          markdown: `No books found for "${query}".`,
        } satisfies BookSearchResult;
      }

      const books: OpenLibraryBookItem[] = data.docs.map((doc) => ({
        key: doc.key,
        title: doc.title,
        authors: doc.author_name || [],
        firstPublishYear: doc.first_publish_year,
        editionCount: doc.edition_count,
        coverUrl: doc.cover_i ? getCoverUrl(doc.cover_i, "M") : undefined,
        subjects: doc.subject?.slice(0, 10) || [],
        isbn: doc.isbn?.[0],
        url: `${OPENLIBRARY_API_BASE}${doc.key}`,
        ratingsAverage: doc.ratings_average,
        ratingsCount: doc.ratings_count,
      }));

      // Build markdown
      let markdown = `### Open Library Search: "${query}"\n\n`;
      markdown += `Found ${data.numFound.toLocaleString()} books (showing ${books.length}).\n\n`;

      for (const doc of data.docs) {
        markdown += formatBookMarkdown(doc) + "\n\n---\n\n";
      }

      markdown += "*Source: Open Library*";

      return {
        success: true,
        query,
        total: data.numFound,
        books,
        markdown,
      } satisfies BookSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        books: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies BookSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Book Details
// =============================================================================

export type BookDetailsResult = {
  success: boolean;
  key: string;
  book?: {
    key: string;
    title: string;
    authors: Array<{ key: string; name?: string }>;
    description: string;
    subjects: string[];
    firstPublishDate?: string;
    coverUrl?: string;
    links: Array<{ title: string; url: string }>;
    excerpts: Array<{ excerpt: string; comment?: string }>;
    url: string;
    markdown: string;
  };
  error?: string;
};

export const getBookDetailsTool = tool({
  description:
    "Get detailed information about a book from Open Library by its work key. " +
    "Returns full description, subjects, excerpts, and related links. " +
    "Use after searching to get complete book details.",
  inputSchema: z.object({
    workKey: z
      .string()
      .min(1)
      .describe(
        "Open Library work key (starts with /works/). " +
          "Example: '/works/OL45883W' (The Hitchhiker's Guide to the Galaxy)"
      ),
  }),
  execute: async ({ workKey }) => {
    try {
      // Normalize the key
      const key = workKey.startsWith("/works/") ? workKey : `/works/${workKey}`;

      const response = await fetch(`${OPENLIBRARY_API_BASE}${key}.json`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenLibraryWork;

      // Build author list with details
      const authorPromises = (data.authors || []).map(async (a) => {
        try {
          const authorRes = await fetch(
            `${OPENLIBRARY_API_BASE}${a.author.key}.json`
          );
          if (authorRes.ok) {
            const authorData =
              (await authorRes.json()) as OpenLibraryAuthorDetails;
            return { key: a.author.key, name: authorData.name };
          }
        } catch {
          // Ignore author fetch errors
        }
        return { key: a.author.key };
      });

      const authors = await Promise.all(authorPromises);

      const description = extractDescription(data.description);

      const book = {
        key: data.key,
        title: data.title,
        authors,
        description,
        subjects: data.subjects || [],
        firstPublishDate: data.first_publish_date,
        coverUrl: data.covers?.[0]
          ? getCoverUrl(data.covers[0], "L")
          : undefined,
        links: data.links || [],
        excerpts: data.excerpts || [],
        url: `${OPENLIBRARY_API_BASE}${data.key}`,
        markdown: "",
      };

      // Build markdown
      const parts: string[] = [];
      parts.push(`### [${data.title}](${book.url})`);

      if (book.coverUrl) {
        parts.push(`![Cover](${book.coverUrl})`);
      }

      if (authors.length > 0) {
        const authorNames = authors.map((a) => a.name || a.key).join(", ");
        parts.push(`**Authors:** ${authorNames}`);
      }

      if (data.first_publish_date) {
        parts.push(`**First Published:** ${data.first_publish_date}`);
      }

      if (description) {
        parts.push(`\n**Description:**\n${truncateText(description, 1000)}`);
      }

      if (data.subjects && data.subjects.length > 0) {
        parts.push(`\n**Subjects:** ${data.subjects.slice(0, 10).join(", ")}`);
      }

      if (data.subject_people && data.subject_people.length > 0) {
        parts.push(`**People:** ${data.subject_people.slice(0, 5).join(", ")}`);
      }

      if (data.subject_places && data.subject_places.length > 0) {
        parts.push(`**Places:** ${data.subject_places.slice(0, 5).join(", ")}`);
      }

      if (data.subject_times && data.subject_times.length > 0) {
        parts.push(
          `**Time Periods:** ${data.subject_times.slice(0, 5).join(", ")}`
        );
      }

      if (data.excerpts && data.excerpts.length > 0) {
        parts.push(
          `\n**Excerpt:**\n*"${truncateText(data.excerpts[0].excerpt, 500)}"*`
        );
      }

      if (data.links && data.links.length > 0) {
        const linkList = data.links
          .slice(0, 5)
          .map((l) => `[${l.title}](${l.url})`)
          .join(" | ");
        parts.push(`\n**Links:** ${linkList}`);
      }

      parts.push("\n*Source: Open Library*");

      book.markdown = parts.join("\n");

      return {
        success: true,
        key,
        book,
      } satisfies BookDetailsResult;
    } catch (error) {
      return {
        success: false,
        key: workKey,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies BookDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Get Author Details
// =============================================================================

export type AuthorDetailsResult = {
  success: boolean;
  key: string;
  author?: {
    key: string;
    name: string;
    birthDate?: string;
    deathDate?: string;
    bio: string;
    wikipediaUrl?: string;
    photoUrl?: string;
    alternateNames: string[];
    links: Array<{ title: string; url: string }>;
    url: string;
    markdown: string;
  };
  error?: string;
};

export const getAuthorDetailsTool = tool({
  description:
    "Get detailed information about an author from Open Library. " +
    "Returns biography, dates, photo, and related links. " +
    "Use author keys from book search results.",
  inputSchema: z.object({
    authorKey: z
      .string()
      .min(1)
      .describe(
        "Open Library author key (starts with /authors/). " +
          "Example: '/authors/OL23919A' (J.K. Rowling)"
      ),
  }),
  execute: async ({ authorKey }) => {
    try {
      // Normalize the key
      const key = authorKey.startsWith("/authors/")
        ? authorKey
        : `/authors/${authorKey}`;

      const response = await fetch(`${OPENLIBRARY_API_BASE}${key}.json`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Open Library API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenLibraryAuthorDetails;

      const bio = extractDescription(data.bio);

      const author = {
        key: data.key,
        name: data.name,
        birthDate: data.birth_date,
        deathDate: data.death_date,
        bio,
        wikipediaUrl: data.wikipedia,
        photoUrl: data.photos?.[0]
          ? `https://covers.openlibrary.org/a/id/${data.photos[0]}-L.jpg`
          : undefined,
        alternateNames: data.alternate_names || [],
        links: data.links || [],
        url: `${OPENLIBRARY_API_BASE}${data.key}`,
        markdown: "",
      };

      // Build markdown
      const parts: string[] = [];
      parts.push(`### [${data.name}](${author.url})`);

      if (author.photoUrl) {
        parts.push(`![Photo](${author.photoUrl})`);
      }

      // Dates
      const dates: string[] = [];
      if (data.birth_date) dates.push(`Born: ${data.birth_date}`);
      if (data.death_date) dates.push(`Died: ${data.death_date}`);
      if (dates.length > 0) {
        parts.push(`**${dates.join(" | ")}**`);
      }

      if (data.alternate_names && data.alternate_names.length > 0) {
        parts.push(
          `*Also known as:* ${data.alternate_names.slice(0, 5).join(", ")}`
        );
      }

      if (bio) {
        parts.push(`\n**Biography:**\n${truncateText(bio, 1000)}`);
      }

      // Links
      const linkList: string[] = [];
      if (data.wikipedia) {
        linkList.push(`[Wikipedia](${data.wikipedia})`);
      }
      if (data.links) {
        for (const link of data.links.slice(0, 4)) {
          linkList.push(`[${link.title}](${link.url})`);
        }
      }
      if (linkList.length > 0) {
        parts.push(`\n**Links:** ${linkList.join(" | ")}`);
      }

      parts.push("\n*Source: Open Library*");

      author.markdown = parts.join("\n");

      return {
        success: true,
        key,
        author,
      } satisfies AuthorDetailsResult;
    } catch (error) {
      return {
        success: false,
        key: authorKey,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies AuthorDetailsResult;
    }
  },
});

// =============================================================================
// Tool: ISBN Lookup
// =============================================================================

export type IsbnLookupResult = {
  success: boolean;
  isbn: string;
  book?: {
    title: string;
    authors: string[];
    publishers: string[];
    publishDate?: string;
    numberOfPages?: number;
    coverUrl?: string;
    subjects: string[];
    workKey?: string;
    url: string;
    markdown: string;
  };
  error?: string;
};

export const isbnLookupTool = tool({
  description:
    "Look up a book by ISBN (10 or 13 digit). " +
    "Returns book details including title, authors, publisher, and cover. " +
    "Use when you have a specific ISBN to look up.",
  inputSchema: z.object({
    isbn: z
      .string()
      .min(10)
      .max(13)
      .describe(
        "ISBN-10 or ISBN-13 (with or without hyphens). Example: '9780140449136'"
      ),
  }),
  execute: async ({ isbn }) => {
    try {
      // Remove hyphens
      const cleanIsbn = isbn.replace(/-/g, "");

      const response = await fetch(
        `${OPENLIBRARY_API_BASE}/isbn/${cleanIsbn}.json`,
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
            isbn: cleanIsbn,
            error: `No book found for ISBN ${cleanIsbn}.`,
          } satisfies IsbnLookupResult;
        }
        throw new Error(`Open Library API error: ${response.status}`);
      }

      const data = await response.json();

      // Fetch author names
      const authorNames: string[] = [];
      if (data.authors) {
        for (const author of data.authors.slice(0, 5)) {
          try {
            const authorRes = await fetch(
              `${OPENLIBRARY_API_BASE}${author.key}.json`
            );
            if (authorRes.ok) {
              const authorData =
                (await authorRes.json()) as OpenLibraryAuthorDetails;
              authorNames.push(authorData.name);
            }
          } catch {
            // Ignore author fetch errors
          }
        }
      }

      const book = {
        title: data.title,
        authors: authorNames,
        publishers: data.publishers || [],
        publishDate: data.publish_date,
        numberOfPages: data.number_of_pages,
        coverUrl: data.covers?.[0]
          ? getCoverUrl(data.covers[0], "M")
          : undefined,
        subjects: data.subjects || [],
        workKey: data.works?.[0]?.key,
        url: `${OPENLIBRARY_API_BASE}/isbn/${cleanIsbn}`,
        markdown: "",
      };

      // Build markdown
      const parts: string[] = [];
      parts.push(`### [${data.title}](${book.url})`);

      if (book.coverUrl) {
        parts.push(`![Cover](${book.coverUrl})`);
      }

      parts.push(`**ISBN:** ${cleanIsbn}`);

      if (authorNames.length > 0) {
        parts.push(`**Authors:** ${authorNames.join(", ")}`);
      }

      if (book.publishers.length > 0) {
        parts.push(`**Publisher:** ${book.publishers[0]}`);
      }

      if (book.publishDate) {
        parts.push(`**Published:** ${book.publishDate}`);
      }

      if (book.numberOfPages) {
        parts.push(`**Pages:** ${book.numberOfPages}`);
      }

      if (book.subjects.length > 0) {
        parts.push(`**Subjects:** ${book.subjects.slice(0, 5).join(", ")}`);
      }

      if (book.workKey) {
        parts.push(`📚 [View Work](${OPENLIBRARY_API_BASE}${book.workKey})`);
      }

      parts.push("\n*Source: Open Library*");

      book.markdown = parts.join("\n");

      return {
        success: true,
        isbn: cleanIsbn,
        book,
      } satisfies IsbnLookupResult;
    } catch (error) {
      return {
        success: false,
        isbn,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies IsbnLookupResult;
    }
  },
});
