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
  onUpdate?: (id: string, newDisplay: string) => void;
  onDelete?: (id: string) => void;
}

export function WordListItem({ item, isLocked, onUpdate, onDelete }: WordListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempDisplay, setTempDisplay] = useState(item.display);

  const handleEdit = () => {
    if (isLocked) return;
    setTempDisplay(item.display);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempDisplay(item.display);
    setIsEditing(false);
  };

  const handleSave = () => {
    const trimmed = tempDisplay.trim();

    if (trimmed.length === 0 || trimmed.length > 80) {
      return;
    }

    if (trimmed === item.display) {
      setIsEditing(false);
      return;
    }

    onUpdate?.(item.id, trimmed);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (isLocked) return;
    onDelete?.(item.id);
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
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button onClick={handleSave} size="sm" variant="default">
          Zapisz
        </Button>
        <Button onClick={handleCancel} size="sm" variant="outline">
          Anuluj
        </Button>
      </li>
    );
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors ${!isLocked ? "hover:bg-accent/50" : ""}`}
    >
      <span className="text-sm font-medium text-muted-foreground">{item.position}.</span>
      <span className="flex-1">{item.display}</span>

      {!isLocked && (
        <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button onClick={handleEdit} size="icon" variant="ghost" title="Edytuj słówko">
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
          <Button onClick={handleDelete} size="icon" variant="ghost" title="Usuń słówko">
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
            <span className="sr-only">Usuń</span>
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Lista zablokowana po pierwszym teście">
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
