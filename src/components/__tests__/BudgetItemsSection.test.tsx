import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BudgetItemsSection } from '@/components/BudgetItemsSection';

const items = [
  { name: 'Tela iphone 12', value: 550 },
  { name: 'Troca de display', value: 100 },
];

describe('BudgetItemsSection (modo dark)', () => {
  it('usa o token --bg-secondary na linha alternada (sem cor fixa clara)', () => {
    const { container } = render(
      <BudgetItemsSection items={items} onChange={() => {}} />
    );

    const row = container.querySelector('[style*="--bg-secondary"]');
    expect(row).not.toBeNull();

    const style = row!.getAttribute('style') || '';
    expect(style).toContain('var(--bg-secondary)');
    // cor fixa clara (ex.: #f8fafc) quebraria o modo dark (issue #104)
    expect(style).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it('mantém o total do orçamento', () => {
    const { container } = render(
      <BudgetItemsSection items={items} onChange={() => {}} />
    );

    expect(container.textContent).toContain('R$650,00');
  });
});
