import { CHART_PALETTE_TOKENS as TOKENS } from '@/shared/config/constants';

/**
 * Chart palette read from the CSS design tokens (:root --chart-N).
 * Called only in the client-only chart canvas (DOM available).
 */
export function readChartPalette(): readonly string[] {
  const style = getComputedStyle(document.documentElement);
  return TOKENS.map((token) => style.getPropertyValue(token).trim() || `var(${token})`);
}
