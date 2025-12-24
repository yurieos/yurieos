import type { Tool } from "ai";
import {
  academicSearchTool,
  arxivSearchTool,
  authorSearchTool,
  getPaperTool,
  openAlexSearchTool,
} from "@/app/api/tools/academic";
// OpenAQ: Air quality data
import {
  airQualityCountriesTool,
  airQualityLocationsTool,
  airQualityMeasurementsTool,
} from "@/app/api/tools/airquality";
import {
  waybackAvailabilityTool,
  waybackHistoryTool,
  waybackSnapshotTool,
} from "@/app/api/tools/archive";
import {
  gbifOccurrenceSearchTool,
  gbifSpeciesSearchTool,
} from "@/app/api/tools/biodiversity";
import {
  clinicalTrialSearchTool,
  getPubMedArticleTool,
  pubmedSearchTool,
} from "@/app/api/tools/biomedical";
import {
  bookSearchTool,
  getAuthorDetailsTool,
  getBookDetailsTool,
  isbnLookupTool,
} from "@/app/api/tools/books";
import {
  chemblActivityTool,
  chemblMoleculeSearchTool,
  chemblTargetSearchTool,
  getChemblMoleculeTool,
} from "@/app/api/tools/chembl";
import {
  getPubChemCompoundTool,
  pubchemSearchTool,
} from "@/app/api/tools/chemistry";
import {
  crossrefLookupTool,
  crossrefSearchTool,
  unpaywallTool,
} from "@/app/api/tools/citations";
import { crawlTool, mapTool, scrapeTool } from "@/app/api/tools/crawl";
import {
  worldBankCountryTool,
  worldBankIndicatorTool,
  worldBankSearchIndicatorsTool,
} from "@/app/api/tools/data";
// Zenodo & DataCite: Research datasets
import {
  dataCiteSearchTool,
  getDataCiteDoiTool,
  getZenodoRecordTool,
  zenodoSearchTool,
} from "@/app/api/tools/datasets";
import {
  dblpAuthorSearchTool,
  dblpSearchTool,
  dblpVenueSearchTool,
} from "@/app/api/tools/dblp";
import {
  dbpediaLookupTool,
  dbpediaSparqlTool,
  getDbpediaEntityTool,
} from "@/app/api/tools/dbpedia";
import { fredSearchTool, fredSeriesDataTool } from "@/app/api/tools/economics";
// ERIC: Education research
import { ericSearchTool, getEricDocumentTool } from "@/app/api/tools/education";
import { eurostatDataTool, eurostatSearchTool } from "@/app/api/tools/eurostat";
import { fdaAdverseEventTool, fdaRecallTool } from "@/app/api/tools/fda";
// New API Integrations (No API Key Required)
import {
  getCompanyFilingsTool,
  secFilingSearchTool,
} from "@/app/api/tools/finance";
import {
  getUniProtProteinTool,
  uniprotSearchTool,
} from "@/app/api/tools/genomics";
import {
  geocodeTool,
  placeDetailsTool,
  reverseGeocodeTool,
} from "@/app/api/tools/geocoding";
import {
  getGithubRepoTool,
  githubRepoSearchTool,
  githubTrendingTool,
  githubUserSearchTool,
} from "@/app/api/tools/github";
import {
  dataGovSearchTool,
  getDataGovDatasetTool,
} from "@/app/api/tools/government";
import {
  drugInfoSearchTool,
  healthSearchTool,
  medicalEncyclopediaTool,
} from "@/app/api/tools/health";
// Historical Archives: Internet Archive, Library of Congress, DPLA
import {
  chroniclingAmericaSearchTool,
  dplaSearchTool,
  internetArchiveSearchTool,
  locSearchTool,
} from "@/app/api/tools/historical";
import {
  getOrcidProfileTool,
  orcidSearchTool,
  rorSearchTool,
} from "@/app/api/tools/identity";
import { imfDatasetsTool, imfDataTool } from "@/app/api/tools/imf";
import {
  getWikipediaArticleTool,
  wikipediaLookupTool,
  wikipediaSearchTool,
} from "@/app/api/tools/knowledge";
import {
  courtOpinionSearchTool,
  getCourtOpinionTool,
} from "@/app/api/tools/legal";
// Papers With Code: ML research
import {
  pwcDatasetSearchTool,
  pwcMethodSearchTool,
  pwcPaperSearchTool,
  pwcTaskSearchTool,
} from "@/app/api/tools/mlresearch";
import { newsSearchTool, newsTrendTool } from "@/app/api/tools/news";
import {
  oecdCountriesTool,
  oecdDataTool,
  oecdIndicatorsTool,
} from "@/app/api/tools/oecd";
import { coreSearchTool, getCorePaperTool } from "@/app/api/tools/openaccess";
// ===== NEW API INTEGRATIONS (Added for Enhanced Research) =====
// OpenCitations: Citation network analysis
import {
  getCitationCountTool,
  getCitationsTool,
  getReferencesTool,
} from "@/app/api/tools/opencitations";
import { getPatentTool, patentSearchTool } from "@/app/api/tools/patents";
import {
  getInspirePaperTool,
  inspireAuthorSearchTool,
  inspireSearchTool,
} from "@/app/api/tools/physics";
import {
  checkPreprintPublishedTool,
  getPreprintDetailsTool,
  preprintSearchTool,
} from "@/app/api/tools/preprints";
import { searchTool } from "@/app/api/tools/search";
import {
  nasaApodTool,
  nasaMarsPhotosTool,
  nasaNeoFeedTool,
} from "@/app/api/tools/space";
// Stack Exchange: Technical Q&A
import {
  stackExchangeSearchTool,
  stackOverflowAnswersTool,
  stackOverflowSearchTool,
} from "@/app/api/tools/stackoverflow";
import {
  clinicalTrialsSearchTool,
  getClinicalTrialTool,
} from "@/app/api/tools/trials";
import {
  getWikidataEntityTool,
  wikidataSearchTool,
  wikidataSparqlTool,
} from "@/app/api/tools/wikidata";
import { computeTool } from "@/app/api/tools/wolfram";

