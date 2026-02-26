import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
import { useLocalSearchParams, useRouter } from 'expo-router';

const ARABIC_FONTS = [
    { id: 'default', name: 'Premium Naskh (Default)', family: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif' },
    { id: 'uthmani', name: 'Uthmani Script', family: Platform.OS === 'ios' ? 'KFGQPC Uthmanic Script HAFS' : 'serif' },
    { id: 'indopak', name: 'Indo-Pak / Majeedi', family: Platform.OS === 'ios' ? 'Al Nile' : 'monospace' }
];

const JUZ_BOUNDARIES = [
    { juz: 1, start: { surah: 1, ayah: 1 }, end: { surah: 2, ayah: 141 } },
    { juz: 2, start: { surah: 2, ayah: 142 }, end: { surah: 2, ayah: 252 } },
    { juz: 3, start: { surah: 2, ayah: 253 }, end: { surah: 3, ayah: 92 } },
    { juz: 4, start: { surah: 3, ayah: 93 }, end: { surah: 4, ayah: 23 } },
    { juz: 5, start: { surah: 4, ayah: 24 }, end: { surah: 4, ayah: 147 } },
    { juz: 6, start: { surah: 4, ayah: 148 }, end: { surah: 5, ayah: 81 } },
    { juz: 7, start: { surah: 5, ayah: 82 }, end: { surah: 6, ayah: 110 } },
    { juz: 8, start: { surah: 6, ayah: 111 }, end: { surah: 7, ayah: 87 } },
    { juz: 9, start: { surah: 7, ayah: 88 }, end: { surah: 8, ayah: 40 } },
    { juz: 10, start: { surah: 8, ayah: 41 }, end: { surah: 9, ayah: 92 } },
    { juz: 11, start: { surah: 9, ayah: 93 }, end: { surah: 11, ayah: 5 } },
    { juz: 12, start: { surah: 11, ayah: 6 }, end: { surah: 12, ayah: 52 } },
    { juz: 13, start: { surah: 12, ayah: 53 }, end: { surah: 14, ayah: 52 } },
    { juz: 14, start: { surah: 15, ayah: 1 }, end: { surah: 16, ayah: 128 } },
    { juz: 15, start: { surah: 17, ayah: 1 }, end: { surah: 18, ayah: 74 } },
    { juz: 16, start: { surah: 18, ayah: 75 }, end: { surah: 20, ayah: 135 } },
    { juz: 17, start: { surah: 21, ayah: 1 }, end: { surah: 22, ayah: 78 } },
    { juz: 18, start: { surah: 23, ayah: 1 }, end: { surah: 25, ayah: 20 } },
    { juz: 19, start: { surah: 25, ayah: 21 }, end: { surah: 27, ayah: 55 } },
    { juz: 20, start: { surah: 27, ayah: 56 }, end: { surah: 29, ayah: 45 } },
    { juz: 21, start: { surah: 29, ayah: 46 }, end: { surah: 33, ayah: 30 } },
    { juz: 22, start: { surah: 33, ayah: 31 }, end: { surah: 36, ayah: 27 } },
    { juz: 23, start: { surah: 36, ayah: 28 }, end: { surah: 39, ayah: 31 } },
    { juz: 24, start: { surah: 39, ayah: 32 }, end: { surah: 41, ayah: 46 } },
    { juz: 25, start: { surah: 41, ayah: 47 }, end: { surah: 45, ayah: 37 } },
    { juz: 26, start: { surah: 46, ayah: 1 }, end: { surah: 51, ayah: 30 } },
    { juz: 27, start: { surah: 51, ayah: 31 }, end: { surah: 57, ayah: 29 } },
    { juz: 28, start: { surah: 58, ayah: 1 }, end: { surah: 66, ayah: 12 } },
    { juz: 29, start: { surah: 67, ayah: 1 }, end: { surah: 77, ayah: 50 } },
    { juz: 30, start: { surah: 78, ayah: 1 }, end: { surah: 114, ayah: 6 } }
];

export default function JuzReaderScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();

    const [ayahs, setAyahs] = useState<any[]>([]);
    const [surahMap, setSurahMap] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFont, setSelectedFont] = useState(ARABIC_FONTS[0]);
    const [fontSize, setFontSize] = useState(32);

    useEffect(() => {
        if (!db || !id) return;

        const loadJuz = async () => {
            try {
                const juzId = Number(id);
                const boundary = JUZ_BOUNDARIES.find(j => j.juz === juzId);
                if (!boundary) {
                    setLoading(false);
                    return;
                }

                // Load surahs for mapping names
                const surahsData: any[] = await db.getAllAsync('SELECT id, name_english FROM surahs WHERE id >= ? AND id <= ?', [boundary.start.surah, boundary.end.surah]);
                const map: Record<number, string> = {};
                surahsData.forEach(s => {
                    map[s.id] = s.name_english;
                });
                setSurahMap(map);

                // Load ayahs in the boundary
                const allAyahs: any[] = await db.getAllAsync(
                    'SELECT * FROM ayahs WHERE surah_id >= ? AND surah_id <= ? ORDER BY surah_id ASC, ayah_number ASC',
                    [boundary.start.surah, boundary.end.surah]
                );

                // Filter the edge surah ayahs
                const filtered = allAyahs.filter(a => {
                    if (a.surah_id === boundary.start.surah && a.ayah_number < boundary.start.ayah) return false;
                    if (a.surah_id === boundary.end.surah && a.ayah_number > boundary.end.ayah) return false;
                    return true;
                });

                setAyahs(filtered);
            } catch (error) {
                console.error("Error fetching Juz:", error);
            } finally {
                setLoading(false);
            }
        };

        loadJuz();
    }, [db, id]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Opening Juz {id}...</Text>
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
                    <Text style={styles.surahTitle}>Juz {id}</Text>
                    <Text style={styles.surahSubtitle}>{ayahs.length} Ayahs</Text>
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
                {ayahs.map((ayah, index) => {
                    const isFirstInSurah = ayah.ayah_number === 1;
                    return (
                        <View key={ayah.id}>
                            {/* Surah Header if it's the beginning of a Surah within this Juz */}
                            {isFirstInSurah && (
                                <View style={styles.surahDivider}>
                                    <Text style={styles.surahDividerText}>Surah {surahMap[ayah.surah_id]}</Text>
                                    {ayah.surah_id !== 1 && ayah.surah_id !== 9 && (
                                        <Text style={[styles.bismillahText, { fontFamily: selectedFont.family }]}>
                                            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                        </Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.ayahContainer}>
                                <View style={styles.ayahHeader}>
                                    <View style={styles.ayahNumberBadge}>
                                        <Text style={styles.ayahNumberText}>{ayah.ayah_number}</Text>
                                    </View>
                                    <View style={styles.ayahActions}>
                                        <Text style={styles.ayahSurahOrigin}>{surahMap[ayah.surah_id]}</Text>
                                    </View>
                                </View>

                                <Text style={[styles.arabicText, { fontFamily: selectedFont.family, fontSize: fontSize, lineHeight: fontSize * 1.6 }]}>
                                    {ayah.text_arabic}
                                </Text>
                                <Text style={styles.englishText}>{ayah.text_english}</Text>

                                {index < ayahs.length - 1 && <View style={styles.divider} />}
                            </View>
                        </View>
                    );
                })}

                <View style={{ height: 120 }} />
            </ScrollView>

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
    surahDivider: {
        alignItems: 'center',
        marginVertical: 30,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
        backgroundColor: 'rgba(201, 168, 76, 0.02)',
        borderRadius: 16,
    },
    surahDividerText: {
        color: '#C9A84C',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    bismillahText: {
        color: '#E8E6E1',
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
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
    ayahSurahOrigin: {
        color: '#5E5C58',
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
