export function normalizeMoneyString(raw: string): number {
  const cleaned = raw.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  }
  return Number(cleaned.replace(/[^\d.,]/g, "").replace(",", "."));
}

export function extractMoneyValues(text: string): number[] {
  const values: number[] = [];
  const patterns = [
    /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/gi,
    /\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?\s?(?:reais|real)/gi,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern) ?? [];
    for (const match of matches) {
      const numeric = match.replace(/R\$|reais?/gi, "").trim();
      const value = normalizeMoneyString(numeric);
      if (Number.isFinite(value) && value > 0) values.push(Math.round(value * 100) / 100);
    }
  }
  return values;
}

export function hasInvalidMoney(text: string, allowedValues: Set<number>): boolean {
  if (allowedValues.size === 0) return false;
  const found = extractMoneyValues(text);
  return found.some((value) => !allowedValues.has(value));
}

export function splitMessageParts(text: string): string[] {
  const bySeparator = text
    .split(/\n?\s*-{3,}\s*\n?/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (bySeparator.length > 1) return bySeparator.slice(0, 6);

  const byParagraph = text
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (byParagraph.length > 1) return byParagraph.slice(0, 6);

  const single = text.trim();
  return single ? [single] : [];
}
