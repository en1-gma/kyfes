"""Regole di kyfes: configurazione, preset per framework e controlli sul contenuto dei file.

Usato dagli hook (pre_write, post_edit, stop_gate) e da arch_check. Solo libreria standard.
"""
from __future__ import annotations

import fnmatch
import json
import os
import posixpath
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

CONFIG_REL = ".kyfes/config.json"

FRAMEWORKS = ("react", "next", "vue", "angular", "svelte")

# Cartelle dei quattro livelli e alias di import per framework.
PRESETS: Dict[str, dict] = {
    "react": {
        "layers": {"app": "src/app", "pages": "src/pages", "features": "src/features", "shared": "src/shared"},
        "aliases": {"@/": "src/"},
        "server_globs": [],
    },
    "vue": {
        "layers": {"app": "src/app", "pages": "src/pages", "features": "src/features", "shared": "src/shared"},
        "aliases": {"@/": "src/"},
        "server_globs": [],
    },
    "next": {
        "layers": {"app": "src/app", "pages": "src/app", "features": "src/features", "shared": "src/shared"},
        "aliases": {"@/": "src/"},
        "server_globs": ["src/app/api/**", "src/**/*.server.ts", "src/shared/api/server/**",
                         "src/proxy.ts", "src/middleware.ts", "src/instrumentation.ts"],
    },
    "angular": {
        "layers": {"app": "src/app", "pages": "src/app/pages", "features": "src/app/features",
                   "shared": "src/app/shared"},
        "aliases": {"@app/": "src/app/", "@shared/": "src/app/shared/", "@features/": "src/app/features/"},
        "server_globs": ["src/server.ts", "src/main.server.ts", "src/app/app.config.server.ts"],
    },
    "svelte": {
        "layers": {"app": "src", "pages": "src/routes", "features": "src/lib/features", "shared": "src/lib/shared"},
        "aliases": {"$lib/": "src/lib/", "#lib/": "src/lib/"},
        "app_globs": ["src/routes/+layout.svelte", "src/routes/+layout.ts", "src/routes/+layout.server.ts",
                      "src/routes/+error.svelte", "src/hooks.ts", "src/hooks.client.ts", "src/hooks.server.ts"],
        "server_globs": ["src/hooks.server.ts", "src/routes/**/+server.ts", "src/routes/**/+page.server.ts",
                         "src/routes/**/+layout.server.ts", "src/lib/server/**"],
    },
}

SHARED_DIRS = ("api", "auth", "rbac", "i18n", "charts", "ui", "lib", "config")
FEATURE_ENTRIES = ("api", "components", "model", "locales", "hooks", "composables", "stores", "services",
                   "permissions.ts", "index.ts", "routes.ts")

DEFAULT_RULES: Dict[str, str] = {
    "protected-files": "block",
    "token-storage": "block",
    "js-cookie-write": "block",
    "bearer-in-client": "block",
    "insecure-url": "block",
    "raw-html": "block",
    "eval": "block",
    "blank-target": "block",
    "secrets": "block",
    "public-env-secret": "block",
    "http-outside-api": "block",
    "library-boundary": "block",
    "layer-direction": "block",
    "feature-deep-import": "block",
    "role-string-check": "block",
    "folder-layout": "block",
    "duplicates": "block",
    "hardcoded-text": "warn",
    "console": "warn",
    "explicit-any": "warn",
    "ts-ignore": "warn",
}

# libreria (prefisso del modulo) -> sottocartelle di shared in cui può essere importata.
# "app" consente anche il livello app (provider); "feature-api" consente features/*/api.
LIBRARY_BOUNDARIES: List[Tuple[str, Tuple[str, ...]]] = [
    ("axios", ("api",)),
    ("@angular/common/http", ("api", "app")),
    ("@tanstack/react-query", ("api", "auth", "rbac", "app", "feature-api")),
    ("@tanstack/vue-query", ("api", "auth", "rbac", "app", "feature-api")),
    ("@tanstack/svelte-query", ("api", "auth", "rbac", "app", "feature-api")),
    ("@tanstack/angular-query", ("api", "auth", "rbac", "app", "feature-api")),
    ("@tanstack/angular-query-experimental", ("api", "auth", "rbac", "app", "feature-api")),
    ("recharts", ("charts",)),
    ("echarts", ("charts", "app")),
    ("vue-echarts", ("charts", "app")),
    ("ngx-echarts", ("charts", "app")),
    ("chart.js", ("charts",)),
    ("layerchart", ("charts",)),
    ("i18next", ("i18n", "app")),
    ("react-i18next", ("i18n", "app")),
    ("next-intl", ("i18n", "app")),
    ("vue-i18n", ("i18n", "app")),
    ("@jsverse/transloco", ("i18n", "app")),
    ("@inlang/paraglide-js", ("i18n", "app")),
    ("@casl/", ("rbac", "app")),
    ("dompurify", ("lib",)),
    ("isomorphic-dompurify", ("lib",)),
]

