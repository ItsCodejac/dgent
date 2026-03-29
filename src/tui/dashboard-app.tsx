import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { JentConfig } from "../config/index.js";
import type { LogEntry } from "../hooks/log-writer.js";

interface DashboardProps {
  config: JentConfig;
  logs: LogEntry[];
  version: string;
  onAction: (action: string) => void;
}

interface StatusInfo {
  hooksInstalled: boolean;
  consentGiven: boolean;
  enabledRules: number;
  totalRules: number;
  aiEnabled: boolean;
}

function getStatus(config: JentConfig): StatusInfo {
  const hooksDir = join(homedir(), ".config", "jent", "hooks");
  const hooksInstalled = existsSync(join(hooksDir, ".jent"));
  const consentGiven = existsSync(join(homedir(), ".config", "jent", "consent"));

  const totalRules = Object.keys(config.rules).length;
  const enabledRules = Object.values(config.rules).filter(Boolean).length;

  return {
    hooksInstalled,
    consentGiven,
    enabledRules,
    totalRules,
    aiEnabled: config.ai.enabled,
  };
}

interface RecentCommit {
  hash: string;
  message: string;
}

function getRecentCommits(count: number): RecentCommit[] {
  try {
    const output = execFileSync("git", ["log", "--format=%h %s", `-n`, String(count)], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (!output) return [];
    return output.split("\n").map((line) => {
      const [hash, ...rest] = line.split(" ");
      return { hash, message: rest.join(" ") };
    });
  } catch {
    return [];
  }
}

const ACTIONS = [
  { key: "scan", label: "Scan codebase", cmd: "jent scan" },
  { key: "review", label: "Review last flags", cmd: "jent review" },
  { key: "config", label: "Configure rules", cmd: "jent config" },
  { key: "stats", label: "View stats", cmd: "jent stats" },
  { key: "doctor", label: "Check setup", cmd: "jent doctor" },
  { key: "quit", label: "Quit", cmd: "" },
];

export function DashboardApp({ config, logs, version, onAction }: DashboardProps) {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status] = useState(() => getStatus(config));
  const [commits] = useState(() => getRecentCommits(5));

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(ACTIONS.length - 1, selectedIndex + 1));
    }
    if (key.return) {
      const action = ACTIONS[selectedIndex];
      if (action.key === "quit") {
        exit();
      } else {
        onAction(action.key);
        exit();
      }
    }
  });

  // Build commit log with flag info
  const flagsByCommit = new Map<string, number>();
  for (const log of logs) {
    if (log.commit) {
      flagsByCommit.set(log.commit, (flagsByCommit.get(log.commit) ?? 0) + log.flags.length);
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="white">d</Text>
        <Text color="cyan">gent</Text>
        <Text dimColor> · de-agent your code</Text>
        <Text dimColor> · v{version}</Text>
      </Box>

      {/* Status bar */}
      <Box marginBottom={1} paddingLeft={2}>
        <Text color={status.hooksInstalled ? "green" : "red"}>
          {status.hooksInstalled ? "■" : "□"}
        </Text>
        <Text dimColor> Hooks </Text>
        <Text dimColor>  </Text>

        <Text color="green">■</Text>
        <Text dimColor> {status.enabledRules}/{status.totalRules} rules </Text>
        <Text dimColor>  </Text>

        <Text color={status.aiEnabled ? "green" : "gray"}>
          {status.aiEnabled ? "■" : "□"}
        </Text>
        <Text dimColor> AI </Text>
        <Text dimColor>  </Text>

        <Text color={status.consentGiven ? "green" : "yellow"}>
          {status.consentGiven ? "■" : "□"}
        </Text>
        <Text dimColor> Consent</Text>
      </Box>

      {/* Recent commits */}
      {commits.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box paddingLeft={2} marginBottom={0}>
            <Text dimColor>Recent commits</Text>
          </Box>
          {commits.slice(0, 5).map((commit) => {
            const flagCount = flagsByCommit.get(commit.hash) ?? 0;
            const icon = flagCount > 0 ? "!" : "✓";
            const iconColor = flagCount > 0 ? "yellow" : "green";

            return (
              <Box key={commit.hash} paddingLeft={2}>
                <Text color={iconColor}>{icon} </Text>
                <Text dimColor>{commit.hash} </Text>
                <Text>{commit.message.slice(0, 50)}</Text>
                {commit.message.length > 50 && <Text dimColor>...</Text>}
                {flagCount > 0 && (
                  <Text color="yellow"> ({flagCount} flag{flagCount > 1 ? "s" : ""})</Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Actions */}
      <Box flexDirection="column">
        <Box paddingLeft={2} marginBottom={0}>
          <Text dimColor>Actions</Text>
        </Box>
        {ACTIONS.map((action, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <Box key={action.key} paddingLeft={2}>
              <Text color={isSelected ? "white" : "gray"}>
                {isSelected ? "› " : "  "}
              </Text>
              <Text color={isSelected ? "cyan" : undefined} dimColor={!isSelected}>
                {action.label}
              </Text>
              {action.cmd && (
                <Text dimColor>  {action.cmd}</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box paddingLeft={2} marginTop={1}>
        <Text dimColor>↑↓ navigate  enter select  q quit</Text>
      </Box>
    </Box>
  );
}
