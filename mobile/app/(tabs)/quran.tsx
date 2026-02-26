import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';

export default function QuranScreen() {
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahInfo, setSurahInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    // Initial Load - Let's load Surah Al-Fatihah from our bundled SQLite SQLite
    useEffect(() => {
        if (!db) return;

        const loadSurah = async () => {
            try {
                // Fetch Surah Info
                const surah = await db.getFirstAsync('SELECT * FROM surahs WHERE id = 1');
                setSurahInfo(surah);

                // Fetch its Ayahs
                const a = await db.getAllAsync('SELECT * FROM ayahs WHERE surah_id = 1 ORDER BY ayah_number ASC');
                setAyahs(a as any[]);
            } catch (error) {
                console.error("Error fetching Quran data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSurah();
    }, [db]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Opening Offline Mushaf...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Top Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.surahTitle}>{surahInfo?.name_english || 'Al-Fatihah'}</Text>
                    <Text style={styles.surahSubtitle}>{surahInfo?.revelation_type} • {surahInfo?.total_ayahs} Ayahs</Text>
                </View>
                <TouchableOpacity style={styles.actionButton}>
                    <Feather name="menu" size={24} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentArea}
            >
                {/* Bismillah Header (if not Al-Fatihah where it is An Ayah) */}
                {surahInfo?.id !== 1 && (
                    <Text style={styles.bismillahText}>بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</Text>
                )}

                {ayahs.map((ayah, index) => (
                    <View key={ayah.id} style={styles.ayahContainer}>
                        <View style={styles.ayahHeader}>
                            <View style={styles.ayahNumberBadge}>
                                <Text style={styles.ayahNumberText}>{ayah.ayah_number}</Text>
                            </View>
                            <View style={styles.ayahActions}>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Feather name="bookmark" size={16} color="#9A9590" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Feather name="copy" size={16} color="#9A9590" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn}>
                                    <Feather name="play-circle" size={16} color="#9A9590" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.arabicText}>{ayah.text_arabic}</Text>
                        <Text style={styles.englishText}>{ayah.text_english}</Text>

                        {index < ayahs.length - 1 && <View style={styles.divider} />}
                    </View>
                ))}

                {/* Spacer for audio player */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Glassmorphic Audio Player floating above tab bar */}
            <View style={[styles.audioPlayerContainer, { marginBottom: 20 }]}>
                <View style={styles.audioPlayerPanel}>
                    <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
                        <Feather name={isPlaying ? "pause" : "play"} size={20} color="#0C0F0E" />
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: isPlaying ? '45%' : '0%' }]} />
                        {isPlaying && <View style={[styles.progressThumb, { left: '45%' }]} />}
                    </View>

                    <View style={styles.reciterInfo}>
                        <Text style={styles.reciterName}>Mishary Al-Afasy</Text>
                        <Text style={styles.playingStatus}>{surahInfo?.name_english}</Text>
                    </View>
                </View>
            </View>

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
    surahTitle: {
        color: '#C9A84C', // Premium Gold
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    surahSubtitle: {
        color: '#9A9590',
        fontSize: 12,
        marginTop: 2,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    contentArea: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 60,
    },
    bismillahText: {
        color: '#C9A84C',
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 40,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    },
    ayahContainer: {
        marginBottom: 30,
    },
    ayahHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    ayahNumberBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    ayahNumberText: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: 'bold',
    },
    ayahActions: {
        flexDirection: 'row',
        gap: 16,
    },
    iconBtn: {
        padding: 4,
    },
    arabicText: {
        color: '#E8E6E1',
        fontSize: 32,
        lineHeight: 52,
        textAlign: 'right',
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 20,
    },
    englishText: {
        color: '#9A9590',
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '400',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginTop: 30,
    },
    audioPlayerContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    audioPlayerPanel: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(25, 30, 28, 0.95)', // Solid dark with slight tint
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)', // Gold border
        borderRadius: 40,
        paddingVertical: 12,
        paddingHorizontal: 16,
        width: '100%',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#C9A84C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressTrack: {
        flex: 1,
        height: 4,
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
        backgroundColor: '#C9A84C',
        borderRadius: 2,
    },
    progressThumb: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#C9A84C',
        position: 'absolute',
        marginLeft: -6,
        shadowColor: '#C9A84C',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    reciterInfo: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 44,
    },
    reciterName: {
        color: '#E8E6E1',
        fontSize: 13,
        fontWeight: '600',
    },
    playingStatus: {
        color: '#C9A84C',
        fontSize: 10,
        marginTop: 2,
    }
});
