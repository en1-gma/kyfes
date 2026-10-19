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
    "dynamic-import": "block",
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
    # altri client HTTP e librerie di server state: stessi confini di axios / TanStack Query
    ("ky", ("api",)),
    ("ofetch", ("api",)),
    ("superagent", ("api",)),
    ("got", ("api",)),
    ("node-fetch", ("api",)),
    ("cross-fetch", ("api",)),
    ("redaxios", ("api",)),
    ("socket.io-client", ("api",)),
    ("graphql-request", ("api",)),
    ("@apollo/client", ("api", "app")),
    ("urql", ("api", "app")),
    ("@urql/", ("api", "app")),
    ("swr", ("api", "feature-api")),
    ("@tanstack/query-core", ("api", "auth", "rbac", "app", "feature-api")),
    # wrapper e altre librerie di grafici
    ("echarts-for-react", ("charts",)),
    ("react-chartjs-2", ("charts",)),
    ("vue-chartjs", ("charts",)),
    ("@nivo/", ("charts",)),
    ("victory", ("charts",)),
    ("apexcharts", ("charts",)),
    ("react-apexcharts", ("charts",)),
    ("vue3-apexcharts", ("charts",)),
    ("highcharts", ("charts",)),
    ("highcharts-react-official", ("charts",)),
    ("d3", ("charts",)),
    ("d3-", ("charts",)),
    ("@visx/", ("charts",)),
    ("plotly.js", ("charts",)),
    ("react-plotly.js", ("charts",)),
    # altre librerie di i18n
    ("react-intl", ("i18n", "app")),
    ("@formatjs/", ("i18n", "app")),
    ("@lingui/", ("i18n", "app")),
    ("svelte-i18n", ("i18n", "app")),
    ("@ngx-translate/", ("i18n", "app")),
    ("vue-i18n-bridge", ("i18n", "app")),
    # altri sanitizer
    ("sanitize-html", ("lib",)),
    ("xss", ("lib",)),
    ("insane", ("lib",)),
    # cookie dal browser: la sessione è un cookie HttpOnly impostato dal server, nessun livello li scrive
    ("js-cookie", ()),
    ("universal-cookie", ()),
    ("react-cookie", ()),
    ("vue-cookies", ()),
    ("ngx-cookie-service", ()),
    ("svelte-cookie", ()),
]

# Moduli il cui nome inizia come un altro (es. "d3-" copre d3-scale, "@nivo/" tutti i pacchetti nivo).
PREFIX_LIBS = {lib for lib, _ in LIBRARY_BOUNDARIES if lib.endswith(("/", "-"))}

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

def nearest_project(start: Path) -> Optional[Path]:
    """Cartella più vicina (start o un suo antenato) che contiene .kyfes/config.json."""
    cur = start.resolve()
    if not cur.is_dir():
        cur = cur.parent
    for d in (cur, *cur.parents):
        if (d / CONFIG_REL).is_file():
            return d
    return None


def find_project_dir(start: Optional[str]) -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("KYFES_PROJECT_DIR")
    if env and (Path(env) / CONFIG_REL).is_file():
        return Path(env).resolve()
    cur = Path(start or os.getcwd()).resolve()
    found = nearest_project(cur)
    if found:
        return found
    return Path(env).resolve() if env else cur


def project_for_file(path: str, cwd: Optional[str]) -> Path:
    """Progetto kyfes di un file: la config più vicina al file (monorepo), altrimenti quella del cwd."""
    p = Path(path)
    if not p.is_absolute():
        p = Path(cwd or os.getcwd()) / p
    # risale dalla cartella del file anche se il file (o le sue cartelle) non esistono ancora
    probe = p.parent
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    return nearest_project(probe) or find_project_dir(cwd)


def discover_projects(root: Path, max_depth: int = 4) -> List[Path]:
    """Progetti kyfes sotto `root` (monorepo aperto nella radice), escluse le dipendenze."""
    found: List[Path] = []
    root = root.resolve()
    for dirpath, dirnames, _ in os.walk(root):
        depth = len(Path(dirpath).relative_to(root).parts)
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".git", "dist", "build", ".next", ".svelte-kit",
                                                        ".angular", "coverage", "tools")] if depth < max_depth else []
        if (Path(dirpath) / CONFIG_REL).is_file():
            found.append(Path(dirpath))
    return found


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


