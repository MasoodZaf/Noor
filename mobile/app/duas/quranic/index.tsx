import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { QURANIC_CATEGORIES, RECOMMENDED_SURAHS } from '../../../data/quranicDuas';

export default function QuranicDuasIndex() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { language } = useLanguage();
    const isUrdu = language === 'urdu';

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/duas' as any);
                    }}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>Mustanad</Text>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Quranic Duas</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.intro, { color: theme.textSecondary }]}>
                    Authentic duas directly from the Quran — for guidance, hardship, rizq, and protection.
                </Text>

                <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>CATEGORIES</Text>

                <View style={styles.grid}>
                    {QURANIC_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/duas/quranic/${cat.id}` as any)}
                            accessibilityRole="button"
                            accessibilityLabel={`${cat.title}, ${cat.duas.length} duas`}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: cat.accent + '22' }]}>
                                <Feather name={cat.icon} size={20} color={cat.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>
                                    {isUrdu ? cat.titleUr : cat.title}
                                </Text>
                                <Text style={[styles.categorySubtitle, { color: theme.textTertiary }]}>
                                    {cat.duas.length} {cat.duas.length === 1 ? 'dua' : 'duas'} · {cat.subtitle}
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={theme.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { color: theme.textTertiary, marginTop: 32 }]}>BEST SURAHS FOR DAILY RECITATION</Text>

                <View style={styles.grid}>
                    {RECOMMENDED_SURAHS.map((s) => (
                        <TouchableOpacity
                            key={s.surah}
                            style={[styles.surahCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/duas/quranic/surah/${s.surah}` as any)}
                            accessibilityRole="button"
                            accessibilityLabel={`Open Surah ${s.name}`}
                        >
                            <View style={styles.surahRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.surahName, { color: theme.textPrimary }]}>{s.name}</Text>
                                    <Text style={[styles.surahTiming, { color: theme.gold }]}>{s.timing}</Text>
                                    <Text style={[styles.surahNote, { color: theme.textTertiary }]}>{s.note}</Text>
                                </View>
                                <Text style={[styles.surahArabic, { color: theme.gold }]}>{s.arabicName}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    backBtn: { width: 44, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
    headerTitle: { fontSize: 22, fontFamily: fonts.serifBold, letterSpacing: -0.3 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    intro: { fontSize: 14, lineHeight: 22, marginTop: 4, marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
    grid: { gap: 10 },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        gap: 14,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    categorySubtitle: { fontSize: 12.5, fontWeight: '500' },
    surahCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    surahRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    surahName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    surahTiming: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
    surahNote: { fontSize: 12.5, lineHeight: 17 },
    surahArabic: { fontSize: 22, fontWeight: '600' },
});
