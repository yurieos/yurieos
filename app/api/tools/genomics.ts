/**
 * Genomics & Protein Tools
 *
 * Provides access to biological databases:
 *
 * 1. UniProt - Protein sequence and function database
 *    @see https://www.uniprot.org/help/api
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const UNIPROT_API_BASE = "https://rest.uniprot.org/uniprotkb";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 25;
const MAX_FUNCTION_LENGTH = 1500;

// =============================================================================
// Types
// =============================================================================

type UniProtEntry = {
  primaryAccession: string;
  uniProtkbId: string;
  entryType: string;
  proteinDescription?: {
    recommendedName?: {
      fullName: { value: string };
    };
    alternativeNames?: Array<{
      fullName: { value: string };
    }>;
  };
  genes?: Array<{
    geneName?: { value: string };
    synonyms?: Array<{ value: string }>;
  }>;
  organism?: {
    scientificName: string;
    commonName?: string;
    taxonId: number;
  };
  sequence?: {
    value: string;
    length: number;
    molWeight: number;
  };
  comments?: Array<{
    commentType: string;
    texts?: Array<{ value: string }>;
    reaction?: {
      name: string;
      ecNumber: string;
    };
    subcellularLocations?: Array<{
      location: { value: string };
    }>;
  }>;
  features?: Array<{
    type: string;
    location: {
      start: { value: number };
      end: { value: number };
    };
    description?: string;
  }>;
  keywords?: Array<{ id: string; name: string }>;
  references?: Array<{
    citation: {
      title?: string;
      authors?: string[];
      publicationDate?: string;
    };
  }>;
};

type UniProtSearchResponse = {
  results: UniProtEntry[];
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(". ");
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : maxLength;
  return `${truncated.slice(0, cutPoint)}...`;
}

function formatProteinMarkdown(entry: UniProtEntry): string {
  const parts: string[] = [];

  // Name with link
  const name =
    entry.proteinDescription?.recommendedName?.fullName.value ||
    entry.uniProtkbId;
  const url = `https://www.uniprot.org/uniprotkb/${entry.primaryAccession}`;
  parts.push(`### [${name}](${url})`);

  // Accession and ID
  parts.push(
    `**UniProt ID:** ${entry.primaryAccession} (${entry.uniProtkbId})`
  );

  // Gene name
  const geneName = entry.genes?.[0]?.geneName?.value;
  if (geneName) {
    const synonyms = entry.genes?.[0]?.synonyms?.map((s) => s.value) || [];
    const geneStr =
      synonyms.length > 0
        ? `${geneName} (${synonyms.slice(0, 3).join(", ")})`
        : geneName;
    parts.push(`**Gene:** ${geneStr}`);
  }

  // Organism
  if (entry.organism) {
    const orgStr = entry.organism.commonName
      ? `${entry.organism.scientificName} (${entry.organism.commonName})`
      : entry.organism.scientificName;
    parts.push(`**Organism:** ${orgStr}`);
  }

  // Sequence info
  if (entry.sequence) {
    parts.push(
      `**Sequence:** ${entry.sequence.length} aa | ${(entry.sequence.molWeight / 1000).toFixed(1)} kDa`
    );
  }

  // Entry type
  const entryTypeLabel =
    entry.entryType === "UniProtKB reviewed (Swiss-Prot)"
      ? "✅ Reviewed (Swiss-Prot)"
      : "📋 Unreviewed (TrEMBL)";
  parts.push(`**Status:** ${entryTypeLabel}`);

  // Function
  const functionComment = entry.comments?.find(
    (c) => c.commentType === "FUNCTION"
  );
  if (functionComment?.texts?.[0]) {
    const funcText = truncateText(
      functionComment.texts[0].value,
      MAX_FUNCTION_LENGTH
    );
    parts.push(`**Function:** ${funcText}`);
  }

  // Subcellular location
  const locationComment = entry.comments?.find(
    (c) => c.commentType === "SUBCELLULAR LOCATION"
  );
  if (locationComment?.subcellularLocations?.length) {
    const locations = locationComment.subcellularLocations
      .slice(0, 3)
      .map((l) => l.location.value)
      .join(", ");
    parts.push(`**Location:** ${locations}`);
  }

  // Keywords
  if (entry.keywords?.length) {
    const kws = entry.keywords
      .slice(0, 5)
      .map((k) => k.name)
      .join(", ");
    parts.push(`**Keywords:** ${kws}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search UniProt Proteins
// =============================================================================

export type UniProtProteinItem = {
  accession: string;
  id: string;
  name: string;
  geneName?: string;
  organism: string;
  organismTaxId?: number;
  sequenceLength?: number;
  molecularWeight?: number;
  function?: string;
  entryType: string;
  isReviewed: boolean;
  url: string;
  markdown: string;
};

export type UniProtSearchResult = {
  success: boolean;
  query: string;
  total: number;
  proteins: UniProtProteinItem[];
  error?: string;
};

export const uniprotSearchTool = tool({
  description:
    "Search UniProt for protein sequences and functions. " +
    "UniProt is the most comprehensive protein database with sequences, " +
    "functions, and annotations. " +
    "Use for: protein research, gene function, enzyme lookup, " +
    "finding protein sequences, molecular biology.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for proteins. Can be gene name, protein name, or keyword. " +
          "Examples: 'insulin', 'BRCA1', 'p53', 'hemoglobin human', 'kinase cancer'"
      ),
    organism: z
      .string()
      .optional()
      .describe(
        "Filter by organism. Examples: 'human', 'mouse', 'Homo sapiens', '9606' (taxon ID)"
      ),
    reviewed: z
      .boolean()
      .optional()
      .describe(
        "If true, only return Swiss-Prot (reviewed) entries. " +
          "Reviewed entries have higher quality annotations."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum proteins to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, organism, reviewed, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = query;
      if (organism) {
        searchQuery += ` AND (organism_name:${organism} OR organism_id:${organism})`;
      }
      if (reviewed) {
        searchQuery += " AND (reviewed:true)";
      }

      const params = new URLSearchParams({
        query: searchQuery,
        format: "json",
        size: searchLimit.toString(),
        fields:
          "accession,id,protein_name,gene_names,organism_name,organism_id," +
          "length,mass,cc_function,cc_subcellular_location,keyword,reviewed",
      });

      const response = await fetch(
        `${UNIPROT_API_BASE}/search?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`UniProt API error: ${response.status}`);
      }

      const data = (await response.json()) as UniProtSearchResponse;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          proteins: [],
          error: "No proteins found. Try different search terms.",
        } satisfies UniProtSearchResult;
      }

      const proteins: UniProtProteinItem[] = data.results.map((entry) => ({
        accession: entry.primaryAccession,
        id: entry.uniProtkbId,
        name:
          entry.proteinDescription?.recommendedName?.fullName.value ||
          entry.uniProtkbId,
        geneName: entry.genes?.[0]?.geneName?.value,
        organism: entry.organism?.scientificName || "Unknown",
        organismTaxId: entry.organism?.taxonId,
        sequenceLength: entry.sequence?.length,
        molecularWeight: entry.sequence?.molWeight,
        function: entry.comments?.find((c) => c.commentType === "FUNCTION")
          ?.texts?.[0]?.value,
        entryType: entry.entryType,
        isReviewed: entry.entryType === "UniProtKB reviewed (Swiss-Prot)",
        url: `https://www.uniprot.org/uniprotkb/${entry.primaryAccession}`,
        markdown: formatProteinMarkdown(entry),
      }));

      return {
        success: true,
        query,
        total: proteins.length,
        proteins,
      } satisfies UniProtSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        proteins: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies UniProtSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get UniProt Protein Details
// =============================================================================

export type UniProtProteinDetailsResult = {
  success: boolean;
  accession: string;
  protein?: UniProtProteinItem & {
    sequence?: string;
    alternativeNames?: string[];
    subcellularLocations?: string[];
    keywords?: string[];
    features?: Array<{
      type: string;
      start: number;
      end: number;
      description?: string;
    }>;
  };
  error?: string;
};

export const getUniProtProteinTool = tool({
  description:
    "Get detailed information about a specific protein by UniProt accession. " +
    "Returns full sequence, annotations, and functional information. " +
    "Use after searching to get complete protein details.",
  inputSchema: z.object({
    accession: z
      .string()
      .min(1)
      .describe(
        "UniProt accession number. Examples: 'P01308' (insulin), 'P04637' (p53)"
      ),
  }),
  execute: async ({ accession }) => {
    try {
      const response = await fetch(`${UNIPROT_API_BASE}/${accession}.json`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            accession,
            error: `Protein not found: ${accession}`,
          } satisfies UniProtProteinDetailsResult;
        }
        throw new Error(`UniProt API error: ${response.status}`);
      }

      const entry = (await response.json()) as UniProtEntry;

      const protein = {
        accession: entry.primaryAccession,
        id: entry.uniProtkbId,
        name:
          entry.proteinDescription?.recommendedName?.fullName.value ||
          entry.uniProtkbId,
        geneName: entry.genes?.[0]?.geneName?.value,
        organism: entry.organism?.scientificName || "Unknown",
        organismTaxId: entry.organism?.taxonId,
        sequenceLength: entry.sequence?.length,
        molecularWeight: entry.sequence?.molWeight,
        function: entry.comments?.find((c) => c.commentType === "FUNCTION")
          ?.texts?.[0]?.value,
        entryType: entry.entryType,
        isReviewed: entry.entryType === "UniProtKB reviewed (Swiss-Prot)",
        url: `https://www.uniprot.org/uniprotkb/${entry.primaryAccession}`,
        markdown: formatProteinMarkdown(entry),
        sequence: entry.sequence?.value,
        alternativeNames: entry.proteinDescription?.alternativeNames?.map(
          (n) => n.fullName.value
        ),
        subcellularLocations: entry.comments
          ?.find((c) => c.commentType === "SUBCELLULAR LOCATION")
          ?.subcellularLocations?.map((l) => l.location.value),
        keywords: entry.keywords?.map((k) => k.name),
        features: entry.features?.slice(0, 20).map((f) => ({
          type: f.type,
          start: f.location.start.value,
          end: f.location.end.value,
          description: f.description,
        })),
      };

      return {
        success: true,
        accession,
        protein,
      } satisfies UniProtProteinDetailsResult;
    } catch (error) {
      return {
        success: false,
        accession,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies UniProtProteinDetailsResult;
    }
  },
});
