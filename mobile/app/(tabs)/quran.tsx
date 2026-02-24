import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ── Data ────────────────────────────────────────────────────────────
interface Surah {
    number: number;
    nameArabic: string;
    nameEnglish: string;
    nameTransliteration: string;
    revelationType: 'Meccan' | 'Medinan';
    ayahCount: number;
}

interface Ayah {
    number: number;
    textArabic: string;
    textEnglish: string;
}

// First 10 Surahs with basic data (will be loaded from SQLite in production)
const SURAHS: Surah[] = [
    { number: 1, nameArabic: 'الفاتحة', nameEnglish: 'The Opening', nameTransliteration: 'Al-Fatiha', revelationType: 'Meccan', ayahCount: 7 },
    { number: 2, nameArabic: 'البقرة', nameEnglish: 'The Cow', nameTransliteration: 'Al-Baqarah', revelationType: 'Medinan', ayahCount: 286 },
    { number: 3, nameArabic: 'آل عمران', nameEnglish: 'Family of Imran', nameTransliteration: 'Ali Imran', revelationType: 'Medinan', ayahCount: 200 },
    { number: 4, nameArabic: 'النساء', nameEnglish: 'The Women', nameTransliteration: 'An-Nisa', revelationType: 'Medinan', ayahCount: 176 },
    { number: 5, nameArabic: 'المائدة', nameEnglish: 'The Table', nameTransliteration: 'Al-Ma\'idah', revelationType: 'Medinan', ayahCount: 120 },
    { number: 6, nameArabic: 'الأنعام', nameEnglish: 'The Cattle', nameTransliteration: 'Al-An\'am', revelationType: 'Meccan', ayahCount: 165 },
    { number: 7, nameArabic: 'الأعراف', nameEnglish: 'The Heights', nameTransliteration: 'Al-A\'raf', revelationType: 'Meccan', ayahCount: 206 },
    { number: 8, nameArabic: 'الأنفال', nameEnglish: 'The Spoils of War', nameTransliteration: 'Al-Anfal', revelationType: 'Medinan', ayahCount: 75 },
    { number: 9, nameArabic: 'التوبة', nameEnglish: 'The Repentance', nameTransliteration: 'At-Tawbah', revelationType: 'Medinan', ayahCount: 129 },
    { number: 10, nameArabic: 'يونس', nameEnglish: 'Jonah', nameTransliteration: 'Yunus', revelationType: 'Meccan', ayahCount: 109 },
    { number: 36, nameArabic: 'يس', nameEnglish: 'Ya-Sin', nameTransliteration: 'Ya-Sin', revelationType: 'Meccan', ayahCount: 83 },
    { number: 55, nameArabic: 'الرحمن', nameEnglish: 'The Most Merciful', nameTransliteration: 'Ar-Rahman', revelationType: 'Medinan', ayahCount: 78 },
    { number: 56, nameArabic: 'الواقعة', nameEnglish: 'The Event', nameTransliteration: 'Al-Waqi\'ah', revelationType: 'Meccan', ayahCount: 96 },
    { number: 67, nameArabic: 'الملك', nameEnglish: 'The Sovereignty', nameTransliteration: 'Al-Mulk', revelationType: 'Meccan', ayahCount: 30 },
    { number: 112, nameArabic: 'الإخلاص', nameEnglish: 'Sincerity', nameTransliteration: 'Al-Ikhlas', revelationType: 'Meccan', ayahCount: 4 },
    { number: 113, nameArabic: 'الفلق', nameEnglish: 'The Daybreak', nameTransliteration: 'Al-Falaq', revelationType: 'Meccan', ayahCount: 5 },
    { number: 114, nameArabic: 'الناس', nameEnglish: 'Mankind', nameTransliteration: 'An-Nas', revelationType: 'Meccan', ayahCount: 6 },
];

