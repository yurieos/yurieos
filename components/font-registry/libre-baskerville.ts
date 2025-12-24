"use client";

import { Libre_Baskerville } from "next/font/google";

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  display: "swap",
});

export const fontVar = libreBaskerville.variable;

