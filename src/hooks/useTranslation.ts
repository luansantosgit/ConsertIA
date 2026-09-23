import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useTenantStore } from '@/stores/tenant.store';

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  const { currentLanguage, setLanguage } = useTenantStore();

  const changeLanguage = (language: typeof currentLanguage) => {
    i18n.changeLanguage(language);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', language);
    }
    setLanguage(language);
  };

  return {
    t,
    i18n,
    language: (i18n.language as typeof currentLanguage) || currentLanguage,
    changeLanguage,
  };
}
