import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input, Label, PageHeader, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePlan } from "@/lib/studymate.functions";
import type { PlanDay } from "@/lib/studymate-types";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Study Planner — AI StudyMate" },
      { name: "description", content: "Enter your subjects, exam date and daily study hours to get a realistic timetable." },
      { property: "og:title", content: "Study Planner — AI StudyMate" },
      { property: "og:description", content: "A day-by-day timetable built around your exam date." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subjects, setSubjects] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(3);

  const plans = useQuery({
    queryKey: ["plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("id, subjects, exam_date, daily_hours, plan, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const make = useServerFn(generatePlan);
  const create = useMutation({
    mutationFn: () => make({ data: { subjects, examDate, dailyHours } }),
    onSuccess: () => {
      toast.success("Your timetable is ready!");
      queryClient.invalidateQueries({ queryKey: ["plans", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not build the plan"),
  });

  return (
    <div>
      <PageHeader
        icon={<CalendarDays className="size-6 text-accent" />}
        title="Study Planner"
        subtitle="Tell me your subjects, exam date and free hours — I'll split the work into daily blocks."
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (subjects.trim().length < 2 || !examDate) {
              toast.error("Add your subjects and exam date");
              return;
            }
            create.mutate();
          }}
        >
          <div className="lg:col-span-2">
            <Label htmlFor="subjects">Subjects (comma separated)</Label>
            <Input
              id="subjects"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Maths, Science, English"
            />
          </div>
          <div>
            <Label htmlFor="exam">Exam date</Label>
            <Input id="exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="hours">Study hours / day</Label>
            <Input
              id="hours"
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
            />
          </div>
          <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-4" disabled={create.isPending}>
            {create.isPending ? "Planning..." : "Build my timetable"}
          </Button>
        </form>
        {create.isPending && (
          <div className="mt-4">
            <Spinner label="Arranging your days..." />
          </div>
        )}
      </Card>

      <div className="mt-6 space-y-4">
        {plans.data?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No timetables yet — create your first one above.</p>
        )}
        {plans.data?.map((row) => {
          const days = (row.plan ?? []) as unknown as PlanDay[];
          return (
            <Card key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{row.subjects}</h2>
                  <p className="text-sm text-muted-foreground">
                    Exam on {row.exam_date} · {row.daily_hours}h per day
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete plan"
                  onClick={async () => {
                    await supabase.from("study_plans").delete().eq("id", row.id);
                    queryClient.invalidateQueries({ queryKey: ["plans", user?.id] });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {days.map((day) => (
                  <div key={`${row.id}-${day.date}`} className="rounded-2xl bg-secondary/60 p-4">
                    <p className="text-sm font-bold text-primary">
                      {day.date} {day.label ? `· ${day.label}` : ""}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {(day.blocks ?? []).map((block) => (
                        <li key={`${day.date}-${block.time}-${block.subject}`} className="text-sm text-foreground">
                          <span className="font-semibold">{block.time}</span> — {block.subject}
                          {block.focus ? `: ${block.focus}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
