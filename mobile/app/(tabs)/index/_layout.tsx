import { Stack } from 'expo-router';

export default function IndexLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FDF8F0' } }} />
    );
}
