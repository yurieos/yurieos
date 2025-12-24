"use client";
import { Open_Sans } from "next/font/google";
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
export const fontVar = openSans.variable;
