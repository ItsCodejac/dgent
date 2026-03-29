# jent-mcp

MCP server for [jent](https://github.com/ItsCodejac/dgent) — de-agent your code via Model Context Protocol.

## Prerequisites

```sh
npm install -g jent
jent init
```

## Install

```sh
npm install -g jent-mcp
```

## Configure

Add to your MCP client config:

**Claude Desktop / Claude Code** (`.mcp.json`):
```json
{
  "servers": {
    "jent": {
      "type": "stdio",
      "command": "jent-mcp"
    }
  }
}
```

**Or via npx (no global install):**
```json
{
  "servers": {
    "jent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "jent-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `jent_check_file` | Check a file for AI tells (naming, catch-rethrow, headers, emoji) |
| `jent_check_message` | Check a commit message (vocabulary, trailers, emoji) |
| `jent_scan_directory` | Scan entire directory for tells |
| `jent_fix_file` | Apply deterministic fixes in place |
| `jent_get_rules` | Get full rule catalog with patterns |
| `jent_get_status` | Check jent installation and config |

## Testing

```sh
npx @modelcontextprotocol/inspector
```

## License

MIT
