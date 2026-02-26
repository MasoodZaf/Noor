import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import { DatabaseProvider } from '../context/DatabaseContext';
import { LanguageProvider } from '../context/LanguageContext';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

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
    }, []);

    return (
        <SafeAreaProvider>
            <LanguageProvider>
                <DatabaseProvider>
                    <View style={{ flex: 1, backgroundColor: '#0C0F0E' }}>
                        <StatusBar style="light" />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: '#0C0F0E' },
                            }}
                        >
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        </Stack>
                    </View>
                </DatabaseProvider>
            </LanguageProvider>
        </SafeAreaProvider>
    );
}
