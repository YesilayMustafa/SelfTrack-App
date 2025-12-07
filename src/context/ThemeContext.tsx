import React, { createContext, useState, useContext, ReactNode } from 'react';

// --- TEMALARIMIZ ---
export const THEMES = {
  light: {
    type: 'light',
    name: 'Klasik Aydınlık',
    primary: '#4CAF50',
    circleColor: '#4CAF50',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#333333',
    subText: '#666666',
    border: '#eeeeee',
    icon: '#4CAF50'
  },
  dark: {
    type: 'dark',
    name: 'Gece Modu',
    primary: '#81C784',
    circleColor: '#000000',
    background: '#121212',
    card: '#1E1E1E',
    text: '#E0E0E0',
    subText: '#AAAAAA',
    border: '#333333',
    icon: '#81C784'
  },
  ocean: {
    type: 'dark',
    name: 'Okyanus',
    primary: '#00BCD4',
    circleColor: '#00BCD4',
    background: '#006064',
    card: '#00838F',
    text: '#E0F7FA',
    subText: '#B2EBF2',
    border: '#0097A7',
    icon: '#4DD0E1'
  },
  sunset: {
    type: 'dark',
    name: 'Gün Batımı',
    primary: '#FF5722',
    circleColor: '#FF5722',
    background: '#2d130e',
    card: '#3E2723',
    text: '#FFCCBC',
    subText: '#D7CCC8',
    border: '#4E342E',
    icon: '#FFAB91'
  },
  forest: {
    type: 'light',
    name: 'Orman',
    primary: '#2E7D32',
    circleColor: '#2E7D32',
    background: '#E8F5E9',
    card: '#C8E6C9',
    text: '#1B5E20',
    subText: '#388E3C',
    border: '#A5D6A7',
    icon: '#2E7D32'
  }
};

type ThemeType = typeof THEMES.light;

type ThemeContextType = {
  theme: ThemeType;
  changeTheme: (themeKey: keyof typeof THEMES) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {

  const [theme, setTheme] = useState<ThemeType>(THEMES.light);

  const changeTheme = (themeKey: keyof typeof THEMES) => {
    setTheme(THEMES[themeKey]);
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};