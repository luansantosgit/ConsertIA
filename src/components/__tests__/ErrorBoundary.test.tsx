import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

function ThrowingChild() {
  throw new Error('Test error');
  return null;
}

function ThrowingChunkChild() {
  throw new TypeError(
    'Failed to fetch dynamically imported module: https://deeperia.com.br/assets/Attendance-abc.js'
  );
  return null;
}

function GoodChild() {
  return <div>child content</div>;
}

describe('ErrorBoundary', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('renders children normally', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('child content')).toBeTruthy();
  });

  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(screen.getByText('Test error')).toBeTruthy();
  });

  it('shows update UI for chunk load errors', () => {
    render(
      <ErrorBoundary>
        <ThrowingChunkChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Nova versão disponível')).toBeTruthy();
    expect(screen.getByText('Atualizar agora')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeTruthy();
  });

  it('retry button resets error state', () => {
    let shouldThrow = true;
    function ConditionalThrower() {
      if (shouldThrow) throw new Error('boom');
      return <div>recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();

    shouldThrow = false;
    const retryBtn = screen.getByText('Tentar novamente');
    retryBtn.click();

    rerender(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );
    expect(screen.getByText('recovered')).toBeTruthy();
  });

  consoleSpy.mockRestore();
});
