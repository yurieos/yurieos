/**
 * Biodiversity & Species Tools
 *
 * Provides access to biodiversity data:
 *
 * 1. GBIF - Global Biodiversity Information Facility
 *    - 2.5B+ species occurrence records
 *    @see https://www.gbif.org/developer/summary
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const GBIF_API_BASE = "https://api.gbif.org/v1";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type GbifSpecies = {
  key: number;
  nubKey?: number;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  rank?: string;
  taxonomicStatus?: string;
  numDescendants?: number;
  numOccurrences?: number;
  authorship?: string;
};

type GbifOccurrence = {
  key: number;
  scientificName: string;
  species?: string;
  genericName?: string;
  specificEpithet?: string;
  country?: string;
  countryCode?: string;
  stateProvince?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  year?: number;
  month?: number;
  day?: number;
  basisOfRecord?: string;
  institutionCode?: string;
  collectionCode?: string;
  catalogNumber?: string;
  datasetName?: string;
  publishingCountry?: string;
  recordedBy?: string;
  identifiedBy?: string;
  media?: Array<{
    type: string;
    identifier: string;
  }>;
};

type GbifSpeciesSearchResponse = {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count?: number;
  results: GbifSpecies[];
};

type GbifOccurrenceSearchResponse = {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count: number;
  results: GbifOccurrence[];
};

// =============================================================================
// Helpers
// =============================================================================

function formatTaxonomy(species: GbifSpecies): string {
  const parts: string[] = [];
  if (species.kingdom) {
    parts.push(species.kingdom);
  }
  if (species.phylum) {
    parts.push(species.phylum);
  }
  if (species.class) {
    parts.push(species.class);
  }
  if (species.order) {
    parts.push(species.order);
  }
  if (species.family) {
    parts.push(species.family);
  }
  return parts.join(" > ");
}

function formatSpeciesMarkdown(species: GbifSpecies): string {
  const parts: string[] = [];

  // Name with link
  const url = `https://www.gbif.org/species/${species.key}`;
  const displayName = species.vernacularName
    ? `${species.vernacularName} (*${species.canonicalName || species.scientificName}*)`
    : `*${species.canonicalName || species.scientificName}*`;
  parts.push(`### [${displayName}](${url})`);

  // Scientific name with authorship
  if (species.authorship) {
    parts.push(`**Scientific Name:** ${species.scientificName}`);
  }

  // Rank
  if (species.rank) {
    parts.push(`**Rank:** ${species.rank}`);
  }

  // Taxonomy
  const taxonomy = formatTaxonomy(species);
  if (taxonomy) {
    parts.push(`**Taxonomy:** ${taxonomy}`);
  }

  // Status
  if (species.taxonomicStatus) {
    parts.push(`**Status:** ${species.taxonomicStatus}`);
  }

  // Occurrence count
  if (species.numOccurrences) {
    parts.push(`**Occurrences:** ${species.numOccurrences.toLocaleString()}`);
  }

  return parts.join("\n");
}

function formatOccurrenceMarkdown(occurrence: GbifOccurrence): string {
  const parts: string[] = [];

  // Species with link
  const url = `https://www.gbif.org/occurrence/${occurrence.key}`;
  parts.push(`### [${occurrence.scientificName}](${url})`);

  // Location
  const location: string[] = [];
  if (occurrence.stateProvince) {
    location.push(occurrence.stateProvince);
  }
  if (occurrence.country) {
    location.push(occurrence.country);
  }
  if (location.length > 0) {
    parts.push(`**Location:** ${location.join(", ")}`);
  }

  // Coordinates
  if (occurrence.decimalLatitude && occurrence.decimalLongitude) {
    parts.push(
      `**Coordinates:** ${occurrence.decimalLatitude.toFixed(4)}, ${occurrence.decimalLongitude.toFixed(4)}`
    );
  }

  // Date
  if (occurrence.eventDate) {
    parts.push(`**Date:** ${occurrence.eventDate}`);
  } else if (occurrence.year) {
    const date = [occurrence.year, occurrence.month, occurrence.day]
      .filter(Boolean)
      .join("-");
    parts.push(`**Date:** ${date}`);
  }

  // Basis of record
  if (occurrence.basisOfRecord) {
    parts.push(`**Basis:** ${occurrence.basisOfRecord.replace("_", " ")}`);
  }

  // Institution
  if (occurrence.institutionCode) {
    parts.push(`**Institution:** ${occurrence.institutionCode}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search GBIF Species
// =============================================================================

export type GbifSpeciesItem = {
  key: number;
  scientificName: string;
  canonicalName?: string;
  vernacularName?: string;
  rank?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  taxonomicStatus?: string;
  numOccurrences?: number;
  url: string;
  markdown: string;
};

export type GbifSpeciesSearchResult = {
  success: boolean;
  query: string;
  total: number;
  species: GbifSpeciesItem[];
  error?: string;
};

export const gbifSpeciesSearchTool = tool({
  description:
    "Search GBIF for species information and taxonomy. " +
    "GBIF is the world's largest biodiversity database. " +
    "Use for: species identification, taxonomy lookup, biodiversity research, " +
    "conservation studies, ecological research.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Species name to search. Can be common name or scientific name. " +
          "Examples: 'wolf', 'Canis lupus', 'oak tree', 'Quercus robur'"
      ),
    rank: z
      .string()
      .optional()
      .describe(
        "Filter by taxonomic rank. " +
          "Options: 'KINGDOM', 'PHYLUM', 'CLASS', 'ORDER', 'FAMILY', 'GENUS', 'SPECIES'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum species to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, rank, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        q: query,
        limit: searchLimit.toString(),
      });

      if (rank) {
        params.append("rank", rank.toUpperCase());
      }

      const response = await fetch(
        `${GBIF_API_BASE}/species/search?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }

      const data = (await response.json()) as GbifSpeciesSearchResponse;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          species: [],
          error: "No species found. Try a different name.",
        } satisfies GbifSpeciesSearchResult;
      }

      const species: GbifSpeciesItem[] = data.results.map((sp) => ({
        key: sp.key,
        scientificName: sp.scientificName,
        canonicalName: sp.canonicalName,
        vernacularName: sp.vernacularName,
        rank: sp.rank,
        kingdom: sp.kingdom,
        phylum: sp.phylum,
        class: sp.class,
        order: sp.order,
        family: sp.family,
        genus: sp.genus,
        taxonomicStatus: sp.taxonomicStatus,
        numOccurrences: sp.numOccurrences,
        url: `https://www.gbif.org/species/${sp.key}`,
        markdown: formatSpeciesMarkdown(sp),
      }));

      return {
        success: true,
        query,
        total: data.count || species.length,
        species,
      } satisfies GbifSpeciesSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        species: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies GbifSpeciesSearchResult;
    }
  },
});

// =============================================================================
// Tool: Search GBIF Occurrences
// =============================================================================

export type GbifOccurrenceItem = {
  key: number;
  scientificName: string;
  species?: string;
  country?: string;
  countryCode?: string;
  stateProvince?: string;
  latitude?: number;
  longitude?: number;
  eventDate?: string;
  year?: number;
  basisOfRecord?: string;
  institutionCode?: string;
  datasetName?: string;
  recordedBy?: string;
  url: string;
  markdown: string;
};

export type GbifOccurrenceSearchResult = {
  success: boolean;
  query: string;
  total: number;
  occurrences: GbifOccurrenceItem[];
  error?: string;
};

export const gbifOccurrenceSearchTool = tool({
  description:
    "Search GBIF for species occurrence records (sightings, specimens). " +
    "Contains 2.5B+ occurrence records with locations and dates. " +
    "Use for: species distribution, ecological studies, conservation research, " +
    "finding where species have been observed.",
  inputSchema: z.object({
    speciesName: z
      .string()
      .optional()
      .describe(
        "Species name to search occurrences for. Example: 'Panthera leo'"
      ),
    country: z
      .string()
      .optional()
      .describe("Filter by country code. Example: 'US', 'GB', 'AU'"),
    year: z
      .number()
      .int()
      .optional()
      .describe("Filter by year of observation."),
    hasCoordinate: z
      .boolean()
      .optional()
      .default(true)
      .describe("If true, only return records with coordinates."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum occurrences to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ speciesName, country, year, hasCoordinate, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        limit: searchLimit.toString(),
      });

      if (speciesName) {
        params.append("scientificName", speciesName);
      }
      if (country) {
        params.append("country", country.toUpperCase());
      }
      if (year) {
        params.append("year", year.toString());
      }
      if (hasCoordinate) {
        params.append("hasCoordinate", "true");
      }

      const response = await fetch(
        `${GBIF_API_BASE}/occurrence/search?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }

      const data = (await response.json()) as GbifOccurrenceSearchResponse;

      if (!data.results?.length) {
        return {
          success: true,
          query: speciesName || country || `year:${year}` || "all",
          total: 0,
          occurrences: [],
          error: "No occurrences found. Try different search criteria.",
        } satisfies GbifOccurrenceSearchResult;
      }

      const occurrences: GbifOccurrenceItem[] = data.results.map((occ) => ({
        key: occ.key,
        scientificName: occ.scientificName,
        species: occ.species,
        country: occ.country,
        countryCode: occ.countryCode,
        stateProvince: occ.stateProvince,
        latitude: occ.decimalLatitude,
        longitude: occ.decimalLongitude,
        eventDate: occ.eventDate,
        year: occ.year,
        basisOfRecord: occ.basisOfRecord,
        institutionCode: occ.institutionCode,
        datasetName: occ.datasetName,
        recordedBy: occ.recordedBy,
        url: `https://www.gbif.org/occurrence/${occ.key}`,
        markdown: formatOccurrenceMarkdown(occ),
      }));

      return {
        success: true,
        query: speciesName || country || `year:${year}` || "all",
        total: data.count,
        occurrences,
      } satisfies GbifOccurrenceSearchResult;
    } catch (error) {
      return {
        success: false,
        query: speciesName || "unknown",
        total: 0,
        occurrences: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies GbifOccurrenceSearchResult;
    }
  },
});
