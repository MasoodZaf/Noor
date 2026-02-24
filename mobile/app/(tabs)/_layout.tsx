import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';

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
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 4,
                },
                tabBarActiveTintColor: '#C9A84C',
                tabBarInactiveTintColor: '#5E5C58',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    letterSpacing: 0.3,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="quran"
                options={{
                    title: 'Quran',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="book-open" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="hadith"
                options={{
                    title: 'Hadith',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="book" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Qibla',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="compass" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="user" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
