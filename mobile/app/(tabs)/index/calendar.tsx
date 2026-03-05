import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-hijri';

const ALADHAN = 'https://api.aladhan.com/v1';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INDEX: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
};

// For offline fallback only
const HIJRI_MONTHS = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    "Jumada al-Awwal", "Jumada al-Thani", 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

const now = moment();
// DD-MM-YYYY to match AlAdhan date format
const todayGregorian = now.format('DD-MM-YYYY');

interface DayData {
    hijriDay: number;
    gregorianFormatted: string; // "4 March 2026"
    gregorianDate: string;      // "04-03-2026" for today comparison
    holidays: string[];
    isToday: boolean;
    weekdayIndex: number;
}

function parseRaw(raw: any[], todayStr: string): DayData[] {
    return raw.map((entry: any) => {
        const h = entry.hijri;
        const g = entry.gregorian;
        const gDate: string = g.date; // "DD-MM-YYYY"
        const [dd, , yyyy] = gDate.split('-');
        const gFormatted = `${parseInt(dd)} ${g.month.en} ${yyyy}`;
        return {
            hijriDay: parseInt(h.day),
            gregorianDate: gDate,
            gregorianFormatted: gFormatted,
            holidays: h.holidays ?? [],
            isToday: gDate === todayStr,
            weekdayIndex: WEEKDAY_INDEX[g.weekday.en] ?? 0,
        };
    });
}

function cacheKey(m: number, y: number) {
    return `@hijri_cal_${m}_${y}`;
}

function gregorianSpanFromRaw(raw: any[]): string {
    const seen = new Set<string>();
    const spans: string[] = [];
    for (const d of raw) {
        const label = `${d.gregorian.month.en} ${d.gregorian.year}`;
        if (!seen.has(label)) { seen.add(label); spans.push(label); }
    }
    return spans.join(' – ');
}

