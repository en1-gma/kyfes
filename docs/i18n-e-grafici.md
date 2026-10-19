# i18n e grafici

## Traduzioni

- Ogni testo visibile passa dalla traduzione, compresi `aria-label`, `title`, `placeholder`, `alt`, toast ed errori.
- Un namespace per feature (`orders`) più `common`. I file stanno in `features/<f>/locales/<lingua>.json` e si caricano in lazy quando la feature viene usata.
- Interpolazione e plurali ICU, mai concatenazioni di frammenti tradotti.
- Lingua iniziale: sessione (`locale` di `/api/auth/me`) → `navigator.language` → default di configurazione; `<html lang>` aggiornato al cambio.
- Date, numeri e valute solo con `formatDate`, `formatNumber`, `formatCurrency` di `shared/i18n` (basati su `Intl`).
- Un test verifica che ogni lingua abbia le stesse chiavi, ignorando i suffissi plurali (`_one`, `_other`, …): lingue con regole di plurale diverse hanno forme diverse.

| Framework | Libreria |
|---|---|
| React | i18next + react-i18next |
| Next.js | next-intl |
| Vue | vue-i18n |
| Angular | Transloco |
| SvelteKit | Paraglide JS (compilato, tree-shakable) |

## Grafici

- La libreria di chart si importa solo in `shared/charts`; le feature usano i wrapper (`BarChart`, `LineChart`, …) con tema, palette da variabili CSS, tooltip e assi formattati con `Intl`.
- Accessibilità: `role="img"` con `aria-label`, una descrizione o una tabella alternativa, informazione mai affidata solo al colore.
- I dati arrivano già aggregati da una query della feature (`/orders/stats`); nel componente della feature si formattano solo le etichette con i formatter `Intl`, così seguono il cambio di lingua. I componenti di chart sono caricati in lazy.
- Le librerie di chart (anche wrapper come echarts-for-react, react-chartjs-2, vue-chartjs, `@nivo/*`, d3, highcharts, …) e di i18n (anche react-intl, `@formatjs/*`, `@lingui/*`, svelte-i18n, `@ngx-translate/*`) sono confinate da `library-boundary`.

| Framework | Libreria |
|---|---|
| React, Next.js | Recharts |
| Vue | ECharts con vue-echarts |
| Angular | ECharts con ngx-echarts |
| SvelteKit | ECharts con wrapper Svelte |
