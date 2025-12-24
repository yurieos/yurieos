import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AcademicSearchResult,
  type ArxivSearchResult,
  academicSearchTool,
  arxivSearchTool,
  type OpenAlexSearchResult,
  openAlexSearchTool,
} from "../academic";

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("Academic Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("academicSearchTool (Semantic Scholar)", () => {
    it("should handle successful search results", async () => {
      const mockResponse = {
        total: 1,
        offset: 0,
        data: [
          {
            paperId: "123",
            title: "Test Paper",
            authors: [{ name: "Author One" }],
            year: 2023,
            abstract: "Test abstract",
            url: "https://example.com/paper",
            isOpenAccess: true,
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = (await academicSearchTool.execute!(
        { query: "test query", openAccessOnly: false, limit: 10 },
        {} as any
      )) as unknown as AcademicSearchResult;

      expect(result.success).toBe(true);
      expect(result.papers).toHaveLength(1);
      expect(result.papers[0].title).toBe("Test Paper");
      expect(result.papers[0].authors).toContain("Author One");
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("api.semanticscholar.org"),
        expect.objectContaining({ method: "GET" })
      );
    });

    it("should handle empty results gracefully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, data: [] }),
      });

      const result = (await academicSearchTool.execute!(
        { query: "empty query", openAccessOnly: false, limit: 10 },
        {} as any
      )) as unknown as AcademicSearchResult;

      expect(result.success).toBe(true);
      expect(result.papers).toEqual([]);
      expect(result.error).toBeDefined(); // Should have a friendly "no results" message
    });

    it("should handle API errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: async () => "Internal Server Error",
      });

      const result = (await academicSearchTool.execute!(
        { query: "error query", openAccessOnly: false, limit: 10 },
        {} as any
      )) as unknown as AcademicSearchResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Server Error");
    });
  });

  describe("arxivSearchTool (arXiv)", () => {
    const mockArxivXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>http://arxiv.org/abs/2106.09685</id>
          <title>LoRA: Low-Rank Adaptation of Large Language Models</title>
          <summary>We propose LoRA...</summary>
          <published>2021-06-17T17:57:53Z</published>
          <author>
            <name>Edward J. Hu</name>
          </author>
          <link title="pdf" href="http://arxiv.org/pdf/2106.09685v2" rel="related" type="application/pdf"/>
        </entry>
      </feed>
    `;

    it("should parse XML response correctly", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => mockArxivXml,
      });

      const result = (await arxivSearchTool.execute!(
        { query: "LoRA", sortBy: "relevance", limit: 10 },
        {} as any
      )) as unknown as ArxivSearchResult;

      expect(result.success).toBe(true);
      expect(result.papers).toHaveLength(1);
      const paper = result.papers[0];
      expect(paper.title).toContain("LoRA");
      expect(paper.authors).toContain("Edward J. Hu");
      expect(paper.pdfUrl).toContain("http://arxiv.org/pdf/2106.09685v2");
    });

    it("should handle search errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const result = (await arxivSearchTool.execute!(
        { query: "invalid", sortBy: "relevance", limit: 10 },
        {} as any
      )) as unknown as ArxivSearchResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Bad Request");
    });
  });

  describe("openAlexSearchTool (OpenAlex)", () => {
    it("should handle successful search", async () => {
      const mockResponse = {
        meta: { count: 1 },
        results: [
          {
            id: "https://openalex.org/W123",
            display_name: "Open Science",
            authorships: [{ author: { display_name: "Researcher A" } }],
            publication_year: 2024,
            cited_by_count: 10,
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = (await openAlexSearchTool.execute!(
        {
          query: "open science",
          sort: "relevance_score:desc",
          limit: 10,
        },
        {} as any
      )) as unknown as OpenAlexSearchResult;

      expect(result.success).toBe(true);
      expect(result.papers).toHaveLength(1);
      expect(result.papers[0].title).toBe("Open Science");
      expect(result.papers[0].year).toBe(2024);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("api.openalex.org"),
        expect.objectContaining({ method: "GET" })
      );
    });
  });
});
