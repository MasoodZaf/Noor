import { Stack } from 'expo-router';

export default function QuranLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0C0F0E' } }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
