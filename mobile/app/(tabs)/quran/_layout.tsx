import { Stack } from 'expo-router';

export default function QuranLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FDF8F0' } }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
