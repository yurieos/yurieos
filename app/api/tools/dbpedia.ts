/**
 * DBpedia Structured Knowledge Tools
 *
 * Provides access to structured data extracted from Wikipedia:
 *
 * 1. DBpedia SPARQL - Structured Wikipedia data
 *    @see https://www.dbpedia.org/resources/sparql/
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const DBPEDIA_SPARQL_ENDPOINT = "https://dbpedia.org/sparql";
const DBPEDIA_LOOKUP_ENDPOINT = "https://lookup.dbpedia.org/api/search";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

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

type DbpediaLookupResult = {
  docs: Array<{
    resource: string[];
    label: string[];
    comment?: string[];
    category?: string[];
    typeName?: string[];
  }>;
};

// =============================================================================
// Helpers
// =============================================================================

async function sparqlQuery(query: string): Promise<SparqlResult> {
  const params = new URLSearchParams({
    query,
    format: "application/sparql-results+json",
  });

  const response = await fetch(
    `${DBPEDIA_SPARQL_ENDPOINT}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/sparql-results+json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DBpedia SPARQL error (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  return response.json() as Promise<SparqlResult>;
}

function extractResourceName(uri: string): string {
  return uri.split("/").pop()?.replace(/_/g, " ") || uri;
}

function formatEntityMarkdown(
  label: string,
  description: string | undefined,
  uri: string,
  properties: Record<string, string>
): string {
  const parts: string[] = [];

  // Title with link
  const wikipediaUrl = uri.replace(
    "http://dbpedia.org/resource/",
    "https://en.wikipedia.org/wiki/"
  );
  parts.push(`### [${label}](${wikipediaUrl})`);

  // DBpedia link
  parts.push(`**DBpedia:** [${extractResourceName(uri)}](${uri})`);

  // Description
  if (description) {
    const truncated =
      description.length > 500
        ? `${description.slice(0, 500)}...`
        : description;
    parts.push(`*${truncated}*`);
  }

  // Properties
  if (Object.keys(properties).length > 0) {
    parts.push("\n**Properties:**");
    for (const [key, value] of Object.entries(properties).slice(0, 15)) {
      const cleanKey = extractResourceName(key);
      parts.push(`- **${cleanKey}:** ${value}`);
    }
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Lookup DBpedia Entity
// =============================================================================

export type DbpediaEntityItem = {
  uri: string;
  label: string;
  description?: string;
  categories: string[];
  types: string[];
  wikipediaUrl: string;
};

export type DbpediaLookupSearchResult = {
  success: boolean;
  query: string;
  total: number;
  entities: DbpediaEntityItem[];
  error?: string;
  markdown: string;
};

export const dbpediaLookupTool = tool({
  description:
    "Lookup entities in DBpedia by name or keyword. " +
    "DBpedia extracts structured data from Wikipedia infoboxes. " +
    "Use for: finding structured facts, entity disambiguation, " +
    "getting Wikipedia data in queryable form.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Entity name or keyword to lookup. " +
          "Examples: 'Albert Einstein', 'Tokyo', 'Python programming', 'Tesla Motors'"
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum entities to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      const limit = Math.min(
        maxResults ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      const params = new URLSearchParams({
        query,
        maxResults: limit.toString(),
        format: "json",
      });

      const response = await fetch(
        `${DBPEDIA_LOOKUP_ENDPOINT}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DBpedia Lookup error: ${response.status}`);
      }

      const data = (await response.json()) as DbpediaLookupResult;

      if (!data.docs?.length) {
        return {
          success: true,
          query,
          total: 0,
          entities: [],
          error: "No DBpedia entities found. Try different search terms.",
          markdown: `No DBpedia entities found for "${query}".`,
        } satisfies DbpediaLookupSearchResult;
      }

      const entities: DbpediaEntityItem[] = data.docs.map((doc) => {
        const uri = doc.resource?.[0] || "";
        return {
          uri,
          label: doc.label?.[0] || extractResourceName(uri),
          description: doc.comment?.[0],
          categories: doc.category?.map(extractResourceName) || [],
          types: doc.typeName || [],
          wikipediaUrl: uri.replace(
            "http://dbpedia.org/resource/",
            "https://en.wikipedia.org/wiki/"
          ),
        };
      });

      // Build markdown
      let markdown = `### DBpedia Lookup: "${query}"\n\n`;
      markdown += `Found ${entities.length} entities.\n\n`;

      for (const entity of entities.slice(0, 10)) {
        markdown += `**[${entity.label}](${entity.wikipediaUrl})**\n`;
        if (entity.description) {
          markdown += `*${entity.description.slice(0, 150)}${entity.description.length > 150 ? "..." : ""}*\n`;
        }
        if (entity.types.length > 0) {
          markdown += `Types: ${entity.types.slice(0, 3).join(", ")}\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: DBpedia*";

      return {
        success: true,
        query,
        total: entities.length,
        entities,
        markdown,
      } satisfies DbpediaLookupSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        entities: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DbpediaLookupSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get DBpedia Entity Details
// =============================================================================

export type DbpediaProperty = {
  property: string;
  propertyLabel: string;
  value: string;
  valueLabel?: string;
};

export type DbpediaEntityDetailsResult = {
  success: boolean;
  uri: string;
  entity?: {
    uri: string;
    label: string;
    description?: string;
    wikipediaUrl: string;
    properties: DbpediaProperty[];
    markdown: string;
  };
  error?: string;
};

export const getDbpediaEntityTool = tool({
  description:
    "Get detailed structured information about a DBpedia entity. " +
    "Returns properties extracted from the Wikipedia infobox. " +
    "Use after lookup to get complete entity details.",
  inputSchema: z.object({
    uri: z
      .string()
      .min(1)
      .describe(
        "DBpedia resource URI or name. " +
          "Examples: 'http://dbpedia.org/resource/Albert_Einstein', 'Albert_Einstein', 'Tokyo'"
      ),
  }),
  execute: async ({ uri }) => {
    try {
      // Normalize URI
      let resourceUri = uri;
      if (!uri.startsWith("http")) {
        resourceUri = `http://dbpedia.org/resource/${uri.replace(/ /g, "_")}`;
      }

      // SPARQL query to get entity properties
      const query = `
        SELECT ?label ?abstract ?property ?value WHERE {
          <${resourceUri}> rdfs:label ?label .
          OPTIONAL { <${resourceUri}> dbo:abstract ?abstract . FILTER(lang(?abstract) = "en") }
          OPTIONAL { <${resourceUri}> ?property ?value . }
          FILTER(lang(?label) = "en")
          FILTER(!isBlank(?value))
          FILTER(STRSTARTS(STR(?property), "http://dbpedia.org/ontology/") || STRSTARTS(STR(?property), "http://dbpedia.org/property/"))
        }
        LIMIT 100
      `;

      const result = await sparqlQuery(query);

      if (!result.results.bindings.length) {
        return {
          success: false,
          uri: resourceUri,
          error: `Entity not found: ${uri}`,
        } satisfies DbpediaEntityDetailsResult;
      }

      const bindings = result.results.bindings;
      const label =
        bindings[0]?.label?.value || extractResourceName(resourceUri);
      const description = bindings[0]?.abstract?.value;

      // Extract unique properties
      const propertiesMap = new Map<string, DbpediaProperty>();
      for (const binding of bindings) {
        if (binding.property && binding.value) {
          const propUri = binding.property.value;
          const propLabel = extractResourceName(propUri);

          // Skip duplicate properties, keep first value
          if (!propertiesMap.has(propUri)) {
            let valueStr = binding.value.value;
            if (valueStr.startsWith("http://dbpedia.org/resource/")) {
              valueStr = extractResourceName(valueStr);
            }

            propertiesMap.set(propUri, {
              property: propUri,
              propertyLabel: propLabel,
              value: valueStr,
            });
          }
        }
      }

      const properties = Array.from(propertiesMap.values()).slice(0, 30);
      const propertiesObj: Record<string, string> = {};
      for (const prop of properties) {
        propertiesObj[prop.propertyLabel] = prop.value;
      }

      const entity = {
        uri: resourceUri,
        label,
        description,
        wikipediaUrl: resourceUri.replace(
          "http://dbpedia.org/resource/",
          "https://en.wikipedia.org/wiki/"
        ),
        properties,
        markdown: formatEntityMarkdown(
          label,
          description,
          resourceUri,
          propertiesObj
        ),
      };

      return {
        success: true,
        uri: resourceUri,
        entity,
      } satisfies DbpediaEntityDetailsResult;
    } catch (error) {
      return {
        success: false,
        uri,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies DbpediaEntityDetailsResult;
    }
  },
});

// =============================================================================
// Tool: DBpedia SPARQL Query
// =============================================================================

export type DbpediaSparqlResult = {
  success: boolean;
  query: string;
  variables: string[];
  results: Array<Record<string, string>>;
  total: number;
  error?: string;
  markdown: string;
};

export const dbpediaSparqlTool = tool({
  description:
    "Execute a SPARQL query against DBpedia for advanced knowledge extraction. " +
    "Use for complex queries involving relationships, aggregations, and filtering. " +
    "DBpedia uses the dbo: (ontology) and dbp: (property) prefixes.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "SPARQL SELECT query. Common prefixes: dbo: (ontology), dbp: (property), dbr: (resource). " +
          "Example: 'SELECT ?person ?birthPlace WHERE { ?person a dbo:Scientist . ?person dbo:birthPlace ?birthPlace . } LIMIT 10'"
      ),
  }),
  execute: async ({ query }) => {
    try {
      // Add common prefixes if not present
      let fullQuery = query;
      if (!query.toLowerCase().includes("prefix")) {
        fullQuery = `
          PREFIX dbo: <http://dbpedia.org/ontology/>
          PREFIX dbp: <http://dbpedia.org/property/>
          PREFIX dbr: <http://dbpedia.org/resource/>
          PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
          ${query}
        `;
      }

      const result = await sparqlQuery(fullQuery);

      const variables = result.head.vars;
      const bindings = result.results.bindings;

      const results: Array<Record<string, string>> = bindings.map((binding) => {
        const row: Record<string, string> = {};
        for (const varName of variables) {
          let value = binding[varName]?.value || "";
          // Simplify DBpedia URIs
          if (value.startsWith("http://dbpedia.org/resource/")) {
            value = extractResourceName(value);
          }
          row[varName] = value;
        }
        return row;
      });

      // Build markdown table
      let markdown = "### DBpedia SPARQL Results\n\n";

      if (results.length === 0) {
        markdown += "No results found.\n";
      } else {
        // Header
        markdown += `| ${variables.join(" | ")} |\n`;
        markdown += `| ${variables.map(() => "---").join(" | ")} |\n`;

        // Rows (limit to 20)
        for (const row of results.slice(0, 20)) {
          const cells = variables.map((v) => {
            let val = row[v] || "";
            if (val.length > 50) val = `${val.slice(0, 47)}...`;
            return val;
          });
          markdown += `| ${cells.join(" | ")} |\n`;
        }

        if (results.length > 20) {
          markdown += `\n*... and ${results.length - 20} more results*`;
        }
      }

      markdown += "\n\n*Source: DBpedia SPARQL*";

      return {
        success: true,
        query,
        variables,
        results,
        total: results.length,
        markdown,
      } satisfies DbpediaSparqlResult;
    } catch (error) {
      return {
        success: false,
        query,
        variables: [],
        results: [],
        total: 0,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies DbpediaSparqlResult;
    }
  },
});
