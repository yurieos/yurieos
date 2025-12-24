/**
 * Economics & Financial Data Tools
 *
 * Provides access to economic and financial data sources:
 *
 * 1. FRED (Federal Reserve Economic Data) - 800K+ economic data series
 *    @see https://fred.stlouisfed.org/docs/api/fred/
 *
 * API key is optional but recommended for higher rate limits.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const FRED_API_BASE = "https://api.stlouisfed.org/fred";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type FredSeriesObservation = {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
};

type FredSeriesInfo = {
  id: string;
  realtime_start: string;
  realtime_end: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  frequency_short: string;
  units: string;
  units_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  popularity: number;
  notes?: string;
};

type FredSeriesSearchResult = {
  id: string;
  title: string;
  frequency: string;
  units: string;
  seasonal_adjustment: string;
  observation_start: string;
  observation_end: string;
  popularity: number;
  notes?: string;
};

type FredObservationsResponse = {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredSeriesObservation[];
};

type FredSeriesResponse = {
  realtime_start: string;
  realtime_end: string;
  seriess: FredSeriesInfo[];
};

type FredSearchResponse = {
  realtime_start: string;
  realtime_end: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  seriess: FredSeriesSearchResult[];
};

// =============================================================================
// Popular Series Reference
// =============================================================================

const POPULAR_SERIES: Record<string, { id: string; name: string }> = {
  gdp: { id: "GDP", name: "Gross Domestic Product" },
  real_gdp: { id: "GDPC1", name: "Real Gross Domestic Product" },
  gdp_growth: { id: "A191RL1Q225SBEA", name: "Real GDP Growth Rate" },
  unemployment: { id: "UNRATE", name: "Unemployment Rate" },
  inflation: { id: "CPIAUCSL", name: "Consumer Price Index" },
  core_inflation: { id: "CPILFESL", name: "Core CPI (Less Food & Energy)" },
  fed_funds: { id: "FEDFUNDS", name: "Federal Funds Rate" },
  prime_rate: { id: "DPRIME", name: "Prime Rate" },
  treasury_10y: { id: "DGS10", name: "10-Year Treasury Rate" },
  treasury_2y: { id: "DGS2", name: "2-Year Treasury Rate" },
  sp500: { id: "SP500", name: "S&P 500 Index" },
  housing_starts: { id: "HOUST", name: "Housing Starts" },
  industrial_production: { id: "INDPRO", name: "Industrial Production Index" },
  retail_sales: { id: "RSXFS", name: "Retail Sales" },
  personal_income: { id: "PI", name: "Personal Income" },
  consumer_sentiment: { id: "UMCSENT", name: "Consumer Sentiment" },
  money_supply_m2: { id: "M2SL", name: "M2 Money Supply" },
  labor_force: { id: "CLF16OV", name: "Civilian Labor Force" },
  payrolls: { id: "PAYEMS", name: "Total Nonfarm Payrolls" },
  initial_claims: { id: "ICSA", name: "Initial Jobless Claims" },
};

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string | undefined {
  return process.env.FRED_API_KEY;
}

function resolveSeriesId(input: string): string {
  const lower = input.toLowerCase().replaceAll(/[\s-]/g, "_");
  if (POPULAR_SERIES[lower]) {
    return POPULAR_SERIES[lower].id;
  }
  return input.toUpperCase();
}

function formatValue(value: string): string {
  if (value === ".") {
    return "N/A";
  }
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) {
    return value;
  }
  if (Math.abs(num) >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString();
  }
  return num.toFixed(2);
}

async function fredRequest<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "FRED API requires an API key. Get one free at https://fred.stlouisfed.org/docs/api/api_key.html and set FRED_API_KEY."
    );
  }

  const url = new URL(`${FRED_API_BASE}${endpoint}`);
  url.searchParams.append("api_key", apiKey);
  url.searchParams.append("file_type", "json");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `FRED API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Tool: Get FRED Series Data
// =============================================================================

export type FredDataPoint = {
  date: string;
  value: string;
  formattedValue: string;
};

export type FredSeriesDataResult = {
  success: boolean;
  seriesId: string;
  title?: string;
  units?: string;
  frequency?: string;
  data: FredDataPoint[];
  total: number;
  error?: string;
  markdown: string;
};

export const fredSeriesDataTool = tool({
  description:
    "Get economic data from FRED (Federal Reserve Economic Data). " +
    "Access 800,000+ time series including GDP, inflation, unemployment, interest rates, and more. " +
    "Use shortcuts: 'gdp', 'unemployment', 'inflation', 'fed_funds', 'treasury_10y', 'sp500', " +
    "'housing_starts', 'payrolls', 'consumer_sentiment', 'money_supply_m2'. " +
    "Or use exact FRED series IDs like 'GDP', 'UNRATE', 'CPIAUCSL'.",
  inputSchema: z.object({
    seriesId: z
      .string()
      .min(1)
      .describe(
        "FRED series ID or shortcut. Shortcuts: 'gdp', 'unemployment', 'inflation', " +
          "'fed_funds', 'treasury_10y', 'sp500'. Or exact IDs like 'GDP', 'UNRATE'."
      ),
    startDate: z
      .string()
      .optional()
      .describe("Start date in YYYY-MM-DD format. Default: 1 year ago."),
    endDate: z
      .string()
      .optional()
      .describe("End date in YYYY-MM-DD format. Default: today."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(20)
      .describe("Maximum observations to return (1-100). Default: 20."),
  }),
  execute: async ({ seriesId, startDate, endDate, limit }) => {
    try {
      const resolvedId = resolveSeriesId(seriesId);
      const searchLimit = Math.min(limit ?? 20, MAX_RESULTS_LIMIT);

      // Calculate default dates
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const start = startDate ?? oneYearAgo.toISOString().split("T")[0];
      const end = endDate ?? now.toISOString().split("T")[0];

      // Get series info first
      const seriesInfo = await fredRequest<FredSeriesResponse>("/series", {
        series_id: resolvedId,
      });

      const info = seriesInfo.seriess[0];

      // Get observations
      const observations = await fredRequest<FredObservationsResponse>(
        "/series/observations",
        {
          series_id: resolvedId,
          observation_start: start,
          observation_end: end,
          sort_order: "desc",
          limit: searchLimit.toString(),
        }
      );

      if (!observations.observations?.length) {
        return {
          success: false,
          seriesId: resolvedId,
          data: [],
          total: 0,
          error: "No data available for this series and date range.",
          markdown: `No data found for ${resolvedId} between ${start} and ${end}.`,
        } satisfies FredSeriesDataResult;
      }

      const data: FredDataPoint[] = observations.observations.map((obs) => ({
        date: obs.date,
        value: obs.value,
        formattedValue: formatValue(obs.value),
      }));

      // Build markdown
      let markdown = `### ${info?.title || resolvedId}\n\n`;
      markdown += `**Series ID:** ${resolvedId}\n`;
      if (info?.units) {
        markdown += `**Units:** ${info.units}\n`;
      }
      if (info?.frequency) {
        markdown += `**Frequency:** ${info.frequency}\n`;
      }
      markdown += `**Period:** ${start} to ${end}\n\n`;

      markdown += "| Date | Value |\n";
      markdown += "|------|-------|\n";
      for (const d of data.slice(0, 20)) {
        markdown += `| ${d.date} | ${d.formattedValue} |\n`;
      }
      if (data.length > 20) {
        markdown += `\n*... and ${data.length - 20} more observations*`;
      }

      markdown += "\n\n*Source: Federal Reserve Economic Data (FRED)*";

      return {
        success: true,
        seriesId: resolvedId,
        title: info?.title,
        units: info?.units,
        frequency: info?.frequency,
        data,
        total: observations.count,
        markdown,
      } satisfies FredSeriesDataResult;
    } catch (error) {
      return {
        success: false,
        seriesId,
        data: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error fetching FRED data: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies FredSeriesDataResult;
    }
  },
});

// =============================================================================
// Tool: Search FRED Series
// =============================================================================

export type FredSearchResultItem = {
  id: string;
  title: string;
  frequency: string;
  units: string;
  seasonalAdjustment: string;
  observationStart: string;
  observationEnd: string;
  popularity: number;
};

export type FredSearchResult = {
  success: boolean;
  query: string;
  total: number;
  series: FredSearchResultItem[];
  error?: string;
  markdown: string;
};

export const fredSearchTool = tool({
  description:
    "Search FRED for economic data series by keyword. " +
    "Find the right series ID for topics like GDP, employment, housing, etc. " +
    "Use this to discover available data before fetching specific series.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for FRED series. Examples: 'unemployment rate', " +
          "'consumer price index', 'housing prices', 'interest rate'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const response = await fredRequest<FredSearchResponse>("/series/search", {
        search_text: query,
        limit: searchLimit.toString(),
        order_by: "popularity",
        sort_order: "desc",
      });

      if (!response.seriess?.length) {
        return {
          success: true,
          query,
          total: 0,
          series: [],
          error: "No FRED series found for this query.",
          markdown: `No series found for "${query}".`,
        } satisfies FredSearchResult;
      }

      const series: FredSearchResultItem[] = response.seriess.map((s) => ({
        id: s.id,
        title: s.title,
        frequency: s.frequency,
        units: s.units,
        seasonalAdjustment: s.seasonal_adjustment,
        observationStart: s.observation_start,
        observationEnd: s.observation_end,
        popularity: s.popularity,
      }));

      // Build markdown
      let markdown = `### FRED Series: "${query}"\n\n`;
      markdown += `Found ${response.count} series.\n\n`;

      for (const s of series) {
        markdown += `**${s.title}**\n`;
        markdown += `- ID: \`${s.id}\`\n`;
        markdown += `- Frequency: ${s.frequency} | Units: ${s.units}\n`;
        markdown += `- Data: ${s.observationStart} to ${s.observationEnd}\n`;
        markdown += "\n";
      }

      markdown += "*Source: Federal Reserve Economic Data (FRED)*";

      return {
        success: true,
        query,
        total: response.count,
        series,
        markdown,
      } satisfies FredSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        series: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error searching FRED: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies FredSearchResult;
    }
  },
});
