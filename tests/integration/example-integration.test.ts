/**
 * Example Integration Test
 * This demonstrates testing multiple components/services together
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupMockServer } from "../mocks/server";

// Setup MSW server for integration tests
setupMockServer();

describe("Integration Tests Example", () => {
  beforeEach(() => {
    // Reset state before each test
    vi.clearAllMocks();
  });

  it("should integrate multiple services", async () => {
    // Example integration test
    // This would test how multiple parts of your app work together

    const mockData = { id: "1", name: "Test" };

    expect(mockData).toBeDefined();
    expect(mockData.id).toBe("1");
  });

  it("should handle API integration with MSW", async () => {
    // MSW will intercept this request using handlers from tests/mocks/handlers.ts
    const response = await fetch("http://localhost:4321/api/lists");
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("id");
  });

  it("should test data flow between components", () => {
    // Example: Test how data flows from one component to another
    const inputData = "test input";
    const processedData = inputData.toUpperCase();

    expect(processedData).toBe("TEST INPUT");
  });
});