CODE_EXT = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".vue", ".svelte")
MARKUP_EXT = (".tsx", ".jsx", ".vue", ".svelte", ".html")
SCANNED_EXT = CODE_EXT + (".html",)

TEST_PARTS = ("/__tests__/", "/test/", "/tests/", "/mocks/", "/e2e/", "/__mocks__/", "/testing/")
TEST_SUFFIX = re.compile(r"\.(test|spec|stories)\.[a-z]+$")


@dataclass
class Finding:
    rule: str
    severity: str
    path: str
    line: int
    message: str

    def format(self) -> str:
        loc = f"{self.path}:{self.line}" if self.line else self.path
        return f"- [{self.rule}] {loc} — {self.message}"


# ---------------------------------------------------------------- configurazione

def find_project_dir(start: Optional[str]) -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("KYFES_PROJECT_DIR")
    if env and (Path(env) / CONFIG_REL).is_file():
        return Path(env).resolve()
    cur = Path(start or os.getcwd()).resolve()
    for d in (cur, *cur.parents):
        if (d / CONFIG_REL).is_file():
            return d
    return Path(env).resolve() if env else cur


def load_config(proj: Path) -> Optional[dict]:
    p = proj / CONFIG_REL
    if not p.is_file():
        return None
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        raw = {}
    return normalize_config(raw)


def normalize_config(raw: dict) -> dict:
    fw = raw.get("framework") if raw.get("framework") in FRAMEWORKS else "react"
    preset = PRESETS[fw]
    cfg = dict(raw)
    cfg["framework"] = fw
    cfg["layers"] = {**preset["layers"], **(raw.get("layers") or {})}
    cfg["aliases"] = {**preset["aliases"], **(raw.get("aliases") or {})}
    cfg["server_globs"] = list(raw.get("server_globs") or preset["server_globs"])
    cfg["app_globs"] = list(raw.get("app_globs") or preset.get("app_globs", []))
    cfg["rules"] = {**DEFAULT_RULES, **(raw.get("rules") or {})}
    cfg["exclude"] = list(raw.get("exclude") or []) + ["node_modules/**", "dist/**", "build/**", ".next/**",
                                                        ".svelte-kit/**", ".angular/**", "coverage/**",
                                                        "**/generated/**", "**/paraglide/**"]
    cfg["src_root"] = raw.get("src_root", "src")
    cfg["duplicates"] = {"min_lines": 8, **(raw.get("duplicates") or {})}
    cfg["shared_dirs"] = list(raw.get("shared_dirs") or SHARED_DIRS)
    cfg["allowed_http_hosts"] = list(raw.get("allowed_http_hosts") or [])
    return cfg


def rel_to_project(path: str, proj: Path) -> Optional[str]:
    p = Path(path)
    if not p.is_absolute():
        p = proj / p
    try:
        return p.resolve().relative_to(proj.resolve()).as_posix()
    except ValueError:
        return None


def glob_match(rel: str, patterns: Iterable[str]) -> bool:
    for pat in patterns:
        if fnmatch.fnmatch(rel, pat):
            return True
        if pat.endswith("/**") and (rel == pat[:-3] or rel.startswith(pat[:-2])):
            return True
        if pat.startswith("**/") and fnmatch.fnmatch(rel, pat[3:]):
            return True
    return False


def is_test(rel: str) -> bool:
    r = "/" + rel
    return any(part in r for part in TEST_PARTS) or bool(TEST_SUFFIX.search(rel))


