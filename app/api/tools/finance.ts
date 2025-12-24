/**
 * Financial Data Tools
 *
 * Provides access to SEC EDGAR and company financial data:
 *
 * 1. SEC EDGAR - US Securities and Exchange Commission filings
 *    @see https://www.sec.gov/developer
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const SEC_EDGAR_API_BASE = "https://data.sec.gov";
const SEC_EFTS_API_BASE = "https://efts.sec.gov/LATEST/search-index";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

// =============================================================================
// Types
// =============================================================================

type SecCompanyInfo = {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  phone: string;
  flags: string;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
};

type SecSearchHit = {
  _id: string;
  _source: {
    ciks: string[];
    display_names: string[];
    file_date: string;
    file_num: string[];
    form: string;
    period_ending?: string;
    root_form: string;
    sequence?: number;
  };
};

type SecSearchResponse = {
  hits: {
    hits: SecSearchHit[];
    total: {
      value: number;
    };
  };
};

// =============================================================================
// Helpers
// =============================================================================

function formatCik(cik: string | number): string {
  return String(cik).padStart(10, "0");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatFilingMarkdown(
  form: string,
  filingDate: string,
  reportDate: string,
  description: string,
  url: string,
  companyName?: string
): string {
  const parts: string[] = [];

  parts.push(`### [${form}: ${description || "Filing"}](${url})`);

  if (companyName) {
    parts.push(`**Company:** ${companyName}`);
  }

  parts.push(
    `**Filed:** ${filingDate} | **Report Date:** ${reportDate || "N/A"}`
  );

  return parts.join("\n");
}

// =============================================================================
// Tool: Search SEC Filings
// =============================================================================

export type SecFilingItem = {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate?: string;
  description: string;
  companyName: string;
  cik: string;
  url: string;
  markdown: string;
};

export type SecFilingSearchResult = {
  success: boolean;
  query: string;
  total: number;
  filings: SecFilingItem[];
  error?: string;
  markdown: string;
};

export const secFilingSearchTool = tool({
  description:
    "Search SEC EDGAR for company filings (10-K, 10-Q, 8-K, etc.). " +
    "Access 20+ years of public company filings including annual reports, " +
    "quarterly reports, and material events. " +
    "Use for: corporate research, financial analysis, investor due diligence, " +
    "tracking company announcements, regulatory filings.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for SEC filings. Can be company name, ticker, or keywords. " +
          "Examples: 'Apple Inc', 'AAPL', 'Tesla annual report', 'Microsoft 10-K'"
      ),
    formType: z
      .string()
      .optional()
      .describe(
        "Filter by form type. Common forms: '10-K' (annual), '10-Q' (quarterly), " +
          "'8-K' (material events), 'DEF 14A' (proxy), 'S-1' (IPO). " +
          "Leave empty for all forms."
      ),
    dateFrom: z
      .string()
      .optional()
      .describe("Filter filings from this date (YYYY-MM-DD)."),
    dateTo: z
      .string()
      .optional()
      .describe("Filter filings to this date (YYYY-MM-DD)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum filings to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, formType, dateFrom, dateTo, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build the full-text search query
      const searchParams = new URLSearchParams({
        q: query,
        dateRange: "custom",
        startdt: dateFrom || "2000-01-01",
        enddt: dateTo || new Date().toISOString().split("T")[0],
        from: "0",
        size: searchLimit.toString(),
      });

      if (formType) {
        searchParams.append("forms", formType);
      }

      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0 (research@example.com)",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`SEC EDGAR API error: ${response.status}`);
      }

      const data = (await response.json()) as SecSearchResponse;

      if (!data.hits?.hits?.length) {
        return {
          success: true,
          query,
          total: 0,
          filings: [],
          error:
            "No SEC filings found. Try a different company name or ticker.",
          markdown: `No SEC filings found for "${query}".`,
        } satisfies SecFilingSearchResult;
      }

      const filings: SecFilingItem[] = data.hits.hits.map((hit) => {
        const source = hit._source;
        const cik = source.ciks[0] || "";
        const companyName = source.display_names[0] || "Unknown Company";
        const accessionNumber = hit._id.replace(/-/g, "");

        const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${source.form}&dateb=&owner=include&count=40`;

        return {
          accessionNumber: hit._id,
          form: source.form,
          filingDate: source.file_date,
          reportDate: source.period_ending,
          description: source.root_form || source.form,
          companyName,
          cik,
          url,
          markdown: formatFilingMarkdown(
            source.form,
            source.file_date,
            source.period_ending || "",
            source.root_form || source.form,
            url,
            companyName
          ),
        };
      });

      // Build markdown
      let markdown = `### SEC Filings: "${query}"\n\n`;
      markdown += `Found ${data.hits.total.value} filings.\n\n`;

      for (const filing of filings.slice(0, 15)) {
        markdown += `**${filing.form}** - ${filing.companyName}\n`;
        markdown += `Filed: ${filing.filingDate}`;
        if (filing.reportDate) {
          markdown += ` | Period: ${filing.reportDate}`;
        }
        markdown += `\n[View Filing](${filing.url})\n\n`;
      }

      markdown += "*Source: SEC EDGAR*";

      return {
        success: true,
        query,
        total: data.hits.total.value,
        filings,
        markdown,
      } satisfies SecFilingSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        filings: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies SecFilingSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Company Filings by CIK/Ticker
// =============================================================================

export type CompanyFilingsResult = {
  success: boolean;
  identifier: string;
  company?: {
    cik: string;
    name: string;
    tickers: string[];
    sic: string;
    sicDescription: string;
    stateOfIncorporation: string;
    fiscalYearEnd: string;
    category: string;
  };
  recentFilings: SecFilingItem[];
  error?: string;
  markdown: string;
};

export const getCompanyFilingsTool = tool({
  description:
    "Get recent SEC filings for a specific company by CIK number or ticker symbol. " +
    "Returns company information and list of recent filings. " +
    "Use for: tracking specific company filings, corporate research.",
  inputSchema: z.object({
    identifier: z
      .string()
      .min(1)
      .describe(
        "Company CIK number or ticker symbol. " +
          "Examples: 'AAPL', 'MSFT', '0000320193' (Apple's CIK)"
      ),
    formType: z
      .string()
      .optional()
      .describe("Filter by form type. Examples: '10-K', '10-Q', '8-K'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum filings to return (1-50)."),
  }),
  execute: async ({ identifier, formType, limit }) => {
    try {
      const searchLimit = limit ?? 10;

      // First, try to look up the CIK if it's a ticker
      let cik = identifier;

      // If it looks like a ticker (short, all letters), look up the CIK
      if (identifier.length <= 5 && /^[A-Za-z]+$/.test(identifier)) {
        const tickerResponse = await fetch(
          `${SEC_EDGAR_API_BASE}/submissions/CIK${formatCik("0")}.json`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent":
                "Yurie Research Assistant/1.0 (research@example.com)",
            },
          }
        );

        // For now, we'll use the search endpoint to find the company
        const searchResponse = await fetch(
          `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(identifier)}&size=1`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent":
                "Yurie Research Assistant/1.0 (research@example.com)",
            },
          }
        );

        if (searchResponse.ok) {
          const searchData = (await searchResponse.json()) as SecSearchResponse;
          if (searchData.hits?.hits?.length > 0) {
            cik = searchData.hits.hits[0]._source.ciks[0] || identifier;
          }
        }
      }

      // Clean and format CIK
      const cleanCik = formatCik(cik.replace(/\D/g, ""));

      const response = await fetch(
        `${SEC_EDGAR_API_BASE}/submissions/CIK${cleanCik}.json`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0 (research@example.com)",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            identifier,
            recentFilings: [],
            error: `Company not found: ${identifier}`,
            markdown: `Company not found for "${identifier}".`,
          } satisfies CompanyFilingsResult;
        }
        throw new Error(`SEC EDGAR API error: ${response.status}`);
      }

      const data = (await response.json()) as SecCompanyInfo;

      const company = {
        cik: data.cik,
        name: data.name,
        tickers: data.tickers || [],
        sic: data.sic,
        sicDescription: data.sicDescription,
        stateOfIncorporation: data.stateOfIncorporation,
        fiscalYearEnd: data.fiscalYearEnd,
        category: data.category,
      };

      // Process recent filings
      const recentFilings: SecFilingItem[] = [];
      const filingData = data.filings.recent;

      for (
        let i = 0;
        i < Math.min(filingData.form.length, searchLimit * 2);
        i++
      ) {
        const form = filingData.form[i];

        // Filter by form type if specified
        if (formType && !form.toLowerCase().includes(formType.toLowerCase())) {
          continue;
        }

        if (recentFilings.length >= searchLimit) break;

        const accessionNumber = filingData.accessionNumber[i];
        const formattedAccession = accessionNumber.replace(/-/g, "");

        const url = `https://www.sec.gov/Archives/edgar/data/${data.cik}/${formattedAccession}/${filingData.primaryDocument[i]}`;

        recentFilings.push({
          accessionNumber,
          form,
          filingDate: filingData.filingDate[i],
          reportDate: filingData.reportDate[i],
          description: filingData.primaryDocDescription[i] || form,
          companyName: data.name,
          cik: data.cik,
          url,
          markdown: formatFilingMarkdown(
            form,
            filingData.filingDate[i],
            filingData.reportDate[i],
            filingData.primaryDocDescription[i] || form,
            url,
            data.name
          ),
        });
      }

      // Build markdown
      let markdown = `### ${company.name}\n\n`;
      markdown += `**CIK:** ${company.cik}`;
      if (company.tickers.length > 0) {
        markdown += ` | **Ticker(s):** ${company.tickers.join(", ")}`;
      }
      markdown += "\n";
      markdown += `**Industry:** ${company.sicDescription} (SIC: ${company.sic})\n`;
      markdown += `**State:** ${company.stateOfIncorporation} | **Fiscal Year End:** ${company.fiscalYearEnd}\n\n`;

      markdown += "#### Recent Filings\n\n";
      for (const filing of recentFilings.slice(0, 10)) {
        markdown += `- **${filing.form}** (${filing.filingDate}) - ${filing.description}\n`;
      }

      markdown += "\n*Source: SEC EDGAR*";

      return {
        success: true,
        identifier,
        company,
        recentFilings,
        markdown,
      } satisfies CompanyFilingsResult;
    } catch (error) {
      return {
        success: false,
        identifier,
        recentFilings: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies CompanyFilingsResult;
    }
  },
});
