import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ── Types ──────────────────────────────────────────────────────────
interface SettingOption {
    label: string;
    value: string;
}

const CALCULATION_METHODS: SettingOption[] = [
    { label: 'Muslim World League', value: 'mwl' },
    { label: 'University of Islamic Sciences, Karachi', value: 'karachi' },
    { label: 'Egyptian General Authority', value: 'egypt' },
    { label: 'Umm al-Qura, Makkah', value: 'umm_al_qura' },
    { label: 'ISNA (North America)', value: 'isna' },
    { label: 'Institute of Geophysics, Tehran', value: 'tehran' },
];

const MADHABS: SettingOption[] = [
    { label: 'Hanafi', value: 'hanafi' },
    { label: "Shafi'i", value: 'shafi' },
    { label: 'Maliki', value: 'maliki' },
    { label: 'Hanbali', value: 'hanbali' },
];

// ── Component ──────────────────────────────────────────────────────
export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState('mwl');
    const [selectedMadhab, setSelectedMadhab] = useState('hanafi');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const currentMethod = CALCULATION_METHODS.find(m => m.value === selectedMethod)?.label || '';
    const currentMadhab = MADHABS.find(m => m.value === selectedMadhab)?.label || '';

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Feather name="user" size={32} color="#C9A84C" />
                    </View>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <Text style={styles.headerSubtitle}>Customize your Noor experience</Text>
                </View>

                {/* Prayer Settings Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Prayer Settings</Text>

                    {/* Calculation Method */}
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => toggleSection('method')}
                    >
                        <View style={styles.settingLeft}>
                            <Feather name="clock" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>Calculation Method</Text>
                                <Text style={styles.settingValue}>{currentMethod}</Text>
                            </View>
                        </View>
                        <Feather
                            name={expandedSection === 'method' ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color="#5E5C58"
                        />
                    </TouchableOpacity>

                    {expandedSection === 'method' && (
                        <View style={styles.optionsList}>
                            {CALCULATION_METHODS.map((method) => (
                                <TouchableOpacity
                                    key={method.value}
                                    style={styles.optionRow}
                                    onPress={() => {
                                        setSelectedMethod(method.value);
                                        setExpandedSection(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionLabel,
                                        selectedMethod === method.value && styles.optionLabelActive,
                                    ]}>
                                        {method.label}
                                    </Text>
                                    {selectedMethod === method.value && (
                                        <Feather name="check" size={16} color="#C9A84C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Madhab */}
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => toggleSection('madhab')}
                    >
                        <View style={styles.settingLeft}>
                            <Feather name="book" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>Madhab (Asr Calculation)</Text>
                                <Text style={styles.settingValue}>{currentMadhab}</Text>
                            </View>
                        </View>
                        <Feather
                            name={expandedSection === 'madhab' ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color="#5E5C58"
                        />
                    </TouchableOpacity>

                    {expandedSection === 'madhab' && (
                        <View style={styles.optionsList}>
                            {MADHABS.map((madhab) => (
                                <TouchableOpacity
                                    key={madhab.value}
                                    style={styles.optionRow}
                                    onPress={() => {
                                        setSelectedMadhab(madhab.value);
                                        setExpandedSection(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionLabel,
                                        selectedMadhab === madhab.value && styles.optionLabelActive,
                                    ]}>
                                        {madhab.label}
                                    </Text>
                                    {selectedMadhab === madhab.value && (
                                        <Feather name="check" size={16} color="#C9A84C" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>

                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Feather name="bell" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>Prayer Reminders</Text>
                                <Text style={styles.settingValue}>
                                    {notificationsEnabled ? 'Adhan before each prayer' : 'Disabled'}
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#3e3e3e', true: 'rgba(31, 78, 61, 0.6)' }}
                            thumbColor={notificationsEnabled ? '#C9A84C' : '#9A9590'}
                        />
                    </View>
                </View>

                {/* App Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>

                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Feather name="download" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>Offline Data</Text>
                                <Text style={styles.settingValue}>Download Quran & Hadith for offline use</Text>
                            </View>
                        </View>
                        <Feather name="chevron-right" size={18} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Feather name="globe" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>Language</Text>
                                <Text style={styles.settingValue}>English</Text>
                            </View>
                        </View>
                        <Feather name="chevron-right" size={18} color="#5E5C58" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <Feather name="info" size={18} color="#C9A84C" />
                            <View style={styles.settingTextGroup}>
                                <Text style={styles.settingLabel}>About Noor</Text>
                                <Text style={styles.settingValue}>Version 1.0.0</Text>
                            </View>
                        </View>
                        <Feather name="chevron-right" size={18} color="#5E5C58" />
                    </TouchableOpacity>
                </View>

                {/* Noor Pro Banner */}
                <TouchableOpacity style={styles.proBanner} activeOpacity={0.8}>
                    <View style={styles.proIconContainer}>
                        <Feather name="star" size={24} color="#C9A84C" />
                    </View>
                    <View style={styles.proTextGroup}>
                        <Text style={styles.proTitle}>Upgrade to Noor Pro</Text>
                        <Text style={styles.proSubtitle}>
                            Unlock all translations, Hifz mode, full offline access & more
                        </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#C9A84C" />
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // ── Header ──
    header: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 32,
    },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 24,
        fontWeight: '300',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#5E5C58',
        fontSize: 13,
        marginTop: 4,
    },

    // ── Sections ──
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#9A9590',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        paddingHorizontal: 24,
        marginBottom: 8,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 14,
    },
    settingTextGroup: {
        flex: 1,
    },
    settingLabel: {
        color: '#E8E6E1',
        fontSize: 15,
        fontWeight: '500',
    },
    settingValue: {
        color: '#5E5C58',
        fontSize: 12,
        marginTop: 2,
    },

    // ── Expandable Options ──
    optionsList: {
        marginHorizontal: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        paddingVertical: 4,
        marginBottom: 8,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    optionLabel: {
        color: '#9A9590',
        fontSize: 14,
    },
    optionLabelActive: {
        color: '#C9A84C',
        fontWeight: '500',
    },

    // ── Pro Banner ──
    proBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 78, 61, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.15)',
        borderRadius: 16,
        marginHorizontal: 24,
        marginTop: 8,
        padding: 20,
        gap: 14,
    },
    proIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    proTextGroup: {
        flex: 1,
    },
    proTitle: {
        color: '#C9A84C',
        fontSize: 16,
        fontWeight: '600',
    },
    proSubtitle: {
        color: '#9A9590',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
});
