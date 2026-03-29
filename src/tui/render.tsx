import React from "react";
import { render } from "ink";
import { ReviewApp } from "./review-app.js";
import { ConfigApp } from "./config-app.js";
import type { LogEntry } from "../hooks/log-writer.js";
import type { DgentConfig } from "../config/index.js";

export async function renderReview(
  entry: LogEntry,
  onIgnore: (rule: string) => void,
): Promise<void> {
  const { waitUntilExit } = render(
    <ReviewApp entry={entry} onIgnore={onIgnore} />,
  );
  await waitUntilExit();
}

export async function renderConfig(
  config: DgentConfig,
  onSave: (config: DgentConfig) => void,
): Promise<void> {
  const { waitUntilExit } = render(
    <ConfigApp config={config} onSave={onSave} />,
  );
  await waitUntilExit();
}
