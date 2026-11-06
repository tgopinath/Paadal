import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";
import { getData } from "@/lib/data/repository";
import { authRequired, getCurrentUser } from "@/lib/auth/session";
import { ask, AssistantNotConfiguredError } from "@/lib/ai/assistant";

export const maxDuration = 120;

const MAX_QUESTION = 500;
const PER_HOUR = Number(process.env.AI_QUESTIONS_PER_HOUR ?? 30);
// Per-instance limiter: enough to stop runaway spend from one client. Use a
// shared store (e.g. Redis) if you run many instances.
const recent = new Map<string, number[]>();

function allow(key: string): boolean {
  const now = Date.now();
  const list = (recent.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= PER_HOUR) return false;
  list.push(now);
  recent.set(key, list);
  return true;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (authRequired() && !user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let question = "";
  try {
    question = String(((await request.json()) as { question?: unknown }).question ?? "").trim();
  } catch {
    /* handled below */
  }
  if (!question) return Response.json({ error: "Ask a question." }, { status: 400 });
  if (question.length > MAX_QUESTION) return Response.json({ error: `Keep questions under ${MAX_QUESTION} characters.` }, { status: 400 });

  const h = await headers();
  const key = user?.id ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!allow(key)) return Response.json({ error: `You've reached ${PER_HOUR} questions this hour. Try again later.` }, { status: 429 });

  try {
    const ctx = await getData();
    const { answer, model } = await ask(question, ctx);
    return Response.json({ answer, model });
  } catch (e) {
    if (e instanceof AssistantNotConfiguredError) return Response.json({ error: e.message, notConfigured: true }, { status: 503 });
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: "The AI service is busy. Try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: "The AI service rejected the API key. Check ANTHROPIC_API_KEY." }, { status: 502 });
    if (e instanceof Anthropic.APIError) return Response.json({ error: "The AI service returned an error. Try again." }, { status: 502 });
    console.error("AI question failed", e);
    return Response.json({ error: (e as Error).message || "Something went wrong." }, { status: 500 });
  }
}
