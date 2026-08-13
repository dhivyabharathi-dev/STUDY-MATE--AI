import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { aiText, parseJsonReply, TUTOR_PERSONA, languageRule } from "./ai.server";
import type { QuizQuestion, PlanDay } from "./studymate-types";

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ message: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, class_level, language")
      .eq("id", userId)
      .maybeSingle();

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(16);

    const transcript = (history ?? [])
      .reverse()
      .map((m) => `${m.role === "user" ? "Student" : "StudyMate"}: ${m.content}`)
      .join("\n");

    const system = `${TUTOR_PERSONA}
The student's name is ${profile?.full_name ?? "Student"}, studying in class ${profile?.class_level ?? "10"}.
${languageRule(profile?.language ?? "English")}`;

    const answer = await aiText(
      system,
      `${transcript ? `Conversation so far:\n${transcript}\n\n` : ""}Student's new message: ${data.message}`,
    );

    await supabase.from("chat_messages").insert([
      { user_id: userId, role: "user", content: data.message },
      { user_id: userId, role: "assistant", content: answer },
    ]);

    return { answer };
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("chat_messages").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const generateNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subject: z.string().min(1).max(60), topic: z.string().min(2).max(160) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_level, language")
      .eq("id", userId)
      .maybeSingle();

    const content = await aiText(
      `${TUTOR_PERSONA}
${languageRule(profile?.language ?? "English")}
Write revision notes for a class ${profile?.class_level ?? "10"} student using markdown with these exact sections:
## Key Definitions
## Simple Explanation
## Examples
## Exam Points
## Quick Recap Questions
Keep it under 400 words total and use bullet points.`,
      `Subject: ${data.subject}. Topic: ${data.topic}`,
    );

    const { data: note } = await supabase
      .from("notes")
      .insert({ user_id: userId, subject: data.subject, topic: data.topic, content })
      .select()
      .single();

    return { note };
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subject: z.string().min(1).max(60),
        topic: z.string().min(2).max(160),
        difficulty: z.enum(["easy", "medium", "hard"]),
        count: z.number().int().min(5).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("class_level, language")
      .eq("id", context.userId)
      .maybeSingle();

    const raw = await aiText(
      `${TUTOR_PERSONA}
${languageRule(profile?.language ?? "English")}
You write multiple-choice quizzes for a class ${profile?.class_level ?? "10"} student.
Reply with ONLY a JSON array, no prose and no code fences. Each item must be:
{"question": string, "options": [string, string, string, string], "answerIndex": 0-3, "explanation": string}
The explanation teaches why the correct option is right, in at most 2 short sentences.`,
      `Create exactly ${data.count} ${data.difficulty} questions. Subject: ${data.subject}. Topic: ${data.topic}`,
    );

    const parsed = parseJsonReply<QuizQuestion[]>(raw);
    const questions = (Array.isArray(parsed) ? parsed : [])
      .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4)
      .slice(0, data.count)
      .map((q) => ({
        question: q.question,
        options: q.options.map(String),
        answerIndex: Math.min(3, Math.max(0, Number(q.answerIndex) || 0)),
        explanation: String(q.explanation ?? ""),
      }));

    if (questions.length === 0) throw new Error("Could not build a quiz for that topic. Try rephrasing it.");
    return { questions };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subject: z.string(),
        topic: z.string(),
        difficulty: z.string(),
        questions: z.array(
          z.object({
            question: z.string(),
            options: z.array(z.string()),
            answerIndex: z.number(),
            explanation: z.string(),
          }),
        ),
        answers: z.array(z.number()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const score = data.questions.reduce(
      (total, q, i) => total + (data.answers[i] === q.answerIndex ? 1 : 0),
      0,
    );

    await context.supabase.from("quiz_attempts").insert({
      user_id: context.userId,
      subject: data.subject,
      topic: data.topic,
      difficulty: data.difficulty,
      score,
      total: data.questions.length,
      questions: data.questions,
      answers: data.answers,
    });

    return { score, total: data.questions.length };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subjects: z.string().min(2).max(300),
        examDate: z.string().min(4),
        dailyHours: z.number().min(0.5).max(12),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("class_level, language")
      .eq("id", userId)
      .maybeSingle();

    const raw = await aiText(
      `${TUTOR_PERSONA}
${languageRule(profile?.language ?? "English")}
You build realistic study timetables for a class ${profile?.class_level ?? "10"} student.
Reply with ONLY a JSON array, no prose and no code fences. Each item must be:
{"date": "YYYY-MM-DD", "label": string, "blocks": [{"time": string, "subject": string, "focus": string}]}
Include short breaks, spread subjects across days, and put revision closer to the exam. Maximum 14 days.`,
      `Today is ${new Date().toISOString().slice(0, 10)}. Exam date: ${data.examDate}. Subjects: ${data.subjects}. Study hours available per day: ${data.dailyHours}.`,
    );

    const parsed = parseJsonReply<PlanDay[]>(raw);
    const plan = (Array.isArray(parsed) ? parsed : []).slice(0, 14);
    if (plan.length === 0) throw new Error("Could not build a plan. Please check the subjects and exam date.");

    const { data: saved } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        subjects: data.subjects,
        exam_date: data.examDate,
        daily_hours: data.dailyHours,
        plan,
      })
      .select()
      .single();

    return { plan: saved };
  });
