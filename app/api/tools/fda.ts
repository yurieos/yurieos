/**
 * FDA Open Data Tools
 *
 * Provides access to FDA open data:
 *
 * 1. OpenFDA - Drug, device, and food safety data
 *    @see https://open.fda.gov/apis/
 *
 * No API key required for basic access.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const OPENFDA_API_BASE = "https://api.fda.gov";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 100;

// =============================================================================
// Types
// =============================================================================

type OpenFDADrugEvent = {
  safetyreportid: string;
  receivedate: string;
  serious: string;
  seriousnessdeath?: string;
  seriousnesslifethreatening?: string;
  seriousnesshospitalization?: string;
  seriousnessdisabling?: string;
  patient: {
    patientonsetage?: string;
    patientonsetageunit?: string;
    patientsex?: string;
    patientweight?: string;
    drug?: Array<{
      medicinalproduct?: string;
      drugindication?: string;
      drugdosagetext?: string;
      drugadministrationroute?: string;
      activesubstance?: {
        activesubstancename?: string;
      };
    }>;
    reaction?: Array<{
      reactionmeddrapt?: string;
      reactionoutcome?: string;
    }>;
  };
  primarysource?: {
    reportercountry?: string;
    qualification?: string;
  };
};

type OpenFDADrugLabel = {
  id: string;
  effective_time?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
    route?: string[];
    substance_name?: string[];
    rxcui?: string[];
    spl_id?: string[];
    package_ndc?: string[];
  };
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  contraindications?: string[];
  pregnancy?: string[];
  overdosage?: string[];
};

type OpenFDADrugRecall = {
  recall_number: string;
  recall_initiation_date: string;
  center_classification_date?: string;
  product_description: string;
  reason_for_recall: string;
  recalling_firm: string;
  city?: string;
  state?: string;
  country?: string;
  classification: string;
  status: string;
  distribution_pattern?: string;
  voluntary_mandated?: string;
};

type OpenFDAResponse<T> = {
  meta?: {
    results?: {
      total: number;
    };
  };
  results?: T[];
  error?: {
    code: string;
    message: string;
  };
};

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  if (dateStr.length < 8) {
    return dateStr;
  }
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function formatSeriousness(event: OpenFDADrugEvent): string {
  const flags: string[] = [];
  if (event.seriousnessdeath === "1") {
    flags.push("☠️ Death");
  }
  if (event.seriousnesslifethreatening === "1") {
    flags.push("⚠️ Life-threatening");
  }
  if (event.seriousnesshospitalization === "1") {
    flags.push("🏥 Hospitalization");
  }
  if (event.seriousnessdisabling === "1") {
    flags.push("♿ Disabling");
  }
  return flags.length > 0 ? flags.join(", ") : "Non-serious";
}

function formatEventMarkdown(event: OpenFDADrugEvent): string {
  const parts: string[] = [];

  parts.push(`### Report ${event.safetyreportid}`);
  parts.push(
    `**Date:** ${formatDate(event.receivedate)} | **Severity:** ${formatSeriousness(event)}`
  );

  // Patient info
  const patientInfo: string[] = [];
  if (event.patient.patientsex) {
    const sex =
      event.patient.patientsex === "1"
        ? "Male"
        : event.patient.patientsex === "2"
          ? "Female"
          : "Unknown";
    patientInfo.push(`Sex: ${sex}`);
  }
  if (event.patient.patientonsetage) {
    patientInfo.push(`Age: ${event.patient.patientonsetage}`);
  }
  if (patientInfo.length > 0) {
    parts.push(`**Patient:** ${patientInfo.join(" | ")}`);
  }

  // Drugs
  if (event.patient.drug?.length) {
    const drugs = event.patient.drug
      .slice(0, 5)
      .map(
        (d) =>
          d.medicinalproduct ||
          d.activesubstance?.activesubstancename ||
          "Unknown"
      )
      .join(", ");
    parts.push(`**Drug(s):** ${drugs}`);
  }

  // Reactions
  if (event.patient.reaction?.length) {
    const reactions = event.patient.reaction
      .slice(0, 5)
      .map((r) => r.reactionmeddrapt)
      .join(", ");
    parts.push(`**Reactions:** ${reactions}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search FDA Drug Adverse Events
// =============================================================================

export type FDAAdverseEventItem = {
  reportId: string;
  receiveDate: string;
  isSerious: boolean;
  seriousnessFlags: string[];
  patientAge?: string;
  patientSex?: string;
  drugs: string[];
  reactions: string[];
  reporterCountry?: string;
  markdown: string;
};

export type FDAAdverseEventResult = {
  success: boolean;
  query: string;
  total: number;
  events: FDAAdverseEventItem[];
  error?: string;
  markdown: string;
};

export const fdaAdverseEventTool = tool({
  description:
    "Search FDA adverse event reports (FAERS) for drug safety information. " +
    "Contains reports of adverse reactions and medication errors. " +
    "Use for: drug safety research, pharmacovigilance, identifying drug side effects, " +
    "researching medication risks.",
  inputSchema: z.object({
    drugName: z
      .string()
      .min(1)
      .describe(
        "Drug name to search adverse events for. " +
          "Examples: 'aspirin', 'ibuprofen', 'metformin', 'atorvastatin'"
      ),
    seriousOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, only return serious adverse events."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum events to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ drugName, seriousOnly, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build search query
      let searchQuery = `patient.drug.medicinalproduct:"${drugName}"`;
      if (seriousOnly) {
        searchQuery += "+AND+serious:1";
      }

      const response = await fetch(
        `${OPENFDA_API_BASE}/drug/event.json?search=${encodeURIComponent(searchQuery)}&limit=${searchLimit}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        const errorData =
          (await response.json()) as OpenFDAResponse<OpenFDADrugEvent>;
        if (errorData.error) {
          return {
            success: true,
            query: drugName,
            total: 0,
            events: [],
            error: "No adverse events found for this drug.",
            markdown: `No adverse events found for "${drugName}".`,
          } satisfies FDAAdverseEventResult;
        }
        throw new Error(`OpenFDA API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenFDAResponse<OpenFDADrugEvent>;

      if (!data.results?.length) {
        return {
          success: true,
          query: drugName,
          total: 0,
          events: [],
          error: "No adverse events found.",
          markdown: `No adverse events found for "${drugName}".`,
        } satisfies FDAAdverseEventResult;
      }

      const events: FDAAdverseEventItem[] = data.results.map((event) => {
        const seriousnessFlags: string[] = [];
        if (event.seriousnessdeath === "1") {
          seriousnessFlags.push("death");
        }
        if (event.seriousnesslifethreatening === "1") {
          seriousnessFlags.push("life-threatening");
        }
        if (event.seriousnesshospitalization === "1") {
          seriousnessFlags.push("hospitalization");
        }
        if (event.seriousnessdisabling === "1") {
          seriousnessFlags.push("disabling");
        }

        return {
          reportId: event.safetyreportid,
          receiveDate: formatDate(event.receivedate),
          isSerious: event.serious === "1",
          seriousnessFlags,
          patientAge: event.patient.patientonsetage,
          patientSex:
            event.patient.patientsex === "1"
              ? "Male"
              : event.patient.patientsex === "2"
                ? "Female"
                : undefined,
          drugs:
            event.patient.drug
              ?.map(
                (d) =>
                  d.medicinalproduct || d.activesubstance?.activesubstancename
              )
              .filter((d): d is string => d !== undefined) || [],
          reactions:
            event.patient.reaction
              ?.map((r) => r.reactionmeddrapt)
              .filter((r): r is string => r !== undefined) || [],
          reporterCountry: event.primarysource?.reportercountry,
          markdown: formatEventMarkdown(event),
        };
      });

      // Build markdown
      let markdown = `### FDA Adverse Events: "${drugName}"\n\n`;
      markdown += `Found ${data.meta?.results?.total || events.length} reports.\n\n`;

      for (const event of events.slice(0, 10)) {
        markdown += `**Report ${event.reportId}** (${event.receiveDate})\n`;
        markdown += `- Serious: ${event.isSerious ? "Yes" : "No"}`;
        if (event.seriousnessFlags.length > 0) {
          markdown += ` (${event.seriousnessFlags.join(", ")})`;
        }
        markdown += "\n";
        markdown += `- Reactions: ${event.reactions.slice(0, 3).join(", ")}\n\n`;
      }

      markdown += "*Source: FDA Adverse Event Reporting System (FAERS)*";

      return {
        success: true,
        query: drugName,
        total: data.meta?.results?.total || events.length,
        events,
        markdown,
      } satisfies FDAAdverseEventResult;
    } catch (error) {
      return {
        success: false,
        query: drugName,
        total: 0,
        events: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies FDAAdverseEventResult;
    }
  },
});

// =============================================================================
// Tool: Search FDA Drug Recalls
// =============================================================================

export type FDARecallItem = {
  recallNumber: string;
  initiationDate: string;
  classification: string;
  status: string;
  recallingFirm: string;
  productDescription: string;
  reason: string;
  distribution?: string;
  markdown: string;
};

export type FDARecallResult = {
  success: boolean;
  query: string;
  total: number;
  recalls: FDARecallItem[];
  error?: string;
  markdown: string;
};

export const fdaRecallTool = tool({
  description:
    "Search FDA drug and device recalls. " +
    "Contains information about recalled products and reasons. " +
    "Use for: product safety research, checking if a drug has been recalled, " +
    "understanding recall reasons and classifications.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for recalls. Can be drug name, company, or reason. " +
          "Examples: 'aspirin', 'Pfizer', 'contamination'"
      ),
    classification: z
      .string()
      .optional()
      .describe(
        "Filter by recall classification. " +
          "'Class I' = most serious, 'Class II' = moderate, 'Class III' = least serious."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum recalls to return (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, classification, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      let searchQuery = query;
      if (classification) {
        searchQuery += `+AND+classification:"${classification}"`;
      }

      const response = await fetch(
        `${OPENFDA_API_BASE}/drug/enforcement.json?search=${encodeURIComponent(searchQuery)}&limit=${searchLimit}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        return {
          success: true,
          query,
          total: 0,
          recalls: [],
          error: "No recalls found.",
          markdown: `No recalls found for "${query}".`,
        } satisfies FDARecallResult;
      }

      const data =
        (await response.json()) as OpenFDAResponse<OpenFDADrugRecall>;

      if (!data.results?.length) {
        return {
          success: true,
          query,
          total: 0,
          recalls: [],
          error: "No recalls found.",
          markdown: `No recalls found for "${query}".`,
        } satisfies FDARecallResult;
      }

      const recalls: FDARecallItem[] = data.results.map((recall) => ({
        recallNumber: recall.recall_number,
        initiationDate: recall.recall_initiation_date,
        classification: recall.classification,
        status: recall.status,
        recallingFirm: recall.recalling_firm,
        productDescription: recall.product_description,
        reason: recall.reason_for_recall,
        distribution: recall.distribution_pattern,
        markdown:
          `### ${recall.recall_number}\n` +
          `**Classification:** ${recall.classification} | **Status:** ${recall.status}\n` +
          `**Firm:** ${recall.recalling_firm}\n` +
          `**Product:** ${recall.product_description.slice(0, 200)}...\n` +
          `**Reason:** ${recall.reason_for_recall.slice(0, 200)}...`,
      }));

      // Build markdown
      let markdown = `### FDA Drug Recalls: "${query}"\n\n`;
      markdown += `Found ${data.meta?.results?.total || recalls.length} recalls.\n\n`;

      for (const recall of recalls.slice(0, 10)) {
        markdown += `**${recall.recallNumber}** (${recall.classification})\n`;
        markdown += `- Firm: ${recall.recallingFirm}\n`;
        markdown += `- Status: ${recall.status}\n`;
        markdown += `- Reason: ${recall.reason.slice(0, 100)}...\n\n`;
      }

      markdown += "*Source: FDA Enforcement Reports*";

      return {
        success: true,
        query,
        total: data.meta?.results?.total || recalls.length,
        recalls,
        markdown,
      } satisfies FDARecallResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        recalls: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies FDARecallResult;
    }
  },
});
