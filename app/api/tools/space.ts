/**
 * Space & Astronomy Tools
 *
 * Provides access to NASA and space data:
 *
 * 1. NASA APIs - Space and astronomy data
 *    @see https://api.nasa.gov/
 *
 * API key optional (DEMO_KEY available for testing).
 */
import { tool } from "ai";
import { z } from "zod";

// =============================================================================
// Configuration
// =============================================================================

const NASA_API_BASE = "https://api.nasa.gov";

// =============================================================================
// Types
// =============================================================================

type NasaApodResponse = {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: string;
  copyright?: string;
};

type NasaNeoObject = {
  id: string;
  neo_reference_id: string;
  name: string;
  nasa_jpl_url: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    close_approach_date_full: string;
    epoch_date_close_approach: number;
    relative_velocity: {
      kilometers_per_second: string;
      kilometers_per_hour: string;
    };
    miss_distance: {
      astronomical: string;
      lunar: string;
      kilometers: string;
    };
    orbiting_body: string;
  }>;
  is_sentry_object: boolean;
};

type NasaNeoFeedResponse = {
  element_count: number;
  near_earth_objects: Record<string, NasaNeoObject[]>;
};

type NasaMarsPhoto = {
  id: number;
  sol: number;
  camera: {
    id: number;
    name: string;
    rover_id: number;
    full_name: string;
  };
  img_src: string;
  earth_date: string;
  rover: {
    id: number;
    name: string;
    landing_date: string;
    launch_date: string;
    status: string;
  };
};

type NasaMarsPhotosResponse = {
  photos: NasaMarsPhoto[];
};

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string {
  return process.env.NASA_API_KEY || "DEMO_KEY";
}

function formatApodMarkdown(apod: NasaApodResponse): string {
  const parts: string[] = [];

  parts.push(`### ${apod.title}`);
  parts.push(`**Date:** ${apod.date}`);

  if (apod.copyright) {
    parts.push(`**Credit:** ${apod.copyright}`);
  }

  parts.push(`**Type:** ${apod.media_type}`);

  if (apod.media_type === "image") {
    parts.push(`\n![${apod.title}](${apod.url})`);
  } else {
    parts.push(`\n[View Media](${apod.url})`);
  }

  parts.push(`\n${apod.explanation}`);

  if (apod.hdurl) {
    parts.push(`\n[HD Version](${apod.hdurl})`);
  }

  return parts.join("\n");
}

function formatNeoMarkdown(neo: NasaNeoObject): string {
  const parts: string[] = [];

  // Name with link
  parts.push(`### [${neo.name}](${neo.nasa_jpl_url})`);

  // Hazard status
  const hazardStatus = neo.is_potentially_hazardous_asteroid
    ? "⚠️ **Potentially Hazardous**"
    : "✅ Not Hazardous";
  parts.push(hazardStatus);

  // Diameter
  const minDiam =
    neo.estimated_diameter.meters.estimated_diameter_min.toFixed(0);
  const maxDiam =
    neo.estimated_diameter.meters.estimated_diameter_max.toFixed(0);
  parts.push(`**Diameter:** ${minDiam} - ${maxDiam} meters`);

  // Magnitude
  parts.push(`**Absolute Magnitude:** ${neo.absolute_magnitude_h.toFixed(2)}`);

  // Close approaches
  if (neo.close_approach_data.length > 0) {
    const approach = neo.close_approach_data[0];
    parts.push(`\n**Next Close Approach:** ${approach.close_approach_date}`);
    parts.push(
      `- Distance: ${Number.parseFloat(approach.miss_distance.lunar).toFixed(1)} lunar distances`
    );
    parts.push(
      `- Velocity: ${Number.parseFloat(approach.relative_velocity.kilometers_per_hour).toLocaleString()} km/h`
    );
  }

  return parts.join("\n");
}

// =============================================================================
// Tool: NASA Astronomy Picture of the Day
// =============================================================================

export type ApodResult = {
  success: boolean;
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdUrl?: string;
  mediaType: string;
  copyright?: string;
  markdown: string;
  error?: string;
};