// Surah Al-Fatiha ayahs (sample data — will load from SQLite)
const AL_FATIHA: Ayah[] = [
    { number: 1, textArabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', textEnglish: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
    { number: 2, textArabic: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', textEnglish: 'All praise is due to Allah, Lord of the worlds.' },
    { number: 3, textArabic: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', textEnglish: 'The Entirely Merciful, the Especially Merciful.' },
    { number: 4, textArabic: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', textEnglish: 'Sovereign of the Day of Recompense.' },
    { number: 5, textArabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', textEnglish: 'It is You we worship and You we ask for help.' },
    { number: 6, textArabic: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', textEnglish: 'Guide us to the straight path.' },
    { number: 7, textArabic: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', textEnglish: 'The path of those upon whom You have bestowed favor, not of those who have earned Your anger or of those who are astray.' },
];

const AL_IKHLAS: Ayah[] = [
    { number: 1, textArabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', textEnglish: 'Say, "He is Allah, the One."' },
    { number: 2, textArabic: 'ٱللَّهُ ٱلصَّمَدُ', textEnglish: 'Allah, the Eternal Refuge.' },
    { number: 3, textArabic: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', textEnglish: 'He neither begets nor is born.' },
    { number: 4, textArabic: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', textEnglish: 'Nor is there to Him any equivalent.' },
];

// Map available ayahs by surah number
const AYAH_DATA: Record<number, Ayah[]> = {
    1: AL_FATIHA,
    112: AL_IKHLAS,
};

type ScreenView = 'list' | 'reader';

// ── Component ──────────────────────────────────────────────────────
export default function QuranScreen() {
    const insets = useSafeAreaInsets();
    const [view, setView] = useState<ScreenView>('list');
    const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const ayahs = selectedSurah ? AYAH_DATA[selectedSurah.number] || null : null;

    const openSurah = (surah: Surah) => {
        setSelectedSurah(surah);
        setView('reader');
    };

    const goBack = () => {
        setView('list');
        setSelectedSurah(null);
        setIsPlaying(false);
    };

    // ── Surah List View ──
    if (view === 'list') {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Quran</Text>
                    <Text style={styles.listSubtitle}>The Noble Quran</Text>
                </View>

                <FlatList
                    data={SURAHS}
                    keyExtractor={(item) => item.number.toString()}
                    contentContainerStyle={styles.surahList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.surahRow}
                            onPress={() => openSurah(item)}
                            activeOpacity={0.6}
                        >
                            <View style={styles.surahNumber}>
                                <Text style={styles.surahNumberText}>{item.number}</Text>
                            </View>
                            <View style={styles.surahInfo}>
                                <Text style={styles.surahTranslit}>{item.nameTransliteration}</Text>
                                <Text style={styles.surahEnglish}>
                                    {item.nameEnglish} · {item.ayahCount} ayahs
                                </Text>
                            </View>
                            <Text style={styles.surahArabic}>{item.nameArabic}</Text>
                        </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            </View>
        );
    }

    // ── Surah Reader View ──
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Top Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={goBack}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <Text style={styles.surahTitle}>
                    {selectedSurah?.nameTransliteration || 'Quran'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Ayah Content */}
            {ayahs ? (
                <ScrollView
                    style={styles.readerScroll}
                    contentContainerStyle={styles.readerContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Bismillah header for all surahs except At-Tawbah (9) */}
                    {selectedSurah?.number !== 9 && selectedSurah?.number !== 1 && (
                        <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
                    )}

                    {ayahs.map((ayah) => (
                        <View key={ayah.number} style={styles.ayahCard}>
                            <View style={styles.ayahNumberBadge}>
                                <Text style={styles.ayahNumberText}>{ayah.number}</Text>
                            </View>
                            <Text style={styles.arabicText}>{ayah.textArabic}</Text>
                            <Text style={styles.englishText}>{ayah.textEnglish}</Text>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={styles.comingSoon}>
                    <Feather name="book-open" size={48} color="#5E5C58" />
                    <Text style={styles.comingSoonText}>
                        {selectedSurah?.nameTransliteration} content will be available once the database is connected.
                    </Text>
                    <Text style={styles.comingSoonSub}>
                        {selectedSurah?.ayahCount} ayahs · {selectedSurah?.revelationType}
                    </Text>
                </View>
            )}

            {/* Audio Player */}
            <View style={[styles.audioPlayerContainer, { marginBottom: 20 }]}>
                <View style={styles.audioPlayerPanel}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => setIsPlaying(!isPlaying)}
                    >
                        <Feather
                            name={isPlaying ? 'pause' : 'play'}
                            size={20}
                            color="#C9A84C"
                        />
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={styles.progressFill} />
                        <View style={styles.progressThumb} />
                    </View>

                    <View style={styles.reciterInfo}>
                        <Text style={styles.reciterName}>Mishary Al-Afasy</Text>
                    </View>
                </View>
            </View>

        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },

    // ── Surah List ──
    listHeader: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    listTitle: {
        color: '#E8E6E1',
        fontSize: 28,
        fontWeight: '300',
        letterSpacing: 0.5,
    },
    listSubtitle: {
        color: '#5E5C58',
        fontSize: 13,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    surahList: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    surahRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    surahNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    surahNumberText: {
        color: '#9A9590',
        fontSize: 13,
        fontWeight: '500',
    },
    surahInfo: {
        flex: 1,
    },
    surahTranslit: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    surahEnglish: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 3,
    },
    surahArabic: {
        color: '#9A9590',
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },

    // ── Reader ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    surahTitle: {
        color: '#C9A84C',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    readerScroll: {
        flex: 1,
    },
    readerContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    bismillah: {
        color: '#C9A84C',
        fontSize: 28,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif',
        marginBottom: 32,
        lineHeight: 48,
    },
    ayahCard: {
        marginBottom: 32,
        alignItems: 'center',
    },
    ayahNumberBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    ayahNumberText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: '600',
    },
    arabicText: {
        color: '#E8E6E1',
        fontSize: 32,
        lineHeight: 56,
        textAlign: 'center',
        fontWeight: '400',
        fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif',
        marginBottom: 16,
    },
    englishText: {
        color: '#9A9590',
        fontSize: 16,
        lineHeight: 26,
        textAlign: 'center',
        fontWeight: '400',
    },
    comingSoon: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    comingSoonText: {
        color: '#9A9590',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 24,
    },
    comingSoonSub: {
        color: '#5E5C58',
        fontSize: 13,
        marginTop: 8,
    },

    // ── Audio Player ──
    audioPlayerContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    audioPlayerPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
        borderRadius: 30,
        paddingVertical: 14,
        paddingHorizontal: 20,
        width: '100%',
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(201, 168, 76, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
        borderRadius: 2,
        position: 'relative',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '0%',
        backgroundColor: '#C9A84C',
        borderRadius: 2,
    },
    progressThumb: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#C9A84C',
        position: 'absolute',
        left: '0%',
        marginLeft: -4,
    },
    reciterInfo: {
        alignItems: 'flex-end',
    },
    reciterName: {
        color: '#E8E6E1',
        fontSize: 12,
        fontWeight: '500',
    },
});
