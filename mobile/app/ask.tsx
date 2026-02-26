import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AiDeenScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { id: '1', text: 'As-salamu alaykum! How can I help you regarding Islam today?', sender: 'ai' }
    ]);

    const handleSend = () => {
        if (!message.trim()) return;

        setMessages(prev => [...prev, { id: Date.now().toString(), text: message, sender: 'user' }]);
        setMessage('');

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: 'Jazakallah Khair for your question. As this is a demo, I am currently not connected to the live knowledge base. Please check back later!',
                sender: 'ai'
            }]);
        }, 1500);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Ask AiDeen</Text>
                    <View style={styles.onlineStatus} />
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Chat Area */}
            <ScrollView
                style={styles.chatArea}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageBubble,
                            msg.sender === 'user' ? styles.messageUser : styles.messageAI
                        ]}
                    >
                        {msg.sender === 'ai' && (
                            <View style={styles.aiIcon}>
                                <Feather name="shield" size={14} color="#0C0F0E" />
                            </View>
                        )}
                        <Text style={[
                            styles.messageText,
                            msg.sender === 'user' ? styles.messageTextUser : styles.messageTextAI
                        ]}>
                            {msg.text}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 20 }]}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about Quran, Hadith, or Fiqh..."
                        placeholderTextColor="#5E5C58"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, message.trim() ? styles.sendButtonActive : null]}
                        onPress={handleSend}
                    >
                        <Feather name="send" size={20} color={message.trim() ? '#0C0F0E' : '#9A9590'} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0F0E',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)'
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    onlineStatus: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CD964', // Green online dot
    },
    chatArea: {
        flex: 1,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    messageUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#C9A84C', // Gold for user
        borderBottomRightRadius: 4,
    },
    messageAI: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderBottomLeftRadius: 4,
        flexDirection: 'row',
        gap: 12,
    },
    aiIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#C9A84C',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    messageTextUser: {
        color: '#0C0F0E',
        fontWeight: '500',
    },
    messageTextAI: {
        color: '#E8E6E1',
        flex: 1,
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: '#0C0F0E',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        color: '#E8E6E1',
        fontSize: 15,
        maxHeight: 100,
        minHeight: 24, // For alignment with button
        paddingTop: 0,
        paddingBottom: 0,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    sendButtonActive: {
        backgroundColor: '#C9A84C',
    }
});
