/**
 * ChEMBL Bioactive Molecules Database Tools
 *
 * Provides access to ChEMBL drug discovery data:
 *
 * 1. ChEMBL - 2M+ bioactive molecules with drug-like properties
 *    @see https://www.ebi.ac.uk/chembl/api/data/docs
 *
 * No API key required.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const CHEMBL_API_BASE = "https://www.ebi.ac.uk/chembl/api/data";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 50;

// =============================================================================
// Types
// =============================================================================

type ChEMBLMolecule = {
  molecule_chembl_id: string;
  pref_name: string | null;
  max_phase: number;
  molecule_type: string;
  first_approval?: number;
  oral: boolean;
  parenteral: boolean;
  topical: boolean;
  black_box_warning: boolean;
  natural_product: boolean;
  therapeutic_flag: boolean;
  polymer_flag: boolean;
  molecule_properties?: {
    full_mwt?: number;
    alogp?: number;
    hba?: number;
    hbd?: number;
    psa?: number;
    rtb?: number;
    ro3_pass?: string;
    num_ro5_violations?: number;
    molecular_species?: string;
    full_molformula?: string;
  };
  molecule_structures?: {
    canonical_smiles?: string;
    standard_inchi?: string;
    standard_inchi_key?: string;
  };
  molecule_synonyms?: Array<{
    molecule_synonym: string;
    syn_type: string;
  }>;
};

type ChEMBLMoleculeResponse = {
  page_meta: {
    limit: number;
    offset: number;
    total_count: number;
  };
  molecules: ChEMBLMolecule[];
};

type ChEMBLTarget = {
  target_chembl_id: string;
  pref_name: string;
  target_type: string;
  organism: string;
  species_group_flag: boolean;
  target_components?: Array<{
    component_id: number;
    component_type: string;
    component_description: string;
    accession?: string;
  }>;
};

type ChEMBLTargetResponse = {
  page_meta: {
    limit: number;
    offset: number;
    total_count: number;
  };
  targets: ChEMBLTarget[];
};

type ChEMBLActivity = {
  activity_id: number;
  molecule_chembl_id: string;
  target_chembl_id: string;
  target_pref_name: string;
  target_organism: string;
  standard_type: string;
  standard_value?: number;
  standard_units?: string;
  pchembl_value?: number;
  activity_comment?: string;
};

type ChEMBLActivityResponse = {
  page_meta: {
    limit: number;
    offset: number;
    total_count: number;
  };
  activities: ChEMBLActivity[];
};

// =============================================================================
// Helpers
// =============================================================================

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatPhase(phase: number): string {
  switch (phase) {
    case 4:
      return "Approved";
    case 3:
      return "Phase 3";
    case 2:
      return "Phase 2";
    case 1:
      return "Phase 1";
    case 0.5:
      return "Early Phase 1";
    default:
      return phase > 0 ? `Phase ${phase}` : "Preclinical";
  }
}

function formatMoleculeMarkdown(mol: ChEMBLMolecule): string {
  const parts: string[] = [];

  // Name and ID
  const name = mol.pref_name || mol.molecule_chembl_id;
  const url = `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}`;
  parts.push(`### [${name}](${url})`);

  parts.push(`**ChEMBL ID:** ${mol.molecule_chembl_id}`);
  parts.push(
    `**Type:** ${mol.molecule_type} | **Phase:** ${formatPhase(mol.max_phase)}`
  );

  // Approval info
  const approval: string[] = [];
  if (mol.first_approval) approval.push(`Approved: ${mol.first_approval}`);
  if (mol.black_box_warning) approval.push("⚠️ Black Box Warning");
  if (mol.natural_product) approval.push("🌿 Natural Product");
  if (approval.length > 0) {
    parts.push(approval.join(" | "));
  }

  // Routes
  const routes: string[] = [];
  if (mol.oral) routes.push("Oral");
  if (mol.parenteral) routes.push("Parenteral");
  if (mol.topical) routes.push("Topical");
  if (routes.length > 0) {
    parts.push(`**Routes:** ${routes.join(", ")}`);
  }

  // Properties
  const props = mol.molecule_properties;
  if (props) {
    const propLines: string[] = [];

    if (props.full_molformula)
      propLines.push(`**Formula:** ${props.full_molformula}`);
    if (props.full_mwt)
      propLines.push(`**MW:** ${props.full_mwt.toFixed(2)} Da`);
    if (props.alogp !== undefined)
      propLines.push(`**ALogP:** ${props.alogp.toFixed(2)}`);

    if (propLines.length > 0) {
      parts.push(propLines.join(" | "));
    }

    // Drug-likeness
    const druglike: string[] = [];
    if (props.hba !== undefined) druglike.push(`HBA: ${props.hba}`);
    if (props.hbd !== undefined) druglike.push(`HBD: ${props.hbd}`);
    if (props.psa !== undefined) druglike.push(`PSA: ${props.psa.toFixed(1)}`);
    if (props.rtb !== undefined) druglike.push(`RotBonds: ${props.rtb}`);
    if (props.num_ro5_violations !== undefined)
      druglike.push(`Ro5 Violations: ${props.num_ro5_violations}`);

    if (druglike.length > 0) {
      parts.push(`**Drug-likeness:** ${druglike.join(", ")}`);
    }
  }

  // Synonyms
  if (mol.molecule_synonyms && mol.molecule_synonyms.length > 0) {
    const synonyms = mol.molecule_synonyms
      .slice(0, 5)
      .map((s) => s.molecule_synonym)
      .join(", ");
    parts.push(`**Synonyms:** ${synonyms}`);
  }

  // SMILES
  if (mol.molecule_structures?.canonical_smiles) {
    parts.push(
      `**SMILES:** \`${truncateText(mol.molecule_structures.canonical_smiles, 80)}\``
    );
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search ChEMBL Molecules
// =============================================================================

export type ChEMBLMoleculeItem = {
  chemblId: string;
  name: string | null;
  type: string;
  maxPhase: number;
  maxPhaseLabel: string;
  firstApproval?: number;
  molecularWeight?: number;
  formula?: string;
  smiles?: string;
  isNaturalProduct: boolean;
  hasBlackBoxWarning: boolean;
  url: string;
};

export type ChEMBLMoleculeSearchResult = {
  success: boolean;
  query: string;
  total: number;
  molecules: ChEMBLMoleculeItem[];
  error?: string;
  markdown: string;
};

export const chemblMoleculeSearchTool = tool({
  description:
    "Search ChEMBL for bioactive molecules and drug compounds. " +
    "ChEMBL contains 2M+ molecules with drug discovery data. " +
    "Use for: finding drug compounds, checking approval status, " +
    "getting molecular properties, SMILES structures, and synonyms.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Molecule name or synonym to search. " +
          "Examples: 'aspirin', 'ibuprofen', 'paracetamol', 'metformin'"
      ),
    maxPhase: z
      .number()
      .int()
      .min(-1)
      .max(4)
      .optional()
      .describe(
        "Filter by max clinical phase. " +
          "4=Approved, 3=Phase 3, 2=Phase 2, 1=Phase 1, 0=Preclinical, -1=Withdrawn."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, maxPhase, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search URL
      let url = `${CHEMBL_API_BASE}/molecule/search.json?q=${encodeURIComponent(query)}&limit=${searchLimit}`;

      if (maxPhase !== undefined) {
        url += `&max_phase=${maxPhase}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ChEMBL API error: ${response.status}`);
      }

      const data = (await response.json()) as ChEMBLMoleculeResponse;

      if (!data.molecules?.length) {
        return {
          success: true,
          query,
          total: 0,
          molecules: [],
          error: "No molecules found. Try different search terms.",
          markdown: `No molecules found for "${query}".`,
        } satisfies ChEMBLMoleculeSearchResult;
      }

      const molecules: ChEMBLMoleculeItem[] = data.molecules.map((mol) => ({
        chemblId: mol.molecule_chembl_id,
        name: mol.pref_name,
        type: mol.molecule_type,
        maxPhase: mol.max_phase,
        maxPhaseLabel: formatPhase(mol.max_phase),
        firstApproval: mol.first_approval,
        molecularWeight: mol.molecule_properties?.full_mwt,
        formula: mol.molecule_properties?.full_molformula,
        smiles: mol.molecule_structures?.canonical_smiles,
        isNaturalProduct: mol.natural_product,
        hasBlackBoxWarning: mol.black_box_warning,
        url: `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}`,
      }));

      // Build markdown
      let markdown = `### ChEMBL Molecule Search: "${query}"\n\n`;
      markdown += `Found ${data.page_meta.total_count.toLocaleString()} molecules (showing ${molecules.length}).\n\n`;

      for (const mol of data.molecules) {
        markdown += formatMoleculeMarkdown(mol) + "\n\n---\n\n";
      }

      markdown += "*Source: ChEMBL Database (EMBL-EBI)*";

      return {
        success: true,
        query,
        total: data.page_meta.total_count,
        molecules,
        markdown,
      } satisfies ChEMBLMoleculeSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        molecules: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ChEMBLMoleculeSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get ChEMBL Molecule Details
// =============================================================================

export type ChEMBLMoleculeDetailsResult = {
  success: boolean;
  chemblId: string;
  molecule?: ChEMBLMoleculeItem & {
    synonyms: string[];
    inchiKey?: string;
    hba?: number;
    hbd?: number;
    psa?: number;
    rotBonds?: number;
    ro5Violations?: number;
    alogp?: number;
  };
  error?: string;
  markdown: string;
};

export const getChemblMoleculeTool = tool({
  description:
    "Get detailed information about a specific molecule from ChEMBL by ID. " +
    "Returns full molecular properties, structures, and synonyms. " +
    "Use after searching to get complete molecule details.",
  inputSchema: z.object({
    chemblId: z
      .string()
      .min(1)
      .describe("ChEMBL molecule ID (e.g., 'CHEMBL25' for aspirin)."),
  }),
  execute: async ({ chemblId }) => {
    try {
      // Normalize the ID
      const id = chemblId.toUpperCase().startsWith("CHEMBL")
        ? chemblId.toUpperCase()
        : `CHEMBL${chemblId}`;

      const response = await fetch(`${CHEMBL_API_BASE}/molecule/${id}.json`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            chemblId: id,
            error: `Molecule not found: ${id}`,
            markdown: `Molecule not found: ${id}`,
          } satisfies ChEMBLMoleculeDetailsResult;
        }
        throw new Error(`ChEMBL API error: ${response.status}`);
      }

      const mol = (await response.json()) as ChEMBLMolecule;

      const synonyms =
        mol.molecule_synonyms?.map((s) => s.molecule_synonym) || [];

      const molecule = {
        chemblId: mol.molecule_chembl_id,
        name: mol.pref_name,
        type: mol.molecule_type,
        maxPhase: mol.max_phase,
        maxPhaseLabel: formatPhase(mol.max_phase),
        firstApproval: mol.first_approval,
        molecularWeight: mol.molecule_properties?.full_mwt,
        formula: mol.molecule_properties?.full_molformula,
        smiles: mol.molecule_structures?.canonical_smiles,
        inchiKey: mol.molecule_structures?.standard_inchi_key,
        isNaturalProduct: mol.natural_product,
        hasBlackBoxWarning: mol.black_box_warning,
        url: `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}`,
        synonyms,
        hba: mol.molecule_properties?.hba,
        hbd: mol.molecule_properties?.hbd,
        psa: mol.molecule_properties?.psa,
        rotBonds: mol.molecule_properties?.rtb,
        ro5Violations: mol.molecule_properties?.num_ro5_violations,
        alogp: mol.molecule_properties?.alogp,
      };

      // Build markdown
      let markdown = formatMoleculeMarkdown(mol);

      if (mol.molecule_structures?.standard_inchi_key) {
        markdown += `\n**InChI Key:** ${mol.molecule_structures.standard_inchi_key}`;
      }

      markdown += "\n\n*Source: ChEMBL Database (EMBL-EBI)*";

      return {
        success: true,
        chemblId: id,
        molecule,
        markdown,
      } satisfies ChEMBLMoleculeDetailsResult;
    } catch (error) {
      return {
        success: false,
        chemblId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ChEMBLMoleculeDetailsResult;
    }
  },
});

// =============================================================================
// Tool: Search ChEMBL Targets
// =============================================================================

export type ChEMBLTargetItem = {
  chemblId: string;
  name: string;
  type: string;
  organism: string;
  uniprotAccession?: string;
  url: string;
};

export type ChEMBLTargetSearchResult = {
  success: boolean;
  query: string;
  total: number;
  targets: ChEMBLTargetItem[];
  error?: string;
  markdown: string;
};

export const chemblTargetSearchTool = tool({
  description:
    "Search ChEMBL for drug targets (proteins, receptors, enzymes). " +
    "Use for: finding protein targets, understanding drug mechanisms, " +
    "discovering what molecules target specific proteins.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Target name or keyword to search. " +
          "Examples: 'ACE2', 'dopamine receptor', 'kinase', 'GPCR'"
      ),
    organism: z
      .string()
      .optional()
      .describe(
        "Filter by organism. Example: 'Homo sapiens' for human targets."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, organism, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      let url = `${CHEMBL_API_BASE}/target/search.json?q=${encodeURIComponent(query)}&limit=${searchLimit}`;

      if (organism) {
        url += `&organism=${encodeURIComponent(organism)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ChEMBL API error: ${response.status}`);
      }

      const data = (await response.json()) as ChEMBLTargetResponse;

      if (!data.targets?.length) {
        return {
          success: true,
          query,
          total: 0,
          targets: [],
          error: "No targets found. Try different search terms.",
          markdown: `No drug targets found for "${query}".`,
        } satisfies ChEMBLTargetSearchResult;
      }

      const targets: ChEMBLTargetItem[] = data.targets.map((target) => {
        // Find UniProt accession
        const uniprotComponent = target.target_components?.find(
          (c) => c.accession && c.component_type === "PROTEIN"
        );

        return {
          chemblId: target.target_chembl_id,
          name: target.pref_name,
          type: target.target_type,
          organism: target.organism,
          uniprotAccession: uniprotComponent?.accession,
          url: `https://www.ebi.ac.uk/chembl/target_report_card/${target.target_chembl_id}`,
        };
      });

      // Build markdown
      let markdown = `### ChEMBL Target Search: "${query}"\n\n`;
      markdown += `Found ${data.page_meta.total_count.toLocaleString()} targets (showing ${targets.length}).\n\n`;

      for (const target of data.targets) {
        const targetUrl = `https://www.ebi.ac.uk/chembl/target_report_card/${target.target_chembl_id}`;
        markdown += `### [${target.pref_name}](${targetUrl})\n`;
        markdown += `**ChEMBL ID:** ${target.target_chembl_id}\n`;
        markdown += `**Type:** ${target.target_type} | **Organism:** ${target.organism}\n`;

        // Components
        if (target.target_components && target.target_components.length > 0) {
          const components = target.target_components.slice(0, 3);
          for (const comp of components) {
            if (comp.accession) {
              markdown += `- [${comp.component_description || comp.component_type}](https://www.uniprot.org/uniprotkb/${comp.accession})\n`;
            } else {
              markdown += `- ${comp.component_description || comp.component_type}\n`;
            }
          }
        }

        markdown += "\n---\n\n";
      }

      markdown += "*Source: ChEMBL Database (EMBL-EBI)*";

      return {
        success: true,
        query,
        total: data.page_meta.total_count,
        targets,
        markdown,
      } satisfies ChEMBLTargetSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        targets: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ChEMBLTargetSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Molecule Activities
// =============================================================================

export type ChEMBLActivityItem = {
  activityId: number;
  moleculeChemblId: string;
  targetChemblId: string;
  targetName: string;
  targetOrganism: string;
  type: string;
  value?: number;
  units?: string;
  pChembl?: number;
  comment?: string;
};

export type ChEMBLActivityResult = {
  success: boolean;
  chemblId: string;
  total: number;
  activities: ChEMBLActivityItem[];
  error?: string;
  markdown: string;
};

export const chemblActivityTool = tool({
  description:
    "Get bioactivity data for a ChEMBL molecule. " +
    "Returns assay results showing how the molecule affects various targets. " +
    "Use to understand a drug's mechanism of action and target profile.",
  inputSchema: z.object({
    chemblId: z
      .string()
      .min(1)
      .describe("ChEMBL molecule ID to get activities for."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ chemblId, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );
      const id = chemblId.toUpperCase().startsWith("CHEMBL")
        ? chemblId.toUpperCase()
        : `CHEMBL${chemblId}`;

      const url = `${CHEMBL_API_BASE}/activity.json?molecule_chembl_id=${id}&limit=${searchLimit}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ChEMBL API error: ${response.status}`);
      }

      const data = (await response.json()) as ChEMBLActivityResponse;

      if (!data.activities?.length) {
        return {
          success: true,
          chemblId: id,
          total: 0,
          activities: [],
          error: "No activity data found for this molecule.",
          markdown: `No activity data found for ${id}.`,
        } satisfies ChEMBLActivityResult;
      }

      const activities: ChEMBLActivityItem[] = data.activities.map((act) => ({
        activityId: act.activity_id,
        moleculeChemblId: act.molecule_chembl_id,
        targetChemblId: act.target_chembl_id,
        targetName: act.target_pref_name,
        targetOrganism: act.target_organism,
        type: act.standard_type,
        value: act.standard_value,
        units: act.standard_units,
        pChembl: act.pchembl_value,
        comment: act.activity_comment,
      }));

      // Build markdown
      let markdown = `### Bioactivity Data: ${id}\n\n`;
      markdown += `Found ${data.page_meta.total_count.toLocaleString()} activities (showing ${activities.length}).\n\n`;

      markdown += "| Target | Type | Value | pChEMBL |\n";
      markdown += "|--------|------|-------|--------|\n";

      for (const act of activities) {
        const valueStr =
          act.value !== undefined ? `${act.value} ${act.units || ""}` : "N/A";
        const pChemblStr = act.pChembl?.toFixed(2) || "-";

        markdown += `| [${truncateText(act.targetName, 30)}](https://www.ebi.ac.uk/chembl/target_report_card/${act.targetChemblId}) | ${act.type} | ${valueStr} | ${pChemblStr} |\n`;
      }

      if (data.page_meta.total_count > searchLimit) {
        markdown += `\n*... and ${data.page_meta.total_count - searchLimit} more activities*`;
      }

      markdown += "\n\n*Source: ChEMBL Database (EMBL-EBI)*";

      return {
        success: true,
        chemblId: id,
        total: data.page_meta.total_count,
        activities,
        markdown,
      } satisfies ChEMBLActivityResult;
    } catch (error) {
      return {
        success: false,
        chemblId,
        total: 0,
        activities: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies ChEMBLActivityResult;
    }
  },
});