def canonical_rel(rel: str, proj: Path) -> str:
    """Riporta ogni componente già esistente al nome reale su disco.

    Su filesystem case-insensitive (macOS, Windows) `.Kyfes/config.json` e `src/Features/x.tsx` sono gli stessi file di
    `.kyfes/config.json` e `src/features/x.tsx`: le regole devono vederli con il nome vero, non con quello scritto.
    """
    cur = proj
    out: List[str] = []
    parts = [p for p in rel.split("/") if p not in ("", ".")]
    for i, part in enumerate(parts):
        name = part
        try:
            entries = os.listdir(cur) if cur.is_dir() else []
        except OSError:
            entries = []
        if part not in entries:
            matches = [e for e in entries if e.lower() == part.lower()]
            # solo se il filesystem tratta davvero i due nomi come lo stesso file
            if len(matches) == 1 and (cur / part).exists() and os.path.samefile(cur / part, cur / matches[0]):
                name = matches[0]
        out.append(name)
        cur = cur / name
    return "/".join(out)


def rel_to_project(path: str, proj: Path) -> Optional[str]:
    p = Path(path)
    if not p.is_absolute():
        p = proj / p
    try:
        rel = p.resolve().relative_to(proj.resolve()).as_posix()
    except ValueError:
        return None
    return canonical_rel(rel, proj.resolve())


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
    r"""(?:import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?|export\s+(?:type\s+)?[\w*{}\s,$]+\s+from\s+|import\s*\(\s*|require\s*\(\s*)(['"`])((?:(?!\$\{)[^'"`])+)\1""")


def imports_of(text: str) -> List[Tuple[int, str]]:
    out = []
    for m in IMPORT_RE.finditer(text):
        out.append((text.count("\n", 0, m.start()) + 1, m.group(2)))
    return out


def _library_matches(spec: str, lib: str) -> bool:
    if lib in PREFIX_LIBS:
        return spec.startswith(lib) or spec == lib.rstrip("/-")
    return spec == lib or spec.startswith(lib + "/")


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
                if _library_matches(spec, lib):
                    ok = (layer == "shared" and sub in allowed) or (layer == "app" and "app" in allowed) \
                        or (layer == "features" and inner == "api" and "feature-api" in allowed)
                    if not ok:
                        if not allowed:
                            msg = (f"'{spec}' non si usa nel frontend: i cookie (sessione e XSRF) li imposta solo il "
                                   "server, il client HTTP di shared/api li gestisce da solo")
                        else:
                            where = ", ".join(("shared/" + a) if a not in ("app", "feature-api") else
                                              ("features/<f>/api" if a == "feature-api" else "app") for a in allowed)
                            msg = f"'{spec}' si importa solo in {where}: usa il wrapper esposto da lì"
                        findings.append(Finding("library-boundary", rules_cfg["library-boundary"], rel, line, msg))
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

def _regex_can_start(text: str, i: int) -> bool:
    """Un `/` apre un'espressione regolare se segue un operatore o l'inizio dell'espressione (non una divisione)."""
    j = i - 1
    while j >= 0 and text[j] in " \t":
        j -= 1
    if j < 0 or text[j] == "\n":
        return True
    if text[j] in "(,=:[!&|?{};+-*%~^":
        return True
    word = re.search(r"(\w+)$", text[max(0, j - 9):j + 1])
    return bool(word and word.group(1) in ("return", "typeof", "case", "in", "of", "delete", "void", "yield", "await"))


def _regex_end(text: str, i: int) -> int:
    """Indice dopo la chiusura di un literal regex che inizia in `i` (stessa riga), 0 se non è un literal."""
    j, in_class = i + 1, False
    if j < len(text) and text[j] in "/*":
        return 0
    while j < len(text) and text[j] != "\n":
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == "[":
            in_class = True
        elif c == "]":
            in_class = False
        elif c == "/" and not in_class:
            j += 1
            while j < len(text) and text[j].isalpha():
                j += 1
            return j
        j += 1
    return 0


