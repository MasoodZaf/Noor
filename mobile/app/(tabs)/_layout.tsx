import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Platform, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#123D26', // Deep green theme background
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(0,0,0,0.05)',
                    elevation: 0,
                    shadowOpacity: 0,
                    height: Platform.OS === 'ios' ? 85 + insets.bottom : 80, // Increased Android height to 80
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 16, // Added paddingBottom for Android to clear bottom
                },
                tabBarActiveTintColor: '#C9A84C', // Gold
                tabBarInactiveTintColor: '#5E5C58', // Placeholder grey
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
                    fontWeight: '500',
                    marginTop: 6,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="home" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="quran"
                options={{
                    title: 'Quran',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="book-open" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="hadith"
                options={{
                    title: 'Hadith',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="file-text" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qaida"
                options={{
                    title: 'Qaida',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="smile" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="globe" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="qibla"
                options={{
                    title: 'Qibla',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="compass" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="user" size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
