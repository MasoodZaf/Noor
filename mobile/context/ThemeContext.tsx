import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemeId = 'warm' | 'forest' | 'midnight';
export type ThemeMode = ThemeId | 'auto';
export type AccentHue = 'gold' | 'forest' | 'clay' | 'sky';

/** Typography token set — shared across all themes (fonts don't change by mode).
 *  Loaded once in `app/_layout.tsx` via useFonts. When fonts aren't yet ready
 *  the values are still valid font family names — RN will fall back to the
 *  system default while loading, so nothing crashes. */
export const fonts = {
    serif:       'CormorantGaramond_500Medium_Italic',
    serifBold:   'CormorantGaramond_600SemiBold_Italic',
    serifRegular:'CormorantGaramond_400Regular',
    body:        'InterTight_400Regular',
    bodyMedium:  'InterTight_500Medium',
    bodyBold:    'InterTight_600SemiBold',
    mono:        'JetBrainsMono_500Medium',
    monoBold:    'JetBrainsMono_600SemiBold',
    arabic:      'ScheherazadeNew_400Regular',
    arabicBold:  'ScheherazadeNew_600SemiBold',
};

export type AppFonts = typeof fonts;

/** Accent palettes — each has a base + a darker/lighter variant.
 *  Values lifted from the Falah design handoff (Aurmak, Falah Mobile App). */
export const ACCENT_PALETTES: Record<AccentHue, { base: string; deep: string; soft: string; light: string; name: string }> = {
    gold:   { base: '#C9A84C', deep: '#A8823A', soft: '#E8C96A', light: 'rgba(201,168,76,0.14)', name: 'Gold' },
    forest: { base: '#2E7D52', deep: '#1F4E3D', soft: '#5AA37F', light: 'rgba(46,125,82,0.14)',  name: 'Forest' },
    clay:   { base: '#B05A48', deep: '#8C4A3C', soft: '#D38372', light: 'rgba(176,90,72,0.14)',  name: 'Clay' },
    sky:    { base: '#4C7891', deep: '#3A5A6E', soft: '#7FA2B6', light: 'rgba(76,120,145,0.18)', name: 'Sky' },
};

/** Each theme's *default* accent hue — used on first launch before the user
 *  explicitly picks one. Mirrors the Falah prototype's defaults. */
const THEME_DEFAULT_ACCENT: Record<ThemeId, AccentHue> = {
    warm:     'clay',   // Parchment defaults to Clay — matches the design's locked-in default
    forest:   'forest',
    midnight: 'sky',
};

export type AppTheme = {
    id: ThemeId;
    name: string;
    description: string;
    isDark: boolean;
    preview: [string, string, string];

    // Backgrounds
    bg: string;
    bgCard: string;
    bgInput: string;
    bgSecondary: string;
    bgOverlay: string;

    // Text
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;

    // Accents — dynamic based on user's AccentHue pick
    accent: string;
    accentLight: string;
    /** Gold stays fixed per theme (used for Arabic ornaments regardless of accent hue) */
    gold: string;

    // Borders
    border: string;
    borderStrong: string;

    // Tab bar
    tabBg: string;
    tabActive: string;
    tabInactive: string;
    tabBorder: string;

    statusBar: 'light' | 'dark';

    fonts: AppFonts;

    /** Arabic scale multiplier (0.8 – 1.6). Multiply Arabic font sizes by this
     *  so users can bump verse text up/down without changing the rest of the UI. */
    arabicScale: number;

    /** The accent hue the user currently has selected (for the picker UI). */
    accentHue: AccentHue;
};

// ─── Base theme definitions (accent-agnostic) ────────────────────────────────

/** Base palette without accent — accent is layered on top in makeTheme(). */
type BaseTheme = Omit<AppTheme, 'accent' | 'accentLight' | 'tabActive' | 'arabicScale' | 'accentHue'>;

