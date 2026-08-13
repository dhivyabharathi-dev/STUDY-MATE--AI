import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input, Label, PageHeader, Select, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateNotes } from "@/lib/studymate.functions";

export const Route = createFileRoute("/_app/notes")({
  head: () => ({
    meta: [
      { title: "Notes Generator — AI StudyMate" },
      { name: "description", content: "Turn any topic into short revision notes with definitions, examples and exam points." },
      { property: "og:title", content: "Notes Generator — AI StudyMate" },
      { property: "og:description", content: "Instant revision notes for any school topic." },
    ],
  }),
  component: NotesPage,
});

export const SUBJECTS = ["Maths", "Science", "Physics", "Chemistry", "Biology", "English", "Tamil", "Social Science", "Computer Science"];

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    const key = `${i}-${line.slice(0, 8)}`;
    if (line.startsWith("## ")) return <h3 key={key} className="mt-4 text-base font-bold text-primary">{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h3 key={key} className="mt-4 text-lg font-bold text-primary">{line.slice(2)}</h3>;
    if (/^\s*[-*]\s+/.test(line))
      return (
        <li key={key} className="ml-5 list-disc text-sm text-foreground">
          {line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "")}
        </li>
      );
    if (!line.trim()) return <div key={key} className="h-2" />;
    return (
      <p key={key} className="text-sm text-foreground">
        {line.replace(/\*\*/g, "")}
      </p>
    );
  });
}

function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(SUBJECTS[0]!);
  const [topic, setTopic] = useState("");

  const notes = useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, subject, topic, content, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const make = useServerFn(generateNotes);
  const create = useMutation({
    mutationFn: () => make({ data: { subject, topic } }),
    onSuccess: () => {
      setTopic("");
      toast.success("Notes ready!");
      queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not generate notes"),
  });

  return (
    <div>
      <PageHeader
        icon={<BookOpen className="size-6 text-accent" />}
        title="Notes Generator"
        subtitle="Enter a topic and get short notes with definitions, examples and exam points."
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length < 2) return toast.error("Please enter a topic");
            create.mutate();
          }}
        >
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Laws of motion" />
          </div>
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? "Writing..." : "Generate notes"}
          </Button>
        </form>
        {create.isPending && (
          <div className="mt-4">
            <Spinner label="Writing your notes..." />
          </div>
        )}
      </Card>

      <div className="mt-6 space-y-4">
        {notes.data?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No notes yet — generate your first set above.</p>
        )}
        {notes.data?.map((note) => (
          <Card key={note.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                  {note.subject}
                </span>
                <h2 className="mt-2 text-lg font-bold text-foreground">{note.topic}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete notes"
                onClick={async () => {
                  await supabase.from("notes").delete().eq("id", note.id);
                  queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="mt-2 space-y-1">{renderMarkdown(note.content)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
