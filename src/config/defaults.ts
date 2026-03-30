import type { DgentConfig } from "./index.js";

export const DEFAULT_CONFIG: DgentConfig = {
  rules: {
    "strip-trailers": true,
    "strip-emojis": true,
    "strip-emoji-comments": true,
    "strip-section-headers": true,
    "normalize-format": true,
    "flag-naming": true,
    "flag-message-tone": true,
    "flag-catch-rethrow": true,
    "strip-noise-comments": false,
    "strip-obvious-docstrings": false,
    "flag-log-bracketing": false,
    "rewrite-message": false,
  },
  ai: {
    enabled: false,
    autofix: false,
    model: "claude-sonnet-latest",
    skill: "bundled",
  },
  output: {
    verbose: false,
    "log-dir": "~/.local/share/dgent/logs",
  },
};
