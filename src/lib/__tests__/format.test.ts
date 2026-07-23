import { describe, it, expect } from 'vitest';
import { formatBytes, splitBytes } from '../format';

describe('splitBytes', () => {
  it('keeps sub-kilobyte values in bytes', () => {
    expect(splitBytes(0)).toEqual({ value: '0', unit: 'B' });
    expect(splitBytes(512)).toEqual({ value: '512', unit: 'B' });
    expect(splitBytes(1023)).toEqual({ value: '1023', unit: 'B' });
  });

  it('rounds fractional byte counts instead of printing decimals', () => {
    expect(splitBytes(900.7)).toEqual({ value: '901', unit: 'B' });
  });

  it('steps up one unit per 1024 factor', () => {
    expect(splitBytes(1024)).toEqual({ value: '1', unit: 'KB' });
    expect(splitBytes(1024 ** 2)).toEqual({ value: '1', unit: 'MB' });
    expect(splitBytes(1024 ** 3)).toEqual({ value: '1', unit: 'GB' });
    expect(splitBytes(1024 ** 4)).toEqual({ value: '1', unit: 'TB' });
  });

  it('drops the trailing zero decimal', () => {
    expect(splitBytes(1536)).toEqual({ value: '1.5', unit: 'KB' });
    expect(splitBytes(2 * 1024 ** 2)).toEqual({ value: '2', unit: 'MB' });
  });

  it('caps at terabytes rather than running out of units', () => {
    expect(splitBytes(1024 ** 5)).toEqual({ value: '1024', unit: 'TB' });
  });

  it('clamps negative sizes to zero', () => {
    expect(splitBytes(-1)).toEqual({ value: '0', unit: 'B' });
    expect(splitBytes(-(1024 ** 2))).toEqual({ value: '0', unit: 'B' });
  });

  it('degrades to 0 B on a non-numeric size', () => {
    expect(splitBytes(NaN)).toEqual({ value: '0', unit: 'B' });
  });
});

describe('formatBytes', () => {
  it('joins the value and its unit with a single space', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 ** 3)).toBe('1 GB');
  });
});
