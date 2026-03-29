#!/bin/sh
# Install jent integrations for Claude Code
#
# Usage: npx jent integrate
# Or:    sh ./node_modules/jent/integrations/install.sh

set -e

JENT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SKILLS="$HOME/.claude/skills/jent"

echo "jent: installing Claude Code integrations"

# Install skills
mkdir -p "$CLAUDE_SKILLS"
cp "$JENT_DIR/skills/"*.md "$CLAUDE_SKILLS/"
echo "  ✓ Skills installed to $CLAUDE_SKILLS"

# Suggest CLAUDE.md integration
echo ""
echo "  To add jent context to your project, copy the CLAUDE.md snippet:"
echo ""
echo "    cat $JENT_DIR/CLAUDE.md >> .claude/CLAUDE.md"
echo ""
echo "  Or add it to your global CLAUDE.md:"
echo ""
echo "    cat $JENT_DIR/CLAUDE.md >> ~/.claude/CLAUDE.md"
echo ""
echo "  Done."
