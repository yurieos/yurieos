"use client";
import { Space_Grotesk } from "next/font/google";
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
export const fontVar = spaceGrotesk.variable;
