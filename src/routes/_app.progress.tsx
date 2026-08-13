import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, PageHeader } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({
    meta: [
      { title: "Progress Dashboard — AI StudyMate" },
      { name: "description", content: "See quizzes taken, average score, strong and weak subjects, and planned study time." },
      { property: "og:title", content: "Progress Dashboard — AI StudyMate" },
      { property: "og:description", content: "Track your quiz scores and study habits over time." },
    ],
  }),
  component: ProgressPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function ProgressPage() {
  const { user } = useAuth();

  const attempts = useQuery({
    queryKey: ["attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, subject, score, total, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const plans = useQuery({
    queryKey: ["plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("study_plans").select("daily_hours, plan");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = attempts.data ?? [];
  const totalQuizzes = rows.length;
  const avg =
    totalQuizzes === 0
      ? 0
      : Math.round(
          (rows.reduce((sum, r) => sum + (r.total ? r.score / r.total : 0), 0) / totalQuizzes) * 100,
        );

  const bySubject = new Map<string, { score: number; total: number }>();
  for (const r of rows) {
    const entry = bySubject.get(r.subject) ?? { score: 0, total: 0 };
    entry.score += r.score;
    entry.total += r.total;
    bySubject.set(r.subject, entry);
  }
  const subjectData = [...bySubject.entries()]
    .map(([subject, v]) => ({ subject, percent: v.total ? Math.round((v.score / v.total) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent);

  const trend = rows.map((r, i) => ({
    name: `Q${i + 1}`,
    percent: r.total ? Math.round((r.score / r.total) * 100) : 0,
  }));

  const plannedHours = (plans.data ?? []).reduce((sum, p) => {
    const days = Array.isArray(p.plan) ? p.plan.length : 0;
    return sum + days * Number(p.daily_hours ?? 0);
  }, 0);

  return (
    <div>
      <PageHeader
        icon={<LineChartIcon className="size-6 text-accent" />}
        title="Progress Dashboard"
        subtitle="Your quiz results and study time at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Quizzes taken" value={String(totalQuizzes)} />
        <Stat label="Average score" value={`${avg}%`} />
        <Stat
          label="Strongest subject"
          value={subjectData[0]?.subject ?? "—"}
          hint={subjectData[0] ? `${subjectData[0].percent}% correct` : "Take a quiz to find out"}
        />
        <Stat
          label="Needs practice"
          value={subjectData.length > 1 ? subjectData[subjectData.length - 1]!.subject : "—"}
          hint={
            subjectData.length > 1
              ? `${subjectData[subjectData.length - 1]!.percent}% correct`
              : "Try quizzes in more subjects"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-bold text-foreground">Score trend</h2>
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="percent" stroke="var(--color-primary)" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-bold text-foreground">Subject strength</h2>
          {subjectData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="subject" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip />
                <Bar dataKey="percent" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-base font-bold text-foreground">Planned study time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {plannedHours > 0
            ? `You have scheduled about ${plannedHours} hours of study across your timetables.`
            : "Create a timetable in the Planner to track your study hours."}
        </p>
      </Card>
    </div>
  );
}
