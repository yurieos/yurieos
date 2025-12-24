/**
 * OECD Data Tools
 *
 * Provides access to OECD (Organisation for Economic Co-operation and Development) data:
 *
 * 1. OECD Data API - Statistics for 38 member countries
 *    @see https://data.oecd.org/api/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const OECD_API_BASE = "https://sdmx.oecd.org/public/rest";

const MAX_RESULTS_DEFAULT = 10;

// =============================================================================
// Types
// =============================================================================

type OecdDataPoint = {
  country: string;
  countryName: string;
  time: string;
  value: number | null;
  unit?: string;
  frequency?: string;
};

type OecdDataset = {
  id: string;
  name: string;
  description?: string;
};

// =============================================================================
// Popular Indicators Reference
// =============================================================================

const POPULAR_INDICATORS: Record<
  string,
  { dataflow: string; name: string; description: string }
> = {
  gdp: {
    dataflow: "QNA/Q..B1_GE.CXCU",
    name: "GDP Growth",
    description: "Quarterly GDP growth rate",
  },
  unemployment: {
    dataflow: "MEI/M..LRHUTTTT.STSA",
    name: "Unemployment Rate",
    description: "Harmonised unemployment rate",
  },
  inflation: {
    dataflow: "MEI/M..CPALTT01.GY",
    name: "Inflation (CPI)",
    description: "Consumer Price Index annual growth",
  },
  interest_rates: {
    dataflow: "MEI/M..IR3TIB01.ST",
    name: "Interest Rates",
    description: "3-month interbank rates",
  },
  trade_balance: {
    dataflow: "MEI/M..BPTDITT01.CXCU",
    name: "Trade Balance",
    description: "Trade balance as % of GDP",
  },
  population: {
    dataflow: "POP_PROJ/A..T.T.PROJ..",
    name: "Population",
    description: "Total population projections",
  },
  life_expectancy: {
    dataflow: "HEALTH_STAT/A..EVIE0000.T",
    name: "Life Expectancy",
    description: "Life expectancy at birth",
  },
  education: {
    dataflow: "EDU_ENRL/A..L5T8.T.FTE",
    name: "Tertiary Education",
    description: "Tertiary education enrollment",
  },
  co2_emissions: {
    dataflow: "ENV/A..CO2_TCO2",
    name: "CO2 Emissions",
    description: "Carbon dioxide emissions",
  },
  house_prices: {
    dataflow: "HOUSE_PRICES/Q..RHP.IX",
    name: "House Prices",
    description: "Real house price index",
  },
};

// OECD Member Countries
const OECD_COUNTRIES: Record<string, string> = {
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  CAN: "Canada",
  CHE: "Switzerland",
  CHL: "Chile",
  COL: "Colombia",
  CRI: "Costa Rica",
  CZE: "Czech Republic",
  DEU: "Germany",
  DNK: "Denmark",
  ESP: "Spain",
  EST: "Estonia",
  FIN: "Finland",
  FRA: "France",
  GBR: "United Kingdom",
  GRC: "Greece",
  HUN: "Hungary",
  IRL: "Ireland",
  ISL: "Iceland",
  ISR: "Israel",
  ITA: "Italy",
  JPN: "Japan",
  KOR: "Korea",
  LTU: "Lithuania",
  LUX: "Luxembourg",
  LVA: "Latvia",
  MEX: "Mexico",
  NLD: "Netherlands",
  NOR: "Norway",
  NZL: "New Zealand",
  POL: "Poland",
  PRT: "Portugal",
  SVK: "Slovak Republic",
  SVN: "Slovenia",
  SWE: "Sweden",
  TUR: "Türkiye",
  USA: "United States",
  OECD: "OECD Average",
};

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(value: number | null): string {
  if (value === null) return "N/A";
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return value.toLocaleString();
  return value.toFixed(2);
}

function resolveIndicator(
  input: string
): { dataflow: string; name: string } | null {
  const lower = input.toLowerCase().replace(/[\s-]/g, "_");
  if (POPULAR_INDICATORS[lower]) {
    return {
      dataflow: POPULAR_INDICATORS[lower].dataflow,
      name: POPULAR_INDICATORS[lower].name,
    };
  }
  return null;
}

// Parse SDMX-JSON response
function parseOecdResponse(data: unknown): OecdDataPoint[] {
  const points: OecdDataPoint[] = [];

  try {
    const json = data as {
      dataSets?: Array<{
        series?: Record<
          string,
          { observations?: Record<string, [number | null]> }
        >;
      }>;
      structure?: {
        dimensions?: {
          series?: Array<{
            id: string;
            values: Array<{ id: string; name: string }>;
          }>;
          observation?: Array<{
            id: string;
            values: Array<{ id: string; name: string }>;
          }>;
        };
      };
    };

    if (!(json.dataSets?.[0]?.series && json.structure?.dimensions)) {
      return points;
    }

    const series = json.dataSets[0].series;
    const seriesDims = json.structure.dimensions.series || [];
    const obsDims = json.structure.dimensions.observation || [];

    // Find REF_AREA (country) dimension
    const refAreaDim = seriesDims.find((d) => d.id === "REF_AREA");
    const timeDim = obsDims.find((d) => d.id === "TIME_PERIOD");

    for (const [seriesKey, seriesData] of Object.entries(series)) {
      const indices = seriesKey.split(":").map((i) => Number.parseInt(i, 10));

      let countryCode = "";
      let countryName = "";

      if (refAreaDim) {
        const refAreaIdx = seriesDims.findIndex((d) => d.id === "REF_AREA");
        if (refAreaIdx >= 0 && indices[refAreaIdx] !== undefined) {
          const countryValue = refAreaDim.values[indices[refAreaIdx]];
          countryCode = countryValue?.id || "";
          countryName =
            countryValue?.name || OECD_COUNTRIES[countryCode] || countryCode;
        }
      }

      if (seriesData.observations) {
        for (const [obsKey, obsValue] of Object.entries(
          seriesData.observations
        )) {
          const obsIdx = Number.parseInt(obsKey, 10);
          const timeValue = timeDim?.values[obsIdx];

          points.push({
            country: countryCode,
            countryName,
            time: timeValue?.id || obsKey,
            value: obsValue[0],
          });
        }
      }
    }
  } catch {
    // Return empty array on parse error
  }

  return points;
}

// =============================================================================
// Tool: List OECD Indicators
// =============================================================================

export type OecdIndicatorItem = {
  id: string;
  name: string;
  description: string;
};

export type OecdIndicatorsResult = {
  success: boolean;
  indicators: OecdIndicatorItem[];
  markdown: string;
};

export const oecdIndicatorsTool = tool({
  description:
    "List available OECD economic indicators. " +
    "OECD provides economic and social statistics for 38 member countries. " +
    "Use this to discover available indicators before querying data.",
  inputSchema: z.object({}),
  execute: async () => {
    const indicators: OecdIndicatorItem[] = Object.entries(
      POPULAR_INDICATORS
    ).map(([id, info]) => ({
      id,
      name: info.name,
      description: info.description,
    }));

    let markdown = "### OECD Indicators\n\n";
    markdown += "**Available Indicators:**\n\n";

    for (const ind of indicators) {
      markdown += `- **${ind.name}** (\`${ind.id}\`): ${ind.description}\n`;
    }

    markdown +=
      "\n**OECD Member Countries:** 38 countries including USA, Japan, Germany, UK, France, and more.\n";
    markdown += "\n*Source: OECD Data*";

    return {
      success: true,
      indicators,
      markdown,
    } satisfies OecdIndicatorsResult;
  },
});

// =============================================================================
// Tool: Get OECD Data
// =============================================================================

export type OecdDataResult = {
  success: boolean;
  indicator: string;
  indicatorName: string;
  countries: string[];
  data: OecdDataPoint[];
  total: number;
  error?: string;
  markdown: string;
};

export const oecdDataTool = tool({
  description:
    "Get economic data from OECD for member countries. " +
    "Supports indicators like GDP, unemployment, inflation, interest rates, trade, " +
    "population, life expectancy, education, CO2 emissions, and house prices. " +
    "Use for: international economic comparisons, policy research, country analysis.",
  inputSchema: z.object({
    indicator: z
      .string()
      .min(1)
      .describe(
        "OECD indicator to retrieve. Options: 'gdp', 'unemployment', 'inflation', " +
          "'interest_rates', 'trade_balance', 'population', 'life_expectancy', " +
          "'education', 'co2_emissions', 'house_prices'."
      ),
    countries: z
      .array(z.string())
      .optional()
      .describe(
        "Country codes to retrieve. Examples: ['USA', 'JPN', 'DEU', 'GBR', 'FRA']. " +
          "Leave empty for all OECD countries."
      ),
    startPeriod: z
      .string()
      .optional()
      .describe(
        "Start period. Format: 'YYYY' for annual, 'YYYY-QN' for quarterly."
      ),
    endPeriod: z
      .string()
      .optional()
      .describe(
        "End period. Format: 'YYYY' for annual, 'YYYY-QN' for quarterly."
      ),
  }),
  execute: async ({ indicator, countries, startPeriod, endPeriod }) => {
    try {
      const resolved = resolveIndicator(indicator);

      if (!resolved) {
        const availableIndicators = Object.keys(POPULAR_INDICATORS).join(", ");
        return {
          success: false,
          indicator,
          indicatorName: indicator,
          countries: countries || [],
          data: [],
          total: 0,
          error: `Unknown indicator: ${indicator}. Available: ${availableIndicators}`,
          markdown: `Unknown indicator. Available: ${availableIndicators}`,
        } satisfies OecdDataResult;
      }

      // Build the SDMX query
      let dataflow = resolved.dataflow;

      // If countries specified, modify the dataflow path
      if (countries && countries.length > 0) {
        const parts = dataflow.split("/");
        if (parts.length >= 2) {
          // Insert country filter into the key
          const keyParts = parts[1].split(".");
          if (keyParts.length > 0) {
            keyParts[0] = countries.join("+");
            parts[1] = keyParts.join(".");
            dataflow = parts.join("/");
          }
        }
      }

      let url = `${OECD_API_BASE}/data/${dataflow}`;

      // Add time period parameters
      const params = new URLSearchParams();
      if (startPeriod) {
        params.append("startPeriod", startPeriod);
      }
      if (endPeriod) {
        params.append("endPeriod", endPeriod);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/vnd.sdmx.data+json;version=1.0.0-wd",
        },
      });

      if (!response.ok) {
        throw new Error(`OECD API error: ${response.status}`);
      }

      const data = await response.json();
      const points = parseOecdResponse(data);

      if (points.length === 0) {
        return {
          success: true,
          indicator,
          indicatorName: resolved.name,
          countries: countries || [],
          data: [],
          total: 0,
          error: "No data available for the selected criteria.",
          markdown: `No OECD data found for ${resolved.name}.`,
        } satisfies OecdDataResult;
      }

      // Sort by time descending, then by country
      points.sort((a, b) => {
        const timeDiff = b.time.localeCompare(a.time);
        if (timeDiff !== 0) return timeDiff;
        return a.countryName.localeCompare(b.countryName);
      });

      // Build markdown
      let markdown = `### OECD: ${resolved.name}\n\n`;
      if (countries && countries.length > 0) {
        markdown += `**Countries:** ${countries.join(", ")}\n`;
      }
      if (startPeriod || endPeriod) {
        markdown += `**Period:** ${startPeriod || "..."} to ${endPeriod || "latest"}\n`;
      }
      markdown += `\nFound ${points.length} data points.\n\n`;

      // Group by latest time period
      const latestTime = points[0]?.time;
      const latestPoints = points.filter((p) => p.time === latestTime);

      if (latestPoints.length > 0) {
        markdown += `**Latest (${latestTime}):**\n\n`;
        markdown += "| Country | Value |\n";
        markdown += "|---------|-------|\n";
        for (const dp of latestPoints.slice(0, 20)) {
          markdown += `| ${dp.countryName} | ${formatNumber(dp.value)} |\n`;
        }
      }

      markdown += "\n*Source: OECD Data*";

      return {
        success: true,
        indicator,
        indicatorName: resolved.name,
        countries: countries || [],
        data: points.slice(0, 100),
        total: points.length,
        markdown,
      } satisfies OecdDataResult;
    } catch (error) {
      return {
        success: false,
        indicator,
        indicatorName: indicator,
        countries: countries || [],
        data: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies OecdDataResult;
    }
  },
});

// =============================================================================
// Tool: List OECD Countries
// =============================================================================

export type OecdCountriesResult = {
  success: boolean;
  countries: Array<{ code: string; name: string }>;
  markdown: string;
};

export const oecdCountriesTool = tool({
  description:
    "List all OECD member countries with their codes. " +
    "Use to find country codes for data queries.",
  inputSchema: z.object({}),
  execute: async () => {
    const countries = Object.entries(OECD_COUNTRIES)
      .filter(([code]) => code !== "OECD")
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    let markdown = "### OECD Member Countries\n\n";
    markdown += "| Code | Country |\n";
    markdown += "|------|---------|\n";

    for (const country of countries) {
      markdown += `| ${country.code} | ${country.name} |\n`;
    }

    markdown += "\n*38 member countries*\n";
    markdown += "*Source: OECD*";

    return {
      success: true,
      countries,
      markdown,
    } satisfies OecdCountriesResult;
  },
});
