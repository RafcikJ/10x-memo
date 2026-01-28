/**
 * ListCreator - Main component for list creation
 *
 * Orchestrates:
 * - Mode switching (AI/Manual)
 * - Form display
 * - Draft management
 * - List saving
 */
import { useState, useEffect } from "react";
import { ModeSegmentedControl } from "./ModeSegmentedControl";
import { AiGeneratorForm } from "./AiGeneratorForm";
import ManualPasteFormWrapper from "./ManualPasteFormWrapper";
import type { GeneratedListItem, CreateListWithItemsDTO, NounCategory } from "../types";

type Mode = "ai" | "manual";

interface ListCreatorProps {
  quotaRemaining: number;
  defaultCategory?: NounCategory;
}

export function ListCreator({ quotaRemaining, defaultCategory }: ListCreatorProps) {
  const [mode, setMode] = useState<Mode>("ai");
  const [draftItems, setDraftItems] = useState<GeneratedListItem[]>([]);
  const [listName, setListName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [category, setCategory] = useState<NounCategory | undefined>(defaultCategory);

  useEffect(() => {
    // Listen for manual items generated event
    const handleManualItems = (e: Event) => {
      const customEvent = e as CustomEvent<{ items: GeneratedListItem[] }>;
      setDraftItems(customEvent.detail.items);
    };

    window.addEventListener("manual-items-generated", handleManualItems);

    return () => {
      window.removeEventListener("manual-items-generated", handleManualItems);
    };
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setDraftItems([]); // Clear draft on mode change
  };

  const handleAiGenerated = (items: GeneratedListItem[], generatedCategory?: NounCategory) => {
    setDraftItems(items);
    if (generatedCategory) {
      setCategory(generatedCategory);
    }
  };

  const handleSaveList = async () => {
    if (draftItems.length === 0) {
      setSaveError("Brak elementów do zapisania");
      return;
    }

    // Generate default name if empty
    const finalName = listName.trim() || `Lista ${new Date().toLocaleDateString("pl-PL")}`;

    setSaving(true);
    setSaveError(null);

    try {
      const requestData: CreateListWithItemsDTO = {
        name: finalName,
        source: mode,
        category: mode === "ai" ? category : null,
        items: draftItems,
      };

      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Nie udało się zapisać listy");
      }

      const data = await response.json();
      console.log("Lista zapisana pomyślnie:", data.list);

      // Redirect to dashboard or list detail
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Błąd podczas zapisywania listy:", err);
      setSaveError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
    } finally {
      setSaving(false);
    }
  };

  const hasData = draftItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex justify-center">
        <ModeSegmentedControl mode={mode} onModeChange={handleModeChange} hasData={hasData} />
      </div>

      {/* Forms */}
      <div className="rounded-lg border bg-card p-6">
        {mode === "ai" ? (
          <AiGeneratorForm onGenerated={handleAiGenerated} quotaRemaining={quotaRemaining} />
        ) : (
          <ManualPasteFormWrapper />
        )}
      </div>

      {/* Draft Preview */}
      {draftItems.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Podgląd listy ({draftItems.length} słówek)</h2>

          {/* List Name Input */}
          <div className="mb-4 space-y-2">
            <label htmlFor="list-name" className="text-sm font-medium leading-none">
              Nazwa listy
            </label>
            <input
              id="list-name"
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={`Lista ${new Date().toLocaleDateString("pl-PL")}`}
              disabled={saving}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">Pozostaw puste, aby użyć domyślnej nazwy</p>
          </div>

          <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
            {draftItems.map((item) => (
              <div key={item.position} className="flex items-center gap-3 rounded-md bg-muted p-3">
                <span className="text-sm font-medium text-muted-foreground">{item.position}.</span>
                <span className="flex-1">{item.display}</span>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = draftItems.filter((i) => i.position !== item.position);
                    // Reindex positions to maintain continuity
                    const reindexed = filtered.map((i, idx) => ({ ...i, position: idx + 1 }));
                    setDraftItems(reindexed);
                  }}
                  disabled={saving}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                  aria-label={`Usuń ${item.display}`}
                >
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
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {saveError && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {saveError}
            </div>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveList}
            disabled={saving || draftItems.length === 0}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Zapisywanie...
              </span>
            ) : (
              "Zapisz listę"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
