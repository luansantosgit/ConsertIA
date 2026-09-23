import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface TenantTheme {
  tenantId: string;
  primaryColor: string;
  primaryDark: string;
  logoUrl: string | null;
  logoType: 'icon' | 'full'; // 'icon' = só ícone sem fundo | 'full' = logo completo (esconde nome)
  logoText: string;
  faviconUrl: string | null;
  sidebarDark: boolean;
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
}

const DEFAULT_THEME: Omit<TenantTheme, 'tenantId'> = {
  primaryColor: '#4f46e5',
  primaryDark: '#4338ca',
  logoUrl: null,
  logoType: 'icon',
  logoText: 'ConsertIA',
  faviconUrl: null,
  sidebarDark: false,
};

// Aplica as variáveis CSS dinamicamente no :root
function applyCSS(theme: Omit<TenantTheme, 'tenantId'>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primaryColor);
  root.style.setProperty('--primary-dark', theme.primaryDark);

  // Titulo da aba respeita o nome configurado pelo superadmin
  document.title = `${theme.logoText || 'ConsertIA'} - CRM + IA para Assistência Técnica`;

  // Gera variações automáticas da cor primária
  root.style.setProperty('--primary-light', theme.primaryColor + '20');
  root.style.setProperty('--primary-ring', theme.primaryColor + '40');

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
    // Gera favicon SVG com a cor primária e sigla
    const initial = (theme.logoText || 'C').charAt(0).toUpperCase();
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
        const logoUrl = tenantTheme?.logoUrl ?? globalTheme.logoUrl;
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
        };
        set({ activeTheme: theme });
        applyCSS(theme);
      },

      reapplyCSS: () => {
        // Apenas re-aplica as variáveis CSS do activeTheme já persistido — sem mudar state
        applyCSS(get().activeTheme);
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
      name: 'consertia-theme',
    }
  )
);
