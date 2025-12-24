"use client";

import { Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReasoningEffort } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { PopoverContentAuth } from "./popover-content-auth";

type ReasoningPillProps = {
  enabled: boolean;
  onClick?: () => void;
};

function ReasoningPill({ enabled, onClick }: ReasoningPillProps) {
  return (
    <motion.button
      aria-label="Toggle deep thinking"
      className={cn(
        "group flex size-8 items-center justify-center rounded-full border font-medium text-sm transition-all duration-300 ease-out",
        enabled
          ? "border-amber-500/10 bg-amber-500/[0.03] text-amber-600/80 hover:bg-amber-500/[0.06] dark:border-amber-400/10 dark:bg-amber-400/[0.03] dark:text-amber-400/80 dark:hover:bg-amber-400/[0.06]"
          : "border-border/50 bg-transparent text-muted-foreground hover:border-amber-500/20 hover:bg-amber-500/[0.02] hover:text-amber-600/70 dark:bg-input/30 dark:hover:bg-amber-400/[0.02] dark:hover:text-amber-400/70"
      )}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{
          scale: enabled ? 1.1 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
      >
        <Lightbulb className={cn("size-4", enabled && "fill-current")} />
      </motion.div>
    </motion.button>
  );
}

type SelectReasoningEffortProps = {
  reasoningEffort: ReasoningEffort;
  onSelectReasoningEffortAction: (reasoningEffort: ReasoningEffort) => void;
  isUserAuthenticated: boolean;
};

export function SelectReasoningEffort({
  reasoningEffort,
  onSelectReasoningEffortAction,
  isUserAuthenticated,
}: SelectReasoningEffortProps) {
  const isEnabled = reasoningEffort === "xhigh";

  const handleToggle = () => {
    onSelectReasoningEffortAction(isEnabled ? "none" : "xhigh");
  };

  if (!isUserAuthenticated) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <span>
                <ReasoningPill enabled={false} />
              </span>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Think</TooltipContent>
        </Tooltip>
        <PopoverContentAuth />
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <ReasoningPill enabled={isEnabled} onClick={handleToggle} />
        </span>
      </TooltipTrigger>
      <TooltipContent>Think</TooltipContent>
    </Tooltip>
  );
}
