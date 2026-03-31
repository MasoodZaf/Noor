import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function HadithLayout() {
    const { theme } = useTheme();
    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    );
}
