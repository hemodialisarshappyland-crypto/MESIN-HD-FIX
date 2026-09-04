import React, { createContext, useContext, useEffect } from 'react';

export type AppTheme = 'blue';

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  iconColor: string;
  bgPreview: string;
  isDark: boolean;
  accentClass: string;
  primaryGradient: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'blue',
    name: 'Hospital Medical Clear',
    tagline: 'Tema Medis Berkontras Tinggi & Mudah Dilihat',
    iconColor: '#0284c7',
    bgPreview: 'from-blue-600 to-indigo-600',
    isDark: false,
    accentClass: 'text-blue-600',
    primaryGradient: 'from-blue-600 to-indigo-600',
  },
];

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  currentThemeConfig: ThemeOption;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Permanently remove dark mode and custom theme overrides for high legibility
    try {
      localStorage.removeItem('hemo_theme_v1');
    } catch {
      // ignore
    }
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-blue', 'theme-emerald', 'theme-dark', 'theme-indigo', 'theme-rose');
    root.classList.add('theme-blue');
  }, []);

  const currentThemeConfig = THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme: 'blue',
        setTheme: () => {},
        toggleTheme: () => {},
        currentThemeConfig,
        isDark: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

