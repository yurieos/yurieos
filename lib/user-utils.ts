/**
 * User Utilities
 * Helper functions for user display names and user-related operations
 */

// Simple user type for local mode
type UserLike = {
  name?: string;
  preferredName?: string;
  isAnonymous?: boolean;
} | null;

/**
 * Extracts first name from full name
 */
function getFirstName(fullName?: string): string | null {
  if (!fullName) {
    return null;
  }
  return fullName.split(" ")[0];
}

/**
 * Gets the display name - prefer preferredName over extracted first name
 */
export function getDisplayName(user: UserLike): string | null {
  if (user?.preferredName) {
    return user.preferredName;
  }
  return getFirstName(user?.name);
}

/**
 * Gets user timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
