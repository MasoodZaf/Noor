import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0C0F0E',
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: '#C9A84C', // Gold
                tabBarInactiveTintColor: '#5E5C58', // Placeholder grey
                tabBarLabelStyle: {
                    fontSize: 12,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                }}
            />
            <Tabs.Screen
                name="quran"
                options={{
                    title: 'Quran',
                }}
            />
            <Tabs.Screen
                name="hadith"
                options={{
                    title: 'Hadith',
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                }}
            />
        </Tabs>
    );
}