export function getToolset(
  isToolCallingAvailable: boolean
): Record<string, Tool> {
  const toolset: Record<string, Tool> = {};

  // Automatically enable tools for models that support tool calling
  if (isToolCallingAvailable) {
    // Exa: Finding relevant links and snippets
    toolset.search = searchTool;
    // Firecrawl: Deep content extraction and site ingestion
    toolset.scrape = scrapeTool;
    toolset.crawl = crawlTool;
    toolset.map = mapTool;
    // Wolfram Alpha: Computational knowledge and data analysis
    toolset.compute = computeTool;
    // Academic Research Suite: Semantic Scholar, arXiv, OpenAlex
    toolset.academicSearch = academicSearchTool;
    toolset.getPaper = getPaperTool;
    toolset.authorSearch = authorSearchTool;
    toolset.arxivSearch = arxivSearchTool;
    toolset.openAlexSearch = openAlexSearchTool;
    // Biomedical Research: PubMed, Europe PMC
    toolset.pubmedSearch = pubmedSearchTool;
    toolset.getPubMedArticle = getPubMedArticleTool;
    toolset.clinicalTrialSearch = clinicalTrialSearchTool;
    // Knowledge Base: Wikipedia
    toolset.wikipediaSearch = wikipediaSearchTool;
    toolset.getWikipediaArticle = getWikipediaArticleTool;
    toolset.wikipediaLookup = wikipediaLookupTool;
    // Citations & DOI: Crossref, Unpaywall (No API key required)
    toolset.crossrefLookup = crossrefLookupTool;
    toolset.crossrefSearch = crossrefSearchTool;
    toolset.unpaywall = unpaywallTool;
    // Clinical Trials Registry: ClinicalTrials.gov (No API key required)
    toolset.clinicalTrialsSearch = clinicalTrialsSearchTool;
    toolset.getClinicalTrial = getClinicalTrialTool;
    // Global Data: World Bank (No API key required)
    toolset.worldBankIndicator = worldBankIndicatorTool;
    toolset.worldBankSearchIndicators = worldBankSearchIndicatorsTool;
    toolset.worldBankCountry = worldBankCountryTool;
    // Patents: USPTO PatentsView (No API key required)
    toolset.patentSearch = patentSearchTool;
    toolset.getPatent = getPatentTool;
    // Web Archive: Internet Archive Wayback Machine (No API key required)
    toolset.waybackAvailability = waybackAvailabilityTool;
    toolset.waybackHistory = waybackHistoryTool;
    toolset.waybackSnapshot = waybackSnapshotTool;

    // ===== NEW FREE API INTEGRATIONS =====

    // Economics: FRED Federal Reserve Economic Data (API key optional)
    toolset.fredSeriesData = fredSeriesDataTool;
    toolset.fredSearch = fredSearchTool;
    // Open Access Research: CORE (API key required - free)
    toolset.coreSearch = coreSearchTool;
    toolset.getCorePaper = getCorePaperTool;
    // News & Current Events: GDELT (No API key required)
    toolset.newsSearch = newsSearchTool;
    toolset.newsTrend = newsTrendTool;
    // Chemistry: PubChem (No API key required)
    toolset.pubchemSearch = pubchemSearchTool;
    toolset.getPubChemCompound = getPubChemCompoundTool;
    // Genomics: UniProt (No API key required)
    toolset.uniprotSearch = uniprotSearchTool;
    toolset.getUniProtProtein = getUniProtProteinTool;
    // FDA: OpenFDA Drug & Device Data (No API key required)
    toolset.fdaAdverseEvents = fdaAdverseEventTool;
    toolset.fdaRecalls = fdaRecallTool;
    // Research Identity: ORCID & ROR (No API key required)
    toolset.orcidSearch = orcidSearchTool;
    toolset.getOrcidProfile = getOrcidProfileTool;
    toolset.rorSearch = rorSearchTool;
    // Biodiversity: GBIF Species & Occurrences (No API key required)
    toolset.gbifSpeciesSearch = gbifSpeciesSearchTool;
    toolset.gbifOccurrenceSearch = gbifOccurrenceSearchTool;
    // Space & Astronomy: NASA APIs (Free demo key available)
    toolset.nasaApod = nasaApodTool;
    toolset.nasaNeoFeed = nasaNeoFeedTool;
    toolset.nasaMarsPhotos = nasaMarsPhotosTool;
    // Legal Research: CourtListener (No API key required)
    toolset.courtOpinionSearch = courtOpinionSearchTool;
    toolset.getCourtOpinion = getCourtOpinionTool;
    // Government Data: Data.gov (No API key required)
    toolset.dataGovSearch = dataGovSearchTool;
    toolset.getDataGovDataset = getDataGovDatasetTool;

    // ===== NEW FREE APIs (No API Key Required) =====

    // Wikidata Knowledge Graph: Structured facts, SPARQL queries
    toolset.wikidataSearch = wikidataSearchTool;
    toolset.getWikidataEntity = getWikidataEntityTool;
    toolset.wikidataSparql = wikidataSparqlTool;
    // Eurostat: European Union statistics (27+ countries)
    toolset.eurostatSearch = eurostatSearchTool;
    toolset.eurostatData = eurostatDataTool;
    // IMF: International Monetary Fund economic data
    toolset.imfDatasets = imfDatasetsTool;
    toolset.imfData = imfDataTool;
    // DBLP: Computer Science bibliography (6M+ publications)
    toolset.dblpSearch = dblpSearchTool;
    toolset.dblpAuthorSearch = dblpAuthorSearchTool;
    toolset.dblpVenueSearch = dblpVenueSearchTool;
    // OpenStreetMap Nominatim: Geocoding and place lookup
    toolset.geocode = geocodeTool;
    toolset.reverseGeocode = reverseGeocodeTool;
    toolset.placeDetails = placeDetailsTool;
    // Open Library: Books database (20M+ records)
    toolset.bookSearch = bookSearchTool;
    toolset.getBookDetails = getBookDetailsTool;
    toolset.getAuthorDetails = getAuthorDetailsTool;
    toolset.isbnLookup = isbnLookupTool;
    // ChEMBL: Drug discovery database (2M+ bioactive molecules)
    toolset.chemblMoleculeSearch = chemblMoleculeSearchTool;
    toolset.getChemblMolecule = getChemblMoleculeTool;
    toolset.chemblTargetSearch = chemblTargetSearchTool;
    toolset.chemblActivity = chemblActivityTool;

    // ===== NEW API INTEGRATIONS (No API Key Required) =====

    // SEC EDGAR: US company financial filings (10-K, 10-Q, 8-K, etc.)
    toolset.secFilingSearch = secFilingSearchTool;
    toolset.getCompanyFilings = getCompanyFilingsTool;
    // INSPIRE-HEP: High energy physics, particle physics, astrophysics
    toolset.inspireSearch = inspireSearchTool;
    toolset.getInspirePaper = getInspirePaperTool;
    toolset.inspireAuthorSearch = inspireAuthorSearchTool;
    // bioRxiv/medRxiv: Life sciences preprints (biology, health sciences)
    toolset.preprintSearch = preprintSearchTool;
    toolset.getPreprintDetails = getPreprintDetailsTool;
    toolset.checkPreprintPublished = checkPreprintPublishedTool;
    // MedlinePlus: Consumer health information (NIH/NLM)
    toolset.healthSearch = healthSearchTool;
    toolset.drugInfoSearch = drugInfoSearchTool;
    toolset.medicalEncyclopedia = medicalEncyclopediaTool;
    // OECD: International economic data (38 member countries)
    toolset.oecdIndicators = oecdIndicatorsTool;
    toolset.oecdData = oecdDataTool;
    toolset.oecdCountries = oecdCountriesTool;
    // DBpedia: Structured Wikipedia data (SPARQL endpoint)
    toolset.dbpediaLookup = dbpediaLookupTool;
    toolset.getDbpediaEntity = getDbpediaEntityTool;
    toolset.dbpediaSparql = dbpediaSparqlTool;
    // GitHub: Open source repository research
    toolset.githubRepoSearch = githubRepoSearchTool;
    toolset.getGithubRepo = getGithubRepoTool;
    toolset.githubUserSearch = githubUserSearchTool;
    toolset.githubTrending = githubTrendingTool;

    // ===== ENHANCED RESEARCH TOOLS (No API Key Required) =====

    // OpenCitations: Citation network analysis & bibliometrics
    toolset.getCitations = getCitationsTool;
    toolset.getReferences = getReferencesTool;
    toolset.getCitationCount = getCitationCountTool;
    // ERIC: Education research (1.6M+ documents)
    toolset.ericSearch = ericSearchTool;
    toolset.getEricDocument = getEricDocumentTool;
    // OpenAQ: Global air quality monitoring data
    toolset.airQualityLocations = airQualityLocationsTool;
    toolset.airQualityMeasurements = airQualityMeasurementsTool;
    toolset.airQualityCountries = airQualityCountriesTool;
    // Stack Exchange: Technical Q&A (Stack Overflow + 170 communities)
    toolset.stackOverflowSearch = stackOverflowSearchTool;
    toolset.stackOverflowAnswers = stackOverflowAnswersTool;
    toolset.stackExchangeSearch = stackExchangeSearchTool;
    // Zenodo: Research datasets repository (CERN)
    toolset.zenodoSearch = zenodoSearchTool;
    toolset.getZenodoRecord = getZenodoRecordTool;
    // DataCite: DOI metadata for research data
    toolset.dataCiteSearch = dataCiteSearchTool;
    toolset.getDataCiteDoi = getDataCiteDoiTool;
    // Papers With Code: ML papers, methods, datasets, tasks
    toolset.pwcPaperSearch = pwcPaperSearchTool;
    toolset.pwcMethodSearch = pwcMethodSearchTool;
    toolset.pwcDatasetSearch = pwcDatasetSearchTool;
    toolset.pwcTaskSearch = pwcTaskSearchTool;
    // Internet Archive: Full-text search (40M+ books)
    toolset.internetArchiveSearch = internetArchiveSearchTool;
    // Library of Congress: Digital collections
    toolset.locSearch = locSearchTool;
    // Chronicling America: Historic newspapers (1777-1963)
    toolset.chroniclingAmericaSearch = chroniclingAmericaSearchTool;
    // DPLA: Digital Public Library of America (47M+ items)
    toolset.dplaSearch = dplaSearchTool;
  }

  return toolset;
}
