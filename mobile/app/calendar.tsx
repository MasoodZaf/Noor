import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mock up a month of dates for demonstration
const currentMonthIslamic = "Ramadan 1447 AH";
const currentMonthGregorian = "March 2026";
const numDays = 30;

const HOLIDAYS = [
    { day: 1, title: 'First of Ramadan' },
    { day: 17, title: 'Battle of Badr' },
    { day: 27, title: 'Laylat al-Qadr (Expected)' },
];

export default function CalendarScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const renderGrid = () => {
        let days = [];
        // adding some empty days to offset start
        for (let i = 0; i < 2; i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }
        for (let i = 1; i <= numDays; i++) {
            const isToday = i === 14; // Mock today
            const isHoliday = HOLIDAYS.find(h => h.day === i);
            days.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.dayCell,
                        isToday && styles.dayCellToday,
                        isHoliday && !isToday && styles.dayCellHoliday
                    ]}
                >
                    <Text style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isHoliday && !isToday && styles.dayTextHoliday
                    ]}>
                        {i}
                    </Text>
                    {isHoliday && <View style={styles.holidayDot} />}
                </TouchableOpacity>
            );
        }
        return days;
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hijri Calendar</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Month Selector */}
                <View style={styles.monthSelector}>
                    <TouchableOpacity>
                        <Feather name="chevron-left" size={24} color="#9A9590" />
                    </TouchableOpacity>
                    <View style={styles.monthTextContainer}>
                        <Text style={styles.islamicMonth}>{currentMonthIslamic}</Text>
                        <Text style={styles.gregorianMonth}>{currentMonthGregorian}</Text>
                    </View>
                    <TouchableOpacity>
                        <Feather name="chevron-right" size={24} color="#9A9590" />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarContainer}>
                    <View style={styles.daysOfWeek}>
                        {daysOfWeek.map((day) => (
                            <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
                        ))}
                    </View>
                    <View style={styles.grid}>
                        {renderGrid()}
                    </View>
                </View>

                {/* Important Dates */}
                <Text style={styles.sectionTitle}>Important Dates</Text>
                <View style={styles.eventsList}>
                    {HOLIDAYS.map((holiday, idx) => (
                        <View key={idx} style={styles.eventCard}>
                            <View style={styles.eventDate}>
                                <Text style={styles.eventDay}>{holiday.day}</Text>
                                <Text style={styles.eventMonth}>Ramadan</Text>
                            </View>
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventTitle}>{holiday.title}</Text>
                                <Text style={styles.eventSubTitle}>{holiday.day + 1} March 2026</Text>
                            </View>
                            <Feather name="bell" size={20} color="#C9A84C" />
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
    scrollContent: {
        paddingBottom: 40,
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        marginTop: 20,
        marginBottom: 30,
    },
    monthTextContainer: {
        alignItems: 'center',
    },
    islamicMonth: {
        color: '#C9A84C', // Gold
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    gregorianMonth: {
        color: '#9A9590',
        fontSize: 14,
        fontWeight: '400',
    },
    calendarContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
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
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderRadius: 20,
    },
    dayCellToday: {
        backgroundColor: '#1F4E3D', // Forest Green
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.5)', // Gold border
    },
    dayCellHoliday: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    dayText: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
    },
    dayTextToday: {
        color: '#C9A84C', // Gold text on today
        fontWeight: 'bold',
    },
    dayTextHoliday: {
        color: '#E8E6E1',
    },
    holidayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#C9A84C',
        marginTop: 4,
    },
    sectionTitle: {
        color: '#E8E6E1',
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
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    eventDate: {
        backgroundColor: 'rgba(201, 168, 76, 0.1)', // Gold tint
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
        color: '#E8E6E1',
        fontSize: 11,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    eventSubTitle: {
        color: '#9A9590',
        fontSize: 13,
    }
});
