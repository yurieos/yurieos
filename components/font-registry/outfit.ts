"use client";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export const fontVar = outfit.variable;


