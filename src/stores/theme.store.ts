import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { safeJSONStorage } from '@/lib/safe-storage';

export interface TenantTheme {
  tenantId: string;
  primaryColor: string;
  primaryDark: string;
  logoUrl: string | null;
  logoType: 'icon' | 'full'; // 'icon' = só ícone sem fundo | 'full' = logo completo (esconde nome)
  logoText: string;
  faviconUrl: string | null;
  sidebarDark: boolean;
  /** Logo dedicada ao modo escuro (parte interna do sistema) */
  darkLogoUrl: string | null;
  /** Ativo = usa logo separada por modo; inativo = logo única nos dois modos */
  logoDarkMode: boolean;
}

interface ThemeState {
  // Tema global (superadmin) e temas por tenant
  globalTheme: Omit<TenantTheme, 'tenantId'>;
  tenantThemes: Record<string, TenantTheme>;
  activeTheme: Omit<TenantTheme, 'tenantId'>;
  lastTenantId: string | null; // persiste o último tenant para o login

  setGlobalTheme: (patch: Partial<Omit<TenantTheme, 'tenantId'>>) => void;
  setTenantTheme: (tenantId: string, patch: Partial<TenantTheme>) => void;
  applyTheme: (tenantId?: string) => void;
  reapplyCSS: () => void; // re-aplica CSS do activeTheme persistido sem resetar state
  loadTenantTheme: (tenantId: string) => Promise<void>;
  loadGlobalTheme: () => Promise<void>;
}

const DEFAULT_THEME: Omit<TenantTheme, 'tenantId'> = {
  primaryColor: '#4f46e5',
  primaryDark: '#4338ca',
  logoUrl: null,
  logoType: 'icon',
  logoText: 'DeeperIA',
  faviconUrl: null,
  sidebarDark: false,
  darkLogoUrl: null,
  logoDarkMode: false,
};

