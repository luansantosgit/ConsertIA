import { describe, it, expect } from 'vitest';
import { isChunkLoadError } from '@/lib/chunk-recovery';

describe('isChunkLoadError', () => {
  it('detecta falha de dynamic import do Chrome/Vite', () => {
    const err = new TypeError(
      'Failed to fetch dynamically imported module: https://deeperia.com.br/assets/Attendance-Bm2s9VQ6.js'
    );
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('detecta erro de module script (Safari) e ChunkLoadError (webpack)', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 5 failed'))).toBe(true);
  });

  it('ignora erros comuns de runtime', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('boom')).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
