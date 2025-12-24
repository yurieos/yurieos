"use client";
import { Architects_Daughter } from "next/font/google";
const architectsDaughter = Architects_Daughter({
  variable: "--font-architects-daughter",
  subsets: ["latin"],
  weight: "400",
  preload: false,
  display: "swap",
});
export const fontVar = architectsDaughter.variable;
