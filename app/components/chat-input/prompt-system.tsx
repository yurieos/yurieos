"use client";

import { memo } from "react";
import { Suggestions } from "./suggestions";

type PromptSystemProps = {
  onValueChange: (value: string) => void;
  onSuggestion: (suggestion: string) => void;
  isEmpty: boolean;
};

export const PromptSystem = memo(function PromptSystemComponent({
  onValueChange,
  onSuggestion,
  isEmpty,
}: PromptSystemProps) {
  return (
    <div className="relative order-2 w-full py-2">
      <Suggestions
        isEmpty={isEmpty}
        onSuggestion={onSuggestion}
        onValueChange={onValueChange}
      />
    </div>
  );
});
