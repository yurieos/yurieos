/**
 * Chemistry & Compound Tools
 *
 * Provides access to chemical databases:
 *
 * 1. PubChem - 100M+ chemical compounds
 *    @see https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const PUBCHEM_API_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 25;

// =============================================================================
// Types
// =============================================================================

type PubChemCompoundProperty = {
  CID: number;
  MolecularFormula?: string;
  MolecularWeight?: number;
  IUPACName?: string;
  Title?: string;
  CanonicalSMILES?: string;
  InChI?: string;
  InChIKey?: string;
  XLogP?: number;
  ExactMass?: number;
  MonoisotopicMass?: number;
  TPSA?: number;
  Complexity?: number;
  Charge?: number;
  HBondDonorCount?: number;
  HBondAcceptorCount?: number;
  RotatableBondCount?: number;
  HeavyAtomCount?: number;
  AtomStereoCount?: number;
  DefinedAtomStereoCount?: number;
  UndefinedAtomStereoCount?: number;
  BondStereoCount?: number;
  CovalentUnitCount?: number;
};

type PubChemSearchResponse = {
  IdentifierList?: {
    CID: number[];
  };
};

type PubChemPropertyResponse = {
  PropertyTable?: {
    Properties: PubChemCompoundProperty[];
  };
};

type PubChemSynonymsResponse = {
  InformationList?: {
    Information: Array<{
      CID: number;
      Synonym: string[];
    }>;
  };
};

// =============================================================================
// Helpers
// =============================================================================

function formatCompoundMarkdown(
  compound: PubChemCompoundProperty,
  synonyms?: string[]
): string {
  const parts: string[] = [];

  // Title with link
  const title = compound.Title || compound.IUPACName || `CID ${compound.CID}`;
  const url = `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`;
  parts.push(`### [${title}](${url})`);

  // IUPAC Name
  if (compound.IUPACName && compound.IUPACName !== title) {
    parts.push(`**IUPAC Name:** ${compound.IUPACName}`);
  }

  // Key identifiers
  parts.push(`**CID:** ${compound.CID}`);

  if (compound.MolecularFormula) {
    parts.push(`**Molecular Formula:** ${compound.MolecularFormula}`);
  }

  if (compound.MolecularWeight) {
    parts.push(
      `**Molecular Weight:** ${compound.MolecularWeight.toFixed(2)} g/mol`
    );
  }

  // Physical/chemical properties
  const props: string[] = [];
  if (compound.XLogP !== undefined) {
    props.push(`XLogP: ${compound.XLogP.toFixed(2)}`);
  }
  if (compound.TPSA !== undefined) {
    props.push(`TPSA: ${compound.TPSA.toFixed(1)} Å²`);
  }
  if (compound.HBondDonorCount !== undefined) {
    props.push(`H-Bond Donors: ${compound.HBondDonorCount}`);
  }
  if (compound.HBondAcceptorCount !== undefined) {
    props.push(`H-Bond Acceptors: ${compound.HBondAcceptorCount}`);
  }
  if (compound.RotatableBondCount !== undefined) {
    props.push(`Rotatable Bonds: ${compound.RotatableBondCount}`);
  }
  if (props.length > 0) {
    parts.push(`**Properties:** ${props.join(" | ")}`);
  }

  // Synonyms
  if (synonyms && synonyms.length > 0) {
    const synList = synonyms.slice(0, 5).join(", ");
    const more = synonyms.length > 5 ? ` (+${synonyms.length - 5} more)` : "";
    parts.push(`**Synonyms:** ${synList}${more}`);
  }

  // SMILES
  if (compound.CanonicalSMILES) {
    parts.push(`**SMILES:** \`${compound.CanonicalSMILES}\``);
  }

  // InChIKey
  if (compound.InChIKey) {
    parts.push(`**InChIKey:** ${compound.InChIKey}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search PubChem Compounds
// =============================================================================

export type PubChemCompoundItem = {
  cid: number;
  title?: string;
  iupacName?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  inchiKey?: string;
  synonyms: string[];
  url: string;
  markdown: string;
};

export type PubChemSearchResult = {
  success: boolean;
  query: string;
  total: number;
  compounds: PubChemCompoundItem[];
  error?: string;
};

export const pubchemSearchTool = tool({
  description:
    "Search PubChem for chemical compounds by name, formula, or structure. " +
    "PubChem contains 100M+ compounds with properties, bioactivity, and safety data. " +
    "Use for: drug research, chemical identification, finding compound properties, " +
    "toxicology, molecular biology research.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Compound name, formula, or identifier to search. " +
          "Examples: 'aspirin', 'caffeine', 'C9H8O4', 'acetaminophen'"
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum compounds to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Search for compound CIDs
      const searchResponse = await fetch(
        `${PUBCHEM_API_BASE}/compound/name/${encodeURIComponent(query)}/cids/JSON`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!searchResponse.ok) {
        // Try formula search
        const formulaResponse = await fetch(
          `${PUBCHEM_API_BASE}/compound/fastformula/${encodeURIComponent(query)}/cids/JSON`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        if (!formulaResponse.ok) {
          return {
            success: true,
            query,
            total: 0,
            compounds: [],
            error: "No compounds found. Try a different name or formula.",
          } satisfies PubChemSearchResult;
        }

        const formulaData =
          (await formulaResponse.json()) as PubChemSearchResponse;
        if (!formulaData.IdentifierList?.CID?.length) {
          return {
            success: true,
            query,
            total: 0,
            compounds: [],
            error: "No compounds found.",
          } satisfies PubChemSearchResult;
        }
      }

      const searchData = (await searchResponse.json()) as PubChemSearchResponse;
      const cids = searchData.IdentifierList?.CID?.slice(0, searchLimit) || [];

      if (cids.length === 0) {
        return {
          success: true,
          query,
          total: 0,
          compounds: [],
          error: "No compounds found.",
        } satisfies PubChemSearchResult;
      }

      // Get properties for found compounds
      const cidList = cids.join(",");
      const propsResponse = await fetch(
        `${PUBCHEM_API_BASE}/compound/cid/${cidList}/property/` +
          "Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey," +
          "XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount/JSON",
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!propsResponse.ok) {
        throw new Error("Failed to fetch compound properties");
      }

      const propsData = (await propsResponse.json()) as PubChemPropertyResponse;
      const properties = propsData.PropertyTable?.Properties || [];

      // Get synonyms
      const synsResponse = await fetch(
        `${PUBCHEM_API_BASE}/compound/cid/${cidList}/synonyms/JSON`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      const synonymsMap: Map<number, string[]> = new Map();
      if (synsResponse.ok) {
        const synsData = (await synsResponse.json()) as PubChemSynonymsResponse;
        for (const info of synsData.InformationList?.Information || []) {
          synonymsMap.set(info.CID, info.Synonym?.slice(0, 10) || []);
        }
      }

      const compounds: PubChemCompoundItem[] = properties.map((prop) => {
        const synonyms = synonymsMap.get(prop.CID) || [];
        return {
          cid: prop.CID,
          title: prop.Title,
          iupacName: prop.IUPACName,
          molecularFormula: prop.MolecularFormula,
          molecularWeight: prop.MolecularWeight,
          smiles: prop.CanonicalSMILES,
          inchiKey: prop.InChIKey,
          synonyms,
          url: `https://pubchem.ncbi.nlm.nih.gov/compound/${prop.CID}`,
          markdown: formatCompoundMarkdown(prop, synonyms),
        };
      });

      return {
        success: true,
        query,
        total: compounds.length,
        compounds,
      } satisfies PubChemSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        compounds: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PubChemSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get PubChem Compound Details
// =============================================================================

export type PubChemCompoundDetailsResult = {
  success: boolean;
  cid: number;
  compound?: PubChemCompoundItem & {
    exactMass?: number;
    complexity?: number;
    charge?: number;
    heavyAtomCount?: number;
  };
  error?: string;
};

export const getPubChemCompoundTool = tool({
  description:
    "Get detailed information about a specific compound by PubChem CID. " +
    "Returns full properties, structure, and identifiers. " +
    "Use after searching to get complete compound details.",
  inputSchema: z.object({
    cid: z
      .number()
      .int()
      .positive()
      .describe("PubChem Compound ID (CID). Example: 2244 (aspirin)"),
  }),
  execute: async ({ cid }) => {
    try {
      // Get all properties
      const propsResponse = await fetch(
        `${PUBCHEM_API_BASE}/compound/cid/${cid}/property/` +
          "Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChI,InChIKey," +
          "XLogP,ExactMass,MonoisotopicMass,TPSA,Complexity,Charge," +
          "HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount/JSON",
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!propsResponse.ok) {
        return {
          success: false,
          cid,
          error: `Compound not found: CID ${cid}`,
        } satisfies PubChemCompoundDetailsResult;
      }

      const propsData = (await propsResponse.json()) as PubChemPropertyResponse;
      const prop = propsData.PropertyTable?.Properties?.[0];

      if (!prop) {
        return {
          success: false,
          cid,
          error: `Compound not found: CID ${cid}`,
        } satisfies PubChemCompoundDetailsResult;
      }

      // Get synonyms
      const synsResponse = await fetch(
        `${PUBCHEM_API_BASE}/compound/cid/${cid}/synonyms/JSON`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      let synonyms: string[] = [];
      if (synsResponse.ok) {
        const synsData = (await synsResponse.json()) as PubChemSynonymsResponse;
        synonyms =
          synsData.InformationList?.Information?.[0]?.Synonym?.slice(0, 20) ||
          [];
      }

      const compound = {
        cid: prop.CID,
        title: prop.Title,
        iupacName: prop.IUPACName,
        molecularFormula: prop.MolecularFormula,
        molecularWeight: prop.MolecularWeight,
        smiles: prop.CanonicalSMILES,
        inchiKey: prop.InChIKey,
        synonyms,
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${prop.CID}`,
        markdown: formatCompoundMarkdown(prop, synonyms),
        exactMass: prop.ExactMass,
        complexity: prop.Complexity,
        charge: prop.Charge,
        heavyAtomCount: prop.HeavyAtomCount,
      };

      return {
        success: true,
        cid,
        compound,
      } satisfies PubChemCompoundDetailsResult;
    } catch (error) {
      return {
        success: false,
        cid,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies PubChemCompoundDetailsResult;
    }
  },
});
