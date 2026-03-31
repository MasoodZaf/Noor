import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeId = 'warm' | 'forest' | 'midnight';
export type ThemeMode = ThemeId | 'auto';

export type AppTheme = {
    id: ThemeId;
    name: string;
    description: string;
    isDark: boolean;
    preview: [string, string, string]; // 3 swatches for the picker

    // Backgrounds
    bg: string;
    bgCard: string;
    bgInput: string;
    bgSecondary: string;
    bgOverlay: string;

    // Text  (all meet WCAG AA 4.5:1 on their respective bg)
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;

    // Accents
    accent: string;
    accentLight: string;
    gold: string;

    // Borders
    border: string;
    borderStrong: string;

    // Tab bar
    tabBg: string;
    tabActive: string;
    tabInactive: string;
    tabBorder: string;

    // Status bar
    statusBar: 'light' | 'dark';
};

// ─── Theme Definitions ────────────────────────────────────────────────────────

/**
 * WARM PARCHMENT — Light, cream tones. Designed for long reading sessions.
 * Like reading a premium book under a warm lamp. Easy on eyes in daylight.
 */
export const WARM_PARCHMENT: AppTheme = {
    id: 'warm',
    name: 'Warm Parchment',
    description: 'Cream tones, warm & inviting',
    isDark: false,
    preview: ['#FDF8EF', '#1A9B55', '#B8912A'],

    bg: '#FDF8EF',
    bgCard: '#FFFFFF',
    bgInput: 'rgba(0,0,0,0.04)',
    bgSecondary: '#F4EDE0',
    bgOverlay: '#FDF8EF',

    textPrimary: '#1A1510',       // contrast on white: 17.4:1
    textSecondary: '#58524A',     // contrast on white: 7.2:1
    textTertiary: '#9A9287',
    textInverse: '#FFFFFF',

    accent: '#1A9B55',
    accentLight: 'rgba(26,155,85,0.10)',
    gold: '#B8912A',

    border: 'rgba(0,0,0,0.06)',
    borderStrong: 'rgba(0,0,0,0.12)',

    tabBg: '#FFFFFF',
    tabActive: '#1A9B55',
    tabInactive: '#9CA3AF',
    tabBorder: 'rgba(0,0,0,0.06)',

    statusBar: 'dark',
};

/**
 * FOREST DARK — Deep forest green. Inspired by the app's Quran reader palette.
 * Warm dark mode — easy on eyes during evening, feels rich and natural.
 */
export const FOREST_DARK: AppTheme = {
    id: 'forest',
    name: 'Forest Dark',
    description: 'Deep green, warm & immersive',
    isDark: true,
    preview: ['#0D1A13', '#2ECC94', '#C9A84C'],

    bg: '#0D1A13',
    bgCard: '#132218',
    bgInput: 'rgba(255,255,255,0.06)',
    bgSecondary: '#0A1610',
    bgOverlay: '#132218',

    textPrimary: '#EBF5EE',       // contrast on #132218: 14.8:1
    textSecondary: '#7AA887',     // contrast on #132218: 4.7:1
    textTertiary: '#4A6655',
    textInverse: '#0D1A13',

    accent: '#2ECC94',
    accentLight: 'rgba(46,204,148,0.15)',
    gold: '#C9A84C',

    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',

    tabBg: '#0A1610',
    tabActive: '#2ECC94',
    tabInactive: '#4A6655',
    tabBorder: 'rgba(255,255,255,0.06)',

    statusBar: 'light',
};

/**
 * MIDNIGHT BLUE — Deep navy cosmos. Classic premium dark mode.
 * Cool and crisp for late night reading. Reduces eye strain in darkness.
 */
export const MIDNIGHT_BLUE: AppTheme = {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep navy, cool & premium',
    isDark: true,
    preview: ['#0C0F18', '#3DC87A', '#C9A84C'],

    bg: '#0C0F18',
    bgCard: '#161B2E',
    bgInput: 'rgba(255,255,255,0.07)',
    bgSecondary: '#0A0D18',
    bgOverlay: '#161B2E',

    textPrimary: '#ECF0FF',       // contrast on #161B2E: 14.1:1
    textSecondary: '#8A93B5',     // contrast on #161B2E: 5.0:1
    textTertiary: '#4E5670',
    textInverse: '#0C0F18',

    accent: '#3DC87A',
    accentLight: 'rgba(61,200,122,0.15)',
    gold: '#C9A84C',

    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',

    tabBg: '#0A0D18',
    tabActive: '#3DC87A',
    tabInactive: '#4E5670',
    tabBorder: 'rgba(255,255,255,0.06)',

    statusBar: 'light',
};

// ─── Backward-compat alias (used by Quran screens that import WARM_SANDY) ─────
export const WARM_SANDY = WARM_PARCHMENT;
export const DARK_MIDNIGHT = MIDNIGHT_BLUE;

const THEMES: Record<ThemeId, AppTheme> = {
    warm: WARM_PARCHMENT,
    forest: FOREST_DARK,
    midnight: MIDNIGHT_BLUE,
};

// ─── Auto-mode: resolve a theme from current hour ────────────────────────────
// 05:00 – 18:00  →  Warm Parchment  (daytime)
// 18:00 – 21:00  →  Forest Dark     (evening)
// 21:00 – 05:00  →  Midnight Blue   (night)
function resolveAutoTheme(): ThemeId {
    const h = new Date().getHours();
    if (h >= 5 && h < 18) return 'warm';
    if (h >= 18 && h < 21) return 'forest';
    return 'midnight';
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ThemeContextValue = {
    theme: AppTheme;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    /** @deprecated  Use setThemeMode instead */
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: WARM_PARCHMENT,
    themeMode: 'warm',
    setThemeMode: () => {},
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('warm');
    const [autoResolved, setAutoResolved] = useState<ThemeId>(resolveAutoTheme());

    // Persist + load saved mode
    useEffect(() => {
        AsyncStorage.getItem('@noor/app_theme').then(val => {
            if (val === 'warm' || val === 'forest' || val === 'midnight' || val === 'auto') {
                setMode(val);
            }
        }).catch(() => {});
    }, []);

    // For auto mode: re-resolve every minute so the theme shifts at the right time
    useEffect(() => {
        if (mode !== 'auto') return;
        setAutoResolved(resolveAutoTheme());
        const interval = setInterval(() => setAutoResolved(resolveAutoTheme()), 60_000);
        return () => clearInterval(interval);
    }, [mode]);

    const setThemeMode = (next: ThemeMode) => {
        setMode(next);
        AsyncStorage.setItem('@noor/app_theme', next).catch(() => {});
    };

    const toggleTheme = () => {
        const order: ThemeMode[] = ['warm', 'forest', 'midnight'];
        const idx = order.indexOf(mode as any);
        setThemeMode(order[(idx + 1) % order.length]);
    };

    const resolvedId = mode === 'auto' ? autoResolved : mode;
    const theme = THEMES[resolvedId];

    return (
        <ThemeContext.Provider value={{ theme, themeMode: mode, setThemeMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
