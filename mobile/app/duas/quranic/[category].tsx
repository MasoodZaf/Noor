import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useTranslatedTexts } from '../../../utils/translateText';
import type { Language } from '../../../utils/language';
import { getCategory } from '../../../data/quranicDuas';

export default function QuranicDuaCategoryScreen() {
    const router = useRouter();
    const { category } = useLocalSearchParams<{ category: string }>();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { language } = useLanguage();
    const isUrdu = language === 'urdu';

    const cat = useMemo(() => (category ? getCategory(category) : undefined), [category]);

    // Translation strategy:
    //  - English: use the English source as-is.
    //  - Urdu: prefer hand-curated translationUr; fall back to Google Translate
    //    so long Quran passages without seeded Urdu (Ayat-ul-Kursi etc.) still
    //    render in Urdu instead of English.
    //  - Other languages: always translate the English source.
    const sources = useMemo(
        () => (cat ? cat.duas.map(d => d.translationEn) : []),
        [cat],
    );
    const translated = useTranslatedTexts(sources, language as Language);

    if (!cat) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: theme.textSecondary }}>Category not found.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/duas/quranic' as any);
                    }}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerEyebrow, { color: theme.textSecondary }]}>Quranic Duas</Text>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        {isUrdu ? cat.titleUr : cat.title}
                    </Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {cat.duas.map((dua, idx) => {
                    const finalTranslation =
                        language === 'english'
                            ? dua.translationEn
                            : language === 'urdu'
                                ? (dua.translationUr ?? translated[idx] ?? dua.translationEn)
                                : (translated[idx] ?? dua.translationEn);

                    return (
                        <View
                            key={dua.id}
                            style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.duaTitle, { color: theme.textPrimary }]}>{dua.title}</Text>
                                    <Text style={[styles.duaReference, { color: theme.gold }]}>{dua.reference}</Text>
                                </View>
                                {dua.surah != null && (
                                    <TouchableOpacity
                                        onPress={() => router.push(`/duas/quranic/surah/${dua.surah}` as any)}
                                        style={[styles.openBtn, { borderColor: theme.border, backgroundColor: theme.bgSecondary }]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open Surah ${dua.surah}`}
                                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    >
                                        <Feather name="book-open" size={13} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text
                                style={[styles.arabic, { color: theme.textPrimary }]}
                                accessibilityLabel="Arabic text"
                            >
                                {dua.arabic}
                            </Text>

                            <Text style={[styles.transliteration, { color: theme.textTertiary }]}>
                                {dua.transliteration}
                            </Text>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <Text
                                style={[
                                    styles.translation,
                                    { color: theme.textSecondary },
                                    isUrdu && styles.translationUrdu,
                                ]}
                            >
                                {finalTranslation}
                            </Text>

                            <View style={[styles.useBox, { backgroundColor: theme.accentLight }]}>
                                <Feather name="bookmark" size={12} color={theme.gold} style={{ marginRight: 6 }} />
                                <Text style={[styles.useText, { color: theme.textSecondary }]} numberOfLines={3}>
                                    {dua.use}
                                </Text>
                            </View>
                        </View>
                    );
                })}

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
    card: {
        padding: 18,
        borderRadius: 22,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    duaTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
    duaReference: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
    openBtn: {
        width: 32, height: 32, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, marginLeft: 8,
    },
    arabic: {
        fontFamily: fonts.arabic,
        fontSize: 26,
        lineHeight: 48,
        textAlign: 'right',
        writingDirection: 'rtl',
        includeFontPadding: false,
        marginBottom: 8,
    },
    transliteration: {
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 20,
        marginBottom: 12,
    },
    divider: { height: 1, marginBottom: 12 },
    translation: {
        fontSize: 14.5,
        lineHeight: 23,
        marginBottom: 14,
    },
    translationUrdu: {
        fontFamily: Platform.OS === 'ios' ? 'NotoNastaliqUrdu_400Regular' : 'NotoNastaliqUrdu_400Regular',
        fontSize: 17,
        lineHeight: 38,
        textAlign: 'right',
        writingDirection: 'rtl',
        includeFontPadding: false,
    },
    useBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    useText: { fontSize: 12.5, fontWeight: '600', flex: 1, lineHeight: 17 },
});
