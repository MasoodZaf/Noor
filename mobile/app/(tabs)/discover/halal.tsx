import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, ActivityIndicator, Linking, Platform, Dimensions, BackHandler, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// ─── Overpass mirrors — tried in order on failure/timeout ─────────────────────
const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// ISO 3166-1 alpha-2 codes for Muslim-majority countries
// In these countries most restaurants are halal by default → show all
const MUSLIM_MAJORITY_COUNTRIES = new Set([
    'AE','AF','AL','AZ','BA','BD','BH','BJ','BN','CI','DJ','DZ','EG','ER',
    'GM','GN','GW','ID','IQ','IR','JO','KG','KM','KW','KZ','LB','LY','MA',
    'MD','ML','MR','MV','MY','NE','NG','OM','PK','PS','QA','SA','SD','SN',
    'SO','SS','SY','TD','TG','TJ','TM','TN','TR','TZ','UZ','XK','YE',
]);

// Haversine distance in km between two coordinates
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

interface Place {
    id: string;
    name: string;
    type: 'Mosque' | 'Restaurant' | 'Cafe' | 'Islamic Center';
    lat: number;
    lon: number;
    distance: number;
    tags: Record<string, string>;
}

// ─── Fetch mosques + halal restaurants from Overpass ─────────────────────────
// In Muslim-majority countries: show all restaurants (halal by default)
// In non-Muslim countries:      only show diet:halal=yes|only tagged places
const buildOverpassQuery = (lat: number, lon: number, isMuslimCountry: boolean): string => {
    const radius = 5000;
    const foodFilter = isMuslimCountry
        ? `node["amenity"="restaurant"](around:${radius},${lat},${lon});
  node["amenity"="cafe"](around:${radius},${lat},${lon});
  node["amenity"="fast_food"](around:${radius},${lat},${lon});`
        : `node["amenity"="restaurant"]["diet:halal"~"^(yes|only)$"](around:${radius},${lat},${lon});
  node["amenity"="cafe"]["diet:halal"~"^(yes|only)$"](around:${radius},${lat},${lon});
  node["amenity"="fast_food"]["diet:halal"~"^(yes|only)$"](around:${radius},${lat},${lon});`;

    return `[out:json][timeout:25];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lon});
  ${foodFilter}
  node["amenity"="community_centre"]["religion"="muslim"](around:${radius},${lat},${lon});
);
out center 60 qt;`;
};

const fetchFromOverpass = async (query: string): Promise<any> => {
    let lastError: any;
    for (const mirror of OVERPASS_MIRRORS) {
        try {
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), 22000);
            const res = await fetch(mirror, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'FalahApp/1.0 (Islamic places finder; contact@falah.app)',
                    'Accept': 'application/json',
                },
                body: `data=${encodeURIComponent(query)}`,
                signal: ctl.signal,
            });
            clearTimeout(timer);
            // 403 = blocked/rate-limited on this mirror, 429 = rate limit, 5xx = server error — all retryable
            if (res.status === 403 || res.status === 429 || res.status >= 500) {
                throw new Error(`Overpass ${res.status}`);
            }
            if (!res.ok) throw new Error(`Overpass ${res.status}`);
            return await res.json();
        } catch (e: any) {
            lastError = e;
            // Always try next mirror on network error, abort, 403, 429, or 5xx
        }
    }
    throw lastError;
};

const fetchNearbyPlaces = async (
    lat: number, lon: number, isMuslimCountry: boolean
): Promise<Place[]> => {
    const query = buildOverpassQuery(lat, lon, isMuslimCountry);
    const json = await fetchFromOverpass(query);

    return (json.elements as any[])
        .filter(el => el.tags?.name)
        .map(el => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon) return null;

            const amenity = el.tags.amenity;
            let type: Place['type'] = 'Restaurant';
            if (amenity === 'place_of_worship' || el.tags.religion === 'muslim') type = 'Mosque';
            else if (amenity === 'community_centre') type = 'Islamic Center';
            else if (amenity === 'cafe') type = 'Cafe';
            else if (amenity === 'fast_food') type = 'Restaurant';

            return {
                id: String(el.id),
                name: el.tags.name,
                type,
                lat: elLat,
                lon: elLon,
                distance: haversine(lat, lon, elLat, elLon),
                tags: el.tags,
            } as Place;
        })
        .filter(Boolean)
        .sort((a, b) => a!.distance - b!.distance) as Place[];
};

