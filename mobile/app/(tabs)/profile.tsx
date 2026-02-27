import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../utils/supabase';
import { useLanguage } from '../../context/LanguageContext';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { language, setLanguage } = useLanguage();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const LANGUAGES = ['english', 'urdu', 'indonesian', 'french', 'bengali', 'turkish'] as const;
    const LANGUAGE_DISPLAY = {
        'english': 'English',
        'urdu': 'Urdu (اردو)',
        'indonesian': 'Indonesian',
        'french': 'Français',
        'bengali': 'Bengali (বাংলা)',
        'turkish': 'Türkçe'
    };

    const cycleLanguage = () => {
        const currentIndex = LANGUAGES.indexOf(language as any);
        const nextIndex = (currentIndex + 1) % LANGUAGES.length;
        setLanguage(LANGUAGES[nextIndex]);
    };

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        // Fetch current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Required", "Please enter email and password.");
            return;
        }
        setAuthLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) Alert.alert("Login Failed", error.message);
        setAuthLoading(false);
    };

    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert("Required", "Please enter email and password.");
            return;
        }
        setAuthLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) Alert.alert("Sign Up Failed", error.message);
        else Alert.alert("Success", "Check your email for the confirmation link!");
        setAuthLoading(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#C9A84C" />
            </View>
        );
    }

    if (!session) {
        // Unauthenticated View
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
                    <View style={styles.authHeader}>
                        <View style={styles.authIconContainer}>
                            <Feather name="shield" size={40} color="#C9A84C" />
                        </View>
                        <Text style={styles.authTitle}>Your Noor Account</Text>
                        <Text style={styles.authDesc}>Sync your Bookmarks, SRS Memory progress, and Prayer History securely to the cloud.</Text>
                    </View>

                    {/* Translation Preferences (Always available) */}
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.menuGroup}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={cycleLanguage}
                        >
                            <View style={styles.menuItemLeft}>
                                <View style={[styles.menuIconBox, { backgroundColor: 'rgba(201, 168, 76, 0.1)' }]}>
                                    <Feather name="globe" size={18} color="#C9A84C" />
                                </View>
                                <View>
                                    <Text style={styles.menuItemText}>Translation Language</Text>
                                    <Text style={styles.menuItemSubText}>Tap to switch format</Text>
                                </View>
                            </View>
                            <View style={styles.badgeContainer}>
                                <Text style={styles.badgeText}>{LANGUAGE_DISPLAY[language] || 'English'}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputStack}>
                        <View style={styles.inputWrapper}>
                            <Feather name="mail" size={20} color="#5E5C58" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor="#5E5C58"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Feather name="lock" size={20} color="#5E5C58" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#5E5C58"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>
                    </View>

                    {authLoading ? (
                        <ActivityIndicator size="large" color="#C9A84C" style={{ marginVertical: 30 }} />
                    ) : (
                        <View style={styles.authActionRow}>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
                                <Text style={styles.primaryBtnText}>Log In</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignUp}>
                                <Text style={styles.secondaryBtnText}>Create Free Account</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* About & Legal Section - Unobtrusive (Unauthenticated view) */}
                    <View style={{ marginTop: 40 }}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <View style={styles.menuGroup}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("About Noor", "Version 1.0.0\n\nDesigned to elevate your daily spiritual connection with a premium, seamless interface.")}>
                                <View style={styles.menuItemLeft}>
                                    <View style={styles.menuIconBox}><Feather name="info" size={18} color="#E8E6E1" /></View>
                                    <Text style={styles.menuItemText}>About Noor</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#5E5C58" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuItemLeft}>
                                    <View style={styles.menuIconBox}><Feather name="shield" size={18} color="#E8E6E1" /></View>
                                    <Text style={styles.menuItemText}>Privacy Policy</Text>
                                </View>
                                <Feather name="chevron-right" size={20} color="#5E5C58" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Authenticated View
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile & Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* ID Card */}
                <LinearGradient
                    colors={['rgba(201, 168, 76, 0.15)', 'rgba(31, 78, 61, 0.05)']}
                    style={styles.idCard}
                >
                    <View style={styles.idHeader}>
                        <View style={styles.avatar}>
                            <Feather name="user" size={30} color="#C9A84C" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.emailText}>{session.user.email}</Text>
                            <Text style={styles.statusText}>Cloud Sync Active</Text>
                        </View>
                    </View>
                    <View style={styles.idStats}>
                        <View style={styles.idStatBox}>
                            <Text style={styles.statVal}>0</Text>
                            <Text style={styles.statLbl}>Days Streak</Text>
                        </View>
                        <View style={[styles.idStatBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }]}>
                            <Text style={styles.statVal}>Basic</Text>
                            <Text style={styles.statLbl}>Plan level</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Translation Preferences */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={cycleLanguage}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(201, 168, 76, 0.1)' }]}>
                                <Feather name="globe" size={18} color="#C9A84C" />
                            </View>
                            <View>
                                <Text style={styles.menuItemText}>Translation Language</Text>
                                <Text style={styles.menuItemSubText}>Tap to switch format</Text>
                            </View>
                        </View>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{LANGUAGE_DISPLAY[language] || 'English'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Settings Menu */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={styles.menuIconBox}><Feather name="bell" size={18} color="#E8E6E1" /></View>
                            <Text style={styles.menuItemText}>Adhan Notifications</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={styles.menuIconBox}><Feather name="map-pin" size={18} color="#E8E6E1" /></View>
                            <Text style={styles.menuItemText}>Calculation Method (Karachi)</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={styles.menuIconBox}><Feather name="download-cloud" size={18} color="#E8E6E1" /></View>
                            <Text style={styles.menuItemText}>Force Sync Database</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                </View>

                {/* About & Legal Section - Unobtrusive */}
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("About Noor", "Version 1.0.0\n\nDesigned to elevate your daily spiritual connection with a premium, seamless interface.")}>
                        <View style={styles.menuItemLeft}>
                            <View style={styles.menuIconBox}><Feather name="info" size={18} color="#E8E6E1" /></View>
                            <Text style={styles.menuItemText}>About Noor</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={styles.menuIconBox}><Feather name="shield" size={18} color="#E8E6E1" /></View>
                            <Text style={styles.menuItemText}>Privacy Policy</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#5E5C58" />
                    </TouchableOpacity>
                </View>

                {/* Premium Teaser */}
                <TouchableOpacity style={styles.premiumBanner}>
                    <Feather name="star" size={24} color="#0C0F0E" style={{ marginRight: 16 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.premiumBannerTitle}>Upgrade to Noor Pro</Text>
                        <Text style={styles.premiumBannerDesc}>Unlock unlimited Hifz tracking & Audio.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={() => supabase.auth.signOut()}
                >
                    <Feather name="log-out" size={18} color="#E53E3E" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutBtnText}>Sign Out Securely</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0C0F0E' },
    authContainer: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 60 },
    authHeader: { alignItems: 'center', marginBottom: 40 },
    authIconContainer: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(201, 168, 76, 0.1)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: 'rgba(201, 168, 76, 0.2)'
    },
    authTitle: { color: '#E8E6E1', fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
    authDesc: { color: '#9A9590', fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    inputStack: { gap: 16, marginBottom: 40 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16, paddingHorizontal: 16, height: 60,
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    inputIcon: { marginRight: 16 },
    input: { flex: 1, color: '#E8E6E1', fontSize: 16, height: '100%' },
    authActionRow: { gap: 16 },
    primaryBtn: {
        backgroundColor: '#C9A84C',
        borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { color: '#0C0F0E', fontSize: 16, fontWeight: 'bold' },
    secondaryBtn: {
        backgroundColor: 'transparent',
        borderRadius: 16, height: 60,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    secondaryBtnText: { color: '#E8E6E1', fontSize: 16, fontWeight: '600' },
    header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { fontSize: 26, fontWeight: '300', color: '#E8E6E1', letterSpacing: 0.5 },
    content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
    idCard: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(201, 168, 76, 0.3)', marginBottom: 30 },
    idHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emailText: { color: '#E8E6E1', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    statusText: { color: '#C9A84C', fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
    idStats: { flexDirection: 'row' },
    idStatBox: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    statVal: { color: '#E8E6E1', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    statLbl: { color: '#9A9590', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionTitle: { color: '#9A9590', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
    menuGroup: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 30 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuItemText: { color: '#E8E6E1', fontSize: 16 },
    premiumBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C9A84C', borderRadius: 16, padding: 20, marginBottom: 30 },
    premiumBannerTitle: { color: '#0C0F0E', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    premiumBannerDesc: { color: 'rgba(12, 15, 14, 0.8)', fontSize: 13 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(229, 62, 62, 0.1)', borderWidth: 1, borderColor: 'rgba(229, 62, 62, 0.2)' },
    logoutBtnText: { color: '#E53E3E', fontSize: 16, fontWeight: '600' },
    menuItemSubText: { color: '#9A9590', fontSize: 12, marginTop: 2 },
    badgeContainer: { backgroundColor: 'rgba(201, 168, 76, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(201, 168, 76, 0.3)' },
    badgeText: { color: '#C9A84C', fontSize: 12, fontWeight: 'bold' }
});
