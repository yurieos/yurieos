'use client';
import { Atkinson_Hyperlegible_Mono } from 'next/font/google';

const atkinsonHyperlegibleMono = Atkinson_Hyperlegible_Mono({
  variable: '--font-atkinson-hyperlegible-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
  preload: false,
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['ui-monospace'],
});
export const fontVar = atkinsonHyperlegibleMono.variable;
