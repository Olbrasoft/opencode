# opencode-issues-sisyphus

OpenCode plugin that registers the **Issues-Sisyphus** agent - a read-only planning agent with GitHub issues management capabilities.

## Features

- **Read-only code access** - Can read files but cannot edit
- **GitHub issues management** - Create, edit, delete issues without permission prompts
- **Sub-issues linking** - Uses GraphQL API for proper sub-issue relationships
- **Delegation to subagents** - Uses @explore, @librarian, @oracle from oh-my-opencode

## Prerequisites

Requires **oh-my-opencode** plugin installed.

## Installation

```bash
cd plugins/opencode-issues-sisyphus
npm install
npm run build
```

## License

MIT
