/**
 * AnswerButton - Answer option button
 *
 * Features:
 * - Large touch-friendly button
 * - A/B labeling
 * - Hover and active states
 * - Disabled state during feedback
 */

interface AnswerButtonProps {
  option: "A" | "B";
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

export function AnswerButton({ option, text, onClick, disabled = false }: AnswerButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex min-h-[80px] w-full items-center gap-4 rounded-lg border-2 bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[100px]"
    >
      {/* Option Label */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-lg font-bold text-primary">
        {option}
      </div>

      {/* Answer Text */}
      <div className="flex-1 text-lg font-medium sm:text-xl">{text}</div>

      {/* Arrow Icon (on hover) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}
