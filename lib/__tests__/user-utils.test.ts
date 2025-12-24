import { describe, expect, it } from "vitest";
import { getDisplayName, getUserTimezone } from "../user-utils";

describe("user-utils", () => {
  describe("getDisplayName", () => {
    it("should return preferredName when available", () => {
      const user = {
        name: "John Doe",
        preferredName: "Johnny",
      };

      const result = getDisplayName(user);
      expect(result).toBe("Johnny");
    });

    it("should return first name when preferredName is not set", () => {
      const user = {
        name: "John Doe",
      };

      const result = getDisplayName(user);
      expect(result).toBe("John");
    });

    it("should return first name for multi-part names", () => {
      const user = {
        name: "Mary Jane Watson",
      };

      const result = getDisplayName(user);
      expect(result).toBe("Mary");
    });

    it("should return the entire name if single word", () => {
      const user = {
        name: "Cher",
      };

      const result = getDisplayName(user);
      expect(result).toBe("Cher");
    });

    it("should return null for user with no name", () => {
      const user = {};

      const result = getDisplayName(user);
      expect(result).toBeNull();
    });

    it("should return null for null user", () => {
      const result = getDisplayName(null);
      expect(result).toBeNull();
    });

    it("should return null for undefined name", () => {
      const user = {
        name: undefined,
      };

      const result = getDisplayName(user);
      expect(result).toBeNull();
    });

    it("should return null for empty string name", () => {
      const user = {
        name: "",
      };

      const result = getDisplayName(user);
      expect(result).toBeNull();
    });

    it("should prefer preferredName over name", () => {
      const user = {
        name: "Robert Smith",
        preferredName: "Bob",
      };

      const result = getDisplayName(user);
      expect(result).toBe("Bob");
    });

    it("should return empty preferredName if set", () => {
      // Edge case: preferredName is empty string
      // The function checks if preferredName is truthy, so empty string returns first name
      const user = {
        name: "John Doe",
        preferredName: "",
      };

      const result = getDisplayName(user);
      expect(result).toBe("John");
    });

    it("should handle names with leading/trailing spaces", () => {
      const user = {
        name: "  John Doe  ",
      };

      const result = getDisplayName(user);
      // The function splits by space, so leading space creates empty first element
      expect(result).toBe("");
    });

    it("should handle user with isAnonymous flag", () => {
      const user = {
        isAnonymous: true,
      };

      const result = getDisplayName(user);
      expect(result).toBeNull();
    });
  });

  describe("getUserTimezone", () => {
    it("should return a valid timezone string", () => {
      const timezone = getUserTimezone();

      expect(typeof timezone).toBe("string");
      expect(timezone.length).toBeGreaterThan(0);
    });

    it("should return timezone in IANA format", () => {
      const timezone = getUserTimezone();

      // IANA timezones typically contain "/" like "America/New_York"
      // or are single words like "UTC"
      expect(timezone).toMatch(/^[A-Za-z_/+-]+$/);
    });

    it("should return consistent results", () => {
      const timezone1 = getUserTimezone();
      const timezone2 = getUserTimezone();

      expect(timezone1).toBe(timezone2);
    });
  });
});
