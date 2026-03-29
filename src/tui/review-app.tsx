import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Select, ConfirmInput, StatusMessage } from "@inkjs/ui";
import type { LogEntry } from "../hooks/log-writer.js";

interface ReviewAppProps {
  entry: LogEntry;
  onIgnore: (rule: string) => void;
}

type Decision = "accept" | "ignore" | "skip";

export function ReviewApp({ entry, onIgnore }: ReviewAppProps) {
  const { exit } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<number, Decision>>(new Map());
  const [confirming, setConfirming] = useState(false);

  const flags = entry.flags;
  const total = flags.length;
  const current = flags[currentIndex];
  const allReviewed = decisions.size === total;

  // Apply all decisions and exit
  function applyAndExit() {
    for (const [idx, decision] of decisions) {
      if (decision === "ignore") {
        onIgnore(flags[idx].rule);
      }
    }
    exit();
  }

  function makeDecision(decision: Decision) {
    setDecisions(new Map(decisions).set(currentIndex, decision));
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  useInput((input, key) => {
    if (confirming) return;

    if (input === "q" || key.escape) {
      exit();
      return;
    }

    // If all reviewed, wait for confirm
    if (allReviewed && !confirming) {
      if (key.return) {
        setConfirming(true);
      }
      return;
    }

    // Navigation
    if (key.leftArrow) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
    if (key.rightArrow) {
      setCurrentIndex(Math.min(total - 1, currentIndex + 1));
    }
  });

  // Final confirmation screen
  if (confirming) {
    const ignored = [...decisions.entries()].filter(([, d]) => d === "ignore");

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="white">d</Text>
          <Text color="cyan">gent</Text>
          <Text dimColor> review</Text>
        </Box>

        {ignored.length > 0 ? (
          <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
            <StatusMessage variant="warning">
              {ignored.length} rule(s) will be disabled globally:
            </StatusMessage>
            {ignored.map(([idx]) => (
              <Text key={idx} dimColor>    {flags[idx].rule}</Text>
            ))}
          </Box>
        ) : (
          <Box paddingLeft={2} marginBottom={1}>
            <StatusMessage variant="info">No rules will be disabled</StatusMessage>
          </Box>
        )}

        <Box gap={1} paddingLeft={2}>
          <Text>Apply?</Text>
          <ConfirmInput
            defaultChoice="confirm"
            onConfirm={() => applyAndExit()}
            onCancel={() => {
              setConfirming(false);
            }}
          />
        </Box>
      </Box>
    );
  }

  // Summary screen (all reviewed, not yet confirming)
  if (allReviewed) {
    const accepted = [...decisions.entries()].filter(([, d]) => d === "accept");
    const ignored = [...decisions.entries()].filter(([, d]) => d === "ignore");
    const skipped = [...decisions.entries()].filter(([, d]) => d === "skip");

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="white">d</Text>
          <Text color="cyan">gent</Text>
          <Text dimColor> review complete</Text>
        </Box>

        <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
          {accepted.length > 0 && (
            <StatusMessage variant="success">{accepted.length} acknowledged</StatusMessage>
          )}
          {ignored.length > 0 && (
            <StatusMessage variant="warning">{ignored.length} rule(s) to disable</StatusMessage>
          )}
          {skipped.length > 0 && (
            <Text dimColor>  {skipped.length} skipped</Text>
          )}
        </Box>

        <Box paddingLeft={2}>
          <Text dimColor>Press </Text>
          <Text color="cyan">enter</Text>
          <Text dimColor> to apply, </Text>
          <Text color="cyan">q</Text>
          <Text dimColor> to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Active review screen
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="white">d</Text>
        <Text color="cyan">gent</Text>
        <Text dimColor> review </Text>
        <Text color="yellow">{currentIndex + 1}</Text>
        <Text dimColor>/{total}</Text>
        {entry.commit && (
          <>
            <Text dimColor> · </Text>
            <Text color="cyan">{entry.commit}</Text>
          </>
        )}
      </Box>

      {/* Current flag */}
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Box>
          <Text color="yellow">▸ </Text>
          <Text dimColor>[{current.rule}] </Text>
          <Text>{current.message}</Text>
        </Box>
        {current.suggestion && (
          <Box paddingLeft={2}>
            <Text dimColor>→ {current.suggestion}</Text>
          </Box>
        )}
      </Box>

      {/* Progress dots — distinct current indicator */}
      <Box paddingLeft={2} marginBottom={1}>
        {flags.map((_, idx) => {
          const decision = decisions.get(idx);
          const isCurrent = idx === currentIndex;

          if (isCurrent) {
            return <Text key={idx} bold color="white">◉ </Text>;
          }
          if (decision === "accept") return <Text key={idx} color="green">● </Text>;
          if (decision === "ignore") return <Text key={idx} color="yellow">● </Text>;
          if (decision === "skip") return <Text key={idx} dimColor>● </Text>;
          return <Text key={idx} dimColor>○ </Text>;
        })}
      </Box>

      {/* Action select */}
      <Box paddingLeft={2}>
        <Select
          options={[
            { label: "Accept — acknowledge this flag", value: "accept" },
            { label: "Ignore — disable this rule globally", value: "ignore" },
            { label: "Skip — leave for later", value: "skip" },
          ]}
          onChange={(value) => makeDecision(value as Decision)}
        />
      </Box>
    </Box>
  );
}
