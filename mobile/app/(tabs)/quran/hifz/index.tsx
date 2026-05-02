import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, FlatList, TextInput, Alert, Platform,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../../../context/ThemeContext';
import { checkOnline } from '../../../../utils/network';

const HIFZ_KEY = '@noor/hifz_entries';

// ─── Surah list ─────────────────────────────────────────────────────────────
const SURAHS: { id: number; name: string; arabic: string; ayahs: number }[] = [
    { id: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', ayahs: 7 },
    { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', ayahs: 286 },
    { id: 3, name: "Ali 'Imran", arabic: 'آل عمران', ayahs: 200 },
    { id: 4, name: "An-Nisa", arabic: 'النساء', ayahs: 176 },
    { id: 5, name: "Al-Ma'idah", arabic: 'المائدة', ayahs: 120 },
    { id: 6, name: "Al-An'am", arabic: 'الأنعام', ayahs: 165 },
    { id: 7, name: "Al-A'raf", arabic: 'الأعراف', ayahs: 206 },
    { id: 8, name: 'Al-Anfal', arabic: 'الأنفال', ayahs: 75 },
    { id: 9, name: 'At-Tawbah', arabic: 'التوبة', ayahs: 129 },
    { id: 10, name: 'Yunus', arabic: 'يونس', ayahs: 109 },
    { id: 11, name: 'Hud', arabic: 'هود', ayahs: 123 },
    { id: 12, name: 'Yusuf', arabic: 'يوسف', ayahs: 111 },
    { id: 13, name: "Ar-Ra'd", arabic: 'الرعد', ayahs: 43 },
    { id: 14, name: 'Ibrahim', arabic: 'إبراهيم', ayahs: 52 },
    { id: 15, name: 'Al-Hijr', arabic: 'الحجر', ayahs: 99 },
    { id: 16, name: 'An-Nahl', arabic: 'النحل', ayahs: 128 },
    { id: 17, name: "Al-Isra", arabic: 'الإسراء', ayahs: 111 },
    { id: 18, name: 'Al-Kahf', arabic: 'الكهف', ayahs: 110 },
    { id: 19, name: 'Maryam', arabic: 'مريم', ayahs: 98 },
    { id: 20, name: 'Ta-Ha', arabic: 'طه', ayahs: 135 },
    { id: 21, name: "Al-Anbiya", arabic: 'الأنبياء', ayahs: 112 },
    { id: 22, name: 'Al-Hajj', arabic: 'الحج', ayahs: 78 },
    { id: 23, name: "Al-Mu'minun", arabic: 'المؤمنون', ayahs: 118 },
    { id: 24, name: 'An-Nur', arabic: 'النور', ayahs: 64 },
    { id: 25, name: 'Al-Furqan', arabic: 'الفرقان', ayahs: 77 },
    { id: 26, name: "Ash-Shu'ara", arabic: 'الشعراء', ayahs: 227 },
    { id: 27, name: 'An-Naml', arabic: 'النمل', ayahs: 93 },
    { id: 28, name: 'Al-Qasas', arabic: 'القصص', ayahs: 88 },
    { id: 29, name: "Al-'Ankabut", arabic: 'العنكبوت', ayahs: 69 },
    { id: 30, name: 'Ar-Rum', arabic: 'الروم', ayahs: 60 },
    { id: 31, name: 'Luqman', arabic: 'لقمان', ayahs: 34 },
    { id: 32, name: 'As-Sajdah', arabic: 'السجدة', ayahs: 30 },
    { id: 33, name: 'Al-Ahzab', arabic: 'الأحزاب', ayahs: 73 },
    { id: 34, name: "Saba'", arabic: 'سبأ', ayahs: 54 },
    { id: 35, name: 'Fatir', arabic: 'فاطر', ayahs: 45 },
    { id: 36, name: 'Ya-Sin', arabic: 'يس', ayahs: 83 },
    { id: 37, name: 'As-Saffat', arabic: 'الصافات', ayahs: 182 },
    { id: 38, name: 'Sad', arabic: 'ص', ayahs: 88 },
    { id: 39, name: 'Az-Zumar', arabic: 'الزمر', ayahs: 75 },
    { id: 40, name: 'Ghafir', arabic: 'غافر', ayahs: 85 },
    { id: 41, name: 'Fussilat', arabic: 'فصلت', ayahs: 54 },
    { id: 42, name: 'Ash-Shura', arabic: 'الشورى', ayahs: 53 },
    { id: 43, name: 'Az-Zukhruf', arabic: 'الزخرف', ayahs: 89 },
    { id: 44, name: 'Ad-Dukhan', arabic: 'الدخان', ayahs: 59 },
    { id: 45, name: 'Al-Jathiyah', arabic: 'الجاثية', ayahs: 37 },
    { id: 46, name: 'Al-Ahqaf', arabic: 'الأحقاف', ayahs: 35 },
    { id: 47, name: 'Muhammad', arabic: 'محمد', ayahs: 38 },
    { id: 48, name: 'Al-Fath', arabic: 'الفتح', ayahs: 29 },
    { id: 49, name: 'Al-Hujurat', arabic: 'الحجرات', ayahs: 18 },
    { id: 50, name: 'Qaf', arabic: 'ق', ayahs: 45 },
    { id: 51, name: 'Adh-Dhariyat', arabic: 'الذاريات', ayahs: 60 },
    { id: 52, name: 'At-Tur', arabic: 'الطور', ayahs: 49 },
    { id: 53, name: 'An-Najm', arabic: 'النجم', ayahs: 62 },
    { id: 54, name: 'Al-Qamar', arabic: 'القمر', ayahs: 55 },
    { id: 55, name: 'Ar-Rahman', arabic: 'الرحمن', ayahs: 78 },
    { id: 56, name: "Al-Waqi'ah", arabic: 'الواقعة', ayahs: 96 },
    { id: 57, name: 'Al-Hadid', arabic: 'الحديد', ayahs: 29 },
    { id: 58, name: 'Al-Mujadila', arabic: 'المجادلة', ayahs: 22 },
    { id: 59, name: 'Al-Hashr', arabic: 'الحشر', ayahs: 24 },
    { id: 60, name: 'Al-Mumtahanah', arabic: 'الممتحنة', ayahs: 13 },
    { id: 61, name: 'As-Saf', arabic: 'الصف', ayahs: 14 },
    { id: 62, name: "Al-Jumu'ah", arabic: 'الجمعة', ayahs: 11 },
    { id: 63, name: 'Al-Munafiqun', arabic: 'المنافقون', ayahs: 11 },
    { id: 64, name: 'At-Taghabun', arabic: 'التغابن', ayahs: 18 },
    { id: 65, name: 'At-Talaq', arabic: 'الطلاق', ayahs: 12 },
    { id: 66, name: 'At-Tahrim', arabic: 'التحريم', ayahs: 12 },
    { id: 67, name: 'Al-Mulk', arabic: 'الملك', ayahs: 30 },
    { id: 68, name: 'Al-Qalam', arabic: 'القلم', ayahs: 52 },
    { id: 69, name: 'Al-Haqqah', arabic: 'الحاقة', ayahs: 52 },
    { id: 70, name: "Al-Ma'arij", arabic: 'المعارج', ayahs: 44 },
    { id: 71, name: 'Nuh', arabic: 'نوح', ayahs: 28 },
    { id: 72, name: 'Al-Jinn', arabic: 'الجن', ayahs: 28 },
    { id: 73, name: 'Al-Muzzammil', arabic: 'المزمل', ayahs: 20 },
    { id: 74, name: 'Al-Muddaththir', arabic: 'المدثر', ayahs: 56 },
    { id: 75, name: 'Al-Qiyamah', arabic: 'القيامة', ayahs: 40 },
    { id: 76, name: 'Al-Insan', arabic: 'الإنسان', ayahs: 31 },
    { id: 77, name: 'Al-Mursalat', arabic: 'المرسلات', ayahs: 50 },
    { id: 78, name: "An-Naba'", arabic: 'النبأ', ayahs: 40 },
    { id: 79, name: "An-Nazi'at", arabic: 'النازعات', ayahs: 46 },
    { id: 80, name: "'Abasa", arabic: 'عبس', ayahs: 42 },
    { id: 81, name: 'At-Takwir', arabic: 'التكوير', ayahs: 29 },
    { id: 82, name: 'Al-Infitar', arabic: 'الإنفطار', ayahs: 19 },
    { id: 83, name: 'Al-Mutaffifin', arabic: 'المطففين', ayahs: 36 },
    { id: 84, name: 'Al-Inshiqaq', arabic: 'الانشقاق', ayahs: 25 },
    { id: 85, name: 'Al-Buruj', arabic: 'البروج', ayahs: 22 },
    { id: 86, name: 'At-Tariq', arabic: 'الطارق', ayahs: 17 },
    { id: 87, name: "Al-A'la", arabic: 'الأعلى', ayahs: 19 },
    { id: 88, name: 'Al-Ghashiyah', arabic: 'الغاشية', ayahs: 26 },
    { id: 89, name: 'Al-Fajr', arabic: 'الفجر', ayahs: 30 },
    { id: 90, name: 'Al-Balad', arabic: 'البلد', ayahs: 20 },
    { id: 91, name: 'Ash-Shams', arabic: 'الشمس', ayahs: 15 },
    { id: 92, name: 'Al-Layl', arabic: 'الليل', ayahs: 21 },
    { id: 93, name: 'Ad-Duha', arabic: 'الضحى', ayahs: 11 },
    { id: 94, name: 'Ash-Sharh', arabic: 'الشرح', ayahs: 8 },
    { id: 95, name: 'At-Tin', arabic: 'التين', ayahs: 8 },
    { id: 96, name: "Al-'Alaq", arabic: 'العلق', ayahs: 19 },
    { id: 97, name: 'Al-Qadr', arabic: 'القدر', ayahs: 5 },
    { id: 98, name: 'Al-Bayyinah', arabic: 'البينة', ayahs: 8 },
    { id: 99, name: 'Az-Zalzalah', arabic: 'الزلزلة', ayahs: 8 },
    { id: 100, name: "Al-'Adiyat", arabic: 'العاديات', ayahs: 11 },
    { id: 101, name: "Al-Qari'ah", arabic: 'القارعة', ayahs: 11 },
    { id: 102, name: 'At-Takathur', arabic: 'التكاثر', ayahs: 8 },
    { id: 103, name: "Al-'Asr", arabic: 'العصر', ayahs: 3 },
    { id: 104, name: 'Al-Humazah', arabic: 'الهمزة', ayahs: 9 },
    { id: 105, name: 'Al-Fil', arabic: 'الفيل', ayahs: 5 },
    { id: 106, name: 'Quraysh', arabic: 'قريش', ayahs: 4 },
    { id: 107, name: "Al-Ma'un", arabic: 'الماعون', ayahs: 7 },
    { id: 108, name: 'Al-Kawthar', arabic: 'الكوثر', ayahs: 3 },
    { id: 109, name: 'Al-Kafirun', arabic: 'الكافرون', ayahs: 6 },
    { id: 110, name: 'An-Nasr', arabic: 'النصر', ayahs: 3 },
    { id: 111, name: 'Al-Masad', arabic: 'المسد', ayahs: 5 },
    { id: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', ayahs: 4 },
    { id: 113, name: 'Al-Falaq', arabic: 'الفلق', ayahs: 5 },
    { id: 114, name: 'An-Nas', arabic: 'الناس', ayahs: 6 },
];

// ─── Types & SM-2 — extracted to utils/sm2.ts for testability ────────────────
import { applySM2, toIsoDate, type HifzEntry } from '../../../../utils/sm2';
export { applySM2 };
export type { HifzEntry };

function todayStr() { return toIsoDate(new Date()); }

function formatNextReview(dateStr: string): string {
    const today = todayStr();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = tomorrow.toISOString().split('T')[0];
    if (dateStr <= today) return 'Due Now';
    if (dateStr === tomStr) return 'Tomorrow';
    const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
    return `In ${diff} days`;
}

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────
const VALID_STATUSES = new Set<string>(['learning', 'memorized', 'needs_review']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidEntry(e: any): e is HifzEntry {
    return (
        typeof e === 'object' && e !== null &&
        Number.isInteger(e.surahId) && e.surahId >= 1 && e.surahId <= 114 &&
        typeof e.surahName === 'string' && e.surahName.length > 0 &&
        typeof e.arabicName === 'string' &&
        Number.isInteger(e.totalAyahs) && e.totalAyahs > 0 &&
        VALID_STATUSES.has(e.status) &&
        typeof e.easeFactor === 'number' && e.easeFactor >= 1.3 &&
        typeof e.interval === 'number' && e.interval >= 1 &&
        typeof e.repetitions === 'number' && e.repetitions >= 0 &&
        typeof e.nextReview === 'string' && DATE_RE.test(e.nextReview) &&
        typeof e.addedAt === 'string' && DATE_RE.test(e.addedAt)
    );
}

async function loadEntries(): Promise<HifzEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(HIFZ_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isValidEntry);
    } catch { return []; }
}

async function saveEntries(entries: HifzEntry[]): Promise<void> {
    await AsyncStorage.setItem(HIFZ_KEY, JSON.stringify(entries));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HifzTrackerScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();

    const [entries, setEntries] = useState<HifzEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'review'>('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [isOnline, setIsOnline] = useState(true);

    // Reload entries whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadEntries().then(setEntries);
            // Check connectivity once on focus — gated on state change to avoid re-renders on every focus
            checkOnline().then(online => setIsOnline(prev => prev !== online ? online : prev));
        }, [])
    );

    // ── Derived stats ────────────────────────────────────────────────────────
    const today = todayStr();
    const dueEntries = entries.filter(e => e.nextReview <= today);
    const memorizedCount = entries.filter(e => e.status === 'memorized').length;
    const totalAyahsTracked = entries.reduce((s, e) => s + e.totalAyahs, 0);
    const memorizedAyahs = entries
        .filter(e => e.status === 'memorized')
        .reduce((s, e) => s + e.totalAyahs, 0);
    const masteryPct = entries.length > 0 ? Math.round((memorizedCount / entries.length) * 100) : 0;

    // SVG ring
    const radius = 60;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference - (masteryPct / 100) * circumference;

    // ── Add surah ────────────────────────────────────────────────────────────
    const trackedIds = new Set(entries.map(e => e.surahId));
    const filteredSurahs = SURAHS.filter(s =>
        !trackedIds.has(s.id) &&
        (addSearch === '' || s.name.toLowerCase().includes(addSearch.toLowerCase()) || s.arabic.includes(addSearch))
    );

    async function addSurah(surah: typeof SURAHS[0]) {
        const newEntry: HifzEntry = {
            surahId: surah.id,
            surahName: surah.name,
            arabicName: surah.arabic,
            totalAyahs: surah.ayahs,
            status: 'learning',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReview: today,
            lastReview: null,
            addedAt: today,
        };
        const updated = [...entries, newEntry].sort((a, b) => a.surahId - b.surahId);
        setEntries(updated);
        await saveEntries(updated);
        setShowAddModal(false);
        setAddSearch('');
    }

    async function removeEntry(surahId: number) {
        Alert.alert('Remove Surah', 'Remove this surah from your tracker?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    const updated = entries.filter(e => e.surahId !== surahId);
                    setEntries(updated);
                    await saveEntries(updated);
                }
            }
        ]);
    }

    function startDrill(entry: HifzEntry) {
        if (!isOnline) {
            Alert.alert(
                'No Internet Connection',
                'Hifz drill requires an active internet connection to load Quran data. Please connect and try again.',
                [{ text: 'OK' }]
            );
            return;
        }
        router.push(`/quran/hifz/drill?surahId=${entry.surahId}&surahName=${encodeURIComponent(entry.surahName)}` as any);
    }

    // ── Status helpers ───────────────────────────────────────────────────────
    const STATUS_COLOR: Record<HifzEntry['status'], string> = {
        memorized: theme.accent,
        learning: theme.gold,
        needs_review: '#E53E3E',
    };
    const STATUS_LABEL: Record<HifzEntry['status'], string> = {
        memorized: 'Memorized',
        learning: 'Learning',
        needs_review: 'Review Due',
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={24} color={theme.gold} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Hifz Memory Tracker</Text>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.bgInput }]}
                    onPress={() => setShowAddModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add surah to track"
                >
                    <Feather name="plus" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Offline Banner */}
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Feather name="wifi-off" size={14} color="#fff" />
                    <Text style={styles.offlineBannerText}>No internet — drill sessions require a connection</Text>
                </View>
            )}

            {/* Tabs */}
            <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'dashboard' && [styles.tabBtnActive, { borderBottomColor: theme.gold }]]}
                    onPress={() => setActiveTab('dashboard')}
                    accessibilityRole="tab"
                    accessibilityLabel="Dashboard"
                    accessibilityState={{ selected: activeTab === 'dashboard' }}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'dashboard' && [styles.tabTextActive, { color: theme.gold }]]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'review' && [styles.tabBtnActive, { borderBottomColor: theme.gold }]]}
                    onPress={() => setActiveTab('review')}
                    accessibilityRole="tab"
                    accessibilityLabel={`SRS Review${dueEntries.length > 0 ? `, ${dueEntries.length} due` : ''}`}
                    accessibilityState={{ selected: activeTab === 'review' }}
                >
                    <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'review' && [styles.tabTextActive, { color: theme.gold }]]}>
                        SRS Review
                    </Text>
                    {dueEntries.length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{dueEntries.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeTab === 'dashboard' ? (
                    <>
                        {/* Stats Ring */}
                        <LinearGradient
                            colors={['rgba(201,168,76,0.15)', 'rgba(31,78,61,0.05)']}
                            style={[styles.statsCard, { borderColor: theme.border }]}
                        >
                            <View style={styles.radialContainer}>
                                <Svg width={150} height={150} viewBox="0 0 150 150">
                                    <Defs>
                                        <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <Stop offset="0%" stopColor={theme.gold} />
                                            <Stop offset="100%" stopColor={theme.accent} />
                                        </SvgGradient>
                                    </Defs>
                                    <Circle cx="75" cy="75" r={radius} stroke="rgba(0,0,0,0.07)" strokeWidth={strokeWidth} fill="none" />
                                    {entries.length > 0 && (
                                        <Circle
                                            cx="75" cy="75" r={radius}
                                            stroke="url(#grad)"
                                            strokeWidth={strokeWidth}
                                            fill="none"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={dashoffset}
                                            strokeLinecap="round"
                                            transform="rotate(-90 75 75)"
                                        />
                                    )}
                                </Svg>
                                <View style={styles.radialTextContainer}>
                                    <Text style={[styles.radialNumber, { color: theme.textPrimary }]}>
                                        {masteryPct}<Text style={[styles.radialPercent, { color: theme.gold }]}>%</Text>
                                    </Text>
                                    <Text style={[styles.radialLabel, { color: theme.textSecondary }]}>Mastery</Text>
                                </View>
                            </View>

                            <View style={[styles.statsGrid, { borderTopColor: theme.border }]}>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{entries.length}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Surahs Tracked</Text>
                                </View>
                                <View style={[styles.statBox, styles.statBoxMiddle, { borderColor: theme.border }]}>
                                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{memorizedCount}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Memorized</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: theme.textPrimary }]}>{totalAyahsTracked}</Text>
                                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Ayahs Tracked</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {entries.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="book-open" size={48} color={theme.accentLight} />
                                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Start Your Hifz Journey</Text>
                                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Tap the + button to add your first surah and begin memorizing with spaced repetition.</Text>
                                <TouchableOpacity
                                    style={[styles.emptyBtn, { backgroundColor: theme.gold }]}
                                    onPress={() => setShowAddModal(true)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add surah"
                                >
                                    <Feather name="plus" size={18} color={theme.textInverse} />
                                    <Text style={[styles.emptyBtnText, { color: theme.textInverse }]}>Add Surah</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {/* Due Today Banner */}
                                {dueEntries.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.dueBanner}
                                        onPress={() => setActiveTab('review')}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${dueEntries.length} surah${dueEntries.length > 1 ? 's' : ''} due for review`}
                                    >
                                        <View style={styles.dueBannerLeft}>
                                            <Feather name="alert-circle" size={20} color="#E53E3E" />
                                            <Text style={styles.dueBannerText}>
                                                {dueEntries.length} surah{dueEntries.length > 1 ? 's' : ''} due for review
                                            </Text>
                                        </View>
                                        <Feather name="chevron-right" size={18} color="#E53E3E" />
                                    </TouchableOpacity>
                                )}

                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Your Surahs</Text>
                                <View style={styles.pipeline}>
                                    {entries.map((entry) => (
                                        <View key={entry.surahId} style={[styles.surahRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                            <View style={[styles.surahNumBadge, { backgroundColor: STATUS_COLOR[entry.status] + '20' }]}>
                                                <Text style={[styles.surahNum, { color: STATUS_COLOR[entry.status] }]}>{entry.surahId}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.surahName, { color: theme.textPrimary }]}>{entry.surahName}</Text>
                                                <Text style={[styles.surahSub, { color: theme.textTertiary }]}>
                                                    {entry.totalAyahs} ayahs · Next: {formatNextReview(entry.nextReview)}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusPill, { borderColor: STATUS_COLOR[entry.status] + '50', backgroundColor: STATUS_COLOR[entry.status] + '15' }]}>
                                                <Text style={[styles.statusPillText, { color: STATUS_COLOR[entry.status] }]}>
                                                    {STATUS_LABEL[entry.status]}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => removeEntry(entry.surahId)}
                                                style={styles.removeBtn}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Remove ${entry.surahName} from tracker`}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Feather name="x" size={16} color={theme.textTertiary} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* SRS Header */}
                        <View style={[styles.srsHeader, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <Feather name="activity" size={40} color={theme.gold} style={{ marginBottom: 16 }} />
                            <Text style={[styles.srsTitle, { color: theme.textPrimary }]}>Spaced Repetition</Text>
                            <Text style={[styles.srsDesc, { color: theme.textSecondary }]}>
                                SM-2 algorithm calculates the optimal time to review each surah — right before you forget it.
                            </Text>
                        </View>

                        {dueEntries.length === 0 ? (
                            <View style={styles.allDoneBox}>
                                <Text style={styles.allDoneEmoji}>🎉</Text>
                                <Text style={[styles.allDoneTitle, { color: theme.textPrimary }]}>All caught up!</Text>
                                <Text style={[styles.allDoneDesc, { color: theme.textSecondary }]}>No reviews due today. Come back tomorrow to keep your memory sharp.</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Due for Review ({dueEntries.length})</Text>
                                {dueEntries.map((entry) => (
                                    <TouchableOpacity
                                        key={entry.surahId}
                                        style={[styles.reviewCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                        onPress={() => startDrill(entry)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Review ${entry.surahName}, ${entry.totalAyahs} ayahs, ${formatNextReview(entry.nextReview)}`}
                                    >
                                        <LinearGradient
                                            colors={entry.nextReview < today
                                                ? ['rgba(229,62,62,0.08)', 'transparent']
                                                : ['rgba(201,168,76,0.1)', 'transparent']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.reviewRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.reviewSurah, { color: theme.textPrimary }]}>{entry.surahName}</Text>
                                                <Text style={[styles.reviewArabic, { color: theme.gold }]}>{entry.arabicName}</Text>
                                                <Text style={[
                                                    styles.reviewDue,
                                                    { color: theme.textSecondary },
                                                    entry.nextReview <= today && { color: '#E53E3E', fontWeight: '700' }
                                                ]}>
                                                    {formatNextReview(entry.nextReview)} · {entry.totalAyahs} ayahs
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.startBtn, { backgroundColor: isOnline ? theme.gold : theme.textTertiary }]}
                                                onPress={() => startDrill(entry)}
                                                accessibilityRole="button"
                                                accessibilityLabel={isOnline ? `Start drill for ${entry.surahName}` : 'Offline, drill unavailable'}
                                                accessibilityState={{ disabled: !isOnline }}
                                            >
                                                <Feather name={isOnline ? 'play' : 'wifi-off'} size={16} color={theme.textInverse} />
                                                <Text style={[styles.startBtnText, { color: theme.textInverse }]}>
                                                    {isOnline ? 'Start Drill' : 'Offline'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.intervalRow}>
                                            <Text style={[styles.intervalText, { color: theme.textTertiary }]}>Interval: {entry.interval}d</Text>
                                            <Text style={[styles.intervalText, { color: theme.textTertiary }]}>EF: {entry.easeFactor.toFixed(2)}</Text>
                                            <Text style={[styles.intervalText, { color: theme.textTertiary }]}>Rep #{entry.repetitions}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                {/* Other surahs not yet due */}
                                {entries.filter(e => e.nextReview > today).length > 0 && (
                                    <>
                                        <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.textPrimary }]}>Upcoming</Text>
                                        {entries.filter(e => e.nextReview > today).map((entry) => (
                                            <View key={entry.surahId} style={[styles.reviewCard, { opacity: 0.6, backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                                <View style={styles.reviewRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.reviewSurah, { color: theme.textPrimary }]}>{entry.surahName}</Text>
                                                        <Text style={[styles.reviewDue, { color: theme.textSecondary }]}>{formatNextReview(entry.nextReview)}</Text>
                                                    </View>
                                                    <View style={[styles.pendingPill, { backgroundColor: theme.bgInput }]}>
                                                        <Feather name="clock" size={14} color={theme.textTertiary} />
                                                        <Text style={[styles.pendingText, { color: theme.textTertiary }]}>Pending</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Add Surah Modal */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Surah</Text>
                        <TouchableOpacity
                            onPress={() => { setShowAddModal(false); setAddSearch(''); }}
                            accessibilityRole="button"
                            accessibilityLabel="Close add surah modal"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Feather name="x" size={24} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.modalSearch, { backgroundColor: theme.bgInput }]}>
                        <Feather name="search" size={18} color={theme.textTertiary} />
                        <TextInput
                            style={[styles.modalSearchInput, { color: theme.textPrimary }]}
                            placeholder="Search surahs..."
                            placeholderTextColor={theme.textTertiary}
                            value={addSearch}
                            onChangeText={setAddSearch}
                            autoFocus
                        />
                    </View>

                    <FlatList
                        data={filteredSurahs}
                        keyExtractor={s => String(s.id)}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.surahPickerRow, { borderBottomColor: theme.border }]}
                                onPress={() => addSurah(item)}
                                accessibilityRole="button"
                                accessibilityLabel={`Add Surah ${item.id}: ${item.name}, ${item.ayahs} ayahs`}
                            >
                                <View style={[styles.surahPickerNum, { backgroundColor: theme.accentLight }]}>
                                    <Text style={[styles.surahPickerNumText, { color: theme.gold }]}>{item.id}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.surahPickerName, { color: theme.textPrimary }]}>{item.name}</Text>
                                    <Text style={[styles.surahPickerSub, { color: theme.textTertiary }]}>{item.ayahs} ayahs</Text>
                                </View>
                                <Text style={[styles.surahPickerArabic, { color: theme.gold }]}>{item.arabic}</Text>
                                <Feather name="plus-circle" size={22} color={theme.gold} style={{ marginLeft: 12 }} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={[styles.modalEmpty, { color: theme.textTertiary }]}>
                                {trackedIds.size === 114 ? 'All surahs added!' : 'No surahs found'}
                            </Text>
                        }
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    actionButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    headerTitle: { fontSize: 18, fontWeight: '600' },

    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, borderBottomWidth: 1 },
    tabBtn: {
        flex: 1, paddingVertical: 12, alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: 'transparent',
        flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    tabBtnActive: {},
    tabText: { fontSize: 15, fontWeight: '600' },
    tabTextActive: {},
    badge: {
        backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 18, height: 18,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    scrollContent: { paddingHorizontal: 20 },

    statsCard: {
        borderRadius: 24, padding: 24, marginBottom: 24,
        borderWidth: 1, alignItems: 'center',
    },
    radialContainer: {
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, position: 'relative',
    },
    radialTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    radialNumber: { fontSize: 36, fontWeight: 'bold' },
    radialPercent: { fontSize: 20 },
    radialLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

    statsGrid: {
        flexDirection: 'row', width: '100%', justifyContent: 'space-around',
        borderTopWidth: 1, paddingTop: 20,
    },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxMiddle: { borderLeftWidth: 1, borderRightWidth: 1 },
    statValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 10 },
    emptyDesc: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20,
    },
    emptyBtnText: { fontSize: 16, fontWeight: '700' },

    dueBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(229,62,62,0.08)', borderRadius: 14, padding: 14,
        marginBottom: 20, borderWidth: 1, borderColor: 'rgba(229,62,62,0.2)',
    },
    dueBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dueBannerText: { color: '#E53E3E', fontSize: 14, fontWeight: '600' },

    sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
    pipeline: { gap: 10, marginBottom: 24 },

    surahRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 6, borderWidth: 1,
    },
    surahNumBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    surahNum: { fontSize: 13, fontWeight: '700' },
    surahName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
    surahSub: { fontSize: 12 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
    statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    removeBtn: { padding: 4 },

    srsHeader: {
        alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
        marginBottom: 20, borderRadius: 20, borderWidth: 1,
    },
    srsTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
    srsDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

    allDoneBox: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 },
    allDoneEmoji: { fontSize: 56, marginBottom: 16 },
    allDoneTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
    allDoneDesc: { fontSize: 15, textAlign: 'center', lineHeight: 24 },

    reviewCard: {
        borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 14,
    },
    reviewRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', padding: 18, gap: 12,
    },
    reviewSurah: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
    reviewArabic: {
        fontSize: 16, marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        textAlign: 'left',
    },
    reviewDue: { fontSize: 13 },
    startBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6,
    },
    startBtnText: { fontSize: 14, fontWeight: '700' },
    intervalRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 18, paddingBottom: 12 },
    intervalText: { fontSize: 11 },
    pendingPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    },
    pendingText: { fontSize: 13, fontWeight: '500' },

    offlineBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#c0392b', paddingVertical: 8, paddingHorizontal: 16,
    },
    offlineBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

    // Modal
    modalContainer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 20 : 0 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalSearch: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        margin: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
    },
    modalSearchInput: { flex: 1, fontSize: 16 },
    surahPickerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    surahPickerNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    surahPickerNumText: { fontSize: 13, fontWeight: '700' },
    surahPickerName: { fontSize: 15, fontWeight: '600' },
    surahPickerSub: { fontSize: 12, marginTop: 2 },
    surahPickerArabic: {
        fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    modalEmpty: { textAlign: 'center', marginTop: 40, fontSize: 15 },
});
