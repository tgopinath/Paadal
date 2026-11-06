import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { DataContext } from "../data/repository";
import { buildTools } from "./tools";

export const MODEL = "claude-opus-5-5";

export const AnswerSchema = z.object({
  summary: z.string().describe("2–5 sentences answering the question, using only figures returned by tools"),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).describe("Key supporting figures, each taken from a tool result"),
  products: z.array(z.object({ asin: z.string(), title: z.string(), note: z.string() })).describe("Relevant products, at most 10"),
  period: z.string().describe("The time period the answer covers, with dates"),
  data_freshness: z.string().describe("Latest snapshot date and data source; say DEMO DATA if is_demo_data was true"),
  limitations: z.array(z.string()).describe("What the data can't show here: coverage gaps, estimates vs verified sales, missing history"),
});
export type Answer = z.infer<typeof AnswerSchema>;

const SYSTEM = `You are Amazon Pulse AI, an analyst for sellers on Amazon India (amazon.in).

Answer only from the tool results in this conversation. Call tools to get every figure you state; never use outside knowledge about products, prices or sales.

Rules:
- The demand index (0–100) is estimated from Best Sellers Rank. It is relative popularity, not unit sales. Never present it, or anything derived from it, as sales numbers.
- Trend and opportunity scores are internal Amazon Pulse scores, not Amazon metrics. Say so when you use them.
- If a tool says historical data is not available for a period, say exactly that. Never substitute another period's data.
- If coverage is partial, mention how many days have data.
- Forecasts and suggestions are possibilities, not facts. Phrase them that way ("may", "worth investigating").
- If is_demo_data is true, say the figures are demo data.
- Amounts are in Indian rupees (₹).
- If the question isn't about the tracked product data, say what you can help with instead.

Use the tools as needed, then reply with JSON matching the required schema.`;

export class AssistantNotConfiguredError extends Error {}

export async function ask(question: string, ctx: DataContext): Promise<{ answer: Answer; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AssistantNotConfiguredError("Set ANTHROPIC_API_KEY to enable Amazon Pulse AI.");
  }
  const client = new Anthropic();
  const final = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 8,
    // A data Q&A route: medium effort keeps answers quick; raise it if answers miss multi-step analysis.
    output_config: { effort: "medium", format: betaZodOutputFormat(AnswerSchema) },
    // If a safety classifier declines, re-run on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: buildTools(ctx),
    messages: [{ role: "user", content: `Today is ${ctx.ds.today}.\n\nQuestion: ${question}` }],
  });

  if (final.stop_reason === "refusal") throw new Error("The assistant declined to answer this question.");
  if (final.stop_reason === "max_tokens") throw new Error("The answer was too long. Try a narrower question.");
  const text = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The assistant returned an answer in an unexpected format.");
  }
  const parsed = AnswerSchema.safeParse(raw);
  if (!parsed.success) throw new Error("The assistant returned an answer in an unexpected format.");
  return { answer: parsed.data, model: final.model };
}
