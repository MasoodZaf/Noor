import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';

type Scope = 'quran' | 'hadith' | 'fiqh';

const SCOPE_ICONS: Record<Scope, React.ComponentProps<typeof Feather>['name']> = {
    quran: 'book-open',
    hadith: 'feather',
    fiqh: 'layers',
};

const SUGGESTIONS: Record<Scope, string[]> = {
    quran: [
        'Verses about patience in hardship',
        'What does the Quran say about gratitude?',
        'Forgiveness and mercy in the Quran',
        'Verses on righteousness and good deeds',
    ],
    hadith: [
        'Hadith about honesty and truthfulness',
        'Importance of prayer',
        'Good character and kindness',
        'Fasting and its virtues',
    ],
    fiqh: [
        'Ruling on fasting while traveling',
        'Conditions for a valid prayer',
        'Zakat on savings and gold',
        'Islamic business ethics',
    ],
};

export default function AiDeenScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/discover' as any);
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
            return () => sub.remove();
        }, [goBack])
    );

    const { theme } = useTheme();

    const [scope, setScope] = useState<Scope>('quran');
    const [message, setMessage] = useState('');

    const navigateToSearch = (q: string) => {
        if (!q.trim()) return;
        router.push(`/search?q=${encodeURIComponent(q.trim())}&scope=${scope}` as any);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AiDeen</Text>
                    <View style={styles.onlineStatus} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Scope Tabs */}
            <View style={[styles.scopeRow, { borderBottomColor: theme.border }]}>
                {(['quran', 'hadith', 'fiqh'] as Scope[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[
                            styles.scopeTab,
                            { backgroundColor: theme.bgInput, borderColor: theme.border },
                            scope === s && { backgroundColor: theme.gold, borderColor: theme.gold },
                        ]}
                        onPress={() => setScope(s)}
                        activeOpacity={0.75}
                    >
                        <Feather
                            name={SCOPE_ICONS[s]}
                            size={13}
                            color={scope === s ? theme.textInverse : theme.textSecondary}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.scopeTabText, { color: theme.textSecondary }, scope === s && [styles.scopeTabTextActive, { color: theme.textInverse }]]}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Welcome + Suggestions */}
            <ScrollView
                style={styles.chatArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: theme.bgInput }]}>
                    <View style={[styles.aiAvatar, { backgroundColor: theme.gold }]}>
                        <Feather name="shield" size={13} color={theme.textInverse} />
                    </View>
                    <Text style={[styles.bubbleText, { color: theme.textPrimary, flex: 1 }]}>
                        As-salamu alaykum! Ask me anything about the Quran, Hadith, or Islamic jurisprudence.
                    </Text>
                </View>

                <View style={styles.suggestions}>
                    <Text style={[styles.suggestionsLabel, { color: theme.textTertiary }]}>Try asking:</Text>
                    {SUGGESTIONS[scope].map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.chip, { backgroundColor: theme.accentLight, borderColor: theme.border }]}
                            onPress={() => navigateToSearch(s)}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.chipText, { color: theme.gold }]}>{s}</Text>
                            <Feather name="arrow-up-right" size={13} color={theme.gold} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: theme.bg, borderTopColor: theme.border }]}>
                <View style={[styles.inputRow, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                    <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder={`Search ${scope === 'quran' ? 'Quran' : scope === 'hadith' ? 'Hadith' : 'Fiqh'}…`}
                        placeholderTextColor={theme.textSecondary}
                        value={message}
                        onChangeText={setMessage}
                        onSubmitEditing={() => navigateToSearch(message)}
                        returnKeyType="search"
                        multiline={false}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: theme.bgCard }, !!message.trim() && { backgroundColor: theme.gold }]}
                        onPress={() => navigateToSearch(message)}
                        disabled={!message.trim()}
                        activeOpacity={0.8}
                    >
                        <Feather
                            name="search"
                            size={18}
                            color={message.trim() ? theme.textInverse : theme.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.poweredBy, { color: theme.textTertiary }]}>Powered by Qurani.ai</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
    onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964' },

    // Scope tabs
    scopeRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
    },
    scopeTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
    },
    scopeTabActive: {},  // dynamic colors applied inline via theme
    scopeTabText: { fontSize: 13, fontWeight: '500' },
    scopeTabTextActive: { fontWeight: '600' },

    // Chat
    chatArea: { flex: 1 },
    chatContent: { padding: 20, paddingBottom: 16 },
    bubble: {
        maxWidth: '88%',
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
    },
    bubbleAI: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        gap: 10,
    },
    aiAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    bubbleText: { fontSize: 15, lineHeight: 23 },

    // Suggestions
    suggestions: { marginTop: 4 },
    suggestionsLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        marginBottom: 8,
    },
    chipText: { fontSize: 14, flex: 1, marginRight: 8 },

    // Input
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 15,
        minHeight: 24,
        paddingTop: 2,
        paddingBottom: 2,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    poweredBy: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
