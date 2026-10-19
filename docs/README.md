# Documentazione di kyfes

kyfes (Know Your Frontend) è un plugin per Claude Code e Codex che rende sicuri e prevedibili i frontend scritti con agenti AI. Le regole vincolanti sono nella skill [`kyfes-architecture`](../plugins/kyfes/skills/kyfes-architecture/SKILL.md); questa cartella le spiega e motiva.

| Documento | Contenuto |
|---|---|
| [architettura.md](architettura.md) | livelli `app → pages → features → shared`, alberatura, mappatura per framework |
| [sicurezza.md](sicurezza.md) | sessione in cookie HttpOnly via BFF, CSRF, XSS, CSP, segreti, header, protezione dei controlli |
| [dati.md](dati.md) | client HTTP unico, TanStack Query, chiavi, paginazione a cursore, errori |
| [rbac.md](rbac.md) | permessi CASL dal server, CRUD su rotte/pulsanti/colonne/campi, test |
| [i18n-e-grafici.md](i18n-e-grafici.md) | traduzioni per feature, formatter `Intl`, wrapper dei grafici accessibili |
| [controlli.md](controlli.md) | hook (scritture e comandi shell), stop gate, `arch_check`, CI: ogni regola e come correggerla |
| [configurazione.md](configurazione.md) | `.kyfes/config.json` |
| [codex.md](codex.md) | come kyfes funziona in Codex (plugin, skill, agenti, hook) |
| [roadmap.md](roadmap.md) | cosa arriverà |
| [sviluppo.md](sviluppo.md) | come contribuire al kit e verificarlo |
