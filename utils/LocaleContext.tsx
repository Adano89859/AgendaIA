import { createContext, useContext, useEffect, useState } from 'react';
import { i18n, loadSavedLocale, setLocale as saveLocale } from './i18n';

type LocaleContextType = {
  locale: string;
  changeLocale: (code: string) => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: 'es',
  changeLocale: async () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState(i18n.locale);

  useEffect(() => {
    loadSavedLocale().then(() => setLocale(i18n.locale));
  }, []);

  const changeLocale = async (code: string) => {
    await saveLocale(code);
    setLocale(code);
  };

  const t = (key: string, params?: Record<string, unknown>) => i18n.t(key, params);

  return (
    <LocaleContext.Provider value={{ locale, changeLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}