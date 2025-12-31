"use client";

import { memo } from "react";
import { Suggestions } from "./suggestions";

type PromptSystemProps = {
  onValueChange: (value: string) => void;
  onSuggestion: (suggestion: string) => void;
  inputValue: string;
};

export const PromptSystem = memo(function PromptSystemComponent({
  onValueChange,
  onSuggestion,
  inputValue,
}: PromptSystemProps) {
  return (
    <div className="relative order-2 w-full py-2">
      <Suggestions
        inputValue={inputValue}
        onSuggestion={onSuggestion}
        onValueChange={onValueChange}
      />
    </div>
  );
});
