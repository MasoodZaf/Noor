import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DUA_CATEGORIES = [
    { id: 'morning', title: 'Morning & Evening', count: 24, icon: 'sun' },
    { id: 'prayer', title: 'Prayer & Wudu', count: 18, icon: 'droplet' },
    { id: 'daily', title: 'Daily Life', count: 35, icon: 'coffee' },
    { id: 'travel', title: 'Travel', count: 12, icon: 'navigation' },
    { id: 'family', title: 'Home & Family', count: 15, icon: 'home' },
    { id: 'hardship', title: 'Hardship & Relief', count: 10, icon: 'shield' },
];

export default function DuasScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hisnul Muslim</Text>
                <TouchableOpacity style={styles.searchButton}>
                    <Feather name="search" size={24} color="#E8E6E1" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.subtitle}>Daily Supplications</Text>

                {/* Categories Grid or List */}
                <View style={styles.categoriesList}>
                    {DUA_CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={styles.categoryCard}
                            onPress={() => router.push(`/duas/${category.id}`)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.categoryLeft}>
                                <View style={styles.iconContainer}>
                                    <Feather name={category.icon as any} size={20} color="#C9A84C" />
                                </View>
                                <View>
                                    <Text style={styles.categoryTitle}>{category.title}</Text>
                                    <Text style={styles.categoryCount}>{category.count} Duas</Text>
                                </View>
                            </View>

                            <Feather
                                name="chevron-right"
                                size={20}
                                color="#5E5C58"
                            />
                        </TouchableOpacity>
                    ))}
                </View>

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    searchButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -10,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    subtitle: {
        color: '#9A9590',
        fontSize: 15,
        letterSpacing: 0.5,
        marginBottom: 24,
    },
    categoriesList: {
        gap: 16,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 168, 76, 0.1)', // Gold tint
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    categoryCount: {
        color: '#9A9590',
        fontSize: 13,
    },
    expandedContent: {
        marginTop: 20,
        gap: 16,
    },
    duaCard: {
        backgroundColor: 'rgba(31, 78, 61, 0.1)', // Subtle green tinted background
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)', // Gold border
    },
    duaArabic: {
        color: '#E8E6E1',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'right',
        lineHeight: 45,
        marginBottom: 16,
    },
    duaTranslation: {
        color: '#9A9590',
        fontSize: 15,
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 24,
    },
    duaActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        paddingTop: 16,
    },
    duaReference: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
