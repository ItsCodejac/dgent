import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { ConfirmInput } from "@inkjs/ui";
import type { JentConfig } from "../config/index.js";
import { RULE_DESCRIPTIONS } from "./rule-descriptions.js";

interface ConfigAppProps {
  config: JentConfig;
  onSave: (config: JentConfig) => void;
}

interface RuleEntry {
  key: string;
  enabled: boolean;
}

export function ConfigApp({ config, onSave }: ConfigAppProps) {
  const { exit } = useApp();

  const ruleKeys = Object.keys(config.rules);
  const [rules, setRules] = useState<RuleEntry[]>(
    ruleKeys.map((key) => ({ key, enabled: config.rules[key] }))
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState<"save" | "discard" | null>(null);

  useInput((input, key) => {
    if (confirming) return; // Let ConfirmInput handle input

    if (input === "q" || key.escape) {
      if (dirty) {
        setConfirming("save");
      } else {
        exit();
      }
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex(Math.min(rules.length - 1, selectedIndex + 1));
    }

    // Toggle
    if (input === " " || key.return) {
      const updated = [...rules];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        enabled: !updated[selectedIndex].enabled,
      };
      setRules(updated);
      setDirty(true);
    }
  });

  // Save confirmation prompt
  if (confirming === "save") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="white">d</Text>
          <Text color="cyan">gent</Text>
          <Text dimColor> config</Text>
        </Box>

        <Box gap={1} paddingLeft={2}>
          <Text>Save changes?</Text>
          <ConfirmInput
            defaultChoice="confirm"
            onConfirm={() => {
              const newConfig = { ...config, rules: {} as Record<string, boolean> };
              for (const rule of rules) {
                newConfig.rules[rule.key] = rule.enabled;
              }
              onSave(newConfig);
              exit();
            }}
            onCancel={() => {
              exit();
            }}
          />
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
        <Text dimColor> config</Text>
        {dirty && <Text color="yellow"> (modified)</Text>}
      </Box>

      {/* Rules list */}
      {rules.map((rule, idx) => {
        const isSelected = idx === selectedIndex;
        const indicator = rule.enabled ? "■" : "□";
        const color = rule.enabled ? "green" : "gray";
        const desc = RULE_DESCRIPTIONS[rule.key];

        return (
          <Box key={rule.key} paddingLeft={2}>
            <Text color={isSelected ? "white" : "gray"}>{isSelected ? "› " : "  "}</Text>
            <Text color={color}>{indicator} </Text>
            <Text color={isSelected ? "white" : undefined} dimColor={!isSelected}>
              {rule.key}
            </Text>
            {desc && (
              <Text dimColor> — {desc}</Text>
            )}
          </Box>
        );
      })}

      {/* AI settings (read-only) */}
      <Box marginTop={1} paddingLeft={2} flexDirection="column">
        <Text dimColor>  ai.enabled = {String(config.ai.enabled)}</Text>
        <Text dimColor>  ai.model = {config.ai.model}</Text>
        <Text dimColor>  {"  "}(use jent config set ai.enabled true to change)</Text>
      </Box>

      {/* Controls */}
      <Box marginTop={1} paddingLeft={2}>
        <Text dimColor>↑↓/jk navigate  </Text>
        <Text color="cyan">space</Text><Text dimColor> toggle  </Text>
        <Text color="cyan">q</Text><Text dimColor> quit</Text>
      </Box>
    </Box>
  );
}
