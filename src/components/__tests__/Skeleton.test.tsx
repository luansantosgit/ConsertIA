import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonTable, SkeletonStats, SkeletonCard } from '@/components/Skeleton';

describe('SkeletonTable', () => {
  it('renders without errors', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('th').length).toBe(5);
    expect(container.querySelectorAll('td').length).toBe(25);
  });
});

describe('SkeletonStats', () => {
  it('renders 4 stat cards', () => {
    const { container } = render(<SkeletonStats />);
    const cards = container.querySelectorAll('.stat-cards > div');
    expect(cards.length).toBe(4);
  });
});

describe('SkeletonCard', () => {
  it('renders without errors', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });
});
