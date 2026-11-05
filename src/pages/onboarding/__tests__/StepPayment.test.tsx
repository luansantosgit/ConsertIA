import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { StepPayment } from '../StepPayment';

const mockRepo = vi.hoisted(() => ({
  createPayment: vi.fn(),
  pollPayment: vi.fn(),
  expirePayment: vi.fn(),
  getPix: vi.fn(),
}));

vi.mock('../onboarding.repository', () => ({
  OnboardingRepository: class {
    createPayment = mockRepo.createPayment;
    pollPayment = mockRepo.pollPayment;
    expirePayment = mockRepo.expirePayment;
    getPix = mockRepo.getPix;
  },
}));

/**
 * Issue #99: quando a cobrança falha (ex.: Asaas recusa CPF/CNPJ em falta
 * na ficha), o clique no Pix não pode ficar mudo — erro visível + retry
 * e "Revisar meus dados" voltando à etapa da ficha.
 */
describe('StepPayment — estado de erro da cobrança', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.pollPayment.mockResolvedValue({ paid: false });
    mockRepo.expirePayment.mockResolvedValue({ expires_at: new Date().toISOString() });
    mockRepo.getPix.mockResolvedValue({ encoded_image: null, payload: null });
  });

  afterEach(() => { cleanup(); });

  const renderStep = (onReviseData?: () => void) =>
    render(
      <StepPayment
        token="tok"
        amount={69.9}
        payment={null}
        onPaid={() => {}}
        onReviseData={onReviseData}
      />,
    );

  it('mostra banner com a descricao real do backend (nao fica mudo)', async () => {
    mockRepo.createPayment.mockRejectedValue(
      Object.assign(new Error('asaas_error'), {
        code: 'asaas_error',
        description: 'Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente.',
      }),
    );

    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Pix/i }));

    expect(mockRepo.createPayment).toHaveBeenCalledWith('tok', 'PIX');
    await waitFor(() =>
      expect(screen.getByText(/preencher o CPF ou CNPJ do cliente/)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText('Não foi possível gerar a cobrança.')).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument(),
    );
  });

  it('sem cpf na ficha: mensagem acionavel + botao revisar dados', async () => {
    mockRepo.createPayment.mockRejectedValue(
      Object.assign(new Error('missing_cpf_cnpj'), { code: 'missing_cpf_cnpj' }),
    );
    const onReviseData = vi.fn();

    renderStep(onReviseData);
    fireEvent.click(screen.getByRole('button', { name: /Pix/i }));

    await waitFor(() =>
      expect(screen.getByText(/Revise seus dados/)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Revisar meus dados/i }));
    expect(onReviseData).toHaveBeenCalledTimes(1);
  });

  it('retry apos falha refaz a chamada e mostra o QR quando sai', async () => {
    mockRepo.createPayment
      .mockRejectedValueOnce(Object.assign(new Error('asaas_error'), { code: 'asaas_error', description: 'instabilidade na Asaas' }))
      .mockResolvedValueOnce({
        payment: {
          billing_type: 'PIX',
          amount: 69.9,
          invoice_url: 'u',
          bank_slip_url: null,
          pix_payload: 'codigopix',
        },
        pix_encoded_image: 'aGVp',
      });

    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Pix/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(mockRepo.createPayment).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      const img = document.querySelector('img[alt="QR Code Pix"]');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('data:image/png;base64,aGVp');
    });
  });

  it('quando o pix sai, QR e payload copiavel aparecem', async () => {
    mockRepo.createPayment.mockResolvedValue({
      payment: {
        billing_type: 'PIX',
        amount: 69.9,
        invoice_url: 'u',
        bank_slip_url: null,
        pix_payload: 'codigopix',
      },
      pix_encoded_image: 'aGVp',
    });

    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /Pix/i }));

    await waitFor(() => expect(document.querySelector('img[alt="QR Code Pix"]')).not.toBeNull());
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('codigopix');
  });
});
