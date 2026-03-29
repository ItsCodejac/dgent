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

export const rules: Rule[] = [];
