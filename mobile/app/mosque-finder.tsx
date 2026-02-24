import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────
interface Mosque {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    distance?: string;
}

// Google Places API key — replace with your actual key
const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// ── Helpers ────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
}

// Dark map style matching Noor's design system
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#1A1F1D' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1A1F1D' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9A9590' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2C3230' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5E5C58' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0C0F0E' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1F4E3D' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1A1F1D' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9A9590' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A2E25' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2C3230' }] },
];

// ── Component ──────────────────────────────────────────────────────
export default function MosqueFinderScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [mosques, setMosques] = useState<Mosque[]>([]);
    const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Location permission is needed to find nearby mosques.');
                    setLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });

                const coords = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setUserLocation(coords);

                // Fetch nearby mosques from Google Places API
                await fetchNearbyMosques(coords.latitude, coords.longitude);
            } catch {
                setError('Unable to get your location. Please check GPS settings.');
            }
            setLoading(false);
        })();
    }, []);

    async function fetchNearbyMosques(lat: number, lng: number) {
        // If no real API key is set, use Overpass API (OpenStreetMap — free, no key needed)
        if (GOOGLE_PLACES_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
            await fetchFromOverpass(lat, lng);
            return;
        }

        try {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=mosque&key=${GOOGLE_PLACES_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results) {
                const mosqueList: Mosque[] = data.results.map((place: any, index: number) => ({
                    id: place.place_id || `mosque-${index}`,
                    name: place.name,
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                    address: place.vicinity || '',
                    distance: formatDistance(haversineDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng)),
                }));
                setMosques(mosqueList);
            }
        } catch {
            // Fallback to Overpass if Google fails
            await fetchFromOverpass(lat, lng);
        }
    }

    async function fetchFromOverpass(lat: number, lng: number) {
        try {
            // Overpass API — free OpenStreetMap data for mosques within 5km
            const query = `[out:json][timeout:10];(node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng}););out center body;`;
            const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.elements) {
                const mosqueList: Mosque[] = data.elements
                    .map((el: any, index: number) => {
                        const elLat = el.lat || el.center?.lat;
                        const elLng = el.lon || el.center?.lon;
                        if (!elLat || !elLng) return null;
                        return {
                            id: `osm-${el.id || index}`,
                            name: el.tags?.name || 'Mosque',
                            latitude: elLat,
                            longitude: elLng,
                            address: el.tags?.['addr:street'] || '',
                            distance: formatDistance(haversineDistance(lat, lng, elLat, elLng)),
                        };
                    })
                    .filter(Boolean)
                    .sort((a: Mosque, b: Mosque) => {
                        const distA = haversineDistance(lat, lng, a.latitude, a.longitude);
                        const distB = haversineDistance(lat, lng, b.latitude, b.longitude);
                        return distA - distB;
                    })
                    .slice(0, 20);

                setMosques(mosqueList);
            }
        } catch {
            // Network or API error — show map with user location only
        }
    }

    function centerOnUser() {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 500);
        }
    }

    // ── Loading ──
    if (loading) {
        return (
            <View style={[styles.container, styles.centeredContent, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
                <Text style={styles.loadingText}>Finding your location...</Text>
            </View>
        );
    }

    // ── Error ──
    if (error || !userLocation) {
        return (
            <View style={[styles.container, styles.centeredContent, { paddingTop: insets.top }]}>
                <Feather name="alert-circle" size={48} color="#C9A84C" />
                <Text style={styles.errorText}>{error || 'Unable to determine location.'}</Text>
                <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const initialRegion: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
    };

    return (
        <View style={styles.container}>

            {/* Full-screen Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                customMapStyle={DARK_MAP_STYLE}
            >
                {/* User location marker */}
                <Marker
                    coordinate={userLocation}
                    title="You are here"
                    description="Your current location"
                    pinColor="#C9A84C"
                />

                {/* Mosque markers */}
                {mosques.map((mosque) => (
                    <Marker
                        key={mosque.id}
                        coordinate={{ latitude: mosque.latitude, longitude: mosque.longitude }}
                        title={mosque.name}
                        description={mosque.distance ? `${mosque.distance} away` : mosque.address}
                        pinColor="#1F4E3D"
                        onPress={() => setSelectedMosque(mosque)}
                    />
                ))}
            </MapView>

            {/* Top overlay: back button + title */}
            <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color="#E8E6E1" />
                </TouchableOpacity>
                <View style={styles.titlePill}>
                    <Feather name="map-pin" size={14} color="#C9A84C" />
                    <Text style={styles.titleText}>
                        {mosques.length > 0
                            ? `${mosques.length} Mosques Nearby`
                            : 'Mosque Finder'}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Locate Me FAB */}
            <TouchableOpacity style={[styles.locateFab, { bottom: selectedMosque ? 190 : 100 }]} onPress={centerOnUser}>
                <Feather name="crosshair" size={22} color="#C9A84C" />
            </TouchableOpacity>

            {/* Selected Mosque Bottom Card */}
            {selectedMosque && (
                <View style={[styles.mosqueCard, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.mosqueCardHandle} />
                    <View style={styles.mosqueCardContent}>
                        <View style={styles.mosqueIconContainer}>
                            <Feather name="map-pin" size={20} color="#C9A84C" />
                        </View>
                        <View style={styles.mosqueInfo}>
                            <Text style={styles.mosqueName}>{selectedMosque.name}</Text>
                            {selectedMosque.address ? (
                                <Text style={styles.mosqueAddress}>{selectedMosque.address}</Text>
                            ) : null}
                            {selectedMosque.distance && (
                                <Text style={styles.mosqueDistance}>{selectedMosque.distance} away</Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.closeCardBtn}
                            onPress={() => setSelectedMosque(null)}
                        >
                            <Feather name="x" size={18} color="#5E5C58" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Mosque Count Bar (when nothing selected) */}
            {!selectedMosque && mosques.length > 0 && (
                <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
                    <Feather name="map" size={16} color="#C9A84C" />
                    <Text style={styles.bottomBarText}>
                        {mosques.length} mosque{mosques.length !== 1 ? 's' : ''} within 5 km
                    </Text>
                </View>
            )}
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    centeredContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#9A9590',
        fontSize: 14,
        marginTop: 16,
    },
    errorText: {
        color: '#E8E6E1',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginHorizontal: 40,
        lineHeight: 24,
    },
    backButtonLarge: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: 'rgba(31, 78, 61, 0.4)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    backButtonText: {
        color: '#C9A84C',
        fontSize: 15,
        fontWeight: '600',
    },
    map: {
        width: width,
        height: height,
    },

    // ── Top Overlay ──
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(12, 15, 14, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    titlePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(12, 15, 14, 0.85)',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    titleText: {
        color: '#E8E6E1',
        fontSize: 14,
        fontWeight: '500',
    },

    // ── Locate Me FAB ──
    locateFab: {
        position: 'absolute',
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(12, 15, 14, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },

    // ── Selected Mosque Card ──
    mosqueCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1F1D',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.1)',
    },
    mosqueCardHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignSelf: 'center',
        marginBottom: 16,
    },
    mosqueCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    mosqueIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mosqueInfo: {
        flex: 1,
    },
    mosqueName: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
    },
    mosqueAddress: {
        color: '#9A9590',
        fontSize: 13,
        marginTop: 2,
    },
    mosqueDistance: {
        color: '#C9A84C',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    closeCardBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Bottom Bar ──
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(12, 15, 14, 0.9)',
        paddingTop: 14,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    bottomBarText: {
        color: '#9A9590',
        fontSize: 13,
        fontWeight: '500',
    },
});
