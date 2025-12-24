/**
 * Wikidata Knowledge Graph Tools
 *
 * Provides access to structured knowledge via Wikidata SPARQL:
 *
 * 1. Wikidata - 100M+ structured data items
 *    @see https://www.wikidata.org/wiki/Wikidata:Data_access
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const WIKIDATA_API_BASE = "https://www.wikidata.org/w/api.php";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type WikidataEntity = {
  id: string;
  label?: string;
  description?: string;
  aliases?: string[];
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { title: string }>;
};

type WikidataClaim = {
  mainsnak: {
    datavalue?: {
      value: unknown;
      type: string;
    };
    datatype?: string;
  };
};

type WikidataSearchResult = {
  id: string;
  label: string;
  description?: string;
  match: {
    type: string;
    text: string;
  };
};

type WikidataSearchResponse = {
  search: WikidataSearchResult[];
  "search-continue"?: number;
};

type WikidataEntityResponse = {
  entities: Record<string, WikidataEntity>;
};

type SparqlBinding = {
  type: string;
  value: string;
  "xml:lang"?: string;
};

type SparqlResult = {
  head: { vars: string[] };
  results: {
    bindings: Array<Record<string, SparqlBinding>>;
  };
};

// =============================================================================
// Helpers
// =============================================================================

function extractValue(claim: WikidataClaim): string {
  const datavalue = claim.mainsnak.datavalue;
  if (!datavalue) return "N/A";

  switch (datavalue.type) {
    case "wikibase-entityid": {
      const entityId = datavalue.value as { id: string };
      return entityId.id;
    }
    case "time": {
      const time = datavalue.value as { time: string };
      // Extract year from +YYYY-MM-DDT00:00:00Z format
      const match = time.time.match(/([+-]\d{4})/);
      return match ? match[1].replace("+", "") : time.time;
    }
    case "quantity": {
      const qty = datavalue.value as { amount: string; unit?: string };
      const amount = Number.parseFloat(qty.amount);
      if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
      if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
      if (Math.abs(amount) >= 1e3) return amount.toLocaleString();
      return amount.toString();
    }
    case "monolingualtext": {
      const text = datavalue.value as { text: string };
      return text.text;
    }
    case "string":
      return datavalue.value as string;
    default:
      return JSON.stringify(datavalue.value);
  }
}

function formatEntityMarkdown(entity: WikidataEntity, lang = "en"): string {
  const parts: string[] = [];

  // Title with link
  const label = entity.label || entity.id;
  const url = `https://www.wikidata.org/wiki/${entity.id}`;
  parts.push(`### [${label}](${url})`);

  // Wikidata ID
  parts.push(`**Wikidata ID:** ${entity.id}`);

  // Description
  if (entity.description) {
    parts.push(`*${entity.description}*`);
  }

  // Aliases
  if (entity.aliases && entity.aliases.length > 0) {
    parts.push(`**Also known as:** ${entity.aliases.slice(0, 5).join(", ")}`);
  }

  // Wikipedia link
  const wikiLink = entity.sitelinks?.[`${lang}wiki`];
  if (wikiLink) {
    const wikiUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(wikiLink.title.replace(/ /g, "_"))}`;
    parts.push(`📖 [Wikipedia](${wikiUrl})`);
  }

  return parts.join("\n");
}

async function sparqlQuery(query: string): Promise<SparqlResult> {
  const response = await fetch(WIKIDATA_SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Yurie Research Assistant/1.0",
    },
    body: `query=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SPARQL query failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<SparqlResult>;
}

// =============================================================================
// Tool: Search Wikidata Entities
// =============================================================================

export type WikidataSearchResultItem = {
  id: string;
  label: string;
  description?: string;
  url: string;
  matchType: string;
  matchText: string;
};

export type WikidataSearchToolResult = {
  success: boolean;
  query: string;
  total: number;
  entities: WikidataSearchResultItem[];
  error?: string;
  markdown: string;
};

export const wikidataSearchTool = tool({
  description:
    "Search Wikidata for structured knowledge entities (people, places, concepts, organizations). " +
    "Wikidata contains 100M+ items with structured facts and relationships. " +
    "Use for: entity disambiguation, finding structured facts, knowledge graph queries, " +
    "getting precise data like dates, populations, coordinates.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search term for Wikidata entities. " +
          "Examples: 'Albert Einstein', 'Tokyo', 'Python programming language', 'COVID-19'"
      ),
    language: z
      .string()
      .optional()
      .default("en")
      .describe("Language code for labels. Default: 'en'."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum entities to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, language, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );
      const lang = language || "en";

      const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: lang,
        format: "json",
        limit: searchLimit.toString(),
        origin: "*",
      });

      const response = await fetch(
        `${WIKIDATA_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Wikidata API error: ${response.status}`);
      }

      const data = (await response.json()) as WikidataSearchResponse;

      if (!data.search?.length) {
        return {
          success: true,
          query,
          total: 0,
          entities: [],
          error: "No Wikidata entities found. Try different search terms.",
          markdown: `No Wikidata entities found for "${query}".`,
        } satisfies WikidataSearchToolResult;
      }

      const entities: WikidataSearchResultItem[] = data.search.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        url: `https://www.wikidata.org/wiki/${item.id}`,
        matchType: item.match.type,
        matchText: item.match.text,
      }));

      // Build markdown
      let markdown = `### Wikidata Search: "${query}"\n\n`;
      markdown += `Found ${entities.length} entities.\n\n`;

      for (const entity of entities) {
        markdown += `**[${entity.label}](${entity.url})** (${entity.id})\n`;
        if (entity.description) {
          markdown += `*${entity.description}*\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: Wikidata*";

      return {
        success: true,
        query,
        total: entities.length,
        entities,
        markdown,
      } satisfies WikidataSearchToolResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        entities: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies WikidataSearchToolResult;
    }
  },
});

// =============================================================================
// Tool: Get Wikidata Entity Details
// =============================================================================

export type WikidataProperty = {
  property: string;
  propertyLabel?: string;
  value: string;
  valueLabel?: string;
};

export type WikidataEntityDetailsResult = {
  success: boolean;
  id: string;
  entity?: {
    id: string;
    label: string;
    description?: string;
    aliases: string[];
    wikipediaUrl?: string;
    properties: WikidataProperty[];
    markdown: string;
  };
  error?: string;
};

export const getWikidataEntityTool = tool({
  description:
    "Get detailed structured information about a Wikidata entity by ID. " +
    "Returns all properties and values for the entity. " +
    "Use after searching to get complete entity details with structured facts.",
  inputSchema: z.object({
    entityId: z
      .string()
      .min(1)
      .describe(
        "Wikidata entity ID (starts with Q). Example: 'Q937' (Albert Einstein)"
      ),
    language: z
      .string()
      .optional()
      .default("en")
      .describe("Language code for labels. Default: 'en'."),
  }),
  execute: async ({ entityId, language }) => {
    try {
      const lang = language || "en";
      const id = entityId.toUpperCase();

      // Fetch entity data
      const params = new URLSearchParams({
        action: "wbgetentities",
        ids: id,
        languages: lang,
        format: "json",
        origin: "*",
      });

      const response = await fetch(
        `${WIKIDATA_API_BASE}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Yurie Research Assistant/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Wikidata API error: ${response.status}`);
      }

      const data = (await response.json()) as WikidataEntityResponse;
      const entity = data.entities[id];

      if (!entity || entity.id === "-1") {
        return {
          success: false,
          id,
          error: `Entity not found: ${id}`,
        } satisfies WikidataEntityDetailsResult;
      }

      // Extract labels
      const labelData = (
        entity as unknown as { labels?: Record<string, { value: string }> }
      ).labels;
      const label = labelData?.[lang]?.value || id;

      const descData = (
        entity as unknown as {
          descriptions?: Record<string, { value: string }>;
        }
      ).descriptions;
      const description = descData?.[lang]?.value;

      const aliasData = (
        entity as unknown as {
          aliases?: Record<string, Array<{ value: string }>>;
        }
      ).aliases;
      const aliases = aliasData?.[lang]?.map((a) => a.value) || [];

      // Get Wikipedia URL
      const wikiLink = entity.sitelinks?.[`${lang}wiki`];
      const wikipediaUrl = wikiLink
        ? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(wikiLink.title.replace(/ /g, "_"))}`
        : undefined;

      // Extract properties (first 20 for brevity)
      const properties: WikidataProperty[] = [];
      if (entity.claims) {
        const claimKeys = Object.keys(entity.claims).slice(0, 20);
        for (const prop of claimKeys) {
          const claims = entity.claims[prop];
          if (claims && claims.length > 0) {
            const value = extractValue(claims[0]);
            properties.push({
              property: prop,
              value,
            });
          }
        }
      }

      // Build markdown
      const parts: string[] = [];
      const url = `https://www.wikidata.org/wiki/${id}`;
      parts.push(`### [${label}](${url})`);
      parts.push(`**Wikidata ID:** ${id}`);

      if (description) {
        parts.push(`*${description}*`);
      }

      if (aliases.length > 0) {
        parts.push(`**Also known as:** ${aliases.slice(0, 5).join(", ")}`);
      }

      if (wikipediaUrl) {
        parts.push(`📖 [Wikipedia](${wikipediaUrl})`);
      }

      if (properties.length > 0) {
        parts.push("\n**Properties:**");
        for (const prop of properties.slice(0, 15)) {
          parts.push(`- ${prop.property}: ${prop.value}`);
        }
      }

      parts.push("\n*Source: Wikidata*");

      return {
        success: true,
        id,
        entity: {
          id,
          label,
          description,
          aliases,
          wikipediaUrl,
          properties,
          markdown: parts.join("\n"),
        },
      } satisfies WikidataEntityDetailsResult;
    } catch (error) {
      return {
        success: false,
        id: entityId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies WikidataEntityDetailsResult;
    }
  },
});

// =============================================================================
// Tool: SPARQL Query (Advanced)
// =============================================================================

export type SparqlQueryResult = {
  success: boolean;
  query: string;
  variables: string[];
  results: Array<Record<string, string>>;
  total: number;
  error?: string;
  markdown: string;
};

export const wikidataSparqlTool = tool({
  description:
    "Execute a SPARQL query against Wikidata for advanced knowledge graph queries. " +
    "Use for complex queries like: finding all items with specific properties, " +
    "aggregations, relationships between entities, and custom data extraction. " +
    "Requires knowledge of SPARQL syntax.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "SPARQL query to execute. Must be a valid SPARQL SELECT query. " +
          "Example: 'SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q6256. SERVICE wikibase:label { bd:serviceParam wikibase:language \"en\". } } LIMIT 10'"
      ),
  }),
  execute: async ({ query }) => {
    try {
      const result = await sparqlQuery(query);

      const variables = result.head.vars;
      const bindings = result.results.bindings;

      const results: Array<Record<string, string>> = bindings.map((binding) => {
        const row: Record<string, string> = {};
        for (const varName of variables) {
          row[varName] = binding[varName]?.value || "";
        }
        return row;
      });

      // Build markdown table
      let markdown = "### SPARQL Query Results\n\n";

      if (results.length === 0) {
        markdown += "No results found.\n";
      } else {
        // Header
        markdown += `| ${variables.join(" | ")} |\n`;
        markdown += `| ${variables.map(() => "---").join(" | ")} |\n`;

        // Rows (limit to 20 for readability)
        for (const row of results.slice(0, 20)) {
          const cells = variables.map((v) => {
            let val = row[v] || "";
            // Shorten Wikidata URIs
            val = val.replace("http://www.wikidata.org/entity/", "");
            // Truncate long values
            if (val.length > 50) val = val.slice(0, 47) + "...";
            return val;
          });
          markdown += `| ${cells.join(" | ")} |\n`;
        }

        if (results.length > 20) {
          markdown += `\n*... and ${results.length - 20} more results*`;
        }
      }

      markdown += "\n\n*Source: Wikidata SPARQL*";

      return {
        success: true,
        query,
        variables,
        results,
        total: results.length,
        markdown,
      } satisfies SparqlQueryResult;
    } catch (error) {
      return {
        success: false,
        query,
        variables: [],
        results: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error executing SPARQL query: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies SparqlQueryResult;
    }
  },
});