const BASE_WARM_PARCHMENT: BaseTheme = {
    id: 'warm',
    name: 'Parchment',
    description: 'Aged parchment · warm editorial',
    isDark: false,
    preview: ['#F4EEE0', '#B05A48', '#C9A84C'],

    bg: '#F4EEE0',
    bgCard: '#FBF7EC',
    bgInput: 'rgba(19,33,27,0.05)',
    bgSecondary: '#EDE4D1',
    bgOverlay: '#F4EEE0',

    textPrimary: '#13211B',
    textSecondary: '#526058',
    textTertiary: '#8A8F87',
    textInverse: '#FBF7EC',

    gold: '#C9A84C',

    border: 'rgba(19,33,27,0.10)',
    borderStrong: 'rgba(19,33,27,0.16)',

    tabBg: '#FBF7EC',
    tabInactive: '#8A8F87',
    tabBorder: 'rgba(19,33,27,0.06)',

    statusBar: 'dark',
    fonts,
};

const BASE_FOREST_DARK: BaseTheme = {
    id: 'forest',
    name: 'Forest',
    description: 'Deep forest · warm & immersive',
    isDark: true,
    preview: ['#0C100E', '#2E7D52', '#C9A84C'],

    bg: '#0C100E',
    bgCard: '#1A221E',
    bgInput: 'rgba(232,227,211,0.08)',
    bgSecondary: '#141A17',
    bgOverlay: '#1A221E',

    textPrimary: '#E8E3D3',
    textSecondary: '#B4B0A3',
    textTertiary: '#6E6C63',
    textInverse: '#0C100E',

    gold: '#D4AC5C',

    border: 'rgba(232,227,211,0.08)',
    borderStrong: 'rgba(232,227,211,0.14)',

    tabBg: '#141A17',
    tabInactive: '#6E6C63',
    tabBorder: 'rgba(232,227,211,0.05)',

    statusBar: 'light',
    fonts,
};

const BASE_MIDNIGHT_BLUE: BaseTheme = {
    id: 'midnight',
    name: 'Ramaḍān Night',
    description: 'Indigo cosmos · for the night',
    isDark: true,
    preview: ['#070A18', '#4C7891', '#C9A84C'],

    bg: '#070A18',
    bgCard: '#141A33',
    bgInput: 'rgba(232,227,211,0.07)',
    bgSecondary: '#0D1226',
    bgOverlay: '#141A33',

    textPrimary: '#E8E3D3',
    textSecondary: '#A8A5C4',
    textTertiary: '#6F6D8C',
    textInverse: '#070A18',

    gold: '#D4AC5C',

    border: 'rgba(232,227,211,0.08)',
    borderStrong: 'rgba(232,227,211,0.14)',

    tabBg: '#0D1226',
    tabInactive: '#6F6D8C',
    tabBorder: 'rgba(232,227,211,0.05)',

    statusBar: 'light',
    fonts,
};

const BASE_THEMES: Record<ThemeId, BaseTheme> = {
    warm: BASE_WARM_PARCHMENT,
    forest: BASE_FOREST_DARK,
    midnight: BASE_MIDNIGHT_BLUE,
};

/** Compose a full AppTheme from a base + accent hue + arabic scale. */
function makeTheme(id: ThemeId, accentHue: AccentHue, arabicScale: number): AppTheme {
    const base = BASE_THEMES[id];
    const pal = ACCENT_PALETTES[accentHue];
    return {
        ...base,
        accent: pal.base,
        accentLight: pal.light,
        // Dark themes: tab active uses gold (more reverent than any bright accent).
        // Light theme: tab active follows the accent for a splash of colour.
        tabActive: base.isDark ? base.gold : pal.base,
        accentHue,
        arabicScale,
    };
}

// ─── Ready-made exports (used by a few legacy screens that import themes directly) ─
export const WARM_PARCHMENT: AppTheme = makeTheme('warm', 'clay', 1);
export const FOREST_DARK: AppTheme = makeTheme('forest', 'forest', 1);
export const MIDNIGHT_BLUE: AppTheme = makeTheme('midnight', 'sky', 1);
export const WARM_SANDY = WARM_PARCHMENT;
export const DARK_MIDNIGHT = MIDNIGHT_BLUE;

