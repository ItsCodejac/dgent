# dgent-mcp

MCP server for [dgent](https://github.com/cojac/dgent) — de-agent your code via Model Context Protocol.

## Prerequisites

```sh
npm install -g dgent
dgent init
```

## Install

```sh
npm install -g dgent-mcp
```

## Configure

Add to your MCP client config:

**Claude Desktop / Claude Code** (`.mcp.json`):
```json
{
  "servers": {
    "dgent": {
      "type": "stdio",
      "command": "dgent-mcp"
    }
  }
}
```

**Or via npx (no global install):**
```json
{
  "servers": {
    "dgent": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "dgent-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `dgent_check_file` | Check a file for AI tells (naming, catch-rethrow, headers, emoji) |
| `dgent_check_message` | Check a commit message (vocabulary, trailers, emoji) |
| `dgent_scan_directory` | Scan entire directory for tells |
| `dgent_fix_file` | Apply deterministic fixes in place |
| `dgent_get_rules` | Get full rule catalog with patterns |
| `dgent_get_status` | Check dgent installation and config |

## Testing

```sh
npx @modelcontextprotocol/inspector
```

## License

MIT
