/**
 * OpenStreetMap Nominatim Geocoding Tools
 *
 * Provides geocoding and reverse geocoding:
 *
 * 1. Nominatim - OSM-based geocoding service
 *    @see https://nominatim.org/release-docs/latest/api/Overview/
 *
 * No API key required (rate limited to 1 request/second).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const NOMINATIM_API_BASE = "https://nominatim.openstreetmap.org";

const MAX_RESULTS_DEFAULT = 5;
const MAX_RESULTS_LIMIT = 20;

// =============================================================================
// Types
// =============================================================================

type NominatimAddress = {
  house_number?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

type NominatimPlace = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: NominatimAddress;
  boundingbox?: [string, string, string, string];
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
};

// =============================================================================
// Helpers
// =============================================================================

function formatCoordinates(lat: string, lon: string): string {
  const latNum = Number.parseFloat(lat);
  const lonNum = Number.parseFloat(lon);
  const latDir = latNum >= 0 ? "N" : "S";
  const lonDir = lonNum >= 0 ? "E" : "W";
  return `${Math.abs(latNum).toFixed(6)}°${latDir}, ${Math.abs(lonNum).toFixed(6)}°${lonDir}`;
}

function formatAddress(address: NominatimAddress): string {
  const parts: string[] = [];

  // Street address
  if (address.house_number && address.road) {
    parts.push(`${address.house_number} ${address.road}`);
  } else if (address.road) {
    parts.push(address.road);
  }

  // City/Town
  const city =
    address.city || address.town || address.village || address.municipality;
  if (city) parts.push(city);

  // State/Region
  if (address.state) parts.push(address.state);

  // Postal code
  if (address.postcode) parts.push(address.postcode);

  // Country
  if (address.country) parts.push(address.country);

  return parts.join(", ");
}

function formatPlaceMarkdown(place: NominatimPlace): string {
  const parts: string[] = [];

  // Name/Display name
  const name = place.namedetails?.name || place.display_name.split(",")[0];
  const osmUrl = `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`;
  parts.push(`### [${name}](${osmUrl})`);

  // Full address
  parts.push(`**Address:** ${place.display_name}`);

  // Coordinates
  parts.push(`**Coordinates:** ${formatCoordinates(place.lat, place.lon)}`);

  // Type
  parts.push(`**Type:** ${place.class}/${place.type}`);

  // Importance score
  parts.push(`**Importance:** ${(place.importance * 100).toFixed(1)}%`);

  // Bounding box
  if (place.boundingbox) {
    parts.push(
      `**Bounds:** [${place.boundingbox[0]}, ${place.boundingbox[2]}] to [${place.boundingbox[1]}, ${place.boundingbox[3]}]`
    );
  }

  // Extra tags (select important ones)
  if (place.extratags) {
    const extraParts: string[] = [];
    if (place.extratags.wikipedia) {
      const wikiLang = place.extratags.wikipedia.split(":")[0] || "en";
      const wikiTitle =
        place.extratags.wikipedia.split(":")[1] || place.extratags.wikipedia;
      extraParts.push(
        `[Wikipedia](https://${wikiLang}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))})`
      );
    }
    if (place.extratags.website) {
      extraParts.push(`[Website](${place.extratags.website})`);
    }
    if (place.extratags.wikidata) {
      extraParts.push(
        `[Wikidata](https://www.wikidata.org/wiki/${place.extratags.wikidata})`
      );
    }
    if (place.extratags.population) {
      extraParts.push(
        `Population: ${Number(place.extratags.population).toLocaleString()}`
      );
    }
    if (extraParts.length > 0) {
      parts.push(`**Links:** ${extraParts.join(" | ")}`);
    }
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Geocode Address
// =============================================================================

export type GeocodedPlace = {
  placeId: number;
  osmType: string;
  osmId: number;
  lat: number;
  lon: number;
  displayName: string;
  type: string;
  importance: number;
  address?: NominatimAddress;
  osmUrl: string;
};

export type GeocodeResult = {
  success: boolean;
  query: string;
  total: number;
  places: GeocodedPlace[];
  error?: string;
  markdown: string;
};

export const geocodeTool = tool({
  description:
    "Geocode an address or place name to get coordinates and location details. " +
    "Uses OpenStreetMap Nominatim service. " +
    "Use for: converting addresses to coordinates, finding places by name, " +
    "getting location details for cities, landmarks, or addresses.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Address or place name to geocode. " +
          "Examples: '1600 Pennsylvania Ave, Washington DC', 'Eiffel Tower, Paris', " +
          "'Tokyo, Japan', 'Mount Everest'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
    countryCode: z
      .string()
      .length(2)
      .optional()
      .describe(
        "Limit results to country. ISO 3166-1 alpha-2 code (e.g., 'us', 'gb', 'jp')."
      ),
  }),
  execute: async ({ query, limit, countryCode }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        extratags: "1",
        namedetails: "1",
        limit: searchLimit.toString(),
      });

      if (countryCode) {
        params.set("countrycodes", countryCode.toLowerCase());
      }

      const response = await fetch(
        `${NOMINATIM_API_BASE}/search?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = (await response.json()) as NominatimPlace[];

      if (!data.length) {
        return {
          success: true,
          query,
          total: 0,
          places: [],
          error:
            "No locations found. Try a different or more specific address.",
          markdown: `No locations found for "${query}".`,
        } satisfies GeocodeResult;
      }

      const places: GeocodedPlace[] = data.map((place) => ({
        placeId: place.place_id,
        osmType: place.osm_type,
        osmId: place.osm_id,
        lat: Number.parseFloat(place.lat),
        lon: Number.parseFloat(place.lon),
        displayName: place.display_name,
        type: `${place.class}/${place.type}`,
        importance: place.importance,
        address: place.address,
        osmUrl: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
      }));

      // Build markdown
      let markdown = `### Geocoding Results: "${query}"\n\n`;
      markdown += `Found ${data.length} location(s).\n\n`;

      for (const place of data) {
        markdown += formatPlaceMarkdown(place) + "\n\n---\n\n";
      }

      markdown += "*Source: OpenStreetMap Nominatim*";

      return {
        success: true,
        query,
        total: data.length,
        places,
        markdown,
      } satisfies GeocodeResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        places: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies GeocodeResult;
    }
  },
});

// =============================================================================
// Tool: Reverse Geocode
// =============================================================================

export type ReverseGeocodeResult = {
  success: boolean;
  lat: number;
  lon: number;
  place?: GeocodedPlace;
  error?: string;
  markdown: string;
};

export const reverseGeocodeTool = tool({
  description:
    "Reverse geocode coordinates to get address and place information. " +
    "Converts latitude/longitude to a human-readable address. " +
    "Use for: identifying locations from coordinates, getting address details.",
  inputSchema: z.object({
    lat: z
      .number()
      .min(-90)
      .max(90)
      .describe(
        "Latitude in decimal degrees. Example: 40.7128 (for New York)."
      ),
    lon: z
      .number()
      .min(-180)
      .max(180)
      .describe(
        "Longitude in decimal degrees. Example: -74.006 (for New York)."
      ),
    zoom: z
      .number()
      .int()
      .min(0)
      .max(18)
      .optional()
      .default(18)
      .describe(
        "Level of detail (0-18). Higher = more specific. " +
          "3: country, 5: state, 8: county, 10: city, 14: suburb, 16: street, 18: building."
      ),
  }),
  execute: async ({ lat, lon, zoom }) => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: "json",
        addressdetails: "1",
        extratags: "1",
        namedetails: "1",
        zoom: (zoom ?? 18).toString(),
      });

      const response = await fetch(
        `${NOMINATIM_API_BASE}/reverse?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = (await response.json()) as NominatimPlace & {
        error?: string;
      };

      if (data.error) {
        return {
          success: true,
          lat,
          lon,
          error: data.error,
          markdown: `No location found at coordinates (${lat}, ${lon}).`,
        } satisfies ReverseGeocodeResult;
      }

      const place: GeocodedPlace = {
        placeId: data.place_id,
        osmType: data.osm_type,
        osmId: data.osm_id,
        lat: Number.parseFloat(data.lat),
        lon: Number.parseFloat(data.lon),
        displayName: data.display_name,
        type: `${data.class}/${data.type}`,
        importance: data.importance || 0,
        address: data.address,
        osmUrl: `https://www.openstreetmap.org/${data.osm_type}/${data.osm_id}`,
      };

      // Build markdown
      let markdown = `### Reverse Geocoding: (${lat}, ${lon})\n\n`;
      markdown += formatPlaceMarkdown(data);
      markdown += "\n\n*Source: OpenStreetMap Nominatim*";

      return {
        success: true,
        lat,
        lon,
        place,
        markdown,
      } satisfies ReverseGeocodeResult;
    } catch (error) {
      return {
        success: false,
        lat,
        lon,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ReverseGeocodeResult;
    }
  },
});

// =============================================================================
// Tool: Lookup Place by OSM ID
// =============================================================================

export type PlaceLookupResult = {
  success: boolean;
  osmType: string;
  osmId: number;
  place?: GeocodedPlace;
  error?: string;
  markdown: string;
};

export const placeDetailsTool = tool({
  description:
    "Get detailed information about a place using its OpenStreetMap ID. " +
    "Use after geocoding to get more details about a specific place.",
  inputSchema: z.object({
    osmType: z
      .enum(["node", "way", "relation"])
      .describe("OSM object type: 'node', 'way', or 'relation'."),
    osmId: z.number().int().positive().describe("OSM object ID number."),
  }),
  execute: async ({ osmType, osmId }) => {
    try {
      const osmKey = osmType.charAt(0).toUpperCase() + osmId.toString();

      const params = new URLSearchParams({
        osm_ids: osmKey,
        format: "json",
        addressdetails: "1",
        extratags: "1",
        namedetails: "1",
      });

      const response = await fetch(
        `${NOMINATIM_API_BASE}/lookup?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = (await response.json()) as NominatimPlace[];

      if (!data.length) {
        return {
          success: false,
          osmType,
          osmId,
          error: `No place found for ${osmType}/${osmId}.`,
          markdown: `No place found for OSM ${osmType} ${osmId}.`,
        } satisfies PlaceLookupResult;
      }

      const placeData = data[0];
      const place: GeocodedPlace = {
        placeId: placeData.place_id,
        osmType: placeData.osm_type,
        osmId: placeData.osm_id,
        lat: Number.parseFloat(placeData.lat),
        lon: Number.parseFloat(placeData.lon),
        displayName: placeData.display_name,
        type: `${placeData.class}/${placeData.type}`,
        importance: placeData.importance,
        address: placeData.address,
        osmUrl: `https://www.openstreetmap.org/${placeData.osm_type}/${placeData.osm_id}`,
      };

      // Build markdown
      let markdown = `### Place Details: ${osmType}/${osmId}\n\n`;
      markdown += formatPlaceMarkdown(placeData);
      markdown += "\n\n*Source: OpenStreetMap Nominatim*";

      return {
        success: true,
        osmType,
        osmId,
        place,
        markdown,
      } satisfies PlaceLookupResult;
    } catch (error) {
      return {
        success: false,
        osmType,
        osmId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies PlaceLookupResult;
    }
  },
});
