"use client";
import { JetBrains_Mono } from "next/font/google";
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
export const fontVar = jetbrainsMono.variable;
