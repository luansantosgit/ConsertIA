import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { OSRow } from '@/components/OSModal';
import { ConversationRepository } from '@/repositories/conversation.repository';
import { MessageRepository } from '@/repositories/message.repository';
import { CustomerRepository } from '@/repositories/customer.repository';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import type { Message, Conversation } from '@/types';
import type { ChatMessage, ConvRow, ForwardTarget } from './types';
import { toChatMessage } from './types';

const conversationRepo = new ConversationRepository();
const messageRepo = new MessageRepository();
const customerRepo = new CustomerRepository();

/** Pagina da sidebar de atendimento: conversas por fetch (load more on scroll) */
const CONV_PAGE_SIZE = 200;

/** Janela de guard anti-stale da marcacao otimista de leitura (ms) */
const STALE_READ_GUARD_MS = 5000;

/** Mapeia row crua do banco p/ ConvRow da UI */
function toConvRow(c: Conversation): ConvRow {
  return {
    ...c,
    contactName: c.contact_name || c.contact_phone,
    contactAvatar: c.contact_avatar || undefined,
    lastMessage: c.last_message || '',
    deviceInfo: '',
  };
}

/** Guard anti-stale: zera unread de conversa marcada como lida ha poucos segundos */
function applyStaleReadGuard(row: ConvRow, guardMap: Map<string, number>): ConvRow {
  const readAt = guardMap.get(row.id);
  const guarded = readAt !== undefined && Date.now() - readAt < STALE_READ_GUARD_MS;
  return guarded && row.unread_count > 0 ? { ...row, unread_count: 0 } : row;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadChatMedia(file: File, convId: string): Promise<string | null> {
  try {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const safeExt = ext.replace(/[^\w.]/g, '');
    const path = `${convId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    const { error } = await supabase.storage
      .from('chat-media')
      .upload(path, file, { contentType: file.type || undefined });
    if (error) {
      console.error('Storage upload error:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('Failed to upload media:', err);
    return null;
  }
}

/** Ordena mensagens: as confirmadas (com createdAt real) vão por timestamp; otimistas ficam no final */
function sortMessages(msgs: ChatMessage[]): ChatMessage[] {
  return [...msgs].sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0;
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function useAttendance() {
  const [searchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>(conversationIdParam || '');
  const [clientOSMap, setClientOSMap] = useState<Record<string, OSRow[]>>({});
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editForm, setEditForm] = useState({ contactName: '', contact_phone: '', deviceInfo: '', notes: '' });
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [viewingPdfOS, setViewingPdfOS] = useState<OSRow | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvName, setNewConvName] = useState('');
  const [newConvPhone, setNewConvPhone] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<ChatMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [chatFilter, setChatFilter] = useState<'all' | 'chats' | 'groups'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'unread' | 'oldest'>('recent');

  // Espelho de conversations p/ leitura segura dentro de callbacks sem re-render
  const conversationsRef = useRef<ConvRow[]>([]);
  conversationsRef.current = conversations;

  // Protecao anti-stale: conversas marcadas como lidas localmente a menos de
  // 5s nao podem ser rebaixadas para "nao lida" por um fetch em voo (overwritte
  // com dados desatualizados do servidor). Em caso de falha no DB, o badge e retomado.
  const recentlyReadRef = useRef<Map<string, number>>(new Map());


  // Fila FIFO de envio por conversa: garante que mensagens de texto, mídias e cartões
  // sejam processados rigorosamente na sequência cronológica em que foram disparados,
  // impedindo que envios leves (texto) ultrapassem envios pesados (vídeos/arquivos).
  const conversationQueuesRef = useRef<Map<string, Promise<void>>>(new Map());

  const enqueueOutboundTask = useCallback((conversationId: string, task: () => Promise<void>) => {
    const currentQueue = conversationQueuesRef.current.get(conversationId) || Promise.resolve();
    const nextQueue = currentQueue
      .then(async () => {
        await task();
      })
      .catch((err) => {
        console.error(`[Queue ${conversationId}] Error in message task:`, err);
      });

    conversationQueuesRef.current.set(conversationId, nextQueue);
    return nextQueue;
  }, []);

  useEffect(() => {
    if (conversationIdParam) {
      setSelectedId(conversationIdParam);
    }
  }, [conversationIdParam]);

  // Coalescing de fetchs: 1 em voo por vez; chamadas concorrentes (realtime storm)
  // sao agrupadas em um unico refresh trailing em vez de N refetchs completos
  const convFetchInFlightRef = useRef(false);
  const convFetchQueuedRef = useRef(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);

  const loadConversations = useCallback(async (silent = false) => {
    if (convFetchInFlightRef.current) {
      // Ja existe um fetch em andamento: apenas marca que outro e necessario
      if (silent) convFetchQueuedRef.current = true;
      return;
    }
    convFetchInFlightRef.current = true;
    try {
      if (!silent) setLoadingConversations(true);
      // Pagina 1 enxuta (payload so com colunas da sidebar) — aguenta 500/1000+ chats
      const data = await conversationRepo.getForSidebar(CONV_PAGE_SIZE, 0);
      const rows: ConvRow[] = data.map(c => applyStaleReadGuard(toConvRow(c), recentlyReadRef.current));
      setHasMoreConversations(data.length === CONV_PAGE_SIZE);
      setConversations(prev => {
        // Refresh silencioso preserva conversas carregadas via loadMore (alem da pagina 1)
        if (silent && prev.length > CONV_PAGE_SIZE) {
          const fetchedIds = new Set(rows.map(r => r.id));
          const tail = prev.filter(c => !fetchedIds.has(c.id));
          return [...rows, ...tail];
        }
        return rows;
      });
      if (conversationIdParam) {
        const found = rows.find(r => r.id === conversationIdParam);
        if (found) {
          setSelectedId(found.id);
        } else {
          try {
            const fresh = await conversationRepo.getById(conversationIdParam);
            if (fresh) {
              const freshRow = toConvRow(fresh);
              setConversations(prev =>
                prev.some(c => c.id === freshRow.id) ? prev : [freshRow, ...prev]
              );
              setSelectedId(fresh.id);
            }
          } catch (e) {
            console.error('Error fetching target conversation:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (!silent) setError('Erro ao carregar dados');
    } finally {
      convFetchInFlightRef.current = false;
      if (!silent) setLoadingConversations(false);
      // Executa o refresh que chegou durante o fetch em voo — apenas uma vez
      if (convFetchQueuedRef.current) {
        convFetchQueuedRef.current = false;
        setTimeout(() => { void loadConversations(true); }, 100);
      }
    }
  }, [conversationIdParam]);

  /** Carrega a proxima pagina de conversas ao rolar a sidebar ate o fim */
  const loadMoreConversations = useCallback(async () => {
    if (convFetchInFlightRef.current || loadingMoreConversations) return;
    setLoadingMoreConversations(true);
    try {
      const offset = conversationsRef.current.length;
      const data = await conversationRepo.getForSidebar(CONV_PAGE_SIZE, offset);
      setHasMoreConversations(data.length === CONV_PAGE_SIZE);
      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const fresh = data
          .map(c => toConvRow(c))
          .filter(c => !existingIds.has(c.id));
        return [...prev, ...fresh];
      });
    } catch (err) {
      console.error('Failed to load more conversations:', err);
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [loadingMoreConversations]);

  // Refresh debounced p/ bursts de realtime: agrupa N eventos em 1 unico fetch
  // trailing (3s). Combinado com o coalescing in-flight do loadConversations,
  // um pico de mensagens custa exatamente 1 refetch — nao N.
  const refreshTimerRef = useRef<number | null>(null);
  const refreshConversationsSoon = useCallback(() => {
    if (refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void loadConversations(true);
    }, 3000);
  }, [loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);
      const msgs = await messageRepo.getByConversationId(conversationId);
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const mapped = sorted.map(toChatMessage);
      setChatMessages(prev => {
        // Preserva mensagens otimistas ainda nao persistidas (prefixo "msg-")
        const pendingOptimistic = (prev[conversationId] || [])
          .filter(m => m.id.startsWith('msg-') && m.status === 'pending')
          .filter(m => !mapped.some(db => db.id === m.id));
        return { ...prev, [conversationId]: [...mapped, ...pendingOptimistic] };
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    messageRepo.markAllAsRead(selectedId).catch(() => {});

    // Marcacao otimista: zera o balao instantaneamente, sem esperar o DB.
    // Se o update falhar, retoma o contador (rollback).
    const prevUnread = conversationsRef.current.find(c => c.id === selectedId)?.unread_count ?? 0;
    recentlyReadRef.current.set(selectedId, Date.now());
    setConversations(prev => prev.map(c =>
      c.id === selectedId ? { ...c, unread_count: 0 } : c
    ));

    conversationRepo.markAsRead(selectedId)
      .then(() => {
        // Remove o guard apos a janela anti-stale: novos fetchs voltam a confiar no DB
        setTimeout(() => recentlyReadRef.current.delete(selectedId), STALE_READ_GUARD_MS);
      })
      .catch((err) => {
        console.error('Failed to mark conversation as read:', err);
        recentlyReadRef.current.delete(selectedId);
        setConversations(prev => prev.map(c =>
          c.id === selectedId && prevUnread > 0 ? { ...c, unread_count: prevUnread } : c
        ));
      });
  }, [selectedId, loadMessages]);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Carrega as OSs EXISTENTES do lead ao abrir a conversa. Antes so apareciam
  // OSs criadas de dentro do chat; vinculo por customer_id, fallback por telefone.
  useEffect(() => {
    if (!selectedId) return;
    const conv = conversationsRef.current.find(c => c.id === selectedId);
    if (!conv) return;

    let cancelled = false;
    void (async () => {
      try {
        const { ServiceOrderRepository } = await import('@/repositories/service-order.repository');
        const osRepo = new ServiceOrderRepository();

        let customerId = conv.customer_id;
        if (!customerId) {
          const digits = (conv.contact_phone || '').replace(/\D/g, '');
          if (digits) {
            const tail = digits.length > 8 ? digits.slice(-8) : digits;
            const found = await customerRepo.search(tail);
            customerId = found[0]?.id ?? null;
          }
        }

        const orders = customerId ? await osRepo.getByCustomerId(customerId) : [];
        if (!cancelled) {
          setClientOSMap(prev => ({ ...prev, [selectedId]: orders as unknown as OSRow[] }));
        }
      } catch (err) {
        console.error('Failed to load client service orders:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    // Filtro server-side: so recebe eventos do proprio tenant (menos trafego/JS)
    const tenantId = useAuthStore.getState().user?.tenantId ?? '';
    const tenantFilter = tenantId ? `tenant_id=eq.${tenantId}` : undefined;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          ...(tenantFilter ? { filter: tenantFilter } : {}),
        },
          (payload) => {
            const msg = payload.new as Message;
            if (msg.direction === 'outbound') return;
          const chatMsg = toChatMessage(msg);
          const activeId = selectedIdRef.current;

          if (msg.conversation_id === activeId) {
            setChatMessages(prev => {
              const existing = prev[activeId] || [];
              if (existing.some(m => m.id === chatMsg.id)) return prev;
              return { ...prev, [activeId]: [...existing, chatMsg] };
            });
            messageRepo.markAllAsRead(activeId).catch(() => {});
            // Guard anti-stale: o bump do webhook pode chegar em um fetch em voo
            recentlyReadRef.current.set(activeId, Date.now());
            conversationRepo.markAsRead(activeId)
              .then(() => setTimeout(() => recentlyReadRef.current.delete(activeId), STALE_READ_GUARD_MS))
              .catch(() => recentlyReadRef.current.delete(activeId));
          }

          setConversations(prev => {
            const exists = prev.some(c => c.id === msg.conversation_id);
            if (!exists) {
              // Conversa nova (alem da pagina 1 ou recem-criada): refresh debounced
              refreshConversationsSoon();
              return prev;
            }
            return prev.map(c => {
              if (c.id === msg.conversation_id) {
                const isCurrent = msg.conversation_id === activeId;
                const isNewer = !c.last_message_at || new Date(msg.created_at) >= new Date(c.last_message_at);
                return {
                  ...c,
                  lastMessage: isNewer ? chatMsg.text : c.lastMessage,
                  last_message: isNewer ? chatMsg.text : c.last_message,
                  last_message_at: isNewer ? msg.created_at : c.last_message_at,
                  unread_count: isCurrent ? 0 : (c.unread_count || 0) + 1,
                };
              }
              return c;
            });
          });
        }
      )
      .subscribe();

    const convChannel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          ...(tenantFilter ? { filter: tenantFilter } : {}),
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setConversations(prev => prev.filter(c => c.id !== deletedId));
              setChatMessages(prev => {
                const next = { ...prev };
                delete next[deletedId];
                return next;
              });
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Merge local O(1): aplica a row nova direto no estado, sem refetch.
            // Elimina o "refetch storm" de 1 fetch completo por mensagem recebida.
            const row = toConvRow(payload.new as Conversation);
            const guarded = applyStaleReadGuard(row, recentlyReadRef.current);
            setConversations(prev => {
              const idx = prev.findIndex(c => c.id === guarded.id);
              const next = idx === -1
                ? [guarded, ...prev]
                : [...prev.slice(0, idx), guarded, ...prev.slice(idx + 1)];
              // Reordena por recencia (fixados primeiro) — barato p/ ~1000 itens
              return next.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
            });
          } else {
            refreshConversationsSoon();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(convChannel);
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loadConversations, refreshConversationsSoon]);

  // Polling fallback: se o Realtime falhar, atualiza a cada 60s
  // (consumo menor — o Realtime é o caminho primário)
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      loadMessages(selectedId, true);
      loadConversations(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages, loadConversations]);

  const selected = conversations.find(c => c.id === selectedId);
  const currentMessages = selectedId ? (chatMessages[selectedId] || []) : [];
  const currentClientOSList = selectedId ? (clientOSMap[selectedId] || []) : [];

  // Memoizado: re-filtra apenas quando lista/busca/filtro mudam, nao a cada render
  const filtered = useMemo(() => {
    const byRecencyDesc = (a: ConvRow, b: ConvRow) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime();
    const pinnedFirst = (a: ConvRow, b: ConvRow) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1);
    const comparator: (a: ConvRow, b: ConvRow) => number =
      sortBy === 'unread'
        // Nao lidas primeiro, depois mais recentes
        ? (a, b) => pinnedFirst(a, b) ||
            (Number(b.unread_count > 0) - Number(a.unread_count > 0)) ||
            byRecencyDesc(a, b)
        : sortBy === 'oldest'
          ? (a, b) => pinnedFirst(a, b) || -byRecencyDesc(a, b)
          : (a, b) => pinnedFirst(a, b) || byRecencyDesc(a, b);

    return conversations
      .filter(c => {
        if (chatFilter === 'chats' && c.is_group) return false;
        if (chatFilter === 'groups' && !c.is_group) return false;
        return c.contactName.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase()) ||
          c.deviceInfo.toLowerCase().includes(search.toLowerCase());
      })
      .sort(comparator);
  }, [conversations, chatFilter, search, sortBy]);

  const handleSelectConv = useCallback((conv: ConvRow) => {
    setSelectedId(conv.id);
    setSuggestionDismissed(false);
    setIsEditingClient(false);
    // A sidebar usa payload enxuto; ao selecionar, busca a row completa
    // (notes, ai_suggestion...) p/ o painel de detalhes. Preserva o unread local.
    conversationRepo.getById(conv.id)
      .then(full => {
        if (!full) return;
        setConversations(prev => prev.map(c =>
          c.id === full.id ? { ...toConvRow(full), unread_count: c.unread_count } : c
        ));
      })
      .catch(() => {});
  }, []);

  const handleStartEditClient = () => {
    if (!selected) return;
    setEditForm({
      contactName: selected.contactName,
      contact_phone: selected.contact_phone,
      deviceInfo: selected.deviceInfo,
      notes: selected.notes || '',
    });
    setIsEditingClient(true);
  };

  const handleSaveClient = () => {
    if (!selected) return;
    setConversations(prev => prev.map(c => {
      if (c.id === selected.id) {
        return {
          ...c,
          contactName: editForm.contactName || c.contactName,
          contact_name: editForm.contactName || c.contact_name,
          contact_phone: editForm.contact_phone || c.contact_phone,
          deviceInfo: editForm.deviceInfo || c.deviceInfo,
          notes: editForm.notes,
        };
      }
      return c;
    }));
    setIsEditingClient(false);
  };

  const handleSendMessage = async (customText?: string) => {
    if (!selected) return;
    const convId = selected.id;
    const contactPhone = selected.contact_phone;
    const tenantId = selected.tenant_id || '';
    const textToSend = (customText || inputText).trim();
    if (!textToSend) return;
    const replyingTo = quotedMessage;

    const optimisticMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      from: 'attendant',
      text: textToSend,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      replyTo: replyingTo?.id,
    };

    setChatMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), optimisticMsg]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return { ...c, lastMessage: optimisticMsg.text, last_message: optimisticMsg.text, last_message_at: new Date().toISOString() };
      }
      return c;
    }));

    if (!customText) setInputText('');
    setQuotedMessage(null);

    enqueueOutboundTask(convId, async () => {
      try {
        const { data: conn } = await supabase
          .from('connections')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('status', 'connected')
          .limit(1)
          .single();

        let waMessageId: string | undefined;
        let msgStatus: string = 'sent';

        if (conn) {
          const { sendTextMessage } = await import('@/lib/api-alternativa.service');
          const result = await sendTextMessage(conn.id, contactPhone, textToSend, replyingTo?.waMessageId);
          if (result.success) {
            waMessageId = result.messageId;
            msgStatus = result.status || 'sent';
          } else {
            msgStatus = 'error';
            console.error('Failed to send via API:', result.error);
          }
        }

        const saved = await messageRepo.create({
          conversation_id: convId,
          contact_phone: contactPhone,
          content: textToSend,
          direction: 'outbound',
          read: true,
          status: msgStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'error',
          wa_message_id: waMessageId,
          reply_to: replyingTo?.id,
        });

        setChatMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).map(m =>
            m.id === optimisticMsg.id
              ? { ...m, id: saved.id, status: msgStatus as ChatMessage['status'], waMessageId }
              : m
          )
        }));
      } catch (err) {
        console.error('Failed to send message:', err);
        setChatMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).map(m =>
            m.id === optimisticMsg.id ? { ...m, status: 'error' } : m
          )
        }));
      }
    });
  };

  const handleSendOSCardToChat = async (os: OSRow) => {
    if (!selected) return;
    const convId = selected.id;
    const contactPhone = selected.contact_phone;
    const osText = `📄 Ordem de Serviço & Orçamento #${os.id} anexado para visualização e aprovação.`;

    const optimisticMsg: ChatMessage = {
      id: `msg-os-${Date.now()}`,
      from: 'attendant',
      text: osText,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      osCard: {
        osId: os.id,
        equipment: os.equipmentLabel,
        subject: os.subject,
        budget: os.budget_amount,
        status: os.status,
      }
    };

    setChatMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), optimisticMsg]
    }));

    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return { ...c, lastMessage: `OS #${os.id} enviada`, last_message: `OS #${os.id} enviada`, last_message_at: new Date().toISOString() };
      }
      return c;
    }));

    if (viewingPdfOS) setViewingPdfOS(null);

    enqueueOutboundTask(convId, async () => {
      try {
        const saved = await messageRepo.create({
          conversation_id: convId,
          contact_phone: contactPhone,
          content: osText,
          direction: 'outbound',
          read: true,
          status: 'sent',
        });
        setChatMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).map(m =>
            m.id === optimisticMsg.id ? { ...m, id: saved.id, status: 'sent' } : m
          )
        }));
      } catch (err) {
        console.error('Failed to send OS card to chat:', err);
        setChatMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] || []).map(m =>
            m.id === optimisticMsg.id ? { ...m, status: 'error' } : m
          )
        }));
      }
    });
  };

  const handleSaveNewOS = async (newOS: OSRow, sendToChat?: boolean) => {
    if (!selected) return;
    try {
      const { ServiceOrderRepository } = await import('@/repositories/service-order.repository');
      const repo = new ServiceOrderRepository();
      const created = await repo.createFromForm({
        customerId: newOS.customer_id,
        customerName: newOS.customerName,
        subject: newOS.subject,
        description: newOS.description,
        budgetAmount: newOS.budget_amount,
        priority: newOS.priority,
        checklistPhotos: newOS.checklist_photos,
      });

      const row: OSRow = {
        ...created,
        customerName: newOS.customerName,
        equipmentLabel: newOS.equipmentLabel,
        technicianName: newOS.technicianName,
      };

      setClientOSMap(prev => ({
        ...prev,
        [selected.id]: [row, ...(prev[selected.id] || [])]
      }));

      if (sendToChat) {
        handleSendOSCardToChat(row);
      }
    } catch (err) {
      console.error('Failed to save service order:', err);
      setError('Erro ao salvar ordem de serviço');
    }
  };

  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await conversationRepo.delete(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (selectedId === convId) {
        setSelectedId('');
        setChatMessages(prev => {
          const next = { ...prev };
          delete next[convId];
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Erro ao excluir conversa');
    }
  }, [selectedId]);

  const handleNewConversation = useCallback(() => {
    setNewConvName('');
    setNewConvPhone('');
    setShowNewConvModal(true);
  }, []);

  const handleMarkUnread = useCallback(async (convId: string) => {
    try {
      await conversationRepo.markAsUnread(convId);
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, unread_count: 1 } : c
      ));
    } catch (err) {
      console.error('Failed to mark as unread:', err);
    }
  }, []);

  const handleTogglePin = useCallback(async (convId: string) => {
    try {
      const conv = conversations.find(c => c.id === convId);
      const nextPinned = !conv?.pinned;
      await conversationRepo.setPinned(convId, nextPinned);
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, pinned: nextPinned } : c
      ));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }, [conversations]);

  const handleClaimAi = useCallback(async (convId: string) => {
    try {
      const { error: fnError } = await supabase.functions.invoke('ai-agent', {
        body: { conversation_id: convId, action: 'claim' },
      });
      if (fnError) throw fnError;
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, ai_state: 'paused' as const, assigned_to: useAuthStore.getState().user?.id ?? c.assigned_to } : c
      ));
    } catch (err) {
      console.error('Failed to claim AI conversation:', err);
      throw err;
    }
  }, []);

  const handleReleaseAi = useCallback(async (convId: string) => {
    try {
      const { error: fnError } = await supabase.functions.invoke('ai-agent', {
        body: { conversation_id: convId, action: 'release' },
      });
      if (fnError) throw fnError;
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, ai_state: 'attending' as const, assigned_to: undefined } : c
      ));
    } catch (err) {
      console.error('Failed to release AI conversation:', err);
      throw err;
    }
  }, []);

  const handleConfirmNewConversation = useCallback(async () => {
    const name = newConvName.trim();
    const phone = newConvPhone.replace(/\D/g, '');
    if (!name || phone.length < 10) return;

    setCreatingConversation(true);
    try {
      const existing = await conversationRepo.getByContactPhone(phone);
      if (existing) {
        setShowNewConvModal(false);
        setSelectedId(existing.id);
        setCreatingConversation(false);
        return;
      }

      let customerId: string | undefined;
      try {
        const customer = await customerRepo.create({
          name,
          phone,
        });
        customerId = customer.id;
      } catch {
        // customer creation optional
      }

      const created = await conversationRepo.create({
        contact_phone: phone,
        contact_name: name,
        customer_id: customerId,
        status: 'open',
        unread_count: 0,
        last_message_at: new Date().toISOString(),
      });

      const row: ConvRow = {
        ...created,
        contactName: name,
        lastMessage: '',
        deviceInfo: '',
      };

      setConversations(prev => [row, ...prev]);
      setSelectedId(created.id);
      setShowNewConvModal(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Erro ao criar conversa');
    } finally {
      setCreatingConversation(false);
    }
  }, [newConvName, newConvPhone]);

  // ── Acoes de mensagem: reagir, editar, apagar, encaminhar ──
  const getConnectionId = useCallback(async (): Promise<string | undefined> => {
    if (!selected) return undefined;
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('tenant_id', selected.tenant_id || '')
      .eq('status', 'connected')
      .limit(1)
      .single();
    return conn?.id;
  }, [selected]);

  // Busca a foto do lead na Uazapi quando a conversa aberta ainda nao tem avatar
  const avatarAttemptsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ensureAvatar = async () => {
      if (!selected || selected.contactAvatar || avatarAttemptsRef.current.has(selected.id)) return;
      avatarAttemptsRef.current.add(selected.id);
      try {
        const connId = await getConnectionId();
        if (!connId) return;
        const { fetchChatAvatar } = await import('@/lib/api-alternativa.service');
        const result = await fetchChatAvatar(connId, selected.contact_phone);
        if (result.success && result.avatarUrl) {
          await conversationRepo.update(selected.id, { contact_avatar: result.avatarUrl });
          setConversations(prev => prev.map(c =>
            c.id === selected.id
              ? { ...c, contact_avatar: result.avatarUrl, contactAvatar: result.avatarUrl }
              : c
          ));
        }
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
      }
    };
    ensureAvatar();
  }, [selected, getConnectionId]);

  const handleReactToMessage = useCallback(async (messageId: string, emoji: string) => {
    let previousEmoji: string | undefined;
    // 1. Atualização Otimista instantânea na UI (0ms)
    setChatMessages(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(m => {
          if (m.id === messageId) {
            previousEmoji = m.reaction;
            return { ...m, reaction: emoji };
          }
          return m;
        });
      }
      return next;
    });

    try {
      const msg = Object.values(chatMessages).flat().find(m => m.id === messageId);
      const connId = await getConnectionId();
      if (!msg?.waMessageId || !selected || !connId) return;
      const { reactToMessage } = await import('@/lib/api-alternativa.service');
      await reactToMessage(connId, selected.contact_phone, msg.waMessageId, emoji);
      await messageRepo.update(messageId, { reaction: emoji });
    } catch (err) {
      console.error('Failed to react:', err);
      // Rollback se falhar
      setChatMessages(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].map(m => m.id === messageId ? { ...m, reaction: previousEmoji } : m);
        }
        return next;
      });
    }
  }, [chatMessages, selected, getConnectionId]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    let previousText = '';
    let previousEdited: boolean | undefined;
    // 1. Atualização Otimista instantânea na UI (0ms)
    setChatMessages(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(m => {
          if (m.id === messageId) {
            previousText = m.text;
            previousEdited = m.edited;
            return { ...m, text: newText, edited: true };
          }
          return m;
        });
      }
      return next;
    });

    try {
      const msg = Object.values(chatMessages).flat().find(m => m.id === messageId);
      const connId = await getConnectionId();
      if (!msg?.waMessageId || !connId) return;
      const { editMessage } = await import('@/lib/api-alternativa.service');
      await editMessage(connId, msg.waMessageId, newText);
      await messageRepo.update(messageId, { content: newText, edited: true });
    } catch (err) {
      console.error('Failed to edit:', err);
      // Rollback se falhar
      setChatMessages(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].map(m => m.id === messageId ? { ...m, text: previousText, edited: previousEdited } : m);
        }
        return next;
      });
    }
  }, [chatMessages, getConnectionId]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    let previousMsg: ChatMessage | undefined;
    // 1. Atualização Otimista instantânea na UI (0ms)
    setChatMessages(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(m => {
          if (m.id === messageId) {
            previousMsg = m;
            return { ...m, deleted: true, text: '' };
          }
          return m;
        });
      }
      return next;
    });

    try {
      const msg = Object.values(chatMessages).flat().find(m => m.id === messageId);
      const connId = await getConnectionId();
      if (!msg?.waMessageId || !connId) return;
      const { deleteMessageApi } = await import('@/lib/api-alternativa.service');
      await deleteMessageApi(connId, msg.waMessageId);
      await messageRepo.update(messageId, { deleted: true, content: '' });
    } catch (err) {
      console.error('Failed to delete:', err);
      // Rollback se falhar
      if (previousMsg) {
        setChatMessages(prev => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map(m => m.id === messageId ? previousMsg! : m);
          }
          return next;
        });
      }
    }
  }, [chatMessages, getConnectionId]);

  const handleMentionMessage = useCallback((msg: ChatMessage) => {
    setQuotedMessage(msg);
    setForwardingMessage(null);
  }, []);

  const handleCancelQuote = useCallback(() => {
    setQuotedMessage(null);
  }, []);

  const handleForwardMessage = useCallback((msg: ChatMessage) => {
    setForwardingMessage(msg);
  }, []);

  const sendToConversation = useCallback(async (conv: Conversation, text: string) => {
    enqueueOutboundTask(conv.id, async () => {
      const { data: conn } = await supabase
        .from('connections')
        .select('id')
        .eq('tenant_id', conv.tenant_id || '')
        .eq('status', 'connected')
        .limit(1)
        .single();

      let waMessageId: string | undefined;
      let msgStatus: string = 'sent';

      if (conn) {
        const { sendTextMessage } = await import('@/lib/api-alternativa.service');
        const result = await sendTextMessage(conn.id, conv.contact_phone, text);
        if (result.success) {
          waMessageId = result.messageId;
          msgStatus = result.status || 'sent';
        } else {
          msgStatus = 'error';
          console.error('Failed to forward via API:', result.error);
        }
      }

      const saved = await messageRepo.create({
        conversation_id: conv.id,
        contact_phone: conv.contact_phone,
        content: text,
        direction: 'outbound',
        read: true,
        status: msgStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'error',
        wa_message_id: waMessageId,
      });

      const chatMsg = toChatMessage(saved);
      setChatMessages(prev => ({
        ...prev,
        [conv.id]: [...(prev[conv.id] || []), chatMsg],
      }));
      setConversations(prev => prev.map(c =>
        c.id === conv.id
          ? { ...c, lastMessage: text, last_message: text, last_message_at: new Date().toISOString() }
          : c
      ));
    });
  }, [enqueueOutboundTask]);

  // ── Midia: enviar varios arquivos em fila sincronizada (nao bloqueia o chat) ──
  const handleSendMediaFiles = useCallback((files: File[], caption?: string) => {
    if (!selected || files.length === 0) return;
    const convId = selected.id;
    const contactPhone = selected.contact_phone;
    const replyToId = quotedMessage?.id;
    const replyWaId = quotedMessage?.waMessageId;
    setQuotedMessage(null);

    const queue = files.map((file, i) => ({ file, optimisticId: `msg-media-${Date.now()}-${i}` }));

    const toSendType = (mime: string): 'image' | 'video' | 'document' | 'audio' | 'ptt' =>
      mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video'
      : mime.startsWith('audio/') ? 'ptt'
      : 'document';

    const optimisticMsgs: ChatMessage[] = queue.map(({ file, optimisticId }) => {
      const sendType = toSendType(file.type || '');
      const label = sendType === 'image' ? '📷 Imagem' : sendType === 'video' ? '🎥 Vídeo' : sendType === 'ptt' ? '🎤 Mensagem de voz' : '📄 Documento';
      return {
        id: optimisticId,
        from: 'attendant' as const,
        text: caption || label,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'pending' as const,
        mediaType: sendType,
        mediaUrl: URL.createObjectURL(file),
        replyTo: replyToId,
      };
    });

    setChatMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] || []), ...optimisticMsgs],
    }));
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, lastMessage: optimisticMsgs[optimisticMsgs.length - 1].text, last_message: optimisticMsgs[optimisticMsgs.length - 1].text, last_message_at: new Date().toISOString() }
        : c
    ));

    /** Substitui otimista pelo registro real e reordena por createdAt para manter cronologia */
    const replaceOptimistic = (optimisticId: string, patch: Partial<ChatMessage>) => {
      setChatMessages(prev => {
        const updated = (prev[convId] || []).map(m =>
          m.id === optimisticId ? { ...m, ...patch } : m
        );
        return { ...prev, [convId]: sortMessages(updated) };
      });
    };

    // Fila sincronizada em background: respeita a sequência cronológica da conversa.
    // Cada arquivo é processado individualmente para manter a ordem garantida.
    enqueueOutboundTask(convId, async () => {
      const connId = await getConnectionId();
      const { sendMediaMessage } = connId
        ? await import('@/lib/api-alternativa.service')
        : { sendMediaMessage: null };

      for (let i = 0; i < queue.length; i++) {
        const { file: rawFile, optimisticId } = queue[i];
        const optimistic = optimisticMsgs.find(m => m.id === optimisticId)!;

        try {
          const file = rawFile;

          const mime = file.type || '';
          const sendType = toSendType(mime);

          let waMessageId: string | undefined;
          let msgStatus = 'sent';

          // ── Upload para Supabase Storage ───────────────────────────────────
          const publicUrl: string | null = sendMediaMessage
            ? await uploadChatMedia(file, convId)
            : null;

          if (connId && sendMediaMessage) {
            const fileRef = publicUrl || (await fileToBase64(file)).split(',')[1];
            // asyncSend: true apenas para imagens (rápidas); vídeos/docs bloqueiam a fila
            // até a UazAPI confirmar entrega no WhatsApp, garantindo ordem cronológica.
            const asyncSend = sendType === 'image';
            const result = await sendMediaMessage(connId, contactPhone, sendType, fileRef, {
              caption: caption || undefined,
              docName: sendType === 'document' ? file.name : undefined,
              mimetype: mime || undefined,
              replyId: replyWaId,
              asyncSend,
            });
            if (result.success) {
              waMessageId = result.messageId;
              msgStatus = result.status || 'sent';
            } else {
              msgStatus = 'error';
              console.error('Failed to send media via API:', result.error);
            }
          }

          const saved = await messageRepo.create({
            conversation_id: convId,
            contact_phone: contactPhone,
            content: optimistic.text,
            direction: 'outbound',
            read: true,
            status: msgStatus as 'pending' | 'sent' | 'delivered' | 'read' | 'error',
            wa_message_id: waMessageId,
            media_type: sendType,
            media_url: publicUrl || undefined,
            reply_to: replyToId,
          });

          replaceOptimistic(optimisticId, {
            id: saved.id,
            createdAt: saved.created_at,
            status: msgStatus as ChatMessage['status'],
            waMessageId,
            mediaUrl: publicUrl || optimistic.mediaUrl,
          });
        } catch (err) {
          console.error('Failed to send media:', err);
          replaceOptimistic(optimisticId, { status: 'error' });
        }
      }
    });
  }, [selected, quotedMessage, getConnectionId, enqueueOutboundTask]);

  // ── Midia: enviar arquivo unico (clipe do input) ──
  const handleSendMedia = useCallback((file: File, caption?: string) => {
    handleSendMediaFiles([file], caption);
  }, [handleSendMediaFiles]);

  // ── Midia: enviar audio gravado (PTT) ──
  const handleSendAudio = useCallback((blob: Blob) => {
    const file = new File([blob], `audio-${Date.now()}.ogg`, { type: blob.type || 'audio/ogg' });
    handleSendMediaFiles([file]);
  }, [handleSendMediaFiles]);

  // ── Midia: baixa URL da midia recebida sob demanda (Uazapi /message/download) ──
  const mediaFetchAttemptsRef = useRef<Set<string>>(new Set());
  const handleFetchMedia = useCallback(async (messageId: string) => {
    if (mediaFetchAttemptsRef.current.has(messageId)) return;
    mediaFetchAttemptsRef.current.add(messageId);
    try {
      const all = Object.values(chatMessages).flat();
      const msg = all.find(m => m.id === messageId);
      if (!msg?.waMessageId) return;
      const connId = await getConnectionId();
      if (!connId) return;
      const { downloadMessageMedia } = await import('@/lib/api-alternativa.service');
      const result = await downloadMessageMedia(connId, msg.waMessageId);
      if (result.success && result.fileUrl) {
        await messageRepo.update(messageId, { media_url: result.fileUrl });
        setChatMessages(prev => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map(m => m.id === messageId ? { ...m, mediaUrl: result.fileUrl } : m);
          }
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
  }, [chatMessages, getConnectionId]);

  const handleForwardToTarget = useCallback(async (target: ForwardTarget) => {
    const msg = forwardingMessage;
    if (!msg) return;
    try {
      let conv: Conversation | null = null;
      if (target.type === 'conversation') {
        conv = conversations.find(c => c.id === target.id) || await conversationRepo.getById(target.id);
      } else {
        const customer = await customerRepo.getById(target.id);
        const phone = customer?.phone || customer?.mobile;
        if (customer && phone) {
          conv = await conversationRepo.getByContactPhone(phone);
          if (!conv) {
            conv = await conversationRepo.create({
              contact_phone: phone,
              contact_name: customer.name,
              customer_id: customer.id,
              status: 'open',
              unread_count: 0,
              last_message_at: new Date().toISOString(),
            });
            const row: ConvRow = {
              ...conv,
              contactName: conv.contact_name || conv.contact_phone,
              contactAvatar: conv.contact_avatar || undefined,
              lastMessage: '',
              deviceInfo: '',
            };
            setConversations(prev => [row, ...prev]);
          }
        }
      }
      if (conv) await sendToConversation(conv, msg.text);
      setForwardingMessage(null);
    } catch (err) {
      console.error('Failed to forward message:', err);
    }
  }, [conversations, forwardingMessage, sendToConversation]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path === '/atendimento') {
        handleNewConversation();
      }
    };
    window.addEventListener('header-action-click', handler);
    return () => window.removeEventListener('header-action-click', handler);
  }, [handleNewConversation]);

  return {
    conversations,
    selected,
    selectedId,
    currentMessages,
    currentClientOSList,
    filtered,
    hasMoreConversations,
    loadingMoreConversations,
    loadMoreConversations,
    inputText,
    search,
    chatFilter,
    setChatFilter,
    sortBy,
    setSortBy,
    suggestionDismissed,
    isRightPanelOpen,
    isEditingClient,
    editForm,
    isOSModalOpen,
    viewingPdfOS,
    loadingConversations,
    loadingMessages,
    error,
    setSearch,
    setInputText,
    setSuggestionDismissed,
    setIsRightPanelOpen,
    setIsEditingClient,
    setEditForm,
    setIsOSModalOpen,
    setViewingPdfOS,
    handleSelectConv,
    handleStartEditClient,
    handleSaveClient,
    handleSendMessage,
    handleSendOSCardToChat,
    handleSaveNewOS,
    handleNewConversation,
    handleConfirmNewConversation,
    handleDeleteConversation,
    handleMarkUnread,
    handleTogglePin,
    handleClaimAi,
    handleReleaseAi,
    handleReactToMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleForwardMessage,
    handleMentionMessage,
    handleCancelQuote,
    handleForwardToTarget,
    handleSendMedia,
    handleSendMediaFiles,
    handleSendAudio,
    handleFetchMedia,
    quotedMessage,
    forwardingMessage,
    setForwardingMessage,
    showNewConvModal,
    setShowNewConvModal,
    newConvName,
    setNewConvName,
    newConvPhone,
    setNewConvPhone,
    creatingConversation,
    setError,
    loadConversations,
  };
}