def strip_comments(text: str, markup: bool = False) -> str:
    """Sostituisce i commenti con spazi lasciando intatti stringhe, codice e numeri di riga.

    Un commento all'inizio della riga non nasconde più il codice che lo segue (`/**/ eval(x)`), e un `/*` dentro una
    stringa (`import.meta.glob('./locales/*.json')`) non apre un commento.
    """
    out: List[str] = []
    i, n = 0, len(text)
    state = "code"  # code | line | block | html | ' | " | `
    while i < n:
        c = text[i]
        two = text[i:i + 2]
        if state == "code":
            if two == "//" and (i == 0 or text[i - 1] != ":"):
                state = "line"
                out.append("  ")
                i += 2
                continue
            if two == "/*":
                state = "block"
                out.append("  ")
                i += 2
                continue
            if markup and text.startswith("<!--", i):
                state = "html"
                out.append("    ")
                i += 4
                continue
            if c == "/" and _regex_can_start(text, i):
                end = _regex_end(text, i)
                if end:
                    out.append(text[i:end])
                    i = end
                    continue
            if c in "'\"`":
                state = c
            out.append(c)
        elif state == "line":
            if c == "\n":
                state = "code"
                out.append(c)
            else:
                out.append(" ")
        elif state == "block":
            if two == "*/":
                state = "code"
                out.append("  ")
                i += 2
                continue
            out.append("\n" if c == "\n" else " ")
        elif state == "html":
            if text.startswith("-->", i):
                state = "code"
                out.append("   ")
                i += 3
                continue
            out.append("\n" if c == "\n" else " ")
        else:  # dentro una stringa
            if c == "\\" and i + 1 < n:
                out.append(text[i:i + 2])
                i += 2
                continue
            if c == state or (c == "\n" and state != "`"):
                state = "code"
            out.append(c)
        i += 1
    return "".join(out)


# Parole che rendono "sensibile" una chiave di storage (dopo aver separato camelCase, snake_case, kebab-case).
SENSITIVE_WORDS = {"token", "tokens", "jwt", "jwts", "bearer", "session", "sessionid", "sid", "secret", "secrets",
                   "password", "passwd", "pwd", "credential", "credentials", "apikey", "auth", "oauth", "authorization",
                   "idtoken", "accesstoken", "refreshtoken"}


def _words(fragment: str) -> List[str]:
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", fragment)
    return [w for w in re.split(r"[^a-z0-9]+", spaced.lower()) if w]


def is_sensitive(fragment: str) -> bool:
    words = _words(fragment)
    if any(w in SENSITIVE_WORDS for w in words):
        return True
    return any(a == "api" and b == "key" for a, b in zip(words, words[1:]))


# `.setItem(` su qualsiasi oggetto: copre alias (`const ls = localStorage`), localforage e simili.
STORAGE_CALL = re.compile(r"(?:\.\s*setItem|\b(?:localStorage|sessionStorage)\s*\.\s*getItem)\s*\((?P<args>[^)]*)\)", re.S)
STORAGE_PROP = re.compile(
    r"\b(?:localStorage|sessionStorage)\s*(?:\.\s*(?P<prop>[A-Za-z_$][\w$]*)(?!\s*\()|\[\s*(?P<key>[^\]]+)\])")
STORAGE_METHODS = {"setItem", "getItem", "removeItem", "clear", "key", "length"}


def _token_storage(code: str) -> List[int]:
    """Righe (1-based) in cui token o credenziali finiscono nel Web Storage, anche su più righe o via proprietà."""
    hits = []
    for m in STORAGE_CALL.finditer(code):
        if is_sensitive(m.group("args")):
            hits.append(code.count("\n", 0, m.start()) + 1)
    for m in STORAGE_PROP.finditer(code):
        name = m.group("prop") or m.group("key") or ""
        if m.group("prop") in STORAGE_METHODS:
            continue
        if is_sensitive(name):
            hits.append(code.count("\n", 0, m.start()) + 1)
    return sorted(set(hits))


I18N_KEY = re.compile(r"^[a-z][\w-]*(\.[\w-]+)+$")
PLACEHOLDER = re.compile(r"^(<[^>]*>|\$\{[^}]*\}|x{3,}|\*{3,}|changeme|change-me|replace-?me|your[-_].*|todo)$", re.I)

