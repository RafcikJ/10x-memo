/**
 * QuestionCard - Test question display component
 *
 * Features:
 * - Large, centered display of current word
 * - Question number indicator
 * - Clean, distraction-free design
 */

interface QuestionCardProps {
  prompt: string;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({ prompt, questionNumber, totalQuestions }: QuestionCardProps) {
  return (
    <div className="space-y-4 text-center">
      {/* Progress Indicator */}
      <div className="text-sm text-muted-foreground">
        Pytanie {questionNumber} z {totalQuestions}
      </div>

      {/* Question */}
      <div className="rounded-lg border bg-card p-8 shadow-lg">
        <p className="text-3xl font-bold md:text-4xl">{prompt}</p>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">Wybierz poprawny element</p>
    </div>
  );
}
