import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { getApiKey } from "../config/secrets.js";
import { loadConfig } from "../config/index.js";

export function createClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export async function callSkill<T>(
  systemPrompt: string,
  userContent: string,
  schema: Record<string, unknown>,
): Promise<T | null> {
  const client = createClient();
  if (!client) return null;

  const config = loadConfig();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await client.messages.parse({
      model: config.ai.model as string,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      output_config: {
        format: jsonSchemaOutputFormat(schema as any),
      },
    });

    return message.parsed_output as T;
  } catch (err: unknown) {
    if (err instanceof Error && "status" in err) {
      const status = (err as { status: number }).status;
      if (status === 401) {
        console.error("dgent: invalid API key. Check your key with: dgent config set api-key <key>");
      } else if (status === 429) {
        console.error("dgent: rate limited by the API. Wait a moment and try again.");
      } else {
        console.error(`dgent: AI API error (HTTP ${status}): ${err.message}`);
      }
    } else if (err instanceof TypeError || (err instanceof Error && /fetch|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(err.message))) {
      console.error("dgent: network error — could not reach the Anthropic API. Check your connection.");
    } else {
      console.error(`dgent: AI skill error (${err instanceof Error ? err.message : String(err)})`);
    }
    return null;
  }
}
