import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * localStorage à prova de cota: estourou 5MB (logos base64, sessões grandes)
 * NUNCA mais derruba a aplicação — apenas avisa e segue com o estado em memória.
 * Sem isso, o persist do zustand lança QuotaExceededError dentro de set()
 * e quebra o fluxo inteiro (applyTheme/loadGlobalTheme).
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn(`[storage] "${name}" não persistido (cota excedida). O estado segue válido em memória nesta aba.`, err);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch { /* noop */ }
  },
};

export const safeJSONStorage = createJSONStorage(() => safeLocalStorage);
