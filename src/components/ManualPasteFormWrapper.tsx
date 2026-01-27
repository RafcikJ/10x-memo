/**
 * ManualPasteFormWrapper - React wrapper for ManualPasteForm
 *
 * This component embeds the Astro ManualPasteForm component
 * Since we can't directly render .astro in React, we use dangerouslySetInnerHTML
 * or we keep it as a separate component
 */

export default function ManualPasteFormWrapper() {
  return (
    <div>
      <form id="manual-paste-form" className="space-y-6">
        {/* Instructions */}
        <div className="rounded-lg bg-muted p-4">
          <h3 className="mb-2 text-sm font-semibold">Jak to działa?</h3>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Wklej listę słówek (każde w nowej linii)</li>
            <li>Minimum 5 słówek, maksimum 200</li>
            <li>System automatycznie przetworzy tekst</li>
          </ol>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <label htmlFor="paste-text" className="text-sm font-medium leading-none">
            Wklej swoje słówka
          </label>
          <textarea
            id="paste-text"
            name="text"
            rows={12}
            required
            placeholder="der Apfel&#10;die Banane&#10;die Orange&#10;..."
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            <span id="line-count">0</span> linii (minimum 5, maksimum 200)
          </p>
        </div>

        {/* Error Message */}
        <div
          id="manual-error"
          className="hidden rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        />

        {/* Submit Button */}
        <button
          type="submit"
          id="manual-submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          Przetwórz tekst
        </button>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            const form = document.getElementById("manual-paste-form");
            const textarea = document.getElementById("paste-text");
            const lineCountSpan = document.getElementById("line-count");
            const errorDiv = document.getElementById("manual-error");

            if (!form || !textarea || !lineCountSpan || !errorDiv) return;

            // Update line count on input
            textarea.addEventListener("input", () => {
              const lines = textarea.value.split("\\n").filter((line) => line.trim().length > 0);
              lineCountSpan.textContent = lines.length.toString();
              errorDiv.classList.add("hidden");
            });

            // Handle form submission
            form.addEventListener("submit", async (e) => {
              e.preventDefault();

              const text = textarea.value.trim();
              const lines = text.split("\\n").filter((line) => line.trim().length > 0);

              // Validation
              if (lines.length < 5) {
                showError("Musisz wkleić co najmniej 5 słówek");
                return;
              }

              if (lines.length > 200) {
                showError("Możesz wkleić maksymalnie 200 słówek");
                return;
              }

              // Sanitize and prepare items
              const items = lines.map((line, index) => ({
                position: index + 1,
                display: sanitizeText(line.trim()),
              }));

              // Dispatch custom event with items
              const event = new CustomEvent("manual-items-generated", {
                detail: { items },
              });
              window.dispatchEvent(event);
            });

            function sanitizeText(text) {
              return text
                .replace(/[<>]/g, "")
                .slice(0, 80)
                .trim();
            }

            function showError(message) {
              errorDiv.textContent = message;
              errorDiv.classList.remove("hidden");
            }
          })();
        `,
        }}
      />
    </div>
  );
}
