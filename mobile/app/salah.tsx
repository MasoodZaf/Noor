import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    Platform, Animated, BackHandler, Modal, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Salah Arkaan (Pillars / Positions) ───────────────────────────────────────
const ARKAAN = [
    {
        id: 'niyyah',
        number: 1,
        title: 'Niyyah',
        subtitle: 'Intention',
        arabic: 'النِّيَّة',
        position: 'standing',
        description: 'Make the intention in your heart to perform the prayer for the sake of Allah. The intention does not need to be spoken aloud — it is an act of the heart.',
        arabic_text: null,
        transliteration: null,
        translation: null,
        note: 'Intention is a condition (shart), not a rukun in some madhabs, but all agree it must precede the prayer.',
    },
    {
        id: 'takbir',
        number: 2,
        title: 'Takbiratul Ihram',
        subtitle: 'Opening Takbeer',
        arabic: 'تَكْبِيرَةُ الإِحْرَام',
        position: 'standing',
        description: 'Raise both hands level with your shoulders (or earlobes), palms facing the qibla, and say the opening takbeer. This marks the sacred entry into Salah.',
        arabic_text: 'اللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: 'Allah is the Greatest',
        note: 'After takbeer, fold the right hand over the left on the chest.',
    },
    {
        id: 'qiyam',
        number: 3,
        title: 'Qiyam',
        subtitle: 'Standing',
        arabic: 'القِيَام',
        position: 'standing',
        description: 'Stand upright facing the qibla. Recite Surah Al-Fatiha (obligatory) followed by any portion of the Quran in the first two rak\'ahs.',
        arabic_text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ۝ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
        transliteration: 'Bismillāhi r-raḥmāni r-raḥīm... Al-ḥamdu lillāhi Rabbi l-ʿālamīn...',
        translation: 'In the name of Allah, the Most Gracious, the Most Merciful. All praise is due to Allah, Lord of all the worlds...',
        note: 'Al-Fatiha is a rukun. Recitation is obligatory for the imam and for one praying alone.',
    },
    {
        id: 'ruku',
        number: 4,
        title: 'Ruku\'',
        subtitle: 'Bowing',
        arabic: 'الرُّكُوع',
        position: 'ruku',
        description: 'Bend forward from the waist until your back is flat and parallel to the ground. Place both palms firmly on your knees with fingers spread.',
        arabic_text: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ',
        transliteration: 'Subḥāna Rabbiya l-ʿAẓīm',
        translation: 'Glory be to my Lord, the Most Great',
        note: 'Recite at least three times. Rise saying "Sami\'allahu liman hamidah".',
    },
    {
        id: 'itidal',
        number: 5,
        title: 'I\'tidal',
        subtitle: 'Rising from Ruku\'',
        arabic: 'الِاعْتِدَال',
        position: 'standing',
        description: 'Rise from ruku\' until you stand fully upright. The back must return to its full upright position before proceeding to sujood.',
        arabic_text: 'رَبَّنَا وَلَكَ الْحَمْدُ، حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ',
        transliteration: 'Rabbanā wa laka l-ḥamd, ḥamdan kathīran ṭayyiban mubārakan fīh',
        translation: 'Our Lord, and to You is all praise — praise that is abundant, pure, and blessed',
        note: 'Tumma\'ninah (stillness) in i\'tidal is wajib — do not rush from ruku\' straight to sujood.',
    },
    {
        id: 'sujood',
        number: 6,
        title: 'Sujood',
        subtitle: 'Prostration',
        arabic: 'السُّجُود',
        position: 'sujood',
        description: 'Prostrate with seven limbs touching the ground: forehead (with nose), both palms, both knees, and the toes of both feet. The back should be raised.',
        arabic_text: 'سُبْحَانَ رَبِّيَ الْأَعْلَى',
        transliteration: 'Subḥāna Rabbiya l-Aʿlā',
        translation: 'Glory be to my Lord, the Most High',
        note: 'The closest a servant is to Allah is while in sujood. Recite at least three times.',
    },
    {
        id: 'jalsa',
        number: 7,
        title: 'Jalsa',
        subtitle: 'Sitting between Prostrations',
        arabic: 'الجَلسَة',
        position: 'sitting',
        description: 'Sit upright between the two sujoods. The left foot is flat on the ground and sat upon; the right foot is upright with toes pointing toward the qibla.',
        arabic_text: 'رَبِّ اغْفِرْ لِي',
        transliteration: 'Rabbi ghfir lī',
        translation: 'My Lord, forgive me',
        note: 'Both the first and second sujood require tumma\'ninah (momentary stillness).',
    },
    {
        id: 'tashahhud',
        number: 8,
        title: 'Tashahhud',
        subtitle: 'Final Sitting',
        arabic: 'التَّشَهُّد',
        position: 'tashahhud',
        description: 'In the final rak\'ah, sit in tashahhud position. The right foot is upright; the left foot is flat and tucked under. Rest hands on thighs and raise the right index finger during the shahada.',
        arabic_text: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
        transliteration: 'At-taḥiyyātu lillāhi wa ṣ-ṣalawātu wa ṭ-ṭayyibāt...',
        translation: 'All greetings are for Allah, all acts of worship and good deeds...',
        note: 'The Salawat Ibrahimiyyah (sending blessings on the Prophet) is then recited.',
    },
    {
        id: 'salam',
        number: 9,
        title: 'Tasleem',
        subtitle: 'Closing Salutation',
        arabic: 'التَّسْلِيم',
        position: 'salam',
        description: 'Turn the head to the right while saying the salam, then to the left. This ends the prayer and exits the sacred state of Salah.',
        arabic_text: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
        transliteration: 'As-salāmu ʿalaykum wa raḥmatu Llāh',
        translation: 'Peace and mercy of Allah be upon you',
        note: 'Both salams are wajib (necessary). The prayer is now complete.',
    },
];