SECRET_RE = re.compile(
    r"""AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bsk-[A-Za-z0-9_-]{20,}|"""
    r"""\bxox[abprs]-[A-Za-z0-9-]{10,}|"""
    r"""(?P<k>client_secret|api_secret|apiSecret|clientSecret|password|passwd)\s*[:=]\s*['"](?P<val>[^'"\s]{6,})['"]""",
    re.I)


def _secret_hit(line: str) -> bool:
    for m in SECRET_RE.finditer(line):
        val = m.group("val")
        if val is None:
            return True
        # chiave i18n ('validation.required') o segnaposto: non è un segreto
        if not I18N_KEY.match(val) and not PLACEHOLDER.match(val):
            return True
    return False


def _line_rules() -> List[Tuple[str, re.Pattern, str]]:
    """(regola, pattern, messaggio) applicati al codice senza commenti, riga per riga."""
    return [
        ("js-cookie-write",
         re.compile(r"""document\s*(?:\.\s*cookie|\[\s*['"`]cookie['"`]\s*\])\s*=(?!=)|\bcookieStore\s*\.\s*(?:set|delete)\s*\("""),
         "i cookie li imposta il server (HttpOnly, Secure, SameSite): mai document.cookie = …"),
        ("bearer-in-client",
         re.compile(r"""['"`](?:Bearer|Basic|Token)\s|\b(?i:authorization)\b['"`]?\s*[:=](?!=)|"""
                    r"""\[\s*['"`](?i:authorization)['"`]\s*\]\s*=(?!=)|\.\s*(?:set|append)\s*\(\s*['"`](?i:authorization)['"`]"""),
         "il browser non gestisce token: niente header Authorization costruiti nel client, si usa il cookie di sessione"),
        ("insecure-url",
         re.compile(r"""['"`(]\s*(?:http|ws)://(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?=[:/'"`)\s]|$)"""
                    r"""|(?:www\.)?w3\.org(?=[/'"`])|json-schema\.org(?=[/'"`])"""
                    # domini riservati (RFC 2606/6761): non risolvono mai verso un host reale
                    r"""|(?:[\w-]+\.)*example\.(?:com|org|net)(?=[:/'"`)\s]|$)|(?:[\w-]+\.)+(?:test|invalid|example|localhost)(?=[:/'"`)\s]|$)"""
                    r"""|schemas\.(?:xmlsoap\.org|openxmlformats\.org|microsoft\.com)/|xmlns\.com/)""", re.I),
         "solo HTTPS/WSS: nessun URL http:// o ws:// (salvo localhost in sviluppo)"),
        ("raw-html",
         re.compile(r"""dangerouslySetInnerHTML|\bv-html\s*=|\{@html\s|\.(?:inner|outer)HTML\s*=(?!=)|insertAdjacentHTML\s*\("""
                    r"""|document\s*\.\s*write(?:ln)?\s*\(|bypassSecurityTrust\w*\s*\(|createContextualFragment\s*\(|\.srcdoc\s*=(?!=)"""),
         "HTML grezzo vietato: passa il contenuto da sanitizeHtml() importato da shared/lib sulla stessa riga, o rendilo come testo"),
        ("eval",
         re.compile(r"""(?:(?<![\w$.])|(?<=\bwindow\.)|(?<=\bglobalThis\.)|(?<=\bself\.))eval\s*\(|\[\s*['"`]eval['"`]\s*\]"""
                    r"""|(?<![\w$.])(?:new\s+)?Function\s*\(|set(?:Timeout|Interval)\s*\(\s*['"`]"""
                    # eval usato come valore (alias, Reflect.apply, bind/call/apply)
                    r"""|(?:[=(,:?\[]|\breturn)\s*(?:window\.|globalThis\.|self\.)?eval\s*(?:[;,)\]}]|$)|\beval\s*\.\s*(?:bind|call|apply)\b"""
                    # proprietà globali con nome calcolato: window['ev' + 'al'], globalThis[name]
                    r"""|\b(?:window|globalThis|self)\s*\[\s*(?!['"`][\w$]+['"`]\s*\])"""),
         "esecuzione di codice da stringa vietata (eval, Function, setTimeout con stringa)"),
        ("public-env-secret", re.compile(r"""\b(VITE|NEXT_PUBLIC|PUBLIC|NG_APP)_\w*(SECRET|PASSWORD|PRIVATE|TOKEN|API_?KEY|CLIENT_SECRET)\w*"""),
         "una variabile con prefisso pubblico finisce nel bundle: non può contenere segreti o token"),
        ("role-string-check",
         re.compile(r"""\b(role|roles|userRole|user\.role|ruolo)\b\s*(===|!==|==|!=)\s*['"`]|['"`]\s*(===|!==|==|!=)\s*[\w$.?!]*\b(role|userRole|ruolo)\b"""
                    r"""|\broles?\s*\.\s*(includes|indexOf|some|has)\s*\(\s*['"`]|\bisAdmin\b|\bhasRole\s*\("""
                    r"""|\bswitch\s*\(\s*[\w$.?!]*\b(role|roles|userRole|ruolo)\s*\)"""
                    r"""|\.\s*(includes|indexOf|has)\s*\(\s*[\w$.?!]*\b(role|userRole|ruolo)\s*\)"""
                    r"""|\b(role|userRole|ruolo)\s*\.\s*(startsWith|endsWith|match|includes|localeCompare)\s*\(""", re.I),
         "nessun controllo sui nomi dei ruoli: usa can(azione, soggetto) di shared/rbac (permessi CASL dal server)"),
        ("console", re.compile(r"""\bconsole\s*\.\s*(log|debug|trace)\s*\("""),
         "console.log non entra nel codice committato"),
        ("explicit-any", re.compile(r""":\s*any\b(?!\w)|\bas\s+any\b|<any>"""),
         "evita any: deriva i tipi dagli schemi Zod (z.infer) o usa unknown + parse"),
        ("ts-ignore", re.compile(r"@ts-(ignore|nocheck)"),
         "@ts-ignore/@ts-nocheck vietati: correggi il tipo (al più @ts-expect-error con motivazione)"),
    ]


