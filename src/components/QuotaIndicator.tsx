/**
 * QuotaIndicator - AI generation quota display
 *
 * Shows remaining AI generations for the day
 * Dynamically updates based on usage
 */
import { useEffect, useState } from "react";
import type { AIQuotaDTO } from "../types";

interface QuotaIndicatorProps {
  initialQuota?: AIQuotaDTO;
}

export function QuotaIndicator({ initialQuota }: QuotaIndicatorProps) {
  const [quota, setQuota] = useState<AIQuotaDTO | null>(initialQuota ?? null);
  const [loading, setLoading] = useState(!initialQuota);

  useEffect(() => {
    // Fetch quota if not provided
    if (!initialQuota) {
      fetchQuota();
    }
  }, [initialQuota]);

  const fetchQuota = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual API call to get quota
      // This is a placeholder
      const response = await fetch("/rest/v1/rpc/get_ai_quota");
      if (response.ok) {
        const data = await response.json();
        setQuota(data);
      }
    } catch (error) {
      console.error("Failed to fetch AI quota:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>AI: ...</span>
      </div>
    );
  }

  if (!quota) {
    return null;
  }

  const isLow = quota.remaining <= 1;
  const isEmpty = quota.remaining === 0;

  return (
    <div className="flex items-center gap-2">
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
        className={isEmpty ? "text-destructive" : isLow ? "text-yellow-500" : "text-muted-foreground"}
      >
        <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M12 2v2" />
        <path d="M12 22v-2" />
        <path d="m17 20.66-1-1.73" />
        <path d="M11 10.27 7 3.34" />
        <path d="m20.66 17-1.73-1" />
        <path d="m3.34 7 1.73 1" />
        <path d="M14 12h8" />
        <path d="M2 12h2" />
        <path d="m20.66 7-1.73 1" />
        <path d="m3.34 17 1.73-1" />
        <path d="m17 3.34-1 1.73" />
        <path d="m11 13.73-4 6.93" />
      </svg>
      <span
        className={`text-sm font-medium ${isEmpty ? "text-destructive" : isLow ? "text-yellow-500" : "text-foreground"}`}
      >
        AI: {quota.remaining}/{quota.limit}
      </span>
    </div>
  );
}