const RULE_COLORS: Record<string, string> = {
    niyyah:   '#7B4FA6',
    takbir:   '#C9A84C',
    qiyam:    '#2E7D50',
    ruku:     '#1B5FA6',
    itidal:   '#2E7D50',
    sujood:   '#A63535',
    jalsa:    '#A63535',
    tashahhud:'#4A6FA6',
    salam:    '#7B4FA6',
};

// ─── Salah Position Images ────────────────────────────────────────────────────
// Bundled cartoon illustrations, one per rukun.
const SALAH_IMAGES: Record<string, any> = {
    niyyah:    require('../assets/salah/niyyah.webp'),
    takbir:    require('../assets/salah/takbir.webp'),
    qiyam:     require('../assets/salah/qiyam.webp'),
    ruku:      require('../assets/salah/ruku.webp'),
    itidal:    require('../assets/salah/itidal.webp'),
    sujood:    require('../assets/salah/sujood.webp'),
    jalsa:     require('../assets/salah/tashahhud.webp'), // closest available
    tashahhud: require('../assets/salah/tashahhud.webp'),
    salam:     require('../assets/salah/salam.webp'),
};

function SalahPositionImage({ rukunId, size = 190 }: { rukunId: string; size?: number }) {
    const src = SALAH_IMAGES[rukunId];
    if (!src) return null;
    return (
        <Image
            source={src}
            style={{ width: size, height: size, resizeMode: 'contain' }}
        />
    );
}

// Fades in the new image whenever the rukun changes
function FadingPositionImage({ rukunId, size }: { rukunId: string; size: number }) {
    const opacity = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        opacity.setValue(0);
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }, [rukunId]);
    return (
        <Animated.View style={{ opacity }}>
            <SalahPositionImage rukunId={rukunId} size={size} />
        </Animated.View>
    );
}

const figStyles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
});


