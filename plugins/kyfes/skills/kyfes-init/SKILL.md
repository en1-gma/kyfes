---
name: kyfes-init
description: Set up kyfes in the current frontend project for Claude Code and/or Codex (config, path rules, CLAUDE.md/AGENTS.md block, Codex skills/agents/hooks, optional reference scaffold, CI). Use when the user asks to install, initialise, set up or update kyfes in a repository.
---

# Set up kyfes in a project

Until `.kyfes/config.json` exists, every kyfes hook is a no-op in that repository.

1. Find the installer: `<plugin root>/install.sh`, where the plugin root is two directories above this skill's directory (`<plugin root>/skills/kyfes-init/`). In a project where kyfes is already installed (e.g. Codex reading `.agents/skills/`), use `tools/kyfes/plugins/kyfes/install.sh`; otherwise clone `https://github.com/en1-gma/kyfes` and use its `install.sh`.
2. Detect what you can from the repository (`package.json` dependencies: `next`, `@angular/core`, `@sveltejs/kit`, `vue`, `react`; lockfile → package manager). Ask the user, in one question round, only what is still unclear:
   - framework: `react` (Vite), `next`, `vue`, `angular`, `svelte` (SvelteKit);
   - agents to configure: `claude`, `codex` or `both` (default `both`);
   - whether to copy the reference scaffold (`--scaffold`: only into an empty project or a new folder — it never overwrites files);
   - package manager, if not detectable (`npm`, `pnpm`, `yarn`, `bun`).
3. Run the installer from the project root:

   ```bash
   bash "<plugin root>/install.sh" --target . --framework <fw> --agents <claude|codex|both> [--pm npm] [--scaffold]
   ```

   It is idempotent: it never overwrites the user's config or files (only with `--force`) and refreshes the `kyfes` block in `CLAUDE.md` and `AGENTS.md`.
4. Report in a few lines what was created:
   - `.kyfes/config.json` (framework, layers, commands of the stop gate);
   - `tools/kyfes/` — the versioned copy of the kit used by CI, teammates and Codex project hooks;
   - Claude Code: `.claude/rules/kyfes/`, the block in `CLAUDE.md`;
   - Codex: the block in `AGENTS.md`, `.agents/skills/kyfes-*`, `.codex/agents/kyfes-*.toml`, `.codex/hooks.json` (Codex asks to review and trust project hooks the first time; the project must be trusted);
   - `.github/workflows/kyfes-check.yml`;
   - the scaffold files, if requested, then remind to run the package manager install.
5. Suggest the next step: describe a feature and plan it with the `kyfes:architect` agent (Claude Code) or `$kyfes-plan` (Codex).

Do not edit `.kyfes/config.json` yourself after installation: it is protected, and only the user changes it.
