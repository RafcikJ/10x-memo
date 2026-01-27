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
import type { GeneratedListItem } from "../types";

type Mode = "ai" | "manual";

interface ListCreatorProps {
  quotaRemaining: number;
}

export function ListCreator({ quotaRemaining }: ListCreatorProps) {
  const [mode, setMode] = useState<Mode>("ai");
  const [draftItems, setDraftItems] = useState<GeneratedListItem[]>([]);

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

  const handleAiGenerated = (items: GeneratedListItem[]) => {
    setDraftItems(items);
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
          <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
            {draftItems.map((item) => (
              <div key={item.position} className="flex items-center gap-3 rounded-md bg-muted p-3">
                <span className="text-sm font-medium text-muted-foreground">{item.position}.</span>
                <span className="flex-1">{item.display}</span>
                <button
                  type="button"
                  onClick={() => setDraftItems(draftItems.filter((i) => i.position !== item.position))}
                  className="text-muted-foreground hover:text-destructive"
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

          {/* Save Button */}
          <button
            type="button"
            onClick={() => {
              // TODO: Implement save list functionality
              console.log("Saving list with items:", draftItems);
            }}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Zapisz listę
          </button>
        </div>
      )}
    </div>
  );
}
