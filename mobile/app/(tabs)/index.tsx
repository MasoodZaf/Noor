import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import moment from 'moment';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [prayers, setPrayers] = useState<any[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});

            const coordinates = new Coordinates(location.coords.latitude, location.coords.longitude);
            const params = CalculationMethod.MuslimWorldLeague();
            const date = new Date();

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

            const formattedList = list.map(p => ({
                ...p,
                isNext: p.id === nextId
            }));

            setPrayers(formattedList);

            if (nextId !== 'none') {
                setNextPrayerName(nextId.charAt(0).toUpperCase() + nextId.slice(1));

                const nextPrayerTimeObj = prayerTimes.timeForPrayer(nextId) as Date;
                let previousPrayerTimeObj;

                if (currentId === 'none') {
                    // Between Isha and Fajr gap
                    previousPrayerTimeObj = new Date(date).setHours(0, 0, 0, 0);
                } else {
                    previousPrayerTimeObj = prayerTimes.timeForPrayer(currentId) as Date;
                }

                const totalDuration = nextPrayerTimeObj.getTime() - new Date(previousPrayerTimeObj).getTime();

                const updateTimer = () => {
                    const now = new Date().getTime();
                    const diff = nextPrayerTimeObj.getTime() - now;

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
            } else {
                setNextPrayerName('None');
                setCountdown('--');
                setLoading(false);
            }
        })();
    }, []);

    // SVG Circular progress variables
    const radius = 110;
    const strokeWidth = 6;
    const cx = 150;
    const cy = 150;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (fillPercentage * circumference);

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header - Hijri Date */}
                <View style={styles.header}>
                    <Text style={styles.dateText}>14 Ramadan 1447 AH</Text>
                </View>

                {/* Circular Progress Countdown */}
                <View style={styles.progressContainer}>
                    <Svg width={300} height={300} viewBox="0 0 300 300">
                        <Defs>
                            {/* Forest Green to Premium Gold */}
                            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#1F4E3D" />
                                <Stop offset="100%" stopColor="#C9A84C" />
                            </LinearGradient>
                        </Defs>

                        {/* Background Track */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Active Progress Ring */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={radius}
                            stroke="url(#gradient)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    </Svg>

                    <View style={styles.countdownCenter}>
                        <Text style={styles.countdownTime}>{countdown}</Text>
                        <Text style={styles.countdownLabel}>until {nextPrayerName}</Text>
                    </View>
                </View>

                {/* Prayers List */}
                <View style={styles.prayersList}>
                    {prayers.map((prayer, index) => (
                        <View
                            key={prayer.name}
                            style={[
                                styles.prayerCard,
                                prayer.isNext && styles.prayerCardActive
                            ]}
                        >
                            <View style={styles.prayerLeft}>
                                <Feather
                                    name={prayer.icon as any}
                                    size={20}
                                    color={prayer.isNext ? '#C9A84C' : '#5E5C58'}
                                />
                                <Text style={[styles.prayerName, prayer.isNext && styles.prayerNameActive]}>
                                    {prayer.name}
                                </Text>
                            </View>

                            <View style={styles.prayerRight}>
                                {prayer.isNext && (
                                    <Text style={styles.nextBadge}>Next</Text>
                                )}
                                <Text style={[styles.prayerTime, prayer.isNext && styles.prayerTimeActive]}>
                                    {prayer.time}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E', // Dark Slate from PRD
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    dateText: {
        color: '#9A9590', // Secondary text
        fontSize: 14,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        position: 'relative',
        height: 300,
    },
    countdownCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdownTime: {
        color: '#E8E6E1',
        fontSize: 48,
        fontWeight: '300',
        letterSpacing: -1,
        marginBottom: 4,
    },
    countdownLabel: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    prayersList: {
        paddingHorizontal: 24,
        marginTop: 30,
        gap: 12,
    },
    prayerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    prayerCardActive: {
        backgroundColor: 'rgba(31, 78, 61, 0.15)', // Very subtle deep green tint
        borderColor: 'rgba(201, 168, 76, 0.2)',    // Soft gold border
    },
    prayerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    prayerName: {
        color: '#E8E6E1',
        fontSize: 17,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    prayerNameActive: {
        color: '#C9A84C', // Gold highlight
        fontWeight: '600',
    },
    prayerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    nextBadge: {
        color: '#C9A84C',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    prayerTime: {
        color: '#9A9590',
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    prayerTimeActive: {
        color: '#E8E6E1',
        fontWeight: '600',
    },
});
