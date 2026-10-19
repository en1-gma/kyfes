const TOKENS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6'];

/**
 * Chart palette read from the CSS design tokens (:root --chart-N).
 * Called only in the client-only chart canvas (DOM available).
 */
export function readChartPalette(): readonly string[] {
  const style = getComputedStyle(document.documentElement);
  return TOKENS.map((token) => style.getPropertyValue(token).trim() || `var(${token})`);
}
