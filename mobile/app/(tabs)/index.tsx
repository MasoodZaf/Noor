import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, Rect, G } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import moment from 'moment-hijri';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [prayers, setPrayers] = useState<any[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);
    const [locationName, setLocationName] = useState('Locating...');
    const [greeting, setGreeting] = useState('As-salamu alaykum');
    const [hijriDate, setHijriDate] = useState('');

    // Core animation value for the pulsing time ring
    const pulseAnim = useRef(new Animated.Value(0)).current;

    const [completedPrayers, setCompletedPrayers] = useState<string[]>([]);
    const [envThemeColor, setEnvThemeColor] = useState('#0C0F0E'); // Default charcoal

    // Unique per day key
    const todayStorageKey = `prayers_completed_${new Date().toDateString()}`;

    const loadCompletedPrayers = async () => {
        try {
            const stored = await AsyncStorage.getItem(todayStorageKey);
            if (stored) {
                setCompletedPrayers(JSON.parse(stored));
            }
        } catch (e) {
            console.warn("Failed to load prayers", e);
        }
    };

    const togglePrayer = async (id: string) => {
        // Physical click feedback!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newList = completedPrayers.includes(id) ? completedPrayers.filter(p => p !== id) : [...completedPrayers, id];
        setCompletedPrayers(newList);

        try {
            await AsyncStorage.setItem(todayStorageKey, JSON.stringify(newList));
        } catch (e) {
            console.error("Failed to save state", e);
        }
    };

    // Calculate dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    useEffect(() => {
        setGreeting(getGreeting());

        // Start infinite pulsing animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();

        (async () => {
            // Request Notification Permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            // Location Permissions
            let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== 'granted') {
                setLocationName('Location Denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});

            let resolvedCity = 'Locating...';
            // Try reverse geocoding to get City name
            try {
                let p = await Location.reverseGeocodeAsync(location.coords);
                if (p.length > 0) {
                    if (p[0].city) resolvedCity = p[0].city;
                    else if (p[0].region) resolvedCity = p[0].region;
                }
            } catch (e) {
                // Ignore fallback to 'Locating...'
            }
            setLocationName(resolvedCity);

            const coordinates = new Coordinates(location.coords.latitude, location.coords.longitude);

            // Smarter Calculation Parameters using automatic geographic heuristics.
            let params = CalculationMethod.MuslimWorldLeague();
            const locationString = resolvedCity.toLowerCase();

            if (locationString.includes('karachi') || locationString.includes('pakistan') || locationString.includes('india') || locationString.includes('islamabad')) {
                params = CalculationMethod.Karachi();
                // Mandatory override: Karachi methodology in adhan implies Hanafi defaults for Asr locally.
                params.madhab = Madhab.Hanafi;
            } else if (locationString.includes('egypt') || locationString.includes('cairo')) {
                params = CalculationMethod.Egyptian();
            } else if (locationString.includes('dubai') || locationString.includes('gulf') || locationString.includes('uae')) {
                params = CalculationMethod.Dubai();
                params.madhab = Madhab.Hanafi;
            } else if (locationString.includes('america') || locationString.includes('usa') || locationString.includes('uk') || locationString.includes('london')) {
                params = CalculationMethod.NorthAmerica();
            }

            // Sync dynamic correct Hijri date (e.g. 14 Ramadan -> 14th Sha'ban based on device offset)
            const m = moment();
            setHijriDate(m.format('iDo iMMMM').toUpperCase());

            const date = new Date(); // Automatically inherits devices accurate local time-zone
            const prayerTimes = new PrayerTimes(coordinates, date, params);

            const list = [
                { id: 'fajr', name: 'Fajr', time: moment(prayerTimes.fajr).format('hh:mm A'), date: prayerTimes.fajr, icon: 'sunrise' },
                { id: 'dhuhr', name: 'Dhuhr', time: moment(prayerTimes.dhuhr).format('hh:mm A'), date: prayerTimes.dhuhr, icon: 'sun' },
                { id: 'asr', name: 'Asr', time: moment(prayerTimes.asr).format('hh:mm A'), date: prayerTimes.asr, icon: 'cloud' },
                { id: 'maghrib', name: 'Maghrib', time: moment(prayerTimes.maghrib).format('hh:mm A'), date: prayerTimes.maghrib, icon: 'sunset' },
                { id: 'isha', name: 'Isha', time: moment(prayerTimes.isha).format('hh:mm A'), date: prayerTimes.isha, icon: 'moon' },
            ];

            const nextId = prayerTimes.nextPrayer();
            const currentId = prayerTimes.currentPrayer();

            // Set beautiful UI theme based on active prayer time
            if (currentId === 'fajr' || currentId === 'maghrib') {
                setEnvThemeColor('#191008'); // Ambient dark sunrise/sunset orange
            } else if (currentId === 'isha') {
                setEnvThemeColor('#040A14'); // Absolute deep midnight indigo
            } else {
                setEnvThemeColor('#0C0F0E'); // Standard charcoal black
            }

            const formattedList = list.map(p => ({
                ...p,
                isNext: p.id === nextId
            }));

            setPrayers(formattedList);
            await loadCompletedPrayers();

            // Schedule Notifications
            const scheduleAdhans = async () => {
                await Notifications.cancelAllScheduledNotificationsAsync();
                const nowTime = new Date().getTime();

                for (const prayer of list) {
                    if (prayer.date.getTime() > nowTime) {
                        try {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: `Time for ${prayer.name}`,
                                    body: `It is currently time to pray ${prayer.name}. Come to prayer, come to success.`,
                                    sound: true,
                                    color: '#C9A84C',
                                },
                                trigger: {
                                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                                    date: prayer.date
                                },
                            });
                        } catch (e) {
                            console.error("Failed to schedule notification:", e);
                        }
                    }
                }
            };
            scheduleAdhans();

            let activeNextId = nextId;
            let activeNextTime = prayerTimes.timeForPrayer(nextId as any) as Date;

            // Handle After-Isha Edge Case (Next prayer is tomorrow's Fajr)
            if (!activeNextId || activeNextId === 'none') {
                activeNextId = 'fajr';
                const tomorrow = new Date(date);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowPrayerTimes = new PrayerTimes(coordinates, tomorrow, params);
                activeNextTime = tomorrowPrayerTimes.fajr;
                setNextPrayerName('Fajr');
            } else {
                setNextPrayerName(activeNextId.charAt(0).toUpperCase() + activeNextId.slice(1));
            }

            let previousPrayerTimeObj;
            if (currentId === 'none') {
                // Between tomorrow's Fajr and Today's Isha or start of day
                previousPrayerTimeObj = new Date(date).setHours(0, 0, 0, 0);
            } else {
                previousPrayerTimeObj = prayerTimes.timeForPrayer(currentId as any) as Date;
            }

            const totalDuration = activeNextTime.getTime() - new Date(previousPrayerTimeObj).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = activeNextTime.getTime() - now;

                if (diff <= 0) {
                    setCountdown('0h 0m');
                    setFillPercentage(1);
                } else {
                    const d = moment.duration(diff);
                    setCountdown(`${Math.floor(d.asHours())}h ${d.minutes()}m`);

                    const elapsed = now - new Date(previousPrayerTimeObj).getTime();
                    const percentage = Math.max(0, Math.min(1, elapsed / totalDuration));
                    setFillPercentage(percentage);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 60000);
            setLoading(false);
            return () => clearInterval(interval);
        })();
    }, []);

    // Outer Glow Scaling Animation mapped from 1 to 1.15
    const animatedScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12]
    });

    // Outer Glow Opacity mapped from bold to invisible
    const animatedOpacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.35, 0]
    });

    const radius = 120;
    const strokeWidth = 3;
    const cx = 150;
    const cy = 150;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (fillPercentage * circumference);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: envThemeColor, alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: envThemeColor }]}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}
                contentContainerStyle={styles.scrollContent}
            >

                {/* Ambient Dynamic Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.greetingText}>{greeting}</Text>
                        <Text style={styles.locationText}>{locationName}</Text>
                    </View>
                    {hijriDate ? (
                        <View style={styles.dateBadge}>
                            <Text style={styles.dateText}>{hijriDate}</Text>
                        </View>
                    ) : (
                        <View style={[styles.dateBadge, { opacity: 0 }]} />
                    )}
                </View>

                {/* Innovative Pulsing Timer Orb */}
                <View style={styles.progressContainer}>
                    {/* Underlying animated glow aura */}
                    <Animated.View style={[
                        styles.auraLayer,
                        {
                            transform: [{ scale: animatedScale }],
                            opacity: animatedOpacity
                        }
                    ]}>
                        <LinearGradient
                            colors={['rgba(201,168,76, 0.4)', 'rgba(31,78,61, 0.1)']}
                            style={[StyleSheet.absoluteFill, { borderRadius: 150 }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </Animated.View>

                    {/* True foreground tracking ring */}
                    <Svg width={300} height={300} viewBox="0 0 300 300">
                        <Defs>
                            <SvgLinearGradient id="gradientActive" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#C9A84C" />
                                <Stop offset="100%" stopColor="#1F4E3D" />
                            </SvgLinearGradient>
                        </Defs>

                        {/* Background subtle ring */}
                        <Circle cx={cx} cy={cy} r={radius} stroke="rgba(255, 255, 255, 0.03)" strokeWidth={strokeWidth} fill="none" />

                        {/* Fill Ring */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke="url(#gradientActive)"
                            strokeWidth={strokeWidth * 1.5}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    </Svg>

                    <View style={styles.countdownCenter}>
                        <Text style={styles.tillText}>Time to</Text>
                        <Text style={styles.prayerHeroText}>{nextPrayerName}</Text>
                        <View style={styles.countdownBadge}>
                            <Text style={styles.countdownTime}>{countdown}</Text>
                        </View>
                    </View>
                </View>

                {/* Prayer Timeline List with Floating Glassmorphic Effect */}
                <View style={styles.prayersList}>
                    {prayers.map((prayer) => {
                        const isNext = prayer.isNext;
                        const isChecked = completedPrayers.includes(prayer.id);

                        return (
                            <TouchableOpacity
                                key={prayer.name}
                                activeOpacity={0.8}
                                onPress={() => togglePrayer(prayer.id)}
                            >
                                <LinearGradient
                                    colors={
                                        isNext
                                            ? ['rgba(201, 168, 76, 0.15)', 'rgba(31, 78, 61, 0.05)'] // Gold-Green aura for NEXT
                                            : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)'] // Inactive stealth
                                    }
                                    style={[styles.prayerCard, isNext && styles.prayerCardNext]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <View style={styles.prayerLeft}>
                                        <View style={[styles.iconOrb, isNext && styles.iconOrbNext]}>
                                            <Feather name={prayer.icon as any} size={18} color={isNext ? '#0C0F0E' : '#9A9590'} />
                                        </View>
                                        <View>
                                            <Text style={[styles.prayerName, isNext && styles.prayerNameNext]}>{prayer.name}</Text>
                                            {isNext && <Text style={styles.nextSubtitle}>Next Prayer</Text>}
                                        </View>
                                    </View>

                                    <View style={styles.prayerRight}>
                                        <Text style={[styles.prayerTime, isNext && styles.prayerTimeNext]}>{prayer.time}</Text>
                                        <View style={styles.checkCircle}>
                                            {isChecked && <View style={styles.checkFill} />}
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* High-end Quick Tools */}
                <View style={styles.toolsSection}>
                    <Text style={styles.sectionTitle}>Library</Text>
                    <View style={styles.toolsGrid}>
                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/tasbih')}>
                            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.toolGradient}>
                                {/* Custom Hand-drawn Inline SVG for Tasbih */}
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Circle cx="12" cy="10" r="8" strokeDasharray="2 3" />
                                    <Path d="M12 18 V23 M10 21 h4" />
                                    <Circle cx="12" cy="18" r="1.5" fill="#C9A84C" />
                                </Svg>
                                <Text style={styles.toolText}>Tasbih</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/zakat')}>
                            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.toolGradient}>
                                {/* Custom Gold Coin & Crescent for Zakat */}
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Circle cx="12" cy="12" r="10" />
                                    <Path d="M10 8 A 4 4 0 1 0 14 16 A 5 5 0 0 1 10 8 Z" fill="#C9A84C" />
                                </Svg>
                                <Text style={styles.toolText}>Zakat</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/duas')}>
                            <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']} style={styles.toolGradient}>
                                {/* Custom Praying Hands SVG */}
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M7 11C7 11 5 15 5 18C5 19.5 6.5 21 8 21C9.5 21 11 19 11 19C11 19 13 21 14.5 21C16 21 17.5 19.5 17.5 18C17.5 15 15.5 11 15.5 11" />
                                    <Path d="M11 19V10C11 8.5 10 7 8 7C6.5 7 5 8.5 5 10" />
                                    <Path d="M14.5 19V10C14.5 8.5 15.5 7 17.5 7C19 7 20.5 8.5 20.5 10" />
                                    <Path d="M11 13H14.5" />
                                </Svg>
                                <Text style={styles.toolText}>Duas</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 250,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 10,
        marginBottom: 20,
    },
    greetingText: {
        color: '#E8E6E1',
        fontSize: 22,
        fontWeight: '300',
        letterSpacing: 0.5,
    },
    locationText: {
        color: '#C9A84C',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    dateBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    dateText: {
        color: '#E8E6E1',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        height: 300,
        width: '100%',
    },
    auraLayer: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
    },
    countdownCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tillText: {
        color: '#9A9590',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    prayerHeroText: {
        color: '#E8E6E1',
        fontSize: 52,
        fontWeight: '200',
        letterSpacing: -1.5,
        lineHeight: 60,
    },
    countdownBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(201, 168, 76, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)',
    },
    countdownTime: {
        color: '#C9A84C',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    prayersList: {
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 12,
    },
    prayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    prayerCardNext: {
        borderColor: 'rgba(201, 168, 76, 0.3)',
        transform: [{ scale: 1.02 }],
        shadowColor: '#C9A84C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    prayerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconOrb: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconOrbNext: {
        backgroundColor: '#C9A84C',
    },
    prayerName: {
        color: '#E8E6E1',
        fontSize: 17,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    prayerNameNext: {
        color: '#C9A84C',
        fontWeight: '600',
        fontSize: 18,
    },
    nextSubtitle: {
        color: '#9A9590',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    prayerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    prayerTime: {
        color: '#E8E6E1',
        fontSize: 15,
        letterSpacing: 0.5,
        fontWeight: '500',
    },
    prayerTimeNext: {
        color: '#C9A84C',
        fontWeight: '700',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkFill: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#C9A84C',
    },
    toolsSection: {
        marginTop: 40,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    toolsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    toolCard: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    toolGradient: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
    },
    toolText: {
        color: '#E8E6E1',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
        letterSpacing: 0.5,
    },
});
