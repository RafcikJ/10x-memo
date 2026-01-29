import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "./ui/button";

interface CheckEmailContentProps {
  email: string;
  countdownSeconds?: number;
}

type ResendState = "idle" | "resending" | "success" | "error";

export function CheckEmailContent({ email, countdownSeconds = 60 }: CheckEmailContentProps) {
  const statusId = useId();

  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const [state, setState] = useState<ResendState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [secondsLeft]);

  const canResend = useMemo(() => secondsLeft <= 0 && state !== "resending", [secondsLeft, state]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;

    setState("resending");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        let serverMessage: string | undefined;
        try {
          const data = (await response.json()) as { message?: string };
          serverMessage = data?.message;
        } catch {
          // ignore
        }
        setState("error");
        setMessage(serverMessage || "Nie udało się wysłać ponownie. Spróbuj jeszcze raz.");
        return;
      }

      setState("success");
      setMessage("Link został wysłany ponownie!");
      setSecondsLeft(countdownSeconds);
    } catch {
      setState("error");
      setMessage("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setState((prev) => (prev === "resending" ? "idle" : prev));
    }
  }, [canResend, countdownSeconds, email]);

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            aria-hidden="true"
          >
            <path d="M4 4h16v16H4z" opacity="0" />
            <path d="m4 6 8 7 8-7" />
            <path d="M4 6v12h16V6" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Sprawdź swoją skrzynkę email</h1>
          <p className="text-sm text-muted-foreground">
            Wysłaliśmy link logowania na adres <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border bg-background p-4 text-sm">
          {secondsLeft > 0 ? (
            <p className="text-muted-foreground">
              Możesz wysłać ponownie za <span className="font-medium text-foreground">{secondsLeft}s</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Jeśli link nie dotarł, możesz wysłać go ponownie.</p>
          )}
        </div>

        <Button type="button" className="w-full" onClick={handleResend} disabled={!canResend}>
          {state === "resending" ? "Wysyłam..." : "Wyślij ponownie"}
        </Button>

        {message && (
          <div
            id={statusId}
            className={`text-sm ${state === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}
            role={state === "error" ? "alert" : "status"}
            aria-live={state === "error" ? "assertive" : "polite"}
          >
            {message}
          </div>
        )}

        <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
          Nie widzisz wiadomości? Sprawdź folder spam / wiadomości-śmieci. Czasem dostarczenie emaila może potrwać
          chwilę.
        </div>
      </div>

      <div className="text-center">
        <a href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          Wróć do strony głównej
        </a>
      </div>
    </div>
  );
}
