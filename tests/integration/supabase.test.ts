/**
 * Example Supabase Integration Test
 * This demonstrates testing with local Supabase instance
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestSupabaseClient, createTestUser, deleteTestUser } from "../helpers/supabase-test-client";

describe("Supabase Integration Tests", () => {
  let testUserId: string;
  const testEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Setup: Create test user
    // Note: This requires local Supabase to be running
    try {
      const result = await createTestUser(testEmail);
      if (result.data.user) {
        testUserId = result.data.user.id;
      }
    } catch (error) {
      console.log("Skipping Supabase tests - local instance not available");
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test user
    if (testUserId) {
      try {
        await deleteTestUser(testUserId);
      } catch (error) {
        console.log("Cleanup failed:", error);
      }
    }
  });

  it("should connect to Supabase", async () => {
    const client = createTestSupabaseClient();
    expect(client).toBeDefined();
  });

  it("should query database tables", async () => {
    const client = createTestSupabaseClient();

    // Example: Query users table
    const { data, error } = await client.from("users").select("*").limit(1);

    // Test passes if we can query (error expected if Supabase not running)
    // Skip assertion if local Supabase is not running
    if (error && error.message.includes("fetch failed")) {
      console.log("Skipping - local Supabase not running");
      return;
    }

    expect(Array.isArray(data)).toBe(true);
  });

  // Add more tests based on your database schema
  it.skip("should test RLS policies", async () => {
    // Example test for Row Level Security
    const client = createTestSupabaseClient();

    // Test that unauthenticated users cannot access protected data
    const { data, error } = await client.from("lists").select("*");

    // Depending on your RLS setup, this might return empty or error
    expect(data).toBeDefined();
  });
});
