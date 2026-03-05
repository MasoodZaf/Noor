import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../../../context/DatabaseContext';

// ---------------------------------------------------------------------------
// Qurani.ai — Free general Quran search (no API key required)
// Docs: https://qurani.ai/en/docs/1-general-apis
// ---------------------------------------------------------------------------
const QURANI_BASE = 'https://api.qurani.ai/gw/qh/v1';

// ---------------------------------------------------------------------------
// Qurani.ai — Semantic Search (requires API key from qurani.ai/en/dashboard)
// Set EXPO_PUBLIC_QURANI_API_KEY in your .env to enable Fiqh semantic search.
// Endpoint (confirm at qurani.ai/en/docs/2-advanced-tools/semantic-search-api):
//   POST https://api.qurani.ai/gw/qs/v1/search
//   Headers: { Authorization: "Bearer {key}" }
//   Body:    { query: string, type: "fiqh"|"hadith"|"quran", limit: number }
// ---------------------------------------------------------------------------
const QURANI_KEY = process.env.EXPO_PUBLIC_QURANI_API_KEY ?? '';

type Scope = 'quran' | 'hadith' | 'fiqh';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

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

// Format Qurani.ai free keyword search into a conversational reply
function formatQuranReply(json: any, query: string): string {
    if (json.code !== 200 || !json.data?.ayahs?.length) {
        return `No Quranic verses found for "${query}". Try a different phrase.`;
    }
    const ayahs: any[] = json.data.ayahs.slice(0, 5);
    const total: number = json.data.count ?? ayahs.length;
    let reply = `Quran search results for "${query}":\n\n`;
    for (const a of ayahs) {
        reply += `"${a.text}"\n`;
        reply += `— ${a.surah.englishName} (${a.surah.number}:${a.numberInSurah})\n\n`;
    }
    if (total > 5) {
        reply += `…and ${total - 5} more matching verses across ${json.data.surahs?.length ?? '?'} Surahs.`;
    }
    return reply.trim();
}

// ---------------------------------------------------------------------------

