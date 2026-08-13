import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, CalendarDays, LineChart, MessageCircleHeart, Sparkles } from "lucide-react";

import { Button, Card } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI StudyMate — Friendly AI tutor for school students" },
      {
        name: "description",
        content:
          "Ask questions, generate notes and quizzes, build a study timetable and track progress. Works in English and Tamil.",
      },
      { property: "og:title", content: "AI StudyMate — Friendly AI tutor for school students" },
      {
        property: "og:description",
        content: "A patient AI study buddy with notes, quizzes, planner and progress charts.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MessageCircleHeart, title: "Patient AI tutor", text: "Simple explanations, one example, then a check-in question — never just the answer." },
  { icon: BookOpen, title: "Instant notes", text: "Definitions, examples and exam points for any topic in seconds." },
  { icon: Brain, title: "Practice quizzes", text: "5–10 MCQs with scoring and explanations for every mistake." },
  { icon: CalendarDays, title: "Study planner", text: "Subjects + exam date + free hours turn into a day-by-day timetable." },
  { icon: LineChart, title: "Progress charts", text: "See average score, strong and weak subjects, and study time." },
  { icon: Sparkles, title: "English & Tamil", text: "Learn in the language you're most comfortable with." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-soft-gradient">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <nav className="flex items-center justify-between">
          <span className="font-display text-xl font-bold text-foreground">
            AI <span className="text-primary">StudyMate</span>
          </span>
          <Link to="/auth">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>

        <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary shadow-[var(--shadow-card)]">
              <Sparkles className="size-3.5" /> Your AI study buddy
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Homework help that actually <span className="text-primary">teaches</span> you.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              StudyMate explains topics step by step, makes notes and quizzes, plans your revision and
              shows how you are improving — in English or Tamil.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Start learning free</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>

          <Card className="bg-card/90">
            <div className="space-y-3 text-sm">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-hero-gradient px-4 py-2.5 text-primary-foreground">
                Explain photosynthesis simply 🌱
              </div>
              <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-secondary-foreground">
                Think of a leaf as a tiny kitchen. Sunlight is the stove, water and carbon dioxide are the
                ingredients, and glucose is the food it cooks. <br />
                <strong>Quick check:</strong> which gas does the leaf give out?
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <f.icon className="size-6 text-accent" />
              <h2 className="mt-3 text-lg font-bold text-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </section>

        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          AI StudyMate is an AI study helper, not a real teacher or professional advisor.
        </footer>
      </div>
    </main>
  );
}