export const nasaApodTool = tool({
  description:
    "Get NASA's Astronomy Picture of the Day (APOD). " +
    "Returns a stunning astronomy image with explanation from NASA scientists. " +
    "Use for: astronomy education, space imagery, daily astronomy facts.",
  inputSchema: z.object({
    date: z
      .string()
      .optional()
      .describe(
        "Date for the APOD in YYYY-MM-DD format. " +
          "Leave empty for today's picture. Example: '2024-01-15'"
      ),
  }),
  execute: async ({ date }) => {
    try {
      const apiKey = getApiKey();
      const params = new URLSearchParams({ api_key: apiKey });

      if (date) {
        params.append("date", date);
      }

      const response = await fetch(
        `${NASA_API_BASE}/planetary/apod?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`NASA API error: ${response.status}`);
      }

      const data = (await response.json()) as NasaApodResponse;

      return {
        success: true,
        date: data.date,
        title: data.title,
        explanation: data.explanation,
        url: data.url,
        hdUrl: data.hdurl,
        mediaType: data.media_type,
        copyright: data.copyright,
        markdown: formatApodMarkdown(data),
      } satisfies ApodResult;
    } catch (error) {
      return {
        success: false,
        date: date || "today",
        title: "",
        explanation: "",
        url: "",
        mediaType: "",
        markdown: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      } satisfies ApodResult;
    }
  },
});

// =============================================================================
// Tool: NASA Near Earth Objects
// =============================================================================

export type NeoItem = {
  id: string;
  name: string;
  nasaUrl: string;
  absoluteMagnitude: number;
  diameterMinMeters: number;
  diameterMaxMeters: number;
  isPotentiallyHazardous: boolean;
  closeApproachDate?: string;
  missDistanceLunar?: number;
  velocityKmh?: number;
  markdown: string;
};

export type NeoFeedResult = {
  success: boolean;
  startDate: string;
  endDate: string;
  count: number;
  neos: NeoItem[];
  error?: string;
  markdown: string;
};

export const nasaNeoFeedTool = tool({
  description:
    "Get Near Earth Objects (asteroids) approaching Earth from NASA. " +
    "Returns asteroids with their size, velocity, and closest approach distance. " +
    "Use for: asteroid tracking, planetary defense awareness, space science.",
  inputSchema: z.object({
    startDate: z
      .string()
      .optional()
      .describe("Start date in YYYY-MM-DD format. Default: today."),
    endDate: z
      .string()
      .optional()
      .describe("End date in YYYY-MM-DD format. Max 7 days from start."),
  }),
  execute: async ({ startDate, endDate }) => {
    try {
      const apiKey = getApiKey();
      const today = new Date().toISOString().split("T")[0];
      const start = startDate || today;
      const end = endDate || today;

      const params = new URLSearchParams({
        api_key: apiKey,
        start_date: start,
        end_date: end,
      });

      const response = await fetch(
        `${NASA_API_BASE}/neo/rest/v1/feed?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`NASA API error: ${response.status}`);
      }

      const data = (await response.json()) as NasaNeoFeedResponse;

      // Flatten NEOs from all dates
      const allNeos: NasaNeoObject[] = [];
      for (const dateNeos of Object.values(data.near_earth_objects)) {
        allNeos.push(...dateNeos);
      }

      // Sort by closest approach distance
      allNeos.sort((a, b) => {
        const distA = Number.parseFloat(
          a.close_approach_data[0]?.miss_distance?.lunar || "999"
        );
        const distB = Number.parseFloat(
          b.close_approach_data[0]?.miss_distance?.lunar || "999"
        );
        return distA - distB;
      });

      const neos: NeoItem[] = allNeos.slice(0, 20).map((neo) => ({
        id: neo.id,
        name: neo.name,
        nasaUrl: neo.nasa_jpl_url,
        absoluteMagnitude: neo.absolute_magnitude_h,
        diameterMinMeters: neo.estimated_diameter.meters.estimated_diameter_min,
        diameterMaxMeters: neo.estimated_diameter.meters.estimated_diameter_max,
        isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
        closeApproachDate: neo.close_approach_data[0]?.close_approach_date,
        missDistanceLunar: neo.close_approach_data[0]
          ? Number.parseFloat(neo.close_approach_data[0].miss_distance.lunar)
          : undefined,
        velocityKmh: neo.close_approach_data[0]
          ? Number.parseFloat(
              neo.close_approach_data[0].relative_velocity.kilometers_per_hour
            )
          : undefined,
        markdown: formatNeoMarkdown(neo),
      }));

      // Build markdown
      let markdown = `### Near Earth Objects: ${start} to ${end}\n\n`;
      markdown += `Found ${data.element_count} asteroids.\n\n`;

      const hazardous = neos.filter((n) => n.isPotentiallyHazardous);
      if (hazardous.length > 0) {
        markdown += `⚠️ **${hazardous.length} potentially hazardous asteroids**\n\n`;
      }

      for (const neo of neos.slice(0, 10)) {
        const hazardIcon = neo.isPotentiallyHazardous ? "⚠️" : "🌑";
        markdown += `${hazardIcon} **${neo.name}**\n`;
        markdown += `- Diameter: ${neo.diameterMinMeters.toFixed(0)}-${neo.diameterMaxMeters.toFixed(0)}m\n`;
        if (neo.missDistanceLunar) {
          markdown += `- Distance: ${neo.missDistanceLunar.toFixed(1)} lunar distances\n`;
        }
        markdown += "\n";
      }

      markdown += "*Source: NASA Center for Near Earth Object Studies*";

      return {
        success: true,
        startDate: start,
        endDate: end,
        count: data.element_count,
        neos,
        markdown,
      } satisfies NeoFeedResult;
    } catch (error) {
      return {
        success: false,
        startDate: startDate || "today",
        endDate: endDate || "today",
        count: 0,
        neos: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies NeoFeedResult;
    }
  },
});