export default function AiDeenScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { db } = useDatabase();
    const scrollRef = useRef<ScrollView>(null);

    const [scope, setScope] = useState<Scope>('quran');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([{
        id: '0',
        text: 'As-salamu alaykum! Ask me anything about the Quran, Hadith, or Islamic jurisprudence.',
        sender: 'ai',
    }]);
    const [isLoading, setIsLoading] = useState(false);

    // Animated typing indicator
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isLoading) return;
        const bounce = (dot: Animated.Value, delay: number) =>
            Animated.loop(Animated.sequence([
                Animated.delay(delay),
                Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.delay(560),
            ]));
        const a1 = bounce(dot1, 0);
        const a2 = bounce(dot2, 150);
        const a3 = bounce(dot3, 300);
        a1.start(); a2.start(); a3.start();
        return () => {
            a1.stop(); a2.stop(); a3.stop();
            dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
        };
    }, [isLoading]);

    // Auto-scroll whenever messages array length changes
    useEffect(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }, [messages.length, isLoading]);

    const addAiMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'ai' }]);
    };

    const handleSend = async (override?: string) => {
        const userMsg = (override ?? message).trim();
        if (!userMsg || isLoading) return;

        setMessage('');
        setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, sender: 'user' }]);
        setIsLoading(true);

        try {
            if (scope === 'quran') {
                // ── Qurani.ai free keyword search ───────────────────────────
                const encoded = encodeURIComponent(userMsg);
                const res = await fetch(
                    `${QURANI_BASE}/search/${encoded}?language=en&limit=5&exactSearch=false`
                );
                const json = await res.json();
                addAiMessage(formatQuranReply(json, userMsg));

            } else if (scope === 'hadith') {
                // ── Offline SQLite FTS5 search ──────────────────────────────
                let reply = '';
                if (db) {
                    try {
                        const safe = userMsg.replace(/"/g, '""');
                        const results: any[] = await db.getAllAsync(`
                            SELECT h.collection_slug, h.hadith_number, h.english_text, h.narrator_chain
                            FROM hadiths_fts fts
                            JOIN hadiths h ON h.id = fts.rowid
                            WHERE hadiths_fts MATCH '"${safe}"'
                            LIMIT 4
                        `);
                        if (results.length > 0) {
                            reply = `Hadiths related to "${userMsg}":\n\n`;
                            for (const r of results) {
                                if (r.narrator_chain) reply += `Narrated by ${r.narrator_chain}:\n`;
                                reply += `"${r.english_text}"\n`;
                                reply += `— ${r.collection_slug.toUpperCase()} ${r.hadith_number}\n\n`;
                            }
                            reply = reply.trim();
                        }
                    } catch (_) {
                        // FTS5 fallback: LIKE search
                        try {
                            const results: any[] = await db.getAllAsync(`
                                SELECT collection_slug, hadith_number, english_text, narrator_chain
                                FROM hadiths
                                WHERE english_text LIKE '%${userMsg.replace(/'/g, "''")}%'
                                LIMIT 4
                            `);
                            if (results.length > 0) {
                                reply = `Hadiths related to "${userMsg}":\n\n`;
                                for (const r of results) {
                                    if (r.narrator_chain) reply += `Narrated by ${r.narrator_chain}:\n`;
                                    reply += `"${r.english_text}"\n`;
                                    reply += `— ${r.collection_slug.toUpperCase()} ${r.hadith_number}\n\n`;
                                }
                                reply = reply.trim();
                            }
                        } catch (_) { }
                    }
                }
                addAiMessage(reply || `No hadiths found for "${userMsg}" in the offline vault. Try a different keyword.`);

            } else {
                // ── Fiqh — Qurani.ai Semantic Search (requires API key) ─────
                if (QURANI_KEY) {
                    // NOTE: Confirm the exact endpoint & response format at:
                    // https://qurani.ai/en/docs/2-advanced-tools/semantic-search-api
                    const res = await fetch('https://api.qurani.ai/gw/qs/v1/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${QURANI_KEY}`,
                        },
                        body: JSON.stringify({ query: userMsg, type: 'fiqh', limit: 5 }),
                    });
                    const json = await res.json();
                    // Adapt this formatter once you have the confirmed response schema:
                    if (json.data?.results?.length) {
                        let reply = `Fiqh results for "${userMsg}":\n\n`;
                        for (const r of json.data.results) {
                            reply += `"${r.text ?? r.content ?? JSON.stringify(r)}"\n`;
                            if (r.source) reply += `— ${r.source}\n`;
                            reply += '\n';
                        }
                        addAiMessage(reply.trim());
                    } else {
                        addAiMessage(`No Fiqh results found for "${userMsg}". Try rephrasing your question.`);
                    }
                } else {
                    addAiMessage(
                        `Fiqh (Islamic jurisprudence) search uses Qurani.ai's Semantic Search API.\n\n` +
                        `To enable it, add your API key to the app:\n` +
                        `EXPO_PUBLIC_QURANI_API_KEY=your_key\n\n` +
                        `Get your key at qurani.ai/en/dashboard`
                    );
                }
            }
        } catch {
            addAiMessage('Connection error. Please check your internet and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const showSuggestions = messages.length === 1 && !isLoading;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>AiDeen</Text>
                    <View style={styles.onlineStatus} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Scope Tabs */}
            <View style={styles.scopeRow}>
                {(['quran', 'hadith', 'fiqh'] as Scope[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.scopeTab, scope === s && styles.scopeTabActive]}
                        onPress={() => setScope(s)}
                        activeOpacity={0.75}
                    >
                        <Feather
                            name={SCOPE_ICONS[s]}
                            size={13}
                            color={scope === s ? '#FDF8F0' : '#5E5C58'}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.scopeTabText, scope === s && styles.scopeTabTextActive]}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Chat Area */}
            <ScrollView
                ref={scrollRef}
                style={styles.chatArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.chatContent}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map(msg => (
                    <View
                        key={msg.id}
                        style={[
                            styles.bubble,
                            msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAI,
                        ]}
                    >
                        {msg.sender === 'ai' && (
                            <View style={styles.aiAvatar}>
                                <Feather name="shield" size={13} color="#FDF8F0" />
                            </View>
                        )}
                        <Text style={[
                            styles.bubbleText,
                            msg.sender === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI,
                        ]}>
                            {msg.text}
                        </Text>
                    </View>
                ))}

                {/* Animated typing indicator */}
                {isLoading && (
                    <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                        <View style={styles.aiAvatar}>
                            <Feather name="shield" size={13} color="#FDF8F0" />
                        </View>
                        <View style={styles.dotsRow}>
                            {[dot1, dot2, dot3].map((dot, i) => (
                                <Animated.View
                                    key={i}
                                    style={[styles.dot, { transform: [{ translateY: dot }] }]}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Suggested queries */}
                {showSuggestions && (
                    <View style={styles.suggestions}>
                        <Text style={styles.suggestionsLabel}>Try asking:</Text>
                        {SUGGESTIONS[scope].map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.chip}
                                onPress={() => handleSend(s)}
                                activeOpacity={0.75}
                            >
                                <Text style={styles.chipText}>{s}</Text>
                                <Feather name="arrow-up-right" size={13} color="#C9A84C" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder={`Search ${scope === 'quran' ? 'Quran' : scope === 'hadith' ? 'Hadith' : 'Fiqh'}…`}
                        placeholderTextColor="#5E5C58"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, message.trim() && !isLoading && styles.sendBtnActive]}
                        onPress={() => handleSend()}
                        disabled={isLoading || !message.trim()}
                        activeOpacity={0.8}
                    >
                        <Feather
                            name="send"
                            size={18}
                            color={message.trim() && !isLoading ? '#FDF8F0' : '#5E5C58'}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.poweredBy}>Powered by Qurani.ai</Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FDF8F0' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '500', letterSpacing: 0.5 },
    onlineStatus: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964' },

    // Scope tabs
    scopeRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    scopeTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    scopeTabActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
    scopeTabText: { color: '#5E5C58', fontSize: 13, fontWeight: '500' },
    scopeTabTextActive: { color: '#FDF8F0', fontWeight: '600' },

    // Chat
    chatArea: { flex: 1 },
    chatContent: { padding: 20, paddingBottom: 16 },
    bubble: {
        maxWidth: '88%',
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
    },
    bubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#C9A84C',
        borderBottomRightRadius: 4,
    },
    bubbleAI: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        gap: 10,
    },
    typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
    aiAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#C9A84C',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    bubbleText: { fontSize: 15, lineHeight: 23 },
    bubbleTextUser: { color: '#FDF8F0', fontWeight: '500' },
    bubbleTextAI: { color: '#1A1A1A', flex: 1 },

    // Typing dots
    dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#C9A84C' },

    // Suggestions
    suggestions: { marginTop: 4 },
    suggestionsLabel: {
        color: '#5E5C58',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(201,168,76,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.15)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 11,
        marginBottom: 8,
    },
    chipText: { color: '#C9A84C', fontSize: 14, flex: 1, marginRight: 8 },

    // Input
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#FDF8F0',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    input: {
        flex: 1,
        color: '#1A1A1A',
        fontSize: 15,
        maxHeight: 100,
        minHeight: 24,
        paddingTop: 2,
        paddingBottom: 2,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    sendBtnActive: { backgroundColor: '#C9A84C' },
    poweredBy: { color: '#2A2A2A', fontSize: 11, textAlign: 'center', marginTop: 8 },
});
