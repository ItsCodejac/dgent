export interface DgentConfig {
  rules: Record<string, boolean>;
  ai: {
    enabled: boolean;
    model: string;
    skill: string;
  };
  output: {
    verbose: boolean;
    "log-dir": string;
  };
}

export function loadConfig(): DgentConfig {
  throw new Error("Not implemented");
}

export function saveConfig(_config: DgentConfig): void {
  throw new Error("Not implemented");
}