LINE_RULES = _line_rules()
MESSAGES = {
    "token-storage": "token e credenziali non si salvano nel browser: la sessione vive in un cookie HttpOnly/Secure gestito dal server (BFF)",
    "secrets": "segreto in chiaro: nel frontend non esistono segreti, e i valori vanno in un secret manager lato server",
}
HTTP_CALL = re.compile(
    r"""(?:(?<![\w$.])|(?<=\bwindow\.)|(?<=\bglobalThis\.)|(?<=\bself\.))fetch\s*\(|\[\s*['"`]fetch['"`]\s*\]\s*\("""
    r"""|new\s+(?:XMLHttpRequest|WebSocket|EventSource)\s*\(|\bnavigator\s*\.\s*sendBeacon\s*\(|\$\.(?:ajax|getJSON)\s*\("""
    # fetch usato come valore (alias, bind/call/apply)
    r"""|(?:[=(,:?\[]|\breturn)\s*(?:window\.|globalThis\.|self\.)?fetch\s*(?:[;,)\]}]|$)|\bfetch\s*\.\s*(?:bind|call|apply)\b""")
DYNAMIC_IMPORT = re.compile(r"""(?<![\w$.])(?:import|require)\s*\(\s*(?P<arg>[^)\n]*)""")
LOCAL_TEMPLATE = re.compile(r"""^`(?:\.{1,2}/|/|@/|\$lib/|#lib/|~/|@app/|@shared/|@features/)""")


def _dynamic_import_ok(arg: str) -> bool:
    """Import/require con un letterale (controllato dalle regole sugli import) o un template locale (`./locales/${l}.json`)."""
    arg = arg.strip()
    if not arg:
        return True
    if arg[0] in "'\"" and re.match(r"""^(['"])[^'"]*\1\s*(?:,|$)""", arg):
        return True
    if arg[0] == "`":
        return "${" not in arg or bool(LOCAL_TEMPLATE.match(arg))
    return False
