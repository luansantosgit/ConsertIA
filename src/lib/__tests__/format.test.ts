import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats positive values in BRL', () => {
    const result = formatCurrency(1234.5);
    expect(result).toMatch(/^R\$/);
    expect(result).toContain('1.234,50');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0,00/);
  });

  it('formats negative values', () => {
    const result = formatCurrency(-99.9);
    expect(result).toContain('99,90');
    expect(result).toContain('-');
  });

  it('formats whole numbers with two decimals', () => {
    const result = formatCurrency(100);
    expect(result).toContain('100,00');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date to a non-empty string', () => {
    const result = formatDate('2025-06-15T12:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('2025-06-15T12:00:00Z');
  });

  it('returns raw string on invalid input', () => {
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO date with time', () => {
    const result = formatDateTime('2025-06-15T14:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('2025-06-15T14:30:00Z');
  });

  it('returns raw string on invalid input', () => {
    const result = formatDateTime('garbage');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatRelativeTime', () => {
  it('returns "agora" for a very recent timestamp', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('agora');
  });

  it('returns minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('5 minuto(s) atrás');
  });

  it('returns hours ago', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('3 hora(s) atrás');
  });

  it('returns days ago', () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d.toISOString())).toBe('2 dia(s) atrás');
  });

  it('returns raw string for invalid input', () => {
    expect(formatRelativeTime('invalid')).toBe('invalid');
  });
});
