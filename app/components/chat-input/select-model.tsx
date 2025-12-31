"use client";

import { Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODELS } from "@/lib/config/models";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<string, string> = {
  openai: "/openai.svg",
  google: "/gemini.svg",
  anthropic: "/claude.svg",
};

function getProviderIcon(
  provider: string,
  displayProvider?: string
): string | undefined {
  return PROVIDER_ICONS[displayProvider ?? provider];
}

type ModelPillProps = {
  modelName: string;
  iconSrc?: string;
  displayProvider?: string;
  onClick?: () => void;
};

function ModelPill({
  modelName,
  iconSrc,
  displayProvider,
  onClick,
}: ModelPillProps) {
  const needsInvert = displayProvider === "openai";

  return (
    <motion.button
      aria-label="Select model"
      className={cn(
        "group flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-medium text-sm transition-all duration-300 ease-out",
        "border-border/50 bg-transparent text-muted-foreground hover:border-foreground/20 hover:bg-foreground/[0.02] hover:text-foreground/70 dark:bg-input/30 dark:hover:bg-foreground/[0.02] dark:hover:text-foreground/70"
      )}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.95 }}
    >
      {iconSrc && (
        <Image
          alt=""
          className={cn("size-4 shrink-0", needsInvert && "dark:invert")}
          height={16}
          src={iconSrc}
          width={16}
        />
      )}
      <span className="max-w-24 truncate">{modelName}</span>
      <ChevronDown className="size-3.5 opacity-60" />
    </motion.button>
  );
}

type SelectModelProps = {
  selectedModel: string;
  onSelectModelAction: (modelId: string) => void;
};

export function SelectModel({
  selectedModel,
  onSelectModelAction,
}: SelectModelProps) {
  const currentModel = MODELS.find((m) => m.id === selectedModel);
  const displayName = currentModel?.name ?? selectedModel;

  // Use explicit shortName if available, otherwise extract first word
  const shortName =
    currentModel?.shortName ?? displayName.split(" ")[0] ?? displayName;

  const currentIcon = currentModel
    ? getProviderIcon(currentModel.provider, currentModel.displayProvider)
    : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <ModelPill
                  displayProvider={
                    currentModel?.displayProvider ?? currentModel?.provider
                  }
                  iconSrc={currentIcon}
                  modelName={shortName}
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {MODELS.map((model) => {
                const iconSrc = getProviderIcon(
                  model.provider,
                  model.displayProvider
                );
                const needsInvert =
                  (model.displayProvider ?? model.provider) === "openai";
                return (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    key={model.id}
                    onClick={() => onSelectModelAction(model.id)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {iconSrc && (
                          <Image
                            alt=""
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              needsInvert && "dark:invert"
                            )}
                            height={16}
                            src={iconSrc}
                            width={16}
                          />
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{model.name}</span>
                          {model.description && (
                            <span className="max-w-56 text-muted-foreground text-xs">
                              {model.description.split("\n")[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {model.id === selectedModel && (
                        <Check className="size-4 shrink-0 text-foreground" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </TooltipTrigger>
      <TooltipContent>Select model</TooltipContent>
    </Tooltip>
  );
}
