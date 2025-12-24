/**
 * Air Quality & Environmental Data Tools
 *
 * Provides access to environmental monitoring data:
 *
 * 1. OpenAQ - Real-time global air quality data
 *    - Air quality measurements from 100+ countries
 *    - PM2.5, PM10, O3, NO2, SO2, CO, BC measurements
 *    - Historical and real-time data
 *
 * @see https://docs.openaq.org/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const OPENAQ_API_BASE = "https://api.openaq.org/v2";

const MAX_RESULTS_DEFAULT = 20;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type OpenAQLocation = {
  id: number;
  name: string;
  city?: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  parameters: Array<{
    id: number;
    unit: string;
    count: number;
    average: number;
    lastValue: number;
    parameter: string;
    displayName: string;
    lastUpdated: string;
  }>;
  sensorType?: string;
  isMobile: boolean;
  isMonitor: boolean;
  sources?: Array<{
    name: string;
    url?: string;
  }>;
  lastUpdated: string;
  firstUpdated: string;
  measurements: number;
};

type OpenAQMeasurement = {
  locationId: number;
  location: string;
  parameter: string;
  value: number;
  date: {
    utc: string;
    local: string;
  };
  unit: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  country: string;
  city?: string;
};

type OpenAQLocationsResponse = {
  meta: {
    found: number;
    limit: number;
    page: number;
  };
  results: OpenAQLocation[];
};

type OpenAQMeasurementsResponse = {
  meta: {
    found: number;
    limit: number;
    page: number;
  };
  results: OpenAQMeasurement[];
};

// =============================================================================
// Helpers
// =============================================================================

function getAirQualityLevel(parameter: string, value: number): string {
  // Simplified AQI-like categorization
  if (parameter === "pm25") {
    if (value <= 12) {
      return "🟢 Good";
    }
    if (value <= 35.4) {
      return "🟡 Moderate";
    }
    if (value <= 55.4) {
      return "🟠 Unhealthy for Sensitive";
    }
    if (value <= 150.4) {
      return "🔴 Unhealthy";
    }
    if (value <= 250.4) {
      return "🟣 Very Unhealthy";
    }
    return "🟤 Hazardous";
  }
  if (parameter === "pm10") {
    if (value <= 54) {
      return "🟢 Good";
    }
    if (value <= 154) {
      return "🟡 Moderate";
    }
    if (value <= 254) {
      return "🟠 Unhealthy for Sensitive";
    }
    if (value <= 354) {
      return "🔴 Unhealthy";
    }
    if (value <= 424) {
      return "🟣 Very Unhealthy";
    }
    return "🟤 Hazardous";
  }
  if (parameter === "o3") {
    if (value <= 54) {
      return "🟢 Good";
    }
    if (value <= 70) {
      return "🟡 Moderate";
    }
    if (value <= 85) {
      return "🟠 Unhealthy for Sensitive";
    }
    if (value <= 105) {
      return "🔴 Unhealthy";
    }
    return "🟣 Very Unhealthy";
  }
  return "";
}

function formatLocationMarkdown(location: OpenAQLocation): string {
  const parts: string[] = [];

  parts.push(`### ${location.name}`);

  // Location info
  const locationInfo: string[] = [];
  if (location.city) locationInfo.push(location.city);
  locationInfo.push(location.country);
  parts.push(`📍 ${locationInfo.join(", ")}`);

  // Coordinates
  parts.push(
    `**Coordinates:** ${location.coordinates.latitude.toFixed(4)}, ${location.coordinates.longitude.toFixed(4)}`
  );

  // Parameters/measurements
  if (location.parameters?.length) {
    parts.push("\n**Latest Readings:**");
    for (const param of location.parameters) {
      const level = getAirQualityLevel(param.parameter, param.lastValue);
      parts.push(
        `- **${param.displayName}:** ${param.lastValue} ${param.unit} ${level}`
      );
    }
  }

  // Last updated
  if (location.lastUpdated) {
    const date = new Date(location.lastUpdated);
    parts.push(`\n*Last updated: ${date.toISOString()}*`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Air Quality Locations
// =============================================================================

export type AirQualityLocationItem = {
  id: number;
  name: string;
  city?: string;
  country: string;
  latitude: number;
  longitude: number;
  parameters: Array<{
    name: string;
    value: number;
    unit: string;
    level?: string;
  }>;
  isMobile: boolean;
  lastUpdated: string;
  totalMeasurements: number;
  markdown: string;
};

export type AirQualitySearchResult = {
  success: boolean;
  query: string;
  total: number;
  locations: AirQualityLocationItem[];
  error?: string;
  markdown: string;
};

export const airQualityLocationsTool = tool({
  description:
    "Search for air quality monitoring locations worldwide using OpenAQ. " +
    "Find stations measuring PM2.5, PM10, O3, NO2, SO2, CO, and other pollutants. " +
    "Use for: environmental research, public health studies, pollution analysis, " +
    "urban planning, climate research.",
  inputSchema: z.object({
    country: z
      .string()
      .optional()
      .describe(
        "Filter by country code (ISO 3166-1 alpha-2). " +
          "Examples: 'US', 'GB', 'DE', 'CN', 'IN', 'FR'"
      ),
    city: z
      .string()
      .optional()
      .describe(
        "Filter by city name. Examples: 'Los Angeles', 'London', 'Beijing', 'Delhi'"
      ),
    parameter: z
      .string()
      .optional()
      .describe(
        "Filter by pollutant parameter. Options: 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'bc'"
      ),
    radius: z
      .number()
      .int()
      .min(1)
      .max(25_000)
      .optional()
      .describe("Search radius in meters from coordinates (requires lat/lon)."),
    latitude: z
      .number()
      .optional()
      .describe("Latitude for location-based search."),
    longitude: z
      .number()
      .optional()
      .describe("Longitude for location-based search."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum locations to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({
    country,
    city,
    parameter,
    radius,
    latitude,
    longitude,
    limit,
  }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        limit: searchLimit.toString(),
        order_by: "lastUpdated",
        sort: "desc",
      });

      if (country) params.append("country", country);
      if (city) params.append("city", city);
      if (parameter) params.append("parameter", parameter);

      if (latitude !== undefined && longitude !== undefined) {
        params.append("coordinates", `${latitude},${longitude}`);
        if (radius) params.append("radius", radius.toString());
      }

      const response = await fetch(
        `${OPENAQ_API_BASE}/locations?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAQ API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenAQLocationsResponse;

      if (!data.results?.length) {
        const queryDesc =
          [country, city, parameter].filter(Boolean).join(", ") || "query";
        return {
          success: true,
          query: queryDesc,
          total: 0,
          locations: [],
          error: "No air quality monitoring locations found for this search.",
          markdown: `No air quality locations found for: ${queryDesc}`,
        } satisfies AirQualitySearchResult;
      }

      const locations: AirQualityLocationItem[] = data.results.map((loc) => ({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        country: loc.country,
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
        parameters: (loc.parameters || []).map((p) => ({
          name: p.displayName || p.parameter,
          value: p.lastValue,
          unit: p.unit,
          level: getAirQualityLevel(p.parameter, p.lastValue),
        })),
        isMobile: loc.isMobile,
        lastUpdated: loc.lastUpdated,
        totalMeasurements: loc.measurements,
        markdown: formatLocationMarkdown(loc),
      }));

      const queryDesc =
        [country, city, parameter].filter(Boolean).join(", ") || "all";

      // Build markdown
      let markdown = `### Air Quality Locations: ${queryDesc}\n\n`;
      markdown += `Found **${data.meta.found.toLocaleString()}** monitoring locations.\n\n`;

      for (const loc of locations.slice(0, 10)) {
        markdown += `**${loc.name}** (${loc.city || loc.country})\n`;
        for (const p of loc.parameters.slice(0, 3)) {
          markdown += `  - ${p.name}: ${p.value} ${p.unit} ${p.level}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: OpenAQ*";

      return {
        success: true,
        query: queryDesc,
        total: data.meta.found,
        locations,
        markdown,
      } satisfies AirQualitySearchResult;
    } catch (error) {
      return {
        success: false,
        query: "",
        total: 0,
        locations: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies AirQualitySearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Latest Air Quality Measurements
// =============================================================================

export type AirQualityMeasurementItem = {
  locationId: number;
  locationName: string;
  parameter: string;
  value: number;
  unit: string;
  level?: string;
  dateUtc: string;
  dateLocal: string;
  city?: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type AirQualityMeasurementsResult = {
  success: boolean;
  total: number;
  measurements: AirQualityMeasurementItem[];
  error?: string;
  markdown: string;
};

export const airQualityMeasurementsTool = tool({
  description:
    "Get the latest air quality measurements from OpenAQ. " +
    "Returns recent pollutant readings from monitoring stations. " +
    "Use for: real-time air quality analysis, pollution tracking, health advisories.",
  inputSchema: z.object({
    country: z
      .string()
      .optional()
      .describe(
        "Filter by country code (ISO 3166-1 alpha-2). Examples: 'US', 'GB', 'DE'"
      ),
    city: z
      .string()
      .optional()
      .describe("Filter by city name. Examples: 'Los Angeles', 'London'"),
    locationId: z
      .number()
      .int()
      .optional()
      .describe("Filter by specific location ID from search results."),
    parameter: z
      .string()
      .optional()
      .describe(
        "Filter by pollutant. Options: 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'bc'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum measurements to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ country, city, locationId, parameter, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        limit: searchLimit.toString(),
        order_by: "datetime",
        sort: "desc",
      });

      if (country) params.append("country", country);
      if (city) params.append("city", city);
      if (locationId) params.append("location_id", locationId.toString());
      if (parameter) params.append("parameter", parameter);

      const response = await fetch(
        `${OPENAQ_API_BASE}/measurements?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAQ API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenAQMeasurementsResponse;

      if (!data.results?.length) {
        return {
          success: true,
          total: 0,
          measurements: [],
          error: "No recent measurements found.",
          markdown: "No air quality measurements found.",
        } satisfies AirQualityMeasurementsResult;
      }

      const measurements: AirQualityMeasurementItem[] = data.results.map(
        (m) => ({
          locationId: m.locationId,
          locationName: m.location,
          parameter: m.parameter,
          value: m.value,
          unit: m.unit,
          level: getAirQualityLevel(m.parameter, m.value),
          dateUtc: m.date.utc,
          dateLocal: m.date.local,
          city: m.city,
          country: m.country,
          latitude: m.coordinates.latitude,
          longitude: m.coordinates.longitude,
        })
      );

      // Build markdown
      let markdown = "### Latest Air Quality Measurements\n\n";
      markdown += `Found **${data.meta.found.toLocaleString()}** measurements.\n\n`;
      markdown += "| Location | Parameter | Value | Level | Time (Local) |\n";
      markdown += "|----------|-----------|-------|-------|---------------|\n";

      for (const m of measurements.slice(0, 20)) {
        const time = new Date(m.dateLocal).toLocaleString();
        markdown += `| ${m.locationName} | ${m.parameter.toUpperCase()} | ${m.value} ${m.unit} | ${m.level} | ${time} |\n`;
      }

      markdown += "\n*Source: OpenAQ*";

      return {
        success: true,
        total: data.meta.found,
        measurements,
        markdown,
      } satisfies AirQualityMeasurementsResult;
    } catch (error) {
      return {
        success: false,
        total: 0,
        measurements: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies AirQualityMeasurementsResult;
    }
  },
});

// =============================================================================
// Tool: Get Available Countries
// =============================================================================

export type AirQualityCountriesResult = {
  success: boolean;
  countries: Array<{
    code: string;
    name: string;
    locations: number;
    parameters: string[];
  }>;
  error?: string;
  markdown: string;
};

export const airQualityCountriesTool = tool({
  description:
    "Get a list of countries with air quality monitoring data in OpenAQ. " +
    "Use this to discover which countries have available data before searching.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe("Maximum countries to return (1-200)."),
  }),
  execute: async ({ limit }) => {
    try {
      const searchLimit = Math.min(limit ?? 50, 200);

      const response = await fetch(
        `${OPENAQ_API_BASE}/countries?limit=${searchLimit}&order_by=locations&sort=desc`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAQ API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        results: Array<{
          code: string;
          name: string;
          locations: number;
          parameters: string[];
        }>;
      };

      if (!data.results?.length) {
        return {
          success: true,
          countries: [],
          error: "No countries found.",
          markdown: "No countries with air quality data found.",
        } satisfies AirQualityCountriesResult;
      }

      // Build markdown
      let markdown = "### Countries with Air Quality Data\n\n";
      markdown += "| Country | Code | Locations | Parameters |\n";
      markdown += "|---------|------|-----------|------------|\n";

      for (const c of data.results.slice(0, 30)) {
        markdown += `| ${c.name} | ${c.code} | ${c.locations.toLocaleString()} | ${c.parameters.slice(0, 4).join(", ")} |\n`;
      }

      markdown += "\n*Source: OpenAQ*";

      return {
        success: true,
        countries: data.results,
        markdown,
      } satisfies AirQualityCountriesResult;
    } catch (error) {
      return {
        success: false,
        countries: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies AirQualityCountriesResult;
    }
  },
});
