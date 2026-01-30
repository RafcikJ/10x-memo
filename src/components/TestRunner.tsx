/**
 * TestRunner - Main test logic component
 *
 * Features:
 * - Question state machine (question → answer → feedback → next)
 * - Randomized question order
 * - A/B answer randomization
 * - Score tracking
 * - API submission on completion
 */
import { useState, useEffect } from "react";
import { QuestionCard } from "./QuestionCard";
import { AnswerButton } from "./AnswerButton";
import { FlashFeedback } from "./FlashFeedback";
import { TestResultSummary } from "./TestResultSummary";
import type { ListItemEntity } from "../types";

interface TestRunnerProps {
  listId: string;
  items: ListItemEntity[];
}

type TestState = "question" | "feedback" | "completed";

interface Question {
  correctAnswer: string;
  wrongAnswer: string;
  optionA: string;
  optionB: string;
  correctIsA: boolean;
}

export function TestRunner({ listId, items }: TestRunnerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [state, setState] = useState<TestState>("question");
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [, setIsSubmitting] = useState(false);

  // Initialize questions
  useEffect(() => {
    // Test is sequential in list order (items are already sorted in the page)
    const generatedQuestions: Question[] = items.map((item, index) => {
      // Get a random wrong answer from other items (fallback to any other item)
      const otherItems = items.filter((_, i) => i !== index);
      const wrongItem = otherItems[Math.floor(Math.random() * otherItems.length)];

      // Randomize A/B position
      const correctIsA = Math.random() < 0.5;

      return {
        correctAnswer: item.display,
        wrongAnswer: wrongItem.display,
        optionA: correctIsA ? item.display : wrongItem.display,
        optionB: correctIsA ? wrongItem.display : item.display,
        correctIsA,
      };
    });

    setQuestions(generatedQuestions);
  }, [items]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const lastIndicatedWord = currentIndex === 0 ? null : (items[currentIndex - 1]?.display ?? null);
  const prompt = currentIndex === 0 ? "Pierwszy element listy" : "Następny element listy";

  const handleAnswer = (selectedIsA: boolean) => {
    if (!currentQuestion) return;

    const isCorrect = selectedIsA === currentQuestion.correctIsA;
    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      setCorrect((prev) => prev + 1);
    } else {
      setWrong((prev) => prev + 1);
    }

    setState("feedback");
  };

  const handleFeedbackComplete = () => {
    setState("question");

    // Move to next question or complete test
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      completeTest();
    }
  };

  const completeTest = async () => {
    setState("completed");
    setIsSubmitting(true);

    try {
      // Submit test results to API
      const response = await fetch("/rest/v1/rpc/complete_test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_list_id: listId,
          p_correct: correct,
          p_wrong: wrong,
        }),
      });

      if (!response.ok) {
        console.error("Failed to submit test results");
      }
    } catch (error) {
      console.error("Error submitting test:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Przygotowuję test...</p>
        </div>
      </div>
    );
  }

  // Completed state
  if (state === "completed") {
    const score = Math.floor((correct / totalQuestions) * 100);
    return <TestResultSummary correct={correct} wrong={wrong} total={totalQuestions} score={score} listId={listId} />;
  }

  // Question/Feedback state
  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Postęp</span>
          <span>
            {currentIndex + 1}/{totalQuestions}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <QuestionCard prompt={prompt} questionNumber={currentIndex + 1} totalQuestions={totalQuestions} />

      {/* Answer Options */}
      <div className="space-y-4">
        <AnswerButton
          option="A"
          text={currentQuestion.optionA}
          onClick={() => handleAnswer(true)}
          disabled={state === "feedback"}
        />
        <AnswerButton
          option="B"
          text={currentQuestion.optionB}
          onClick={() => handleAnswer(false)}
          disabled={state === "feedback"}
        />
      </div>

      {/* Last indicated item (shown under answer tiles) */}
      {lastIndicatedWord && (
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-sm text-muted-foreground">Ostatnio wskazane</div>
          <div className="mt-1 text-lg font-semibold">{lastIndicatedWord}</div>
        </div>
      )}

      {/* Feedback Overlay */}
      {state === "feedback" && <FlashFeedback isCorrect={lastAnswerCorrect} onComplete={handleFeedbackComplete} />}
    </div>
  );
}