def is_server(rel: str, cfg: dict) -> bool:
    return glob_match(rel, cfg["server_globs"])


# ---------------------------------------------------------------- livelli

def layer_of(rel: str, cfg: dict) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """(livello, sottocartella di shared o nome feature, sottocartella della feature)."""
    L = cfg["layers"]
    for name in ("shared", "features"):
        base = L[name].rstrip("/") + "/"
        if rel.startswith(base):
            rest = rel[len(base):].split("/")
            sub = rest[0] if rest else None
            inner = rest[1] if len(rest) > 2 else (rest[1] if len(rest) == 2 else None)
            return name, sub, inner
    if glob_match(rel, cfg.get("app_globs", [])):
        return "app", None, None
    # pages prima di app (in next e svelte coincidono o sono annidati)
    pages = L["pages"].rstrip("/") + "/"
    app = L["app"].rstrip("/") + "/"
    if L["pages"] != L["app"] and rel.startswith(pages):
        return "pages", None, None
    if rel.startswith(app):
        return "app", None, None
    return None, None, None


RANK = {"shared": 0, "features": 1, "pages": 2, "app": 3}


def resolve_import(spec: str, rel: str, cfg: dict) -> Optional[str]:
    """Percorso (relativo al progetto, senza estensione) di un import locale, o None se è un pacchetto."""
    if spec.startswith("."):
        return posixpath.normpath(posixpath.join(posixpath.dirname(rel), spec))
    for alias, target in cfg["aliases"].items():
        if spec.startswith(alias):
            return posixpath.normpath(target + spec[len(alias):])
        if spec == alias.rstrip("/"):
            return target.rstrip("/")
    return None


IMPORT_RE = re.compile(
    r"""(?:import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?|export\s+(?:type\s+)?[\w*{}\s,$]+\s+from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]""")


def imports_of(text: str) -> List[Tuple[int, str]]:
    out = []
    for m in IMPORT_RE.finditer(text):
        out.append((text.count("\n", 0, m.start()) + 1, m.group(1)))
    return out


def check_imports(rel: str, text: str, cfg: dict) -> List[Finding]:
    if not rel.endswith(CODE_EXT):
        return []
    findings: List[Finding] = []
    layer, sub, inner = layer_of(rel, cfg)
    test = is_test(rel)
    rules_cfg = cfg["rules"]
    for line, spec in imports_of(text):
        # confini delle librerie
        if not test and not is_server(rel, cfg):
            for lib, allowed in LIBRARY_BOUNDARIES:
                if spec == lib or spec.startswith(lib if lib.endswith("/") else lib + "/") or spec == lib.rstrip("/"):
                    ok = (layer == "shared" and sub in allowed) or (layer == "app" and "app" in allowed) \
                        or (layer == "features" and inner == "api" and "feature-api" in allowed)
                    if not ok:
                        where = ", ".join(("shared/" + a) if a not in ("app", "feature-api") else
                                          ("features/<f>/api" if a == "feature-api" else "app") for a in allowed)
                        findings.append(Finding("library-boundary", rules_cfg["library-boundary"], rel, line,
                                                f"'{spec}' si importa solo in {where}: usa il wrapper esposto da lì"))
                    break
        target = resolve_import(spec, rel, cfg)
        if target is None or layer is None:
            continue
        t_layer, t_sub, _ = layer_of(target + "/x" if "." not in posixpath.basename(target) else target, cfg)
        if t_layer is None:
            continue
        if RANK.get(t_layer, 0) > RANK.get(layer, 0) and not test:
            findings.append(Finding("layer-direction", rules_cfg["layer-direction"], rel, line,
                                    f"'{layer}' non può importare da '{t_layer}' ({spec}): dipendenze solo app → pages → features → shared"))
        if t_layer == "features" and t_sub and not (layer == "features" and t_sub == sub) and not test:
            base = cfg["layers"]["features"].rstrip("/") + "/" + t_sub
            if target not in (base, base + "/index", base + "/index.js", base + "/index.ts"):
                findings.append(Finding("feature-deep-import", rules_cfg["feature-deep-import"], rel, line,
                                        f"import interno della feature '{t_sub}' ({spec}): usa il suo index.ts o sposta il codice comune in shared"))
    return findings


