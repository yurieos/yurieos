/**
 * IMF International Monetary Fund Data Tools
 *
 * Provides access to IMF economic data:
 *
 * 1. IMF Data API - International economic indicators
 *    @see https://dataservices.imf.org/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const IMF_API_BASE = "https://dataservices.imf.org/REST/SDMX_JSON.svc";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type ImfDataset = {
  id: string;
  name: string;
  description?: string;
};

type ImfDataflowResponse = {
  Structure: {
    Dataflows: {
      Dataflow: Array<{
        id: string;
        Name: { "#text": string } | Array<{ "#text": string }>;
      }>;
    };
  };
};

type ImfSeriesValue = {
  "@TIME_PERIOD": string;
  "@OBS_VALUE": string;
};

type ImfSeries = {
  "@REF_AREA"?: string;
  "@INDICATOR"?: string;
  Obs?: ImfSeriesValue | ImfSeriesValue[];
};

type ImfDataResponse = {
  CompactData?: {
    DataSet?: {
      Series?: ImfSeries | ImfSeries[];
    };
  };
};

// =============================================================================
// Popular Datasets Reference
// =============================================================================

const POPULAR_DATASETS: Record<string, { id: string; name: string }> = {
  weo: { id: "WEO", name: "World Economic Outlook" },
  ifs: { id: "IFS", name: "International Financial Statistics" },
  bop: { id: "BOP", name: "Balance of Payments" },
  dot: { id: "DOT", name: "Direction of Trade Statistics" },
  gfs: { id: "GFS", name: "Government Finance Statistics" },
  fsi: { id: "FSI", name: "Financial Soundness Indicators" },
  cofog: { id: "COFOG", name: "Government Expenditure by Function" },
  cpi: { id: "CPI", name: "Consumer Price Index" },
};

// Common country codes
const MAJOR_COUNTRIES = [
  "US",
  "CN",
  "JP",
  "DE",
  "GB",
  "FR",
  "IN",
  "IT",
  "BR",
  "CA",
  "RU",
  "KR",
  "AU",
  "ES",
  "MX",
  "ID",
  "NL",
  "SA",
  "TR",
  "CH",
];

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(value: string | number | null): string {
  if (value === null || value === "") return "N/A";
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value);
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return num.toLocaleString();
  return num.toFixed(2);
}

function resolveDatasetId(input: string): string {
  const lower = input.toLowerCase().replace(/[\s-]/g, "_");
  if (POPULAR_DATASETS[lower]) {
    return POPULAR_DATASETS[lower].id;
  }
  return input.toUpperCase();
}

function extractName(
  nameField: { "#text": string } | Array<{ "#text": string }>
): string {
  if (Array.isArray(nameField)) {
    return nameField[0]?.["#text"] || "Unknown";
  }
  return nameField?.["#text"] || "Unknown";
}

// =============================================================================
// Tool: List IMF Datasets
// =============================================================================

export type ImfDatasetItem = {
  id: string;
  name: string;
};

export type ImfDatasetsResult = {
  success: boolean;
  total: number;
  datasets: ImfDatasetItem[];
  error?: string;
  markdown: string;
};

export const imfDatasetsTool = tool({
  description:
    "List available IMF (International Monetary Fund) datasets. " +
    "IMF provides global economic and financial data for 190+ countries. " +
    "Use this to discover available datasets before querying data. " +
    "Popular datasets: WEO (World Economic Outlook), IFS (International Financial Statistics), " +
    "BOP (Balance of Payments), DOT (Direction of Trade).",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum datasets to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const response = await fetch(`${IMF_API_BASE}/Dataflow`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        // Return popular datasets as fallback
        const datasets = Object.values(POPULAR_DATASETS).slice(0, searchLimit);
        let markdown = "### IMF Datasets\n\n";
        markdown += "**Popular Datasets:**\n\n";
        for (const ds of datasets) {
          markdown += `- **${ds.name}** (${ds.id})\n`;
        }
        markdown += "\n*Source: IMF Data Services*";

        return {
          success: true,
          total: datasets.length,
          datasets,
          markdown,
        } satisfies ImfDatasetsResult;
      }

      const data = (await response.json()) as ImfDataflowResponse;
      const dataflows = data.Structure?.Dataflows?.Dataflow || [];

      const datasets: ImfDatasetItem[] = dataflows
        .slice(0, searchLimit)
        .map((df) => ({
          id: df.id,
          name: extractName(df.Name),
        }));

      // Build markdown
      let markdown = "### IMF Datasets\n\n";
      markdown += `Found ${dataflows.length} datasets.\n\n`;

      for (const ds of datasets) {
        markdown += `**${ds.name}**\n`;
        markdown += `- Code: \`${ds.id}\`\n\n`;
      }

      markdown += "*Source: IMF Data Services*";

      return {
        success: true,
        total: dataflows.length,
        datasets,
        markdown,
      } satisfies ImfDatasetsResult;
    } catch (error) {
      // Return popular datasets as fallback
      const datasets = Object.values(POPULAR_DATASETS);
      let markdown = "### IMF Datasets\n\n";
      markdown += "**Popular Datasets:**\n\n";
      for (const ds of datasets) {
        markdown += `- **${ds.name}** (${ds.id})\n`;
      }
      markdown += "\n*Source: IMF Data Services*";

      return {
        success: true,
        total: datasets.length,
        datasets,
        markdown,
      } satisfies ImfDatasetsResult;
    }
  },
});

// =============================================================================
// Tool: Get IMF Data
// =============================================================================

export type ImfDataPoint = {
  country: string;
  indicator?: string;
  year: string;
  value: string;
  formattedValue: string;
};

export type ImfDataResult = {
  success: boolean;
  datasetId: string;
  countries: string[];
  indicator?: string;
  data: ImfDataPoint[];
  total: number;
  error?: string;
  markdown: string;
};

export const imfDataTool = tool({
  description:
    "Get economic data from IMF datasets. " +
    "Supports datasets like WEO (World Economic Outlook), IFS (International Financial Statistics). " +
    "Returns time series data for selected countries and indicators.",
  inputSchema: z.object({
    datasetId: z
      .string()
      .min(1)
      .describe(
        "IMF dataset ID. Options: 'WEO' (World Economic Outlook), 'IFS' (International Financial Statistics), " +
          "'BOP' (Balance of Payments), 'DOT' (Direction of Trade)."
      ),
    countries: z
      .array(z.string())
      .optional()
      .describe(
        "ISO country codes. Examples: ['US', 'CN', 'JP', 'DE', 'GB']. " +
          "Leave empty for major economies."
      ),
    indicator: z
      .string()
      .optional()
      .describe(
        "Indicator code. Examples for IFS: 'NGDP_R' (Real GDP), 'PCPI_IX' (CPI). " +
          "Leave empty for default indicator."
      ),
    startYear: z
      .number()
      .int()
      .min(1950)
      .max(2030)
      .optional()
      .describe("Start year. Default: 5 years ago."),
    endYear: z
      .number()
      .int()
      .min(1950)
      .max(2030)
      .optional()
      .describe("End year. Default: current year."),
  }),
  execute: async ({ datasetId, countries, indicator, startYear, endYear }) => {
    try {
      const dataset = resolveDatasetId(datasetId);
      const countryList =
        countries && countries.length > 0
          ? countries
          : MAJOR_COUNTRIES.slice(0, 5);
      const currentYear = new Date().getFullYear();
      const start = startYear ?? currentYear - 5;
      const end = endYear ?? currentYear;

      // Build the IMF API query
      // Format: CompactData/DatasetID/Frequency.Country.Indicator
      const countryParam = countryList.join("+");
      const indicatorParam = indicator || "";

      // Use annual frequency (A) as default
      const dimensionString = `A.${countryParam}.${indicatorParam}`;

      const url = `${IMF_API_BASE}/CompactData/${dataset}/${dimensionString}?startPeriod=${start}&endPeriod=${end}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`IMF API error: ${response.status}`);
      }

      const rawData = (await response.json()) as ImfDataResponse;

      // Parse the response
      const seriesData = rawData.CompactData?.DataSet?.Series;

      if (!seriesData) {
        return {
          success: true,
          datasetId: dataset,
          countries: countryList,
          indicator,
          data: [],
          total: 0,
          error: "No data available for this query. Try different parameters.",
          markdown: `No data found for ${dataset} with the specified criteria.`,
        } satisfies ImfDataResult;
      }

      // Handle single series or array of series
      const seriesArray = Array.isArray(seriesData) ? seriesData : [seriesData];

      const dataPoints: ImfDataPoint[] = [];

      for (const series of seriesArray) {
        const country = series["@REF_AREA"] || "Unknown";
        const ind = series["@INDICATOR"];

        const observations = series.Obs;
        if (!observations) continue;

        const obsArray = Array.isArray(observations)
          ? observations
          : [observations];

        for (const obs of obsArray) {
          const year = obs["@TIME_PERIOD"];
          const value = obs["@OBS_VALUE"];

          if (year && value) {
            dataPoints.push({
              country,
              indicator: ind,
              year,
              value,
              formattedValue: formatNumber(value),
            });
          }
        }
      }

      // Sort by year descending, then by country
      dataPoints.sort((a, b) => {
        const yearDiff = b.year.localeCompare(a.year);
        if (yearDiff !== 0) return yearDiff;
        return a.country.localeCompare(b.country);
      });

      // Build markdown
      let markdown = `### IMF Data: ${dataset}\n\n`;
      if (indicator) markdown += `**Indicator:** ${indicator}\n`;
      markdown += `**Countries:** ${countryList.join(", ")}\n`;
      markdown += `**Period:** ${start} - ${end}\n\n`;

      if (dataPoints.length > 0) {
        markdown += "| Country | Year | Value |\n";
        markdown += "|---------|------|-------|\n";
        for (const dp of dataPoints.slice(0, 30)) {
          markdown += `| ${dp.country} | ${dp.year} | ${dp.formattedValue} |\n`;
        }
        if (dataPoints.length > 30) {
          markdown += `\n*... and ${dataPoints.length - 30} more data points*`;
        }
      } else {
        markdown += "*No data available for the selected criteria.*";
      }

      markdown += "\n\n*Source: International Monetary Fund*";

      return {
        success: true,
        datasetId: dataset,
        countries: countryList,
        indicator,
        data: dataPoints,
        total: dataPoints.length,
        markdown,
      } satisfies ImfDataResult;
    } catch (error) {
      return {
        success: false,
        datasetId,
        countries: countries || [],
        indicator,
        data: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ImfDataResult;
    }
  },
});
