/**
 * Research Identity Tools
 *
 * Provides access to researcher and organization identity systems:
 *
 * 1. ORCID - Researcher identifiers and profiles
 *    @see https://pub.orcid.org/v3.0/
 *
 * 2. ROR - Research Organization Registry
 *    @see https://ror.readme.io/docs
 *
 * No API keys required (public APIs).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const ORCID_API_BASE = "https://pub.orcid.org/v3.0";
const ROR_API_BASE = "https://api.ror.org";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type OrcidName = {
  "given-names"?: { value: string };
  "family-name"?: { value: string };
  "credit-name"?: { value: string };
};

type OrcidAffiliation = {
  organization?: {
    name: string;
    address?: {
      city?: string;
      country?: string;
    };
  };
  "start-date"?: { year?: { value: string } };
  "end-date"?: { year?: { value: string } };
  "role-title"?: string;
};

type OrcidWork = {
  "put-code": number;
  title?: { title?: { value: string } };
  type?: string;
  "publication-date"?: { year?: { value: string } };
  "external-ids"?: {
    "external-id"?: Array<{
      "external-id-type": string;
      "external-id-value": string;
    }>;
  };
};

type OrcidRecord = {
  "orcid-identifier": {
    path: string;
    uri: string;
  };
  person?: {
    name?: OrcidName;
    biography?: { content?: string };
    emails?: {
      email?: Array<{ email: string }>;
    };
    keywords?: {
      keyword?: Array<{ content: string }>;
    };
  };
  "activities-summary"?: {
    employments?: {
      "affiliation-group"?: Array<{
        summaries?: Array<{ "employment-summary": OrcidAffiliation }>;
      }>;
    };
    works?: {
      group?: Array<{
        "work-summary"?: OrcidWork[];
      }>;
    };
  };
};

type OrcidSearchResponse = {
  "num-found": number;
  result?: Array<{
    "orcid-identifier": {
      path: string;
      uri: string;
    };
  }>;
};

type RorOrganization = {
  id: string;
  name: string;
  types: string[];
  aliases: string[];
  acronyms: string[];
  links: string[];
  wikipedia_url?: string;
  country: {
    country_code: string;
    country_name: string;
  };
  addresses: Array<{
    city?: string;
    state?: string;
    country_geonames_id?: number;
  }>;
  established?: number;
  relationships: Array<{
    type: string;
    label: string;
    id: string;
  }>;
};

type RorSearchResponse = {
  number_of_results: number;
  items: RorOrganization[];
};

// =============================================================================
// Helpers
// =============================================================================

function formatOrcidName(name?: OrcidName): string {
  if (name?.["credit-name"]?.value) {
    return name["credit-name"].value;
  }
  const given = name?.["given-names"]?.value || "";
  const family = name?.["family-name"]?.value || "";
  return `${given} ${family}`.trim() || "Unknown";
}

function formatResearcherMarkdown(record: OrcidRecord): string {
  const parts: string[] = [];

  const name = formatOrcidName(record.person?.name);
  const orcidId = record["orcid-identifier"].path;
  const url = record["orcid-identifier"].uri;

  parts.push(`### [${name}](${url})`);
  parts.push(`**ORCID:** ${orcidId}`);

  // Biography
  if (record.person?.biography?.content) {
    const bio = record.person.biography.content.slice(0, 300);
    parts.push(
      `**Bio:** ${bio}${record.person.biography.content.length > 300 ? "..." : ""}`
    );
  }

  // Keywords
  if (record.person?.keywords?.keyword?.length) {
    const keywords = record.person.keywords.keyword
      .slice(0, 5)
      .map((k) => k.content)
      .join(", ");
    parts.push(`**Keywords:** ${keywords}`);
  }

  // Current affiliation
  const employments =
    record["activities-summary"]?.employments?.["affiliation-group"];
  if (employments?.length) {
    const current = employments[0]?.summaries?.[0]?.["employment-summary"];
    if (current?.organization?.name) {
      parts.push(`**Affiliation:** ${current.organization.name}`);
    }
  }

  // Work count
  const workGroups = record["activities-summary"]?.works?.group;
  if (workGroups?.length) {
    parts.push(`**Publications:** ${workGroups.length} works`);
  }

  return parts.join("\n");
}

function formatOrganizationMarkdown(org: RorOrganization): string {
  const parts: string[] = [];

  const url = `https://ror.org/${org.id.split("/").pop()}`;
  parts.push(`### [${org.name}](${url})`);
  parts.push(`**ROR ID:** ${org.id}`);

  // Type
  if (org.types.length > 0) {
    parts.push(`**Type:** ${org.types.join(", ")}`);
  }

  // Location
  const location = [org.addresses[0]?.city, org.country.country_name]
    .filter(Boolean)
    .join(", ");
  if (location) {
    parts.push(`**Location:** ${location}`);
  }

  // Established
  if (org.established) {
    parts.push(`**Established:** ${org.established}`);
  }

  // Aliases
  if (org.aliases.length > 0 || org.acronyms.length > 0) {
    const names = [...org.acronyms, ...org.aliases.slice(0, 3)].join(", ");
    parts.push(`**Also known as:** ${names}`);
  }

  // Links
  if (org.links.length > 0) {
    parts.push(`**Website:** ${org.links[0]}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search ORCID Researchers
// =============================================================================

export type OrcidResearcherItem = {
  orcid: string;
  name: string;
  biography?: string;
  keywords: string[];
  affiliation?: string;
  workCount: number;
  url: string;
  markdown: string;
};

export type OrcidSearchResult = {
  success: boolean;
  query: string;
  total: number;
  researchers: OrcidResearcherItem[];
  error?: string;
};

export const orcidSearchTool = tool({
  description:
    "Search ORCID for researchers by name. " +
    "ORCID provides unique identifiers for researchers worldwide. " +
    "Use for: finding researchers, verifying author identity, " +
    "getting researcher profiles and publication lists.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Researcher name to search. " +
          "Examples: 'Albert Einstein', 'Marie Curie', 'Geoffrey Hinton'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum researchers to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Search for ORCID IDs
      const searchResponse = await fetch(
        `${ORCID_API_BASE}/search?q=${encodeURIComponent(query)}&rows=${searchLimit}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!searchResponse.ok) {
        throw new Error(`ORCID API error: ${searchResponse.status}`);
      }

      const searchData = (await searchResponse.json()) as OrcidSearchResponse;

      if (!searchData.result?.length) {
        return {
          success: true,
          query,
          total: 0,
          researchers: [],
          error: "No researchers found. Try a different name.",
        } satisfies OrcidSearchResult;
      }

      // Fetch details for each ORCID
      const researchers: OrcidResearcherItem[] = [];

      for (const result of searchData.result.slice(0, searchLimit)) {
        const orcidId = result["orcid-identifier"].path;

        const detailResponse = await fetch(
          `${ORCID_API_BASE}/${orcidId}/record`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (detailResponse.ok) {
          const record = (await detailResponse.json()) as OrcidRecord;

          const employments =
            record["activities-summary"]?.employments?.["affiliation-group"];
          const currentAffiliation =
            employments?.[0]?.summaries?.[0]?.["employment-summary"]
              ?.organization?.name;
          const workCount =
            record["activities-summary"]?.works?.group?.length || 0;

          researchers.push({
            orcid: orcidId,
            name: formatOrcidName(record.person?.name),
            biography: record.person?.biography?.content,
            keywords:
              record.person?.keywords?.keyword?.map((k) => k.content) || [],
            affiliation: currentAffiliation,
            workCount,
            url: record["orcid-identifier"].uri,
            markdown: formatResearcherMarkdown(record),
          });
        }
      }

      return {
        success: true,
        query,
        total: searchData["num-found"],
        researchers,
      } satisfies OrcidSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        researchers: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies OrcidSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get ORCID Profile
// =============================================================================

export type OrcidProfileResult = {
  success: boolean;
  orcid: string;
  profile?: OrcidResearcherItem & {
    email?: string;
    employments: Array<{
      organization: string;
      role?: string;
      startYear?: string;
      endYear?: string;
    }>;
    recentWorks: Array<{
      title: string;
      type?: string;
      year?: string;
      doi?: string;
    }>;
  };
  error?: string;
};

export const getOrcidProfileTool = tool({
  description:
    "Get detailed ORCID profile by ORCID ID. " +
    "Returns full researcher profile including affiliations and works. " +
    "Use after searching to get complete researcher details.",
  inputSchema: z.object({
    orcid: z
      .string()
      .min(1)
      .describe(
        "ORCID ID (16 digits with hyphens). Example: '0000-0002-1825-0097'"
      ),
  }),
  execute: async ({ orcid }) => {
    try {
      const response = await fetch(`${ORCID_API_BASE}/${orcid}/record`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            orcid,
            error: `ORCID not found: ${orcid}`,
          } satisfies OrcidProfileResult;
        }
        throw new Error(`ORCID API error: ${response.status}`);
      }

      const record = (await response.json()) as OrcidRecord;

      // Extract employments
      const employments: OrcidProfileResult["profile"] extends undefined
        ? never
        : NonNullable<OrcidProfileResult["profile"]>["employments"] = [];
      const affGroups =
        record["activities-summary"]?.employments?.["affiliation-group"];
      if (affGroups) {
        for (const group of affGroups.slice(0, 5)) {
          const emp = group.summaries?.[0]?.["employment-summary"];
          if (emp?.organization?.name) {
            employments.push({
              organization: emp.organization.name,
              role: emp["role-title"],
              startYear: emp["start-date"]?.year?.value,
              endYear: emp["end-date"]?.year?.value,
            });
          }
        }
      }

      // Extract works
      const recentWorks: OrcidProfileResult["profile"] extends undefined
        ? never
        : NonNullable<OrcidProfileResult["profile"]>["recentWorks"] = [];
      const workGroups = record["activities-summary"]?.works?.group;
      if (workGroups) {
        for (const group of workGroups.slice(0, 10)) {
          const work = group["work-summary"]?.[0];
          if (work?.title?.title?.value) {
            const doi = work["external-ids"]?.["external-id"]?.find(
              (id) => id["external-id-type"] === "doi"
            )?.["external-id-value"];

            recentWorks.push({
              title: work.title.title.value,
              type: work.type,
              year: work["publication-date"]?.year?.value,
              doi,
            });
          }
        }
      }

      const profile = {
        orcid: record["orcid-identifier"].path,
        name: formatOrcidName(record.person?.name),
        biography: record.person?.biography?.content,
        keywords: record.person?.keywords?.keyword?.map((k) => k.content) || [],
        affiliation: employments[0]?.organization,
        workCount: workGroups?.length || 0,
        url: record["orcid-identifier"].uri,
        markdown: formatResearcherMarkdown(record),
        email: record.person?.emails?.email?.[0]?.email,
        employments,
        recentWorks,
      };

      return {
        success: true,
        orcid,
        profile,
      } satisfies OrcidProfileResult;
    } catch (error) {
      return {
        success: false,
        orcid,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies OrcidProfileResult;
    }
  },
});

// =============================================================================
// Tool: Search ROR Organizations
// =============================================================================

export type RorOrganizationItem = {
  id: string;
  name: string;
  types: string[];
  country: string;
  countryCode: string;
  city?: string;
  established?: number;
  aliases: string[];
  acronyms: string[];
  website?: string;
  wikipediaUrl?: string;
  url: string;
  markdown: string;
};

export type RorSearchResult = {
  success: boolean;
  query: string;
  total: number;
  organizations: RorOrganizationItem[];
  error?: string;
};

export const rorSearchTool = tool({
  description:
    "Search ROR (Research Organization Registry) for research institutions. " +
    "ROR provides unique identifiers for research organizations worldwide. " +
    "Use for: finding institution identifiers, verifying affiliations, " +
    "getting organization details and relationships.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Organization name to search. " +
          "Examples: 'MIT', 'Stanford University', 'Max Planck', 'CERN'"
      ),
    country: z
      .string()
      .optional()
      .describe("Filter by country code. Examples: 'US', 'DE', 'UK', 'JP'"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum organizations to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, country, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      let url = `${ROR_API_BASE}/organizations?query=${encodeURIComponent(query)}`;
      if (country) {
        url += `&filter=country.country_code:${country}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ROR API error: ${response.status}`);
      }

      const data = (await response.json()) as RorSearchResponse;

      if (!data.items?.length) {
        return {
          success: true,
          query,
          total: 0,
          organizations: [],
          error: "No organizations found. Try a different name.",
        } satisfies RorSearchResult;
      }

      const organizations: RorOrganizationItem[] = data.items
        .slice(0, searchLimit)
        .map((org) => ({
          id: org.id,
          name: org.name,
          types: org.types,
          country: org.country.country_name,
          countryCode: org.country.country_code,
          city: org.addresses[0]?.city,
          established: org.established,
          aliases: org.aliases,
          acronyms: org.acronyms,
          website: org.links[0],
          wikipediaUrl: org.wikipedia_url,
          url: `https://ror.org/${org.id.split("/").pop()}`,
          markdown: formatOrganizationMarkdown(org),
        }));

      return {
        success: true,
        query,
        total: data.number_of_results,
        organizations,
      } satisfies RorSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        organizations: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies RorSearchResult;
    }
  },
});
