import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../../context/DatabaseContext';

type Category = {
    id: number;
    title: string;
    count: number;
    icon: string;
};

export default function DuasScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        if (!db) return;
        async function loadCategories() {
            try {
                const results = await db?.getAllAsync(`
                    SELECT c.id, c.name_english as title, c.icon, COUNT(d.id) as count
                    FROM dua_categories c
                    LEFT JOIN duas d ON d.category_id = c.id
                    GROUP BY c.id ORDER BY c.sort_order ASC
                `);
                setCategories(results as Category[]);
            } catch (error) {
                console.error("Error loading categories:", error);
            } finally {
                setLoading(false);
            }
        }
        loadCategories();
    }, [db]);

    const filtered = search.trim()
        ? categories.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
        : categories;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hisnul Muslim</Text>
                <TouchableOpacity style={styles.searchButton} onPress={() => { setShowSearch(s => !s); setSearch(''); }}>
                    <Feather name={showSearch ? 'x' : 'search'} size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {showSearch && (
                <View style={styles.searchBar}>
                    <Feather name="search" size={18} color="#8A8A8A" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search duas..."
                        placeholderTextColor="#8A8A8A"
                        value={search}
                        onChangeText={setSearch}
                        autoFocus
                    />
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.subtitle}>Daily Supplications</Text>

                {loading ? (
                    <ActivityIndicator color="#f2930d" style={{ marginTop: 40 }} />
                ) : filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="search" size={32} color="#C8C8C8" />
                        <Text style={styles.emptyText}>No categories found</Text>
                    </View>
                ) : (
                    <View style={styles.categoriesList}>
                        {filtered.map((category) => (
                            <TouchableOpacity
                                key={category.id}
                                style={styles.categoryCard}
                                onPress={() => router.push(`/duas/${category.id}`)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.categoryLeft}>
                                    <View style={styles.iconContainer}>
                                        <Feather name={category.icon as any} size={20} color="#f2930d" />
                                    </View>
                                    <View>
                                        <Text style={styles.categoryTitle}>{category.title}</Text>
                                        <Text style={styles.categoryCount}>{category.count} Duas</Text>
                                    </View>
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
    container: { flex: 1, backgroundColor: '#FDF8F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    searchButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginBottom: 8,
        backgroundColor: '#FFFFFF', borderRadius: 12,
        paddingHorizontal: 14, height: 46,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
    },
    searchInput: { flex: 1, color: '#1A1A1A', fontSize: 15 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    subtitle: { color: '#8A8A8A', fontSize: 15, letterSpacing: 0.5, marginBottom: 24, fontWeight: '500' },
    categoriesList: { gap: 16 },
    categoryCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5,
    },
    categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(242, 147, 13, 0.1)', alignItems: 'center', justifyContent: 'center',
    },
    categoryTitle: { color: '#1A1A1A', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    categoryCount: { color: '#8A8A8A', fontSize: 13, fontWeight: '500' },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { color: '#C8C8C8', fontSize: 15 },
});
