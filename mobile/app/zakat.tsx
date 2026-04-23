import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, BackHandler, Alert, Keyboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function ZakatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    const locales = getLocales();
    const currentLocale = locales && locales.length > 0 ? locales[0] : null;
    const currencyCode = currentLocale?.currencyCode || 'USD';
    const currencySymbol = currentLocale?.currencySymbol || '$';
    const languageTag = currentLocale?.languageTag || 'en-US';

    const [currentStep, setCurrentStep] = useState(1);

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
        return isNaN(num) || num < 0 ? 0 : num;
    };

    const step1Total = parseAmount(cash) + parseAmount(goldSilver) + parseAmount(investments);
    const step2Total = parseAmount(business) + parseAmount(property);
    const step3Total = parseAmount(debts) + parseAmount(bills);

    const totalAssets = step1Total + step2Total;
    const totalLiabilities = step3Total;
    const netWealth = totalAssets - totalLiabilities;
    const zakatPayable = netWealth > 0 ? netWealth * 0.025 : 0;

    // M6: Android hardware back
    useFocusEffect(useCallback(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => sub.remove();
    }, [currentStep]));

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        } else {
            // C2: Finish — go back after completing the calculator
            router.back();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
        else router.back();
    };

    const showZakatInfo = () => {
        Alert.alert(
            'About Zakat',
            'Zakat is one of the Five Pillars of Islam. It is an obligatory annual payment of 2.5% on wealth that has been held for one full lunar year (Hawl) above the Nisab threshold.\n\nNisab is approximately 85g of gold or 595g of silver in current market value.',
            [{ text: 'OK' }]
        );
    };

    const showFieldHelp = (field: string) => {
        const info: Record<string, string> = {
            gold: 'Include all gold and silver jewellery, coins, and bars. Use current market value.',
            cash: 'Include all cash at home, in bank accounts, savings, and digital wallets.',
            investments: 'Include stocks, mutual funds, crypto, and other market investments at current value.',
            business: 'Include the current market value of inventory and goods held for resale — not fixed assets.',
            property: 'Only include real estate held specifically for resale, not your primary home.',
            debts: 'Include personal loans, money borrowed from others that is currently due.',
            bills: 'Include rent arrears, outstanding utility bills, and other immediate liabilities due.',
        };
        Alert.alert('Help', info[field] || '', [{ text: 'OK' }]);
    };

    const stepTitles = ["Wealth Assessment", "Business & Property", "Liabilities & Debts", "Zakat Summary"];

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.header, { backgroundColor: theme.bgCard }]}>
                <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Zakat Calculator</Text>
                <View style={styles.headerActionsRow}>
                    {/* Home shortcut — exit the multi-step flow at any point */}
                    <TouchableOpacity
                        style={styles.headerHomeBtn}
                        onPress={() => router.replace('/(tabs)' as any)}
                        hitSlop={10}
                    >
                        <Feather name="home" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.infoButton, { backgroundColor: theme.textPrimary }]} onPress={showZakatInfo}>
                        <Text style={styles.infoButtonText}>i</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.progressHeader, { backgroundColor: theme.bgCard, borderBottomColor: theme.border }]}>
                <View style={styles.progressTextRow}>
                    <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{stepTitles[currentStep - 1]}</Text>
                    <Text style={[styles.stepCount, { color: theme.textSecondary }]}>Step {currentStep} of 4</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.bgInput }]}>
                    <View style={[styles.progressBarFill, { width: `${(currentStep / 4) * 100}%`, backgroundColor: theme.gold }]} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                onScrollBeginDrag={Keyboard.dismiss}
            >
                {currentStep === 1 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Assets & Savings</Text>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
                                        <Feather name="anchor" size={16} color={theme.gold} style={{ transform: [{ rotate: '45deg' }] }} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Gold & Silver</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('gold')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Current market value of your holdings</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={goldSilver}
                                    onChangeText={setGoldSilver}
                                />
                            </View>
                        </View>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
                                        <Feather name="credit-card" size={16} color={theme.gold} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Cash on Hand & Bank</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('cash')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>All savings in your accounts</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={cash}
                                    onChangeText={setCash}
                                />
                            </View>
                        </View>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
                                        <Feather name="trending-up" size={16} color={theme.gold} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Investments & Stocks</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('investments')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Stocks, crypto, and market investments</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={investments}
                                    onChangeText={setInvestments}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 2 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Business & Property</Text>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
                                        <Feather name="briefcase" size={16} color={theme.gold} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Business Inventory</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('business')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Goods available for sale in your business</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={business}
                                    onChangeText={setBusiness}
                                />
                            </View>
                        </View>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: theme.accentLight }]}>
                                        <Feather name="home" size={16} color={theme.gold} />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Real Estate for Trade</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('property')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Current value of property held specifically for resale</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={property}
                                    onChangeText={setProperty}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 3 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Liabilities</Text>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                                        <Feather name="minus-circle" size={16} color="#ef4444" />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Unpaid Debts</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('debts')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Personal loans and money owed to others</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={debts}
                                    onChangeText={setDebts}
                                />
                            </View>
                        </View>

                        <View style={[styles.assetCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardTitleRow}>
                                    <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                                        <Feather name="file-text" size={16} color="#ef4444" />
                                    </View>
                                    <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Outstanding Bills</Text>
                                </View>
                                <TouchableOpacity style={styles.helpIcon} onPress={() => showFieldHelp('bills')}>
                                    <Text style={styles.helpIconText}>?</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Immediate bills due or overdue rent</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.bgInput }]}>
                                <Text style={[styles.currencySymbol, { color: theme.textTertiary }]}>{currencySymbol}</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={theme.textTertiary}
                                    value={bills}
                                    onChangeText={setBills}
                                />
                            </View>
                        </View>
                    </>
                )}

                {currentStep === 4 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Final Breakdown</Text>

                        <View style={[styles.summaryCard, { backgroundColor: theme.bgCard }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Assets</Text>
                                <Text style={styles.summaryValuePos}>+ {currencySymbol}{Math.max(0, totalAssets).toLocaleString(languageTag)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Liabilities</Text>
                                <Text style={styles.summaryValueNeg}>- {currencySymbol}{Math.max(0, totalLiabilities).toLocaleString(languageTag)}</Text>
                            </View>

                            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />

                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabelBold, { color: theme.textPrimary }]}>Net Zakatable Wealth</Text>
                                <Text style={[styles.summaryValueBold, { color: theme.textPrimary }]}>{currencySymbol}{Math.max(0, netWealth).toLocaleString(languageTag)}</Text>
                            </View>
                        </View>

                        {/* Nisab note — informational only. The Yes/No question previously gated the
                            calculation, but with £100k assets and "No" selected the user saw £0 owed,
                            which was confusing. Calculation now runs unconditionally; user is reminded
                            to verify the Nisab + one-lunar-year (Hawl) condition themselves. */}
                        <View style={[styles.disclaimerCard, { backgroundColor: theme.bgInput, borderColor: theme.border, borderWidth: 1 }]}>
                            <Feather name="info" size={20} color={theme.gold} style={{ marginTop: 2 }} />
                            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
                                Zakat is only obligatory if your wealth has stayed above the Nisab threshold (≈ 85g gold / 595g silver) for one full lunar year (Hawl). The estimate above assumes both conditions are met.
                            </Text>
                        </View>
                    </>
                )}

            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={[styles.stickyCard, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
                    <View>
                        <Text style={styles.stickyLabel}>ESTIMATED ZAKAT</Text>
                        {/* Always live — recomputes from `zakatPayable` on every keystroke. Previously
                            this was gated on a Nisab confirmation that only appeared on step 4, so the
                            user saw £0 even after entering £100k of assets. */}
                        <Text style={styles.stickyAmount}>
                            {currencySymbol}{zakatPayable.toLocaleString(languageTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.gold }]} onPress={handleNext}>
                        <Text style={[styles.nextBtnText, { color: theme.textInverse }]}>{currentStep < 4 ? 'Next Step' : 'Finish'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.5 },
    headerActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerHomeBtn: { padding: 4 },
    infoButton: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    infoButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', fontStyle: 'italic' },
    progressHeader: { paddingHorizontal: 20, paddingBottom: 24, borderBottomWidth: 1 },
    progressTextRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 12, marginTop: 8,
    },
    stepTitle: { fontSize: 16, fontWeight: '800' },
    stepCount: { fontSize: 14, fontWeight: '600' },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    scrollContent: { paddingBottom: 110 },
    sectionTitle: { fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginTop: 24, marginBottom: 16 },
    assetCard: {
        borderRadius: 24, marginHorizontal: 20, marginBottom: 16, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    helpIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#9ca3af', alignItems: 'center', justifyContent: 'center' },
    helpIconText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', marginTop: -1 },
    cardDesc: { fontSize: 13, marginBottom: 16, fontWeight: '500' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56 },
    currencySymbol: { fontSize: 16, fontWeight: '700', marginRight: 8 },
    input: { flex: 1, fontSize: 16, fontWeight: '700', height: '100%' },
    summaryCard: {
        borderRadius: 24, marginHorizontal: 20, marginBottom: 16, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    summaryLabel: { fontSize: 16, fontWeight: '500' },
    summaryValuePos: { fontSize: 18, color: '#16a34a', fontWeight: '700' },
    summaryValueNeg: { fontSize: 18, color: '#dc2626', fontWeight: '700' },
    summaryDivider: { height: 1, marginVertical: 12, marginBottom: 20 },
    summaryLabelBold: { fontSize: 18, fontWeight: '800' },
    summaryValueBold: { fontSize: 22, fontWeight: '800' },
    disclaimerCard: { flexDirection: 'row', borderRadius: 16, marginHorizontal: 20, padding: 16, gap: 12 },
    disclaimerText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
    bottomBar: { paddingHorizontal: 16, paddingTop: 16 },
    stickyCard: {
        borderRadius: 28, paddingVertical: 20, paddingHorizontal: 24,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16,
    },
    stickyLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    stickyAmount: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
    nextBtn: {
        paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    nextBtnText: { fontSize: 16, fontWeight: 'bold' },
});