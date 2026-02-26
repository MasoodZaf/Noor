import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PLACES = [
    { id: '1', name: 'Al-Madina Halal Grill', distance: '0.8 km', rating: 4.8, type: 'Restaurant', open: true },
    { id: '2', name: 'Downtown Mosque', distance: '1.2 km', rating: 4.9, type: 'Mosque', open: true },
    { id: '3', name: 'Kebab House', distance: '2.5 km', rating: 4.5, type: 'Restaurant', open: false },
    { id: '4', name: 'Islamic Center', distance: '3.0 km', rating: 4.7, type: 'Mosque', open: true },
];

export default function HalalPlacesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'All' | 'Restaurant' | 'Mosque'>('All');

    const filteredPlaces = PLACES.filter(place =>
        (filter === 'All' || place.type === filter) &&
        place.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Halal Places</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search and Filters */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Feather name="search" size={20} color="#5E5C58" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for restaurants, mosques..."
                        placeholderTextColor="#5E5C58"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.filterRow}>
                    {['All', 'Restaurant', 'Mosque'].map((opts) => (
                        <TouchableOpacity
                            key={opts}
                            style={[styles.filterPill, filter === opts && styles.filterPillActive]}
                            onPress={() => setFilter(opts as any)}
                        >
                            <Text style={[styles.filterText, filter === opts && styles.filterTextActive]}>
                                {opts}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Map Placeholder */}
            <View style={styles.mapPlaceholder}>
                <Feather name="map" size={48} color="#1F4E3D" />
                <Text style={styles.mapText}>Map View (Integration Pending)</Text>
            </View>

            {/* Places List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                <Text style={styles.listTitle}>Nearby</Text>

                {filteredPlaces.map(place => (
                    <TouchableOpacity key={place.id} style={styles.placeCard}>
                        <View style={styles.placeInfo}>
                            <Text style={styles.placeName}>{place.name}</Text>
                            <View style={styles.placeMeta}>
                                <Text style={styles.placeDistance}>{place.distance}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.placeType}>{place.type}</Text>
                            </View>

                            <View style={styles.placeStatus}>
                                <Feather name="star" size={14} color="#C9A84C" />
                                <Text style={styles.placeRating}>{place.rating}</Text>
                                <View style={styles.dot} />
                                <Text style={[styles.openStatus, !place.open && styles.closedStatus]}>
                                    {place.open ? 'Open Now' : 'Closed'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.directionsBtn}>
                            <Feather name="navigation" size={20} color="#C9A84C" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}
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
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 15,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
    },
    filterPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    filterText: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#C9A84C',
    },
    mapPlaceholder: {
        height: 180,
        backgroundColor: 'rgba(31, 78, 61, 0.1)', // Subtle green
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    mapText: {
        color: '#5E5C58',
        marginTop: 12,
        fontSize: 13,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    listTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 16,
    },
    placeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    placeInfo: {
        flex: 1,
    },
    placeName: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    placeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    placeDistance: {
        color: '#9A9590',
        fontSize: 13,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#5E5C58',
        marginHorizontal: 8,
    },
    placeType: {
        color: '#9A9590',
        fontSize: 13,
    },
    placeStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    placeRating: {
        color: '#E8E6E1',
        fontSize: 13,
        marginLeft: 4,
        fontWeight: '500',
    },
    openStatus: {
        color: '#4CD964', // Green
        fontSize: 13,
        fontWeight: '500',
    },
    closedStatus: {
        color: '#F25B5B', // Red
    },
    directionsBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    }
});
