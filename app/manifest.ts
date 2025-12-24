import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yurie",
    short_name: "Yurie",
    description:
      "Your AI Personal Assistant: Chat with multiple AI models, switch between them instantly, and get the best responses",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/Yurie%20App%20Logo.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Yurie%20App%20Logo.png",
        sizes: "500x500",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/mobile-screenshot.png",
        sizes: "1170x2532",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/desktop-screenshot.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    shortcuts: [
      {
        name: "New Chat",
        short_name: "New Chat",
        description: "Start a new conversation",
        url: "/?action=new",
        icons: [
          { src: "/Yurie%20App%20Logo.png", sizes: "96x96", type: "image/png" },
        ],
      },
    ],
    categories: ["productivity", "utilities", "artificial intelligence"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
  };
}
