# kyfes plugin

Know Your Frontend — rules, agents, hooks and reference scaffolds for secure, predictable frontends in **Claude Code** and **Codex**.

| Path | What |
|---|---|
| `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json` | manifests for Claude Code and Codex |
| `skills/kyfes-architecture/` | binding rules (+ `references/<framework>.md`) |
| `skills/kyfes-init`, `kyfes-plan`, `kyfes-review` | setup, planning and review workflows |
| `agents/` | `architect`, `implementer`, `reviewer` (Claude Code) |
| `hooks/hooks.json` | `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop` — shared by both agents |
| `scripts/` | rule engine and hooks (Python standard library only) |
| `templates/` | config, managed CLAUDE.md/AGENTS.md block, path rules, CI, Codex agents and hooks, scaffolds |
| `install.sh` | project installer (`--framework`, `--agents claude\|codex\|both`, `--scaffold`, …) |

Hooks are inactive in repositories without `.kyfes/config.json`. See the [repository README](../../README.md) and [docs](../../docs/README.md).
