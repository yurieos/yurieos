import type { Tool } from "ai";
import { crawlTool, mapTool, scrapeTool } from "@/app/api/tools/crawl";
import { searchTool } from "@/app/api/tools/search";

export function getToolset(
  isToolCallingAvailable: boolean
): Record<string, Tool> {
  const toolset: Record<string, Tool> = {};

  if (isToolCallingAvailable) {
    // Exa: Web search for finding relevant links and content
    toolset.search = searchTool;

    // Firecrawl: Deep content extraction and site ingestion
    toolset.scrape = scrapeTool;
    toolset.crawl = crawlTool;
    toolset.map = mapTool;
  }

  return toolset;
}
