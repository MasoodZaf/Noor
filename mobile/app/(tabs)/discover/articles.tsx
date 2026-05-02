import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LibraryItem {
    id: string;
    type: 'book' | 'audio';
    lang: 'en' | 'ur';
    category: string;
    title: string;
    author: string;
    description: string;
    url: string;           // PDF URL (books) or web-embed URL (audio fallback)
    streamUrl?: string;    // direct MP3 for native expo-av player
    pages?: number;
    duration?: string;
    color: string;
    icon: string;
}

// ── Library data ──────────────────────────────────────────────────────────────
// Sources: kalamullah.com (English PDFs), archive.org (Urdu + Audio)
// All books are freely available and scholar-recommended.
const LIBRARY: LibraryItem[] = [

    // ── English Books ─────────────────────────────────────────────────────────

    {
        id: 'en-b-01', type: 'book', lang: 'en', category: 'Seerah',
        title: 'The Sealed Nectar',
        author: 'Safi-ur-Rahman Mubarakpuri',
        description: 'Award-winning biography of Prophet Muhammad ﷺ. Winner of the World Muslim League first prize. Considered the definitive English Seerah.',
        url: 'https://kalamullah.com/Books/The%20Sealed%20Nectar.pdf',
        pages: 580, color: '#2ECC71', icon: 'bookmark',
    },
    {
        id: 'en-b-02', type: 'book', lang: 'en', category: 'Seerah',
        title: 'When the Moon Split',
        author: 'Safi-ur-Rahman Mubarakpuri',
        description: 'A concise, beautifully written biography of the Prophet ﷺ. Ideal for readers of all ages and backgrounds.',
        url: 'https://kalamullah.com/Books/When%20the%20Moon%20Split.pdf',
        pages: 320, color: '#2ECC71', icon: 'bookmark',
    },
    {
        id: 'en-b-03', type: 'book', lang: 'en', category: 'Spirituality',
        title: "Don't Be Sad",
        author: "Aaidh ibn Abdullah al-Qarni",
        description: 'A comprehensive guide to living a contented and happy life, drawing on Quran, Sunnah, and timeless wisdom. One of the most-read Islamic books worldwide.',
        url: 'https://kalamullah.com/Books/Dont_Be_Sad.pdf',
        pages: 500, color: '#F39C12', icon: 'heart',
    },
    {
        id: 'en-b-04', type: 'book', lang: 'en', category: 'Hadith',
        title: "Riyadh us-Saliheen (Vol. 1)",
        author: "Imam Yahya ibn Sharaf al-Nawawi",
        description: 'Gardens of the Righteous — a classic Hadith collection covering all aspects of Islamic life. One of the most studied hadith books after the Six Books.',
        url: 'https://kalamullah.com/Books/Riyadhus%20Saliheen%20Vol-1.pdf',
        pages: 432, color: '#3498DB', icon: 'list',
    },
    {
        id: 'en-b-05', type: 'book', lang: 'en', category: 'Hadith',
        title: "An-Nawawi's Forty Hadith",
        author: "Imam al-Nawawi",
        description: 'The 42 foundational hadiths that every Muslim should know. Memorised and taught across the Muslim world for centuries.',
        url: 'https://kalamullah.com/Books/40%20Hadith%20Nawawi.pdf',
        pages: 120, color: '#3498DB', icon: 'list',
    },
    {
        id: 'en-b-06', type: 'book', lang: 'en', category: 'Aqeedah',
        title: 'The Fundamentals of Tawheed',
        author: 'Dr. Abu Ameenah Bilal Philips',
        description: 'A comprehensive study of Islamic monotheism — its categories, pillars, and practical implications for everyday Muslim life.',
        url: 'https://kalamullah.com/Books/The%20Fundamentals%20of%20Tawheed.pdf',
        pages: 186, color: '#9B59B6', icon: 'sun',
    },
    {
        id: 'en-b-07', type: 'book', lang: 'en', category: 'Aqeedah',
        title: 'The Three Fundamental Principles',
        author: 'Muhammad ibn Abd al-Wahhab',
        description: 'A foundational text answering the three questions every Muslim will be asked: Who is your Lord? What is your religion? Who is your Prophet?',
        url: 'https://kalamullah.com/Books/The%20Three%20Fundamental%20Principles.pdf',
        pages: 64, color: '#C9A84C', icon: 'star',
    },
    {
        id: 'en-b-08', type: 'book', lang: 'en', category: 'Dua',
        title: 'Fortress of the Muslim',
        author: "Sa'id ibn Ali al-Qahtani",
        description: 'An authentic collection of supplications and remembrances from the Quran and Sunnah for every occasion — morning, evening, travel, sleep and more.',
        url: 'https://kalamullah.com/Books/Fortress%20of%20the%20Muslim.pdf',
        pages: 221, color: '#E74C3C', icon: 'shield',
    },
    {
        id: 'en-b-09', type: 'book', lang: 'en', category: 'Spirituality',
        title: 'Purification of the Soul',
        author: 'Ahmad Farid',
        description: 'Drawing on the works of Ibn Rajab al-Hanbali, Ibn al-Qayyim, and Imam al-Ghazali — a masterwork on cleansing the heart from spiritual diseases.',
        url: 'https://kalamullah.com/Books/Purification%20of%20the%20Soul.pdf',
        pages: 405, color: '#1F4E3D', icon: 'wind',
    },
    {
        id: 'en-b-10', type: 'book', lang: 'en', category: 'History',
        title: 'Stories of the Prophets',
        author: 'Imam Ibn Kathir',
        description: 'Complete accounts of all 25 Prophets mentioned in the Quran — from Adam ﷺ through to Muhammad ﷺ. Authentic and scholarly.',
        url: 'https://kalamullah.com/Books/Stories%20of%20the%20Prophets.pdf',
        pages: 422, color: '#C9A84C', icon: 'users',
    },
    {
        id: 'en-b-11', type: 'book', lang: 'en', category: 'Quran',
        title: 'Tafsir Ibn Kathir — Vol. 1',
        author: 'Imam Ismail ibn Kathir',
        description: 'The most trusted Quran commentary in Islamic scholarship, translated into English. Covers Surah Al-Fatihah through Al-Baqarah.',
        url: 'https://kalamullah.com/Books/Tafsir%20Ibn%20Kathir%20Volume%201.pdf',
        pages: 560, color: '#C9A84C', icon: 'book-open',
    },
    {
        id: 'en-b-12', type: 'book', lang: 'en', category: 'Fiqh',
        title: 'The Book of Assistance',
        author: 'Imam Abd Allah ibn Alawi al-Haddad',
        description: 'A practical guide to Islamic obligations and spiritual excellence. A classic of the Yemeni scholarly tradition used by students of knowledge worldwide.',
        url: 'https://archive.org/download/BookOfAssistance/BookOfAssistance.pdf',
        pages: 167, color: '#16A085', icon: 'layers',
    },

    // ── Urdu Books ────────────────────────────────────────────────────────────

    {
        id: 'ur-b-01', type: 'book', lang: 'ur', category: 'Fiqh',
        title: 'بہشتی زیور',
        author: 'مولانا اشرف علی تھانوی',
        description: 'عورتوں اور مردوں کے لیے اسلامی زندگی کا مکمل رہنما۔ سو سال سے زیادہ عرصہ سے اسلامی گھرانوں کی زینت۔ ہر مسلمان گھرانے کی ضروری کتاب۔',
        url: 'https://archive.org/search?query=bahishti+zewar+ashraf+ali+thanvi+urdu',
        pages: 800, color: '#C9A84C', icon: 'layers',
    },
    {
        id: 'ur-b-02', type: 'book', lang: 'ur', category: 'Spirituality',
        title: 'فضائل اعمال',
        author: 'مولانا محمد زکریا کاندھلوی',
        description: 'نماز، قرآن، ذکر، تبلیغ اور سنت نبوی کے فضائل پر مشتمل مستند اور دنیا بھر میں مقبول ترین کتاب۔',
        url: 'https://archive.org/search?query=fazail+amal+zakariyya+kandhlawi+urdu',
        pages: 600, color: '#2ECC71', icon: 'heart',
    },
    {
        id: 'ur-b-03', type: 'book', lang: 'ur', category: 'Seerah',
        title: 'سیرت النبی ﷺ',
        author: 'علامہ شبلی نعمانی و سید سلیمان ندوی',
        description: 'اردو میں سب سے مستند اور جامع سیرت رسول ﷺ۔ تاریخی حقائق اور علمی تحقیق کا بے مثال مجموعہ۔',
        url: 'https://archive.org/search?query=seerat+un+nabi+shibli+nomani+urdu',
        pages: 1200, color: '#3498DB', icon: 'star',
    },
    {
        id: 'ur-b-04', type: 'book', lang: 'ur', category: 'Spirituality',
        title: 'غمگین نہ ہوں',
        author: 'ڈاکٹر عائض القرنی',
        description: 'قرآن و سنت کی روشنی میں دل کو سکون دینے والی تحریر۔ دنیا بھر میں لاتعداد دلوں کو روشنی بخش چکی ہے۔',
        url: 'https://archive.org/search?query=ghamgeen+na+ho+urdu+qarni',
        pages: 450, color: '#F39C12', icon: 'sun',
    },
    {
        id: 'ur-b-05', type: 'book', lang: 'ur', category: 'Family',
        title: 'اسلام میں اولاد کی تربیت',
        author: 'عبد اللہ ناصح علوان',
        description: 'بچوں کی اسلامی تربیت کا جامع رہنما — جسمانی، اخلاقی، دینی اور سماجی تربیت۔ ہر مسلمان والدین کے لیے ضروری۔',
        url: 'https://archive.org/search?query=tarbiyat+ul+aulad+fil+islam+urdu',
        pages: 380, color: '#E74C3C', icon: 'users',
    },
    {
        id: 'ur-b-06', type: 'book', lang: 'ur', category: 'Aqeedah',
        title: 'عقیدہ طحاویہ',
        author: 'امام ابو جعفر الطحاوی',
        description: 'اہل سنت و الجماعت کے بنیادی عقائد کا مستند بیان۔ ایک ہزار سال سے اسلامی تعلیمات کا مرکز۔',
        url: 'https://archive.org/search?query=aqeeda+tahawiyya+urdu',
        pages: 200, color: '#9B59B6', icon: 'shield',
    },
    {
        id: 'ur-b-07', type: 'book', lang: 'ur', category: 'Quran',
        title: 'تفسیر ابن کثیر (اردو)',
        author: 'امام ابن کثیر، ترجمہ',
        description: 'قرآن کریم کی سب سے مستند تفسیر کا اردو ترجمہ۔ علمی اور روحانی غذا کا بے مثال خزانہ۔',
        url: 'https://archive.org/search?query=tafseer+ibn+kaseer+urdu',
        pages: 4000, color: '#C9A84C', icon: 'book-open',
    },
    {
        id: 'ur-b-08', type: 'book', lang: 'ur', category: 'Hadith',
        title: 'ریاض الصالحین (اردو)',
        author: 'امام نووی، ترجمہ',
        description: 'نیک لوگوں کا باغ — اسلامی زندگی کے تمام پہلوؤں پر احادیث نبویہ کا جامع اور مستند مجموعہ۔',
        url: 'https://archive.org/search?query=riyadh+us+saliheen+urdu',
        pages: 900, color: '#3498DB', icon: 'list',
    },
    {
        id: 'ur-b-09', type: 'book', lang: 'ur', category: 'Spirituality',
        title: 'احیاء العلوم (اردو)',
        author: 'امام ابو حامد الغزالی',
        description: 'دینی علوم کی احیاء — اسلام کی سب سے عظیم روحانی تصنیف کا اردو ترجمہ۔ نماز، علم، اخلاق اور معاملات۔',
        url: 'https://archive.org/search?query=ihya+ulum+ud+din+urdu+ghazali',
        pages: 2000, color: '#1F4E3D', icon: 'wind',
    },

    // ── English Audio ─────────────────────────────────────────────────────────
    // url  = archive.org embed (in-app WebView fallback)
    // streamUrl = direct MP3 (native expo-av player, if available)

    {
        id: 'au-en-01', type: 'audio', lang: 'en', category: 'Seerah',
        title: 'The Life of the Prophet ﷺ',
        author: 'Sheikh Yasir Qadhi',
        description: 'The most comprehensive English Seerah series — 100+ lectures covering the complete life of the Prophet ﷺ from birth to departure.',
        url: 'https://archive.org/details/TheProphetMuhammadSeerahByYasirQadhi',
        duration: '200+ hrs', color: '#2ECC71', icon: 'headphones',
    },
    {
        id: 'au-en-02', type: 'audio', lang: 'en', category: 'Quran',
        title: 'Quran — English Translation (Audio)',
        author: 'Mishary Al-Afasy + Sahih International',
        description: 'Complete Quran recitation with Sahih International English translation. Ideal for understanding while listening.',
        url: 'https://archive.org/details/QuranEnglishTranslationAudio',
        // Surah Al-Fatiha as a sample native stream
        streamUrl: 'https://download.quranicaudio.com/quran/english_-_sahih_international/001.mp3',
        duration: '14 hrs', color: '#C9A84C', icon: 'headphones',
    },
    {
        id: 'au-en-03', type: 'audio', lang: 'en', category: 'Hadith',
        title: "An-Nawawi's 40 Hadith — Explained",
        author: 'Sheikh Haitham al-Haddad',
        description: 'Audio explanation of the 40 foundational hadiths. Perfect for commutes, revision, and deepening Islamic knowledge.',
        url: 'https://archive.org/details/40hadithnawawi',
        duration: '5 hrs', color: '#3498DB', icon: 'headphones',
    },
    {
        id: 'au-en-04', type: 'audio', lang: 'en', category: 'Spirituality',
        title: 'Purification of the Heart',
        author: 'Sheikh Hamza Yusuf',
        description: 'Powerful lectures on the spiritual diseases of the heart — pride, envy, greed — and their cures from the Islamic tradition.',
        url: 'https://archive.org/details/PurificationOfTheHeart',
        duration: '8 hrs', color: '#9B59B6', icon: 'headphones',
    },
    {
        id: 'au-en-05', type: 'audio', lang: 'en', category: 'Aqeedah',
        title: 'Fundamentals of Faith',
        author: 'Sheikh Nouman Ali Khan',
        description: 'Deep yet accessible exploration of Islamic beliefs — the six pillars of Iman explained for the modern Muslim.',
        url: 'https://archive.org/details/FundamentalsOfFaithNAK',
        duration: '6 hrs', color: '#9B59B6', icon: 'headphones',
    },
    {
        id: 'au-en-06', type: 'audio', lang: 'en', category: 'History',
        title: 'Stories of the Prophets (Audio)',
        author: 'Sheikh Shady Alsuleiman',
        description: 'Audio narration of the stories of all Prophets from Adam to Muhammad ﷺ — inspiring and educational for the whole family.',
        url: 'https://archive.org/details/StoriesOfTheProphetsAudio',
        duration: '8 hrs', color: '#C9A84C', icon: 'headphones',
    },

    // ── Urdu Audio ────────────────────────────────────────────────────────────

    {
        id: 'au-ur-01', type: 'audio', lang: 'ur', category: 'Seerah',
        title: 'سیرت النبی ﷺ (آڈیو)',
        author: 'مفتی طارق مسعود',
        description: 'اردو میں رسول اللہ ﷺ کی مکمل سیرت کا آڈیو بیان۔ دلنشیں انداز اور مستند روایات کے ساتھ۔',
        url: 'https://archive.org/details/SeeratunNabiUrduAudio',
        duration: '50+ hrs', color: '#3498DB', icon: 'headphones',
    },
    {
        id: 'au-ur-02', type: 'audio', lang: 'ur', category: 'Quran',
        title: 'قرآن مجید — اردو ترجمہ',
        author: 'مفتی تقی عثمانی',
        description: 'قرآن کریم کا مکمل اردو ترجمہ بآواز بلند۔ سفر اور گھر میں سننے کے لیے بہترین۔',
        url: 'https://archive.org/details/QuranUrduTranslationAudio',
        // Al-Fatiha as sample native stream
        streamUrl: 'https://download.quranicaudio.com/quran/urdu_-_mufti_taqi_usmani/001.mp3',
        duration: '18 hrs', color: '#C9A84C', icon: 'headphones',
    },
    {
        id: 'au-ur-03', type: 'audio', lang: 'ur', category: 'Spirituality',
        title: 'اصلاحی بیانات',
        author: 'مولانا طارق جمیل',
        description: 'دل کو چھونے والے اصلاحی بیانات۔ توبہ، اللہ سے محبت، اور اصلاح نفس پر مشتمل۔',
        url: 'https://archive.org/details/TariqJameelBayan',
        duration: '100+ hrs', color: '#F39C12', icon: 'headphones',
    },
    {
        id: 'au-ur-04', type: 'audio', lang: 'ur', category: 'Fiqh',
        title: 'فقہ اسلامی — مکمل درس',
        author: 'مفتی محمد تقی عثمانی',
        description: 'اسلامی فقہ کے اہم مسائل کا آڈیو درس — طہارت، نماز، روزہ، زکوٰۃ اور حج۔',
        url: 'https://archive.org/details/FiqhIslamiUrduDars',
        duration: '30+ hrs', color: '#16A085', icon: 'headphones',
    },
    {
        id: 'au-ur-05', type: 'audio', lang: 'ur', category: 'Hadith',
        title: 'ریاض الصالحین — آڈیو',
        author: 'مختلف علماء',
        description: 'ریاض الصالحین کی احادیث کا اردو ترجمہ اور شرح بآواز بلند۔ روزانہ سننے کے لیے۔',
        url: 'https://archive.org/details/RiyadhUsSaleheenUrdu',
        duration: '25 hrs', color: '#3498DB', icon: 'headphones',
    },
    {
        id: 'au-ur-06', type: 'audio', lang: 'ur', category: 'History',
        title: 'قصص الانبیاء (اردو)',
        author: 'مختلف علماء',
        description: 'تمام انبیاء کرام علیہم السلام کے واقعات کا اردو آڈیو بیان۔ بچوں اور بڑوں کے لیے یکساں مفید۔',
        url: 'https://archive.org/details/QasasUlAnbiyaUrdu',
        duration: '20 hrs', color: '#C9A84C', icon: 'headphones',
    },
];

