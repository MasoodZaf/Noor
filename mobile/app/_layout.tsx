import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform, LogBox } from 'react-native';
import { DatabaseProvider } from '../context/DatabaseContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AudioProvider } from '../context/AudioContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NetworkModeProvider } from '../context/NetworkModeContext';
import MiniAudioPlayer from '../components/MiniAudioPlayer';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';

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

    useEffect(() => {
        const setupNotifications = async () => {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
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
                                <ThemedApp />
                            </AudioProvider>
                        </DatabaseProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </NetworkModeProvider>
        </SafeAreaProvider>
    );
}
