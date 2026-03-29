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
  } catch (err) {
    console.error(
      `dgent: AI skill error (${err instanceof Error ? err.message : String(err)})`,
    );
    return null;
  }
}
