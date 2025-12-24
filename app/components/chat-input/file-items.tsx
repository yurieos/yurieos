"use client";

import { ArrowCounterClockwise, X } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FileItemProps = {
  file: File;
  onRemoveAction: (file: File) => void;
};

export function FileItem({ file, onRemoveAction }: FileItemProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [objectUrl] = useState(() => URL.createObjectURL(file));

  useEffect(
    () => () => {
      URL.revokeObjectURL(objectUrl);
    },
    [objectUrl]
  );

  const handleRemove = () => {
    setIsRemoving(true);
    onRemoveAction(file);
  };

  return (
    <div className="relative mr-2 mb-0 flex items-center">
      <HoverCard
        onOpenChange={setIsOpen}
        open={file.type.includes("image") ? isOpen : false}
      >
        <HoverCardTrigger className="w-full">
          <div className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-2 pr-3 shadow-sm backdrop-blur-sm transition-all hover:border-white/20 hover:from-white/[0.12] hover:to-white/[0.06] hover:shadow-md">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10">
              {file.type.includes("image") ? (
                <Image
                  alt={file.name}
                  className="h-full w-full object-cover"
                  height={40}
                  src={objectUrl}
                  width={40}
                />
              ) : (
                <div className="text-center font-semibold text-white/60 text-xs">
                  {file.name.split(".").pop()?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate font-medium text-white/90 text-xs">
                {file.name}
              </span>
              <span className="text-white/50 text-xs">
                {(file.size / 1024).toFixed(2)}kB
              </span>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="top">
          <Image
            alt={file.name}
            className="h-full w-full object-cover"
            height={200}
            src={objectUrl}
            width={200}
          />
        </HoverCardContent>
      </HoverCard>
      {isRemoving ? null : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label="Remove file"
              className="absolute top-1 right-1 z-10 inline-flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-background bg-foreground text-background shadow-none transition-colors"
              onClick={handleRemove}
              type="button"
            >
              <X className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Remove file</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

type ExistingAttachment = {
  url: string;
  filename?: string;
  mediaType?: string;
};

type ExistingFileItemProps = {
  attachment: ExistingAttachment;
  kept: boolean;
  onToggle: (url: string) => void;
};

export function ExistingFileItem({
  attachment,
  kept,
  onToggle,
}: ExistingFileItemProps) {
  const isImage = Boolean(attachment.mediaType?.startsWith("image"));
  const ext = attachment.filename?.split(".").pop()?.toUpperCase();
  const canonicalUrl = attachment.url.split("?")[0];

  const handleToggle = () => onToggle(canonicalUrl);

  return (
    <div className="relative mr-2 mb-0 flex items-center">
      <HoverCard>
        <HoverCardTrigger className="w-full">
          <div
            className={`flex w-full items-center gap-3 rounded-xl border p-2 pr-3 shadow-sm backdrop-blur-sm transition-all ${kept ? "border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] hover:border-white/20 hover:from-white/[0.12] hover:to-white/[0.06] hover:shadow-md" : "border-white/5 bg-white/[0.02] opacity-70"}`}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10">
              {isImage ? (
                <Image
                  alt={attachment.filename || "attachment"}
                  className="h-full w-full object-cover"
                  height={40}
                  src={attachment.url}
                  width={40}
                />
              ) : (
                <div className="text-center font-semibold text-white/60 text-xs">
                  {ext}
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate font-medium text-white/90 text-xs">
                {attachment.filename || "attachment"}
              </span>
              <span className="text-white/50 text-xs">Existing</span>
            </div>
          </div>
        </HoverCardTrigger>
        {isImage && (
          <HoverCardContent side="top">
            <Image
              alt={attachment.filename || "attachment"}
              className="h-full w-full object-cover"
              height={200}
              src={attachment.url}
              width={200}
            />
          </HoverCardContent>
        )}
      </HoverCard>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={kept ? "Remove file" : "Undo remove"}
            className="absolute top-1 right-1 z-10 inline-flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-background bg-foreground text-background shadow-none transition-colors"
            onClick={handleToggle}
            type="button"
          >
            {kept ? (
              <X className="size-3" />
            ) : (
              <ArrowCounterClockwise className="size-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{kept ? "Remove file" : "Undo remove"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
