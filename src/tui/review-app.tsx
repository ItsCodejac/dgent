import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { LogEntry } from "../hooks/log-writer.js";

interface ReviewAppProps {
  entry: LogEntry;
  onIgnore: (rule: string) => void;
}

export function ReviewApp({ entry, onIgnore }: ReviewAppProps) {
  const { exit } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Map<number, "accept" | "ignore" | "skip">>(new Map());

  const flags = entry.flags;
  const total = flags.length;
  const current = flags[currentIndex];
  const allReviewed = decisions.size === total;

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
      return;
    }

    if (allReviewed) {
      if (input === "a" || key.return) {
        // Apply decisions
        for (const [idx, decision] of decisions) {
          if (decision === "ignore") {
            onIgnore(flags[idx].rule);
          }
        }
        exit();
      }
      return;
    }

    // Navigation
    if (key.leftArrow || input === "k") {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
    if (key.rightArrow || input === "j") {
      setCurrentIndex(Math.min(total - 1, currentIndex + 1));
    }

    // Actions on current flag
    if (input === "a") {
      // Accept — acknowledge the flag, do nothing
      setDecisions(new Map(decisions).set(currentIndex, "accept"));
      if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
    }
    if (input === "i") {
      // Ignore — permanently disable this rule
      setDecisions(new Map(decisions).set(currentIndex, "ignore"));
      if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
    }
    if (input === "s") {
      // Skip — leave for later
      setDecisions(new Map(decisions).set(currentIndex, "skip"));
      if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
    }
  });

  if (allReviewed) {
    const ignored = [...decisions.entries()].filter(([, d]) => d === "ignore");
    const accepted = [...decisions.entries()].filter(([, d]) => d === "accept");
    const skipped = [...decisions.entries()].filter(([, d]) => d === "skip");

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="white">d</Text>
          <Text color="cyan">gent</Text>
          <Text dimColor> review complete</Text>
        </Box>

        {accepted.length > 0 && (
          <Text color="green">  {accepted.length} acknowledged</Text>
        )}
        {ignored.length > 0 && (
          <Box flexDirection="column">
            <Text color="yellow">  {ignored.length} rule(s) will be disabled:</Text>
            {ignored.map(([idx]) => (
              <Text key={idx} dimColor>    - {flags[idx].rule}</Text>
            ))}
          </Box>
        )}
        {skipped.length > 0 && (
          <Text dimColor>  {skipped.length} skipped</Text>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press </Text>
          <Text color="cyan">enter</Text>
          <Text dimColor> to apply, </Text>
          <Text color="cyan">q</Text>
          <Text dimColor> to cancel</Text>
        </Box>
      </Box>
    );
  }

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

      {/* Progress dots */}
      <Box paddingLeft={2} marginBottom={1}>
        {flags.map((_, idx) => {
          const decision = decisions.get(idx);
          const isCurrent = idx === currentIndex;
          if (decision === "accept") return <Text key={idx} color="green">{isCurrent ? "●" : "●"} </Text>;
          if (decision === "ignore") return <Text key={idx} color="yellow">{isCurrent ? "●" : "●"} </Text>;
          if (decision === "skip") return <Text key={idx} dimColor>{isCurrent ? "●" : "●"} </Text>;
          return <Text key={idx} color={isCurrent ? "white" : "gray"}>{isCurrent ? "○" : "·"} </Text>;
        })}
      </Box>

      {/* Controls */}
      <Box paddingLeft={2}>
        <Text color="green">a</Text><Text dimColor>ccept  </Text>
        <Text color="yellow">i</Text><Text dimColor>gnore rule  </Text>
        <Text dimColor>s</Text><Text dimColor>kip  </Text>
        <Text dimColor>←→ navigate  </Text>
        <Text dimColor>q quit</Text>
      </Box>
    </Box>
  );
}
