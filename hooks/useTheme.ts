import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      return stored || 'system';
    }
    return 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (t: Theme) => {
      if (t === 'dark' || (t === 'system' && systemQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const listener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    systemQuery.addEventListener('change', listener);
    return () => systemQuery.removeEventListener('change', listener);
  }, [theme]);

  return { theme, setTheme };
};