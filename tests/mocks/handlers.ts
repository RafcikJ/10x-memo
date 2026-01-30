/**
 * MSW Request Handlers
 * Mock API responses for testing
 */

import { http, HttpResponse } from "msw";

// Define your API base URL
const API_BASE = "http://localhost:4321/api";

export const handlers = [
  // Example: Mock OpenRouter API
  http.post("https://openrouter.ai/api/v1/chat/completions", () => {
    return HttpResponse.json({
      id: "mock-completion-id",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Mocked AI response for testing",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }),

  // Example: Mock Supabase Auth
  http.post(`${API_BASE}/auth/send-magic-link`, () => {
    return HttpResponse.json({
      success: true,
      message: "Magic link sent",
    });
  }),

  // Example: Mock Lists API
  http.get(`${API_BASE}/lists`, () => {
    return HttpResponse.json([
      {
        id: "1",
        title: "Test List",
        description: "Test Description",
        items_count: 5,
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Add more handlers as needed
];
