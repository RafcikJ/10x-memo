/**
 * AiGeneratorForm - AI-powered list generation form
 *
 * Features:
 * - Category selection
 * - Word count slider (10-50)
 * - Quota indicator
 * - Multi-step loading states
 * - Error handling
 */
import { useState } from "react";
import { Button } from "./ui/button";
import type { NounCategory, GenerateListRequestDTO, GeneratedListItem } from "../types";

const CATEGORIES: { value: NounCategory; label: string }[] = [
  { value: "animals", label: "Zwierzęta" },
  { value: "food", label: "Jedzenie" },
  { value: "household_items", label: "Przedmioty domowe" },
  { value: "transport", label: "Transport" },
  { value: "jobs", label: "Zawody" },
];

type LoadingStep = "connecting" | "generating" | "verifying";

interface AiGeneratorFormProps {
  onGenerated: (items: GeneratedListItem[], category?: NounCategory) => void;
  quotaRemaining: number;
}

export function AiGeneratorForm({ onGenerated, quotaRemaining }: AiGeneratorFormProps) {
  const [category, setCategory] = useState<NounCategory>("animals");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("connecting");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quotaRemaining <= 0) {
      setError("Wykorzystałeś dzisiejszy limit generacji AI. Spróbuj ponownie jutro.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Connecting
      setLoadingStep("connecting");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Generating
      setLoadingStep("generating");
      const requestData: GenerateListRequestDTO = { category, count };

      const response = await fetch("/api/ai/generate-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Nie udało się wygenerować listy");
      }

      // Step 3: Verifying
      setLoadingStep("verifying");
      await new Promise((resolve) => setTimeout(resolve, 500));

      const data = await response.json();
      onGenerated(data.items, category);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
    } finally {
      setLoading(false);
    }
  };

  const getLoadingMessage = () => {
    switch (loadingStep) {
      case "connecting":
        return "Łączę z AI...";
      case "generating":
        return "Generuję listę słówek...";
      case "verifying":
        return "Weryfikuję wyniki...";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Selection */}
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium leading-none">
          Kategoria
        </label>
        <select
          id="category"
          data-test-id="ai-category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as NounCategory)}
          disabled={loading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Word Count Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="count" className="text-sm font-medium leading-none">
            Liczba słówek
          </label>
          <span className="text-sm text-muted-foreground" data-test-id="ai-word-count-display">
            {count}
          </span>
        </div>
        <input
          id="count"
          data-test-id="ai-word-count-slider"
          type="range"
          min="10"
          max="50"
          step="5"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={loading}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10</span>
          <span>50</span>
        </div>
      </div>

      {/* Quota Indicator */}
      <div className="rounded-lg bg-muted p-3" data-test-id="ai-quota-indicator">
        <div className="flex items-center gap-2 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={quotaRemaining === 0 ? "text-destructive" : "text-muted-foreground"}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span data-test-id="ai-quota-remaining">
            Pozostało <strong>{quotaRemaining}/5</strong> generacji na dziś
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          data-test-id="ai-error-message"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || quotaRemaining === 0}
        className="w-full"
        data-test-id="ai-generate-button"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {getLoadingMessage()}
          </span>
        ) : (
          "Generuj listę"
        )}
      </Button>
    </form>
  );
}