// =============================================================================
// Tool: Mars Rover Photos
// =============================================================================

export type MarsPhotoItem = {
  id: number;
  sol: number;
  earthDate: string;
  imgSrc: string;
  camera: string;
  cameraFullName: string;
  roverName: string;
};

export type MarsPhotosResult = {
  success: boolean;
  rover: string;
  sol?: number;
  earthDate?: string;
  count: number;
  photos: MarsPhotoItem[];
  error?: string;
  markdown: string;
};

export const nasaMarsPhotosTool = tool({
  description:
    "Get photos from NASA Mars rovers (Curiosity, Perseverance, Opportunity, Spirit). " +
    "Returns actual photos taken on Mars surface. " +
    "Use for: Mars exploration, planetary science, space imagery.",
  inputSchema: z.object({
    rover: z
      .string()
      .optional()
      .default("curiosity")
      .describe(
        "Mars rover name. Options: 'curiosity', 'perseverance', 'opportunity', 'spirit'"
      ),
    sol: z
      .number()
      .int()
      .optional()
      .describe("Martian sol (day) to get photos from. Example: 1000"),
    earthDate: z
      .string()
      .optional()
      .describe("Earth date in YYYY-MM-DD format. Alternative to sol."),
    camera: z
      .string()
      .optional()
      .describe(
        "Camera name. Options vary by rover: 'FHAZ' (Front Hazard), 'RHAZ' (Rear Hazard), " +
          "'MAST' (Mast), 'CHEMCAM', 'MAHLI', 'MARDI', 'NAVCAM', 'PANCAM', 'MINITES'"
      ),
  }),
  execute: async ({ rover, sol, earthDate, camera }) => {
    try {
      const apiKey = getApiKey();
      const roverName = rover?.toLowerCase() || "curiosity";

      const params = new URLSearchParams({ api_key: apiKey });

      if (sol !== undefined) {
        params.append("sol", sol.toString());
      } else if (earthDate) {
        params.append("earth_date", earthDate);
      } else {
        // Default to a known good sol for the rover
        const defaultSols: Record<string, number> = {
          curiosity: 3000,
          perseverance: 500,
          opportunity: 5000,
          spirit: 2000,
        };
        params.append("sol", (defaultSols[roverName] || 1000).toString());
      }

      if (camera) {
        params.append("camera", camera.toLowerCase());
      }

      const response = await fetch(
        `${NASA_API_BASE}/mars-photos/api/v1/rovers/${roverName}/photos?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`NASA API error: ${response.status}`);
      }

      const data = (await response.json()) as NasaMarsPhotosResponse;

      if (!data.photos?.length) {
        return {
          success: true,
          rover: roverName,
          sol,
          earthDate,
          count: 0,
          photos: [],
          error: "No photos found for this date/sol. Try a different date.",
          markdown: `No Mars photos found for ${roverName}.`,
        } satisfies MarsPhotosResult;
      }

      const photos: MarsPhotoItem[] = data.photos.slice(0, 20).map((photo) => ({
        id: photo.id,
        sol: photo.sol,
        earthDate: photo.earth_date,
        imgSrc: photo.img_src,
        camera: photo.camera.name,
        cameraFullName: photo.camera.full_name,
        roverName: photo.rover.name,
      }));

      // Build markdown
      let markdown = `### Mars Rover Photos: ${photos[0].roverName}\n\n`;
      markdown += `**Sol:** ${photos[0].sol} | **Earth Date:** ${photos[0].earthDate}\n`;
      markdown += `Found ${data.photos.length} photos.\n\n`;

      for (const photo of photos.slice(0, 5)) {
        markdown += `**${photo.cameraFullName}**\n`;
        markdown += `![Mars Photo ${photo.id}](${photo.imgSrc})\n\n`;
      }

      markdown += "*Source: NASA Mars Rover Photos API*";

      return {
        success: true,
        rover: roverName,
        sol: photos[0].sol,
        earthDate: photos[0].earthDate,
        count: data.photos.length,
        photos,
        markdown,
      } satisfies MarsPhotosResult;
    } catch (error) {
      return {
        success: false,
        rover: rover || "curiosity",
        sol,
        earthDate,
        count: 0,
        photos: [],
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        markdown: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      } satisfies MarsPhotosResult;
    }
  },
});
