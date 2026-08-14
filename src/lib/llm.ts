const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const SMART_MODEL = "openai/gpt-5.6-luna";
export const FAST_MODEL = "openai/gpt-5.6-luna";

type JsonSchema = Record<string, unknown>;

/**
 * OpenAI's structured outputs (strict mode) require every object node to set
 * `additionalProperties: false` and list all properties in `required`.
 * Normalize any schema to that form so call sites stay clean.
 */
function toStrictSchema(node: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...node };
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    const props = out.properties as Record<string, JsonSchema>;
    out.properties = Object.fromEntries(
      Object.entries(props).map(([k, v]) => [k, toStrictSchema(v)]),
    );
    out.additionalProperties = false;
    out.required = Object.keys(props);
  }
  if (out.type === "array" && out.items && typeof out.items === "object") {
    out.items = toStrictSchema(out.items as JsonSchema);
  }
  return out;
}

function apiKey(): string {
  const key = process.env.OPENROUTER_APY_KEY;
  if (!key) {
    throw new Error("OPENROUTER_APY_KEY is not set — add it to .env.local or use DEMO_MODE=1");
  }
  return key;
}

/**
 * Ask the model for structured JSON via OpenRouter's json_schema response
 * format. Returns the parsed object matching `schema`.
 */
export async function structured<T>(opts: {
  model?: string;
  system?: string;
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
  maxTokens?: number;
}): Promise<T> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://linkedin-signal.vercel.app",
      "X-Title": "Signal/in",
    },
    body: JSON.stringify({
      model: opts.model ?? SMART_MODEL,
      max_tokens: opts.maxTokens ?? 8192,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, strict: true, schema: toStrictSchema(opts.schema) },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`OpenRouter error: ${data.error.message}`);

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Model returned no structured output");

  // Some providers wrap JSON in code fences despite response_format
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "1";
}