// Mistura a cor com branco (amount 0-1) — usado para clarear
// a cor primária quando exibida como TEXTO no modo escuro
function lightenHex(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Aplica as variáveis CSS dinamicamente no :root.
// `systemName` é o nome do SISTEMA (tema global) — título da aba e favicon
// gerado NUNCA usam o nome da empresa/tenant.
function applyCSS(theme: Omit<TenantTheme, 'tenantId'>, systemName: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primaryColor);
  root.style.setProperty('--primary-dark', theme.primaryDark);

  // Titulo da aba = nome do sistema (sempre), mesmo com tema do tenant ativo
  document.title = `${systemName || 'DeeperIA'} - CRM + IA para Assistência Técnica`;

  // Dark mode: texto/ícones na cor primária precisam de contraste —
  // clareia a marca para uso como COR (var(--primary-text)).
  // Chips (--primary-light) ganham alpha maior para ficarem visíveis.
  const isDark = root.dataset.theme === 'dark';
  root.style.setProperty('--primary-text', isDark ? lightenHex(theme.primaryColor, 0.55) : theme.primaryColor);
  root.style.setProperty('--primary-light', theme.primaryColor + (isDark ? '30' : '20'));
  root.style.setProperty('--primary-ring', theme.primaryColor + (isDark ? '55' : '40'));

  // Favicon dinâmico
  let link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
  if (!link) {
    link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.id = 'dynamic-favicon';
  }

  if (theme.faviconUrl) {
    link.type = theme.faviconUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/x-icon';
    link.href = theme.faviconUrl;
  } else {
    // Gera favicon SVG com a cor primária e a inicial do nome do SISTEMA
    const initial = (systemName || 'D').charAt(0).toUpperCase();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>
      <rect width='32' height='32' rx='8' fill='${encodeURIComponent(theme.primaryColor)}'/>
      <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle'
        font-family='Inter,sans-serif' font-size='18' font-weight='700' fill='white'>
        ${initial}
      </text>
    </svg>`;
    link.type = 'image/svg+xml';
    link.href = `data:image/svg+xml,${svg.replace(/\n\s*/g, ' ')}`;
  }

  // Barra do navegador mobile (PWA) acompanha a marca: primária no claro,
  // fundo do header no escuro — mesmo comportamento visual do app.
  let themeColor = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.setAttribute('content', isDark ? '#13141a' : theme.primaryColor);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      globalTheme: DEFAULT_THEME,
      tenantThemes: {},
      activeTheme: DEFAULT_THEME,
      lastTenantId: null,

      setGlobalTheme: (patch) => {
        const newGlobal = { ...get().globalTheme, ...patch };
        set({ globalTheme: newGlobal });
        get().applyTheme();
      },

      setTenantTheme: (tenantId, patch) => {
        set((s) => ({
          tenantThemes: {
            ...s.tenantThemes,
            [tenantId]: { ...s.tenantThemes[tenantId], ...patch, tenantId },
          },
        }));
      },

      applyTheme: (tenantId?: string) => {
        const { tenantThemes, globalTheme, lastTenantId } = get();
        // Usa o tenantId passado, ou o último tenant salvo, ou cai no global
        const resolvedId = tenantId || lastTenantId || undefined;
        const tenantTheme = resolvedId && tenantThemes[resolvedId] ? tenantThemes[resolvedId] : null;
        const hasTenantLogo = Boolean(tenantTheme?.logoUrl);
        const lightLogoUrl = tenantTheme?.logoUrl ?? globalTheme.logoUrl;

        // Logo por modo: no escuro, a logo dark da PLATAFORMA substitui a logo
        // global (logo de tenant próprio sempre vence). Só afeta a parte
        // interna — login e wizard são sempre claros (escopo .theme-light).
        const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
        const useDarkLogo = !hasTenantLogo
          && isDark
          && globalTheme.logoDarkMode
          && Boolean(globalTheme.darkLogoUrl);
        const logoUrl = useDarkLogo ? globalTheme.darkLogoUrl : lightLogoUrl;
        const logoType = hasTenantLogo
          ? (tenantTheme?.logoType || 'icon')
          : (globalTheme.logoType || 'icon');

        const theme: Omit<TenantTheme, 'tenantId'> = {
          primaryColor: tenantTheme?.primaryColor || globalTheme.primaryColor,
          primaryDark: tenantTheme?.primaryDark || globalTheme.primaryDark,
          logoUrl,
          logoType,
          logoText: tenantTheme?.logoText || globalTheme.logoText,
          faviconUrl: tenantTheme?.faviconUrl ?? globalTheme.faviconUrl,
          sidebarDark: tenantTheme?.sidebarDark ?? globalTheme.sidebarDark,
          darkLogoUrl: globalTheme.darkLogoUrl,
          logoDarkMode: globalTheme.logoDarkMode,
        };
        set({ activeTheme: theme });
        applyCSS(theme, get().globalTheme.logoText);
      },

      reapplyCSS: () => {
        // Apenas re-aplica as variáveis CSS do activeTheme já persistido — sem mudar state
        applyCSS(get().activeTheme, get().globalTheme.logoText);
      },

      loadGlobalTheme: async () => {
        try {
          const { data } = await supabase
            .from('global_settings')
            .select('theme')
            .limit(1)
            .maybeSingle();
          const raw = (data?.theme ?? {}) as Record<string, unknown>;
          if (Object.keys(raw).length > 0) {
            set({
              globalTheme: {
                ...DEFAULT_THEME,
                primaryColor: (raw.primary_color as string) || DEFAULT_THEME.primaryColor,
                primaryDark: (raw.primary_dark as string) || (raw.primary_color as string) || DEFAULT_THEME.primaryDark,
                logoUrl: (raw.logo_url as string) ?? null,
                logoType: (raw.logo_type as 'icon' | 'full') ?? 'icon',
                logoText: (raw.logo_text as string) || DEFAULT_THEME.logoText,
                faviconUrl: (raw.favicon_url as string) ?? null,
                sidebarDark: (raw.sidebar_dark as boolean) ?? false,
                darkLogoUrl: (raw.dark_logo_url as string) ?? null,
                logoDarkMode: (raw.logo_dark_mode as boolean) ?? false,
              },
            });
            get().applyTheme();
          }
        } catch (err) {
          console.error('Failed to load global theme:', err);
        }
      },

      loadTenantTheme: async (tenantId: string) => {
        if (!tenantId) {
          get().applyTheme();
          return;
        }
        try {
          const { data } = await supabase
            .from('tenant_themes')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (data) {
            const hasCustomLogo = Boolean(data.logo_url);
            const logoType = hasCustomLogo
              ? ((data.logo_type as 'icon' | 'full') || 'icon')
              : (get().globalTheme.logoType || (data.logo_type as 'icon' | 'full') || 'icon');

            get().setTenantTheme(tenantId, {
              tenantId,
              primaryColor: data.primary_color || get().globalTheme.primaryColor,
              primaryDark: data.primary_dark || data.primary_color || get().globalTheme.primaryDark,
              logoUrl: data.logo_url ?? get().globalTheme.logoUrl,
              logoType,
              logoText: data.logo_text || get().globalTheme.logoText,
              faviconUrl: data.favicon_url ?? get().globalTheme.faviconUrl,
              sidebarDark: data.sidebar_dark ?? false,
            });
          }
        } catch (err) {
          console.error('Failed to load theme from Supabase:', err);
        } finally {
          // Salva o último tenant e aplica o tema
          set({ lastTenantId: tenantId });
          get().applyTheme(tenantId);
        }
      },
    }),
    {
      name: 'deeperia-theme',
      version: 2,
      storage: safeJSONStorage,
      // Logos (base64, às vezes MBs) NUNCA vão para o localStorage —
      // elas estouram a cota de 5MB. O boot busca do banco via
      // loadGlobalTheme/loadTenantTheme. Aqui persistimos só o que é
      // barato: cores, textos e flags (tema instantâneo no boot).
      partialize: (s) => ({
        globalTheme: { ...s.globalTheme, logoUrl: null, darkLogoUrl: null, faviconUrl: null },
        activeTheme: { ...s.activeTheme, logoUrl: null, darkLogoUrl: null, faviconUrl: null },
        tenantThemes: Object.fromEntries(
          Object.entries(s.tenantThemes).map(([id, t]) => [
            id,
            { ...t, logoUrl: null, darkLogoUrl: null, faviconUrl: null },
          ])
        ),
        lastTenantId: s.lastTenantId,
      }),
      // Payload antigo (v1) carregava logos base64 (MBs) — a migração
      // descarta e devolve o espaço da cota na primeira escrita
      migrate: (persisted: unknown) => {
        const state = persisted as {
          globalTheme?: Record<string, unknown>;
          activeTheme?: Record<string, unknown>;
          tenantThemes?: Record<string, Record<string, unknown>>;
        } | null;
        if (!state) return state as never;
        const strip = (t: Record<string, unknown> | undefined) =>
          t ? { ...t, logoUrl: null, darkLogoUrl: null, faviconUrl: null } : t;
        return {
          ...state,
          globalTheme: strip(state.globalTheme),
          activeTheme: strip(state.activeTheme),
          tenantThemes: state.tenantThemes
            ? Object.fromEntries(Object.entries(state.tenantThemes).map(([id, t]) => [id, strip(t)]))
            : undefined,
        } as never;
      },
    },
  ),
);
