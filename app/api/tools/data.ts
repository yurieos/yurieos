/**
 * Global Data and Statistics Tools
 *
 * Provides access to structured data sources:
 *
 * 1. World Bank Open Data - Global development indicators for 200+ countries
 *    @see https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const WORLD_BANK_API_BASE = "https://api.worldbank.org/v2";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type WorldBankIndicatorValue = {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit?: string;
  obs_status?: string;
  decimal?: number;
};

type WorldBankIndicatorMeta = {
  id: string;
  name: string;
  unit?: string;
  source?: {
    id: string;
    value: string;
  };
  sourceNote?: string;
  sourceOrganization?: string;
};

type WorldBankCountry = {
  id: string;
  iso2Code: string;
  name: string;
  region: {
    id: string;
    iso2code: string;
    value: string;
  };
  incomeLevel: {
    id: string;
    iso2code: string;
    value: string;
  };
  capitalCity: string;
  longitude: string;
  latitude: string;
};

type WorldBankPagination = {
  page: number;
  pages: number;
  per_page: string | number;
  total: number;
};

// =============================================================================
// Popular Indicators Reference
// =============================================================================

const POPULAR_INDICATORS: Record<string, { id: string; name: string }> = {
  gdp: { id: "NY.GDP.MKTP.CD", name: "GDP (current US$)" },
  gdp_per_capita: {
    id: "NY.GDP.PCAP.CD",
    name: "GDP per capita (current US$)",
  },
  gdp_growth: { id: "NY.GDP.MKTP.KD.ZG", name: "GDP growth (annual %)" },
  population: { id: "SP.POP.TOTL", name: "Population, total" },
  population_growth: {
    id: "SP.POP.GROW",
    name: "Population growth (annual %)",
  },
  life_expectancy: {
    id: "SP.DYN.LE00.IN",
    name: "Life expectancy at birth (years)",
  },
  infant_mortality: {
    id: "SP.DYN.IMRT.IN",
    name: "Mortality rate, infant (per 1,000)",
  },
  unemployment: {
    id: "SL.UEM.TOTL.ZS",
    name: "Unemployment, total (% of labor force)",
  },
  inflation: {
    id: "FP.CPI.TOTL.ZG",
    name: "Inflation, consumer prices (annual %)",
  },
  co2_emissions: {
    id: "EN.ATM.CO2E.PC",
    name: "CO2 emissions (metric tons per capita)",
  },
  internet_users: {
    id: "IT.NET.USER.ZS",
    name: "Individuals using the Internet (% of population)",
  },
  literacy_rate: {
    id: "SE.ADT.LITR.ZS",
    name: "Literacy rate, adult total (%)",
  },
  poverty_rate: {
    id: "SI.POV.DDAY",
    name: "Poverty headcount ratio at $2.15/day (%)",
  },
  renewable_energy: {
    id: "EG.FEC.RNEW.ZS",
    name: "Renewable energy consumption (%)",
  },
  health_expenditure: {
    id: "SH.XPD.CHEX.GD.ZS",
    name: "Current health expenditure (% of GDP)",
  },
};

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  if (Math.abs(value) >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString();
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

function resolveIndicator(input: string): string {
  // Check if it's a shorthand
  const lower = input.toLowerCase().replaceAll(/[\s-]/g, "_");
  if (POPULAR_INDICATORS[lower]) {
    return POPULAR_INDICATORS[lower].id;
  }
  // Otherwise return as-is (assumed to be an indicator ID)
  return input;
}

async function worldBankRequest<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${WORLD_BANK_API_BASE}${endpoint}`);

  // Always request JSON format
  url.searchParams.append("format", "json");

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
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
      `World Bank API error (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// Tool: Get World Bank Indicator Data
// =============================================================================

export type WorldBankDataPoint = {
  country: string;
  countryCode: string;
  year: string;
  value: number | null;
  formattedValue: string;
};

export type WorldBankIndicatorResult = {
  success: boolean;
  indicator: string;
  indicatorName?: string;
  countries: string[];
  years: string;
  data: WorldBankDataPoint[];
  total: number;
  error?: string;
  markdown: string;
};

export const worldBankIndicatorTool = tool({
  description:
    "Get World Bank development indicator data for countries. " +
    "Access 16,000+ indicators covering economics, health, education, environment, and more. " +
    "Use for: comparing countries, tracking development trends, economic analysis, " +
    "global statistics research. " +
    "Popular shortcuts: 'gdp', 'population', 'life_expectancy', 'unemployment', 'inflation', " +
    "'co2_emissions', 'internet_users', 'literacy_rate', 'poverty_rate'",
  inputSchema: z.object({
    indicator: z
      .string()
      .min(1)
      .describe(
        "Indicator ID or shorthand. Use shortcuts like 'gdp', 'population', 'life_expectancy', " +
          "'unemployment', 'inflation', 'co2_emissions', 'internet_users'. " +
          "Or use full indicator IDs like 'NY.GDP.MKTP.CD', 'SP.POP.TOTL'."
      ),
    countries: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(
        "Country codes (ISO 2-letter or 3-letter). " +
          "Examples: ['US', 'CN', 'JP'], ['USA', 'CHN', 'JPN'], ['WLD'] for world aggregate."
      ),
    startYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("Start year for data range. Default: 5 years ago."),
    endYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("End year for data range. Default: most recent."),
  }),
  execute: async ({ indicator, countries, startYear, endYear }) => {
    try {
      const indicatorId = resolveIndicator(indicator);
      const indicatorName =
        POPULAR_INDICATORS[indicator.toLowerCase().replaceAll(/[\s-]/g, "_")]
          ?.name || indicatorId;

      // Default to last 5 years if not specified
      const currentYear = new Date().getFullYear();
      const start = startYear ?? currentYear - 5;
      const end = endYear ?? currentYear;

      const countryParam = countries.join(";");

      // Fetch data
      const response = await worldBankRequest<
        | [WorldBankPagination, WorldBankIndicatorValue[]]
        | [{ message: unknown[] }]
      >(`/country/${countryParam}/indicator/${indicatorId}`, {
        date: `${start}:${end}`,
        per_page: "500",
      });

      // Check for error response
      if (!Array.isArray(response) || response.length < 2) {
        return {
          success: false,
          indicator: indicatorId,
          indicatorName,
          countries,
          years: `${start}-${end}`,
          data: [],
          total: 0,
          error:
            "No data available for this indicator and country combination.",
          markdown: `No data found for ${indicatorName} in the selected countries.`,
        } satisfies WorldBankIndicatorResult;
      }

      const [, rawData] = response as [
        WorldBankPagination,
        WorldBankIndicatorValue[],
      ];

      if (!rawData?.length) {
        return {
          success: false,
          indicator: indicatorId,
          indicatorName,
          countries,
          years: `${start}-${end}`,
          data: [],
          total: 0,
          error:
            "No data available for this indicator and country combination.",
          markdown: `No data found for ${indicatorName} in the selected countries.`,
        } satisfies WorldBankIndicatorResult;
      }

      // Transform data
      const data: WorldBankDataPoint[] = rawData
        .filter((item) => item.value !== null)
        .map((item) => ({
          country: item.country.value,
          countryCode: item.countryiso3code || item.country.id,
          year: item.date,
          value: item.value,
          formattedValue: formatNumber(item.value),
        }))
        .sort((a, b) => {
          // Sort by year descending, then by country
          const yearDiff =
            Number.parseInt(b.year, 10) - Number.parseInt(a.year, 10);
          if (yearDiff !== 0) {
            return yearDiff;
          }
          return a.country.localeCompare(b.country);
        });

      // Build markdown table
      let markdown = `### ${indicatorName}\n\n`;
      markdown += `**Indicator ID:** ${indicatorId}\n`;
      markdown += `**Period:** ${start} - ${end}\n\n`;

      if (data.length > 0) {
        markdown += "| Country | Year | Value |\n";
        markdown += "|---------|------|-------|\n";
        for (const d of data.slice(0, 30)) {
          markdown += `| ${d.country} | ${d.year} | ${d.formattedValue} |\n`;
        }
        if (data.length > 30) {
          markdown += `\n*... and ${data.length - 30} more data points*`;
        }
      } else {
        markdown += "*No data available for the selected criteria.*";
      }

      markdown += "\n\n*Source: World Bank Open Data*";

      return {
        success: true,
        indicator: indicatorId,
        indicatorName,
        countries,
        years: `${start}-${end}`,
        data,
        total: data.length,
        markdown,
      } satisfies WorldBankIndicatorResult;
    } catch (error) {
      return {
        success: false,
        indicator,
        countries,
        years: "",
        data: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error fetching World Bank data: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WorldBankIndicatorResult;
    }
  },
});

// =============================================================================
// Tool: Search World Bank Indicators
// =============================================================================

export type WorldBankIndicatorInfo = {
  id: string;
  name: string;
  source?: string;
  sourceNote?: string;
};

export type WorldBankIndicatorSearchResult = {
  success: boolean;
  query: string;
  total: number;
  indicators: WorldBankIndicatorInfo[];
  error?: string;
  markdown: string;
};

export const worldBankSearchIndicatorsTool = tool({
  description:
    "Search for World Bank indicators by keyword. " +
    "Find the right indicator ID for topics like GDP, population, health, education, etc. " +
    "Use this to discover available indicators before fetching data.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for indicators. " +
          "Examples: 'GDP', 'carbon emissions', 'mortality rate', 'education'"
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

      // Search indicators
      const response = await worldBankRequest<
        | [WorldBankPagination, WorldBankIndicatorMeta[]]
        | [{ message: unknown[] }]
      >("/indicator", {
        per_page: searchLimit.toString(),
      });

      if (!Array.isArray(response) || response.length < 2) {
        return {
          success: false,
          query,
          total: 0,
          indicators: [],
          error: "Failed to fetch indicators.",
          markdown: "Error searching World Bank indicators.",
        } satisfies WorldBankIndicatorSearchResult;
      }

      const [, allIndicators] = response as [
        WorldBankPagination,
        WorldBankIndicatorMeta[],
      ];

      // Filter by query (case-insensitive)
      const lowerQuery = query.toLowerCase();
      const matchedIndicators = allIndicators
        .filter(
          (ind) =>
            ind.name?.toLowerCase().includes(lowerQuery) ||
            ind.id?.toLowerCase().includes(lowerQuery) ||
            ind.sourceNote?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, searchLimit);

      const indicators: WorldBankIndicatorInfo[] = matchedIndicators.map(
        (ind) => ({
          id: ind.id,
          name: ind.name,
          source: ind.source?.value,
          sourceNote: ind.sourceNote?.slice(0, 200),
        })
      );

      // Build markdown
      let markdown = `### World Bank Indicators: "${query}"\n\n`;

      if (indicators.length > 0) {
        for (const ind of indicators) {
          markdown += `**${ind.name}**\n`;
          markdown += `- ID: \`${ind.id}\`\n`;
          if (ind.sourceNote) {
            markdown += `- ${ind.sourceNote}...\n`;
          }
          markdown += "\n";
        }
      } else {
        markdown += "*No indicators found matching this query.*\n\n";
        markdown +=
          "Try broader terms like 'GDP', 'population', 'health', 'education', 'environment'.";
      }

      return {
        success: true,
        query,
        total: indicators.length,
        indicators,
        markdown,
      } satisfies WorldBankIndicatorSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        indicators: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error searching indicators: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WorldBankIndicatorSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Country Information
// =============================================================================

export type WorldBankCountryInfo = {
  id: string;
  iso2Code: string;
  name: string;
  region: string;
  incomeLevel: string;
  capitalCity: string;
  latitude?: string;
  longitude?: string;
};

export type WorldBankCountryResult = {
  success: boolean;
  query: string;
  countries: WorldBankCountryInfo[];
  error?: string;
  markdown: string;
};

export const worldBankCountryTool = tool({
  description:
    "Get World Bank country information including region, income level, and capital. " +
    "Use to look up country codes or get basic country facts.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Country name or code to look up. " +
          "Examples: 'United States', 'US', 'USA', 'China', 'CN'"
      ),
  }),
  execute: async ({ query }) => {
    try {
      // Fetch all countries and filter
      const response = await worldBankRequest<
        [WorldBankPagination, WorldBankCountry[]] | [{ message: unknown[] }]
      >("/country", {
        per_page: "300",
      });

      if (!Array.isArray(response) || response.length < 2) {
        return {
          success: false,
          query,
          countries: [],
          error: "Failed to fetch country data.",
          markdown: "Error fetching World Bank country data.",
        } satisfies WorldBankCountryResult;
      }

      const [, allCountries] = response as [
        WorldBankPagination,
        WorldBankCountry[],
      ];

      // Filter by query
      const lowerQuery = query.toLowerCase();
      const matched = allCountries.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQuery) ||
          c.id?.toLowerCase() === lowerQuery ||
          c.iso2Code?.toLowerCase() === lowerQuery
      );

      const countries: WorldBankCountryInfo[] = matched.map((c) => ({
        id: c.id,
        iso2Code: c.iso2Code,
        name: c.name,
        region: c.region?.value || "N/A",
        incomeLevel: c.incomeLevel?.value || "N/A",
        capitalCity: c.capitalCity || "N/A",
        latitude: c.latitude,
        longitude: c.longitude,
      }));

      // Build markdown
      let markdown = `### Country Information: "${query}"\n\n`;

      if (countries.length > 0) {
        for (const c of countries) {
          markdown += `**${c.name}** (${c.iso2Code} / ${c.id})\n`;
          markdown += `- Region: ${c.region}\n`;
          markdown += `- Income Level: ${c.incomeLevel}\n`;
          markdown += `- Capital: ${c.capitalCity}\n`;
          markdown += "\n";
        }
      } else {
        markdown += "*No countries found matching this query.*";
      }

      return {
        success: true,
        query,
        countries,
        markdown,
      } satisfies WorldBankCountryResult;
    } catch (error) {
      return {
        success: false,
        query,
        countries: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WorldBankCountryResult;
    }
  },
});