const CATEGORIES = ['All', 'Aqeedah', 'Seerah', 'Fiqh', 'Hadith', 'Quran', 'Spirituality', 'History', 'Family', 'Dua'];

type ContentType = 'all' | 'book' | 'audio';
type Language   = 'all' | 'en' | 'ur';

// ── Screen ────────────────────────────────────────────────────────────────────

export default function IslamicLibraryScreen() {
    const router   = useRouter();
    const insets   = useSafeAreaInsets();
    const { theme } = useTheme();

    const [search,          setSearch]          = useState('');
    const [contentType,     setContentType]     = useState<ContentType>('all');
    const [language,        setLanguage]        = useState<Language>('all');
    const [activeCategory,  setActiveCategory]  = useState('All');

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

    const openItem = useCallback((item: LibraryItem) => {
        if (item.type === 'audio') {
            router.push({
                pathname: '/(tabs)/discover/audio-player' as any,
                params: {
                    title:     item.title,
                    author:    item.author,
                    duration:  item.duration ?? '',
                    color:     item.color,
                    webUrl:    item.url,
                    streamUrl: item.streamUrl ?? '',
                },
            });
        } else {
            router.push({
                pathname: '/(tabs)/discover/reader' as any,
                params: {
                    url:    item.url,
                    title:  item.title,
                    author: item.author,
                },
            });
        }
    }, [router]);

    const filtered = LIBRARY.filter(item => {
        if (contentType !== 'all' && item.type !== contentType) return false;
        if (language    !== 'all' && item.lang !== language)   return false;
        if (activeCategory !== 'All' && item.category !== activeCategory) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            item.title.toLowerCase().includes(q)  ||
            item.author.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        );
    });

    const counts = {
        all:   LIBRARY.length,
        book:  LIBRARY.filter(i => i.type === 'book').length,
        audio: LIBRARY.filter(i => i.type === 'audio').length,
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.bg }]}>

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    onPress={goBack}
                    style={styles.backBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Feather name="chevron-left" size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Islamic Library</Text>
                    <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{LIBRARY.length} authentic resources</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={[styles.searchWrapper, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Feather name="search" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder="Search by title, author or topic…"
                    placeholderTextColor={theme.textSecondary}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearch('')}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Feather name="x-circle" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Content-type tabs */}
            <View style={[styles.typeRow, { borderBottomColor: theme.border }]}>
                {([
                    { key: 'all',   label: 'All',       count: counts.all,   icon: 'grid'       },
                    { key: 'book',  label: 'Books',     count: counts.book,  icon: 'book-open'  },
                    { key: 'audio', label: 'Audio',     count: counts.audio, icon: 'headphones' },
                ] as { key: ContentType; label: string; count: number; icon: string }[]).map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.typeTab,
                            { borderBottomColor: 'transparent' },
                            contentType === tab.key && { borderBottomColor: theme.gold },
                        ]}
                        onPress={() => setContentType(tab.key)}
                        accessibilityRole="tab"
                        accessibilityLabel={`${tab.label}, ${tab.count} items`}
                        accessibilityState={{ selected: contentType === tab.key }}
                    >
                        <Feather
                            name={tab.icon as any}
                            size={15}
                            color={contentType === tab.key ? theme.gold : theme.textSecondary}
                        />
                        <Text style={[
                            styles.typeTabText,
                            { color: contentType === tab.key ? theme.gold : theme.textSecondary },
                            contentType === tab.key && { fontWeight: '600' },
                        ]}>
                            {tab.label}
                        </Text>
                        <View style={[
                            styles.typeCount,
                            { backgroundColor: contentType === tab.key ? theme.accentLight : theme.bgInput },
                        ]}>
                            <Text style={[styles.typeCountText, { color: contentType === tab.key ? theme.gold : theme.textTertiary }]}>
                                {tab.count}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Language filter + Category chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                keyboardShouldPersistTaps="handled"
            >
                {/* Language pills */}
                {([
                    { key: 'all', label: 'All Lang' },
                    { key: 'en',  label: 'English' },
                    { key: 'ur',  label: 'اردو' },
                ] as { key: Language; label: string }[]).map(lang => (
                    <TouchableOpacity
                        key={lang.key}
                        style={[
                            styles.langPill,
                            { borderColor: theme.border, backgroundColor: theme.bgInput },
                            language === lang.key && { backgroundColor: theme.textPrimary, borderColor: theme.textPrimary },
                        ]}
                        onPress={() => setLanguage(lang.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by language: ${lang.label}`}
                        accessibilityState={{ selected: language === lang.key }}
                    >
                        <Text style={[
                            styles.langPillText,
                            { color: language === lang.key ? theme.bg : theme.textSecondary },
                            language === lang.key && { fontWeight: '600' },
                        ]}>
                            {lang.label}
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={[styles.filterDivider, { backgroundColor: theme.border }]} />

                {/* Category chips */}
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.catChip,
                            { backgroundColor: theme.bgInput, borderColor: theme.border },
                            activeCategory === cat && { backgroundColor: theme.gold, borderColor: theme.gold },
                        ]}
                        onPress={() => setActiveCategory(cat)}
                        accessibilityRole="button"
                        accessibilityLabel={`Category ${cat}`}
                        accessibilityState={{ selected: activeCategory === cat }}
                    >
                        <Text style={[
                            styles.catText,
                            { color: activeCategory === cat ? theme.textInverse : theme.textSecondary },
                            activeCategory === cat && { fontWeight: '600' },
                        ]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Results count */}
            {(search || activeCategory !== 'All' || contentType !== 'all' || language !== 'all') && (
                <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </Text>
            )}

            {/* Book list */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="book" size={40} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found</Text>
                        <Text style={[styles.emptyHint, { color: theme.textTertiary }]}>Try a different search or filter</Text>
                    </View>
                ) : (
                    filtered.map(item => <BookCard key={item.id} item={item} theme={theme} onOpen={openItem} />)
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({
    item,
    theme,
    onOpen,
}: {
    item: LibraryItem;
    theme: any;
    onOpen: (item: LibraryItem) => void;
}) {
    const isAudio = item.type === 'audio';
    const isUrdu  = item.lang === 'ur';

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            activeOpacity={0.85}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={`${isAudio ? 'Audio' : 'Book'}: ${item.title} by ${item.author}, ${item.category}`}
        >
            {/* Top row */}
            <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                    <Feather name={item.icon as any} size={22} color={item.color} />
                </View>

                <View style={styles.cardMeta}>
                    <View style={styles.badges}>
                        {/* Language badge */}
                        <View style={[styles.badge, { backgroundColor: isUrdu ? '#9B59B620' : '#3498DB20' }]}>
                            <Text style={[styles.badgeText, { color: isUrdu ? '#9B59B6' : '#3498DB' }]}>
                                {isUrdu ? 'اردو' : 'EN'}
                            </Text>
                        </View>
                        {/* Type badge */}
                        <View style={[styles.badge, { backgroundColor: isAudio ? '#E74C3C20' : '#2ECC7120' }]}>
                            <Feather
                                name={isAudio ? 'headphones' : 'book-open'}
                                size={10}
                                color={isAudio ? '#E74C3C' : '#2ECC71'}
                                style={{ marginRight: 3 }}
                            />
                            <Text style={[styles.badgeText, { color: isAudio ? '#E74C3C' : '#2ECC71' }]}>
                                {isAudio ? 'Audio' : 'Book'}
                            </Text>
                        </View>
                        {/* Category */}
                        <Text style={[styles.catLabel, { color: item.color }]}>{item.category}</Text>
                    </View>

                    {/* Pages or duration */}
                    <Text style={[styles.metaDetail, { color: theme.textTertiary }]}>
                        {isAudio
                            ? (item.duration ?? '')
                            : (item.pages ? `${item.pages.toLocaleString()} pages` : '')}
                    </Text>
                </View>
            </View>

            {/* Title */}
            <Text
                style={[
                    styles.cardTitle,
                    { color: theme.textPrimary },
                    isUrdu && styles.urduTitle,
                ]}
            >
                {item.title}
            </Text>

            {/* Author */}
            <Text
                style={[
                    styles.cardAuthor,
                    { color: theme.gold },
                    isUrdu && styles.urduText,
                ]}
            >
                {item.author}
            </Text>

            {/* Description */}
            <Text
                style={[
                    styles.cardDesc,
                    { color: theme.textSecondary },
                    isUrdu && styles.urduText,
                ]}
                numberOfLines={3}
            >
                {item.description}
            </Text>

            {/* Action button */}
            <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: theme.accentLight, borderColor: `${item.color}30` }]}
                onPress={() => onOpen(item)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isAudio ? 'Listen in app' : 'Read PDF in app'}
            >
                <Feather
                    name={isAudio ? 'play-circle' : 'book-open'}
                    size={15}
                    color={item.color}
                    style={{ marginRight: 6 }}
                />
                <Text style={[styles.openBtnText, { color: item.color }]}>
                    {isAudio ? 'Listen in-app' : 'Read PDF in-app'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:      { flex: 1 },
    header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
    backBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    headerCenter:   { alignItems: 'center' },
    headerTitle:    { fontSize: 18, fontWeight: '600' },
    headerSub:      { fontSize: 12, marginTop: 2 },

    searchWrapper:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14, marginBottom: 4, borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1 },
    searchInput:    { flex: 1, fontSize: 15 },

    typeRow:        { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, borderBottomWidth: 1, marginBottom: 4 },
    typeTab:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingBottom: 10, borderBottomWidth: 2 },
    typeTabText:    { fontSize: 13 },
    typeCount:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, minWidth: 22, alignItems: 'center' },
    typeCountText:  { fontSize: 11, fontWeight: '600' },

    filterRow:      { paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignItems: 'center' },
    langPill:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    langPillText:   { fontSize: 13 },
    filterDivider:  { width: 1, height: 20, marginHorizontal: 4 },
    catChip:        { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    catText:        { fontSize: 13 },

    resultCount:    { fontSize: 12, marginHorizontal: 20, marginBottom: 4 },

    scroll:         { paddingHorizontal: 20, paddingTop: 8 },

    card:           { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
    cardTop:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    iconBox:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardMeta:       { flex: 1, gap: 4 },
    badges:         { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    badge:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    badgeText:      { fontSize: 11, fontWeight: '600' },
    catLabel:       { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    metaDetail:     { fontSize: 11 },

    cardTitle:      { fontSize: 17, fontWeight: '600', marginBottom: 4, lineHeight: 24 },
    cardAuthor:     { fontSize: 13, fontWeight: '500', marginBottom: 8 },
    cardDesc:       { fontSize: 14, lineHeight: 21, marginBottom: 14 },

    urduTitle:      { textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', fontSize: 18, lineHeight: 30 },
    urduText:       { textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', lineHeight: 26 },

    openBtn:        { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    openBtnText:    { fontSize: 13, fontWeight: '500' },

    emptyState:     { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText:      { fontSize: 16, fontWeight: '500' },
    emptyHint:      { fontSize: 13 },
});
