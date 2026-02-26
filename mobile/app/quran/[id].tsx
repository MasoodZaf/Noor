import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';

// Available styles
const ARABIC_FONTS = [
    { id: 'default', name: 'Premium Naskh (Default)', family: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif' },
    { id: 'uthmani', name: 'Uthmani Script', family: Platform.OS === 'ios' ? 'KFGQPC Uthmanic Script HAFS' : 'serif' },
    { id: 'indopak', name: 'Indo-Pak / Majeedi', family: Platform.OS === 'ios' ? 'Al Nile' : 'monospace' }
];

export default function QuranReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const { language } = useLanguage();

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahInfo, setSurahInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    // Audio Player State
    const soundRef = useRef<Audio.Sound | null>(null);
    const [durationMillis, setDurationMillis] = useState(1);
    const [positionMillis, setPositionMillis] = useState(0);

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    useEffect(() => {
        if (!db || !id) return;

        const loadSurah = async () => {
            try {
                // Fetch Surah Info
                const surah = await db.getFirstAsync('SELECT * FROM surahs WHERE id = ?', [Number(id)]);
                setSurahInfo(surah);

                // Fetch its Ayahs
                const a = await db.getAllAsync('SELECT * FROM ayahs WHERE surah_id = ? ORDER BY ayah_number ASC', [Number(id)]);
                setAyahs(a as any[]);
            } catch (error) {
                console.error("Error fetching Quran data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSurah();

        // Cleanup audio on unmount
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [db, id]);

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPositionMillis(status.positionMillis);
            setDurationMillis(status.durationMillis || 1);
            if (status.didJustFinish) {
                setIsPlaying(false);
                soundRef.current?.setPositionAsync(0);
            }
        }
    };

    const togglePlay = async () => {
        if (!surahInfo) return;

        try {
            if (soundRef.current) {
                if (isPlaying) {
                    await soundRef.current.pauseAsync();
                    setIsPlaying(false);
                } else {
                    await soundRef.current.playAsync();
                    setIsPlaying(true);
                }
            } else {
                // Determine Surah zero-padded ID for Mishary file
                const numStr = String(surahInfo.id).padStart(3, '0');
                const url = `https://server8.mp3quran.net/afs/${numStr}.mp3`;

                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri: url },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );

                soundRef.current = sound;
                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Audio playback error:", error);
        }
    };

    const progressPercentage = (positionMillis / durationMillis) * 100;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Opening Surah...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Top Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color="#C9A84C" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.surahTitle}>{surahInfo?.name_english || 'Al-Fatihah'}</Text>
                    <Text style={styles.surahSubtitle}>{surahInfo?.revelation_type} • {surahInfo?.total_ayahs} Ayahs</Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettings(true)}>
                    <Feather name="settings" size={22} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentArea}
            >
                {/* Bismillah Header (if not Al-Fatihah where it is An Ayah) */}
                {surahInfo?.id !== 1 && surahInfo?.id !== 9 && (
                    <Text style={[styles.bismillahText, { fontFamily: selectedFont.family }]}>
                        بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </Text>
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

                        <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize: fontSize, lineHeight: fontSize * 1.6 }]}>
                            {ayah.text_arabic}
                        </Text>
                        <Text style={[styles.englishText, language === 'urdu' && { fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', fontSize: 18, textAlign: 'right', lineHeight: 32 }]}>
                            {language === 'urdu' ? ayah.text_urdu :
                                language === 'indonesian' ? ayah.text_ind :
                                    language === 'french' ? ayah.text_fra :
                                        language === 'bengali' ? ayah.text_ben :
                                            language === 'turkish' ? ayah.text_tur :
                                                ayah.text_english}
                        </Text>

                        {index < ayahs.length - 1 && <View style={styles.divider} />}
                    </View>
                ))}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Glassmorphic Audio Player floating */}
            <View style={[styles.audioPlayerContainer, { bottom: insets.bottom + 20 }]}>
                <View style={styles.audioPlayerPanel}>
                    <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
                        <Feather name={isPlaying ? "pause" : "play"} size={20} color="#0C0F0E" />
                    </TouchableOpacity>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                        {isPlaying && <View style={[styles.progressThumb, { left: `${progressPercentage}%` }]} />}
                    </View>

                    <View style={styles.reciterInfo}>
                        <Text style={styles.reciterName}>Mishary Al-Afasy</Text>
                        <Text style={styles.playingStatus}>{surahInfo?.name_english}</Text>
                    </View>
                </View>
            </View>

            {/* Settings Modal */}
            <Modal
                transparent={true}
                visible={showSettings}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reading Settings</Text>
                            <TouchableOpacity onPress={() => setShowSettings(false)}>
                                <Feather name="x" size={24} color="#9A9590" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.settingLabel}>Arabic Font Style</Text>
                        <View style={styles.settingsGroup}>
                            {ARABIC_FONTS.map(font => (
                                <TouchableOpacity
                                    key={font.id}
                                    style={[styles.settingOption, selectedFont.id === font.id && styles.settingOptionActive]}
                                    onPress={() => setSelectedFont(font)}
                                >
                                    <Text style={[styles.settingOptionText, selectedFont.id === font.id && { color: '#C9A84C' }]}>
                                        {font.name}
                                    </Text>
                                    {selectedFont.id === font.id && <Feather name="check" size={18} color="#C9A84C" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.settingLabel}>Text Size ({fontSize}pt)</Text>
                        <View style={styles.sizeControlGroup}>
                            <TouchableOpacity style={styles.sizeBtn} onPress={() => setFontSize(Math.max(20, fontSize - 2))}>
                                <Feather name="minus" size={20} color="#E8E6E1" />
                            </TouchableOpacity>
                            <Text style={styles.sizePreviewIndicator}>Aa</Text>
                            <TouchableOpacity style={styles.sizeBtn} onPress={() => setFontSize(Math.min(56, fontSize + 2))}>
                                <Feather name="plus" size={20} color="#E8E6E1" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        color: '#C9A84C',
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
        textAlign: 'right',
        fontWeight: '500',
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
        backgroundColor: 'rgba(25, 30, 28, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#121615',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '600',
    },
    settingLabel: {
        color: '#9A9590',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    settingsGroup: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        marginBottom: 24,
        overflow: 'hidden',
    },
    settingOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    settingOptionActive: {
        backgroundColor: 'rgba(201, 168, 76, 0.05)',
    },
    settingOptionText: {
        color: '#E8E6E1',
        fontSize: 16,
    },
    sizeControlGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
    },
    sizeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizePreviewIndicator: {
        color: '#C9A84C',
        fontSize: 20,
        fontWeight: '500',
    }
});
