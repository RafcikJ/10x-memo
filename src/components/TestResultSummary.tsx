/**
 * TestResultSummary - Test completion summary modal
 *
 * Features:
 * - Score display with percentage
 * - Correct/Wrong count
 * - Confetti animation for good scores
 * - Return to list button
 */
import { useEffect } from "react";
import { Button } from "./ui/button";

interface TestResultSummaryProps {
  correct: number;
  wrong: number;
  total: number;
  score: number;
  listId: string;
}

export function TestResultSummary({ correct, wrong, total, score, listId }: TestResultSummaryProps) {
  useEffect(() => {
    // Trigger confetti for scores >= 80%
    if (score >= 80) {
      // TODO: Implement confetti animation
      console.log("🎉 Confetti!");
    }
  }, [score]);

  const getScoreColor = () => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMessage = () => {
    if (score >= 90) return "Doskonale!";
    if (score >= 80) return "Świetnie!";
    if (score >= 70) return "Bardzo dobrze!";
    if (score >= 60) return "Dobrze!";
    return "Nie poddawaj się!";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg animate-in zoom-in">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          {score >= 80 ? (
            <div className="rounded-full bg-green-500/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600 dark:text-green-400"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
          ) : (
            <div className="rounded-full bg-primary/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <h2 className="mb-2 text-center text-2xl font-bold">{getMessage()}</h2>
        <p className="mb-6 text-center text-muted-foreground">Test zakończony</p>

        {/* Score */}
        <div className="mb-6 text-center">
          <div className={`text-5xl font-bold ${getScoreColor()}`}>{score}%</div>
        </div>

        {/* Details */}
        <div className="mb-6 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Pytań</div>
          </div>
          <div className="rounded-lg bg-green-500/10 p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{correct}</div>
            <div className="text-xs text-muted-foreground">Dobrze</div>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{wrong}</div>
            <div className="text-xs text-muted-foreground">Źle</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button asChild className="w-full">
            <a href={`/lists/${listId}`}>Wróć do listy</a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/dashboard">Pulpit</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
