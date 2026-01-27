/**
 * DeleteAccountDialog - Two-step account deletion flow
 *
 * Features:
 * - Warning message
 * - Confirmation input (must type "DELETE")
 * - Permanent deletion warning
 * - GDPR compliance
 */
import { useState } from "react";
import { Button } from "./ui/button";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmation !== "USUŃ") {
      setError('Musisz wpisać "USUŃ" aby potwierdzić');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // TODO: Implement API call to delete account
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (response.ok) {
        // Redirect to home page after successful deletion
        window.location.href = "/";
      } else {
        const data = await response.json();
        setError(data.message || "Nie udało się usunąć konta");
      }
    } catch (err) {
      setError("Wystąpił błąd połączenia");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmation("");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2">
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
              className="text-destructive"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M3.6 9h16.8" />
              <path d="M19.2 9 18 20.3c-.1.9-.8 1.7-1.7 1.7H7.7c-.9 0-1.6-.8-1.7-1.7L4.8 9" />
              <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Usuń konto</h2>
            <p className="text-sm text-muted-foreground">Ta operacja jest nieodwracalna</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 space-y-3 text-sm">
          <p className="font-medium">Po usunięciu konta:</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>Wszystkie Twoje listy słówek zostaną trwale usunięte</li>
            <li>Historia testów zostanie utracona</li>
            <li>Dane konta zostaną usunięte zgodnie z RODO</li>
            <li>Ta operacja nie może być cofnięta</li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6 space-y-2">
          <label htmlFor="delete-confirmation" className="text-sm font-medium">
            Wpisz <strong>USUŃ</strong> aby potwierdzić
          </label>
          <input
            id="delete-confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
            placeholder="USUŃ"
            disabled={isDeleting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose} variant="outline" disabled={isDeleting}>
            Anuluj
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting || confirmation !== "USUŃ"}
          >
            {isDeleting ? "Usuwam..." : "Usuń konto"}
          </Button>
        </div>
      </div>
    </>
  );
}