BLANK_TARGET = re.compile(r"""target\s*=\s*['"{]?\s*['"]?_blank""")
HARDCODED_TEXT = re.compile(r"""(?<![=\-])>\s*([A-Za-zÀ-ÿ][^<>{}\n]*[A-Za-zÀ-ÿ]{3,}[^<>{}\n]*)\s*<|\b(placeholder|title|aria-label|alt|label)\s*=\s*"([A-Za-zÀ-ÿ][^"{}]*\s[^"{}]*)\"""")
HTML_SHELLS = ("index.html", "app.html")  # documento prima del bootstrap: il titolo tradotto lo imposta l'app
SANITIZE_CALL = re.compile(r"\bsanitizeHtml\s*\(")
SANITIZE_IMPORT = re.compile(r"""import\s*(?:type\s+)?\{[^}]*\bsanitizeHtml\b[^}]*\}\s*from\s*['"][^'"]*shared/lib(?:/[\w.-]+)?['"]""")
SANITIZE_LOCAL = re.compile(r"""(?:function|const|let|var|class)\s+sanitizeHtml\b|\bsanitizeHtml\s*[:=](?!=)|\bas\s+sanitizeHtml\b""")

SECURITY_RULES_IN_TESTS = {"secrets", "public-env-secret", "insecure-url"}


HTTP_URL = re.compile(r"(?:http|ws)://([^/:'\"`)\s]+)", re.I)


def _allowed_http(line: str, cfg: dict) -> bool:
    """Tutti gli URL http/ws della riga puntano a host ammessi in `allowed_http_hosts` (es. un BFF interno in sviluppo)."""
    allowed = {h.lower() for h in cfg.get("allowed_http_hosts") or []}
    hosts = [h.lower() for h in HTTP_URL.findall(line)]
    return bool(allowed) and bool(hosts) and all(h in allowed for h in hosts)


def _sanitizer_ok(rel: str, code: str, cfg: dict) -> bool:
    """sanitizeHtml vale come eccezione solo se è quello di shared/lib, non una funzione omonima del file."""
    layer, sub, _ = layer_of(rel, cfg)
    if layer == "shared" and sub == "lib":
        return True
    return bool(SANITIZE_IMPORT.search(code)) and not SANITIZE_LOCAL.search(code)


def check_content(rel: str, text: str, cfg: dict) -> List[Finding]:
    """Controlli sul codice (commenti esclusi) + import. `text` può essere un frammento o il file intero."""
    if is_env_file(rel):
        return _check_env(rel, text, cfg)
    if not rel.endswith(SCANNED_EXT):
        return []
    rc = cfg["rules"]
    test = is_test(rel)
    server = is_server(rel, cfg)
    layer, sub, _ = layer_of(rel, cfg)
    code = strip_comments(text, markup=rel.endswith(MARKUP_EXT))
    lines = code.splitlines()
    sanitizer_ok = _sanitizer_ok(rel, code, cfg)
    findings: List[Finding] = []

    def add(rule: str, line: int, msg: Optional[str] = None) -> None:
        sev = rc.get(rule, "off")
        if sev != "off":
            findings.append(Finding(rule, sev, rel, line, msg or MESSAGES[rule]))

    if not test:
        for line in _token_storage(code):
            add("token-storage", line)
    for i, line in enumerate(lines, 1):
        if not line.strip():
            continue
        if _secret_hit(line):
            add("secrets", i)
        for rule, pat, msg in LINE_RULES:
            if rc.get(rule, "off") == "off":
                continue
            if test and rule not in SECURITY_RULES_IN_TESTS:
                continue
            if rule == "role-string-check" and layer == "shared" and sub == "rbac":
                continue
            if rule == "bearer-in-client" and server:
                continue
            if rule == "explicit-any" and not rel.endswith((".ts", ".tsx", ".vue", ".svelte", ".mts", ".cts")):
                continue
            if not pat.search(line):
                continue
            if rule == "raw-html" and sanitizer_ok and SANITIZE_CALL.search(line):
                continue
            if rule == "insecure-url" and _allowed_http(line, cfg):
                continue
            add(rule, i, msg)
        if not test and rc.get("dynamic-import", "off") != "off":
            for m in DYNAMIC_IMPORT.finditer(line):
                if not _dynamic_import_ok(m.group("arg")):
                    add("dynamic-import", i, "import/require con un nome calcolato: i confini delle librerie non si "
                                             "possono verificare; usa un import letterale")
                    break
        if not test and not server and rc.get("http-outside-api", "off") != "off" and HTTP_CALL.search(line) \
                and not (layer == "shared" and sub == "api"):
            add("http-outside-api", i,
                "le chiamate HTTP passano solo dal client di shared/api (axios/HttpClient), consumato da TanStack Query nelle feature")
        if not test and rc.get("blank-target", "off") != "off" and BLANK_TARGET.search(line):
            window = " ".join(lines[max(0, i - 3):i + 2])
            if not re.search(r"noopener", window):
                add("blank-target", i, 'target="_blank" richiede rel="noopener noreferrer"')
        if not test and rel.endswith(MARKUP_EXT) and posixpath.basename(rel) not in HTML_SHELLS \
                and rc.get("hardcoded-text", "off") != "off":
            m = HARDCODED_TEXT.search(line)
            if m and not re.search(r"""\bt\(|\$t\(|\bm\.|transloco|\{\{\s*['"]""", line):
                add("hardcoded-text", i, "testo visibile non tradotto: usa la funzione di traduzione di shared/i18n")
    if test:
        findings = [f for f in findings if f.rule in SECURITY_RULES_IN_TESTS]
    findings += check_imports(rel, code, cfg)
    return findings


