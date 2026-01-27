/**
 * StartTestButton - Sticky button to start test
 *
 * Features:
 * - Sticky positioning (bottom on mobile)
 * - Disabled state when not enough items
 * - Visual feedback
 * - Minimum 5 items validation
 */
import { Button } from "./ui/button";

interface StartTestButtonProps {
  listId: string;
  itemCount: number;
  disabled?: boolean;
}

export function StartTestButton({ listId, itemCount, disabled = false }: StartTestButtonProps) {
  const canStartTest = itemCount >= 5;
  const isDisabled = disabled || !canStartTest;

  return (
    <div className="sticky bottom-4 left-0 right-0 z-10 mt-8 sm:relative sm:bottom-0">
      <Button asChild disabled={isDisabled} size="lg" className="w-full shadow-lg sm:shadow-none">
        <a href={`/lists/${listId}/test`} className={isDisabled ? "pointer-events-none" : ""}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {canStartTest ? "Rozpocznij test" : `Potrzebujesz minimum 5 słówek (masz ${itemCount})`}
        </a>
      </Button>
    </div>
  );
}
