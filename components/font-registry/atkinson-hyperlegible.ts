"use client";
import { Atkinson_Hyperlegible } from "next/font/google";
const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson-hyperlegible",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  display: "swap",
});
export const fontVar = atkinsonHyperlegible.variable;
