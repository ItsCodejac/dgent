#!/bin/sh
# Install dgent integrations for Claude Code
#
# Usage: npx @itscojac/dgent integrate
# Or:    sh ./node_modules/@itscojac/dgent/integrations/install.sh

set -e

DGENT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SKILLS="$HOME/.claude/skills/dgent"

echo "dgent: installing Claude Code integrations"

# Install skills
mkdir -p "$CLAUDE_SKILLS"
cp "$DGENT_DIR/skills/"*.md "$CLAUDE_SKILLS/"
echo "  ✓ Skills installed to $CLAUDE_SKILLS"

# Suggest CLAUDE.md integration
echo ""
echo "  To add dgent context to your project, copy the CLAUDE.md snippet:"
echo ""
echo "    cat $DGENT_DIR/CLAUDE.md >> .claude/CLAUDE.md"
echo ""
echo "  Or add it to your global CLAUDE.md:"
echo ""
echo "    cat $DGENT_DIR/CLAUDE.md >> ~/.claude/CLAUDE.md"
echo ""
echo "  Done."
