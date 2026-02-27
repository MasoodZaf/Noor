import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

import { useDatabase } from '../../context/DatabaseContext';

// Legacy Mock Data left intact for backward compatibility if needed, but overridden when db is active
const DUA_DATABASE: Record<string, { title: string, icon: string, desc: string, items: any[] }> = {
    'morning': {
        title: 'Morning & Evening',
        icon: 'sun',
        desc: 'Supplications for the start and end of your day, protecting you from harm and bringing blessings.',
        items: [
            {
                id: 'm1',
                arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
                transliteration: 'Asbahna wa-asbahal-mulku lillah',
                translation: '"We have reached the morning and at this very time unto Allah belongs all sovereignty..."',
                reference: 'Hisn al-Muslim 75',
                benefit: 'Acknowledges Allah\'s supreme dominion at the break of dawn.'
            },
            {
                id: 'm2',
                arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا',
                transliteration: 'Allahumma bika asbahna wa bika amsayna',
                translation: '"O Allah, by You we enter the morning and by You we enter the evening..."',
                reference: 'Hisn al-Muslim 76',
                benefit: 'A powerful affirmation of our complete reliance on Allah.'
            },
            {
                id: 'm3',
                arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ',
                transliteration: 'Allahumma anta rabbi la ilaha illa anta, khalaqtani wa-ana abduk',
                translation: '"O Allah, You are my Lord, there is none worthy of worship but You. You created me and I am Your slave..."',
                reference: 'Sayyid al-Istighfar (Bukhari)',
                benefit: 'The most superior way of asking for forgiveness from Allah.'
            }
        ]
    },
    'prayer': {
        title: 'Prayer & Wudu',
        icon: 'droplet',
        desc: 'Essential supplications to purify yourself and perfect your daily prayers.',
        items: [
            {
                id: 'p1',
                arabic: 'بِسْمِ اللَّهِ',
                transliteration: 'Bismillah',
                translation: '"In the name of Allah."',
                reference: 'Before Wudu (Abu Dawud)',
                benefit: 'Required to begin the purification process.'
            },
            {
                id: 'p2',
                arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
                transliteration: 'Ashhadu an la ilaha illallahu wahdahu la sharika lah',
                translation: '"I bear witness that none has the right to be worshipped but Allah alone, Who has no partner..."',
                reference: 'After Wudu (Muslim)',
                benefit: 'The eight gates of Paradise are opened for the one who recites this.'
            }
        ]
    },
    'daily': {
        title: 'Daily Life',
        icon: 'coffee',
        desc: 'Supplications for eating, dressing, leaving the house, and everyday actions.',
        items: [
            {
                id: 'd1',
                arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ',
                transliteration: 'Bismillahi, tawakkaltu AAalallahi',
                translation: '"In the Name of Allah, I have placed my trust in Allah, there is no might and no power except by Allah."',
                reference: 'Leaving Home (Abu Dawud)',
                benefit: 'You shall be guided, defended and protected.'
            },
            {
                id: 'd2',
                arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا',
                transliteration: 'Alhamdu lillahil-ladhi atAAamani hadha',
                translation: '"All praise is to Allah Who has fed me this..."',
                reference: 'After Eating (Tirmidhi)',
                benefit: 'Forgiveness for previous minor sins.'
            }
        ]
    }
};

