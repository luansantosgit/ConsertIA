import { describe, it, expect, vi, beforeEach } from 'vitest';

const connSingle = vi.fn();
const settingsMaybeSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'connections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: connSingle,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: settingsMaybeSingle,
      };
    }),
  },
}));

import { reactToMessage, editMessage, deleteMessageApi, sendTextMessage, sendMediaMessage, downloadMessageMedia } from '../api-alternativa.service';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
  connSingle.mockResolvedValue({ data: { instance_token: 'tok-123' }, error: null });
  settingsMaybeSingle.mockResolvedValue({ data: null, error: null });
});

function lastBody(): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

describe('Uazapi message actions (docs/integrations/uazapi-openapi-spec.yaml)', () => {
  it('reactToMessage sends POST /message/react with {number, text, id} and token header', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'owner:abc', messageid: 'abc', status: 'Pending' }) });

    const result = await reactToMessage('conn-1', '5511999999999', 'MSG123', '👍');

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/message/react');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ token: 'tok-123', 'Content-Type': 'application/json' }),
    }));
    expect(lastBody()).toEqual({ number: '5511999999999', text: '👍', id: 'MSG123' });
  });

  it('reactToMessage fails when instance token is unavailable', async () => {
    connSingle.mockResolvedValueOnce({ data: { instance_token: null }, error: null });

    const result = await reactToMessage('conn-1', '5511999999999', 'MSG123', '👍');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Token nao disponivel.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reactToMessage surfaces API error on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Message not found' }) });

    const result = await reactToMessage('conn-1', '5511999999999', 'MSG123', '👍');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message not found');
  });

  it('editMessage sends POST /message/edit with {id, text}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'owner:abc', messageid: 'abc', content: 'novo texto', status: 'Pending' }) });

    const result = await editMessage('conn-1', 'MSG123', 'Texto editado da mensagem');

    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/message/edit');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(lastBody()).toEqual({ id: 'MSG123', text: 'Texto editado da mensagem' });
  });

  it('editMessage fails when API rejects the edit', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid payload' }) });

    const result = await editMessage('conn-1', 'MSG123', 'x');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid payload');
  });

  it('deleteMessageApi sends POST /message/delete with {id} only', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ timestamp: '2026-01-01T00:00:00Z', id: 'MSG123' }) });

    const result = await deleteMessageApi('conn-1', 'MSG123');

    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/message/delete');
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(lastBody()).toEqual({ id: 'MSG123' });
  });

  it('deleteMessageApi fails when API returns error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'message not found' }) });

    const result = await deleteMessageApi('conn-1', 'MSG123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('message not found');
  });

  it('sendTextMessage includes replyid when quoting a message', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messageid: 'NEW456', status: 'Sent' }) });

    const result = await sendTextMessage('conn-1', '5511999999999', 'resposta', 'MSG123');

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('NEW456');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/send/text');
    expect(lastBody()).toEqual({ number: '5511999999999', text: 'resposta', replyid: 'MSG123' });
  });

  it('sendTextMessage omits replyid when not quoting', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messageid: 'NEW789', status: 'Sent' }) });

    await sendTextMessage('conn-1', '5511999999999', 'oi');

    expect(lastBody()).toEqual({ number: '5511999999999', text: 'oi' });
  });

  it('uses configured uazapi subdomain as base url', async () => {
    settingsMaybeSingle.mockResolvedValueOnce({ data: { admin_api_token: '', uazapi_subdomain: 'api2', webhook_url: '' }, error: null });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'x' }) });

    await reactToMessage('conn-1', '5511999999999', 'MSG123', '❤️');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api2.uazapi.com/message/react');
  });

  it('sendMediaMessage sends POST /send/media with {number, type, file} and optional fields', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messageid: 'MED456', status: 'Sent' }) });

    const result = await sendMediaMessage('conn-1', '5511999999999', 'image', 'aGVsbG8=', {
      caption: 'Veja esta foto',
      docName: 'foto.jpg',
      mimetype: 'image/jpeg',
      replyId: 'MSG123',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('MED456');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/send/media');
    expect(lastBody()).toEqual({
      number: '5511999999999',
      type: 'image',
      file: 'aGVsbG8=',
      text: 'Veja esta foto',
      docName: 'foto.jpg',
      mimetype: 'image/jpeg',
      replyid: 'MSG123',
    });
  });

  it('sendMediaMessage sends minimal body without optional fields', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messageid: 'AUD789', status: 'Sent' }) });

    const result = await sendMediaMessage('conn-1', '5511999999999', 'ptt', 'YXVkaW8=');

    expect(result.success).toBe(true);
    expect(lastBody()).toEqual({ number: '5511999999999', type: 'ptt', file: 'YXVkaW8=' });
  });

  it('sendMediaMessage includes async flag when asyncSend is set', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ messageid: 'VID001', status: 'Queued' }) });

    const result = await sendMediaMessage('conn-1', '5511999999999', 'video', 'https://cdn.exemplo.com/video.mp4', { asyncSend: true });

    expect(result.success).toBe(true);
    expect(lastBody()).toEqual({
      number: '5511999999999',
      type: 'video',
      file: 'https://cdn.exemplo.com/video.mp4',
      async: true,
    });
  });

  it('sendMediaMessage surfaces API error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid payload' }) });

    const result = await sendMediaMessage('conn-1', '5511999999999', 'video', 'eA==');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid payload');
  });

  it('downloadMessageMedia sends POST /message/download with {id, return_link} and returns fileUrl', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ fileURL: 'https://api.exemplo.com/files/foto.jpg', mimetype: 'image/jpeg' }),
    });

    const result = await downloadMessageMedia('conn-1', 'MSG123');

    expect(result.success).toBe(true);
    expect(result.fileUrl).toBe('https://api.exemplo.com/files/foto.jpg');
    expect(result.mimetype).toBe('image/jpeg');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.uazapi.com/message/download');
    expect(lastBody()).toEqual({ id: 'MSG123', return_link: true });
  });

  it('downloadMessageMedia fails when no file is available', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await downloadMessageMedia('conn-1', 'MSG123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Midia nao disponivel.');
  });
});