def is_env_file(rel: str) -> bool:
    name = posixpath.basename(rel)
    return name == ".env" or name.startswith(".env.")


ENV_SECRET = re.compile(
    r"""^\s*(?:export\s+)?(?P<name>\w*?(?:SECRET|PASSWORD|PASSWD|PRIVATE_KEY|PRIVATE|API_?KEY|TOKEN|CREDENTIALS?)[\w]*)"""
    r"""\s*=\s*(?P<val>.*)$""", re.I)


def _check_env(rel: str, text: str, cfg: dict) -> List[Finding]:
    rc = cfg["rules"]
    out = []
    pub = next(p for r, p, _ in LINE_RULES if r == "public-env-secret")
    pub_msg = next(m for r, _, m in LINE_RULES if r == "public-env-secret")
    example = posixpath.basename(rel).endswith((".example", ".sample", ".template"))
    for i, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith("#"):
            continue
        if rc.get("public-env-secret", "off") != "off" and pub.search(line):
            out.append(Finding("public-env-secret", rc["public-env-secret"], rel, i, pub_msg))
            continue
        if rc.get("secrets", "off") == "off":
            continue
        hit = _secret_hit(line)
        m = ENV_SECRET.match(line)
        if m and not example:
            val = m.group("val").split(" #")[0].strip().strip("'\"")
            if len(val) >= 6 and not PLACEHOLDER.match(val) and not val.startswith("${"):
                hit = True
        if hit:
            out.append(Finding("secrets", rc["secrets"], rel, i, MESSAGES["secrets"]))
    return out


# ---------------------------------------------------------------- struttura e file protetti

# (prefisso o file, motivo): confrontati senza distinzione di maiuscole, sui path canonici.
PROTECTED_PATHS: List[Tuple[str, str]] = [
    (".kyfes/", "la configurazione di kyfes la modifica solo l'utente"),
    ("tools/kyfes/", "il kit versionato di kyfes si aggiorna solo con install.sh"),
    (".codex/hooks.json", "gli hook dell'agente li configura solo l'utente"),
    (".codex/config.toml", "la configurazione dell'agente la modifica solo l'utente"),
    (".codex/agents/kyfes_", "gli agenti di kyfes si aggiornano solo con install.sh"),
    (".claude/settings.json", "le impostazioni dell'agente (hook, permessi) le modifica solo l'utente"),
    (".claude/settings.local.json", "le impostazioni dell'agente (hook, permessi) le modifica solo l'utente"),
    (".claude/rules/kyfes/", "le regole di kyfes si aggiornano solo con install.sh"),
    (".agents/skills/kyfes-", "le skill di kyfes si aggiornano solo con install.sh"),
    (".github/workflows/kyfes-check.yml", "il controllo CI di kyfes lo modifica solo l'utente"),
]


def protected_reason(rel: str) -> Optional[str]:
    low = rel.lower()
    for prefix, why in PROTECTED_PATHS:
        if low == prefix.rstrip("/") or low.startswith(prefix):
            return why
    return None


def check_protected(rel: str, cfg: dict) -> List[Finding]:
    sev = cfg["rules"].get("protected-files", "block")
    if sev == "off":
        return []
    why = protected_reason(rel)
    if why:
        return [Finding("protected-files", sev, rel, 0, why)]
    low = "/" + rel.lower()
    if "/generated/" in low or "/paraglide/" in low:
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
