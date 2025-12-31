import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  APP_BASE_URL,
  APP_DESCRIPTION,
  APP_NAME,
} from "@/lib/config/constants";
import { defaultThemeState } from "@/lib/config/theme";
import { cn } from "@/lib/utils";
import LayoutApp from "./components/layout/layout-app";
import { StructuredData } from "./components/structured-data";
import { LayoutClient } from "./layout-client";
import { AppProviders } from "./providers/app-providers";
import { SidebarProvider } from "./providers/sidebar-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FALLBACK_THEME_STYLES = JSON.stringify(defaultThemeState.styles);

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;var raw=localStorage.getItem("editor-storage");var themeState=null;if(raw){var parsed=JSON.parse(raw);themeState=parsed&&parsed.state&&parsed.state.themeState?parsed.state.themeState:null;}var styles=themeState&&themeState.styles?themeState.styles:${FALLBACK_THEME_STYLES};var isOldYurie=themeState&&((themeState.preset==="yurie")||(!themeState.preset))&&styles&&styles.light&&((styles.light.background==="oklch(1 0 0)"&&styles.light.foreground==="oklch(0.141 0.005 285.823)")||(styles.light.background==="oklch(1 0 0)"&&styles.light.foreground==="oklch(0.145 0 0)"&&styles.light.primary==="oklch(0.205 0 0)")||(styles.light.background==="#fcfcfc"&&styles.light.foreground==="#171717"&&styles.light.ring==="#f4765f")||(styles.light.background==="#ffffff"&&styles.light.ring==="#a1a1a1"&&styles.light.primary==="#737373")||(styles.light.background==="#ffffff"&&styles.light.ring==="#3b82f6"&&styles.light.primary==="#3b82f6")||(styles.light.background==="#ffffff"&&styles.light.foreground==="#000000"&&styles.light.card==="#f9fafb"&&styles.light.border==="#e5e7eb"&&styles.light.ring==="#e50914"&&styles.light.primary==="#e50914"&&styles.light.sidebar==="#f9fafb")||(styles.light.background==="#f0f0f0"&&styles.light.foreground==="#333333"&&styles.light.card==="#f5f5f5"&&styles.light.border==="#d0d0d0"&&styles.light.ring==="#606060"&&styles.light.primary==="#606060"&&styles.light.sidebar==="#eaeaea")||(styles.light.background==="#f5f1e6"&&styles.light.foreground==="#4a3f35"&&styles.light.card==="#fffcf5"&&styles.light.border==="#dbd0ba"&&styles.light.ring==="#a67c52"&&styles.light.primary==="#a67c52"&&styles.light.sidebar==="#ece5d8"));if(isOldYurie){styles=${FALLBACK_THEME_STYLES};}var mode=themeState&&(themeState.currentMode==="dark"||themeState.currentMode==="light")?themeState.currentMode:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(mode==="dark"){root.classList.add("dark");}else{root.classList.remove("dark");}var COMMON={"font-sans":1,"font-serif":1,"font-mono":1,"radius":1,"shadow-opacity":1,"shadow-blur":1,"shadow-spread":1,"shadow-offset-x":1,"shadow-offset-y":1,"letter-spacing":1,"spacing":1};var SKIP_FONTS={"font-sans":1,"font-mono":1};var apply=function(obj,skip){for(var key in obj){if(Object.prototype.hasOwnProperty.call(obj,key)){if(skip&&skip[key]){continue;}var val=obj[key];if(typeof val==="string"&&val.length>0){root.style.setProperty("--"+key,val);}}}};if(styles&&styles.light){apply(styles.light,SKIP_FONTS);}if(styles&&styles[mode]){apply(styles[mode],COMMON);}var current=styles&&styles[mode]?styles[mode]:null;var sans=current&&current["font-sans"];var mono=current&&current["font-mono"];if(typeof sans==="string"&&sans.length>0){root.style.setProperty("--active-font-sans",sans);}if(typeof mono==="string"&&mono.length>0){root.style.setProperty("--active-font-mono",mono);}}catch(e){}})();`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  metadataBase: new URL(APP_BASE_URL),
  icons: {
    icon: [
      { url: "/Yurie%20OS%20Logo.svg", type: "image/svg+xml" },
      { url: "/Yurie%20OS%20Logo.png", sizes: "500x500", type: "image/png" },
    ],
    shortcut: "/Yurie%20App%20Logo.png",
    apple: "/Yurie%20App%20Logo.png",
  },
  keywords: [
    "Yurie",
    "Yurie AI",
    "yurie.ai",
    "yurie ai",
    "AI chat",
    "AI personal assistant",
    "AI chat platform",
    "multi-AI platform",
    "AI model aggregator",
    "unified AI interface",
    "AI assistant dashboard",
    "AI model comparison tool",
    "multi-model AI",
    "AI chat with multiple models",
    "switch between AI models",
    "compare AI responses",
    "privacy-focused AI chat",
    "web search AI",
    "reasoning models",
    "o1 models",
    "AI assistant",
    "productivity AI",
    "multi-model AI chat application",
  ],
  creator: "Yurie Team",
  publisher: "Yurie",
  applicationName: APP_NAME,
  category: "Productivity Software",
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Yurie",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html className="h-svh overflow-hidden" lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Must run before first paint to prevent theme border/outline flash on refresh.
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
          id="theme-init"
        />
        <StructuredData type="homepage" />
      </head>
      <body
        className={cn(
          "h-full overflow-hidden font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        {!isDev &&
          process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              strategy="afterInteractive"
            />
          )}
        <LayoutClient />
        <TooltipProvider>
          <AppProviders>
            <SidebarProvider>
              <LayoutApp>{children}</LayoutApp>
            </SidebarProvider>
            <Analytics />
            <SpeedInsights />
          </AppProviders>
        </TooltipProvider>
      </body>
    </html>
  );
}
