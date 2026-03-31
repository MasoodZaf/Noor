import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function QuranLayout() {
    const { theme } = useTheme();
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
            <Stack.Screen name="index" />
        </Stack>
    );
}
