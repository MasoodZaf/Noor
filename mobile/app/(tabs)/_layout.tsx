import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.tabBg,
                    borderTopWidth: 1,
                    borderTopColor: theme.tabBorder,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: theme.isDark ? 0.40 : 0.05,
                    shadowRadius: 10,
                    height: Platform.OS === 'ios' ? 88 + insets.bottom : 64 + insets.bottom,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : insets.bottom + 10,
                },
                tabBarActiveTintColor: theme.tabActive,
                tabBarInactiveTintColor: theme.tabInactive,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="quran"
                options={{
                    title: 'Quran',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="book-open" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="hadith"
                options={{
                    title: 'Hadith',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="file-text" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qaida"
                options={{
                    title: 'Qaida',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="smile" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="globe" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qibla"
                options={{
                    title: 'Qibla',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="compass" size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="settings" size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
