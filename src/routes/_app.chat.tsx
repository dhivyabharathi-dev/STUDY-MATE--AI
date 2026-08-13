import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MessageCircleHeart, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, Card, Input, PageHeader, Spinner } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendChat, clearChat } from "@/lib/studymate.functions";

export const Route = createFileRoute("/_app/chat")({
  head: () => ({
    meta: [
      { title: "AI Tutor Chat — AI StudyMate" },
      { name: "description", content: "Ask any school question and get a simple, step-by-step explanation with an example." },
      { property: "og:title", content: "AI Tutor Chat — AI StudyMate" },
      { property: "og:description", content: "A patient AI tutor that explains instead of just answering." },
    ],
  }),
  component: ChatPage,
});

const starters = [
  "Explain Newton's third law simply",
  "Help me understand fractions",
  "What is photosynthesis?",
  "How do I write a good essay intro?",
];

function ChatPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["chat", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useServerFn(sendChat);
  const wipe = useServerFn(clearChat);

  const ask = useMutation({
    mutationFn: (message: string) => send({ data: { message } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", user?.id] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : "The tutor could not reply"),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, ask.isPending]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setInput("");
    ask.mutate(trimmed);
  }

  return (
    <div>
      <PageHeader
        icon={<MessageCircleHeart className="size-6 text-accent" />}
        title={`Hi ${profile?.full_name?.split(" ")[0] ?? "there"}!`}
        subtitle={`Ask me anything from your class ${profile?.class_level ?? ""} syllabus — I'll explain it step by step.`}
      />

      <Card className="flex h-[62vh] flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.data?.length === 0 && !ask.isPending && (
            <div className="grid gap-2 sm:grid-cols-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-left text-sm font-medium text-secondary-foreground hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.data?.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-hero-gradient px-4 py-2.5 text-sm text-primary-foreground"
                  : "w-fit max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-secondary-foreground"
              }
            >
              {m.content}
            </div>
          ))}

          {ask.isPending && (
            <div className="w-fit rounded-2xl bg-secondary px-4 py-2.5">
              <Spinner label="StudyMate is thinking..." />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-border pt-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            aria-label="Your question"
          />
          <Button type="submit" disabled={ask.isPending} aria-label="Send">
            <Send className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Clear chat"
            onClick={async () => {
              await wipe({});
              queryClient.invalidateQueries({ queryKey: ["chat", user?.id] });
              toast.success("Chat cleared");
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
