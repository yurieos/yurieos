"use client"

import { cn } from "@/lib/utils"
import React from "react"

interface LoaderProps {
  variant?: "loading-dots" | "dots"
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

function TextDotsLoader({
  className,
  text = "Thinking",
  size = "md",
}: {
  className?: string
  text?: string
  size?: "sm" | "md" | "lg"
}) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <span className={cn("text-primary font-base", textSizes[size])}>
        {text}
      </span>
      <span className="inline-flex">
        <span className="text-primary animate-[loading-dots_1.4s_infinite_0.2s]">
          .
        </span>
        <span className="text-primary animate-[loading-dots_1.4s_infinite_0.4s]">
          .
        </span>
        <span className="text-primary animate-[loading-dots_1.4s_infinite_0.6s]">
          .
        </span>
      </span>
    </div>
  )
}

function DotsLoader({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  }

  const gapSizes = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2",
  }

  return (
    <div className={cn("inline-flex", gapSizes[size], className)}>
      <span className={cn("rounded-full bg-primary animate-[loading-dots_1.4s_infinite_0.2s]", dotSizes[size])} />
      <span className={cn("rounded-full bg-primary animate-[loading-dots_1.4s_infinite_0.4s]", dotSizes[size])} />
      <span className={cn("rounded-full bg-primary animate-[loading-dots_1.4s_infinite_0.6s]", dotSizes[size])} />
    </div>
  )
}

function Loader({ size = "md", text, className, variant = "loading-dots" }: LoaderProps) {
  if (variant === "dots") {
    return <DotsLoader size={size} className={className} />
  }
  return <TextDotsLoader text={text} size={size} className={className} />
}

export { Loader }
