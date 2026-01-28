# API Client Usage Examples

## Frontend Integration Examples for AI Generation Endpoint

### React/TypeScript Example with Error Handling

```typescript
import { useState } from "react";
import type { GenerateListRequestDTO, GenerateListResponseDTO, ErrorResponse, RateLimitErrorResponse } from "@/types";

export function useAIGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetAt, setResetAt] = useState<string | null>(null);

  const generateList = async (category: string, count: number): Promise<GenerateListResponseDTO | null> => {
    setLoading(true);
    setError(null);
    setResetAt(null);

    try {
      const requestBody: GenerateListRequestDTO = {
        category: category as any,
        count,
      };

      const response = await fetch("/api/ai/generate-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include session cookies
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // Handle success
      if (response.ok) {
        return data as GenerateListResponseDTO;
      }

      // Handle rate limit error
      if (response.status === 429) {
        const rateLimitError = data as RateLimitErrorResponse;
        setError(rateLimitError.message);
        setResetAt(rateLimitError.reset_at || null);
        return null;
      }

      // Handle validation error
      if (response.status === 400) {
        const validationError = data as ErrorResponse;
        setError(validationError.message);
        return null;
      }

      // Handle unauthorized
      if (response.status === 401) {
        setError("Please log in to generate lists");
        // Redirect to login
        window.location.href = "/login";
        return null;
      }

      // Handle other errors
      const errorData = data as ErrorResponse;
      setError(errorData.message || "Failed to generate list");
      return null;
    } catch (err) {
      console.error("Generation error:", err);
      setError("Network error. Please check your connection.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateList,
    loading,
    error,
    resetAt,
  };
}
```

### Usage in Component

```typescript
import { useAIGeneration } from './useAIGeneration';

export function AIGeneratorForm() {
  const { generateList, loading, error, resetAt } = useAIGeneration();
  const [category, setCategory] = useState('animals');
  const [count, setCount] = useState(20);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await generateList(category, count);

    if (result) {
      setGeneratedItems(result.items);
      // Show success message
      alert(`Generated ${result.items.length} words!`);
    }
  };

  return (
    <div>
      <form onSubmit={handleGenerate}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
        >
          <option value="animals">Animals</option>
          <option value="food">Food</option>
          <option value="household_items">Household Items</option>
          <option value="transport">Transport</option>
          <option value="jobs">Jobs</option>
        </select>

        <input
          type="number"
          min={10}
          max={50}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value))}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate List'}
        </button>
      </form>

      {error && (
        <div className="error">
          <p>{error}</p>
          {resetAt && (
            <p>Limit resets at: {new Date(resetAt).toLocaleString()}</p>
          )}
        </div>
      )}

      {generatedItems.length > 0 && (
        <div className="results">
          <h3>Generated Words:</h3>
          <ul>
            {generatedItems.map(item => (
              <li key={item.position}>
                {item.position}. {item.display}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Checking Quota Before Generation

```typescript
import { supabaseClient } from "@/db/supabase.client";
import type { AIQuotaDTO } from "@/types";

export async function checkQuota(): Promise<AIQuotaDTO | null> {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return null;

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabaseClient
      .from("ai_usage_daily")
      .select("used")
      .eq("user_id", user.id)
      .eq("day_utc", today)
      .maybeSingle();

    if (error) {
      console.error("Failed to check quota:", error);
      return null;
    }

    const used = data?.used || 0;
    const remaining = Math.max(0, 5 - used);

    // Calculate next UTC midnight
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return {
      used,
      remaining,
      limit: 5,
      reset_at: tomorrow.toISOString(),
    };
  } catch (err) {
    console.error("Quota check error:", err);
    return null;
  }
}
```

### Quota Display Component

```typescript
import { useEffect, useState } from 'react';
import { checkQuota } from './checkQuota';
import type { AIQuotaDTO } from '@/types';

export function QuotaDisplay() {
  const [quota, setQuota] = useState<AIQuotaDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuota();
  }, []);

  const loadQuota = async () => {
    setLoading(true);
    const quotaData = await checkQuota();
    setQuota(quotaData);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading quota...</div>;
  }

  if (!quota) {
    return <div>Unable to load quota</div>;
  }

  return (
    <div className="quota-display">
      <h4>AI Generation Quota</h4>
      <div className="quota-info">
        <span>Used: {quota.used}/{quota.limit}</span>
        <span>Remaining: {quota.remaining}</span>
      </div>

      {quota.remaining === 0 && (
        <p className="quota-depleted">
          Daily limit reached. Resets at:{' '}
          {new Date(quota.reset_at).toLocaleTimeString()}
        </p>
      )}

      {/* Progress bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${(quota.used / quota.limit) * 100}%`,
            backgroundColor: quota.remaining > 0 ? 'green' : 'red'
          }}
        />
      </div>
    </div>
  );
}
```

### Error Handling Best Practices

```typescript
export function handleAPIError(response: Response, data: any) {
  switch (response.status) {
    case 400:
      // Validation error
      const validationErrors = data.details?.errors || [];
      const errorMessages = validationErrors.map((e: any) => `${e.field}: ${e.message}`).join("\n");
      throw new Error(errorMessages || data.message);

    case 401:
      // Unauthorized - redirect to login
      window.location.href = "/login?redirect=" + window.location.pathname;
      throw new Error("Authentication required");

    case 429:
      // Rate limit
      const resetTime = new Date(data.reset_at).toLocaleString();
      throw new Error(`${data.message}\nLimit resets at ${resetTime}`);

    case 500:
      // Server error
      const retryAfter = data.retry_after || 30;
      throw new Error(`${data.message}\nPlease try again in ${retryAfter} seconds.`);

    default:
      throw new Error(data.message || "An unexpected error occurred");
  }
}
```

### Complete Example with Toast Notifications

```typescript
import { useState } from 'react';
import { toast } from 'react-toastify'; // or your toast library

export function AIGeneratorWithToasts() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const handleGenerate = async (category: string, count: number) => {
    setLoading(true);

    try {
      const response = await fetch('/api/ai/generate-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, count })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error types with appropriate toasts
        if (response.status === 429) {
          toast.error(
            `Daily limit reached! Resets at ${new Date(data.reset_at).toLocaleTimeString()}`,
            { duration: 5000 }
          );
        } else if (response.status === 401) {
          toast.error('Please log in to generate lists');
          setTimeout(() => window.location.href = '/login', 1000);
        } else {
          toast.error(data.message || 'Generation failed');
        }
        return;
      }

      // Success
      setItems(data.items);
      toast.success(`Successfully generated ${data.items.length} words!`);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form UI */}
      <button
        onClick={() => handleGenerate('animals', 20)}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Animals'}
      </button>

      {items.length > 0 && (
        <ul>
          {items.map(item => (
            <li key={item.position}>{item.display}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Testing Tips

1. **Mock the API during development:**

```typescript
// Mock successful response
const mockResponse: GenerateListResponseDTO = {
  success: true,
  items: [
    { position: 1, display: "Cat" },
    { position: 2, display: "Dog" },
    // ... more items
  ],
};

// Use in tests or development
if (import.meta.env.DEV && import.meta.env.MOCK_API) {
  return mockResponse;
}
```

2. **Handle loading states properly** - Show skeleton loaders during generation

3. **Implement retry logic** for transient errors (500 with retry_after)

4. **Cache quota checks** - Avoid excessive database queries

5. **Show time until reset** - Improve UX when limit reached
