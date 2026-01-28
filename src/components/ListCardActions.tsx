/**
 * ListCardActions - Dropdown menu for list card actions
 *
 * Features:
 * - Toggle dropdown menu
 * - Edit action (navigate to list detail)
 * - Delete action (with confirmation)
 * - Click outside to close
 * - Stop propagation to prevent card click
 */
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

interface ListCardActionsProps {
  listId: string;
  listName: string;
}

export function ListCardActions({ listId, listName }: ListCardActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleEdit = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/lists/${listId}`;
  };

  const handleDelete = async (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = confirm(`Czy na pewno chcesz usunąć listę "${listName}"? Ta operacja jest nieodwracalna.`);

    if (!confirmed) {
      setIsOpen(false);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to delete list:", error);
        alert("Nie udało się usunąć listy. Spróbuj ponownie.");
        setIsDeleting(false);
        return;
      }

      // Redirect to dashboard after successful deletion
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to delete list:", error);
      alert("Nie udało się usunąć listy. Spróbuj ponownie.");
      setIsDeleting(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        aria-label="Opcje listy"
        aria-expanded={isOpen}
        disabled={isDeleting}
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
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <button
            onClick={handleEdit}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            disabled={isDeleting}
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edytuj
          </button>
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive hover:text-destructive-foreground"
            disabled={isDeleting}
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </button>
        </div>
      )}
    </div>
  );
}
