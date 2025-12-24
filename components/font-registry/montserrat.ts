"use client";

import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export const fontVar = montserrat.variable;
