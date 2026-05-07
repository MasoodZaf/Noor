import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, Pressable, Switch, Modal, FlatList, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

    const LANGUAGES = ['english', 'urdu', 'indonesian', 'french', 'bengali', 'turkish'] as const;
    const LANGUAGE_DISPLAY = {
        'english': 'English',
        'urdu': 'Urdu (اردو)',
        'indonesian': 'Indonesian',
        'french': 'Français',
        'bengali': 'Bengali (বাংলা)',
        'turkish': 'Türkçe'
    };

    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

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

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert("Required", "Please enter email and password.");
            return;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
            Alert.alert("Invalid Email", "Please enter a valid email address.");
            return;
        }
        // No length check on sign-in — accept whatever the user has set; let the
        // server reject if wrong. Length minimum applies only on sign-up below.
        setAuthLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) Alert.alert("Login Failed", error.message);
        else { setEmail(''); setPassword(''); }
        setAuthLoading(false);
    };

    const handleSignUp = async () => {
        if (!email.trim() || !password) {
            Alert.alert("Required", "Please enter email and password.");
            return;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
            Alert.alert("Invalid Email", "Please enter a valid email address.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Weak Password", "Password must be at least 6 characters long.");
            return;
        }
        setAuthLoading(true);
        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
        });

        if (error) Alert.alert("Sign Up Failed", error.message);
        else { Alert.alert("Success", "Check your email for the confirmation link!"); setEmail(''); setPassword(''); }
        setAuthLoading(false);
    };

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
                <Slider
                    style={{ width: '100%', height: 36, marginTop: 4 }}
                    minimumValue={0.8}
                    maximumValue={1.6}
                    step={0.05}
                    value={arabicScale}
                    onValueChange={setArabicScale}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={Platform.OS === 'android' ? theme.accent : undefined}
                />
                {/* Live preview — lets the user see the scale applied to Arabic text */}
                <Text style={{
                    fontFamily: fonts.arabic,
                    fontSize: 22 * arabicScale,
                    color: theme.textPrimary,
                    textAlign: 'right',
                    marginTop: 4,
                    lineHeight: 30 * arabicScale,
                }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </Text>
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

    if (!session) {
        // Unauthenticated View
        return (
            <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
                <LanguagePickerModal />
                <View style={styles.topBar}>
                    <TouchableOpacity
                        onPress={goBack}
                        hitSlop={10}
                        style={styles.topBarBack}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.authHeader}>
                        <View style={[styles.authIconContainer, { backgroundColor: theme.gold + '1A', borderColor: theme.gold + '33' }]}>
                            <Feather name="shield" size={40} color={theme.gold} />
                        </View>
                        <Text style={[styles.authTitle, { color: theme.textPrimary }]}>Your Falah Account</Text>
                        <Text style={[styles.authDesc, { color: theme.textSecondary }]}>Sync your Bookmarks, SRS Memory progress, and Prayer History securely to the cloud.</Text>
                    </View>

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

                    <View style={styles.inputStack}>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                            <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.textPrimary }]}
                                placeholder="Email Address"
                                placeholderTextColor={theme.textSecondary}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                        <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                            <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.textPrimary }]}
                                placeholder="Password"
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>
                    </View>

                    {authLoading ? (
                        <ActivityIndicator size="large" color={theme.gold} style={{ marginVertical: 30 }} />
                    ) : (
                        <View style={styles.authActionRow}>
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: theme.gold }]}
                                onPress={handleLogin}
                                accessibilityRole="button"
                                accessibilityLabel="Log in"
                            >
                                <Text style={[styles.primaryBtnText, { color: theme.textInverse }]}>Log In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.secondaryBtn, { borderColor: theme.border }]}
                                onPress={handleSignUp}
                                accessibilityRole="button"
                                accessibilityLabel="Create free account"
                            >
                                <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Create Free Account</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* About & Legal Section - Unobtrusive (Unauthenticated view) */}
                    <View style={{ marginTop: 40 }}>
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

    // Authenticated View
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

            <ScrollView contentContainerStyle={styles.content}>
                {/* ID Card */}
                <LinearGradient
                    colors={[theme.gold + '26', theme.accent + '0D']}
                    style={[styles.idCard, { borderColor: theme.gold + '4D' }]}
                >
                    <View style={[styles.idHeader, { borderBottomColor: theme.border }]}>
                        <View style={[styles.avatar, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                            <Feather name="user" size={30} color={theme.gold} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={[styles.emailText, { color: theme.textPrimary }]}>{session.user.email}</Text>
                            <Text style={[styles.statusText, { color: theme.gold }]}>Cloud Sync Active</Text>
                        </View>
                    </View>
                    <View style={styles.idStats}>
                        <View style={styles.idStatBox}>
                            <Text style={[styles.statVal, { color: theme.textPrimary }]}>0</Text>
                            <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Days Streak</Text>
                        </View>
                        <View style={[styles.idStatBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
                            <Text style={[styles.statVal, { color: theme.textPrimary }]}>Basic</Text>
                            <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Plan level</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Translation Preferences */}
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
                                <Text style={[styles.menuItemSubText, { color: theme.textSecondary }]}>Tap to switch format</Text>
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

                {/* Backup Status — sets honest expectations about cross-device sync.
                    Sync isn't implemented yet (only Supabase auth is wired); this
                    card is what tells the user their bookmarks/progress are local. */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Backup</Text>
                <TouchableOpacity
                    style={[styles.menuGroup, { backgroundColor: theme.bgCard, borderColor: theme.border, padding: 16, marginBottom: 30 }]}
                    onPress={() => Alert.alert(
                        session ? 'Cross-device sync' : 'Local data',
                        session
                            ? `You\'re signed in as ${session.user?.email ?? 'your account'}.\n\nCross-device sync is coming soon — your bookmarks, Hifz progress, and preferences will mirror automatically once it ships. For now, your data still lives only on this device.`
                            : 'Your bookmarks, Hifz progress, prayer settings, and other preferences are stored on this device only.\n\nUninstalling the app or wiping the device will erase them — unless you have iCloud Backup (iOS) or Auto-Backup (Android) enabled.\n\nSign in below to be notified when cross-device sync ships.',
                        [{ text: 'OK' }]
                    )}
                    accessibilityRole="button"
                    accessibilityLabel={session ? 'Backup status, signed in' : 'Backup status, your data is on this device'}
                    accessibilityHint="Shows details about how your data is stored"
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}>
                            <Feather
                                name={session ? 'shield' : 'smartphone'}
                                size={18}
                                color={session ? theme.gold : theme.textPrimary}
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 2 }}>
                                {session ? 'Signed in' : 'Your data is on this device'}
                            </Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                                {session
                                    ? `${session.user?.email ?? 'Account'} · cross-device sync coming soon`
                                    : 'Sign in below to enable cross-device sync (coming soon)'}
                            </Text>
                        </View>
                        <Feather name="info" size={18} color={theme.textTertiary} />
                    </View>
                </TouchableOpacity>

                {/* Settings Menu */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Account</Text>
                <View style={[styles.menuGroup, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.border }]}
                        onPress={() => Alert.alert(
                            'Adhan Notifications',
                            'Per-prayer adhan reminders are toggled from the bell icon on the Home tab.',
                            [{ text: 'Open Home', onPress: () => router.push('/(tabs)' as any) }, { text: 'Cancel', style: 'cancel' }]
                        )}
                        accessibilityRole="button"
                        accessibilityLabel="Adhan notifications"
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}><Feather name="bell" size={18} color={theme.textPrimary} /></View>
                            <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Adhan Notifications</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomColor: theme.border }]}
                        onPress={() => Alert.alert(
                            'Calculation Method',
                            'The prayer time calculation method is selected from the prayer card on the Home tab — tap the settings icon next to "Today\'s Prayers".',
                            [{ text: 'Open Home', onPress: () => router.push('/(tabs)' as any) }, { text: 'Cancel', style: 'cancel' }]
                        )}
                        accessibilityRole="button"
                        accessibilityLabel="Calculation method"
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}><Feather name="map-pin" size={18} color={theme.textPrimary} /></View>
                            <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Calculation Method</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.menuItem, { borderBottomWidth: 0 }]}
                        onPress={() => Alert.alert(
                            'Database',
                            'The offline content database (114 surahs, 8 Qaida lessons, hadith collections, duas) is bundled with the app and updates with each app release.\n\nNo manual sync is required.',
                            [{ text: 'OK' }]
                        )}
                        accessibilityRole="button"
                        accessibilityLabel="Database status"
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconBox, { backgroundColor: theme.bgInput }]}><Feather name="database" size={18} color={theme.textPrimary} /></View>
                            <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Database Status</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* About & Legal Section */}
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

                {/* Premium Teaser */}
                <TouchableOpacity
                    style={[styles.premiumBanner, { backgroundColor: theme.gold }]}
                    onPress={() => Alert.alert(
                        'Falah Pro',
                        'Unlimited Hifz tracking, premium reciters, and offline audio packs are coming soon. We\'ll notify you when Falah Pro is available.',
                        [{ text: 'OK' }]
                    )}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade to Falah Pro"
                >
                    <Feather name="star" size={24} color={theme.textInverse} style={{ marginRight: 16 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.premiumBannerTitle, { color: theme.textInverse }]}>Upgrade to Falah Pro</Text>
                        <Text style={[styles.premiumBannerDesc, { color: theme.textInverse + 'CC' }]}>Unlock unlimited Hifz tracking & Audio.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => Alert.alert(
                        'Sign Out',
                        'Are you sure you want to sign out? Your local progress will remain on this device.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
                        ]
                    )}
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                >
                    <Feather name="log-out" size={18} color="#E53E3E" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Sign Out Securely</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    authContainer: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },
    authHeader: { alignItems: 'center', marginBottom: 40 },
    authIconContainer: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, borderWidth: 1,
    },
    authTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
    authDesc: { fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    inputStack: { gap: 16, marginBottom: 40 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, paddingHorizontal: 16, height: 60,
        borderWidth: 1,
    },
    inputIcon: { marginRight: 16 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    authActionRow: { gap: 16 },
    primaryBtn: {
        borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: 'bold' },
    secondaryBtn: {
        backgroundColor: 'transparent',
        borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '600' },
    header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1 },
    headerTitle: { fontSize: 26, fontWeight: '300', letterSpacing: 0.5 },
    topBar: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4 },
    topBarBack: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4, paddingHorizontal: 4 },
    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
    idCard: { borderRadius: 20, borderWidth: 1, marginBottom: 30 },
    idHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    emailText: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    statusText: { fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
    idStats: { flexDirection: 'row' },
    idStatBox: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    statLbl: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
    menuGroup: { borderRadius: 16, borderWidth: 1, marginBottom: 30 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuItemText: { fontSize: 16 },
    premiumBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 20, marginBottom: 30 },
    premiumBannerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    premiumBannerDesc: { fontSize: 13 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(229, 62, 62, 0.1)', borderWidth: 1, borderColor: 'rgba(229, 62, 62, 0.2)' },
    logoutBtnText: { color: '#E53E3E', fontSize: 16, fontWeight: '600' },
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
