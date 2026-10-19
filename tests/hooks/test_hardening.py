"""Regressioni dell'audit (report-audit-kyfes.md): bypass degli hook, falsi positivi, file protetti, Bash, stop gate.

Ogni caso qui era un bypass o un falso positivo verificato: non deve tornare.
Esecuzione: python3 -B -m unittest discover -s tests/hooks -v
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "plugins" / "kyfes" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import rules  # noqa: E402

COMPONENTS = {
    "react": "src/features/customers/components/X.tsx",
    "next": "src/features/customers/components/X.tsx",
    "vue": "src/features/customers/components/X.vue",
    "angular": "src/app/features/customers/components/x.component.ts",
    "svelte": "src/lib/features/customers/components/X.svelte",
}


def project(framework: str = "react", git: bool = False, commands=None) -> Path:
    d = Path(tempfile.mkdtemp(prefix=f"kyfes-hard-{framework}-"))
    (d / ".kyfes").mkdir()
    (d / ".kyfes" / "config.json").write_text(json.dumps({"framework": framework,
                                                         "stop_gate": {"commands": commands or []}}))
    if git:
        env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
               "GIT_COMMITTER_EMAIL": "t@t"}
        for cmd in (["git", "init", "-q"], ["git", "add", "-A"], ["git", "commit", "-qm", "init"]):
            subprocess.run(cmd, cwd=d, check=True, env={**os.environ, **env})
    return d


def commit(d: Path, msg: str = "wip") -> None:
    env = {"GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}
    subprocess.run(["git", "add", "-A"], cwd=d, check=True)
    subprocess.run(["git", "commit", "-qm", msg], cwd=d, check=True, env={**os.environ, **env})


def run_hook(script: str, event: dict) -> dict:
    env = {k: v for k, v in os.environ.items() if k not in ("CLAUDE_PROJECT_DIR", "KYFES_PROJECT_DIR")}
    r = subprocess.run([sys.executable, "-B", str(SCRIPTS / script)], input=json.dumps(event),
                       capture_output=True, text=True, timeout=120, env=env)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout) if r.stdout.strip() else {}


def write(proj: Path, rel: str, content: str, cwd: Path = None) -> dict:
    return run_hook("pre_write.py", {"cwd": str(cwd or proj), "hook_event_name": "PreToolUse", "tool_name": "Write",
                                     "tool_input": {"file_path": str(proj / rel), "content": content}})


def edit(proj: Path, rel: str, old: str, new: str) -> dict:
    return run_hook("pre_write.py", {"cwd": str(proj), "hook_event_name": "PreToolUse", "tool_name": "Edit",
                                     "tool_input": {"file_path": str(proj / rel), "old_string": old, "new_string": new}})


def bash(proj: Path, command: str) -> dict:
    return run_hook("bash_guard.py", {"cwd": str(proj), "hook_event_name": "PreToolUse", "tool_name": "Bash",
                                      "session_id": "b-" + proj.name, "tool_input": {"command": command}})


def denied(out: dict) -> bool:
    return (out.get("hookSpecificOutput") or {}).get("permissionDecision") == "deny"


def reason(out: dict) -> str:
    return (out.get("hookSpecificOutput") or {}).get("permissionDecisionReason", "")


# (regola attesa, contenuto): bypass verificati nell'audit, ora negati in ogni layout
BYPASSES = [
    ("token-storage", "localStorage.token = jwt"),
    ("token-storage", "/**/ localStorage.setItem('token', t)"),
    ("token-storage", "localStorage.setItem(\n  'access_token', t)"),
    ("token-storage", "sessionStorage['refreshToken'] = r"),
    ("token-storage", "localStorage.setItem(KEY, accessToken)"),
    ("js-cookie-write", "document['cookie'] = 'session=' + s"),
    ("js-cookie-write", "await cookieStore.set('sid', v)"),
    ("http-outside-api", "window.fetch('/api/orders')"),
    ("http-outside-api", "globalThis.fetch('/api/orders')"),
    ("http-outside-api", "navigator.sendBeacon('/api/track', data)"),
    ("http-outside-api", "const ws = new WebSocket('wss://x.example')"),
    ("http-outside-api", "const es = new EventSource('/api/events')"),
    ("library-boundary", "import ky from 'ky'"),
    ("library-boundary", "import useSWR from 'swr'"),
    ("library-boundary", "import ReactECharts from 'echarts-for-react'"),
    ("library-boundary", "import { scaleLinear } from 'd3-scale'"),
    ("library-boundary", "import { ResponsiveBar } from '@nivo/bar'"),
    ("library-boundary", "import Cookies from 'js-cookie'"),
    ("library-boundary", "const { useQuery } = await import(`@tanstack/react-query`)"),
    ("eval", "window.eval(code)"),
    ("eval", "globalThis.eval(code)"),
    ("eval", "const f = Function('return 1')"),
    ("eval", "window['eval'](code)"),
    ("bearer-in-client", "headers.Authorization = token"),
    ("bearer-in-client", "headers: { Authorization: `Basic ${btoa(u)}` }"),
    ("bearer-in-client", "h.set('Authorization', t)"),
    ("role-string-check", "switch (user.role) { case 'admin': return 1 }"),
    ("role-string-check", "if (['admin'].includes(user.role)) x()"),
    ("role-string-check", "if ('admin' === user.role) x()"),
    ("role-string-check", "if (user.role.startsWith('adm')) x()"),
    ("insecure-url", "const u = 'http://localhost.evil.com/x'"),
    ("insecure-url", "const u = 'http://example.com.evil.net/x'"),
    ("insecure-url", "const u = 'http://schemas.evil.com/x'"),
    ("raw-html", "const s = (h) => h\nconst sanitizeHtml = s\nel.innerHTML = sanitizeHtml(x)"),
    ("raw-html", "el.innerHTML = x /* sanitizeHtml( */"),
    ("raw-html", "import { sanitizeHtml } from '@/shared/lib'\nfunction sanitizeHtml(h) { return h }\nel.innerHTML = sanitizeHtml(x)"),
    ("eval", "const r = /a\\//; eval(x)"),
    ("eval", "const g = import.meta.glob('./locales/*.json'); eval(y)"),
    # secondo giro: alias e nomi calcolati
    ("token-storage", "const ls = window.localStorage; ls.setItem('token', t)"),
    ("token-storage", "localforage.setItem('jwt', t)"),
    ("http-outside-api", "const f = fetch; f('/api/x')"),
    ("http-outside-api", "const g = fetch.bind(window)"),
    ("eval", "const run = window.eval; run(code)"),
    ("eval", "Reflect.apply(eval, null, [code])"),
    ("eval", "window['ev' + 'al'](code)"),
    ("dynamic-import", "const m = await import('ax' + 'ios')"),
    ("dynamic-import", "const lib = require(name)"),
    ("dynamic-import", "const m = await import(`${pkg}/client`)"),
]

ALLOWED = [
    "localStorage.setItem('accessibility-mode', 'high')",
    "localStorage.setItem('author-filter', v)",
    "const theme = localStorage.getItem('theme')",
    "const isAdminSectionVisible = can('read', 'Admin')",
    "const m = { password: 'validation.required' }",
    "const g = import.meta.glob('./locales/*.json')",
    "const u = 'http://localhost:5173/x'",
    "const ns = 'http://www.w3.org/2000/svg'",
    "const next = query.fetchNextPage()",
    "// eval(x) in a comment",
    "const r = await queryClient.fetchQuery(opts)",
    "const label = t('auth.redirecting')",
    "const Page = lazy(() => import('./OrderForm'))",
    "const load = (l: string) => import(`./locales/${l}.json`)",
    "window.location.assign(url)",
    "const dark = window.matchMedia('(prefers-color-scheme: dark)')",
    "localStorage.setItem('theme', 'dark')",
    "const u = 'http://api.example.com/v1'",
]


class HookBypasses(unittest.TestCase):
    def test_bypasses_now_denied_everywhere(self):
        for fw, component in COMPONENTS.items():
            proj = project(fw)
            try:
                for rule, content in BYPASSES:
                    with self.subTest(fw=fw, rule=rule, content=content):
                        out = write(proj, component, content)
                        self.assertTrue(denied(out), f"atteso deny: {content}")
                        self.assertIn(f"[{rule}]", reason(out))
            finally:
                shutil.rmtree(proj)

    def test_false_positives_allowed(self):
        for fw, component in COMPONENTS.items():
            proj = project(fw)
            try:
                for content in ALLOWED:
                    with self.subTest(fw=fw, content=content):
                        self.assertFalse(denied(write(proj, component, content)), reason(write(proj, component, content)))
            finally:
                shutil.rmtree(proj)

    def test_sanitizer_from_shared_lib_is_the_only_exception(self):
        proj = project("svelte")
        try:
            ok = "<script>import { sanitizeHtml } from '$lib/shared/lib';</script>\n{@html sanitizeHtml(body)}"
            self.assertFalse(denied(write(proj, COMPONENTS["svelte"], ok)), reason(write(proj, COMPONENTS["svelte"], ok)))
            self.assertTrue(denied(write(proj, COMPONENTS["svelte"], "{@html sanitizeHtml(body)}")))
        finally:
            shutil.rmtree(proj)


class EnvFiles(unittest.TestCase):
    def setUp(self):
        self.proj = project()

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_unquoted_secrets_denied(self):
        for content in ("CLIENT_SECRET=abcdef1234567890", "DB_PASSWORD=hunter2hunter2", "export API_KEY=zzzzzzzzzzzz",
                        "STRIPE_TOKEN = tok_live_1234567"):
            with self.subTest(content=content):
                self.assertIn("[secrets]", reason(write(self.proj, ".env", content)))
                self.assertIn("[secrets]", reason(write(self.proj, ".env.local", content)))

    def test_placeholders_and_examples_allowed(self):
        for content in ("API_PROXY_TARGET=http://localhost:8080", "CLIENT_SECRET=", "CLIENT_SECRET=<set-me>",
                        "CLIENT_SECRET=${CLIENT_SECRET}", "# DB_PASSWORD=hunter2hunter2"):
            with self.subTest(content=content):
                self.assertFalse(denied(write(self.proj, ".env", content)))
        self.assertFalse(denied(write(self.proj, ".env.example", "CLIENT_SECRET=example-value-here")))


class ProtectedFiles(unittest.TestCase):
    def setUp(self):
        self.proj = project()

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_agent_settings_kit_and_ci_are_protected(self):
        for rel in (".claude/settings.json", ".claude/settings.local.json", ".codex/hooks.json",
                    "tools/kyfes/plugins/kyfes/scripts/rules.py", ".claude/rules/kyfes/security.md",
                    ".agents/skills/kyfes-architecture/SKILL.md", ".github/workflows/kyfes-check.yml"):
            with self.subTest(rel=rel):
                self.assertIn("[protected-files]", reason(write(self.proj, rel, "{}")))

    def test_case_variants_resolve_to_the_real_file(self):
        if not (self.proj / ".KYFES").exists():
            self.skipTest("filesystem case-sensitive: .KYFES è un'altra cartella")
        for rel in (".KYFES/config.json", ".Kyfes/config.json", ".kyfes/CONFIG.json"):
            with self.subTest(rel=rel):
                self.assertIn("[protected-files]", reason(write(self.proj, rel, "{}")))
        (self.proj / "src/features/orders").mkdir(parents=True)
        out = write(self.proj, "src/Features/orders/components/X.tsx", "import P from '@/pages/OrdersPage'")
        self.assertIn("[layer-direction]", reason(out))

    def test_protected_lowercase_check_even_on_case_sensitive_fs(self):
        self.assertIn("[protected-files]", reason(write(self.proj, ".KYFES/config.json", "{}")))

    def test_codex_delete_and_move_of_protected_files(self):
        for patch in ("*** Begin Patch\n*** Delete File: .kyfes/config.json\n*** End Patch",
                      "*** Begin Patch\n*** Update File: .kyfes/config.json\n*** Move to: src/x.json\n*** End Patch"):
            with self.subTest(patch=patch.splitlines()[1]):
                out = run_hook("pre_write.py", {"cwd": str(self.proj), "tool_name": "apply_patch",
                                                "tool_input": {"command": patch}})
                self.assertIn("[protected-files]", reason(out))


class WholeFileEvaluation(unittest.TestCase):
    def setUp(self):
        self.proj = project()
        self.rel = "src/features/orders/components/Note.tsx"
        (self.proj / self.rel).parent.mkdir(parents=True)
        (self.proj / self.rel).write_text(
            "import { sanitizeHtml } from '@/shared/lib'\n"
            "export const Note = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(h) }} />\n")

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_edit_removing_sanitizer_is_denied(self):
        self.assertIn("[raw-html]", reason(edit(self.proj, self.rel, "sanitizeHtml(h)", "h")))

    def test_edit_removing_sanitizer_import_is_denied(self):
        out = edit(self.proj, self.rel, "import { sanitizeHtml } from '@/shared/lib'", "const sanitizeHtml = (s: string) => s")
        self.assertIn("[raw-html]", reason(out))

    def test_multiedit_and_codex_update_see_the_result(self):
        out = run_hook("pre_write.py", {"cwd": str(self.proj), "tool_name": "MultiEdit", "tool_input": {
            "file_path": str(self.proj / self.rel), "edits": [{"old_string": "sanitizeHtml(h)", "new_string": "h"}]}})
        self.assertIn("[raw-html]", reason(out))
        patch = (f"*** Begin Patch\n*** Update File: {self.rel}\n@@\n"
                 "-export const Note = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(h) }} />\n"
                 "+export const Note = ({ h }: { h: string }) => <div dangerouslySetInnerHTML={{ __html: h }} />\n*** End Patch")
        out = run_hook("pre_write.py", {"cwd": str(self.proj), "tool_name": "apply_patch", "tool_input": {"command": patch}})
        self.assertIn("[raw-html]", reason(out))

    def test_preexisting_violation_does_not_block_unrelated_edit(self):
        legacy = "src/features/orders/components/Legacy.tsx"
        (self.proj / legacy).write_text("export const a = eval('1')\nexport const b = 1\n")
        self.assertFalse(denied(edit(self.proj, legacy, "export const b = 1", "export const b = 2")))
        self.assertIn("[eval]", reason(edit(self.proj, legacy, "export const b = 1", "export const b = eval('2')")))


class Monorepo(unittest.TestCase):
    def test_project_found_from_the_written_file(self):
        root = Path(tempfile.mkdtemp(prefix="kyfes-mono-"))
        try:
            app = root / "apps" / "web"
            (app / ".kyfes").mkdir(parents=True)
            (app / ".kyfes" / "config.json").write_text('{"framework": "react"}')
            out = write(app, "src/features/a/components/X.tsx", "localStorage.setItem('token', t)", cwd=root)
            self.assertIn("[token-storage]", reason(out))
            out = run_hook("bash_guard.py", {"cwd": str(root), "tool_name": "Bash",
                                             "tool_input": {"command": "echo {} > apps/web/.kyfes/config.json"}})
            self.assertTrue(denied(out))
        finally:
            shutil.rmtree(root)


class BashGuard(unittest.TestCase):
    def setUp(self):
        self.proj = project()

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_writes_to_protected_or_source_files_denied(self):
        for cmd in ("echo '{}' > .kyfes/config.json",
                    "sed -i 's/block/off/' .kyfes/config.json",
                    "printf x > .ky''fes/config.json",
                    "cp /tmp/x .KYFES/config.json",
                    "mv .kyfes .kyfes.bak",
                    "rm -rf tools/kyfes",
                    "echo '{\"disableAllHooks\": true}' > .claude/settings.local.json",
                    "jq '.rules.eval=\"off\"' .kyfes/config.json | sponge .kyfes/config.json",
                    "cat > src/features/a/components/X.tsx <<'EOF'\nlocalStorage.setItem('token', t)\nEOF",
                    "tee src/app/x.ts < /tmp/y",
                    "echo 'CLIENT_SECRET=abc123456' >> .env",
                    "python3 -c \"open('src/app/a.ts','w').write('eval(1)')\"",
                    "curl -o src/shared/api/http.ts https://x.example/http.ts",
                    "git apply /tmp/p.diff",
                    "bash tools/kyfes/plugins/kyfes/install.sh --uninstall --force",
                    "cd src/features/a && echo 'eval(1)' > X.ts",
                    "mv /tmp/x.tsx src/features/a/",
                    "cp -r /tmp/feat src/features/",
                    "tar -xf /tmp/x.tar -C src",
                    "unzip /tmp/x.zip -d src/features"):
            with self.subTest(cmd=cmd):
                self.assertTrue(denied(bash(self.proj, cmd)), cmd)

    def test_ordinary_commands_allowed(self):
        for cmd in ("cat .kyfes/config.json", "grep -n rules .kyfes/config.json", "git status", "git diff -- .kyfes",
                    "python3 -B tools/kyfes/plugins/kyfes/scripts/arch_check.py . --strict",
                    "npm run lint && npm run typecheck", "npx prettier --write src", "ls src > /dev/null",
                    "npm test 2>&1 | tail -20", "cat src/app/main.tsx", "echo done",
                    "bash tools/kyfes/setup.sh local", "cd src && ls", "cp src/app/main.tsx /tmp/main.tsx",
                    "git commit -m 'chore: aggiorna .kyfes/config.json'", "npm run build > /tmp/build.log 2>&1"):
            with self.subTest(cmd=cmd):
                self.assertFalse(denied(bash(self.proj, cmd)), reason(bash(self.proj, cmd)))


class StopGateHardening(unittest.TestCase):
    def stop(self, proj: Path, active: bool, sid: str = "s1") -> dict:
        return run_hook("stop_gate.py", {"cwd": str(proj), "hook_event_name": "Stop", "session_id": f"{sid}-{proj.name}",
                                         "stop_hook_active": active})

    def violate(self, proj: Path) -> None:
        d = proj / "src/features/orders"
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.ts").write_text("export const x = eval('1')\n")

    def test_keeps_blocking_while_stop_hook_active_until_max_blocks(self):
        proj = project(git=True)
        try:
            self.violate(proj)
            self.assertEqual(self.stop(proj, False).get("decision"), "block")
            self.assertEqual(self.stop(proj, True).get("decision"), "block")
            self.assertEqual(self.stop(proj, True).get("decision"), "block")
            last = self.stop(proj, True)
            self.assertNotIn("decision", last)
            self.assertIn("NON è conforme", last.get("systemMessage", ""))
            # una catena nuova riparte da zero
            self.assertEqual(self.stop(proj, False).get("decision"), "block")
        finally:
            shutil.rmtree(proj)

    def test_committing_does_not_skip_the_gate(self):
        proj = project(git=True)
        try:
            run_hook("session_start.py", {"cwd": str(proj), "hook_event_name": "SessionStart", "session_id": f"c-{proj.name}"})
            self.violate(proj)
            commit(proj)
            self.assertEqual(self.stop(proj, False, sid="c").get("decision"), "block")
        finally:
            shutil.rmtree(proj)

    def test_unpublished_commits_count_without_baseline(self):
        proj = project(git=True)
        try:
            self.violate(proj)
            commit(proj)
            self.assertEqual(self.stop(proj, False, sid="nobase").get("decision"), "block")
        finally:
            shutil.rmtree(proj)

    def test_clean_session_is_a_noop(self):
        proj = project(git=True)
        try:
            run_hook("session_start.py", {"cwd": str(proj), "hook_event_name": "SessionStart", "session_id": f"q-{proj.name}"})
            self.violate(proj)
            commit(proj)
            run_hook("session_start.py", {"cwd": str(proj), "hook_event_name": "SessionStart", "session_id": f"q2-{proj.name}"})
            self.assertEqual(self.stop(proj, False, sid="q2"), {})
        finally:
            shutil.rmtree(proj)

    def test_monorepo_root_checks_subprojects(self):
        root = Path(tempfile.mkdtemp(prefix="kyfes-mono-stop-"))
        try:
            app = root / "apps" / "web"
            (app / ".kyfes").mkdir(parents=True)
            (app / ".kyfes" / "config.json").write_text('{"framework": "react", "stop_gate": {"commands": []}}')
            self.violate(app)
            out = run_hook("stop_gate.py", {"cwd": str(root), "hook_event_name": "Stop", "session_id": f"m-{root.name}"})
            self.assertEqual(out.get("decision"), "block")
            self.assertIn("[eval]", out.get("reason", ""))
        finally:
            shutil.rmtree(root)


class ConfigOptions(unittest.TestCase):
    def test_allowed_http_hosts(self):
        cfg = rules.normalize_config({"framework": "react", "allowed_http_hosts": ["bff.internal"]})
        rel = "src/features/a/components/X.tsx"
        rule = lambda c: [f.rule for f in rules.check_content(rel, c, cfg)]
        self.assertEqual(rule("const u = 'http://bff.internal/api'"), [])
        self.assertEqual(rule("const u = 'http://bff.internal.evil.com/api'"), ["insecure-url"])
        self.assertEqual(rule("const u = 'http://evil.com/api'"), ["insecure-url"])


class ConstantReuse(unittest.TestCase):
    """Guardrail misurabile: al massimo il 10% dei valori letterali di dominio può essere duplicato."""

    def project_with(self, files: dict, **cfg) -> Path:
        proj = project("react")
        conf = json.loads((proj / ".kyfes/config.json").read_text())
        conf.update(cfg)
        (proj / ".kyfes/config.json").write_text(json.dumps(conf))
        for rel, text in files.items():
            (proj / rel).parent.mkdir(parents=True, exist_ok=True)
            (proj / rel).write_text(text)
        return proj

    def values(self, n: int, prefix: str) -> str:
        return "\n".join(f"export const {prefix.upper()}_{i} = '{prefix}{i}'" for i in range(n))

    def metric(self, proj: Path):
        import arch_check
        return arch_check.run_with_metrics(proj, rules.load_config(proj))

    def test_extraction_skips_non_domain_literals(self):
        rel = "src/features/orders/components/X.tsx"
        src = ("'use client'\nimport { a } from '@/shared/ui'\nconst s = t('orders:list.title')\n"
               "if (typeof v === 'string') x()\n<Button variant=\"primary\" className=\"btn\" type=\"button\" />\n"
               "const msg = 'Una frase con spazi'\ncan('update', ORDER)\nconst k = ['orders', 'list']\n")
        self.assertEqual([v for v, _ in rules.literal_values(rel, src)], ["update", "orders", "list"])

    def test_template_literals_do_not_hide_strings(self):
        src = ("const a = `/orders/${encodeURIComponent(id)}/edit`\nregister('customerName')\n"
               "const b = `${x ? 'yes' : `n${'o'}`}`\nconst c = `plain`\nconst r = /['`]/g; can('read', S)\n")
        self.assertEqual([v for v, _ in rules.literal_values("src/features/a/components/X.tsx", src)],
                         ["customerName", "yes", "plain", "read"])

    def test_bound_template_attributes_are_expressions(self):
        src = ('<template>\n<Foo :error="error" v-if="isPending" @click="emit(\'cancel\')" '
               ':kind="\'currency\'" name="status" />\n</template>\n')
        self.assertEqual(sorted(v for v, _ in rules.literal_values("src/shared/ui/X.vue", src)),
                         ["cancel", "currency", "status"])

    def test_metric_blocks_above_threshold(self):
        dup = "\n".join(f"can('action{i}', S)" for i in range(4))
        files = {"src/features/orders/index.ts": "export {}\n",
                 "src/features/orders/permissions.ts": self.values(16, "v") + "\n" + dup,
                 "src/features/orders/api/a.ts": dup}
        proj = self.project_with(files)
        try:
            findings, metrics = self.metric(proj)
            m = metrics["constant_reuse"]
            self.assertEqual((m["values"], m["duplicated"]), (20, 4))
            reuse = [f for f in findings if f.rule == "constant-reuse"]
            self.assertEqual(len(reuse), 1)
            self.assertEqual(reuse[0].severity, "block")
            self.assertIn("20.0%", reuse[0].message)
            self.assertIn("'action0' ×2", reuse[0].message)
        finally:
            shutil.rmtree(proj)

    def test_metric_passes_at_threshold_and_with_references(self):
        # 2 duplicati su 20 = 10%: consentito (soglia inclusa)
        files = {"src/features/orders/index.ts": "export {}\n",
                 "src/features/orders/permissions.ts": self.values(18, "v") + "\ncan('read', S)\ncan('update', S)",
                 "src/features/orders/api/a.ts": "can('read', S)\ncan('update', S)\n"
                                                 "import { V_1 } from '../permissions'\ncan(V_1, S)\ncan(V_1, S)"}
        proj = self.project_with(files)
        try:
            findings, metrics = self.metric(proj)
            self.assertEqual(metrics["constant_reuse"]["ratio"], 0.1)
            self.assertFalse([f for f in findings if f.rule == "constant-reuse"])
        finally:
            shutil.rmtree(proj)

    def test_threshold_is_configurable_and_tests_do_not_count(self):
        files = {"src/features/orders/index.ts": "export {}\n",
                 "src/features/orders/permissions.ts": self.values(19, "v") + "\ncan('read', S)\ncan('read', S)",
                 "src/features/orders/api/a.test.ts": self.values(19, "v")}
        proj = self.project_with(files, constant_reuse={"max_duplicate_ratio": 0.0})
        try:
            findings, metrics = self.metric(proj)
            self.assertEqual(metrics["constant_reuse"]["duplicated"], 1)
            self.assertTrue([f for f in findings if f.rule == "constant-reuse"])
        finally:
            shutil.rmtree(proj)

    def test_stop_gate_blocks_and_post_edit_points_to_existing_value(self):
        dup = "\n".join(f"can('action{i}', S)" for i in range(5))
        files = {"src/features/orders/index.ts": "export {}\n",
                 "src/features/orders/permissions.ts": self.values(15, "v") + "\n" + dup,
                 "src/features/orders/api/a.ts": dup}
        proj = self.project_with(files)
        try:
            out = run_hook("stop_gate.py", {"cwd": str(proj), "hook_event_name": "Stop", "session_id": f"r-{proj.name}"})
            self.assertEqual(out.get("decision"), "block")
            self.assertIn("[constant-reuse]", out["reason"])
            post = run_hook("post_edit.py", {"cwd": str(proj), "tool_name": "Write", "tool_input": {
                "file_path": str(proj / "src/features/orders/api/a.ts"), "content": dup}})
            ctx = post["hookSpecificOutput"]["additionalContext"]
            self.assertIn("'action0': src/features/orders/permissions.ts:", ctx)
        finally:
            shutil.rmtree(proj)


class ConstantReuseAtWriteTime(unittest.TestCase):
    """Sviluppi futuri: un letterale che esiste già come costante esportata si importa, non si riscrive."""

    def setUp(self):
        self.proj = project("react")
        files = {
            "src/shared/rbac/ability.ts": "export const ACTIONS = { read: 'read', update: 'update' } as const\n",
            "src/features/orders/permissions.ts": "export const ORDER_SUBJECT = 'Order' as const\n",
            "src/features/orders/model/orders.schema.ts": "export const ORDER_STATUSES = ['draft', 'shipped'] as const\n",
            "src/features/orders/index.ts": "export {}\n",
        }
        for rel, text in files.items():
            (self.proj / rel).parent.mkdir(parents=True, exist_ok=True)
            (self.proj / rel).write_text(text)
        self.rel = "src/features/customers/components/CustomersTable.tsx"

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_new_code_must_reference_existing_constants(self):
        out = write(self.proj, self.rel, "const ok = can('update', record)")
        self.assertIn("[constant-reuse]", reason(out))
        self.assertIn("ACTIONS.update (src/shared/rbac/ability.ts:1)", reason(out))
        self.assertIn("ORDER_STATUSES[1]", reason(write(self.proj, "src/features/orders/components/OrdersTable.tsx",
                                                        "if (s === 'shipped') x()")))
        self.assertFalse(denied(write(self.proj, self.rel, "const ok = can(ACTIONS.update, record)")))

    def test_other_features_constants_are_homonyms_not_reuse(self):
        out = write(self.proj, "src/features/customers/model/customers.schema.ts",
                    "export const CUSTOMER_STATUS = { draft: 'draft', active: 'active' } as const")
        self.assertFalse(denied(out), reason(out))
        # una pagina compone le feature: lì la costante della feature si importa
        self.assertIn("ORDER_STATUSES[0]", reason(write(self.proj, "src/pages/OrdersPage.tsx", "if (s === 'draft') x()")))

    def test_duplicate_constant_definitions_are_denied(self):
        out = write(self.proj, "src/features/customers/permissions.ts", "export const EDIT = 'update' as const")
        self.assertIn("ACTIONS.update", reason(out))
        self.assertFalse(denied(write(self.proj, "src/features/customers/permissions.ts",
                                      "export const CUSTOMER_SUBJECT = 'Customer' as const")))

    def test_existing_literals_tests_and_ignored_values_do_not_block(self):
        legacy = "src/features/orders/components/Legacy.tsx"
        (self.proj / legacy).parent.mkdir(parents=True, exist_ok=True)
        (self.proj / legacy).write_text("const a = can('read', x)\nconst b = 1\n")
        self.assertFalse(denied(edit(self.proj, legacy, "const b = 1", "const b = 2")))
        self.assertFalse(denied(write(self.proj, "src/features/customers/components/X.test.tsx", "can('update', r)")))
        conf = json.loads((self.proj / ".kyfes/config.json").read_text())
        conf["constant_reuse"] = {"ignore_values": ["update"]}
        (self.proj / ".kyfes/config.json").write_text(json.dumps(conf))
        self.assertFalse(denied(write(self.proj, self.rel, "const ok = can('update', record)")))


class CommentStripping(unittest.TestCase):
    def test_keeps_lines_and_strings(self):
        src = "const a = '/* not a comment */'\n/* block\n eval(1) */ const b = 1\nconst c = 'https://x' // eval(2)\n"
        out = rules.strip_comments(src)
        self.assertEqual(out.count("\n"), src.count("\n"))
        self.assertIn("'/* not a comment */'", out)
        self.assertNotIn("eval", out)
        self.assertIn("const b = 1", out)
        self.assertIn("'https://x'", out)


if __name__ == "__main__":
    unittest.main()
