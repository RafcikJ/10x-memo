/**
 * ModeSegmentedControl - Mode switcher component (AI vs Manual)
 *
 * Features:
 * - Segmented control for two modes
 * - Warns user before switching if data exists
 * - Clears data on mode change
 */
import { useState } from "react";

type Mode = "ai" | "manual";

interface ModeSegmentedControlProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  hasData?: boolean;
}

export function ModeSegmentedControl({ mode, onModeChange, hasData = false }: ModeSegmentedControlProps) {
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);

  const handleModeClick = (newMode: Mode) => {
    if (newMode === mode) return;

    // If has data, show warning
    if (hasData) {
      setPendingMode(newMode);
    } else {
      onModeChange(newMode);
    }
  };

  const confirmModeChange = () => {
    if (pendingMode) {
      onModeChange(pendingMode);
      setPendingMode(null);
    }
  };

  const cancelModeChange = () => {
    setPendingMode(null);
  };

  return (
    <>
      <div
        className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ai"}
          onClick={() => handleModeClick("ai")}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            mode === "ai" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
          }`}
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
            className="mr-2"
          >
            <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
            <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            <path d="M12 2v2" />
            <path d="M12 22v-2" />
            <path d="m17 20.66-1-1.73" />
            <path d="M11 10.27 7 3.34" />
            <path d="m20.66 17-1.73-1" />
            <path d="m3.34 7 1.73 1" />
            <path d="M14 12h8" />
            <path d="M2 12h2" />
            <path d="m20.66 7-1.73 1" />
            <path d="m3.34 17 1.73-1" />
            <path d="m17 3.34-1 1.73" />
            <path d="m11 13.73-4 6.93" />
          </svg>
          Generuj AI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => handleModeClick("manual")}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            mode === "manual" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
          }`}
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
            className="mr-2"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Wklej tekst
        </button>
      </div>

      {/* Confirmation Dialog */}
      {pendingMode && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={cancelModeChange} />

          {/* Dialog */}
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-semibold">Zmienić tryb tworzenia?</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Wprowadzone dane zostaną utracone. Czy na pewno chcesz kontynuować?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelModeChange}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Anuluj
              </button>
              <button
                onClick={confirmModeChange}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Zmień tryb
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
