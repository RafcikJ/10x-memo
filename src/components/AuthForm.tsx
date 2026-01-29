import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "./ui/button";

interface AuthFormProps {
  redirectTo?: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

function isValidEmail(email: string): boolean {
  // Intentionally simple: UI-level validation only.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthForm({ redirectTo = "/dashboard" }: AuthFormProps) {
  const inputId = useId();
  const messageId = useId();

  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (state === "loading") return false;
    return email.trim().length > 0;
  }, [email, state]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const normalizedEmail = email.trim();
      if (!normalizedEmail) {
        setState("error");
        setMessage("Proszę wprowadzić adres email");
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        setState("error");
        setMessage("Nieprawidłowy format email");
        return;
      }

      setState("loading");
      setMessage(null);

      try {
        const response = await fetch("/api/auth/send-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, redirectTo }),
        });

        if (!response.ok) {
          // UI only: backend will be implemented later.
          let serverMessage: string | undefined;
          try {
            const data = (await response.json()) as { message?: string };
            serverMessage = data?.message;
          } catch {
            // ignore
          }

          setState("error");
          setMessage(serverMessage || "Wystąpił błąd. Spróbuj ponownie.");
          return;
        }

        setState("success");
        setMessage("Link do logowania został wysłany. Sprawdź swoją skrzynkę email.");
        window.location.href = `/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`;
      } catch {
        setState("error");
        setMessage("Wystąpił błąd połączenia. Sprawdź internet i spróbuj ponownie.");
      } finally {
        setState((prev) => (prev === "loading" ? "idle" : prev));
      }
    },
    [email, redirectTo]
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Witaj w Memo</h1>
        <p className="text-muted-foreground">Wprowadź swój email, aby rozpocząć naukę</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} aria-describedby={message ? messageId : undefined}>
        <div className="space-y-2">
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <input
            id={inputId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.com"
            disabled={state === "loading"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {state === "loading" ? (
            <>
              <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Wysyłam...
            </>
          ) : (
            "Wyślij link do logowania"
          )}
        </Button>

        {message && (
          <div
            id={messageId}
            className={`text-sm ${state === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
          >
            {message}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Nie widzisz wiadomości? Sprawdź folder spam / wiadomości-śmieci. Link jest jednorazowy.
        </p>
      </form>
    </div>
  );
}
