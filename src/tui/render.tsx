import React from "react";
import { render } from "ink";
import { ReviewApp } from "./review-app.js";
import { ConfigApp } from "./config-app.js";
import { DashboardApp } from "./dashboard-app.js";
import type { LogEntry } from "../hooks/log-writer.js";
import type { DgentConfig } from "../config/index.js";

export async function renderDashboard(
  config: DgentConfig,
  logs: LogEntry[],
  version: string,
  onAction: (action: string) => void,
): Promise<void> {
  const { waitUntilExit } = render(
    <DashboardApp config={config} logs={logs} version={version} onAction={onAction} />,
  );
  await waitUntilExit();
}

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
