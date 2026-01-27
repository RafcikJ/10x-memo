/**
 * ListHeader - Editable list header component
 *
 * Features:
 * - Inline editable name
 * - Edit mode toggle
 * - Save/Cancel actions
 * - Visual feedback
 */
import { useState } from "react";
import { Button } from "./ui/button";

interface ListHeaderProps {
  initialName: string;
  listId: string;
  isLocked: boolean;
  onNameUpdate?: (newName: string) => void;
}

export function ListHeader({ initialName, listId, isLocked, onNameUpdate }: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [tempName, setTempName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setTempName(name);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempName(name);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmed = tempName.trim();

    if (trimmed.length === 0 || trimmed.length > 80) {
      return;
    }

    if (trimmed === name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Implement API call to update list name
      const response = await fetch(`/rest/v1/lists?id=eq.${listId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (response.ok) {
        setName(trimmed);
        setIsEditing(false);
        onNameUpdate?.(trimmed);
      }
    } catch (error) {
      console.error("Failed to update list name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          maxLength={80}
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-2xl font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Zapisuję..." : "Zapisz"}
        </Button>
        <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
          Anuluj
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
      <Button onClick={handleEdit} variant="ghost" size="icon" title="Edytuj nazwę">
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
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span className="sr-only">Edytuj nazwę listy</span>
      </Button>
    </div>
  );
}
