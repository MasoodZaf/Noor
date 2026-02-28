import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLanguage } from '../../../context/LanguageContext';

const TAFSEER_META: Record<string, { title: string, author: string, totalVolumes: number }> = {
    'ibn_kathir': { title: 'Tafsir Ibn Kathir', author: 'Isma\'il ibn Kathir', totalVolumes: 10 },
    'jalalayn': { title: 'Tafsir al-Jalalayn', author: 'Al-Mahalli & As-Suyuti', totalVolumes: 1 },
    'sadi': { title: 'Tafsir As-Sa\'di', author: 'Abdur-Rahman as-Sa\'di', totalVolumes: 10 },
    'maarif': { title: 'Ma\'ariful Qur\'an', author: 'Muhammad Shafi Usmani', totalVolumes: 8 },
    'tabari': { title: 'Tafsir al-Tabari', author: 'Muhammad ibn Jarir al-Tabari', totalVolumes: 24 }
};

const AyahTafseerCard = React.memo(({ ayah, index, isLast, meta, surahName, language }: any) => {
    const isFirstInSurah = ayah.ayah_number === 1;
    const [enTafseer, setEnTafseer] = useState<string | null>(null);
    const [urTafseer, setUrTafseer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const loadTafseer = async () => {
        if (enTafseer || urTafseer) {
            setExpanded(!expanded);
            return;
        }

        setExpanded(true);
        setLoading(true);
        try {
            const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

            if (language === 'urdu') {
                const urRes = await fetch(`https://api.quran.com/api/v4/tafsirs/160/by_ayah/${ayah.surah_number}:${ayah.ayah_number}`);
                const urData = await urRes.json();
                setUrTafseer(urData.tafsir ? stripHtml(urData.tafsir.text) : 'تفسیر دستیاب نہیں ہے۔');
            } else {
                const enRes = await fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${ayah.surah_number}:${ayah.ayah_number}`);
                const enData = await enRes.json();
                setEnTafseer(enData.tafsir ? stripHtml(enData.tafsir.text) : 'Tafseer not available.');
            }
        } catch (e) {
            console.error("Fetch error", e);
            if (language === 'urdu') {
                setUrTafseer('ایرر');
            } else {
                setEnTafseer('Error loading Tafseer.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.tafseerBlock}>
            {isFirstInSurah && (
                <View style={styles.introHeader}>
                    <Text style={styles.introSurah}>Surah {surahName}</Text>
                    <Text style={styles.introDesc}>Chapter {ayah.surah_number}</Text>
                </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={[styles.ayahIndicator, { marginBottom: 0 }]}>
                    <Text style={styles.ayahIndicatorText}>AYAH {ayah.ayah_number}</Text>
                </View>

                <TouchableOpacity onPress={loadTafseer} style={styles.readTafseerBtn}>
                    <Text style={styles.readTafseerTxt}>{expanded ? 'Hide Exegesis' : 'Read Exegesis'}</Text>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#C9A84C" />
                </TouchableOpacity>
            </View>

            <LinearGradient
                colors={['rgba(255,255,255,0.03)', 'transparent']}
                style={styles.ayahContainer}
            >
                <Text style={styles.arabicText}>{ayah.text_arabic}</Text>
                {language === 'urdu' ? (
                    <Text style={[styles.translationText, { textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', fontStyle: 'normal', fontSize: 18, lineHeight: 30 }]}>{ayah.text_urdu}</Text>
                ) : (
                    <Text style={styles.translationText}>{ayah.text_english}</Text>
                )}
            </LinearGradient>

            {expanded && (
                <View style={styles.tafseerBody}>
                    <View style={styles.quoteBar} />
                    <View style={{ flex: 1 }}>
                        {loading ? (
                            <ActivityIndicator color="#C9A84C" style={{ alignSelf: 'flex-start', marginVertical: 20 }} />
                        ) : (
                            <>
                                {language === 'urdu' ? (
                                    <Text style={[styles.tafseerText, { textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', fontSize: 18, lineHeight: 30 }]}>
                                        <Text style={{ fontWeight: 'bold', color: '#C9A84C' }}>[{meta.author} - اردو] </Text>
                                        {urTafseer}
                                    </Text>
                                ) : (
                                    <Text style={styles.tafseerText}>
                                        <Text style={{ fontWeight: 'bold', color: '#C9A84C' }}>[{meta.author}] </Text>
                                        {enTafseer}
                                    </Text>
                                )}
                            </>
                        )}
                    </View>
                </View>
            )}

            {!isLast && <View style={styles.divider} />}
        </View>
    );
});

export default function TafseerReadScreen() {
    const { book, volume } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahMap, setSurahMap] = useState<Record<number, string>>({});

    const tafseerId = typeof book === 'string' ? book : 'ibn_kathir';
    const volumeIndex = typeof volume === 'string' ? parseInt(volume, 10) : 1;
    const meta = TAFSEER_META[tafseerId] || TAFSEER_META['ibn_kathir'];

    useEffect(() => {
        if (!db) return;

        const loadVolumeData = async () => {
            try {
                const surahsPerVol = Math.ceil(114 / meta.totalVolumes);
                const startSurah = (volumeIndex - 1) * surahsPerVol + 1;
                const endSurah = Math.min(startSurah + surahsPerVol - 1, 114);

                const surahsData: any[] = await db.getAllAsync(
                    'SELECT number, name_english FROM surahs WHERE number >= ? AND number <= ?',
                    [startSurah, endSurah]
                );

                const map: Record<number, string> = {};
                surahsData.forEach(s => { map[s.number] = s.name_english; });
                setSurahMap(map);

                const volumeAyahs: any[] = await db.getAllAsync(
                    'SELECT * FROM ayahs WHERE surah_number >= ? AND surah_number <= ? ORDER BY surah_number ASC, ayah_number ASC',
                    [startSurah, endSurah]
                );

                setAyahs(volumeAyahs);
            } catch (error) {
                console.error("Error loading tafseer volume:", error);
            } finally {
                setLoading(false);
            }
        };
        loadVolumeData();
    }, [db, tafseerId, volumeIndex]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{meta.title}</Text>
                    <Text style={styles.headerSubtitle}>VOLUME {volumeIndex} • SURAH {ayahs[0]?.surah_number || 1}-{ayahs[ayahs.length - 1]?.surah_number || 1}</Text>
                </View>
                <TouchableOpacity style={styles.actionButton}>
                    <Feather name="bookmark" size={22} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#C9A84C" />
                    <Text style={{ color: '#9A9590', marginTop: 16 }}>Compiling Volume {volumeIndex}...</Text>
                </View>
            ) : (
                <FlatList
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentArea}
                    data={ayahs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <AyahTafseerCard
                            ayah={item}
                            index={index}
                            isLast={index === ayahs.length - 1}
                            meta={meta}
                            surahName={surahMap[item.surah_number]}
                            language={language}
                        />
                    )}
                    ListFooterComponent={
                        <View style={styles.completionBlock}>
                            <Feather name="check-circle" size={32} color="#C9A84C" />
                            <Text style={styles.completionText}>End of Volume {volumeIndex}</Text>
                            <View style={{ height: 100 }} />
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    actionButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -10,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#C9A84C',
        fontSize: 11,
        marginTop: 4,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    contentArea: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 60,
    },
    introHeader: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
        paddingBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(201, 168, 76, 0.1)',
    },
    introSurah: {
        color: '#C9A84C',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    introDesc: {
        color: '#9A9590',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    tafseerBlock: {
        marginBottom: 10,
    },
    ayahIndicator: {
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
        marginBottom: 20,
    },
    ayahIndicatorText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    readTafseerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    readTafseerTxt: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginRight: 6,
    },
    ayahContainer: {
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 24,
    },
    arabicText: {
        color: '#E8E6E1',
        fontSize: 28,
        lineHeight: 46,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 16,
    },
    translationText: {
        color: '#9A9590',
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    tafseerBody: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    quoteBar: {
        width: 3,
        backgroundColor: '#C9A84C',
        borderRadius: 1.5,
        marginRight: 20,
    },
    tafseerText: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 16,
        lineHeight: 28,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginVertical: 30,
    },
    completionBlock: {
        alignItems: 'center',
        paddingVertical: 40,
        marginTop: 20,
        backgroundColor: 'rgba(201, 168, 76, 0.02)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
    },
    completionText: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    }
});