// ─── Auto-mode: resolve a theme from current hour ────────────────────────────
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
    accentHue: AccentHue;
    setAccentHue: (hue: AccentHue) => void;
    arabicScale: number;
    setArabicScale: (scale: number) => void;
    /** @deprecated  Use setThemeMode instead */
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: WARM_PARCHMENT,
    themeMode: 'warm',
    setThemeMode: () => {},
    accentHue: 'clay',
    setAccentHue: () => {},
    arabicScale: 1,
    setArabicScale: () => {},
    toggleTheme: () => {},
});

const STORAGE_KEYS = {
    theme: '@noor/app_theme',
    accent: '@noor/app_accent',
    arabicScale: '@noor/arabic_scale',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('warm');
    const [autoResolved, setAutoResolved] = useState<ThemeId>(resolveAutoTheme());
    // Accent starts null so first resolve can apply the theme's default hue
    const [accentHue, setAccentHueState] = useState<AccentHue | null>(null);
    const [arabicScale, setArabicScaleState] = useState<number>(1);

    // Load persisted settings once
    useEffect(() => {
        (async () => {
            try {
                const t = await AsyncStorage.getItem(STORAGE_KEYS.theme);
                if (t === 'warm' || t === 'forest' || t === 'midnight' || t === 'auto') {
                    setMode(t);
                }
                const a = await AsyncStorage.getItem(STORAGE_KEYS.accent);
                if (a === 'gold' || a === 'forest' || a === 'clay' || a === 'sky') {
                    setAccentHueState(a);
                }
                const s = await AsyncStorage.getItem(STORAGE_KEYS.arabicScale);
                if (s) {
                    const n = parseFloat(s);
                    if (!isNaN(n) && n >= 0.6 && n <= 2.0) setArabicScaleState(n);
                }
            } catch {}
        })();
    }, []);

    // Auto mode tick
    useEffect(() => {
        if (mode !== 'auto') return;
        setAutoResolved(resolveAutoTheme());
        const interval = setInterval(() => setAutoResolved(resolveAutoTheme()), 60_000);
        return () => clearInterval(interval);
    }, [mode]);

    const setThemeMode = (next: ThemeMode) => {
        setMode(next);
        AsyncStorage.setItem(STORAGE_KEYS.theme, next).catch(() => {});
    };

    const setAccentHue = (hue: AccentHue) => {
        setAccentHueState(hue);
        AsyncStorage.setItem(STORAGE_KEYS.accent, hue).catch(() => {});
    };

    const setArabicScale = (scale: number) => {
        const clamped = Math.max(0.8, Math.min(1.6, scale));
        setArabicScaleState(clamped);
        AsyncStorage.setItem(STORAGE_KEYS.arabicScale, String(clamped)).catch(() => {});
    };

    const toggleTheme = () => {
        const order: ThemeMode[] = ['warm', 'forest', 'midnight'];
        // mode may be 'auto' which isn't part of the cycle; treat as warm.
        const cycleMode: ThemeMode = mode === 'auto' ? 'warm' : mode;
        const idx = order.indexOf(cycleMode);
        setThemeMode(order[(idx + 1) % order.length]);
    };

    const resolvedId = mode === 'auto' ? autoResolved : mode;
    // If no explicit accent saved, fall back to the theme's designed default
    const effectiveAccent = accentHue ?? THEME_DEFAULT_ACCENT[resolvedId];
    const theme = makeTheme(resolvedId, effectiveAccent, arabicScale);

    return (
        <ThemeContext.Provider value={{
            theme,
            themeMode: mode,
            setThemeMode,
            accentHue: effectiveAccent,
            setAccentHue,
            arabicScale,
            setArabicScale,
            toggleTheme,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
