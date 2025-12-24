"use client";
import { IBM_Plex_Mono } from "next/font/google";
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});
export const fontVar = ibmPlexMono.variable;
