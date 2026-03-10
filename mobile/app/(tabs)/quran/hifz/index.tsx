import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, FlatList, TextInput, Alert, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');
const HIFZ_KEY = '@hifz_entries';

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

// ─── Types ───────────────────────────────────────────────────────────────────
export interface HifzEntry {
    surahId: number;
    surahName: string;
    arabicName: string;
    totalAyahs: number;
    status: 'learning' | 'memorized' | 'needs_review';
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string; // YYYY-MM-DD
    lastReview: string | null;
    addedAt: string; // YYYY-MM-DD
}

// ─── SM-2 helpers ────────────────────────────────────────────────────────────
export function applySM2(entry: HifzEntry, quality: 0 | 3 | 4 | 5): HifzEntry {
    let { easeFactor, interval, repetitions } = entry;
    const newEF = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    let newInterval: number;
    let newReps: number;

    if (quality < 3) {
        newReps = 0;
        newInterval = 1;
    } else {
        newReps = repetitions + 1;
        if (repetitions === 0) newInterval = 1;
        else if (repetitions === 1) newInterval = 6;
        else newInterval = Math.round(interval * newEF);
    }

    const next = new Date();
    next.setDate(next.getDate() + newInterval);

    const status: HifzEntry['status'] =
        quality < 3 ? 'needs_review' :
            newReps >= 4 && newInterval >= 21 ? 'memorized' : 'learning';

    return {
        ...entry,
        easeFactor: newEF,
        interval: newInterval,
        repetitions: newReps,
        nextReview: next.toISOString().split('T')[0],
        lastReview: new Date().toISOString().split('T')[0],
        status,
    };
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

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
async function loadEntries(): Promise<HifzEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(HIFZ_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

async function saveEntries(entries: HifzEntry[]): Promise<void> {
    await AsyncStorage.setItem(HIFZ_KEY, JSON.stringify(entries));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HifzTrackerScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [entries, setEntries] = useState<HifzEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'review'>('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');

    // Reload whenever screen comes into focus (after returning from drill)
    useFocusEffect(
        useCallback(() => {
            loadEntries().then(setEntries);
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
        router.push(`/quran/hifz/drill?surahId=${entry.surahId}&surahName=${encodeURIComponent(entry.surahName)}` as any);
    }

    // ── Status helpers ───────────────────────────────────────────────────────
    const STATUS_COLOR: Record<HifzEntry['status'], string> = {
        memorized: '#22C55E',
        learning: '#C9A84C',
        needs_review: '#E53E3E',
    };
    const STATUS_LABEL: Record<HifzEntry['status'], string> = {
        memorized: 'Memorized',
        learning: 'Learning',
        needs_review: 'Review Due',
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hifz Memory Tracker</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowAddModal(true)}>
                    <Feather name="plus" size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('dashboard')}
                >
                    <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'review' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('review')}
                >
                    <Text style={[styles.tabText, activeTab === 'review' && styles.tabTextActive]}>
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
                            style={styles.statsCard}
                        >
                            <View style={styles.radialContainer}>
                                <Svg width={150} height={150} viewBox="0 0 150 150">
                                    <Defs>
                                        <SvgGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <Stop offset="0%" stopColor="#C9A84C" />
                                            <Stop offset="100%" stopColor="#8A702D" />
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
                                    <Text style={styles.radialNumber}>
                                        {masteryPct}<Text style={styles.radialPercent}>%</Text>
                                    </Text>
                                    <Text style={styles.radialLabel}>Mastery</Text>
                                </View>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{entries.length}</Text>
                                    <Text style={styles.statLabel}>Surahs Tracked</Text>
                                </View>
                                <View style={[styles.statBox, styles.statBoxMiddle]}>
                                    <Text style={styles.statValue}>{memorizedCount}</Text>
                                    <Text style={styles.statLabel}>Memorized</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{totalAyahsTracked}</Text>
                                    <Text style={styles.statLabel}>Ayahs Tracked</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {entries.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="book-open" size={48} color="rgba(201,168,76,0.4)" />
                                <Text style={styles.emptyTitle}>Start Your Hifz Journey</Text>
                                <Text style={styles.emptyDesc}>Tap the + button to add your first surah and begin memorizing with spaced repetition.</Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                                    <Feather name="plus" size={18} color="#FDF8F0" />
                                    <Text style={styles.emptyBtnText}>Add Surah</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {/* Due Today Banner */}
                                {dueEntries.length > 0 && (
                                    <TouchableOpacity style={styles.dueBanner} onPress={() => setActiveTab('review')}>
                                        <View style={styles.dueBannerLeft}>
                                            <Feather name="alert-circle" size={20} color="#E53E3E" />
                                            <Text style={styles.dueBannerText}>
                                                {dueEntries.length} surah{dueEntries.length > 1 ? 's' : ''} due for review
                                            </Text>
                                        </View>
                                        <Feather name="chevron-right" size={18} color="#E53E3E" />
                                    </TouchableOpacity>
                                )}

                                <Text style={styles.sectionTitle}>Your Surahs</Text>
                                <View style={styles.pipeline}>
                                    {entries.map((entry) => (
                                        <View key={entry.surahId} style={styles.surahRow}>
                                            <View style={[styles.surahNumBadge, { backgroundColor: STATUS_COLOR[entry.status] + '20' }]}>
                                                <Text style={[styles.surahNum, { color: STATUS_COLOR[entry.status] }]}>{entry.surahId}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.surahName}>{entry.surahName}</Text>
                                                <Text style={styles.surahSub}>
                                                    {entry.totalAyahs} ayahs · Next: {formatNextReview(entry.nextReview)}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusPill, { borderColor: STATUS_COLOR[entry.status] + '50', backgroundColor: STATUS_COLOR[entry.status] + '15' }]}>
                                                <Text style={[styles.statusPillText, { color: STATUS_COLOR[entry.status] }]}>
                                                    {STATUS_LABEL[entry.status]}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removeEntry(entry.surahId)} style={styles.removeBtn}>
                                                <Feather name="x" size={16} color="#9CA3AF" />
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
                        <View style={styles.srsHeader}>
                            <Feather name="activity" size={40} color="#C9A84C" style={{ marginBottom: 16 }} />
                            <Text style={styles.srsTitle}>Spaced Repetition</Text>
                            <Text style={styles.srsDesc}>
                                SM-2 algorithm calculates the optimal time to review each surah — right before you forget it.
                            </Text>
                        </View>

                        {dueEntries.length === 0 ? (
                            <View style={styles.allDoneBox}>
                                <Text style={styles.allDoneEmoji}>🎉</Text>
                                <Text style={styles.allDoneTitle}>All caught up!</Text>
                                <Text style={styles.allDoneDesc}>No reviews due today. Come back tomorrow to keep your memory sharp.</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.sectionTitle}>Due for Review ({dueEntries.length})</Text>
                                {dueEntries.map((entry) => (
                                    <TouchableOpacity key={entry.surahId} style={styles.reviewCard} onPress={() => startDrill(entry)}>
                                        <LinearGradient
                                            colors={entry.nextReview < today
                                                ? ['rgba(229,62,62,0.08)', 'transparent']
                                                : ['rgba(201,168,76,0.1)', 'transparent']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.reviewRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.reviewSurah}>{entry.surahName}</Text>
                                                <Text style={styles.reviewArabic}>{entry.arabicName}</Text>
                                                <Text style={[
                                                    styles.reviewDue,
                                                    entry.nextReview <= today && { color: '#E53E3E', fontWeight: '700' }
                                                ]}>
                                                    {formatNextReview(entry.nextReview)} · {entry.totalAyahs} ayahs
                                                </Text>
                                            </View>
                                            <TouchableOpacity style={styles.startBtn} onPress={() => startDrill(entry)}>
                                                <Feather name="play" size={16} color="#FDF8F0" />
                                                <Text style={styles.startBtnText}>Start Drill</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.intervalRow}>
                                            <Text style={styles.intervalText}>Interval: {entry.interval}d</Text>
                                            <Text style={styles.intervalText}>EF: {entry.easeFactor.toFixed(2)}</Text>
                                            <Text style={styles.intervalText}>Rep #{entry.repetitions}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                {/* Other surahs not yet due */}
                                {entries.filter(e => e.nextReview > today).length > 0 && (
                                    <>
                                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Upcoming</Text>
                                        {entries.filter(e => e.nextReview > today).map((entry) => (
                                            <View key={entry.surahId} style={[styles.reviewCard, { opacity: 0.6 }]}>
                                                <View style={styles.reviewRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.reviewSurah}>{entry.surahName}</Text>
                                                        <Text style={styles.reviewDue}>{formatNextReview(entry.nextReview)}</Text>
                                                    </View>
                                                    <View style={styles.pendingPill}>
                                                        <Feather name="clock" size={14} color="#9CA3AF" />
                                                        <Text style={styles.pendingText}>Pending</Text>
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
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Surah</Text>
                        <TouchableOpacity onPress={() => { setShowAddModal(false); setAddSearch(''); }}>
                            <Feather name="x" size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalSearch}>
                        <Feather name="search" size={18} color="#9CA3AF" />
                        <TextInput
                            style={styles.modalSearchInput}
                            placeholder="Search surahs..."
                            placeholderTextColor="#9CA3AF"
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
                            <TouchableOpacity style={styles.surahPickerRow} onPress={() => addSurah(item)}>
                                <View style={styles.surahPickerNum}>
                                    <Text style={styles.surahPickerNumText}>{item.id}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.surahPickerName}>{item.name}</Text>
                                    <Text style={styles.surahPickerSub}>{item.ayahs} ayahs</Text>
                                </View>
                                <Text style={styles.surahPickerArabic}>{item.arabic}</Text>
                                <Feather name="plus-circle" size={22} color="#C9A84C" style={{ marginLeft: 12 }} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.modalEmpty}>
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
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    actionButton: {
        width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 20,
    },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '600' },

    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
    tabBtn: {
        flex: 1, paddingVertical: 12, alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.05)',
        flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    tabBtnActive: { borderBottomColor: '#C9A84C' },
    tabText: { color: '#5E5C58', fontSize: 15, fontWeight: '600' },
    tabTextActive: { color: '#C9A84C' },
    badge: {
        backgroundColor: '#E53E3E', borderRadius: 10, minWidth: 18, height: 18,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    scrollContent: { paddingHorizontal: 20 },

    statsCard: {
        borderRadius: 24, padding: 24, marginBottom: 24,
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)', alignItems: 'center',
    },
    radialContainer: {
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, position: 'relative',
    },
    radialTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    radialNumber: { color: '#1A1A1A', fontSize: 36, fontWeight: 'bold' },
    radialPercent: { fontSize: 20, color: '#C9A84C' },
    radialLabel: { color: '#5E5C58', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },

    statsGrid: {
        flexDirection: 'row', width: '100%', justifyContent: 'space-around',
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 20,
    },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxMiddle: {
        borderLeftWidth: 1, borderRightWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    statValue: { color: '#1A1A1A', fontSize: 22, fontWeight: '700', marginBottom: 4 },
    statLabel: { color: '#5E5C58', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },

    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
    emptyTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 10 },
    emptyDesc: { color: '#5E5C58', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#C9A84C', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20,
    },
    emptyBtnText: { color: '#FDF8F0', fontSize: 16, fontWeight: '700' },

    dueBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(229,62,62,0.08)', borderRadius: 14, padding: 14,
        marginBottom: 20, borderWidth: 1, borderColor: 'rgba(229,62,62,0.2)',
    },
    dueBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dueBannerText: { color: '#E53E3E', fontSize: 14, fontWeight: '600' },

    sectionTitle: { color: '#1A1A1A', fontSize: 17, fontWeight: '700', marginBottom: 14 },
    pipeline: { gap: 10, marginBottom: 24 },

    surahRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#FFF', padding: 14, borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    },
    surahNumBadge: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
    },
    surahNum: { fontSize: 13, fontWeight: '700' },
    surahName: { color: '#1A1A1A', fontSize: 15, fontWeight: '600', marginBottom: 3 },
    surahSub: { color: '#9CA3AF', fontSize: 12 },
    statusPill: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    },
    statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    removeBtn: { padding: 4 },

    srsHeader: {
        alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
        marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    },
    srsTitle: { color: '#1A1A1A', fontSize: 22, fontWeight: '700', marginBottom: 10 },
    srsDesc: { color: '#5E5C58', fontSize: 14, textAlign: 'center', lineHeight: 22 },

    allDoneBox: {
        alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24,
    },
    allDoneEmoji: { fontSize: 56, marginBottom: 16 },
    allDoneTitle: { color: '#1A1A1A', fontSize: 22, fontWeight: '700', marginBottom: 10 },
    allDoneDesc: { color: '#5E5C58', fontSize: 15, textAlign: 'center', lineHeight: 24 },

    reviewCard: {
        borderRadius: 16, overflow: 'hidden', borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.25)', marginBottom: 14,
        backgroundColor: '#FFF',
    },
    reviewRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', padding: 18, gap: 12,
    },
    reviewSurah: { color: '#1A1A1A', fontSize: 17, fontWeight: '700', marginBottom: 2 },
    reviewArabic: {
        fontSize: 16, color: '#C9A84C', marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        textAlign: 'left',
    },
    reviewDue: { color: '#5E5C58', fontSize: 13 },
    startBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#C9A84C',
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, gap: 6,
    },
    startBtnText: { color: '#FDF8F0', fontSize: 14, fontWeight: '700' },
    intervalRow: {
        flexDirection: 'row', gap: 16,
        paddingHorizontal: 18, paddingBottom: 12,
    },
    intervalText: { color: '#9CA3AF', fontSize: 11 },
    pendingPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 12,
        paddingVertical: 8, borderRadius: 20,
    },
    pendingText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },

    // Modal
    modalContainer: {
        flex: 1, backgroundColor: '#FDF8F0',
        paddingTop: Platform.OS === 'ios' ? 20 : 0,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    modalTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: '700' },
    modalSearch: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        margin: 16, paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#F3F4F6', borderRadius: 16,
    },
    modalSearchInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
    surahPickerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    surahPickerNum: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(201,168,76,0.12)', alignItems: 'center', justifyContent: 'center',
    },
    surahPickerNumText: { color: '#C9A84C', fontSize: 13, fontWeight: '700' },
    surahPickerName: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
    surahPickerSub: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
    surahPickerArabic: {
        color: '#C9A84C', fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
    modalEmpty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
});
