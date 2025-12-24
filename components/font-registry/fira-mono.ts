"use client";
import { Fira_Mono } from "next/font/google";
const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
  display: "swap",
});
export const fontVar = firaMono.variable;
