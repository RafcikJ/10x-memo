/**
 * Unit Tests for Auth Validation Schemas
 *
 * Run with: npm test (or your test runner)
 */

import { describe, it, expect } from "vitest";
import { SendMagicLinkSchema, DeleteAccountSchema } from "../../src/lib/validation/auth";

describe("SendMagicLinkSchema", () => {
  describe("email validation", () => {
    it("should accept valid email", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "invalid-email",
      });
      expect(result.success).toBe(false);
    });

    it("should trim and lowercase email", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "  TEST@Example.COM  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("redirectTo validation", () => {
    it("should accept relative path (default)", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
        redirectTo: "/dashboard",
      });
      expect(result.success).toBe(true);
    });

    it("should accept relative path with query params", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
        redirectTo: "/lists/123?view=test",
      });
      expect(result.success).toBe(true);
    });

    it("should accept full URL", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
        redirectTo: "http://localhost:3000/dashboard",
      });
      expect(result.success).toBe(true);
    });

    it("should use default /dashboard if not provided", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.redirectTo).toBe("/dashboard");
      }
    });

    it("should reject invalid redirect format", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
        redirectTo: "javascript:alert(1)", // Security risk
      });
      expect(result.success).toBe(false);
    });

    it("should reject relative path without leading slash", () => {
      const result = SendMagicLinkSchema.safeParse({
        email: "test@example.com",
        redirectTo: "dashboard", // Should be '/dashboard'
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("DeleteAccountSchema", () => {
  it("should accept exact confirmation text", () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation: "USUŃ",
    });
    expect(result.success).toBe(true);
  });

  it("should reject incorrect confirmation", () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation: "DELETE",
    });
    expect(result.success).toBe(false);
  });

  it("should reject lowercase confirmation", () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation: "usuń",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty confirmation", () => {
    const result = DeleteAccountSchema.safeParse({
      confirmation: "",
    });
    expect(result.success).toBe(false);
  });
});