export default function DuaDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const categoryId = typeof id === 'string' ? id : 'morning';
    const { db } = useDatabase();

    const [isLoading, setIsLoading] = useState(true);
    const [dbData, setDbData] = useState<any>(null);

    React.useEffect(() => {
        if (!db) return;

        async function loadCollection() {
            setIsLoading(true);
            try {
                // Fetch Category 
                const catRow: any = await db?.getFirstAsync('SELECT id, name_english as title, icon FROM dua_categories WHERE id = ?', [categoryId]);

                if (catRow) {
                    // Fetch nested Duas
                    const duaRows = await db?.getAllAsync(`
                        SELECT id, title as desc, arabic_text as arabic, transliteration, translation_en as translation, source as reference 
                        FROM duas WHERE category_id = ? ORDER BY sort_order ASC
                    `, [categoryId]);

                    setDbData({
                        title: catRow.title,
                        icon: catRow.icon || 'sun',
                        desc: 'Prophetic supplications to fortify your soul and protect your day.',
                        items: duaRows || []
                    });
                }
            } catch (error) {
                console.error("DB Load Error:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadCollection();
    }, [db, categoryId]);

    const data = dbData || DUA_DATABASE[categoryId] || DUA_DATABASE['morning'];

    // Animations for interactive scroll
    const scrollY = useRef(new Animated.Value(0)).current;

    // Expand state for each dua
    const [expandedDua, setExpandedDua] = useState<string | null>(null);

    const toggleDua = (duaId: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setExpandedDua(expandedDua === duaId ? null : duaId);
    };

    // Parallax Header scaling
    const headerScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.2, 1],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.container}>
            {/* Ambient Background Graphic */}
            <Animated.View style={[styles.ambientHeader, { transform: [{ scale: headerScale }] }]}>
                <LinearGradient
                    colors={['rgba(201, 168, 76, 0.15)', 'rgba(31, 78, 61, 0.05)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            {/* Custom Fixed Header */}
            <View style={[styles.fixedNav, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Feather name="bookmark" size={22} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Hero Title Area */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIconWrapper}>
                        <Feather name={data.icon as any} size={32} color="#C9A84C" />
                    </View>
                    <Text style={styles.heroTitle}>{data.title}</Text>
                    <Text style={styles.heroDesc}>{data.desc}</Text>
                    <View style={styles.pillBadge}>
                        <Text style={styles.pillText}>{data.items.length} Duas</Text>
                    </View>
                </View>

                {/* Duas List */}
                <View style={styles.listContainer}>
                    {data.items.map((item: any, index: number) => {
                        const isExpanded = expandedDua === item.id;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.9}
                                onPress={() => toggleDua(item.id)}
                            >
                                <LinearGradient
                                    colors={
                                        isExpanded
                                            ? ['rgba(201,168,76,0.08)', 'rgba(31,78,61,0.08)']
                                            : ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']
                                    }
                                    style={[styles.duaCard, isExpanded && styles.duaCardActive]}
                                >
                                    <View style={styles.duaHeaderRow}>
                                        <View style={styles.duaNumBadge}>
                                            <Text style={styles.duaNumText}>{index + 1}</Text>
                                        </View>
                                        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9A9590" />
                                    </View>

                                    <Text style={styles.arabicHeroText}>{item.arabic}</Text>

                                    {/* Expanded Details Section */}
                                    {isExpanded && (
                                        <View style={styles.expandedDetails}>
                                            <View style={styles.divider} />

                                            <Text style={styles.sectionLabel}>TRANSLITERATION</Text>
                                            <Text style={styles.translitText}>{item.transliteration}</Text>

                                            <Text style={styles.sectionLabel}>TRANSLATION</Text>
                                            <Text style={styles.translationText}>{item.translation}</Text>

                                            <View style={styles.benefitBox}>
                                                <Feather name="award" size={16} color="#C9A84C" />
                                                <Text style={styles.benefitText}>{item.benefit}</Text>
                                            </View>

                                            <View style={styles.actionsRow}>
                                                <Text style={styles.refText}>{item.reference}</Text>
                                                <View style={{ flexDirection: 'row', gap: 16 }}>
                                                    <TouchableOpacity style={styles.iconOp}>
                                                        <Feather name="copy" size={20} color="#9A9590" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.iconOp}>
                                                        <Feather name="bookmark" size={20} color="#9A9590" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={{ height: 100 }} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    ambientHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 350,
        overflow: 'hidden',
    },

    fixedNav: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    heroSection: {
        alignItems: 'flex-start',
        marginBottom: 40,
    },
    heroIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    heroTitle: {
        color: '#E8E6E1',
        fontSize: 34,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    heroDesc: {
        color: '#9A9590',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
    },
    pillBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    pillText: {
        color: '#C9A84C',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1,
    },
    listContainer: {
        gap: 20,
    },
    duaCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    duaCardActive: {
        borderColor: 'rgba(201,168,76,0.3)',
    },
    duaHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    duaNumBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    duaNumText: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: 'bold',
    },
    arabicHeroText: {
        color: '#C9A84C',
        fontSize: 32,
        lineHeight: 52,
        textAlign: 'right',
        fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        marginBottom: 10,
    },
    expandedDetails: {
        marginTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 20,
    },
    sectionLabel: {
        color: '#5E5C58',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    translitText: {
        color: '#E8E6E1',
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 24,
    },
    translationText: {
        color: '#9A9590',
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 24,
    },
    benefitBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(201, 168, 76, 0.05)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.15)',
        gap: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    benefitText: {
        flex: 1,
        color: '#C9A84C',
        fontSize: 14,
        lineHeight: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 16,
    },
    refText: {
        color: '#5E5C58',
        fontSize: 13,
        fontWeight: '500',
    },
    iconOp: {
        padding: 4,
    }
});