# ---------------------------------------------------------------- controlli sul contenuto

def _line_rules() -> List[Tuple[str, re.Pattern, str, Optional[re.Pattern]]]:
    """(regola, pattern, messaggio, eccezione sulla stessa riga)."""
    return [
        ("token-storage",
         re.compile(r"""(localStorage|sessionStorage)\s*(\.\s*(setItem|getItem)\s*\(\s*[^)]*|\[\s*['"`][^'"`]*)(token|jwt|bearer|refresh|access|session|auth|secret|password|credential)""", re.I),
         "token e credenziali non si salvano nel browser: la sessione vive in un cookie HttpOnly/Secure gestito dal server (BFF)", None),
        ("js-cookie-write", re.compile(r"document\s*\.\s*cookie\s*=(?!=)"),
         "i cookie li imposta il server (HttpOnly, Secure, SameSite): mai document.cookie = …", None),
        ("bearer-in-client", re.compile(r"""(['"`]Bearer\s|Authorization['"]?\s*[:=]\s*[`'"]?\s*(Bearer|\$\{))""", re.I),
         "il browser non gestisce token: niente header Authorization costruiti nel client, si usa il cookie di sessione", None),
        ("insecure-url", re.compile(r"""['"`(]\s*(http|ws)://(?!localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|www\.w3\.org|schemas\.|json-schema\.org|xmlns|example\.(com|org))""", re.I),
         "solo HTTPS/WSS: nessun URL http:// o ws:// (salvo localhost in sviluppo)", None),
        ("raw-html", re.compile(r"""dangerouslySetInnerHTML|\bv-html\s*=|\{@html\s|\.(inner|outer)HTML\s*=(?!=)|insertAdjacentHTML\s*\(|document\s*\.\s*write(ln)?\s*\(|bypassSecurityTrust\w*\s*\("""),
         "HTML grezzo vietato: passa il contenuto da sanitizeHtml() di shared/lib sulla stessa riga, o rendilo come testo",
         re.compile(r"sanitizeHtml\s*\(")),
        ("eval", re.compile(r"""(?<![\w.])eval\s*\(|new\s+Function\s*\(|set(Timeout|Interval)\s*\(\s*['"`]"""),
         "esecuzione di codice da stringa vietata (eval, new Function, setTimeout con stringa)", None),
        ("secrets", re.compile(r"""AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bsk-[A-Za-z0-9_-]{20,}|\bxox[abprs]-[A-Za-z0-9-]{10,}|(client_secret|api_secret|apiSecret|clientSecret|password|passwd)\s*[:=]\s*['"][^'"\s]{6,}['"]""", re.I),
         "segreto in chiaro: nel frontend non esistono segreti, e i valori vanno in un secret manager lato server", None),
        ("public-env-secret", re.compile(r"""\b(VITE|NEXT_PUBLIC|PUBLIC|NG_APP)_\w*(SECRET|PASSWORD|PRIVATE|TOKEN|API_?KEY|CLIENT_SECRET)\w*"""),
         "una variabile con prefisso pubblico finisce nel bundle: non può contenere segreti o token", None),
        ("role-string-check", re.compile(r"""\b(role|roles|userRole|user\.role|ruolo)\b\s*(===|!==|==|!=)\s*['"`]|\broles?\s*\.\s*(includes|indexOf|some)\s*\(\s*['"`]|\bisAdmin\b|\bhasRole\s*\(""", re.I),
         "nessun controllo sui nomi dei ruoli: usa can(azione, soggetto) di shared/rbac (permessi CASL dal server)", None),
        ("console", re.compile(r"""\bconsole\s*\.\s*(log|debug|trace)\s*\("""),
         "console.log non entra nel codice committato", None),
        ("explicit-any", re.compile(r""":\s*any\b(?!\w)|\bas\s+any\b|<any>"""),
         "evita any: deriva i tipi dagli schemi Zod (z.infer) o usa unknown + parse", None),
        ("ts-ignore", re.compile(r"@ts-(ignore|nocheck)"),
         "@ts-ignore/@ts-nocheck vietati: correggi il tipo (al più @ts-expect-error con motivazione)", None),
    ]


