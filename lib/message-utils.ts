/**
 * Message Processing Utilities
 * Helper functions for message handling, validation, and processing
 */

import { toast } from "@/components/ui/toast";
import { MESSAGE_MAX_LENGTH } from "@/lib/config";

/**
 * Validates input message
 */
export function validateInput(
  inputMessage: string,
  filesCount = 0,
  userId?: string
): boolean {
  if (!inputMessage.trim() && filesCount === 0) {
    return false;
  }

  if (!userId) {
    toast({ title: "User not found. Please try again.", status: "error" });
    return false;
  }

  if (inputMessage.length > MESSAGE_MAX_LENGTH) {
    toast({
      title: `Message is too long (max ${MESSAGE_MAX_LENGTH} chars).`,
      status: "error",
    });
    return false;
  }

  return true;
}

/**
 * Creates a placeholder message ID
 */
export function createPlaceholderId(): string {
  return `placeholder-${Date.now()}`;
}
