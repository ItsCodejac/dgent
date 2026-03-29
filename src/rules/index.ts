export interface Rule {
  name: string;
  phase: "commit-msg" | "pre-commit";
  type: "fix" | "flag";
  defaultEnabled: boolean;
  apply(input: string): RuleResult;
}

export interface RuleResult {
  output: string;
  changed: boolean;
  flags: Flag[];
}

export interface Flag {
  rule: string;
  line: number;
  message: string;
  suggestion?: string;
}

import { stripTrailers } from "./strip-trailers.js";
import { stripEmojis } from "./strip-emojis.js";
import { flagMessageTone } from "./flag-message-tone.js";
import { normalizeFormat } from "./normalize-format.js";

export const rules: Rule[] = [stripTrailers, stripEmojis, flagMessageTone, normalizeFormat];
