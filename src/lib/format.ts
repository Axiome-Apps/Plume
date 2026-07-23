/**
 * Single source of byte formatting for the UI.
 *
 * splitBytes keeps the number and its unit apart so a caller can style them
 * separately (the batch KPI shows the figure large and the unit small);
 * formatBytes is the inline form used in lists.
 */

export type ByteUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';

const UNITS: ByteUnit[] = ['B', 'KB', 'MB', 'GB', 'TB'];
const STEP = 1024;

export interface FormattedBytes {
  value: string;
  unit: ByteUnit;
}

export function splitBytes(bytes: number): FormattedBytes {
  if (!Number.isFinite(bytes) || bytes < STEP) {
    return { value: String(Math.max(0, Math.round(bytes || 0))), unit: 'B' };
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(STEP)), UNITS.length - 1);
  const scaled = bytes / Math.pow(STEP, exponent);

  // Drop a trailing .0 so 1024 reads as "1 KB" rather than "1.0 KB".
  return { value: String(parseFloat(scaled.toFixed(1))), unit: UNITS[exponent] };
}

export function formatBytes(bytes: number): string {
  const { value, unit } = splitBytes(bytes);
  return `${value} ${unit}`;
}
