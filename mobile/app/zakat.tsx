import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ZakatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [cash, setCash] = useState('');
    const [goldSilver, setGoldSilver] = useState('');
    const [investments, setInvestments] = useState('');
    const [debts, setDebts] = useState('');

    const parseAmount = (val: string) => {
        const num = parseFloat(val.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    };

    const totalAssets = parseAmount(cash) + parseAmount(goldSilver) + parseAmount(investments);
    const netWealth = totalAssets - parseAmount(debts);
    const zakatPayable = netWealth > 0 ? netWealth * 0.025 : 0;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Zakat Calculator</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Result Card */}
                <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Estimated Zakat (2.5%)</Text>
                    <Text style={styles.resultAmount}>
                        ${zakatPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.resultDetails}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Net Wealth</Text>
                            <Text style={styles.detailValue}>${Math.max(0, netWealth).toLocaleString('en-US')}</Text>
                        </View>
                    </View>
                </View>

                {/* Input Fields */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionTitle}>Assets</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="dollar-sign" size={16} color="#f2930d" />
                            <Text style={styles.inputLabel}>Cash & Bank Balance</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#A0A0A0"
                            value={cash}
                            onChangeText={setCash}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="box" size={16} color="#f2930d" />
                            <Text style={styles.inputLabel}>Gold & Silver Value</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#A0A0A0"
                            value={goldSilver}
                            onChangeText={setGoldSilver}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="trending-up" size={16} color="#f2930d" />
                            <Text style={styles.inputLabel}>Investments & Shares</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#A0A0A0"
                            value={investments}
                            onChangeText={setInvestments}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Liabilities</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="trending-down" size={16} color="#F25B5B" />
                            <Text style={styles.inputLabel}>Debts & Loans (-)</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#A0A0A0"
                            value={debts}
                            onChangeText={setDebts}
                        />
                    </View>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDF8F0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    headerTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 20,
    },
    resultCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    resultLabel: {
        color: '#8A8A8A',
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 10,
        fontWeight: '500',
    },
    resultAmount: {
        color: '#f2930d',
        fontSize: 42,
        fontWeight: '300',
        letterSpacing: -1,
        marginBottom: 20,
    },
    resultDetails: {
        width: '100%',
        backgroundColor: '#FDF8F0',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#8A8A8A',
        fontSize: 14,
        fontWeight: '500',
    },
    detailValue: {
        color: '#1A1A1A',
        fontSize: 16,
        fontWeight: '600',
    },
    inputSection: {
        flex: 1,
    },
    sectionTitle: {
        color: '#1A1A1A',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    inputLabel: {
        color: '#8A8A8A',
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        color: '#1A1A1A',
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
    },
});
