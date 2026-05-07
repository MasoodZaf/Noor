import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const FULL_POLICY_URL = 'https://falah.app/privacy';

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/profile' as any);
    }, [router]);

    const openFullPolicy = useCallback(() => {
        Linking.openURL(FULL_POLICY_URL).catch(() => {});
    }, []);

    const Bullet = ({ children }: { children: React.ReactNode }) => (
        <View style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: theme.gold }]} />
            <Text style={[styles.bulletText, { color: theme.textPrimary }]}>{children}</Text>
        </View>
    );

    const SectionTitle = ({ children }: { children: React.ReactNode }) => (
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{children}</Text>
    );

    const Body = ({ children }: { children: React.ReactNode }) => (
        <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{children}</Text>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    onPress={goBack}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Privacy Policy</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
                {/* Highlight card — the headline promise */}
                <View style={[styles.highlight, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={[styles.shieldBadge, { backgroundColor: theme.accentLight }]}>
                        <Feather name="shield" size={22} color={theme.gold} />
                    </View>
                    <Text style={[styles.highlightTitle, { color: theme.textPrimary }]}>
                        We don't collect or retain any of your information.
                    </Text>
                    <Text style={[styles.highlightSub, { color: theme.textSecondary }]}>
                        Falah runs entirely on your device. No accounts, no analytics, no advertising,
                        no tracking. We don't operate any servers that hold your data.
                    </Text>
                </View>

                <SectionTitle>What this means</SectionTitle>
                <Bullet>You don't sign in. There is no Falah account.</Bullet>
                <Bullet>We have no way to identify you.</Bullet>
                <Bullet>No analytics, crash-reporting, or advertising SDKs.</Bullet>
                <Bullet>We never sell, rent, or share information.</Bullet>
                <Bullet>Bookmarks, settings, Hifz progress and recordings stay on your device. Uninstall = full wipe.</Bullet>

                <SectionTitle>Permissions Falah may request</SectionTitle>
                <Body>
                    Each permission powers one feature. Denying a permission only disables that feature —
                    nothing else.
                </Body>
                <View style={[styles.permCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={styles.permRow}>
                        <Feather name="map-pin" size={16} color={theme.gold} style={styles.permIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.permTitle, { color: theme.textPrimary }]}>Location</Text>
                            <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
                                Sent only to the prayer-time API to compute timings, Qibla, and nearby places.
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.permDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.permRow}>
                        <Feather name="mic" size={16} color={theme.gold} style={styles.permIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.permTitle, { color: theme.textPrimary }]}>Microphone</Text>
                            <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
                                Recitation audio stays on device. AI tajweed feedback is opt-in.
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.permDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.permRow}>
                        <Feather name="bell" size={16} color={theme.gold} style={styles.permIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.permTitle, { color: theme.textPrimary }]}>Notifications</Text>
                            <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
                                Scheduled and delivered locally for adhan, daily ayah, and Friday Kahf.
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.permDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.permRow}>
                        <Feather name="image" size={16} color={theme.gold} style={styles.permIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.permTitle, { color: theme.textPrimary }]}>Photo library</Text>
                            <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
                                Optional profile picture stored only on your device.
                            </Text>
                        </View>
                    </View>
                </View>

                <SectionTitle>Third-party services</SectionTitle>
                <Body>
                    Falah connects directly to these public providers to fetch Islamic content. We do not
                    attach any identifier to those requests.
                </Body>
                <Bullet>AlAdhan — prayer times, Hijri calendar, Qibla.</Bullet>
                <Bullet>Quran.com, AlQuran Cloud, Fawaz CDN — Quran text, translations, audio.</Bullet>
                <Bullet>Fawaz Hadith CDN — Hadith collections.</Bullet>
                <Bullet>Qurani.ai — optional AI search and recitation feedback.</Bullet>
                <Bullet>mp3quran CDN — reciter audio playback.</Bullet>
                <Bullet>Unsplash — decorative imagery.</Bullet>
                <Body>
                    To minimise these network calls, enable Offline Mode in Settings once content is cached.
                </Body>

                <SectionTitle>Children's privacy</SectionTitle>
                <Body>
                    Falah is suitable for all ages. Because we collect no data from any user, we collect
                    nothing from children either. No profiling, no advertising, no third-party tracking.
                </Body>

                <SectionTitle>Your controls</SectionTitle>
                <Bullet>Toggle Offline Mode to stop outbound network requests.</Bullet>
                <Bullet>Revoke any permission in your device settings — the related feature simply skips.</Bullet>
                <Bullet>Manage adhan, daily ayah, and Friday Kahf reminders inside the app.</Bullet>
                <Bullet>Uninstall Falah to delete every byte of local data.</Bullet>

                <SectionTitle>Contact</SectionTitle>
                <TouchableOpacity
                    onPress={() => Linking.openURL('mailto:ai@aurmak.com').catch(() => {})}
                    accessibilityRole="link"
                    accessibilityLabel="Email ai@aurmak.com"
                >
                    <Text style={[styles.linkText, { color: theme.gold }]}>ai@aurmak.com</Text>
                </TouchableOpacity>

                {/* Full policy CTA */}
                <TouchableOpacity
                    onPress={openFullPolicy}
                    activeOpacity={0.85}
                    style={[styles.fullCta, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    accessibilityRole="link"
                    accessibilityLabel="Read the full privacy policy on the web"
                >
                    <Feather name="external-link" size={16} color={theme.gold} />
                    <Text style={[styles.fullCtaText, { color: theme.textPrimary }]}>Read the full policy</Text>
                    <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                </TouchableOpacity>

                <Text style={[styles.effective, { color: theme.textTertiary }]}>
                    Effective 7 May 2026
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 56,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    scroll: { paddingHorizontal: 20, paddingTop: 20 },
    highlight: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginBottom: 28,
        alignItems: 'flex-start',
    },
    shieldBadge: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    highlightTitle: { fontSize: 18, fontWeight: '600', lineHeight: 25, marginBottom: 8 },
    highlightSub:   { fontSize: 14, lineHeight: 21 },
    sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 10, letterSpacing: 0.2 },
    bodyText: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 4 },
    bulletDot: { width: 5, height: 5, borderRadius: 3, marginTop: 9, marginRight: 12 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 21 },
    permCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 8 },
    permRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
    permIcon: { marginTop: 2, marginRight: 12, width: 18 },
    permTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    permDesc: { fontSize: 13, lineHeight: 19 },
    permDivider: { height: 1, marginVertical: 2 },
    linkText: { fontSize: 14, fontWeight: '500', marginTop: 4 },
    fullCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 28,
    },
    fullCtaText: { flex: 1, fontSize: 14, fontWeight: '500' },
    effective: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 20,
        fontStyle: Platform.OS === 'ios' ? 'italic' : 'normal',
    },
});
