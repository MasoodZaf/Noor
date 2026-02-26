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
                    <Feather name="chevron-left" size={28} color="#E8E6E1" />
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
                            <Feather name="dollar-sign" size={16} color="#C9A84C" />
                            <Text style={styles.inputLabel}>Cash & Bank Balance</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#5E5C58"
                            value={cash}
                            onChangeText={setCash}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="box" size={16} color="#C9A84C" />
                            <Text style={styles.inputLabel}>Gold & Silver Value</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#5E5C58"
                            value={goldSilver}
                            onChangeText={setGoldSilver}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="trending-up" size={16} color="#C9A84C" />
                            <Text style={styles.inputLabel}>Investments & Shares</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#5E5C58"
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
                            placeholderTextColor="#5E5C58"
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
        backgroundColor: '#0C0F0E',
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
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 20,
    },
    resultCard: {
        backgroundColor: 'rgba(31, 78, 61, 0.2)', // Forest Green tint
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.3)', // Gold border
        marginBottom: 40,
    },
    resultLabel: {
        color: '#9A9590',
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    resultAmount: {
        color: '#C9A84C', // Gold
        fontSize: 42,
        fontWeight: '300',
        letterSpacing: -1,
        marginBottom: 20,
    },
    resultDetails: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#E8E6E1',
        fontSize: 14,
    },
    detailValue: {
        color: '#E8E6E1',
        fontSize: 16,
        fontWeight: '600',
    },
    inputSection: {
        flex: 1,
    },
    sectionTitle: {
        color: '#E8E6E1',
        fontSize: 18,
        fontWeight: '500',
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
        color: '#9A9590',
        fontSize: 14,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 16,
        color: '#E8E6E1',
        fontSize: 18,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
});
