import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { useRouter } from 'expo-router';

const POPULAR_TAFSEERS = [
    { id: 'ibn_kathir', title: 'Tafsir Ibn Kathir', author: 'Isma\'il ibn Kathir', desc: 'Highly regarded, widely used classical tafsir.' },
    { id: 'jalalayn', title: 'Tafsir al-Jalalayn', author: 'Al-Mahalli & As-Suyuti', desc: 'Concise and brief, excellent for beginners.' },
    { id: 'sadi', title: 'Tafsir As-Sa\'di', author: 'Abdur-Rahman as-Sa\'di', desc: 'Clear, modern, and easy to understand.' },
    { id: 'maarif', title: 'Ma\'ariful Qur\'an', author: 'Muhammad Shafi Usmani', desc: 'Detailed and widely used in South Asia.' },
    { id: 'tabari', title: 'Tafsir al-Tabari', author: 'Muhammad ibn Jarir al-Tabari', desc: 'Classical, comprehensive, and historically significant.' }
];

export default function QuranIndexScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabase();

    const [surahs, setSurahs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'surah' | 'juz' | 'tafseer'>('surah');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!db) return;

        const loadAllSurahs = async () => {
            try {
                const results = await db.getAllAsync('SELECT * FROM surahs ORDER BY id ASC');
                setSurahs(results as any[]);
            } catch (error) {
                console.error("Error fetching all Surahs:", error);
            } finally {
                setLoading(false);
            }
        };

        loadAllSurahs();
    }, [db]);

    const filteredSurahs = surahs.filter(s =>
        s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name_arabic.includes(searchQuery)
    );

    // Placeholder 30 Juz Array
    const juzArray = Array.from({ length: 30 }, (_, i) => i + 1);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={{ color: '#9A9590', marginTop: 16 }}>Loading Mushaf...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Al-Quran</Text>

                {/* Hifz Tracker Action Banner */}
                <TouchableOpacity style={styles.hifzBanner} onPress={() => router.push('/hifz')}>
                    <View style={styles.hifzBannerLeft}>
                        <Feather name="trending-up" size={24} color="#C9A84C" />
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.hifzBannerTitle}>Hifz Progress</Text>
                            <Text style={styles.hifzBannerSub}>Track memorization using SRS</Text>
                        </View>
                    </View>
                    <Feather name="chevron-right" size={20} color="#9A9590" />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                    <Feather name="search" size={20} color="#9A9590" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Surah or Juz..."
                        placeholderTextColor="#5E5C58"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        keyboardAppearance="dark"
                    />
                </View>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'surah' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('surah')}
                    >
                        <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>Surah</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'juz' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('juz')}
                    >
                        <Text style={[styles.tabText, activeTab === 'juz' && styles.tabTextActive]}>Juz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'tafseer' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('tafseer')}
                    >
                        <Text style={[styles.tabText, activeTab === 'tafseer' && styles.tabTextActive]}>Tafseer</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                {activeTab === 'surah' ? (
                    filteredSurahs.map((surah, index) => (
                        <TouchableOpacity
                            key={surah.id}
                            style={styles.listItem}
                            onPress={() => router.push(`/quran/${surah.id}`)}
                        >
                            <View style={styles.itemLeft}>
                                <View style={styles.numberOrb}>
                                    <Text style={styles.numberText}>{surah.id}</Text>
                                </View>
                                <View>
                                    <Text style={styles.engName}>{surah.name_english}</Text>
                                    <Text style={styles.subtext}>{surah.revelation_type.toUpperCase()} • {surah.total_ayahs} VERSES</Text>
                                </View>
                            </View>
                            <Text style={styles.arabicName}>{surah.name_arabic}</Text>
                        </TouchableOpacity>
                    ))
                ) : activeTab === 'juz' ? (
                    <View style={styles.juzGrid}>
                        {juzArray.map((juzNum) => (
                            <TouchableOpacity
                                key={juzNum}
                                style={styles.juzCard}
                                onPress={() => router.push(`/quran/juz/${juzNum}`)}
                            >
                                <Text style={styles.juzTitle}>Juz {juzNum}</Text>
                                <Feather name="book-open" size={16} color="#C9A84C" />
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.tafseerList}>
                        {POPULAR_TAFSEERS.map((tafseer) => (
                            <TouchableOpacity
                                key={tafseer.id}
                                style={styles.tafseerCard}
                                onPress={() => router.push(`/quran/tafseer/${tafseer.id}`)}
                            >
                                <View style={styles.tafseerIconBox}>
                                    <Feather name="book" size={20} color="#C9A84C" />
                                </View>
                                <View style={styles.tafseerInfo}>
                                    <Text style={styles.tafseerTitle}>{tafseer.title}</Text>
                                    <Text style={styles.tafseerAuthor}>{tafseer.author}</Text>
                                    <Text style={styles.tafseerDesc} numberOfLines={2}>{tafseer.desc}</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#5E5C58" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '300',
        color: '#E8E6E1',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    hifzBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    hifzBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hifzBannerTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    hifzBannerSub: {
        color: '#9A9590',
        fontSize: 13,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabBtnActive: {
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    tabText: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#C9A84C',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    numberOrb: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    numberText: {
        color: '#E8E6E1',
        fontSize: 13,
        fontWeight: '600',
    },
    engName: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    subtext: {
        color: '#9A9590',
        fontSize: 11,
        letterSpacing: 0.5,
    },
    arabicName: {
        color: '#C9A84C',
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        fontWeight: '600',
    },
    juzGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    juzCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 12,
    },
    juzTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
    },
    tafseerList: {
        paddingTop: 10,
        gap: 16,
    },
    tafseerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    tafseerIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    tafseerInfo: {
        flex: 1,
        marginRight: 16,
    },
    tafseerTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    tafseerAuthor: {
        color: '#C9A84C',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    tafseerDesc: {
        color: '#9A9590',
        fontSize: 12,
        lineHeight: 18,
    }
});
