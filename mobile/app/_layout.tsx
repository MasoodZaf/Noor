import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, LogBox, Text } from 'react-native';
import { DatabaseProvider } from '../context/DatabaseContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AudioProvider } from '../context/AudioContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NetworkModeProvider } from '../context/NetworkModeContext';
import { ReciterProvider } from '../context/ReciterContext';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import ErrorBoundary from '../components/ErrorBoundary';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import moment from 'moment-hijri';
import { useEffect } from 'react';

// ─── Falah design fonts ───────────────────────────────────────────────────────
// Loaded globally once here so every screen can reference them via theme.fonts.*
// without each screen needing its own useFonts() call. RN falls back to the
// system font while loading — nothing crashes if a font is momentarily missing.
import { useFonts } from 'expo-font';
import {
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import {
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { ScheherazadeNew_400Regular, ScheherazadeNew_600SemiBold } from '@expo-google-fonts/scheherazade-new';
import { NotoNaskhArabic_400Regular } from '@expo-google-fonts/noto-naskh-arabic';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';

// Suppress Expo Go Android warning about push notifications (expected — we use a dev build for production)
LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    'expo-notifications: Push notifications',
]);

// Cap iOS Dynamic Type / Android font-scale at 1.4× globally. Without this, an
// accessibility user with text size at the maximum setting can scale text up to
// 3× the design size — Arabic with carefully tuned lineHeight then overlaps and
// clips. 1.4 still helps users who need larger text without breaking layouts.
// Quran reader / Daily Aya screens disable scaling entirely on Arabic Text
// (allowFontScaling={false}) since they expose their own in-app font slider.
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.4;

// Configure how notifications should behave when received while the app is in the foreground.
// We deliberately drop `shouldShowAlert` (deprecated/redundant with banner on iOS 14+) and only
// raise the in-app banner — alert+banner+list together produced an abrupt double-popup feel.
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const id = notification.request?.identifier ?? '';
        // Salah notifications carry the Adhan and are time-critical — keep sound on.
        // Daily Ayah / Ramadan reminders use a softer presentation (no sound while in-app).
        const isPrayer = id.startsWith('falah-prayer-');
        return {
            shouldShowAlert: false,
            shouldPlaySound: isPrayer,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});
function ThemedApp() {
    const { theme } = useTheme();
    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <StatusBar style={theme.statusBar} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.bg },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <MiniAudioPlayer />
        </View>
    );
}

export default function RootLayout() {
    // Global font load — values mirrored in ThemeContext's `fonts` export.
    // We don't block on this: if fonts aren't ready on first paint the system
    // font fills in, then swaps in smoothly once loaded. Failed loads return
    // `error` which we also swallow — the app still works with system fonts.
    useFonts({
        // Registered under the exact names referenced in ThemeContext.fonts
        CormorantGaramond_400Regular,
        CormorantGaramond_500Medium_Italic,
        CormorantGaramond_600SemiBold_Italic,
        InterTight_400Regular,
        InterTight_500Medium,
        InterTight_600SemiBold,
        JetBrainsMono_500Medium,
        JetBrainsMono_600SemiBold,
        ScheherazadeNew_400Regular,
        ScheherazadeNew_600SemiBold,
        // Loaded globally so screens beyond the main Quran reader (tafseer,
        // hifz drill, daily-aya, duas) can reference these fonts without each
        // having its own useFonts() call. iOS otherwise silently falls back
        // to Geeza Pro, which renders Quranic Uthmani annotations incorrectly.
        NotoNaskhArabic_400Regular,
        NotoNastaliqUrdu_400Regular,
    });

    useEffect(() => {
        const setupNotifications = async () => {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                if (__DEV__) console.warn('[Noor] Notification permission not granted.');
                return;
            }

            // Set up Adhan Channel specifically for Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('adhan', {
                    name: 'Adhan (Call to Prayer)',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#C9A84C', // Gold
                });
            }

            // Outside the Hijri month of Ramadan, ensure no stale Sehri/Iftar alerts
            // remain in the OS queue from a prior Ramadan or a previous install.
            // moment-hijri iMonth is 0-indexed, so Ramadan = 8.
            if (moment().iMonth() !== 8) {
                await Notifications.cancelScheduledNotificationAsync('falah-ramadan-sehri').catch(() => {});
                await Notifications.cancelScheduledNotificationAsync('falah-ramadan-iftar').catch(() => {});
            }
        };

        setupNotifications();

        // Haptic only for the Adhan / Salah notifications — Daily Ayah & Ramadan reminders
        // were doubling-up with a haptic burst that read as "abrupt" to testers.
        const sub = Notifications.addNotificationReceivedListener(n => {
            const id = n.request?.identifier ?? '';
            if (id.startsWith('falah-prayer-')) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        });
        return () => sub.remove();
    }, []);

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <NetworkModeProvider>
                    <ThemeProvider>
                        <LanguageProvider>
                            <DatabaseProvider>
                                <AudioProvider>
                                    <ReciterProvider>
                                        <ThemedApp />
                                    </ReciterProvider>
                                </AudioProvider>
                            </DatabaseProvider>
                        </LanguageProvider>
                    </ThemeProvider>
                </NetworkModeProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