const FILTER_OPTIONS = ['All', 'Mosque', 'Restaurant', 'Cafe', 'Islamic Center'] as const;
type FilterType = typeof FILTER_OPTIONS[number];

// Marker colours by type
const MARKER_COLOR: Record<Place['type'], string> = {
    Mosque: '#1F4E3D',
    Restaurant: '#C9A84C',
    Cafe: '#b45309',
    'Islamic Center': '#2563eb',
};

const TYPE_ICON: Record<Place['type'], string> = {
    Mosque: '🕌',
    Restaurant: '🍽️',
    Cafe: '☕',
    'Islamic Center': '🏛️',
};

// ─── Leaflet/OpenStreetMap HTML for Android (no Google Maps API key needed) ───
const buildLeafletHtml = (places: Place[], userLat: number, userLon: number): string => {
    const markers = places.map(p => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        name: p.name,
        type: p.type,
        distance: formatDistance(p.distance),
        color: MARKER_COLOR[p.type] ?? '#888888',
    }));
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #e8ede8; }
    .leaflet-popup-content-wrapper { border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
    .leaflet-popup-content { margin: 10px 14px; font-family: -apple-system, sans-serif; font-size: 13px; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${userLat}, ${userLon}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // User location — blue dot
  L.circleMarker([${userLat}, ${userLon}], {
    radius: 9, color: '#fff', weight: 3, fillColor: '#4A90D9', fillOpacity: 1
  }).addTo(map).bindPopup('<b>You are here</b>');

  // HTML-escape helper — prevents XSS from OSM place names
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Place markers
  var places = ${JSON.stringify(markers)};
  places.forEach(function(p) {
    var m = L.circleMarker([p.lat, p.lon], {
      radius: 11, color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 0.9
    }).addTo(map);
    m.bindPopup('<b>' + esc(p.name) + '<\\/b><br\\/><small>' + esc(p.type) + ' &middot; ' + esc(p.distance) + '<\\/small>');
    m.on('click', function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ id: p.id }));
    });
  });

  // Callable from React Native via injectJavaScript
  window.panTo = function(lat, lon, zoom) { map.setView([lat, lon], zoom || 15, { animate: true }); };
  window.recenterMap = function() { map.setView([${userLat}, ${userLon}], 14, { animate: true }); };