// ─── Animation Modal ──────────────────────────────────────────────────────────
function AnimationModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: AppTheme }) {
    const [idx, setIdx] = useState(0);
    const insets = useSafeAreaInsets();

    useEffect(() => { if (visible) setIdx(0); }, [visible]);

    // Auto-advance — deps contain only [visible] so the interval runs continuously
    // without restarting on manual navigation. setIdx uses functional form to avoid stale closure.
    useEffect(() => {
        if (!visible) return;
        const id = setInterval(() => setIdx(i => (i + 1) % ARKAAN.length), 4500);
        return () => clearInterval(id);
    }, [visible]);

    const rukun = ARKAAN[idx];
    const color = RULE_COLORS[rukun.id] ?? '#7B4FA6';

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={[modalStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.bg }]}>
                {/* Header */}
                <View style={modalStyles.header}>
                    <Text style={[modalStyles.headerTitle, { color: theme.textPrimary }]}>Salah Positions</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={modalStyles.closeBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Close animated positions"
                    >
                        <Feather name="x" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Position label */}
                <View style={modalStyles.labelRow}>
                    <View style={[modalStyles.numBadge, { backgroundColor: color }]}>
                        <Text style={modalStyles.numText}>{rukun.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[modalStyles.posTitle, { color: theme.textPrimary }]}>{rukun.title}</Text>
                        <Text style={[modalStyles.posSub, { color: theme.textTertiary }]}>{rukun.subtitle}</Text>
                    </View>
                    <Text style={[modalStyles.posArabic, { color }]}>{rukun.arabic}</Text>
                </View>

                {/* Position illustration */}
                <View style={[modalStyles.figureArea, { borderColor: color + '30', backgroundColor: color + '0A' }]}>
                    <FadingPositionImage rukunId={rukun.id} size={260} />
                </View>

                {/* Description */}
                <Text style={[modalStyles.desc, { color: theme.textSecondary }]} numberOfLines={3}>{rukun.description}</Text>

                {/* Dot indicators */}
                <View style={modalStyles.dots}>
                    {ARKAAN.map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setIdx(i)}
                            accessibilityRole="button"
                            accessibilityLabel={`Go to position ${i + 1}, ${ARKAAN[i].title}`}
                            accessibilityState={{ selected: i === idx }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <View style={[modalStyles.dot, { backgroundColor: theme.border }, i === idx && { backgroundColor: color, width: 18 }]} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Prev / Next */}
                <View style={modalStyles.navRow}>
                    <TouchableOpacity
                        style={[modalStyles.navBtn, { backgroundColor: theme.bgCard, opacity: idx === 0 ? 0.35 : 1 }]}
                        onPress={() => setIdx(i => Math.max(0, i - 1))}
                        accessibilityRole="button"
                        accessibilityLabel="Previous position"
                        accessibilityState={{ disabled: idx === 0 }}
                    >
                        <Feather name="chevron-left" size={22} color={theme.textPrimary} />
                        <Text style={[modalStyles.navText, { color: theme.textPrimary }]}>Prev</Text>
                    </TouchableOpacity>
                    <Text style={[modalStyles.navCount, { color: theme.textTertiary }]}>{idx + 1} / {ARKAAN.length}</Text>
                    <TouchableOpacity
                        style={[modalStyles.navBtn, { backgroundColor: theme.bgCard, opacity: idx === ARKAAN.length - 1 ? 0.35 : 1 }]}
                        onPress={() => setIdx(i => Math.min(ARKAAN.length - 1, i + 1))}
                        accessibilityRole="button"
                        accessibilityLabel="Next position"
                        accessibilityState={{ disabled: idx === ARKAAN.length - 1 }}
                    >
                        <Text style={[modalStyles.navText, { color: theme.textPrimary }]}>Next</Text>
                        <Feather name="chevron-right" size={22} color={theme.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 52 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: { position: 'absolute', right: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
    numBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    numText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    posTitle: { fontSize: 18, fontWeight: '700' },
    posSub: { fontSize: 13, marginTop: 1 },
    posArabic: { fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', marginRight: 4 },
    figureArea: { alignSelf: 'center', borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 20 },
    desc: { fontSize: 14, lineHeight: 22, paddingHorizontal: 24, textAlign: 'center', marginBottom: 24 },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 28 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
    navBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    navText: { fontSize: 15, fontWeight: '600' },
    navCount: { fontSize: 14, fontWeight: '500' },
});

// ─── Rukun Card ───────────────────────────────────────────────────────────────
function RukunCard({ rukun, expanded, onToggle, theme }: {
    rukun: typeof ARKAAN[0];
    expanded: boolean;
    onToggle: () => void;
    theme: AppTheme;
}) {
    const color = RULE_COLORS[rukun.id] ?? '#7B4FA6';
    const expandAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(expandAnim, {
            toValue: expanded ? 1 : 0,
            useNativeDriver: false,
            friction: 7,
            tension: 80,
        }).start();
    }, [expanded]);

    const rotate = expandAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View style={[cardStyles.container, { borderLeftColor: color, backgroundColor: theme.bgCard }]}>
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.8}
                style={cardStyles.header}
                accessibilityRole="button"
                accessibilityLabel={`${rukun.title}, ${rukun.subtitle}`}
                accessibilityState={{ expanded }}
            >
                <View style={[cardStyles.numberBadge, { backgroundColor: color }]}>
                    <Text style={cardStyles.numberText}>{rukun.number}</Text>
                </View>
                <View style={cardStyles.headerText}>
                    <Text style={[cardStyles.title, { color: theme.textPrimary }]}>{rukun.title}</Text>
                    <Text style={[cardStyles.subtitle, { color: theme.textTertiary }]}>{rukun.subtitle}</Text>
                </View>
                <Text style={[cardStyles.arabic, { color }]}>{rukun.arabic}</Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                    <Feather name="chevron-down" size={20} color={theme.textTertiary} />
                </Animated.View>
            </TouchableOpacity>

            {expanded && (
                <View style={cardStyles.body}>
                    {/* Position illustration */}
                    <View style={[figStyles.card, { borderColor: color + '30', backgroundColor: color + '08' }]}>
                        <SalahPositionImage rukunId={rukun.id} size={180} />
                    </View>

                    {/* Description */}
                    <Text style={[cardStyles.description, { color: theme.textSecondary }]}>{rukun.description}</Text>

                    {/* Du'a block */}
                    {rukun.arabic_text && (
                        <View style={[cardStyles.duaBlock, { backgroundColor: color + '10', borderColor: color + '25' }]}>
                            <Text style={[cardStyles.duaArabic, { color }]}>{rukun.arabic_text}</Text>
                            {rukun.transliteration && (
                                <Text style={[cardStyles.duaTranslit, { color: theme.textSecondary }]}>{rukun.transliteration}</Text>
                            )}
                            {rukun.translation && (
                                <Text style={[cardStyles.duaTrans, { color: theme.textTertiary }]}>"{rukun.translation}"</Text>
                            )}
                        </View>
                    )}

                    {/* Note */}
                    {rukun.note && (
                        <View style={[cardStyles.noteRow, { backgroundColor: theme.accentLight }]}>
                            <Feather name="info" size={13} color={theme.gold} />
                            <Text style={[cardStyles.noteText, { color: theme.textSecondary }]}>{rukun.note}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const cardStyles = StyleSheet.create({
    container: {
        borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    numberBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    numberText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    headerText: { flex: 1 },
    title: { fontSize: 16, fontWeight: '700' },
    subtitle: { fontSize: 12, marginTop: 1 },
    arabic: { fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', marginRight: 4 },
    body: { paddingHorizontal: 16, paddingBottom: 20 },
    description: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
    duaBlock: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14, alignItems: 'center' },
    duaArabic: {
        fontSize: 22, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
        textAlign: 'center', lineHeight: 38, marginBottom: 8,
    },
    duaTranslit: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginBottom: 6 },
    duaTrans: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10 },
    noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SalahScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const [expandedId, setExpandedId] = useState<string | null>('takbir');
    const [showAnimModal, setShowAnimModal] = useState(false);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)' as any);
    }, [router]);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;
            const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
            return () => sub.remove();
        }, [goBack])
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={goBack}
                    style={styles.headerBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="arrow-left" size={22} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Salah Guide</Text>
                    <Text style={[styles.headerSub, { color: theme.accent }]}>الصَّلَاة — The Prayer</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* ── Intro banner ── */}
            <View style={[styles.banner, { backgroundColor: theme.bgCard }]}>
                <Text style={[styles.bannerTitle, { color: theme.textPrimary }]}>Arkaan as-Salah</Text>
                <Text style={[styles.bannerDesc, { color: theme.textSecondary }]}>
                    The essential pillars of prayer — tap each rukun to see the position, Arabic supplication, and guidance.
                </Text>
                <View style={styles.bannerRow}>
                    <View style={[styles.bannerBadge, { backgroundColor: theme.accentLight }]}>
                        <Feather name="layers" size={13} color={theme.accent} />
                        <Text style={[styles.bannerBadgeText, { color: theme.accent }]}>9 Arkaan</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.bannerBadge, { backgroundColor: theme.accentLight }]}
                        onPress={() => setShowAnimModal(true)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="View animated salah positions"
                    >
                        <Feather name="activity" size={13} color={theme.accent} />
                        <Text style={[styles.bannerBadgeText, { color: theme.accent }]}>Animated positions</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Arkaan list ── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
            >
                {ARKAAN.map(rukun => (
                    <RukunCard
                        key={rukun.id}
                        rukun={rukun}
                        expanded={expandedId === rukun.id}
                        onToggle={() => setExpandedId(id => id === rukun.id ? null : rukun.id)}
                        theme={theme}
                    />
                ))}

                {/* Closing note — labels standardised to consistently use Sunnah / Witr (#5).
                    Previously mixed "sunnah", "(nafl)", and bare "before/after" which read inconsistently. */}
                <View style={[styles.closingNote, { backgroundColor: theme.bgCard }]}>
                    <Text style={[styles.closingTitle, { color: theme.textPrimary }]}>Numbers of Rak\'ahs</Text>
                    {[
                        { name: 'Fajr',    fard: 2, sunnah: '2 Sunnah before' },
                        { name: 'Dhuhr',   fard: 4, sunnah: '4 Sunnah before + 2 Sunnah after' },
                        { name: 'Asr',     fard: 4, sunnah: '4 Sunnah before' },
                        { name: 'Maghrib', fard: 3, sunnah: '2 Sunnah after' },
                        { name: 'Isha',    fard: 4, sunnah: '2 Sunnah after + 3 Witr' },
                    ].map(p => (
                        <View key={p.name} style={[styles.prayerRow, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.prayerName, { color: theme.textPrimary }]}>{p.name}</Text>
                            <View style={styles.prayerDetail}>
                                <View style={[styles.fardBadge, { backgroundColor: theme.accentLight }]}><Text style={[styles.fardText, { color: theme.accent }]}>{p.fard} Fard</Text></View>
                                <Text style={[styles.sunnahText, { color: theme.textTertiary }]}>{p.sunnah}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <AnimationModal visible={showAnimModal} onClose={() => setShowAnimModal(false)} theme={theme} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
    headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSub: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif' },
    banner: {
        marginHorizontal: 16, marginVertical: 12, borderRadius: 20, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
    },
    bannerTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
    bannerDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
    bannerRow: { flexDirection: 'row', gap: 10 },
    bannerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    },
    bannerBadgeText: { fontSize: 12, fontWeight: '600' },
    list: { paddingHorizontal: 16, paddingBottom: 40 },
    closingNote: {
        borderRadius: 16, padding: 16, marginTop: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    closingTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
    prayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
    prayerName: { fontSize: 14, fontWeight: '700', width: 70 },
    prayerDetail: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
    fardBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    fardText: { fontSize: 12, fontWeight: '700' },
    sunnahText: { fontSize: 11, flex: 1, textAlign: 'right' },
});
