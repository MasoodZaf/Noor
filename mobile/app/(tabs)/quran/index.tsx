import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDatabase } from '../../../context/DatabaseContext';
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
                const results = await db?.getAllAsync('SELECT * FROM surahs ORDER BY number ASC');
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
                <Text style={{ color: '#5E5C58', marginTop: 16 }}>Loading Mushaf...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Al-Quran</Text>

                {/* Hifz Tracker Action Banner */}
                <TouchableOpacity style={styles.hifzBanner} onPress={() => router.push('/quran/hifz')}>
                    <View style={styles.hifzBannerLeft}>
                        <Feather name="trending-up" size={24} color="#11d452" />
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.hifzBannerTitle}>Hifz Progress</Text>
                            <Text style={styles.hifzBannerSub}>Track memorization using SRS</Text>
                        </View>
                    </View>
                    <Feather name="chevron-right" size={20} color="#8A8A8A" />
                </TouchableOpacity>

                <View style={styles.searchBar}>
                    <Feather name="search" size={20} color="#8A8A8A" style={styles.searchIcon} />
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
                            key={surah.number}
                            style={styles.listItem}
                            onPress={() => router.push(`/quran/${surah.number}`)}
                        >
                            <View style={styles.itemLeft}>
                                <View style={styles.numberOrb}>
                                    <Text style={styles.numberText}>{surah.number}</Text>
                                </View>
                                <View>
                                    <Text style={styles.engName}>{surah.name_english}</Text>
                                    <Text style={styles.subtext}>{surah.revelation_type.toUpperCase()} • {surah.ayah_count} VERSES</Text>
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
                                <Feather name="book-open" size={16} color="#11d452" />
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
                                    <Feather name="book" size={20} color="#11d452" />
                                </View>
                                <View style={styles.tafseerInfo}>
                                    <Text style={styles.tafseerTitle}>{tafseer.title}</Text>
                                    <Text style={styles.tafseerAuthor}>{tafseer.author}</Text>
                                    <Text style={styles.tafseerDesc} numberOfLines={2}>{tafseer.desc}</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#8A8A8A" />
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
        backgroundColor: '#f6f8f6',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 20,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    hifzBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    hifzBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hifzBannerTitle: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    hifzBannerSub: {
        color: '#8A8A8A',
        fontSize: 13,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#1A1A1A',
        fontSize: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderColor: 'transparent',
    },
    tabBtnActive: {
        borderColor: '#11d452',
    },
    tabText: {
        color: '#8A8A8A',
        fontSize: 14,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#11d452',
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    numberOrb: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(17, 212, 82, 0.1)', // #11d452 with 10% opacity
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberText: {
        color: '#11d452',
        fontSize: 14,
        fontWeight: 'bold',
    },
    engName: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    subtext: {
        color: '#8A8A8A',
        fontSize: 11,
        letterSpacing: 0.5,
    },
    arabicName: {
        color: '#11d452',
        fontSize: 22,
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        gap: 12,
    },
    juzTitle: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tafseerList: {
        paddingTop: 10,
        gap: 16,
    },
    tafseerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    tafseerIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(17, 212, 82, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    tafseerInfo: {
        flex: 1,
        marginRight: 16,
    },
    tafseerTitle: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tafseerAuthor: {
        color: '#11d452',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tafseerDesc: {
        color: '#8A8A8A',
        fontSize: 12,
        lineHeight: 18,
    }
});
