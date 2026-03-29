// Short descriptions for each rule, used in TUI and CLI output
export const RULE_DESCRIPTIONS: Record<string, string> = {
  "strip-trailers": "Remove AI attribution trailers",
  "strip-emojis": "Strip emoji from commit messages",
  "flag-message-tone": "Warn about AI vocabulary",
  "normalize-format": "Fix commit message formatting",
  "rewrite-message": "AI rewrite to match repo voice",
  "strip-section-headers": "Remove divider comments",
  "strip-emoji-comments": "Strip emoji from code comments",
  "flag-naming": "Flag generic naming patterns",
  "flag-catch-rethrow": "Flag empty catch-rethrow blocks",
  "strip-noise-comments": "Remove restating comments",
  "strip-obvious-docstrings": "Remove trivial docstrings",
  "flag-log-bracketing": "Flag narration-style logging",
  "flag-over-defensive": "Flag unnecessary null checks",
};
