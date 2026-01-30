/**
 * WordListItem - Individual word item in list
 *
 * Features:
 * - Display word with position number
 * - Edit/Delete actions (when not locked)
 * - Inline editing
 * - Visual states (normal, editing, locked)
 */
import { useState } from "react";
import { Button } from "./ui/button";
import type { ListItemEntity } from "../types";

interface WordListItemProps {
  item: ListItemEntity;
  isLocked: boolean;
}

export function WordListItem({ item, isLocked }: WordListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempDisplay, setTempDisplay] = useState(item.display);
  const [currentDisplay, setCurrentDisplay] = useState(item.display);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    if (isLocked) return;
    setTempDisplay(currentDisplay);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempDisplay(currentDisplay);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = tempDisplay.trim();

    if (trimmed.length === 0 || trimmed.length > 80) {
      return;
    }

    if (trimmed === currentDisplay) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/lists/${item.list_id}/items/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display: trimmed }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to update item:", error);
        alert("Nie udało się zaktualizować słówka. Spróbuj ponownie.");
        setIsSaving(false);
        return;
      }

      const data = await response.json();
      setCurrentDisplay(data.item.display);
      setIsEditing(false);

      // Reload page to update the list
      window.location.reload();
    } catch (error) {
      console.error("Failed to update item:", error);
      alert("Nie udało się zaktualizować słówka. Spróbuj ponownie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isLocked) return;

    const confirmed = confirm("Czy na pewno chcesz usunąć to słówko?");

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/lists/${item.list_id}/items/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to delete item:", error);
        alert("Nie udało się usunąć słówka. Spróbuj ponownie.");
        setIsDeleting(false);
        return;
      }

      // Reload page to update the list
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Nie udało się usunąć słówka. Spróbuj ponownie.");
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <li className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <span className="text-sm font-medium text-muted-foreground">{item.position}.</span>
        <input
          type="text"
          value={tempDisplay}
          onChange={(e) => setTempDisplay(e.target.value)}
          maxLength={80}
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isSaving}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button onClick={handleSave} size="sm" variant="default" disabled={isSaving}>
          {isSaving ? "Zapisuję..." : "Zapisz"}
        </Button>
        <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
          Anuluj
        </Button>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors ${!isLocked && !isDeleting ? "hover:bg-accent/50" : ""}`}
    >
      <span className="text-sm font-medium text-muted-foreground">{item.position}.</span>
      <span className="flex-1">{currentDisplay}</span>

      {!isLocked && (
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button onClick={handleEdit} size="icon" variant="ghost" title="Edytuj słówko" disabled={isDeleting}>
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
            <span className="sr-only">Edytuj</span>
          </Button>
          <Button onClick={handleDelete} size="icon" variant="ghost" title="Usuń słówko" disabled={isDeleting}>
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
              className="text-destructive"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span className="sr-only">{isDeleting ? "Usuwanie..." : "Usuń"}</span>
          </Button>
        </div>
      )}

      {isLocked && (
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title="Lista zablokowana po pierwszym teście"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </li>
  );
}
