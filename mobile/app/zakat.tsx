import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ZakatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const locales = getLocales();
    const currentLocale = locales && locales.length > 0 ? locales[0] : null;
    const currencyCode = currentLocale?.currencyCode || 'USD';
    const currencySymbol = currentLocale?.currencySymbol || '$';
    const languageTag = currentLocale?.languageTag || 'en-US';

    const [currentStep, setCurrentStep] = useState(1);
    const [nisabMet, setNisabMet] = useState<boolean | null>(null); // null = not confirmed yet

    // Step 1: Assets
    const [cash, setCash] = useState('');
    const [goldSilver, setGoldSilver] = useState('');
    const [investments, setInvestments] = useState('');

    // Step 2: Business & Property
    const [business, setBusiness] = useState('');
    const [property, setProperty] = useState('');

    // Step 3: Liabilities
    const [debts, setDebts] = useState('');
    const [bills, setBills] = useState('');

    const parseAmount = (val: string) => {
        const num = parseFloat(val.replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
    };

    const step1Total = parseAmount(cash) + parseAmount(goldSilver) + parseAmount(investments);
    const step2Total = parseAmount(business) + parseAmount(property);
    const step3Total = parseAmount(debts) + parseAmount(bills);

    const totalAssets = step1Total + step2Total;
    const totalLiabilities = step3Total;
    const netWealth = totalAssets - totalLiabilities;
    const zakatPayable = netWealth > 0 ? netWealth * 0.025 : 0;

    const handleNext = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else router.back();
    };

    const stepTitles = ["Wealth Assessment", "Business & Property", "Liabilities & Debts", "Zakat Summary"];

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
                    <Feather name="chevron-left" size={28} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Zakat Calculator</Text>
                <TouchableOpacity style={styles.infoButton}>
                    <Text style={styles.infoButtonText}>i</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.progressHeader}>
                <View style={styles.progressTextRow}>
                    <Text style={styles.stepTitle}>{stepTitles[currentStep - 1]}</Text>
                    <Text style={styles.stepCount}>Step {currentStep} of 4</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${(currentStep / 4) * 100}%` }]} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {currentStep === 1 && (
                    <>
                        <Text style={styles.sectionTitle}>Assets & Savings</Text>

                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Feather name="anchor" size={16} color="#eab308" style={{ transform: [{ rotate: '45deg' }] }} />
                                    </View>
                                    <Text style={styles.cardTitle}>Gold & Silver</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Current market value of your holdings</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={goldSilver}
                                    onChangeText={setGoldSilver}
                                />
                            </View>
                        </View>

                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Feather name="credit-card" size={16} color="#eab308" />
                                    </View>
                                    <Text style={styles.cardTitle}>Cash on Hand & Bank</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>All savings in your accounts</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={cash}
                                    onChangeText={setCash}
                                />
                            </View>
                        </View>

                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Feather name="trending-up" size={16} color="#eab308" />
                                    </View>
                                    <Text style={styles.cardTitle}>Investments & Stocks</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Stocks, crypto, and market investments</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={investments}
                                    onChangeText={setInvestments}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 2 && (
                    <>
                        <Text style={styles.sectionTitle}>Business & Property</Text>
                        
                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Feather name="briefcase" size={16} color="#eab308" />
                                    </View>
                                    <Text style={styles.cardTitle}>Business Inventory</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Goods available for sale in your business</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={business}
                                    onChangeText={setBusiness}
                                />
                            </View>
                        </View>

                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={styles.iconBadge}>
                                        <Feather name="home" size={16} color="#eab308" />
                                    </View>
                                    <Text style={styles.cardTitle}>Real Estate for Trade</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Current value of property held specifically for resale</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={property}
                                    onChangeText={setProperty}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 3 && (
                    <>
                        <Text style={styles.sectionTitle}>Liabilities</Text>
                        
                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                                        <Feather name="minus-circle" size={16} color="#ef4444" />
                                    </View>
                                    <Text style={styles.cardTitle}>Unpaid Debts</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Personal loans and money owed to others</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={debts}
                                    onChangeText={setDebts}
                                />
                            </View>
                        </View>

                        <View style={styles.assetCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                                        <Feather name="file-text" size={16} color="#ef4444" />
                                    </View>
                                    <Text style={styles.cardTitle}>Outstanding Bills</Text>
                                </View>
                                <View style={styles.helpIcon}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Immediate bills due or overdue rent</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#9ca3af"
                                    value={bills}
                                    onChangeText={setBills}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 4 && (
                    <>
                        <Text style={styles.sectionTitle}>Final Breakdown</Text>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Assets</Text>
                                <Text style={styles.summaryValuePos}>+ {currencySymbol}{Math.max(0, totalAssets).toLocaleString(languageTag)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Liabilities</Text>
                                <Text style={styles.summaryValueNeg}>- {currencySymbol}{Math.max(0, totalLiabilities).toLocaleString(languageTag)}</Text>
                            </View>

                            <View style={styles.summaryDivider} />

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabelBold}>Net Zakatable Wealth</Text>
                                <Text style={styles.summaryValueBold}>{currencySymbol}{Math.max(0, netWealth).toLocaleString(languageTag)}</Text>
                            </View>
                        </View>

                        {/* Nisab Confirmation — must verify before showing zakat due */}
                        <View style={styles.nisabCard}>
                            <Text style={styles.nisabTitle}>Have you reached Nisab?</Text>
                            <Text style={styles.nisabDesc}>
                                Zakat is only obligatory if your net wealth has been above the Nisab threshold (≈ 85g gold / 595g silver) for one full lunar year.
                            </Text>
                            <View style={styles.nisabBtnRow}>
                                <TouchableOpacity
                                    style={[styles.nisabBtn, nisabMet === true && styles.nisabBtnYes]}
                                    onPress={() => setNisabMet(true)}
                                >
                                    <Text style={[styles.nisabBtnText, nisabMet === true && { color: '#FFFFFF' }]}>Yes, I have</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.nisabBtn, nisabMet === false && styles.nisabBtnNo]}
                                    onPress={() => setNisabMet(false)}
                                >
                                    <Text style={[styles.nisabBtnText, nisabMet === false && { color: '#FFFFFF' }]}>Below Nisab</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {nisabMet === false && (
                            <View style={[styles.disclaimerCard, { backgroundColor: '#ecfdf5', borderColor: '#bbf7d0', borderWidth: 1 }]}>
                                <Feather name="check-circle" size={20} color="#16a34a" style={{ marginTop: 2 }} />
                                <Text style={[styles.disclaimerText, { color: '#15803d' }]}>
                                    Zakat is not obligatory on you at this time. Continue building your wealth and revisit next lunar year.
                                </Text>
                            </View>
                        )}

                        {nisabMet === null && (
                            <View style={styles.disclaimerCard}>
                                <Feather name="info" size={20} color="#f59e0b" style={{ marginTop: 2 }} />
                                <Text style={styles.disclaimerText}>
                                    Please confirm your Nisab status above before viewing your Zakat obligation.
                                </Text>
                            </View>
                        )}
                    </>
                )}

            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.stickyCard}>
                    <View>
                        <Text style={styles.stickyLabel}>ESTIMATED ZAKAT</Text>
                        <Text style={styles.stickyAmount}>
                            {currentStep === 4 && nisabMet === false
                                ? 'Not Due'
                                : currentStep === 4 && nisabMet === null
                                    ? 'Confirm Nisab'
                                    : `${currencySymbol}${(nisabMet === true ? zakatPayable : 0).toLocaleString(languageTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>{currentStep < 4 ? 'Next Step' : 'Finish'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
        backgroundColor: '#FFFFFF',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        letterSpacing: -0.5,
    },
    infoButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    progressHeader: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.02)',
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
        marginTop: 8,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    stepCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#facc15',
        borderRadius: 4,
    },
    scrollContent: {
        paddingBottom: 110,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 16,
    },
    assetCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#fef9c3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    helpIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#9ca3af',
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpIconText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -1,
    },
    cardDesc: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    currencySymbol: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '700',
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        height: '100%',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#4b5563',
        fontWeight: '500',
    },
    summaryValuePos: {
        fontSize: 18,
        color: '#16a34a',
        fontWeight: '700',
    },
    summaryValueNeg: {
        fontSize: 18,
        color: '#dc2626',
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
        marginBottom: 20,
    },
    summaryLabelBold: {
        fontSize: 18,
        color: '#111827',
        fontWeight: '800',
    },
    summaryValueBold: {
        fontSize: 22,
        color: '#111827',
        fontWeight: '800',
    },
    nisabCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    nisabTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
    },
    nisabDesc: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 16,
    },
    nisabBtnRow: {
        flexDirection: 'row',
        gap: 12,
    },
    nisabBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    nisabBtnYes: {
        backgroundColor: '#16a34a',
        borderColor: '#16a34a',
    },
    nisabBtnNo: {
        backgroundColor: '#6b7280',
        borderColor: '#6b7280',
    },
    nisabBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    disclaimerCard: {
        flexDirection: 'row',
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        marginHorizontal: 20,
        padding: 16,
        gap: 12,
    },
    disclaimerText: {
        flex: 1,
        color: '#b45309',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
    },
    bottomBar: {
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: 'transparent',
    },
    stickyCard: {
        backgroundColor: '#22c55e',
        borderRadius: 28,
        paddingVertical: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    stickyLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    stickyAmount: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    nextBtn: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    nextBtnText: {
        color: '#16a34a',
        fontSize: 16,
        fontWeight: 'bold',
    },
});