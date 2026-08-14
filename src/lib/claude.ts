import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local or use DEMO_MODE=1");
  }
  return (_client ??= new Anthropic());
}

export const SMART_MODEL = "claude-opus-5";
export const FAST_MODEL = "claude-haiku-4-5-20251001";

/**
 * Ask Claude for structured JSON by forcing a single tool call whose input
 * schema is the shape we want. Returns the validated-by-API tool input.
 */
export async function structured<T>(opts: {
  model?: string;
  system?: string;
  prompt: string;
  schemaName: string;
  schema: Anthropic.Tool.InputSchema;
  maxTokens?: number;
}): Promise<T> {
  const res = await anthropic().messages.create({
    model: opts.model ?? SMART_MODEL,
    max_tokens: opts.maxTokens ?? 8192,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    tools: [
      {
        name: opts.schemaName,
        description: `Return the ${opts.schemaName} result.`,
        input_schema: opts.schema,
      },
    ],
    tool_choice: { type: "tool", name: opts.schemaName },
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured output");
  }
  return toolUse.input as T;
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "1";
}
