"""Test degli hook e delle regole di kyfes: ogni regola con l'esito atteso (deny/allow), in Claude Code e Codex.

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

LAYOUTS = {
    "react": ("src/features/orders/components/OrdersTable.tsx", "src/shared"),
    "next": ("src/features/orders/components/OrdersTable.tsx", "src/shared"),
    "vue": ("src/features/orders/components/OrdersTable.vue", "src/shared"),
    "angular": ("src/app/features/orders/components/orders-table.component.ts", "src/app/shared"),
    "svelte": ("src/lib/features/orders/components/OrdersTable.svelte", "src/lib/shared"),
}


def project(framework: str) -> Path:
    d = Path(tempfile.mkdtemp(prefix=f"kyfes-{framework}-"))
    (d / ".kyfes").mkdir()
    (d / ".kyfes" / "config.json").write_text(json.dumps({"framework": framework, "stop_gate": {"commands": []}}))
    return d


def run_hook(script: str, event: dict) -> dict:
    r = subprocess.run([sys.executable, "-B", str(SCRIPTS / script)], input=json.dumps(event),
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout) if r.stdout.strip() else {}


def claude_write(proj: Path, rel: str, content: str) -> dict:
    return run_hook("pre_write.py", {"cwd": str(proj), "hook_event_name": "PreToolUse", "tool_name": "Write",
                                     "tool_input": {"file_path": str(proj / rel), "content": content}})


def codex_patch(proj: Path, rel: str, content: str) -> dict:
    body = "\n".join("+" + ln for ln in content.splitlines())
    patch = f"*** Begin Patch\n*** Add File: {rel}\n{body}\n*** End Patch\n"
    return run_hook("pre_write.py", {"cwd": str(proj), "hook_event_name": "PreToolUse", "tool_name": "apply_patch",
                                     "tool_input": {"command": patch}})


def denied(out: dict) -> bool:
    return (out.get("hookSpecificOutput") or {}).get("permissionDecision") == "deny"


def reason(out: dict) -> str:
    return (out.get("hookSpecificOutput") or {}).get("permissionDecisionReason", "")


# (regola attesa, contenuto) — tutti devono essere negati in un componente di feature
DENY_CASES = [
    ("token-storage", "localStorage.setItem('access_token', token)"),
    ("token-storage", "sessionStorage.getItem('jwt')"),
    ("js-cookie-write", "document.cookie = 'session=' + id"),
    ("bearer-in-client", "const headers = { Authorization: `Bearer ${token}` }"),
    ("insecure-url", "const API = 'http://api.example.it/v1'"),
    ("raw-html", "<div dangerouslySetInnerHTML={{ __html: body }} />"),
    ("raw-html", "el.innerHTML = html"),
    ("eval", "const f = new Function('return 1')"),
    ("eval", "setTimeout('doIt()', 10)"),
    ("blank-target", '<a href="https://example.com/doc" target="_blank">{t("doc")}</a>'),
    ("secrets", "const key = 'AKIAABCDEFGHIJKLMNOP'"),
    ("public-env-secret", "const s = import.meta.env.VITE_CLIENT_SECRET"),
    ("role-string-check", "if (user.role === 'admin') show()"),
    ("role-string-check", "const ok = roles.includes('manager')"),
    ("http-outside-api", "const r = await fetch('/api/orders')"),
    ("library-boundary", "import axios from 'axios'"),
    ("library-boundary", "import { BarChart } from 'recharts'"),
    ("library-boundary", "import { createMongoAbility } from '@casl/ability'"),
    ("library-boundary", "import DOMPurify from 'dompurify'"),
]

ALLOW_CASES = [
    "import { sanitizeHtml } from '@/shared/lib'\nel.innerHTML = sanitizeHtml(html)",
    "<a href={url} target=\"_blank\" rel=\"noopener noreferrer\">{t('doc')}</a>",
    "const api = 'http://localhost:8080'",
    "const ns = 'http://www.w3.org/2000/svg'",
    "const canEdit = can('update', subject('Order', order))",
    "const theme = localStorage.getItem('theme')",
]


class RulesPerFramework(unittest.TestCase):
    def test_deny_cases_claude_and_codex(self):
        for fw, (component, _) in LAYOUTS.items():
            proj = project(fw)
            try:
                for rule, content in DENY_CASES:
                    if fw == "angular" and rule == "library-boundary" and "axios" in content:
                        continue
                    for sender in (claude_write, codex_patch):
                        with self.subTest(fw=fw, rule=rule, sender=sender.__name__, content=content):
                            out = sender(proj, component, content)
                            self.assertTrue(denied(out), f"atteso deny per {rule}")
                            self.assertIn(f"[{rule}]", reason(out))
            finally:
                shutil.rmtree(proj)

    def test_allow_cases(self):
        for fw, (component, _) in LAYOUTS.items():
            proj = project(fw)
            try:
                for content in ALLOW_CASES:
                    with self.subTest(fw=fw, content=content):
                        self.assertFalse(denied(claude_write(proj, component, content)), content)
            finally:
                shutil.rmtree(proj)

    def test_libraries_allowed_in_their_shared_folder(self):
        cases = [("api/http.ts", "import axios from 'axios'"), ("charts/BarChart.tsx", "import { BarChart } from 'recharts'"),
                 ("rbac/ability.ts", "import { createMongoAbility } from '@casl/ability'"),
                 ("lib/sanitize.ts", "import DOMPurify from 'dompurify'"), ("api/http.ts", "const r = await fetch(url)"),
                 ("rbac/ability.ts", "// le regole arrivano dal server\nexport const x = 1")]
        for fw, (_, shared) in LAYOUTS.items():
            proj = project(fw)
            try:
                for rel, content in cases:
                    with self.subTest(fw=fw, rel=rel):
                        self.assertFalse(denied(claude_write(proj, f"{shared}/{rel}", content)), reason({}))
            finally:
                shutil.rmtree(proj)

    def test_angular_query_experimental_is_bounded(self):
        proj = project("angular")
        try:
            imp = "import { injectQuery } from '@tanstack/angular-query-experimental'"
            self.assertFalse(denied(claude_write(proj, "src/app/features/orders/api/orders.queries.ts", imp)))
            self.assertTrue(denied(claude_write(proj, "src/app/features/orders/components/orders-table.component.ts", imp)))
        finally:
            shutil.rmtree(proj)

    def test_page_deep_import_into_feature_denied(self):
        proj = project("svelte")
        try:
            out = claude_write(proj, "src/routes/orders/+page.svelte", "import { x } from '$lib/features/orders/api/orders.api'")
            self.assertIn("[feature-deep-import]", reason(out))
            self.assertFalse(denied(claude_write(proj, "src/routes/orders/+page.svelte", "import { x } from '#lib/features/orders/index.js'")))
        finally:
            shutil.rmtree(proj)

    def test_tanstack_query_allowed_in_feature_api_only(self):
        proj = project("react")
        try:
            imp = "import { queryOptions } from '@tanstack/react-query'"
            self.assertFalse(denied(claude_write(proj, "src/features/orders/api/orders.queries.ts", imp)))
            self.assertTrue(denied(claude_write(proj, "src/features/orders/components/OrdersTable.tsx", imp)))
        finally:
            shutil.rmtree(proj)


class LayersAndLayout(unittest.TestCase):
    def setUp(self):
        self.proj = project("react")

    def tearDown(self):
        shutil.rmtree(self.proj)

    def test_shared_cannot_import_features(self):
        out = claude_write(self.proj, "src/shared/ui/Button.tsx", "import { x } from '@/features/orders'")
        self.assertIn("[layer-direction]", reason(out))

    def test_feature_deep_import_denied_index_allowed(self):
        rel = "src/features/invoices/components/InvoiceList.tsx"
        self.assertIn("[feature-deep-import]", reason(claude_write(self.proj, rel, "import { a } from '@/features/orders/api/orders.api'")))
        self.assertIn("[feature-deep-import]", reason(claude_write(self.proj, rel, "import { a } from '../../orders/model/orders.schema'")))
        self.assertFalse(denied(claude_write(self.proj, rel, "import { a } from '@/features/orders'")))

    def test_unknown_shared_folder_and_feature_entry(self):
        self.assertIn("[folder-layout]", reason(claude_write(self.proj, "src/shared/helpers/x.ts", "export const a = 1")))
        self.assertIn("[folder-layout]", reason(claude_write(self.proj, "src/features/orders/stuff/x.ts", "export const a = 1")))
        self.assertIn("[folder-layout]", reason(claude_write(self.proj, "src/features/Orders/index.ts", "export {}")))

    def test_protected_config_and_generated(self):
        self.assertIn("[protected-files]", reason(claude_write(self.proj, ".kyfes/config.json", "{}")))
        self.assertIn("[protected-files]", reason(claude_write(self.proj, "src/shared/api/generated/schema.ts", "export {}")))

    def test_env_files(self):
        self.assertIn("[public-env-secret]", reason(claude_write(self.proj, ".env", "VITE_API_KEY=abc")))
        self.assertFalse(denied(claude_write(self.proj, ".env", "VITE_API_BASE_URL=/api")))

    def test_tests_and_mocks_are_exempt_from_boundaries(self):
        self.assertFalse(denied(claude_write(self.proj, "src/mocks/handlers.ts", "const role = 'admin'; if (role === 'admin') {}")))
        self.assertFalse(denied(claude_write(self.proj, "src/features/orders/components/OrdersTable.test.tsx", "import axios from 'axios'")))

    def test_outside_project_or_without_config_is_noop(self):
        bare = Path(tempfile.mkdtemp())
        try:
            out = run_hook("pre_write.py", {"cwd": str(bare), "tool_name": "Write",
                                            "tool_input": {"file_path": str(bare / "src/a.ts"), "content": "eval('1')"}})
            self.assertEqual(out, {})
        finally:
            shutil.rmtree(bare)


class Warnings(unittest.TestCase):
    def test_hardcoded_text_ignores_arrow_generics(self):
        cfg = rules.normalize_config({"framework": "react"})
        rel = "src/features/orders/components/OrdersTable.tsx"
        warn = lambda c: [f for f in rules.check_content(rel, c, cfg) if f.rule == "hardcoded-text"]
        self.assertEqual(warn("const page = (load: () => Promise<PageModule>) => async () => load()"), [])
        self.assertEqual(len(warn("<h1>Elenco ordini</h1>")), 1)
        self.assertEqual(warn("<h1>{t('orders:list.title')}</h1>"), [])


class ServerCodeExceptions(unittest.TestCase):
    def test_next_route_handler_may_fetch_and_forward_bearer(self):
        proj = project("next")
        try:
            content = "const r = await fetch(upstream, { headers: { Authorization: `Bearer ${token}` } })"
            self.assertFalse(denied(claude_write(proj, "src/app/api/orders/route.ts", content)))
            self.assertTrue(denied(claude_write(proj, "src/app/orders/page.tsx", content)))
        finally:
            shutil.rmtree(proj)

    def test_sveltekit_server_load_may_fetch(self):
        proj = project("svelte")
        try:
            self.assertFalse(denied(claude_write(proj, "src/routes/orders/+page.server.ts", "const r = await fetch('/api/orders')")))
            self.assertTrue(denied(claude_write(proj, "src/routes/orders/+page.svelte", "const r = await fetch('/api/orders')")))
        finally:
            shutil.rmtree(proj)


class CodexPatchParsing(unittest.TestCase):
    def test_update_and_multi_file_patch(self):
        import hook_common
        patch = ("*** Begin Patch\n*** Update File: src/a.ts\n@@\n-old\n+new line\n*** Add File: src/b.ts\n+b1\n+b2\n"
                 "*** Delete File: src/c.ts\n*** Update File: src/d.ts\n*** Move to: src/e.ts\n@@\n+moved\n*** End Patch")
        files = hook_common.written_files({"tool_input": {"command": patch}})
        self.assertEqual(files, {"src/a.ts": ["new line"], "src/b.ts": ["b1\nb2"], "src/e.ts": ["moved"]})


class StopGateAndArchCheck(unittest.TestCase):
    def test_stop_gate_blocks_then_releases(self):
        proj = project("react")
        try:
            (proj / "src/features/orders").mkdir(parents=True)
            (proj / "src/features/orders/index.ts").write_text("export const x = eval('1')\n")
            ev = {"cwd": str(proj), "hook_event_name": "Stop", "session_id": "t-" + proj.name}
            out = run_hook("stop_gate.py", ev)
            self.assertEqual(out.get("decision"), "block")
            self.assertIn("[eval]", out.get("reason", ""))
            (proj / "src/features/orders/index.ts").write_text("export const x = 1\n")
            self.assertEqual(run_hook("stop_gate.py", ev), {})
        finally:
            shutil.rmtree(proj)

    def test_duplicates_detected(self):
        proj = project("react")
        try:
            block = "\n".join(f"  const v{i} = compute(input, {i}) * factor + offset{i}" for i in range(10))
            for name in ("orders", "customers"):
                d = proj / f"src/features/{name}"
                (d / "api").mkdir(parents=True)
                (d / "index.ts").write_text("export {}\n")
                (d / "api" / f"{name}.api.ts").write_text(f"export function f() {{\n{block}\n}}\n")
            cfg = rules.load_config(proj)
            import arch_check
            found = [f for f in arch_check.run(proj, cfg) if f.rule == "duplicates"]
            self.assertEqual(len(found), 1)
        finally:
            shutil.rmtree(proj)


class Installer(unittest.TestCase):
    def test_install_idempotent_and_uninstall(self):
        d = Path(tempfile.mkdtemp())
        try:
            (d / "package.json").write_text('{"dependencies": {"@angular/core": "^22"}}')
            (d / "AGENTS.md").write_text("# Team notes\n")
            cmd = ["bash", str(ROOT / "install.sh"), "--target", str(d), "--no-plugin"]
            for _ in range(2):
                subprocess.run(cmd, check=True, capture_output=True, text=True)
            cfg = json.loads((d / ".kyfes/config.json").read_text())
            self.assertEqual(cfg["framework"], "angular")
            for f in ("CLAUDE.md", "AGENTS.md"):
                self.assertEqual((d / f).read_text().count("kyfes:start"), 1)
            self.assertTrue((d / ".agents/skills/kyfes-architecture/SKILL.md").is_file())
            self.assertTrue((d / ".codex/agents/kyfes_reviewer.toml").is_file())
            hooks = json.loads((d / ".codex/hooks.json").read_text())["hooks"]
            self.assertEqual(len(hooks["PreToolUse"]), 2)  # scritture + guard della shell
            self.assertTrue((d / "tools/kyfes/plugins/kyfes/scripts/arch_check.py").is_file())
            self.assertFalse((d / "tools/kyfes/plugins/kyfes/templates/scaffold").exists())
            deny = json.loads((d / ".claude/settings.json").read_text())["permissions"]["deny"]
            self.assertIn("Edit(.kyfes/**)", deny)
            self.assertEqual(len(deny), len(set(deny)))  # idempotente
            subprocess.run(cmd + ["--uninstall"], check=True, capture_output=True, text=True)
            self.assertEqual((d / "AGENTS.md").read_text().strip(), "# Team notes")
            self.assertFalse((d / ".codex/hooks.json").exists())
            self.assertFalse((d / "tools/kyfes").exists())
            self.assertFalse((d / ".claude/settings.json").exists())
        finally:
            shutil.rmtree(d)


if __name__ == "__main__":
    unittest.main()