LINE_RULES = _line_rules()
HTTP_CALL = re.compile(r"""(?<![\w.])fetch\s*\(|new\s+XMLHttpRequest\s*\(|\$\.ajax\s*\(""")
BLANK_TARGET = re.compile(r"""target\s*=\s*['"{]?\s*['"]?_blank""")
HARDCODED_TEXT = re.compile(r"""(?<![=\-])>\s*([A-Za-zÀ-ÿ][^<>{}\n]*[A-Za-zÀ-ÿ]{3,}[^<>{}\n]*)\s*<|\b(placeholder|title|aria-label|alt|label)\s*=\s*"([A-Za-zÀ-ÿ][^"{}]*\s[^"{}]*)\"""")
HTML_SHELLS = ("index.html", "app.html")  # documento prima del bootstrap: il titolo tradotto lo imposta l'app
COMMENT_LINE = re.compile(r"^\s*(//|\*|/\*|<!--)")

SECURITY_RULES_IN_TESTS = {"secrets", "public-env-secret", "insecure-url"}


def check_content(rel: str, text: str, cfg: dict) -> List[Finding]:
    """Controlli riga per riga + import. `text` può essere un frammento (Edit) o il file intero."""
    if rel.startswith(".env") or "/.env" in rel:
        return _check_env(rel, text, cfg)
    if not rel.endswith(SCANNED_EXT):
        return []
    rc = cfg["rules"]
    test = is_test(rel)
    server = is_server(rel, cfg)
    layer, sub, _ = layer_of(rel, cfg)
    findings: List[Finding] = []
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        if COMMENT_LINE.match(line):
            continue
        for rule, pat, msg, exc in LINE_RULES:
            sev = rc.get(rule, "off")
            if sev == "off":
                continue
            if test and rule not in SECURITY_RULES_IN_TESTS:
                continue
            if rule == "role-string-check" and layer == "shared" and sub == "rbac":
                continue
            if rule == "bearer-in-client" and server:
                continue
            if rule == "explicit-any" and not rel.endswith((".ts", ".tsx", ".vue", ".svelte", ".mts", ".cts")):
                continue
            if pat.search(line) and not (exc and exc.search(line)):
                findings.append(Finding(rule, sev, rel, i, msg))
        if not test and not server and rc.get("http-outside-api", "off") != "off" and HTTP_CALL.search(line) \
                and not (layer == "shared" and sub == "api"):
            findings.append(Finding("http-outside-api", rc["http-outside-api"], rel, i,
                                    "le chiamate HTTP passano solo dal client di shared/api (axios/HttpClient), consumato da TanStack Query nelle feature"))
        if not test and rc.get("blank-target", "off") != "off" and BLANK_TARGET.search(line):
            window = " ".join(lines[max(0, i - 3):i + 2])
            if not re.search(r"noopener", window):
                findings.append(Finding("blank-target", rc["blank-target"], rel, i,
                                        'target="_blank" richiede rel="noopener noreferrer"'))
        if not test and rel.endswith(MARKUP_EXT) and posixpath.basename(rel) not in HTML_SHELLS \
                and rc.get("hardcoded-text", "off") != "off":
            m = HARDCODED_TEXT.search(line)
            if m and not re.search(r"""\bt\(|\$t\(|\bm\.|transloco|\{\{\s*['"]""", line):
                findings.append(Finding("hardcoded-text", rc["hardcoded-text"], rel, i,
                                        "testo visibile non tradotto: usa la funzione di traduzione di shared/i18n"))
    findings += check_imports(rel, text, cfg)
    return findings


def _check_env(rel: str, text: str, cfg: dict) -> List[Finding]:
    rc = cfg["rules"]
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        for rule in ("public-env-secret", "secrets"):
            pat = next(p for r, p, _, _ in LINE_RULES if r == rule)
            if rc.get(rule, "off") != "off" and pat.search(line):
                out.append(Finding(rule, rc[rule], rel, i, next(m for r, _, m, _ in LINE_RULES if r == rule)))
    return out


# ---------------------------------------------------------------- struttura e file protetti

