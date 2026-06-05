import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, Pressable, Switch, Modal, FlatList, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme, fonts, ACCENT_PALETTES, type AccentHue } from '../../context/ThemeContext';
import type { ThemeMode } from '../../context/ThemeContext';
import { useNetworkMode } from '../../context/NetworkModeContext';
import { useReciter, RECITERS } from '../../context/ReciterContext';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { language, setLanguage } = useLanguage();
    const {
        theme, themeMode, setThemeMode,
        accentHue, setAccentHue,
        arabicScale, setArabicScale,
    } = useTheme();
    const { isOfflineMode, setOfflineMode } = useNetworkMode();
    const { reciter, setReciter } = useReciter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // ── Madhab (Asr) — stored in the same @prayer_settings key the Home
    //    prayer modal uses, so this picker stays in sync with the calculation. ─
    const [madhab, setMadhabState] = useState<0 | 1>(0); // 0=Standard, 1=Hanafi
    useEffect(() => {
        AsyncStorage.getItem('@prayer_settings').then(raw => {
            if (!raw) return;
            try {
                const s = JSON.parse(raw);
                if (s.school === 0 || s.school === 1) setMadhabState(s.school);
            } catch {}
        }).catch(() => {});
    }, []);
    const setMadhab = (next: 0 | 1) => {
        setMadhabState(next);
        // Merge with existing settings so method is preserved
        AsyncStorage.getItem('@prayer_settings').then(raw => {
            let obj: { method: number; school: number } = { method: -1, school: next };
            if (raw) {
                try { obj = { ...JSON.parse(raw), school: next }; } catch {}
            }
            AsyncStorage.setItem('@prayer_settings', JSON.stringify(obj)).catch(() => {});
        }).catch(() => {});
    };

    // Back chevron: pop the stack if possible, otherwise fall back to Home tab
    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    };

    const LANGUAGES = ['english', 'urdu', 'indonesian', 'french', 'bengali', 'turkish', 'malay'] as const;
    const LANGUAGE_DISPLAY = {
        'english': 'English',
        'urdu': 'Urdu (اردو)',
        'indonesian': 'Indonesian',
        'french': 'Français',
        'bengali': 'Bengali (বাংলা)',
        'turkish': 'Türkçe',
        'malay': 'Malay (Bahasa Melayu)'
    };

    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) { setSession(session); setLoading(false); }
            } catch (e) {
                console.warn('[Noor/Auth] Session check failed:', e);
                if (mounted) setLoading(false);
            }
        })();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setSession(session);
        });

        return () => { mounted = false; subscription.unsubscribe(); };
    }, []);

    type PickerOption = { mode: ThemeMode; label: string; desc: string; swatches: string[]; icon: React.ComponentProps<typeof Feather>['name'] };
    // Swatches mirror the design handoff palette — parchment / forest / indigo.
    const PICKER_OPTIONS: PickerOption[] = [
        { mode: 'auto',     label: 'Auto',           desc: 'Changes with time of day',  swatches: ['#F4EEE0', '#0C100E', '#070A18'], icon: 'clock' },
        { mode: 'warm',     label: 'Parchment',      desc: 'Aged paper · warm editorial', swatches: ['#F4EEE0', '#B05A48', '#C9A84C'], icon: 'sun' },
        { mode: 'forest',   label: 'Forest',         desc: 'Deep forest · immersive',   swatches: ['#0C100E', '#2E7D52', '#D4AC5C'], icon: 'moon' },
        { mode: 'midnight', label: 'Ramaḍān Night',  desc: 'Indigo cosmos · for evenings', swatches: ['#070A18', '#4C7891', '#D4AC5C'], icon: 'star' },
    ];

    // ── Accent hue options — each shows its base colour as a swatch pill ──
    const ACCENT_OPTIONS: { hue: AccentHue; label: string }[] = [
        { hue: 'gold',   label: 'Gold' },
        { hue: 'forest', label: 'Forest' },
        { hue: 'clay',   label: 'Clay' },
        { hue: 'sky',    label: 'Sky' },
    ];

    const ThemePickerSection = () => (
        <View style={{ marginBottom: 30 }}>
            {/* Tweaks — single unified settings section inspired by the Falah design's
                floating panel. Five controls: Theme, Accent, Arabic Scale, Madhab, Reciter.
                Every change writes to AsyncStorage immediately. */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Tweaks</Text>

            {/* ── Theme ── */}
            <Text style={[tweaksStyles.groupLabel, { color: theme.textTertiary }]}>THEME</Text>
            <View style={{ gap: 10, marginBottom: 22 }}>
                {PICKER_OPTIONS.map(opt => {
                    const active = themeMode === opt.mode;
                    return (
                        <Pressable
                            key={opt.mode}
                            onPress={() => setThemeMode(opt.mode as ThemeMode)}
                            style={[
                                themePickerStyles.card,
                                {
                                    backgroundColor: theme.bgCard,
                                    borderColor: active ? theme.accent : theme.border,
                                    borderWidth: active ? 2 : 1,
                                },
                            ]}
                            accessibilityRole="radio"
                            accessibilityLabel={`${opt.label} theme, ${opt.desc}`}
                            accessibilityState={{ selected: active, checked: active }}
                        >
                            <View style={themePickerStyles.cardLeft}>
                                <View style={[themePickerStyles.iconBox, {
                                    backgroundColor: active ? theme.accentLight : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                                }]}>
                                    <Feather name={opt.icon} size={18} color={active ? theme.accent : theme.textSecondary} />
                                </View>
                                <View>
                                    <Text style={[themePickerStyles.label, { color: theme.textPrimary }]}>{opt.label}</Text>
                                    <Text style={[themePickerStyles.desc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                                </View>
                            </View>
                            <View style={themePickerStyles.cardRight}>
                                <View style={themePickerStyles.swatches}>
                                    {opt.swatches.map((c, i) => (
                                        <View key={i} style={[themePickerStyles.swatch, { backgroundColor: c, marginLeft: i > 0 ? -6 : 0 }]} />
                                    ))}
                                </View>
                                <View style={[themePickerStyles.check, {
                                    backgroundColor: active ? theme.accent : 'transparent',
                                    borderColor: active ? theme.accent : theme.border,
                                }]}>
                                    {active && <Feather name="check" size={12} color={theme.textInverse} />}
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Accent ── */}
            <Text style={[tweaksStyles.groupLabel, { color: theme.textTertiary }]}>ACCENT</Text>
            <View style={tweaksStyles.pillRow}>
                {ACCENT_OPTIONS.map(opt => {
                    const on = accentHue === opt.hue;
                    const pal = ACCENT_PALETTES[opt.hue];
                    return (
                        <Pressable
                            key={opt.hue}
                            onPress={() => setAccentHue(opt.hue)}
                            style={[
                                tweaksStyles.pill,
                                {
                                    backgroundColor: on ? pal.base : theme.bgCard,
                                    borderColor: on ? pal.base : theme.border,
                                },
                            ]}
                            accessibilityRole="radio"
                            accessibilityLabel={`Accent ${opt.label}`}
                            accessibilityState={{ selected: on, checked: on }}
                        >
                            {/* Colour dot — a small filled circle showing the hue */}
                            <View style={[tweaksStyles.swatchDot, { backgroundColor: pal.base, borderColor: on ? 'rgba(255,255,255,0.4)' : pal.deep }]} />
                            <Text style={[tweaksStyles.pillText, { color: on ? '#fff' : theme.textPrimary }]}>
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Arabic Scale ── */}
            <View style={{ marginTop: 22 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[tweaksStyles.groupLabel, { color: theme.textTertiary }]}>ARABIC SCALE</Text>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: theme.textPrimary }}>
                        {arabicScale.toFixed(2)}×
                    </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                    Applies to the Quran reader, duas, tafsir & all Arabic text.
                </Text>
                <Slider
                    style={{ width: '100%', height: 36, marginTop: 6 }}
                    minimumValue={0.8}
                    maximumValue={1.6}
                    step={0.05}
                    value={arabicScale}
                    onValueChange={setArabicScale}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={Platform.OS === 'android' ? theme.accent : undefined}
                />
                {/* Live preview — larger sample in a bordered box so the size change is
                    clearly visible as the slider moves (updates live via onValueChange). */}
                <View style={{
                    marginTop: 6, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border, backgroundColor: theme.bgCard,
                    paddingVertical: 14, paddingHorizontal: 16, minHeight: 64, justifyContent: 'center',
                }}>
                    <Text style={{
                        fontFamily: fonts.arabic,
                        fontSize: 32 * arabicScale,
                        color: theme.textPrimary,
                        textAlign: 'center',
                        lineHeight: 50 * arabicScale,
                        includeFontPadding: false,
                    }}>
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </Text>
                </View>
            </View>

            {/* ── Madhab (Asr) ── */}
            <Text style={[tweaksStyles.groupLabel, { color: theme.textTertiary, marginTop: 22 }]}>MADHAB (ASR)</Text>
            <View style={tweaksStyles.pillRow}>
                {([
                    { v: 0 as const, label: 'Standard', desc: 'Shafi\'i · Maliki · Hanbali' },
                    { v: 1 as const, label: 'Hanafi',   desc: 'Later Asr' },
                ]).map(opt => {
                    const on = madhab === opt.v;
                    return (
                        <Pressable
                            key={opt.v}
                            onPress={() => setMadhab(opt.v)}
                            style={[
                                tweaksStyles.pill,
                                {
                                    backgroundColor: on ? theme.accent : theme.bgCard,
                                    borderColor: on ? theme.accent : theme.border,
                                    paddingHorizontal: 18,
                                },
                            ]}
                            accessibilityRole="radio"
                            accessibilityLabel={`Madhab ${opt.label}, ${opt.desc}`}
                            accessibilityState={{ selected: on, checked: on }}
                        >
                            <Text style={[tweaksStyles.pillText, { color: on ? '#fff' : theme.textPrimary }]}>{opt.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Reciter ── */}
            <Text style={[tweaksStyles.groupLabel, { color: theme.textTertiary, marginTop: 22 }]}>RECITER</Text>
            <View style={tweaksStyles.pillRow}>
                {RECITERS.map(r => {
                    const on = reciter.id === r.id;
                    return (
                        <Pressable
                            key={r.id}
                            onPress={() => setReciter(r)}
                            style={[
                                tweaksStyles.pill,
                                {
                                    backgroundColor: on ? theme.accent : theme.bgCard,
                                    borderColor: on ? theme.accent : theme.border,
                                    paddingHorizontal: 14,
                                },
                            ]}
                            accessibilityRole="radio"
                            accessibilityLabel={`Reciter ${r.label}`}
                            accessibilityState={{ selected: on, checked: on }}
                        >
                            <Text style={[tweaksStyles.pillText, { color: on ? '#fff' : theme.textPrimary }]}>{r.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );

    const LanguagePickerModal = () => (
        <Modal visible={showLanguagePicker} transparent animationType="fade" onRequestClose={() => setShowLanguagePicker(false)}>
            <TouchableOpacity
                style={langPickerStyles.overlay}
                activeOpacity={1}
                onPress={() => setShowLanguagePicker(false)}
                accessibilityRole="button"
                accessibilityLabel="Close language picker"
            >
                <View style={[langPickerStyles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[langPickerStyles.sheetTitle, { color: theme.textPrimary }]}>Translation Language</Text>
                    {LANGUAGES.map(lang => (
                        <TouchableOpacity
                            key={lang}
                            style={[langPickerStyles.option, { borderBottomColor: theme.border }]}
                            onPress={() => { setLanguage(lang); setShowLanguagePicker(false); }}
                            accessibilityRole="radio"
                            accessibilityLabel={LANGUAGE_DISPLAY[lang]}
                            accessibilityState={{ selected: language === lang, checked: language === lang }}
                        >
                            <Text style={[langPickerStyles.optionText, { color: theme.textPrimary }]}>{LANGUAGE_DISPLAY[lang]}</Text>
                            {language === lang && <Feather name="check" size={18} color={theme.gold} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.gold} />
            </View>
        );
    }

    // Sign-in was retired — this is the only settings screen users see.
    return (
        <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
                <LanguagePickerModal />
                <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}>
                    <TouchableOpacity
                        onPress={goBack}
                        hitSlop={10}
                        style={{ marginLeft: -6, marginRight: 6, paddingVertical: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
                </View>
                <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
                    {/* Translation Preferences (Always available) */}
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Preferences</Text>
                    <View style={[styles.menuGroup, { backgroundColor: theme.bgCard, borderColor: theme.border, marginBottom: 20 }]}>
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: theme.border }]}
                            onPress={() => setShowLanguagePicker(true)}
                            accessibilityRole="button"
                            accessibilityLabel={`Translation language, currently ${LANGUAGE_DISPLAY[language] || 'English'}`}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.menuIconBox, { backgroundColor: theme.gold + '1A' }]}>
                                    <Feather name="globe" size={18} color={theme.gold} />
                                </View>
                                <View>
                                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Translation Language</Text>
                                    <Text style={[styles.menuItemSubText, { color: theme.textSecondary }]}>Tap to select language</Text>
                                </View>
                            </View>
                            <View style={[styles.badgeContainer, { borderColor: theme.gold + '4D', backgroundColor: theme.gold + '1A' }]}>
                                <Text style={[styles.badgeText, { color: theme.gold }]}>{LANGUAGE_DISPLAY[language] || 'English'}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.menuIconBox, { backgroundColor: isOfflineMode ? theme.bgInput : theme.gold + '1A' }]}>
                                    <Feather name={isOfflineMode ? 'wifi-off' : 'wifi'} size={18} color={isOfflineMode ? theme.textSecondary : theme.gold} />
                                </View>
                                <View>
                                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>
                                        {isOfflineMode ? 'Offline Mode' : 'Online Mode'}
                                    </Text>
                                    <Text style={[styles.menuItemSubText, { color: theme.textSecondary }]}>
                                        {isOfflineMode ? 'Using local data only' : 'Fetching live content & audio'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={isOfflineMode}
                                onValueChange={setOfflineMode}
                                trackColor={{ false: theme.accent + '66', true: theme.bgInput }}
                                thumbColor={isOfflineMode ? theme.textSecondary : theme.gold}
                            />
                        </View>
                    </View>
                    <ThemePickerSection />

                    {/* About & Legal Section */}
                    <View style={{ marginTop: 10 }}>
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>About</Text>
                        <View style={[styles.menuGroup, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: theme.border }]}
                                onPress={() => Alert.alert("About Falah", "Version 1.0.0\n\nA premium Islamic companion app for daily spiritual connection — Quran, Prayer Times, Qibla, Hadith, Duas, and more.\n\nBy MZ and MBZ")}
                                accessibilityRole="button"
                                accessibilityLabel="About Falah"
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}><Feather name="info" size={18} color={theme.textPrimary} /></View>
                                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>About Falah</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => router.push('/privacy' as any)}
                                accessibilityRole="button"
                                accessibilityLabel="Privacy policy"
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}><Feather name="shield" size={18} color={theme.textPrimary} /></View>
                                    <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Privacy Policy</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    authContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
    header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1 },
    headerTitle: { fontSize: 26, fontWeight: '300', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
    menuGroup: { borderRadius: 16, borderWidth: 1, marginBottom: 30 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuItemText: { fontSize: 16 },
    menuItemSubText: { fontSize: 12, marginTop: 2 },
    badgeContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
});

const themePickerStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    desc: {
        fontSize: 12,
        fontWeight: '400',
    },
    cardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    swatches: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    swatch: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    check: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ── Tweaks UI — pill row style shared by Accent / Madhab / Reciter pickers ──
const tweaksStyles = StyleSheet.create({
    groupLabel: {
        fontSize: 11,
        letterSpacing: 1.2,
        fontFamily: fonts.bodyBold,
        marginBottom: 10,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 13,
        fontFamily: fonts.bodyMedium,
    },
    swatchDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
    },
});

const langPickerStyles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', paddingHorizontal: 32,
    },
    sheet: {
        borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    },
    sheetTitle: {
        fontSize: 15, fontWeight: '700', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12,
    },
    option: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    optionText: { fontSize: 16 },
});
