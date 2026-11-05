import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const TRAINING_VIDEOS = [
  {
    id: 'v1', title: 'Como criar uma OS', description: 'Passo a passo', topic: 'Ordens de Serviço',
    source: 'youtube', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', thumbnail_url: null,
    sort_order: 0, active: true, created_at: '', updated_at: '',
  },
  {
    id: 'v2', title: 'Configurando o agente', description: 'Agente de IA', topic: 'Configurações',
    source: 'storage', url: 'https://sknimzjwpdbcuutxbycq.supabase.co/storage/v1/object/public/training-videos/videos/a.mp4',
    thumbnail_url: null,
    sort_order: 1, active: true, created_at: '', updated_at: '',
  },
];

const mockGetActive = vi.fn();

vi.mock('@/repositories/training-video.repository', () => ({
  TrainingVideoRepository: class {
    getActive = (...args: unknown[]) => mockGetActive(...args);
  },
}));

beforeEach(() => {
  mockGetActive.mockReset();
  mockGetActive.mockResolvedValue(TRAINING_VIDEOS);
});

/** Import diferido (depende do mock acima) e resolve o componente default. */
async function importTraining() {
  const mod = await import('@/pages/Training');
  return mod.default;
}

describe('Training page', () => {
  it('mostra skeleton enquanto carrega', async () => {
    mockGetActive.mockReturnValue(new Promise(() => {}));
    const Training = await importTraining();
    const { container } = render(<Training />);
    await waitFor(() => {
      expect(container.querySelector('.page')).toBeTruthy();
    });
    expect(screen.queryByText('Como criar uma OS')).toBeNull();
  });

  it('renderiza hero e linhas por tópico', async () => {
    const Training = await importTraining();
    render(<Training />);
    await waitFor(() => {
      expect(screen.getAllByText('Como criar uma OS').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getAllByText('Ordens de Serviço').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Configurações').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Configurando o agente')).toBeTruthy();
  });

  it('busca filtra por título e some as linhas', async () => {
    const Training = await importTraining();
    render(<Training />);
    await waitFor(() => {
      expect(screen.getAllByText('Como criar uma OS').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'agente' } });
    await waitFor(() => {
      expect(screen.getByText('Configurando o agente')).toBeTruthy();
    });
    expect(screen.queryByText('Como criar uma OS')).toBeNull();
  });

  it('mostra estado vazio na busca sem resultados', async () => {
    const Training = await importTraining();
    render(<Training />);
    await waitFor(() => {
      expect(screen.getAllByText('Como criar uma OS').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    await waitFor(() => {
      expect(screen.getByText('Nenhum resultado para a busca')).toBeTruthy();
    });
  });

  it('mostra empty state sem vídeos', async () => {
    mockGetActive.mockResolvedValue([]);
    const Training = await importTraining();
    render(<Training />);
    await waitFor(() => {
      expect(screen.getByText('Nenhum treinamento disponível')).toBeTruthy();
    });
  });

  it('abre o player em modal (YouTube com embed)', async () => {
    const Training = await importTraining();
    render(<Training />);
    await waitFor(() => {
      expect(screen.getAllByText('Como criar uma OS').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText('Como criar uma OS')[0]);
    await waitFor(() => {
      const iframe = document.querySelector('iframe');
      expect(iframe).toBeTruthy();
      expect(iframe!.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });
  });
});
