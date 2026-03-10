import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, BackHandler } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ARTICLES = [
    {
        id: '1',
        category: 'Aqeedah',
        title: 'The Six Pillars of Faith in Islam',
        excerpt: 'Understanding the foundational beliefs that every Muslim must hold — from belief in Allah to the Day of Judgement.',
        readTime: '5 min',
        icon: 'star',
        color: '#C9A84C',
    },
    {
        id: '2',
        category: 'Seerah',
        title: "The Prophet's ﷺ Character and Manners",
        excerpt: 'An exploration of the noble character of the Prophet Muhammad ﷺ as described by his companions.',
        readTime: '8 min',
        icon: 'heart',
        color: '#2ECC71',
    },
    {
        id: '3',
        category: 'Fiqh',
        title: 'Understanding the Conditions of Valid Prayer',
        excerpt: 'A detailed guide to the prerequisites, pillars, and conditions that make a prayer valid according to Islamic jurisprudence.',
        readTime: '6 min',
        icon: 'layers',
        color: '#3498DB',
    },
    {
        id: '4',
        category: 'Quran',
        title: 'The Virtues of Surah Al-Kahf on Fridays',
        excerpt: "Why the Prophet ﷺ commanded reciting Surah Al-Kahf every Friday and what spiritual protection it offers.",
        readTime: '4 min',
        icon: 'book-open',
        color: '#9B59B6',
    },
    {
        id: '5',
        category: 'Purification',
        title: 'Tazkiyah: Purifying the Soul in Islam',
        excerpt: 'The Islamic concept of spiritual purification — how to cleanse the heart from diseases like pride, envy, and heedlessness.',
        readTime: '7 min',
        icon: 'wind',
        color: '#1F4E3D',
    },
    {
        id: '6',
        category: 'History',
        title: 'The Battle of Badr: Faith Against All Odds',
        excerpt: 'The story of 313 companions who stood against 1,000 — and how tawakkul in Allah changed the course of Islamic history.',
        readTime: '10 min',
        icon: 'shield',
        color: '#E74C3C',
    },
    {
        id: '7',
        category: 'Dhikr',
        title: 'The Most Beloved Words to Allah',
        excerpt: "A compilation of the dhikr phrases the Prophet ﷺ called the four most beloved words to Allah, with their meanings.",
        readTime: '3 min',
        icon: 'repeat',
        color: '#C9A84C',
    },
    {
        id: '8',
        category: 'Family',
        title: 'Rights of Parents in Islam',
        excerpt: 'A comprehensive look at how Islam elevated the status of parents and made their honour second only to the worship of Allah.',
        readTime: '6 min',
        icon: 'users',
        color: '#F39C12',
    },
];

const CATEGORIES = ['All', 'Aqeedah', 'Seerah', 'Fiqh', 'Quran', 'History', 'Dhikr', 'Family', 'Purification'];

export default function ArticlesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
            return () => sub.remove();
        }, [goBack])
    );

    const filtered = ARTICLES.filter(a => {
        const matchesCat = activeCategory === 'All' || a.category === activeCategory;
        const matchesSearch = !search.trim() || a.title.toLowerCase().includes(search.toLowerCase()) || a.excerpt.toLowerCase().includes(search.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Islamic Library</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
                <Feather name="search" size={18} color="#5E5C58" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search articles..."
                    placeholderTextColor="#5E5C58"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Feather name="x-circle" size={16} color="#5E5C58" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
                        onPress={() => setActiveCategory(cat)}
                    >
                        <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="book" size={40} color="#3A3A3A" />
                        <Text style={styles.emptyText}>No articles found</Text>
                    </View>
                ) : (
                    filtered.map(article => (
                        <TouchableOpacity key={article.id} style={styles.card} activeOpacity={0.8}>
                            <View style={styles.cardTop}>
                                <View style={[styles.iconBox, { backgroundColor: `${article.color}18` }]}>
                                    <Feather name={article.icon as any} size={20} color={article.color} />
                                </View>
                                <View style={styles.cardMeta}>
                                    <Text style={[styles.catLabel, { color: article.color }]}>{article.category}</Text>
                                    <Text style={styles.readTime}>{article.readTime} read</Text>
                                </View>
                            </View>
                            <Text style={styles.cardTitle}>{article.title}</Text>
                            <Text style={styles.cardExcerpt} numberOfLines={2}>{article.excerpt}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 64,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '500' },
    searchWrapper: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 14, paddingHorizontal: 14, height: 48,
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.15)',
    },
    searchInput: { flex: 1, color: '#1A1A1A', fontSize: 15 },
    catRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    catChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    catChipActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
    catText: { color: '#5E5C58', fontSize: 13 },
    catTextActive: { color: '#FDF8F0', fontWeight: '600' },
    scroll: { paddingHorizontal: 20, paddingBottom: 60 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        padding: 20, marginBottom: 14,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardMeta: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    readTime: { color: '#5E5C58', fontSize: 12 },
    cardTitle: { color: '#1A1A1A', fontSize: 17, fontWeight: '500', marginBottom: 8, lineHeight: 24 },
    cardExcerpt: { color: '#5E5C58', fontSize: 14, lineHeight: 21 },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 16 },
    emptyText: { color: '#3A3A3A', fontSize: 15 },
});
