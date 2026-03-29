export interface Rule {
  name: string;
  phase: "commit-msg" | "pre-commit";
  type: "fix" | "flag";
  defaultEnabled: boolean;
  apply(input: string): RuleResult | Promise<RuleResult>;
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
import { stripSectionHeaders } from "./strip-section-headers.js";
import { stripEmojiComments } from "./strip-emoji-comments.js";
import { flagNaming } from "./flag-naming.js";
import { flagCatchRethrow } from "./flag-catch-rethrow.js";
import { rewriteMessage } from "./rewrite-message.js";
import { stripNoiseComments } from "./strip-noise-comments.js";
import { stripObviousDocstrings } from "./strip-obvious-docstrings.js";
import { flagLogBracketing } from "./flag-log-bracketing.js";

export const rules: Rule[] = [
  stripTrailers, stripEmojis, flagMessageTone, normalizeFormat,
  stripSectionHeaders, stripEmojiComments, flagNaming, flagCatchRethrow,
  rewriteMessage, stripNoiseComments, stripObviousDocstrings, flagLogBracketing,
];
