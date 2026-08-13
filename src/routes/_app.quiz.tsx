import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input, Label, PageHeader, Select, Spinner } from "@/components/ui-kit";
import { generateQuiz, submitQuiz } from "@/lib/studymate.functions";
import type { QuizQuestion } from "@/lib/studymate-types";

export const Route = createFileRoute("/_app/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — AI StudyMate" },
      { name: "description", content: "Practice with 5-10 AI-generated MCQs, get scored instantly and see why each wrong answer was wrong." },
      { property: "og:title", content: "Quiz Generator — AI StudyMate" },
      { property: "og:description", content: "Instant practice quizzes with explanations." },
    ],
  }),
  component: QuizPage,
});

const SUBJECTS = ["Maths", "Science", "Physics", "Chemistry", "Biology", "English", "Tamil", "Social Science", "Computer Science"];

function QuizPage() {
  const [subject, setSubject] = useState(SUBJECTS[0]!);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const make = useServerFn(generateQuiz);
  const grade = useServerFn(submitQuiz);

  const create = useMutation({
    mutationFn: () => make({ data: { subject, topic, difficulty, count } }),
    onSuccess: (data) => {
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(-1));
      setResult(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not build the quiz"),
  });

  const finish = useMutation({
    mutationFn: () => grade({ data: { subject, topic, difficulty, questions: questions ?? [], answers } }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`You scored ${data.score}/${data.total}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save your score"),
  });

  return (
    <div>
      <PageHeader
        icon={<Brain className="size-6 text-accent" />}
        title="Quiz Generator"
        subtitle="Pick a subject, topic and difficulty, then test yourself."
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length < 2) {
              toast.error("Please enter a topic");
              return;
            }
            create.mutate();
          }}
        >
          <div>
            <Label htmlFor="qsubject">Subject</Label>
            <Select id="qsubject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="qtopic">Topic</Label>
            <Input id="qtopic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebra basics" />
          </div>
          <div>
            <Label htmlFor="qdiff">Difficulty</Label>
            <Select id="qdiff" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="qcount">Questions</Label>
            <Select id="qcount" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-5" disabled={create.isPending}>
            {create.isPending ? "Preparing..." : "Start quiz"}
          </Button>
        </form>
        {create.isPending && (
          <div className="mt-4">
            <Spinner label="Writing your questions..." />
          </div>
        )}
      </Card>

      {questions && (
        <div className="mt-6 space-y-4">
          {questions.map((q, qi) => (
            <Card key={`${qi}-${q.question.slice(0, 12)}`}>
              <p className="font-semibold text-foreground">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-3 grid gap-2">
                {q.options.map((option, oi) => {
                  const chosen = answers[qi] === oi;
                  const correct = result && oi === q.answerIndex;
                  const wrongPick = result && chosen && oi !== q.answerIndex;
                  return (
                    <button
                      key={`${oi}-${option.slice(0, 10)}`}
                      type="button"
                      disabled={!!result}
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                        correct
                          ? "border-success bg-success/10 text-foreground"
                          : wrongPick
                            ? "border-destructive bg-destructive/10 text-foreground"
                            : chosen
                              ? "border-primary bg-secondary text-foreground"
                              : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {correct && <CheckCircle2 className="size-4 text-success" />}
                      {wrongPick && <XCircle className="size-4 text-destructive" />}
                      {option}
                    </button>
                  );
                })}
              </div>
              {result && answers[qi] !== q.answerIndex && (
                <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
                  <strong>Why:</strong> {q.explanation}
                </p>
              )}
            </Card>
          ))}

          {!result ? (
            <Button
              size="lg"
              className="w-full"
              disabled={finish.isPending || answers.some((a) => a < 0)}
              onClick={() => finish.mutate()}
            >
              {finish.isPending ? "Scoring..." : answers.some((a) => a < 0) ? "Answer all questions" : "Submit quiz"}
            </Button>
          ) : (
            <Card className="text-center">
              <p className="text-3xl font-bold text-primary">
                {result.score}/{result.total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.score === result.total
                  ? "Perfect! Try a harder level next."
                  : "Read the explanations above, then try again to improve."}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => create.mutate()}>
                New quiz on this topic
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
