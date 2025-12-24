/**
 * Clinical Trials Registry Tools
 *
 * Provides access to the ClinicalTrials.gov registry:
 *
 * ClinicalTrials.gov - 500K+ registered clinical trials
 * @see https://clinicaltrials.gov/data-api/api
 *
 * Note: This is different from PubMed which searches publications.
 * This searches the actual trial registry with protocols, recruitment status, etc.
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const CLINICAL_TRIALS_API_BASE = "https://clinicaltrials.gov/api/v2";

const MAX_RESULTS_DEFAULT = 10;
const MAX_RESULTS_LIMIT = 20;
const MAX_DESCRIPTION_LENGTH = 1500;

// =============================================================================
// Types
// =============================================================================

type StudyStatus =
  | "RECRUITING"
  | "NOT_YET_RECRUITING"
  | "ACTIVE_NOT_RECRUITING"
  | "COMPLETED"
  | "SUSPENDED"
  | "TERMINATED"
  | "WITHDRAWN"
  | "ENROLLING_BY_INVITATION"
  | "UNKNOWN";

type StudyPhase =
  | "EARLY_PHASE1"
  | "PHASE1"
  | "PHASE2"
  | "PHASE3"
  | "PHASE4"
  | "NA";

type StudyType = "INTERVENTIONAL" | "OBSERVATIONAL" | "EXPANDED_ACCESS";

type ClinicalTrialStudy = {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
      organization?: {
        fullName?: string;
        class?: string;
      };
    };
    statusModule: {
      overallStatus: StudyStatus;
      startDateStruct?: {
        date: string;
        type?: string;
      };
      completionDateStruct?: {
        date: string;
        type?: string;
      };
      studyFirstSubmitDate?: string;
      lastUpdatePostDateStruct?: {
        date: string;
      };
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions?: string[];
      keywords?: string[];
    };
    designModule?: {
      studyType?: StudyType;
      phases?: StudyPhase[];
      designInfo?: {
        allocation?: string;
        interventionModel?: string;
        primaryPurpose?: string;
        maskingInfo?: {
          masking?: string;
        };
      };
      enrollmentInfo?: {
        count?: number;
        type?: string;
      };
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type?: string;
        name?: string;
        description?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
        status?: string;
      }>;
      centralContacts?: Array<{
        name?: string;
        role?: string;
        email?: string;
        phone?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name?: string;
        class?: string;
      };
      collaborators?: Array<{
        name?: string;
        class?: string;
      }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{
        measure?: string;
        description?: string;
        timeFrame?: string;
      }>;
    };
  };
};

type ClinicalTrialsSearchResponse = {
  studies: ClinicalTrialStudy[];
  totalCount: number;
  nextPageToken?: string;
};

type ClinicalTrialDetailResponse = ClinicalTrialStudy;

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

function formatPhases(phases?: StudyPhase[]): string {
  if (!phases?.length) {
    return "N/A";
  }
  const phaseMap: Record<string, string> = {
    EARLY_PHASE1: "Early Phase 1",
    PHASE1: "Phase 1",
    PHASE2: "Phase 2",
    PHASE3: "Phase 3",
    PHASE4: "Phase 4",
    NA: "N/A",
  };
  return phases.map((p) => phaseMap[p] || p).join(", ");
}

function formatStatus(status: StudyStatus): string {
  const statusMap: Record<string, string> = {
    RECRUITING: "🟢 Recruiting",
    NOT_YET_RECRUITING: "🟡 Not Yet Recruiting",
    ACTIVE_NOT_RECRUITING: "🔵 Active, Not Recruiting",
    COMPLETED: "✅ Completed",
    SUSPENDED: "⏸️ Suspended",
    TERMINATED: "🛑 Terminated",
    WITHDRAWN: "❌ Withdrawn",
    ENROLLING_BY_INVITATION: "📨 Enrolling by Invitation",
    UNKNOWN: "❓ Unknown",
  };
  return statusMap[status] || status;
}

function formatTrialMarkdown(study: ClinicalTrialStudy): string {
  const parts: string[] = [];
  const protocol = study.protocolSection;
  const id = protocol.identificationModule;
  const status = protocol.statusModule;
  const description = protocol.descriptionModule;
  const conditions = protocol.conditionsModule;
  const design = protocol.designModule;
  const sponsor = protocol.sponsorCollaboratorsModule;

  // Title with link
  const url = `https://clinicaltrials.gov/study/${id.nctId}`;
  parts.push(`### [${id.briefTitle}](${url})`);

  // NCT ID and Status
  parts.push(`**NCT ID:** ${id.nctId} | ${formatStatus(status.overallStatus)}`);

  // Sponsor
  if (sponsor?.leadSponsor?.name) {
    parts.push(`**Sponsor:** ${sponsor.leadSponsor.name}`);
  }

  // Conditions
  if (conditions?.conditions?.length) {
    parts.push(
      `**Conditions:** ${conditions.conditions.slice(0, 5).join(", ")}`
    );
  }

  // Metadata line
  const meta: string[] = [];
  if (design?.studyType) {
    meta.push(`**Type:** ${design.studyType}`);
  }
  if (design?.phases?.length) {
    meta.push(`**Phase:** ${formatPhases(design.phases)}`);
  }
  if (design?.enrollmentInfo?.count) {
    meta.push(
      `**Enrollment:** ${design.enrollmentInfo.count.toLocaleString()}`
    );
  }
  if (meta.length > 0) {
    parts.push(meta.join(" | "));
  }

  // Dates
  const dates: string[] = [];
  if (status.startDateStruct?.date) {
    dates.push(`Start: ${status.startDateStruct.date}`);
  }
  if (status.completionDateStruct?.date) {
    dates.push(`Est. Completion: ${status.completionDateStruct.date}`);
  }
  if (dates.length > 0) {
    parts.push(`**Timeline:** ${dates.join(" → ")}`);
  }

  // Interventions
  const interventions = protocol.armsInterventionsModule?.interventions;
  if (interventions?.length) {
    const interventionList = interventions
      .slice(0, 3)
      .map((i) => `${i.type}: ${i.name}`)
      .join(", ");
    parts.push(`**Interventions:** ${interventionList}`);
  }

  // Brief summary
  if (description?.briefSummary) {
    const truncated = truncateText(
      description.briefSummary,
      MAX_DESCRIPTION_LENGTH
    );
    parts.push(`**Summary:** ${truncated}`);
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: Search Clinical Trials
// =============================================================================

export type ClinicalTrialResultItem = {
  nctId: string;
  briefTitle: string;
  officialTitle?: string;
  status: string;
  statusFormatted: string;
  sponsor?: string;
  conditions: string[];
  studyType?: string;
  phases: string[];
  enrollment?: number;
  startDate?: string;
  completionDate?: string;
  interventions: string[];
  summary?: string;
  url: string;
  markdown: string;
};

export type ClinicalTrialsSearchResult = {
  success: boolean;
  query: string;
  total: number;
  trials: ClinicalTrialResultItem[];
  error?: string;
};

export const clinicalTrialsSearchTool = tool({
  description:
    "Search ClinicalTrials.gov registry for clinical trials by condition, intervention, or keywords. " +
    "This searches the actual trial REGISTRY (protocols, recruitment status, eligibility) - " +
    "not publications about trials. " +
    "Use for: finding recruiting trials for a condition, researching trial designs, " +
    "understanding what treatments are being studied, finding trial sponsors.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Search query for clinical trials. Use condition names, drug names, or keywords. " +
          "Examples: 'diabetes type 2', 'pembrolizumab melanoma', 'COVID-19 vaccine', " +
          "'breast cancer immunotherapy'"
      ),
    status: z
      .string()
      .optional()
      .describe(
        "Filter by recruitment status. Options: 'RECRUITING', 'NOT_YET_RECRUITING', " +
          "'ACTIVE_NOT_RECRUITING', 'COMPLETED', 'SUSPENDED', 'TERMINATED'. " +
          "Leave empty for all statuses."
      ),
    phase: z
      .string()
      .optional()
      .describe(
        "Filter by trial phase. Options: 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'EARLY_PHASE1'. " +
          "Leave empty for all phases."
      ),
    studyType: z
      .string()
      .optional()
      .describe(
        "Filter by study type. Options: 'INTERVENTIONAL', 'OBSERVATIONAL'. " +
          "Leave empty for all types."
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_LIMIT)
      .optional()
      .default(MAX_RESULTS_DEFAULT)
      .describe(`Maximum results (1-${MAX_RESULTS_LIMIT}).`),
  }),
  execute: async ({ query, status, phase, studyType, limit }) => {
    try {
      const searchLimit = Math.min(
        limit ?? MAX_RESULTS_DEFAULT,
        MAX_RESULTS_LIMIT
      );

      // Build query parameters
      const params = new URLSearchParams({
        "query.term": query,
        pageSize: searchLimit.toString(),
        format: "json",
      });

      // Add filters
      if (status) {
        params.append("filter.overallStatus", status);
      }
      if (phase) {
        params.append("filter.phase", phase);
      }
      if (studyType) {
        params.append("filter.studyType", studyType);
      }

      const response = await fetch(
        `${CLINICAL_TRIALS_API_BASE}/studies?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ClinicalTrials.gov API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = (await response.json()) as ClinicalTrialsSearchResponse;

      if (!data.studies?.length) {
        return {
          success: true,
          query,
          total: 0,
          trials: [],
          error:
            "No clinical trials found. Try different search terms or broader criteria.",
        } satisfies ClinicalTrialsSearchResult;
      }

      const trials: ClinicalTrialResultItem[] = data.studies.map((study) => {
        const protocol = study.protocolSection;
        const id = protocol.identificationModule;
        const statusModule = protocol.statusModule;
        const design = protocol.designModule;
        const sponsor = protocol.sponsorCollaboratorsModule;
        const interventions = protocol.armsInterventionsModule?.interventions;

        return {
          nctId: id.nctId,
          briefTitle: id.briefTitle,
          officialTitle: id.officialTitle,
          status: statusModule.overallStatus,
          statusFormatted: formatStatus(statusModule.overallStatus),
          sponsor: sponsor?.leadSponsor?.name,
          conditions: protocol.conditionsModule?.conditions || [],
          studyType: design?.studyType,
          phases: design?.phases || [],
          enrollment: design?.enrollmentInfo?.count,
          startDate: statusModule.startDateStruct?.date,
          completionDate: statusModule.completionDateStruct?.date,
          interventions:
            interventions?.map((i) => `${i.type}: ${i.name}`).slice(0, 5) || [],
          summary: protocol.descriptionModule?.briefSummary,
          url: `https://clinicaltrials.gov/study/${id.nctId}`,
          markdown: formatTrialMarkdown(study),
        };
      });

      return {
        success: true,
        query,
        total: data.totalCount,
        trials,
      } satisfies ClinicalTrialsSearchResult;
    } catch (error) {
      return {
        success: false,
        query,
        total: 0,
        trials: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ClinicalTrialsSearchResult;
    }
  },
});

// =============================================================================
// Tool: Get Clinical Trial Details
// =============================================================================

export type ClinicalTrialDetailResult = {
  success: boolean;
  nctId: string;
  trial?: ClinicalTrialResultItem & {
    detailedDescription?: string;
    eligibilityCriteria?: string;
    eligibilityAge?: string;
    eligibilitySex?: string;
    healthyVolunteers?: boolean;
    locations: Array<{
      facility?: string;
      city?: string;
      country?: string;
      status?: string;
    }>;
    primaryOutcomes: Array<{
      measure?: string;
      description?: string;
      timeFrame?: string;
    }>;
    contacts: Array<{
      name?: string;
      email?: string;
      phone?: string;
    }>;
  };
  error?: string;
};

export const getClinicalTrialTool = tool({
  description:
    "Get detailed information about a specific clinical trial by its NCT ID. " +
    "Returns full protocol details including eligibility criteria, locations, " +
    "outcomes, and contact information. " +
    "Use after searching to get complete trial details.",
  inputSchema: z.object({
    nctId: z
      .string()
      .min(1)
      .describe(
        "NCT ID of the clinical trial. Example: 'NCT04368728', 'NCT05081336'"
      ),
  }),
  execute: async ({ nctId }) => {
    try {
      // Clean NCT ID
      const cleanNctId = nctId.toUpperCase().trim();

      const response = await fetch(
        `${CLINICAL_TRIALS_API_BASE}/studies/${cleanNctId}?format=json`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            nctId: cleanNctId,
            error: `Clinical trial not found: ${cleanNctId}`,
          } satisfies ClinicalTrialDetailResult;
        }
        throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
      }

      const study = (await response.json()) as ClinicalTrialDetailResponse;
      const protocol = study.protocolSection;
      const id = protocol.identificationModule;
      const statusModule = protocol.statusModule;
      const design = protocol.designModule;
      const sponsor = protocol.sponsorCollaboratorsModule;
      const eligibility = protocol.eligibilityModule;
      const locations = protocol.contactsLocationsModule;
      const outcomes = protocol.outcomesModule;
      const interventions = protocol.armsInterventionsModule?.interventions;

      const trial = {
        nctId: id.nctId,
        briefTitle: id.briefTitle,
        officialTitle: id.officialTitle,
        status: statusModule.overallStatus,
        statusFormatted: formatStatus(statusModule.overallStatus),
        sponsor: sponsor?.leadSponsor?.name,
        conditions: protocol.conditionsModule?.conditions || [],
        studyType: design?.studyType,
        phases: design?.phases || [],
        enrollment: design?.enrollmentInfo?.count,
        startDate: statusModule.startDateStruct?.date,
        completionDate: statusModule.completionDateStruct?.date,
        interventions:
          interventions?.map((i) => `${i.type}: ${i.name}`).slice(0, 10) || [],
        summary: protocol.descriptionModule?.briefSummary,
        detailedDescription: protocol.descriptionModule?.detailedDescription,
        eligibilityCriteria: eligibility?.eligibilityCriteria,
        eligibilityAge:
          eligibility?.minimumAge && eligibility?.maximumAge
            ? `${eligibility.minimumAge} - ${eligibility.maximumAge}`
            : eligibility?.minimumAge || eligibility?.maximumAge,
        eligibilitySex: eligibility?.sex,
        healthyVolunteers: eligibility?.healthyVolunteers,
        locations:
          locations?.locations?.slice(0, 10).map((loc) => ({
            facility: loc.facility,
            city: loc.city,
            country: loc.country,
            status: loc.status,
          })) || [],
        primaryOutcomes:
          outcomes?.primaryOutcomes?.map((o) => ({
            measure: o.measure,
            description: o.description,
            timeFrame: o.timeFrame,
          })) || [],
        contacts:
          locations?.centralContacts?.map((c) => ({
            name: c.name,
            email: c.email,
            phone: c.phone,
          })) || [],
        url: `https://clinicaltrials.gov/study/${id.nctId}`,
        markdown: formatTrialMarkdown(study),
      };

      return {
        success: true,
        nctId: cleanNctId,
        trial,
      } satisfies ClinicalTrialDetailResult;
    } catch (error) {
      return {
        success: false,
        nctId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ClinicalTrialDetailResult;
    }
  },
});
