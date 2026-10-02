import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ChatMessage } from './types';

// Estado da busca na conversa: ocorrências, índice ativo e navegação
export function useChatSearch(
  messages: ChatMessage[],
  conversationId: string | undefined,
) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const matchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as string[];
    return messages
      .filter(m => (m.text ?? '').toLowerCase().includes(q))
      .map(m => m.id);
  }, [messages, searchQuery]);

  const matchCount = matchIds.length;
  const safeIndex = matchCount ? Math.min(matchIndex, matchCount - 1) : 0;
  const activeMatchId = matchCount > 0 ? matchIds[safeIndex] : null;

  // Nova busca ou troca de conversa: volta pra primeira ocorrência
  useEffect(() => { setMatchIndex(0); }, [searchQuery, conversationId]);

  const nextMatch = useCallback(
    () => setMatchIndex(i => (matchCount ? (i + 1) % matchCount : 0)),
    [matchCount],
  );
  const prevMatch = useCallback(
    () => setMatchIndex(i => (matchCount ? (i - 1 + matchCount) % matchCount : 0)),
    [matchCount],
  );
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const toggleSearch = useCallback(() => {
    if (searchOpen) closeSearch();
    else setSearchOpen(true);
  }, [searchOpen, closeSearch]);

  return {
    searchOpen, searchQuery, setSearchQuery,
    matchCount, matchIndex: safeIndex, activeMatchId,
    nextMatch, prevMatch, closeSearch, openSearch, toggleSearch,
  };
}
