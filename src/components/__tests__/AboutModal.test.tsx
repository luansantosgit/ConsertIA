import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AboutModal } from '@/components/AboutModal';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/version';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('version', () => {
  it('exposes the app version with a v prefix', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_VERSION_LABEL).toBe(`v${APP_VERSION}`);
  });
});

describe('AboutModal', () => {
  it('shows the current version and app identity', () => {
    render(<AboutModal open onClose={() => {}} />);

    expect(screen.getByText('DeeperIA')).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION_LABEL)).toBeInTheDocument();
  });

  it('closes on Escape and on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(<AboutModal open onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<AboutModal open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