<\/script>
</body>
</html>`;
};

export default function HalalPlacesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const webViewRef = useRef<WebView>(null);
    const listRef = useRef<FlatList>(null);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);
    useFocusEffect(useCallback(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
        return () => sub.remove();
    }, [goBack]));

    const { theme } = useTheme();

    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [region, setRegion] = useState<Region | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<FilterType>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isMuslimCountry, setIsMuslimCountry] = useState(false);

    // Leaflet HTML — regenerated only when places list or user location changes (Android only)
    const leafletHtml = useMemo(() => {
        if (Platform.OS !== 'android' || !location) return '';
        return buildLeafletHtml(places, location.lat, location.lon);
    }, [places, location]);

    // Fetch location + places on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (!mounted) return;
                if (status !== 'granted') {
                    setError('Location permission denied. Cannot show nearby places.');
                    setLoading(false);
                    return;
                }
                // Try high-accuracy first, fall back to last known position if unavailable
                let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                    .catch(() => Location.getLastKnownPositionAsync());
                if (!mounted) return;
                if (!loc) throw new Error('Location unavailable');
                const { latitude, longitude } = loc.coords;
                setLocation({ lat: latitude, lon: longitude });
                setRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });

                // Reverse geocode to determine if user is in a Muslim-majority country
                let muslimCountry = false;
                try {
                    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
                    const countryCode = geo?.isoCountryCode ?? '';
                    muslimCountry = MUSLIM_MAJORITY_COUNTRIES.has(countryCode);
                    setIsMuslimCountry(muslimCountry);
                } catch {
                    // Default to strict halal-only if geocoding fails
                }

                const nearby = await fetchNearbyPlaces(latitude, longitude, muslimCountry);
                if (!mounted) return;
                setPlaces(nearby);
            } catch (e: any) {
                if (!mounted) return;
                setError('Could not load nearby places. Check your connection.');
                console.warn('[Noor/Halal] Places fetch failed:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const filteredPlaces = places.filter(p => {
        const matchesFilter = filter === 'All' || p.type === filter;
        const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Tap a marker → animate map + scroll list
    const onMarkerPress = useCallback((place: Place) => {
        setSelectedId(place.id);
        mapRef.current?.animateToRegion({
            latitude: place.lat,
            longitude: place.lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 400);
        const idx = filteredPlaces.findIndex(p => p.id === place.id);
        if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    }, [filteredPlaces]);

    // Tap a list item → pan map to that place
    const onPlacePress = useCallback((place: Place) => {
        setSelectedId(place.id);
        if (Platform.OS === 'android') {
            webViewRef.current?.injectJavaScript(`window.panTo(${place.lat}, ${place.lon}, 16); true;`);
        } else {
            mapRef.current?.animateToRegion({
                latitude: place.lat,
                longitude: place.lon,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
            }, 400);
        }
    }, []);

    // Android WebView marker tap → select in list
    const onWebViewMessage = useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.id) {
                setSelectedId(data.id);
                const idx = filteredPlaces.findIndex(p => p.id === data.id);
                if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
            }
        } catch {}
    }, [filteredPlaces]);

    // Open native maps with directions
    const openDirections = (place: Place) => {
        const label = encodeURIComponent(place.name);
        const url = Platform.OS === 'ios'
            ? `maps://maps.apple.com/?daddr=${place.lat},${place.lon}&q=${label}`
            : `geo:${place.lat},${place.lon}?q=${label}`;
        Linking.openURL(url).catch(() =>
            Linking.openURL(`https://maps.google.com/?q=${place.lat},${place.lon}`)
        );
    };

    // Recenter map on user location
    const recenter = () => {
        if (!location) return;
        if (Platform.OS === 'android') {
            webViewRef.current?.injectJavaScript('window.recenterMap(); true;');
        } else {
            mapRef.current?.animateToRegion({
                latitude: location.lat,
                longitude: location.lon,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 500);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nearby Places</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Map — OpenStreetMap/Leaflet on Android, Apple Maps on iOS */}
            <View style={styles.mapContainer}>
                {Platform.OS === 'android' ? (
                    location && leafletHtml ? (
                        <WebView
                            ref={webViewRef}
                            style={StyleSheet.absoluteFill}
                            source={{ html: leafletHtml }}
                            originWhitelist={['*']}
                            javaScriptEnabled
                            domStorageEnabled
                            scrollEnabled={false}
                            onMessage={onWebViewMessage}
                        />
                    ) : (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color={theme.accent} />
                            <Text style={[styles.mapLoadingText, { color: theme.textSecondary }]}>Loading map...</Text>
                        </View>
                    )
                ) : (
                    region ? (
                        <MapView
                            ref={mapRef}
                            style={StyleSheet.absoluteFill}
                            provider={PROVIDER_DEFAULT}
                            initialRegion={region}
                            showsUserLocation
                            showsMyLocationButton={false}
                            showsCompass={false}
                        >
                            {filteredPlaces.map(place => (
                                <Marker
                                    key={place.id}
                                    coordinate={{ latitude: place.lat, longitude: place.lon }}
                                    title={place.name}
                                    description={`${place.type} · ${formatDistance(place.distance)}`}
                                    pinColor={MARKER_COLOR[place.type as Place['type']] ?? '#888'}
                                    onPress={() => onMarkerPress(place)}
                                />
                            ))}
                        </MapView>
                    ) : (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color={theme.accent} />
                            <Text style={[styles.mapLoadingText, { color: theme.textSecondary }]}>Loading map...</Text>
                        </View>
                    )
                )}

                {/* Recenter button */}
                <TouchableOpacity style={[styles.recenterBtn, { backgroundColor: theme.bg }]} onPress={recenter}>
                    <Feather name="crosshair" size={18} color={theme.accent} />
                </TouchableOpacity>

                {/* Result count badge */}
                {!loading && places.length > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={[styles.countBadgeText, { color: theme.accent }]}>{filteredPlaces.length} places</Text>
                    </View>
                )}
            </View>

            {/* Halal mode badge */}
            {!loading && !error && (
                <View style={styles.halalBadgeRow}>
                    <View style={[styles.halalBadge, { backgroundColor: isMuslimCountry ? theme.bgCard : theme.accentLight, borderColor: isMuslimCountry ? theme.border : theme.accent + '44' }]}>
                        <Text style={{ fontSize: 13 }}>{isMuslimCountry ? '🌙' : '✅'}</Text>
                        <Text style={[styles.halalBadgeText, { color: theme.textSecondary }]}>
                            {isMuslimCountry
                                ? 'All restaurants shown — halal by local custom'
                                : 'Halal-certified places only'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Search + Filter */}
            <View style={styles.controls}>
                <View style={[styles.searchInputWrapper, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Feather name="search" size={17} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.textPrimary }]}
                        placeholder="Search mosques, restaurants..."
                        placeholderTextColor={theme.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={16} color={theme.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    horizontal
                    data={FILTER_OPTIONS as unknown as FilterType[]}
                    keyExtractor={item => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterPill, { backgroundColor: theme.bgInput }, filter === item && { backgroundColor: theme.accent }]}
                            onPress={() => setFilter(item)}
                        >
                            <Text style={[styles.filterText, { color: theme.textSecondary }, filter === item && { color: theme.textInverse }]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Places List */}
            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <Text style={[styles.stateText, { color: theme.textSecondary }]}>Finding nearby mosques & restaurants...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerState}>
                    <Feather name="alert-circle" size={36} color={theme.textTertiary} />
                    <Text style={[styles.stateText, { color: theme.textSecondary }]}>{error}</Text>
                </View>
            ) : filteredPlaces.length === 0 ? (
                <View style={styles.centerState}>
                    <Feather name="map-pin" size={36} color={theme.textTertiary} />
                    <Text style={[styles.stateText, { color: theme.textSecondary }]}>No places found nearby</Text>
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={filteredPlaces}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={
                        <>
                            <Text style={[styles.listTitle, { color: theme.textPrimary }]}>
                                {filteredPlaces.length} Nearby {filter !== 'All' ? filter + 's' : 'Places'}
                            </Text>
                            <TouchableOpacity
                                style={[styles.communityBanner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                onPress={() => Alert.alert(
                                    'Suggest a Halal Place',
                                    'Know a halal restaurant or Islamic center not shown here? Help the community by adding it to OpenStreetMap (openstreetmap.org) — the map data we use.\n\nTag with: amenity=restaurant + diet:halal=yes',
                                    [
                                        { text: 'Open OpenStreetMap', onPress: () => Linking.openURL('https://www.openstreetmap.org/edit') },
                                        { text: 'Cancel', style: 'cancel' },
                                    ]
                                )}
                            >
                                <Text style={{ fontSize: 20 }}>🤝</Text>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={[styles.communityTitle, { color: theme.textPrimary }]}>Know a halal place nearby?</Text>
                                    <Text style={[styles.communitySubtitle, { color: theme.textSecondary }]}>Help the community — tap to suggest it</Text>
                                </View>
                                <Feather name="chevron-right" size={16} color={theme.textTertiary} />
                            </TouchableOpacity>
                        </>
                    }
                    onScrollToIndexFailed={() => { }}
                    renderItem={({ item: place }) => {
                        const isSelected = selectedId === place.id;
                        const markerColor = MARKER_COLOR[place.type as Place['type']] ?? '#888';
                        const typeIcon = TYPE_ICON[place.type as Place['type']] ?? '📍';
                        return (
                            <TouchableOpacity
                                style={[styles.placeCard, { backgroundColor: theme.bgCard }, isSelected && { borderColor: theme.accent }]}
                                onPress={() => onPlacePress(place)}
                                activeOpacity={0.8}
                            >
                                {/* Type icon badge */}
                                <View style={[styles.placeIconBadge, { backgroundColor: markerColor + '18' }]}>
                                    <Text style={styles.placeEmoji}>{typeIcon}</Text>
                                </View>

                                <View style={styles.placeInfo}>
                                    <Text style={[styles.placeName, { color: theme.textPrimary }]} numberOfLines={1}>{place.name}</Text>
                                    <View style={styles.placeMeta}>
                                        <Text style={[styles.placeTypeTag, { color: markerColor }]}>
                                            {place.type}
                                        </Text>
                                        <View style={[styles.dot, { backgroundColor: theme.border }]} />
                                        <Feather name="map-pin" size={11} color={theme.textTertiary} />
                                        <Text style={[styles.placeDistance, { color: theme.textSecondary }]}> {formatDistance(place.distance)}</Text>
                                    </View>
                                    {place.tags['opening_hours'] && (
                                        <Text style={[styles.openingHours, { color: theme.textTertiary }]} numberOfLines={1}>
                                            {place.tags['opening_hours']}
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.directionsBtn, { backgroundColor: markerColor + '18' }]}
                                    onPress={() => openDirections(place)}
                                >
                                    <Feather name="navigation" size={18} color={markerColor} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    communityBanner: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 14,
        padding: 14, marginBottom: 12, borderWidth: 1,
    },
    communityTitle: { fontSize: 14, fontWeight: '600' },
    communitySubtitle: { fontSize: 12, marginTop: 2 },
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 56,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '600' },

    // Map
    mapContainer: {
        height: height * 0.32,
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#E8EDE8',
        marginBottom: 14,
    },
    mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    mapLoadingText: { fontSize: 13 },
    recenterBtn: {
        position: 'absolute', bottom: 12, right: 12,
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 4,
    },
    countBadge: {
        position: 'absolute', top: 12, left: 12,
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20,
    },
    countBadgeText: { fontSize: 12, fontWeight: '700' },

    halalBadgeRow: { paddingHorizontal: 16, marginBottom: 8 },
    halalBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start',
    },
    halalBadgeText: { fontSize: 12, fontWeight: '500' },

    // Controls
    controls: { paddingHorizontal: 16, marginBottom: 8 },
    searchInputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 14, height: 46,
        borderWidth: 1,
        marginBottom: 10,
    },
    searchInput: { flex: 1, fontSize: 14 },
    filterRow: { gap: 8, paddingBottom: 4 },
    filterPill: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20,
    },
    filterText: { fontSize: 13, fontWeight: '600' },

    // States
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
    stateText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    listTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
    placeCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16,
        padding: 14, marginBottom: 10,
        borderWidth: 1.5, borderColor: 'transparent',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4,
    },
    placeIconBadge: {
        width: 44, height: 44, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    placeEmoji: { fontSize: 22 },
    placeInfo: { flex: 1 },
    placeName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    placeMeta: { flexDirection: 'row', alignItems: 'center' },
    placeTypeTag: { fontSize: 12, fontWeight: '600' },
    dot: { width: 3, height: 3, borderRadius: 2, marginHorizontal: 6 },
    placeDistance: { fontSize: 12, fontWeight: '500' },
    openingHours: { fontSize: 11, marginTop: 3 },
    directionsBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', marginLeft: 10,
    },
});
