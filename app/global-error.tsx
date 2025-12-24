"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        className={cn(
          "font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-bold text-2xl tracking-tight">
              Something went wrong!
            </h2>
            <p className="max-w-[500px] text-muted-foreground">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
