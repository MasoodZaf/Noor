import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, LogBox } from 'react-native';
import { DatabaseProvider } from '../context/DatabaseContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AudioProvider } from '../context/AudioContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NetworkModeProvider } from '../context/NetworkModeContext';
import { ReciterProvider } from '../context/ReciterContext';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
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

// Suppress Expo Go Android warning about push notifications (expected — we use a dev build for production)
LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications',
    'expo-notifications: Push notifications',
]);

// Configure how notifications should behave when received while the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
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
                console.warn('[Noor] Notification permission not granted.');
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
        };

        setupNotifications();

        // Haptic feedback when a prayer notification arrives while app is in foreground
        const sub = Notifications.addNotificationReceivedListener(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
        return () => sub.remove();
    }, []);

    return (
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
    );
}