export default function CalendarScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [hijriMonth, setHijriMonth] = useState(now.iMonth() + 1); // 1-12
    const [hijriYear, setHijriYear] = useState(now.iYear());

    const [days, setDays] = useState<DayData[]>([]);
    const [monthLabel, setMonthLabel] = useState('');
    const [gregorianSpan, setGregorianSpan] = useState('');
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState<'api' | 'cache' | 'offline'>('api');

    const fetchCalendar = useCallback(async (month: number, year: number) => {
        setLoading(true);
        const key = cacheKey(month, year);

        // 1 — AsyncStorage cache (persists all month)
        try {
            const cached = await AsyncStorage.getItem(key);
            if (cached) {
                const raw = JSON.parse(cached);
                setDays(parseRaw(raw, todayGregorian));
                const first = raw[0].hijri;
                setMonthLabel(`${first.month.en} ${first.year} AH`);
                setGregorianSpan(gregorianSpanFromRaw(raw));
                setSource('cache');
                setLoading(false);
                return;
            }
        } catch (_) { }

        // 2 — AlAdhan Hijri Calendar API
        try {
            const res = await fetch(`${ALADHAN}/hijriCalendar/${month}/${year}`);
            const json = await res.json();
            if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
                const raw = json.data;
                AsyncStorage.setItem(key, JSON.stringify(raw)).catch(() => { });
                setDays(parseRaw(raw, todayGregorian));
                const first = raw[0].hijri;
                setMonthLabel(`${first.month.en} ${first.year} AH`);
                setGregorianSpan(gregorianSpanFromRaw(raw));
                setSource('api');
                setLoading(false);
                return;
            }
            throw new Error('Bad response');
        } catch (_) { }

        // 3 — Offline fallback via moment-hijri
        const numDays = moment.iDaysInMonth(year, month - 1);
        const fallbackDays: DayData[] = Array.from({ length: numDays }, (_, i) => ({
            hijriDay: i + 1,
            gregorianDate: '',
            gregorianFormatted: '',
            holidays: [],
            isToday: now.iDate() === i + 1 && now.iMonth() + 1 === month && now.iYear() === year,
            weekdayIndex: 0,
        }));
        setDays(fallbackDays);
        setMonthLabel(`${HIJRI_MONTHS[month - 1]} ${year} AH`);
        setGregorianSpan('');
        setSource('offline');
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCalendar(hijriMonth, hijriYear);
    }, [hijriMonth, hijriYear]);

    const goToPrev = () => {
        if (hijriMonth === 1) { setHijriMonth(12); setHijriYear(y => y - 1); }
        else { setHijriMonth(m => m - 1); }
    };

    const goToNext = () => {
        if (hijriMonth === 12) { setHijriMonth(1); setHijriYear(y => y + 1); }
        else { setHijriMonth(m => m + 1); }
    };

    const gridOffset = days.length > 0 ? days[0].weekdayIndex : 0;
    const holidayDays = days.filter(d => d.holidays.length > 0);
    const hijriMonthName = monthLabel.split(' ')[0];

    const renderGrid = () => {
        const cells = [];
        for (let i = 0; i < gridOffset; i++) {
            cells.push(<View key={`e${i}`} style={styles.dayCell} />);
        }
        for (const day of days) {
            const hasHoliday = day.holidays.length > 0;
            cells.push(
                <TouchableOpacity
                    key={day.hijriDay}
                    style={[
                        styles.dayCell,
                        day.isToday && styles.dayCellToday,
                        hasHoliday && !day.isToday && styles.dayCellHoliday,
                    ]}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.dayText,
                        day.isToday && styles.dayTextToday,
                        hasHoliday && !day.isToday && styles.dayTextHoliday,
                    ]}>
                        {day.hijriDay}
                    </Text>
                    {hasHoliday && <View style={styles.holidayDot} />}
                </TouchableOpacity>
            );
        }
        return cells;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hijri Calendar</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Month Selector */}
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={goToPrev} style={styles.navBtn} disabled={loading}>
                        <Feather name="chevron-left" size={24} color={loading ? '#3A3A3A' : '#5E5C58'} />
                    </TouchableOpacity>

                    <View style={styles.monthTextContainer}>
                        <Text style={styles.islamicMonth}>{monthLabel || '…'}</Text>
                        {gregorianSpan ? (
                            <Text style={styles.gregorianMonth}>{gregorianSpan}</Text>
                        ) : null}
                        <View style={styles.sourceRow}>
                            <View style={[
                                styles.sourceDot,
                                { backgroundColor: source === 'api' ? '#2ECC71' : source === 'cache' ? '#C9A84C' : '#E74C3C' }
                            ]} />
                            <Text style={styles.sourceLabel}>
                                {source === 'api' ? 'Live · AlAdhan' : source === 'cache' ? 'Cached · AlAdhan' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={goToNext} style={styles.navBtn} disabled={loading}>
                        <Feather name="chevron-right" size={24} color={loading ? '#3A3A3A' : '#5E5C58'} />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarContainer}>
                    <View style={styles.daysOfWeek}>
                        {DAY_NAMES.map(day => (
                            <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
                        ))}
                    </View>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#C9A84C" size="small" />
                            <Text style={styles.loadingText}>Fetching lunar data…</Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>{renderGrid()}</View>
                    )}
                </View>

                {/* Important Dates — from API holidays */}
                {!loading && holidayDays.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Important Dates</Text>
                        <View style={styles.eventsList}>
                            {holidayDays.map((day, idx) => (
                                <View key={idx} style={styles.eventCard}>
                                    <View style={styles.eventDate}>
                                        <Text style={styles.eventDay}>{day.hijriDay}</Text>
                                        <Text style={styles.eventMonth}>{hijriMonthName}</Text>
                                    </View>
                                    <View style={styles.eventInfo}>
                                        <Text style={styles.eventTitle} numberOfLines={2}>
                                            {day.holidays[0]}
                                        </Text>
                                        {day.gregorianFormatted ? (
                                            <Text style={styles.eventSubTitle}>{day.gregorianFormatted}</Text>
                                        ) : null}
                                    </View>
                                    <Feather name="bell" size={20} color="#C9A84C" />
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {!loading && holidayDays.length === 0 && (
                    <View style={styles.noHolidaysBlock}>
                        <Feather name="moon" size={28} color="#3A3A3A" />
                        <Text style={styles.noHolidaysText}>No Islamic holidays this month</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF8F0',
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
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingBottom: 60,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 30,
    },
    navBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTextContainer: {
        alignItems: 'center',
        flex: 1,
    },
    islamicMonth: {
        color: '#C9A84C',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    gregorianMonth: {
        color: '#5E5C58',
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 6,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sourceDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    sourceLabel: {
        color: '#5E5C58',
        fontSize: 11,
    },
    calendarContainer: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginBottom: 40,
    },
    daysOfWeek: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayOfWeekText: {
        color: '#5E5C58',
        fontSize: 13,
        fontWeight: '600',
        width: `${100 / 7}%`,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        color: '#5E5C58',
        fontSize: 13,
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderRadius: 20,
    },
    dayCellToday: {
        backgroundColor: '#1F4E3D',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.5)',
    },
    dayCellHoliday: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dayText: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '500',
    },
    dayTextToday: {
        color: '#C9A84C',
        fontWeight: 'bold',
    },
    dayTextHoliday: {
        color: '#1A1A1A',
    },
    holidayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C9A84C',
        marginTop: 3,
    },
    sectionTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '500',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    eventsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    eventDate: {
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        marginRight: 16,
        minWidth: 70,
    },
    eventDay: {
        color: '#C9A84C',
        fontSize: 22,
        fontWeight: '700',
    },
    eventMonth: {
        color: '#1A1A1A',
        fontSize: 11,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 4,
    },
    eventSubTitle: {
        color: '#5E5C58',
        fontSize: 13,
    },
    noHolidaysBlock: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 12,
    },
    noHolidaysText: {
        color: '#3A3A3A',
        fontSize: 14,
    },
});
