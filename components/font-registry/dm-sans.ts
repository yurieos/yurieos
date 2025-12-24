"use client";
import { DM_Sans } from "next/font/google";
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
export const fontVar = dmSans.variable;