def check_protected(rel: str, cfg: dict) -> List[Finding]:
    sev = cfg["rules"].get("protected-files", "block")
    if sev == "off":
        return []
    if rel == CONFIG_REL or rel.startswith(".kyfes/"):
        return [Finding("protected-files", sev, rel, 0, "la configurazione di kyfes la modifica solo l'utente")]
    if "/generated/" in "/" + rel or "/paraglide/" in "/" + rel:
        return [Finding("protected-files", sev, rel, 0, "file generato: si rigenera dalla sorgente, non si modifica a mano")]
    return []


def check_layout(rel: str, cfg: dict) -> List[Finding]:
    sev = cfg["rules"].get("folder-layout", "block")
    if sev == "off" or is_test(rel):
        return []
    layer, sub, inner = layer_of(rel, cfg)
    base_feat = cfg["layers"]["features"].rstrip("/") + "/"
    base_shared = cfg["layers"]["shared"].rstrip("/") + "/"
    if layer == "shared":
        if "/" not in rel[len(base_shared):]:
            if posixpath.basename(rel) not in ("index.ts", "README.md"):
                return [Finding("folder-layout", sev, rel, 0,
                                f"in {base_shared} solo le sottocartelle {', '.join(cfg['shared_dirs'])}")]
            return []
        if sub not in cfg["shared_dirs"]:
            return [Finding("folder-layout", sev, rel, 0,
                            f"'{sub}' non è una sottocartella prevista di shared ({', '.join(cfg['shared_dirs'])}): proponi la nuova cartella all'utente")]
    if layer == "features":
        name = sub or ""
        if name and not re.fullmatch(r"[a-z][a-z0-9]*(-[a-z0-9]+)*", name):
            return [Finding("folder-layout", sev, rel, 0, f"nome di feature '{name}' non kebab-case")]
        rest = rel[len(base_feat) + len(name) + 1:]
        entry = rest.split("/")[0] if rest else ""
        if entry and entry not in FEATURE_ENTRIES:
            return [Finding("folder-layout", sev, rel, 0,
                            f"in una feature sono ammessi solo {', '.join(FEATURE_ENTRIES)} (trovato '{entry}')")]
    return []


# ---------------------------------------------------------------- scansione progetto

def iter_project_files(proj: Path, cfg: dict) -> Iterable[Tuple[str, Path]]:
    root = proj / cfg["src_root"]
    candidates = [root] if root.is_dir() else []
    for c in candidates:
        for dirpath, dirnames, filenames in os.walk(c):
            rel_dir = Path(dirpath).relative_to(proj).as_posix()
            dirnames[:] = [d for d in dirnames if not glob_match(f"{rel_dir}/{d}/x", cfg["exclude"])
                           and d not in ("node_modules", ".git")]
            for fn in filenames:
                rel = f"{rel_dir}/{fn}"
                if glob_match(rel, cfg["exclude"]):
                    continue
                if fn.endswith(SCANNED_EXT):
                    yield rel, Path(dirpath) / fn
    for env in proj.glob(".env*"):
        if env.is_file() and not env.name.endswith(".example"):
            yield env.name, env


DUP_SKIP = re.compile(r"^\s*($|//|/\*|\*|import\s|export\s+\*|[{}()\[\];,]+$|<!--|</?\w+>$)")


def find_duplicates(files: List[Tuple[str, str]], min_lines: int) -> List[Tuple[str, int, str, int]]:
    seen: Dict[int, Tuple[str, int]] = {}
    dups: List[Tuple[str, int, str, int]] = []
    reported = set()
    for rel, text in files:
        norm = [(i + 1, re.sub(r"\s+", " ", ln.strip())) for i, ln in enumerate(text.splitlines())
                if not DUP_SKIP.match(ln)]
        for k in range(len(norm) - min_lines + 1):
            block = "\n".join(x[1] for x in norm[k:k + min_lines])
            h = hash(block)
            if h in seen:
                orel, oline = seen[h]
                if orel == rel and abs(oline - norm[k][0]) < min_lines:
                    continue
                key = (rel, orel)
                if key not in reported:
                    reported.add(key)
                    dups.append((rel, norm[k][0], orel, oline))
            else:
                seen[h] = (rel, norm[k][0])
    return dups
