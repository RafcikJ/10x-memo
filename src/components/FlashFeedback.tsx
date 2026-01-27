/**
 * FlashFeedback - Visual feedback for correct/wrong answers
 *
 * Features:
 * - Full-screen color flash (green/red)
 * - Animated entrance/exit
 * - Icon display
 * - Auto-dismiss
 */
import { useEffect } from "react";

interface FlashFeedbackProps {
  isCorrect: boolean;
  onComplete: () => void;
}

export function FlashFeedback({ isCorrect, onComplete }: FlashFeedbackProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center animate-in fade-in ${
        isCorrect ? "bg-green-500/20" : "bg-red-500/20"
      }`}
    >
      <div
        className={`rounded-full p-8 ${
          isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
        } animate-in zoom-in`}
      >
        {isCorrect ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        )}
      </div>
    </div>
  );
}
