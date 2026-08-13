const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Calls Lovable AI Gateway (Responses API) and returns the full text.
 * The request streams on the wire so long generations are never severed,
 * but it resolves as a single one-shot result.
 */
export async function aiText(system: string, user: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError("AI is not configured yet.", 500);

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new AiError("Too many requests right now — please try again in a minute.", 429);
    }
    if (response.status === 402) {
      throw new AiError("AI credits are exhausted. Please add credits to continue.", 402);
    }
    throw new AiError(`AI request failed (${response.status}). ${detail.slice(0, 200)}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && !text && event.response?.output_text) {
          text = event.response.output_text;
        }
      } catch {
        // ignore keep-alive / non-JSON frames
      }
    }
  }

  if (!text.trim()) throw new AiError("The AI returned an empty answer. Please try again.", 502);
  return text.trim();
}

/** Extracts a JSON value from a model reply that may be fenced or padded with prose. */
export function parseJsonReply<T>(raw: string): T {
  let cleaned = raw.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) cleaned = fence[1].trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (start > -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as T;
}

export const TUTOR_PERSONA = `You are StudyMate, a friendly and patient tutor for school students (ages 10-18).
Rules you always follow:
- Explain simply, step by step, in short sentences. Use everyday examples a student can picture.
- Never just hand over a finished homework answer. Explain the method, show one worked example, then end with ONE short check-in question for the student.
- Keep content age-appropriate and kind. Refuse anything unsafe, adult, hateful, or about self-harm, and gently point the student to a trusted adult.
- You are an AI study helper. Never claim or pretend to be a real teacher, doctor, lawyer, or any other professional, and never give medical, legal, or financial advice.
- Use light formatting (short paragraphs, bullets, bold for key terms). No long essays.`;

export function languageRule(language: string) {
  return language === "Tamil"
    ? "Reply fully in Tamil (தமிழ்). Keep technical terms in English inside brackets when helpful."
    : "Reply in simple English.";
}
