/**
 * Eurostat European Statistics Tools
 *
 * Provides access to European Union statistics:
 *
 * 1. Eurostat - Official EU statistics for 27+ member states
 *    @see https://ec.europa.eu/eurostat/web/main/data/web-services
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const EUROSTAT_API_BASE =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type EurostatDataset = {
  code: string;
  title: string;
  shortTitle?: string;
  unit?: string;
  lastUpdate?: string;
  startPeriod?: string;
  endPeriod?: string;
};

type EurostatSearchResponse = {
  datasets?: EurostatDataset[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
};

type EurostatDimension = {
  id: string;
  label: string;
  category: {
    index: Record<string, number>;
    label: Record<string, string>;
  };
};

type EurostatDataResponse = {
  version: string;
  label: string;
  source: string;
  updated: string;
  id: string[];
  size: number[];
  dimension: Record<string, EurostatDimension>;
  value: Record<string, number | null>;
  status?: Record<string, string>;
};

// =============================================================================
// Popular Indicators Reference
// =============================================================================

const POPULAR_DATASETS: Record<string, { code: string; name: string }> = {
  gdp: { code: "nama_10_gdp", name: "GDP and main components" },
  unemployment: { code: "une_rt_m", name: "Unemployment rates" },
  inflation: { code: "prc_hicp_manr", name: "HICP inflation" },
  population: { code: "demo_pjan", name: "Population on 1 January" },
  life_expectancy: { code: "demo_mlexpec", name: "Life expectancy" },
  employment: { code: "lfsi_emp_a", name: "Employment rates" },
  trade: { code: "ext_lt_maineu", name: "EU trade by partner" },
  energy: { code: "nrg_bal_c", name: "Energy balance" },
  tourism: { code: "tour_occ_nim", name: "Tourism arrivals" },
  education: { code: "edat_lfse_03", name: "Educational attainment" },
};

// EU country codes
const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "EU27_2020",
];

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

function resolveDatasetCode(input: string): string {
  const lower = input.toLowerCase().replace(/[\s-]/g, "_");
  if (POPULAR_DATASETS[lower]) {
    return POPULAR_DATASETS[lower].code;
  }
  return input;
}

// =============================================================================
// Tool: Search Eurostat Datasets
// =============================================================================

export type EurostatDatasetItem = {
  code: string;
  title: string;
  shortTitle?: string;
  unit?: string;
  lastUpdate?: string;
  period?: string;
  url: string;
};

export type EurostatSearchResult = {
  success: boolean;
  query: string;
  total: number;
  datasets: EurostatDatasetItem[];
  error?: string;
  markdown: string;
};

export const eurostatSearchTool = tool({
  description:
    "Search Eurostat for European Union statistics datasets. " +
    "Eurostat is the official statistics office of the EU with data on all member states. " +
    "Use for: EU economic data, demographics, trade, employment, health, education, environment. " +
    "Popular shortcuts: 'gdp', 'unemployment', 'inflation', 'population', 'life_expectancy'.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for Eurostat datasets. Use keywords or shortcuts. " +
          "Examples: 'GDP', 'unemployment rate', 'inflation', 'population', 'trade'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum datasets to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Use the dataset catalog search
      const params = new URLSearchParams({
        searchText: query,
        pageSize: searchLimit.toString(),
        lang: "en",
      });

      const response = await fetch(
        `${EUROSTAT_API_BASE}/data/datasetlist?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      // If search fails, try returning known datasets matching the query
      if (!response.ok) {
        const lowerQuery = query.toLowerCase();
        const matchedDatasets = Object.entries(POPULAR_DATASETS)
          .filter(
            ([key, val]) =>
              key.includes(lowerQuery) ||
              val.name.toLowerCase().includes(lowerQuery)
          )
          .slice(0, searchLimit)
          .map(([, val]) => ({
            code: val.code,
            title: val.name,
            url: `https://ec.europa.eu/eurostat/databrowser/view/${val.code}`,
          }));

        if (matchedDatasets.length > 0) {
          let markdown = `### Eurostat Datasets: "${query}"\n\n`;
          for (const ds of matchedDatasets) {
            markdown += `**[${ds.title}](${ds.url})**\n`;
            markdown += `Code: \`${ds.code}\`\n\n`;
          }
          markdown += "*Source: Eurostat*";

          return {
            success: true,
            query,
            total: matchedDatasets.length,
            datasets: matchedDatasets as EurostatDatasetItem[],
            markdown,
          } satisfies EurostatSearchResult;
        }

        throw new Error(`Eurostat API error: ${response.status}`);
      }

      const data = (await response.json()) as EurostatSearchResponse;

      if (!data.datasets?.length) {
        // Fallback to popular datasets
        const lowerQuery = query.toLowerCase();
        const matched = Object.entries(POPULAR_DATASETS).filter(
          ([key, val]) =>
            key.includes(lowerQuery) ||
            val.name.toLowerCase().includes(lowerQuery)
        );

        if (matched.length > 0) {
          const datasets = matched.map(([, val]) => ({
            code: val.code,
            title: val.name,
            url: `https://ec.europa.eu/eurostat/databrowser/view/${val.code}`,
          }));

          let markdown = `### Eurostat Datasets: "${query}"\n\n`;
          for (const ds of datasets) {
            markdown += `**[${ds.title}](${ds.url})**\n`;
            markdown += `Code: \`${ds.code}\`\n\n`;
          }
          markdown += "*Source: Eurostat*";

          return {
            success: true,
            query,
            total: datasets.length,
            datasets: datasets as EurostatDatasetItem[],
            markdown,
          } satisfies EurostatSearchResult;
        }

        return {
          success: true,
          query,
          total: 0,
          datasets: [],
          error: "No Eurostat datasets found. Try different search terms.",
          markdown: `No datasets found for "${query}".`,
        } satisfies EurostatSearchResult;
      }

      const datasets: EurostatDatasetItem[] = data.datasets.map((ds) => ({
        code: ds.code,
        title: ds.title,
        shortTitle: ds.shortTitle,
        unit: ds.unit,
        lastUpdate: ds.lastUpdate,
        period:
          ds.startPeriod && ds.endPeriod
            ? `${ds.startPeriod} - ${ds.endPeriod}`
            : undefined,
        url: `https://ec.europa.eu/eurostat/databrowser/view/${ds.code}`,
      }));

      // Build markdown
      let markdown = `### Eurostat Datasets: "${query}"\n\n`;
      markdown += `Found ${data.totalCount || datasets.length} datasets.\n\n`;

      for (const ds of datasets) {
        markdown += `**[${ds.title}](${ds.url})**\n`;
        markdown += `Code: \`${ds.code}\``;
        if (ds.lastUpdate) markdown += ` | Updated: ${ds.lastUpdate}`;
        markdown += "\n\n";
      }

      markdown += "*Source: Eurostat*";

      return {
        success: true,
        query,
        total: data.totalCount || datasets.length,
        datasets,
        markdown,
      } satisfies EurostatSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        datasets: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies EurostatSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Eurostat Data
// =============================================================================

export type EurostatDataPoint = {
  geo: string;
  geoLabel: string;
  time: string;
  value: number | null;
  formattedValue: string;
};

export type EurostatDataResult = {
  success: boolean;
  datasetCode: string;
  datasetTitle?: string;
  data: EurostatDataPoint[];
  total: number;
  error?: string;
  markdown: string;
};

export const eurostatDataTool = tool({
  description:
    "Get data from a specific Eurostat dataset for EU countries. " +
    "Returns time series data for selected countries and time periods. " +
    "Use after searching to retrieve actual statistical data. " +
    "Popular datasets: 'gdp', 'unemployment', 'inflation', 'population'.",
  inputSchema: z.object({
    datasetCode: z
      .string()
      .min(1)
      .describe(
        "Eurostat dataset code or shortcut. " +
          "Shortcuts: 'gdp', 'unemployment', 'inflation', 'population'. " +
          "Or use codes like 'nama_10_gdp', 'une_rt_m'."
      ),
    countries: z
      .array(z.string())
      .optional()
      .describe(
        "Country codes to retrieve. Examples: ['DE', 'FR', 'IT', 'ES']. " +
          "Use 'EU27_2020' for EU aggregate. Leave empty for all EU countries."
      ),
    startYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("Start year for data. Default: 5 years ago."),
    endYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("End year for data. Default: latest available."),
  }),
  execute: async ({ datasetCode, countries, startYear, endYear }) => {
    try {
      const code = resolveDatasetCode(datasetCode);
      const currentYear = new Date().getFullYear();
      const start = startYear ?? currentYear - 5;
      const end = endYear ?? currentYear;

      // Build filter for countries
      const geoFilter =
        countries && countries.length > 0
          ? countries.join("+")
          : EU_COUNTRIES.slice(0, 10).join("+"); // Default to major EU countries

      // Build time filter
      const timeFilter = `${start}..${end}`;

      // Fetch data using JSON-stat format
      const url = `${EUROSTAT_API_BASE}/data/${code}?format=JSON&geo=${geoFilter}&time=${timeFilter}&lang=en`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Eurostat API error: ${response.status}`);
      }

      const data = (await response.json()) as EurostatDataResponse;

      // Parse the JSON-stat format
      const geoDim = data.dimension.geo;
      const timeDim = data.dimension.time;

      if (!(geoDim && timeDim)) {
        return {
          success: false,
          datasetCode: code,
          data: [],
          total: 0,
          error: "Invalid data structure returned from Eurostat.",
          markdown: "Error: Invalid data structure.",
        } satisfies EurostatDataResult;
      }

      const geoCategories = geoDim.category;
      const timeCategories = timeDim.category;

      const geoKeys = Object.keys(geoCategories.index).sort(
        (a, b) => geoCategories.index[a] - geoCategories.index[b]
      );
      const timeKeys = Object.keys(timeCategories.index).sort(
        (a, b) => timeCategories.index[a] - timeCategories.index[b]
      );

      // Extract data points
      const dataPoints: EurostatDataPoint[] = [];
      const timeSize = timeKeys.length;

      for (const geo of geoKeys) {
        const geoIdx = geoCategories.index[geo];
        const geoLabel = geoCategories.label[geo] || geo;

        for (const time of timeKeys) {
          const timeIdx = timeCategories.index[time];
          const valueIdx = geoIdx * timeSize + timeIdx;
          const value = data.value[valueIdx.toString()] ?? null;

          dataPoints.push({
            geo,
            geoLabel,
            time,
            value,
            formattedValue: formatNumber(value),
          });
        }
      }

      // Sort by time descending, then by geo
      dataPoints.sort((a, b) => {
        const timeDiff = b.time.localeCompare(a.time);
        if (timeDiff !== 0) return timeDiff;
        return a.geoLabel.localeCompare(b.geoLabel);
      });

      // Build markdown
      let markdown = `### ${data.label || code}\n\n`;
      markdown += `**Dataset:** ${code}\n`;
      markdown += `**Period:** ${start} - ${end}\n`;
      markdown += `**Updated:** ${data.updated || "N/A"}\n\n`;

      if (dataPoints.length > 0) {
        markdown += "| Country | Year | Value |\n";
        markdown += "|---------|------|-------|\n";
        for (const dp of dataPoints.slice(0, 30)) {
          if (dp.value !== null) {
            markdown += `| ${dp.geoLabel} | ${dp.time} | ${dp.formattedValue} |\n`;
          }
        }
        if (dataPoints.length > 30) {
          markdown += `\n*... and ${dataPoints.length - 30} more data points*`;
        }
      } else {
        markdown += "*No data available for the selected criteria.*";
      }

      markdown += "\n\n*Source: Eurostat*";

      return {
        success: true,
        datasetCode: code,
        datasetTitle: data.label,
        data: dataPoints,
        total: dataPoints.length,
        markdown,
      } satisfies EurostatDataResult;
    } catch (error) {
      return {
        success: false,
        datasetCode,
        data: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies EurostatDataResult;
    }
  },
});
