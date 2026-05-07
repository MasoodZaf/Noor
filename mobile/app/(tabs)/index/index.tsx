import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, Animated, Easing, Modal, Switch, Linking, Image, Alert, TextInput, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import moment from 'moment-hijri';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../../../context/DatabaseContext';
import { sanitizeArabicText } from '../../../utils/arabic';
import { getDailyVerseForDate, nextFridayAt } from '../../../utils/hijriContent';
import { useTheme } from '../../../context/ThemeContext';
import { useNetworkMode } from '../../../context/NetworkModeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useAudio } from '../../../context/AudioContext';
import { fonts } from '../../../context/ThemeContext';

// ─── AlAdhan API ──────────────────────────────────────────────────────────────
const ALADHAN_API = 'https://api.aladhan.com/v1';

// ─── Prayer settings persistence ─────────────────────────────────────────────
const PRAYER_SETTINGS_KEY = '@noor/prayer_settings';
const NOTIF_PREFS_KEY = '@noor/notif_prefs';
const DEFAULT_NOTIF_PREFS = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

// ─── Prayer notification i18n ─────────────────────────────────────────────────
type NotifLang = 'english' | 'urdu' | 'indonesian' | 'french' | 'bengali' | 'turkish';

// Prayer display names per language
const PRAYER_DISPLAY_NAMES: Record<NotifLang, Record<string, string>> = {
    english:    { fajr: 'Fajr',  dhuhr: 'Dhuhr',  asr: 'Asr',    maghrib: 'Maghrib', isha: 'Isha'   },
    urdu:       { fajr: 'فجر',   dhuhr: 'ظہر',    asr: 'عصر',    maghrib: 'مغرب',    isha: 'عشاء'   },
    indonesian: { fajr: 'Subuh', dhuhr: 'Zuhur',  asr: 'Asar',   maghrib: 'Magrib',  isha: 'Isya'   },
    french:     { fajr: 'Fajr',  dhuhr: 'Dhuhr',  asr: 'Asr',    maghrib: 'Maghrib', isha: 'Isha'   },
    bengali:    { fajr: 'ফজর',   dhuhr: 'যোহর',   asr: 'আসর',    maghrib: 'মাগরিব',  isha: 'এশা'    },
    turkish:    { fajr: 'Sabah', dhuhr: 'Öğle',   asr: 'İkindi', maghrib: 'Akşam',   isha: 'Yatsı'  },
};

// Notification UI strings per language
// {name} is replaced at runtime with the prayer name in that language
const NOTIF_UI: Record<NotifLang, { title: string; body: string; fajrRise: string }> = {
    english:    { title: '🕌 Time for {name}',          body: 'It is time to pray {name}.',                    fajrRise: 'Rise for the dawn prayer.'              },
    urdu:       { title: '🕌 {name} کا وقت',            body: '{name} کی نماز کا وقت ہو گیا ہے۔',              fajrRise: 'فجر کی نماز کے لیے اٹھیں۔'              },
    indonesian: { title: '🕌 Waktu {name}',              body: 'Sudah waktunya shalat {name}.',                 fajrRise: 'Bangunlah untuk shalat Subuh.'           },
    french:     { title: "🕌 L'heure de {name}",         body: "Il est l'heure de prier {name}.",               fajrRise: "Levez-vous pour la prière de l'aube."   },
    bengali:    { title: '🕌 {name} এর সময়',            body: '{name} নামাজের সময় হয়েছে।',                    fajrRise: 'ফজরের নামাজের জন্য উঠুন।'              },
    turkish:    { title: '🕌 {name} Vakti',              body: '{name} namazı için vakit girdi.',                fajrRise: 'Sabah namazı için kalkın.'              },
};

// Ayah / Hadith quotes per language per prayer
const PRAYER_QUOTES: Record<NotifLang, Record<string, string[]>> = {
    english: {
        fajr:    [
            '📖 "Indeed, the recitation of dawn is ever witnessed [by the angels]." (17:78)',
            '📖 "Glorify your Lord before the rising of the sun." (20:130)',
            '🕌 The Prophet ﷺ said: "The two rak\'ahs of Fajr are better than the world and all it contains." (Muslim)',
            '🕌 The Prophet ﷺ said: "Whoever prays Fajr is under the protection of Allah." (Muslim)',
        ],
        dhuhr:   [
            '📖 "Maintain with care the obligatory prayers and stand before Allah, devoutly obedient." (2:238)',
            '📖 "Recite what has been revealed to you of the Book and establish prayer." (29:45)',
            '🕌 The Prophet ﷺ said: "The gates of Heaven are opened at noon." (Abu Dawud)',
            '📖 "Indeed, prayer has been enjoined on the believers at fixed times." (4:103)',
        ],
        asr:     [
            '📖 "Guard strictly the prayers, especially the middle prayer." (2:238)',
            '📖 "Exalt Allah before the rising of the sun and before its setting." (50:39)',
            '🕌 The Prophet ﷺ said: "Whoever misses Asr, it is as if he has lost his family and wealth." (Bukhari)',
            '🕌 The Prophet ﷺ said: "Angels assemble together at Asr and Fajr." (Bukhari)',
        ],
        maghrib: [
            '📖 "Glorify Allah when you reach the evening and when you reach the morning." (30:17)',
            '📖 "Establish prayer at the decline of the sun till the darkness of the night." (17:78)',
            '🕌 The Prophet ﷺ said: "My nation will remain upon goodness as long as they hasten to break the fast." (Bukhari)',
            '🕌 The Prophet ﷺ said: "Do not delay three things — prayer when its time comes." (Tirmidhi)',
        ],
        isha:    [
            '📖 "Prostrate to Him in the night and glorify Him a long part of the night." (76:26)',
            '📖 "From the night, pray as additional worship for you." (17:79)',
            '🕌 The Prophet ﷺ said: "The most burdensome prayers for hypocrites are Isha and Fajr — if they knew what is in them, they would come even crawling." (Bukhari)',
            '🕌 The Prophet ﷺ said: "Whoever prays Isha in congregation is as if he prayed half the night." (Muslim)',
        ],
    },
    urdu: {
        fajr:    [
            '📖 "بیشک فجر کی قرأت میں فرشتے حاضر ہوتے ہیں۔" (17:78)',
            '📖 "سورج طلوع ہونے سے پہلے اپنے رب کی تسبیح کرو۔" (20:130)',
            '🕌 نبی ﷺ نے فرمایا: "فجر کی دو رکعتیں دنیا اور اس کی ہر چیز سے بہتر ہیں۔" (مسلم)',
            '🕌 نبی ﷺ نے فرمایا: "جو فجر کی نماز پڑھے وہ اللہ کی حفاظت میں ہے۔" (مسلم)',
        ],
        dhuhr:   [
            '📖 "نمازوں کی حفاظت کرو اور درمیانی نماز کی بھی۔" (2:238)',
            '📖 "کتاب میں سے جو تم پر وحی کی گئی ہے اسے پڑھو اور نماز قائم کرو۔" (29:45)',
            '🕌 نبی ﷺ نے فرمایا: "ظہر کے وقت جنت کے دروازے کھلتے ہیں۔" (ابو داود)',
            '📖 "بے شک نماز مومنوں پر مقررہ اوقات میں فرض ہے۔" (4:103)',
        ],
        asr:     [
            '📖 "نمازوں کی حفاظت کرو اور خاص طور پر درمیانی نماز کی۔" (2:238)',
            '📖 "سورج غروب ہونے سے پہلے اپنے رب کی تسبیح کرو۔" (50:39)',
            '🕌 نبی ﷺ نے فرمایا: "جس نے عصر کی نماز چھوڑی اس کا عمل اکارت ہو گیا۔" (بخاری)',
            '🕌 نبی ﷺ نے فرمایا: "فرشتے عصر اور فجر میں اکٹھے ہوتے ہیں۔" (بخاری)',
        ],
        maghrib: [
            '📖 "اللہ کی تسبیح کرو شام کو اور صبح کو۔" (30:17)',
            '📖 "سورج کے ڈھلنے سے رات کی تاریکی تک نماز قائم کرو۔" (17:78)',
            '🕌 نبی ﷺ نے فرمایا: "میری امت اس وقت تک خیر پر رہے گی جب تک افطار میں جلدی کرتی رہے۔" (بخاری)',
            '🕌 نبی ﷺ نے فرمایا: "تین چیزوں میں دیر نہ کرو — نماز جب اس کا وقت آ جائے۔" (ترمذی)',
        ],
        isha:    [
            '📖 "رات کے ایک حصے میں اسے سجدہ کرو اور رات کو اس کی تسبیح کرو۔" (76:26)',
            '📖 "رات کے ایک حصے میں اضافی عبادت کے طور پر نماز پڑھو۔" (17:79)',
            '🕌 نبی ﷺ نے فرمایا: "منافقوں پر سب سے بھاری نمازیں عشاء اور فجر ہیں — اگر انہیں معلوم ہوتا تو گھٹنوں کے بل چل کر آتے۔" (بخاری)',
            '🕌 نبی ﷺ نے فرمایا: "جو عشاء کی نماز جماعت سے پڑھے، اسے آدھی رات کے قیام کا ثواب ملتا ہے۔" (مسلم)',
        ],
    },
    indonesian: {
        fajr:    [
            '📖 "Sesungguhnya shalat Subuh itu disaksikan oleh para malaikat." (17:78)',
            '📖 "Bertasbihlah memuji Tuhanmu sebelum matahari terbit." (20:130)',
            '🕌 Nabi ﷺ bersabda: "Dua rakaat Subuh lebih baik dari dunia dan seisinya." (Muslim)',
            '🕌 Nabi ﷺ bersabda: "Siapa yang shalat Subuh maka ia dalam perlindungan Allah." (Muslim)',
        ],
        dhuhr:   [
            '📖 "Peliharalah semua shalat dan shalat wustha, dan berdirilah karena Allah dengan khusyu." (2:238)',
            '📖 "Bacalah apa yang telah diwahyukan kepadamu dan dirikanlah shalat." (29:45)',
            '🕌 Nabi ﷺ bersabda: "Pintu-pintu surga dibuka pada tengah hari." (Abu Dawud)',
            '📖 "Sesungguhnya shalat itu kewajiban atas orang mukmin pada waktu yang ditentukan." (4:103)',
        ],
        asr:     [
            '📖 "Peliharalah semua shalat, terutama shalat wustha (Asar)." (2:238)',
            '📖 "Bertasbihlah memuji Tuhanmu sebelum matahari terbenam." (50:39)',
            '🕌 Nabi ﷺ bersabda: "Siapa yang meninggalkan Asar, amalannya akan terhapus." (Bukhari)',
            '🕌 Nabi ﷺ bersabda: "Para malaikat berkumpul pada shalat Asar dan Subuh." (Bukhari)',
        ],
        maghrib: [
            '📖 "Bertasbihlah kepada Allah pada waktu sore dan pagi hari." (30:17)',
            '📖 "Dirikanlah shalat sejak matahari tergelincir hingga gelap malam." (17:78)',
            '🕌 Nabi ﷺ bersabda: "Umatku dalam kebaikan selama menyegerakan berbuka puasa." (Bukhari)',
            '🕌 Nabi ﷺ bersabda: "Jangan menunda tiga hal — shalat ketika waktunya tiba." (Tirmidzi)',
        ],
        isha:    [
            '📖 "Sujudlah kepada-Nya pada sebagian malam dan sucikanlah Dia waktu yang panjang." (76:26)',
            '📖 "Shalatlah pada sebagian malam sebagai ibadah tambahan bagimu." (17:79)',
            '🕌 Nabi ﷺ bersabda: "Shalat paling berat bagi munafik adalah Isya dan Subuh — jika mereka tahu pahalanya, mereka datang meskipun merangkak." (Bukhari)',
            '🕌 Nabi ﷺ bersabda: "Siapa yang shalat Isya berjamaah, seolah ia shalat separuh malam." (Muslim)',
        ],
    },
    french: {
        fajr:    [
            '📖 "Certes, la récitation de l\'aube est attestée par les anges." (17:78)',
            '📖 "Glorifie ton Seigneur avant le lever du soleil." (20:130)',
            '🕌 Le Prophète ﷺ a dit : "Les deux rak\'as de Fajr valent mieux que le monde entier." (Muslim)',
            '🕌 Le Prophète ﷺ a dit : "Quiconque prie Fajr est sous la protection d\'Allah." (Muslim)',
        ],
        dhuhr:   [
            '📖 "Observez scrupuleusement les prières et tenez-vous debout devant Allah avec dévotion." (2:238)',
            '📖 "Récite ce qui t\'a été révélé du Livre et accomplis la prière." (29:45)',
            '🕌 Le Prophète ﷺ a dit : "Les portes du Paradis s\'ouvrent à l\'heure de midi." (Abu Dawud)',
            '📖 "La prière est une obligation à des horaires déterminés pour les croyants." (4:103)',
        ],
        asr:     [
            '📖 "Observez scrupuleusement les prières, surtout la prière du milieu." (2:238)',
            '📖 "Glorifie ton Seigneur avant le coucher du soleil." (50:39)',
            '🕌 Le Prophète ﷺ a dit : "Celui qui manque Asr est comme s\'il avait perdu sa famille et ses biens." (Bukhari)',
            '🕌 Le Prophète ﷺ a dit : "Les anges se rassemblent lors de Asr et Fajr." (Bukhari)',
        ],
        maghrib: [
            '📖 "Glorifiez Allah le soir et le matin." (30:17)',
            '📖 "Accomplissez la prière depuis le déclin du soleil jusqu\'à l\'obscurité de la nuit." (17:78)',
            '🕌 Le Prophète ﷺ a dit : "Ma communauté restera dans le bien tant qu\'elle s\'empresse de rompre le jeûne." (Bukhari)',
            '🕌 Le Prophète ﷺ a dit : "Ne tardez pas pour la prière quand son heure arrive." (Tirmidhi)',
        ],
        isha:    [
            '📖 "Prosterne-toi devant Lui une partie de la nuit et glorifie-Le longuement." (76:26)',
            '📖 "Prie une partie de la nuit comme adoration supplémentaire pour toi." (17:79)',
            '🕌 Le Prophète ﷺ a dit : "Les prières les plus lourdes pour les hypocrites sont Isha et Fajr — s\'ils savaient, ils viendraient en rampant." (Bukhari)',
            '🕌 Le Prophète ﷺ a dit : "Celui qui prie Isha en congrégation est comme s\'il avait prié la moitié de la nuit." (Muslim)',
        ],
    },
    bengali: {
        fajr:    [
            '📖 "নিশ্চয়ই ফজরের কুরআন পাঠ সাক্ষ্য হয় — ফেরেশতারা তাতে উপস্থিত থাকে।" (17:78)',
            '📖 "সূর্যোদয়ের পূর্বে তোমার রবের প্রশংসাসহ তাসবিহ করো।" (20:130)',
            '🕌 নবী ﷺ বলেছেন: "ফজরের দুই রাকাত দুনিয়া ও তার সব কিছুর চেয়ে উত্তম।" (মুসলিম)',
            '🕌 নবী ﷺ বলেছেন: "যে ফজর নামাজ আদায় করে, সে আল্লাহর হেফাজতে থাকে।" (মুসলিম)',
        ],
        dhuhr:   [
            '📖 "সকল নামাজ এবং মধ্যবর্তী নামাজ যত্নসহকারে আদায় করো।" (2:238)',
            '📖 "তোমার প্রতি যা ওহী করা হয়েছে তা পাঠ করো এবং নামাজ কায়েম করো।" (29:45)',
            '🕌 নবী ﷺ বলেছেন: "দুপুরে জান্নাতের দরজাগুলো খুলে দেওয়া হয়।" (আবু দাউদ)',
            '📖 "নিশ্চয়ই নামাজ মুমিনদের উপর নির্ধারিত সময়ে ফরজ।" (4:103)',
        ],
        asr:     [
            '📖 "সকল নামাজ বিশেষত মধ্যবর্তী নামাজ যত্নসহকারে আদায় করো।" (2:238)',
            '📖 "সূর্যাস্তের পূর্বে তোমার রবের তাসবিহ করো।" (50:39)',
            '🕌 নবী ﷺ বলেছেন: "যে আসরের নামাজ বাদ দিল, তার আমল বিনষ্ট হয়ে গেল।" (বুখারী)',
            '🕌 নবী ﷺ বলেছেন: "ফেরেশতারা আসর ও ফজরে একত্রিত হয়।" (বুখারী)',
        ],
        maghrib: [
            '📖 "সন্ধ্যায় ও সকালে আল্লাহর তাসবিহ করো।" (30:17)',
            '📖 "সূর্য ঢলে পড়ার সময় থেকে রাতের অন্ধকার পর্যন্ত নামাজ কায়েম করো।" (17:78)',
            '🕌 নবী ﷺ বলেছেন: "আমার উম্মত ততক্ষণ কল্যাণে থাকবে যতক্ষণ ইফতারে তাড়াহুড়া করবে।" (বুখারী)',
            '🕌 নবী ﷺ বলেছেন: "তিনটি বিষয়ে বিলম্ব করো না — নামাজের সময় হলে নামাজ।" (তিরমিযী)',
        ],
        isha:    [
            '📖 "রাতের একাংশে তাঁকে সিজদা করো এবং দীর্ঘ রজনীতে তাঁর তাসবিহ করো।" (76:26)',
            '📖 "রাতের কিছু অংশে অতিরিক্ত ইবাদত হিসেবে নামাজ আদায় করো।" (17:79)',
            '🕌 নবী ﷺ বলেছেন: "মুনাফিকদের জন্য সবচেয়ে ভারী নামাজ এশা ও ফজর — যদি তারা জানত, হামাগুড়ি দিয়ে হলেও আসত।" (বুখারী)',
            '🕌 নবী ﷺ বলেছেন: "যে জামাতে এশা পড়ে, সে যেন অর্ধেক রাত কিয়াম করল।" (মুসলিম)',
        ],
    },
    turkish: {
        fajr:    [
            '📖 "Sabah namazının kılınması, şüphesiz melekler tarafından şahit olunan bir ibadettir." (17:78)',
            '📖 "Güneş doğmadan önce Rabbini övgüyle tesbih et." (20:130)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Sabah namazının iki rekatı, dünya ve içindekilerden daha hayırlıdır." (Müslim)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Kim sabah namazını kılarsa Allah\'ın koruması altındadır." (Müslim)',
        ],
        dhuhr:   [
            '📖 "Namazlara, özellikle orta namaza devam edin ve Allah\'a gönülden boyun eğerek durun." (2:238)',
            '📖 "Sana Kitap\'tan vahyedileni oku ve namazı kıl." (29:45)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Öğle vaktinde cennetin kapıları açılır." (Ebu Davud)',
            '📖 "Şüphesiz namaz, müminlere belirli vakitlerde farz kılınmıştır." (4:103)',
        ],
        asr:     [
            '📖 "Namazlara ve özellikle orta namaza (İkindi) devam edin." (2:238)',
            '📖 "Güneş batmadan önce Rabbini övgüyle tesbih et." (50:39)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "İkindi namazını terk eden ailesi ve malını kaybetmiş gibidir." (Buhari)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Melekler İkindi ve Sabah namazlarında bir araya gelir." (Buhari)',
        ],
        maghrib: [
            '📖 "Allah\'ı akşam ve sabah vakti tesbih edin." (30:17)',
            '📖 "Güneşin kaymasından gecenin karanlığına kadar namaz kılın." (17:78)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Ümmetim iftar etmekte aceleci oldukça hayır üzere olacaktır." (Buhari)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Üç şeyi geciktirmeyin — vakti gelince namazı." (Tirmizi)',
        ],
        isha:    [
            '📖 "Gecenin bir bölümünde O\'na secde et ve O\'nu uzun uzun tesbih et." (76:26)',
            '📖 "Gecenin bir kısmında sana özgü nafile bir namaz kıl." (17:79)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Münafıklara en ağır gelen namaz Yatsı ve Sabah\'tır — kıymetini bilselerdi emekleyerek bile gelirlerdi." (Buhari)',
            '🕌 Hz. Peygamber ﷺ buyurdu: "Yatsı namazını cemaatle kılan, gecenin yarısını namazla geçirmiş gibidir." (Müslim)',
        ],
    },
};

const getPrayerQuote = (prayerId: string, lang: NotifLang): string => {
    const langQuotes = PRAYER_QUOTES[lang] ?? PRAYER_QUOTES['english'];
    const quotes = langQuotes[prayerId] ?? langQuotes['fajr'];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

const buildNotifContent = (prayerId: string, lang: NotifLang) => {
    const ui = NOTIF_UI[lang] ?? NOTIF_UI['english'];
    const name = (PRAYER_DISPLAY_NAMES[lang] ?? PRAYER_DISPLAY_NAMES['english'])[prayerId] ?? prayerId;
    const quote = getPrayerQuote(prayerId, lang);
    return {
        title: ui.title.replace('{name}', name),
        body: `${ui.body.replace('{name}', name)}\n\n${quote}`,
    };
};

const buildFajrRiseContent = (lang: NotifLang) => {
    const ui = NOTIF_UI[lang] ?? NOTIF_UI['english'];
    const quote = getPrayerQuote('fajr', lang);
    return {
        title: (NOTIF_UI[lang] ?? NOTIF_UI['english']).title.replace('{name}', (PRAYER_DISPLAY_NAMES[lang] ?? PRAYER_DISPLAY_NAMES['english'])['fajr']),
        body: `${ui.fajrRise}\n\n${quote}`,
    };
};

// Stable notification identifiers — used so the language-change listener can cancel/replace
// prayer notifications without clobbering Ramadan ones (and vice versa).
const PRAYER_NOTIF_IDS = {
    fajr:         'falah-prayer-fajr',
    dhuhr:        'falah-prayer-dhuhr',
    asr:          'falah-prayer-asr',
    maghrib:      'falah-prayer-maghrib',
    isha:         'falah-prayer-isha',
    fajrTomorrow: 'falah-prayer-fajr-tomorrow',
} as const;

// ─── Daily Ayah notification ─────────────────────────────────────────────────
const DAILY_AYA_NOTIF_KEY = '@noor/daily_aya_notif';
const DEFAULT_DAILY_AYA_PREFS = { enabled: true, hour: 9, minute: 0 };
// Pre-schedule 7 days forward so users still get alerts if they don't open the app
// for a few days. Each mount re-schedules, wiping stale entries.
const DAILY_AYA_NOTIF_IDS = Array.from({ length: 7 }, (_, i) => `noor-daily-aya-${i}`);

const DAILY_AYA_TITLES: Record<string, string> = {
    english:    "📖 Today's Ayah",
    urdu:       '📖 آج کی آیت',
    indonesian: '📖 Ayat Hari Ini',
    french:     '📖 Verset du Jour',
    bengali:    '📖 আজকের আয়াত',
    turkish:    '📖 Günün Ayeti',
};

const translationColumnForLanguage = (lang: string): string => {
    switch (lang) {
        case 'urdu':       return 'text_urdu';
        case 'indonesian': return 'text_ind';
        case 'french':     return 'text_fra';
        case 'bengali':    return 'text_ben';
        case 'turkish':    return 'text_tur';
        default:           return 'text_english';
    }
};

async function cancelDailyAyaNotifications() {
    for (const id of DAILY_AYA_NOTIF_IDS) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
}

async function scheduleDailyAyaNotifications(
    db: import('expo-sqlite').SQLiteDatabase,
    hour: number,
    minute: number,
    lang: string,
) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await cancelDailyAyaNotifications();

    const baseTitle = DAILY_AYA_TITLES[lang] ?? DAILY_AYA_TITLES.english;
    const translationCol = translationColumnForLanguage(lang);
    const androidChannel = Platform.OS === 'android' ? { channelId: 'adhan' } : {};
    const now = new Date();

    for (let offset = 0; offset < DAILY_AYA_NOTIF_IDS.length; offset++) {
        const fireAt = new Date(now);
        fireAt.setDate(fireAt.getDate() + offset);
        fireAt.setHours(hour, minute, 0, 0);
        if (fireAt.getTime() <= now.getTime()) continue;

        // Hijri-month-themed selection: pick a verse whose subject matches the month.
        // Falls through to Al-Fatiha 1 only if the lookup somehow returns no row.
        const { surah, ayah, monthName } = getDailyVerseForDate(fireAt);
        const row = await db.getFirstAsync(
            `SELECT a.surah_number, a.ayah_number, a.text_arabic, a.${translationCol} AS translation, a.text_english, s.name_english
             FROM ayahs a JOIN surahs s ON s.number = a.surah_number
             WHERE a.surah_number = ? AND a.ayah_number = ?
             LIMIT 1`,
            [surah, ayah]
        ).catch(() => null) as any;
        if (!row) continue;

        const translation = row.translation || row.text_english || '';
        const arabic = sanitizeArabicText(row.text_arabic || '');
        const title = monthName ? `${baseTitle} · ${monthName}` : baseTitle;
        const body = `${arabic}\n\n${translation}\n\n— ${row.name_english} ${row.surah_number}:${row.ayah_number}`;

        try {
            await Notifications.scheduleNotificationAsync({
                identifier: DAILY_AYA_NOTIF_IDS[offset],
                content: { title, body, sound: true, color: '#C9A84C', ...androidChannel },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
            });
        } catch { /* ignore */ }
    }
}

// ─── Friday Surah al-Kahf reminder ───────────────────────────────────────────
// The Prophet ﷺ encouraged reciting Surah al-Kahf every Friday. We pre-schedule
// the next 4 Fridays at the user-set time so the reminder still fires even if
// the app isn't opened weekly. Each app launch refreshes the queue.
const FRIDAY_KAHF_NOTIF_KEY = '@noor/friday_kahf_notif';
const DEFAULT_FRIDAY_KAHF_PREFS = { enabled: true, hour: 7, minute: 0 };
const FRIDAY_KAHF_NOTIF_IDS = Array.from({ length: 4 }, (_, i) => `noor-friday-kahf-${i}`);

const FRIDAY_KAHF_STRINGS: Record<string, { title: string; body: string }> = {
    english:    { title: '🕌 Jumuʿah Mubarak',     body: 'It is Friday — recite Surah al-Kahf for blessings between this Friday and the next.' },
    urdu:       { title: '🕌 جمعہ مبارک',           body: 'آج جمعہ ہے — اس جمعہ سے اگلے جمعہ تک کی برکتوں کے لیے سورۃ الکہف پڑھیں۔' },
    indonesian: { title: '🕌 Jumʿah Mubarak',       body: 'Hari Jumat — bacalah Surah al-Kahfi untuk keberkahan hingga Jumat berikutnya.' },
    french:     { title: '🕌 Joumouʿah Moubarak',   body: "C'est vendredi — récitez Sourate al-Kahf pour les bénédictions jusqu'à vendredi prochain." },
    bengali:    { title: '🕌 জুমু’আহ মুবারক',         body: 'আজ শুক্রবার — পরবর্তী শুক্রবার পর্যন্ত বরকতের জন্য সূরা আল-কাহফ তিলাওয়াত করুন।' },
    turkish:    { title: '🕌 Cuma Mübarek',         body: 'Bugün Cuma — bu Cumadan diğerine kadar bereket için Kehf Suresi’ni okuyun.' },
};

async function cancelFridayKahfNotifications() {
    for (const id of FRIDAY_KAHF_NOTIF_IDS) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
}

async function scheduleFridayKahfNotifications(hour: number, minute: number, lang: string) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await cancelFridayKahfNotifications();

    const strings = FRIDAY_KAHF_STRINGS[lang] ?? FRIDAY_KAHF_STRINGS.english;
    const androidChannel = Platform.OS === 'android' ? { channelId: 'adhan' } : {};
    const now = new Date();

    let next = nextFridayAt(hour, minute, now);
    for (let i = 0; i < FRIDAY_KAHF_NOTIF_IDS.length; i++) {
        try {
            await Notifications.scheduleNotificationAsync({
                identifier: FRIDAY_KAHF_NOTIF_IDS[i],
                content: { title: strings.title, body: strings.body, sound: true, color: '#C9A84C', ...androidChannel },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
            });
        } catch { /* ignore */ }
        next = new Date(next);
        next.setDate(next.getDate() + 7);
    }
}

/**
 * Cancels all prayer-scoped notifications (by identifier) and reschedules
 * them with the given language. Safe to call whenever the set of prayers,
 * prefs, or language changes — does not touch Ramadan/other identifiers.
 */
async function schedulePrayerNotifications(
    prayers: { id: string; date: Date }[],
    prefs: Record<string, boolean>,
    tomorrowFajr: Date | null,
    lang: NotifLang,
) {
    // Cancel only prayer-scoped IDs, not everything
    for (const id of Object.values(PRAYER_NOTIF_IDS)) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const nowMs = Date.now();
    const androidChannel = Platform.OS === 'android' ? { channelId: 'adhan' } : {};

    for (const prayer of prayers) {
        if (!prefs[prayer.id]) continue;
        if (prayer.date.getTime() <= nowMs) continue;
        const identifier = (PRAYER_NOTIF_IDS as Record<string, string>)[prayer.id];
        if (!identifier) continue;
        try {
            const { title, body } = buildNotifContent(prayer.id, lang);
            await Notifications.scheduleNotificationAsync({
                identifier,
                content: { title, body, sound: true, color: '#C9A84C', ...androidChannel },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.date },
            });
        } catch { }
    }

    if (prefs['fajr'] && tomorrowFajr && tomorrowFajr.getTime() > nowMs) {
        try {
            const { title, body } = buildFajrRiseContent(lang);
            await Notifications.scheduleNotificationAsync({
                identifier: PRAYER_NOTIF_IDS.fajrTomorrow,
                content: { title, body, sound: true, color: '#C9A84C', ...androidChannel },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrowFajr },
            });
        } catch { }
    }
}

// ─── Quick actions with fixed Islamic-themed gradients ────────────────────────
const QUICK_ACTIONS = [
    { title: 'Salah',   icon: 'user',       route: '/salah',  gradient: ['#4A2C6E', '#7B4FA6'] as const },
    { title: 'Tasbih',  icon: 'refresh-cw', route: '/tasbih', gradient: ['#1A5C38', '#2E9D60'] as const },
    { title: 'Zakat',   icon: 'heart',      route: '/zakat',  gradient: ['#92650A', '#C9A84C'] as const },
    { title: 'Duas',    icon: 'book-open',  route: '/duas',   gradient: ['#1B3A6B', '#2B6CB0'] as const },
];

// ─── Famous mosque watermark images (replace PNGs in assets/mosques/ with real photos) ──
const MOSQUE_IMAGES = [
    { key: 'haram',   label: 'Masjid al-Haram, Makkah',         source: require('../../../assets/mosques/masjid_al_haram.png') },
    { key: 'nabawi',  label: 'Masjid an-Nabawi, Madinah',       source: require('../../../assets/mosques/masjid_nabawi.png')   },
    { key: 'aqsa',    label: 'Masjid al-Aqsa, Jerusalem',       source: require('../../../assets/mosques/al_aqsa.png')          },
    { key: 'blue',    label: 'Blue Mosque, Istanbul',            source: require('../../../assets/mosques/blue_mosque.png')      },
    { key: 'zayed',   label: 'Sheikh Zayed Grand Mosque, Abu Dhabi', source: require('../../../assets/mosques/sheikh_zayed.png') },
];
const MOSQUE_CYCLE_MS = 8000; // rotate every 8 seconds

// ─── Manual city presets (used when GPS is denied/unavailable) ───────────────
// Curated list of major Islamic centres + global metros so a user who declines
// location permission can still pick a sensible default. Lat/lng to 4 decimals
// (≈ 11 m precision — plenty for prayer-time calculation).
const CITY_PRESETS: { name: string; country: string; iso: string; lat: number; lng: number }[] = [
    { name: 'Makkah',         country: 'Saudi Arabia',     iso: 'SA', lat: 21.4225,  lng: 39.8262  },
    { name: 'Madinah',        country: 'Saudi Arabia',     iso: 'SA', lat: 24.4683,  lng: 39.6142  },
    { name: 'Riyadh',         country: 'Saudi Arabia',     iso: 'SA', lat: 24.7136,  lng: 46.6753  },
    { name: 'Jerusalem',      country: 'Palestine',        iso: 'PS', lat: 31.7683,  lng: 35.2137  },
    { name: 'Cairo',          country: 'Egypt',            iso: 'EG', lat: 30.0444,  lng: 31.2357  },
    { name: 'Istanbul',       country: 'Türkiye',          iso: 'TR', lat: 41.0082,  lng: 28.9784  },
    { name: 'Karachi',        country: 'Pakistan',         iso: 'PK', lat: 24.8607,  lng: 67.0011  },
    { name: 'Lahore',         country: 'Pakistan',         iso: 'PK', lat: 31.5497,  lng: 74.3436  },
    { name: 'Islamabad',      country: 'Pakistan',         iso: 'PK', lat: 33.6844,  lng: 73.0479  },
    { name: 'Dhaka',          country: 'Bangladesh',       iso: 'BD', lat: 23.8103,  lng: 90.4125  },
    { name: 'Delhi',          country: 'India',            iso: 'IN', lat: 28.6139,  lng: 77.2090  },
    { name: 'Jakarta',        country: 'Indonesia',        iso: 'ID', lat: -6.2088,  lng: 106.8456 },
    { name: 'Kuala Lumpur',   country: 'Malaysia',         iso: 'MY', lat: 3.1390,   lng: 101.6869 },
    { name: 'Dubai',          country: 'UAE',              iso: 'AE', lat: 25.2048,  lng: 55.2708  },
    { name: 'Doha',           country: 'Qatar',            iso: 'QA', lat: 25.2854,  lng: 51.5310  },
    { name: 'Tehran',         country: 'Iran',             iso: 'IR', lat: 35.6892,  lng: 51.3890  },
    { name: 'Casablanca',     country: 'Morocco',          iso: 'MA', lat: 33.5731,  lng: -7.5898  },
    { name: 'London',         country: 'United Kingdom',   iso: 'GB', lat: 51.5074,  lng: -0.1278  },
    { name: 'New York',       country: 'United States',    iso: 'US', lat: 40.7128,  lng: -74.0060 },
    { name: 'Toronto',        country: 'Canada',           iso: 'CA', lat: 43.6532,  lng: -79.3832 },
    { name: 'Sydney',         country: 'Australia',        iso: 'AU', lat: -33.8688, lng: 151.2093 },
];

const MANUAL_LOCATION_KEY = '@noor/manual_location';

// ─── Calculation methods exposed to users ────────────────────────────────────
// id: -1 = Auto (country-based), others map to AlAdhan method IDs
const CALC_METHODS = [
    { id: -1,  name: 'Auto (location-based)',    region: 'Recommended' },
    { id: 3,   name: 'Muslim World League',       region: 'Global / Default' },
    { id: 1,   name: 'Univ. of Karachi',          region: 'South Asia' },
    { id: 2,   name: 'ISNA',                      region: 'North America' },
    { id: 4,   name: 'Umm Al-Qura, Makkah',       region: 'Saudi Arabia / Gulf' },
    { id: 5,   name: 'Egyptian Authority',         region: 'Egypt / North Africa' },
    { id: 7,   name: 'Tehran',                     region: 'Iran' },
    { id: 16,  name: 'Jafari / Shia',              region: 'Shia Muslims' },
];

// ─── BigDataCloud Reverse Geocoding ──────────────────────────────────────────
const reverseGeocode = async (lat: number, lon: number): Promise<{ locality: string; countryCode: string }> => {
    const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) throw new Error(`BigDataCloud ${res.status}`);
    const d = await res.json();
    return { locality: d.locality || d.city || d.principalSubdivision || '', countryCode: d.countryCode || '' };
};

// ─── Country → method mapping ─────────────────────────────────────────────────
const COUNTRY_METHODS: Record<string, { method: number; school: number }> = {
    PK: { method: 1, school: 1 }, BD: { method: 1, school: 1 },
    AF: { method: 1, school: 1 }, IN: { method: 1, school: 0 },
    SA: { method: 4, school: 0 }, AE: { method: 8, school: 0 },
    KW: { method: 9, school: 0 }, QA: { method: 10, school: 0 },
    BH: { method: 8, school: 0 }, OM: { method: 8, school: 0 },
    YE: { method: 4, school: 0 }, EG: { method: 5, school: 0 },
    MA: { method: 21, school: 0 }, DZ: { method: 19, school: 0 },
    TN: { method: 18, school: 0 }, LY: { method: 3, school: 0 },
    JO: { method: 23, school: 0 }, SY: { method: 5, school: 0 },
    IQ: { method: 3, school: 0 }, LB: { method: 3, school: 0 },
    PS: { method: 3, school: 0 }, IR: { method: 7, school: 0 },
    TR: { method: 13, school: 1 }, ID: { method: 20, school: 0 },
    MY: { method: 17, school: 0 }, SG: { method: 11, school: 0 },
    KZ: { method: 14, school: 1 }, UZ: { method: 1, school: 1 },
    US: { method: 2, school: 0 }, CA: { method: 2, school: 0 },
    GB: { method: 15, school: 0 }, FR: { method: 12, school: 0 },
    DE: { method: 3, school: 0 }, NL: { method: 3, school: 0 },
    BE: { method: 3, school: 0 }, RU: { method: 14, school: 1 },
    AU: { method: 3, school: 0 }, NZ: { method: 3, school: 0 },
};
const DEFAULT_METHOD = { method: 3, school: 0 }; // MWL fallback

// Cache key includes method+school so changing settings doesn't serve stale data
const prayerCacheKey = (lat: number, lng: number, method: number, school: number) => {
    // Use local date (not UTC) so the cache resets at local midnight, not UTC midnight.
    // UTC date can be "tomorrow" for UTC+ timezones in the evening, causing stale prayers.
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `@noor/prayer_${date}_${Math.round(lat * 100)}_${Math.round(lng * 100)}_m${method}_s${school}`;
};

const fetchAlAdhan = async (lat: number, lng: number, method: number, school: number, date?: Date) => {
    const ts = date ? Math.floor(date.getTime() / 1000) : Math.floor(Date.now() / 1000);
    const url = `${ALADHAN_API}/timings/${ts}?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AlAdhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error('AlAdhan API error');
    return json.data;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { db } = useDatabase();
    const { theme } = useTheme();
    const { isOfflineMode } = useNetworkMode();
    const { language } = useLanguage();
    const { audioState } = useAudio();

    const [loading, setLoading] = useState(true);
    const [prayers, setPrayers] = useState<any[]>([]);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [currentPrayerId, setCurrentPrayerId] = useState('none');
    const [countdown, setCountdown] = useState('');
    const [fillPercentage, setFillPercentage] = useState(0);
    const [locationName, setLocationName] = useState('Locating...');
    const [greeting, setGreeting] = useState('As-salamu alaykum');
    const [hijriDate, setHijriDate] = useState('');
    const [completedPrayers, setCompletedPrayers] = useState<string[]>([]);
    const [envGradient, setEnvGradient] = useState<readonly [string, string, ...string[]]>(['#FF9A9E', '#FECFEF']);
    const [themeTextColor, setThemeTextColor] = useState('#FFFFFF');
    const [themeSubTextColor, setThemeSubTextColor] = useState('rgba(255,255,255,0.8)');
    const [dayAya, setDayAya] = useState<{ arabic: string; translation: string; surahName: string; surahNumber: number; numberInSurah: number } | null>(null);
    const [dayAyaBookmarked, setDayAyaBookmarked] = useState(false);

    // Prayer settings — { method: -1 means Auto, school: 0=Standard 1=Hanafi }
    const [prayerSettings, setPrayerSettings] = useState<{ method: number; school: number }>({ method: -1, school: 0 });
    const [showPrayerSettings, setShowPrayerSettings] = useState(false);
    // City picker — opens when user taps the location pill or when GPS is denied
    const [showCityPicker, setShowCityPicker] = useState(false);
    // Track whether we're currently using a manually-picked city (vs GPS)
    const [usingManualLocation, setUsingManualLocation] = useState(false);
    const [citySearchQuery, setCitySearchQuery] = useState('');
    // Draft values used inside the modal before applying
    const [draftMethod, setDraftMethod] = useState(-1);
    const [draftSchool, setDraftSchool] = useState(0);

    // Notification prefs
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(DEFAULT_NOTIF_PREFS);
    const [notifPermDenied, setNotifPermDenied] = useState(false);
    const [dailyAyaPrefs, setDailyAyaPrefs] = useState(DEFAULT_DAILY_AYA_PREFS);
    const [fridayKahfPrefs, setFridayKahfPrefs] = useState(DEFAULT_FRIDAY_KAHF_PREFS);

    // IANA timezone for the prayer location (e.g. "America/Los_Angeles").
    // Comes from AlAdhan API meta.timezone — includes DST, unlike a raw longitude offset.
    const [locationTimezone, setLocationTimezone] = useState<string | null>(null);

    // Refs for cross-call persistence without triggering re-renders
    const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
    const autoMethodRef = useRef<{ method: number; school: number }>(DEFAULT_METHOD);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const tomorrowFajrRef = useRef<Date | null>(null);
    // Store effective method/school so the timer can reload prayers when a prayer time passes
    const effectiveMethodRef = useRef<number>(DEFAULT_METHOD.method);
    const effectiveSchoolRef = useRef<number>(DEFAULT_METHOD.school);

    // Mirror `language` into a ref so the []-deps loadPrayers callback and
    // background enrichment fetches always read the current value, not a stale one.
    const languageRef = useRef(language);
    useEffect(() => { languageRef.current = language; }, [language]);

    // Reschedule prayer notifications when the user changes app language so the
    // Adhan alerts arrive in the newly selected language. Skip the initial mount —
    // loadPrayers already schedules with the current language on first load.
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) { didMountRef.current = true; return; }
        if (prayers.length === 0) return;
        (async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') return;
            const notifLang = (language as NotifLang) in NOTIF_UI ? (language as NotifLang) : 'english';
            await schedulePrayerNotifications(prayers, notifPrefs, tomorrowFajrRef.current, notifLang);
        })();
    }, [language]);

    // Daily ayah notifications — independent of prayer notifs. Re-runs when the
    // pref, time, or language changes. Schedules the next 7 days forward so alerts
    // still fire if the app isn't opened every day; each mount refreshes the queue.
    useEffect(() => {
        if (!db) return;
        if (!dailyAyaPrefs.enabled) {
            cancelDailyAyaNotifications();
            return;
        }
        scheduleDailyAyaNotifications(db, dailyAyaPrefs.hour, dailyAyaPrefs.minute, language);
    }, [db, dailyAyaPrefs.enabled, dailyAyaPrefs.hour, dailyAyaPrefs.minute, language]);

    // Friday Surah al-Kahf reminder — pre-schedules the next 4 Fridays so the alert
    // still fires even if the app sits closed for a few weeks.
    useEffect(() => {
        if (!fridayKahfPrefs.enabled) {
            cancelFridayKahfNotifications();
            return;
        }
        scheduleFridayKahfNotifications(fridayKahfPrefs.hour, fridayKahfPrefs.minute, language);
    }, [fridayKahfPrefs.enabled, fridayKahfPrefs.hour, fridayKahfPrefs.minute, language]);

    // ── Daily Aya: SQLite-backed, language-aware, cache-per-(date,language) ────
    useEffect(() => {
        if (!db) return;
        let mounted = true;
        (async () => {
            const dateStr = new Date().toLocaleDateString('en-CA');
            const ayaKey = `@noor/daily_aya_${dateStr}_${language}`;
            try {
                const cached = await AsyncStorage.getItem(ayaKey);
                if (!mounted) return;
                if (cached) {
                    try { setDayAya(JSON.parse(cached)); return; } catch {
                        AsyncStorage.removeItem(ayaKey).catch(() => {});
                    }
                }
                const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
                const globalAyahIdx = (dayOfYear % 6236) + 1;
                const translationCol = translationColumnForLanguage(language);
                const row = await db.getFirstAsync(
                    `SELECT a.surah_number, a.ayah_number, a.text_arabic,
                            a.${translationCol} AS translation, a.text_english,
                            s.name_english
                     FROM ayahs a JOIN surahs s ON s.number = a.surah_number
                     ORDER BY a.surah_number ASC, a.ayah_number ASC
                     LIMIT 1 OFFSET ?`,
                    [globalAyahIdx - 1]
                ) as any;
                if (!mounted || !row) return;
                const aya = {
                    arabic: sanitizeArabicText(row.text_arabic || ''),
                    translation: row.translation || row.text_english || '',
                    surahName: row.name_english,
                    surahNumber: row.surah_number,
                    numberInSurah: row.ayah_number,
                };
                setDayAya(aya);
                AsyncStorage.setItem(ayaKey, JSON.stringify(aya)).catch(() => {});
            } catch {}
        })();
        return () => { mounted = false; };
    }, [db, language]);

    // ── Daily Aya bookmark state — reuses the global Quran bookmark store ──────
    const QURAN_BOOKMARK_KEY = '@noor/quran_bookmarks';
    useEffect(() => {
        if (!dayAya) { setDayAyaBookmarked(false); return; }
        AsyncStorage.getItem(QURAN_BOOKMARK_KEY).then(raw => {
            if (!raw) { setDayAyaBookmarked(false); return; }
            try {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    setDayAyaBookmarked(arr.some((b: any) =>
                        b?.surah_number === dayAya.surahNumber && b?.ayah_number === dayAya.numberInSurah
                    ));
                }
            } catch {}
        }).catch(() => {});
    }, [dayAya]);

    const toggleDayAyaBookmark = useCallback(async () => {
        if (!dayAya) return;
        try {
            const raw = await AsyncStorage.getItem(QURAN_BOOKMARK_KEY);
            let list: any[] = [];
            if (raw) {
                try { const p = JSON.parse(raw); if (Array.isArray(p)) list = p; } catch {}
            }
            const exists = list.some(b => b?.surah_number === dayAya.surahNumber && b?.ayah_number === dayAya.numberInSurah);
            const next = exists
                ? list.filter(b => !(b?.surah_number === dayAya.surahNumber && b?.ayah_number === dayAya.numberInSurah))
                : [...list, {
                    surah_number: dayAya.surahNumber,
                    ayah_number: dayAya.numberInSurah,
                    surah_name: dayAya.surahName,
                    arabic_snippet: dayAya.arabic.slice(0, 60),
                    saved_at: Date.now(),
                }];
            await AsyncStorage.setItem(QURAN_BOOKMARK_KEY, JSON.stringify(next));
            setDayAyaBookmarked(!exists);
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
        } catch {}
    }, [dayAya]);

    const shareDayAya = useCallback(async () => {
        if (!dayAya) return;
        const ref = `Surah ${dayAya.surahName} [${dayAya.surahNumber}:${dayAya.numberInSurah}]`;
        const message = `${dayAya.arabic}\n\n"${dayAya.translation}"\n\n— ${ref}\n\nShared from Falah`;
        try {
            await Share.share(
                Platform.OS === 'ios' ? { message } : { message, title: ref },
                { dialogTitle: 'Share Verse of the Day' }
            );
        } catch {}
    }, [dayAya]);

    const pulseAnim = useRef(new Animated.Value(0)).current;

    // ── Mosque watermark cycling ──────────────────────────────────────────────
    const [mosqueIndex, setMosqueIndex] = useState(0);
    const mosqueAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const cycle = setInterval(() => {
            Animated.timing(mosqueAnim, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }).start(() => {
                setMosqueIndex(prev => (prev + 1) % MOSQUE_IMAGES.length);
                Animated.timing(mosqueAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }).start();
            });
        }, MOSQUE_CYCLE_MS);
        return () => clearInterval(cycle);
    }, []);

    // Detect whether the device is set to 24-hour time.
    // Format a known 1 PM time and check if AM/PM appears — if not, device uses 24-hour.
    const deviceUses24Hour = !new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
        .format(new Date(2000, 0, 1, 13))
        .match(/[AP]M/i);

    // Helper: format a Date using the correct timezone + device hour format.
    const formatPrayerTime = (d: Date, tz?: string | null, fallbackOffsetMinutes?: number): string => {
        if (tz) {
            try {
                return new Intl.DateTimeFormat(undefined, {
                    hour: '2-digit', minute: '2-digit',
                    hour12: !deviceUses24Hour,
                    timeZone: tz,
                }).format(d);
            } catch { /* fall through */ }
        }
        // Fallback: moment with explicit UTC offset
        const offset = fallbackOffsetMinutes ?? (-new Date().getTimezoneOffset());
        return moment(d).utcOffset(offset).format(deviceUses24Hour ? 'HH:mm' : 'hh:mm A');
    };

    // When the IANA timezone arrives from AlAdhan API, re-format all prayer times.
    // This corrects DST errors from the initial longitude-based estimate
    // (e.g. PST vs PDT for San Francisco in spring/summer).
    useEffect(() => {
        if (!locationTimezone || prayers.length === 0) return;
        setPrayers(prev => prev.map(p => ({
            ...p,
            time: formatPrayerTime(p.date, locationTimezone),
        })));
    }, [locationTimezone]);

    // Computed fresh each time so prayer tracking resets correctly after midnight
    const getTodayStorageKey = () => `prayers_completed_${new Date().toDateString()}`;

    const loadCompletedPrayers = async () => {
        try {
            const stored = await AsyncStorage.getItem(getTodayStorageKey());
            if (stored) setCompletedPrayers(JSON.parse(stored));
            else setCompletedPrayers([]); // new day — clear yesterday's completions
        } catch { }
    };

    const togglePrayer = async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newList = completedPrayers.includes(id) ? completedPrayers.filter(p => p !== id) : [...completedPrayers, id];
        setCompletedPrayers(newList);
        try { await AsyncStorage.setItem(getTodayStorageKey(), JSON.stringify(newList)); } catch { }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 12) return 'Sabah al-Khayr';      // morning
        if (hour >= 12 && hour < 17) return 'As-Salamu Alaykum';   // afternoon
        if (hour >= 17 && hour < 20) return "Masa' al-Khayr";      // evening
        return 'As-Salamu Alaykum';                                  // night
    };

    // ── Core prayer loading — called on mount and when settings change ─────────
    const loadPrayers = useCallback(async (lat: number, lng: number, method: number, school: number) => {
        // Persist effective method/school so the countdown timer can reload on prayer change
        effectiveMethodRef.current = method;
        effectiveSchoolRef.current = school;

        // Clear any existing countdown timer
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        const coordinates = new Coordinates(lat, lng);

        // Adhan.js offline params (mapped from AlAdhan method ID)
        let offlineParams = method === 1 ? CalculationMethod.Karachi()
            : method === 2 ? CalculationMethod.NorthAmerica()
                : CalculationMethod.MuslimWorldLeague();
        if (school === 1) offlineParams.madhab = Madhab.Hanafi;

        const { status: finalStatus } = await Notifications.getPermissionsAsync();

        let todayPrayers: any = null;
        let tomorrowFajr: Date | null = null;
        const nowTime = new Date().getTime();
        let hijriString = '';

        // ── Daily cache (includes method+school so method changes bust cache) ──
        const cacheKey = prayerCacheKey(lat, lng, method, school);
        let cachedTimezone: string | null = null;
        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const { prayers: cp, hijri: ch, tomorrowFajrMs, timezone: tz } = JSON.parse(cached);
                todayPrayers = {
                    Fajr: new Date(cp.Fajr), Dhuhr: new Date(cp.Dhuhr),
                    Asr: new Date(cp.Asr), Maghrib: new Date(cp.Maghrib), Isha: new Date(cp.Isha),
                };
                hijriString = ch;
                tomorrowFajr = tomorrowFajrMs ? new Date(tomorrowFajrMs) : null;
                if (tz) { cachedTimezone = tz; setLocationTimezone(tz); }
            }
        } catch { }

        // ── Offline calculation (adhan.js) — always primary ───────────────────
        if (!todayPrayers) {
            const offlineTimes    = new PrayerTimes(coordinates, new Date(), offlineParams);
            const offlineTomorrow = new PrayerTimes(coordinates, (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), offlineParams);
            todayPrayers = {
                Fajr: offlineTimes.fajr, Dhuhr: offlineTimes.dhuhr,
                Asr: offlineTimes.asr, Maghrib: offlineTimes.maghrib, Isha: offlineTimes.isha,
            };
            tomorrowFajr   = offlineTomorrow.fajr;
            hijriString    = moment().format('iD iMMMM iYYYY').toUpperCase();

            // Cache offline result so subsequent loads are instant
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                prayers: {
                    Fajr: todayPrayers.Fajr.getTime(), Dhuhr: todayPrayers.Dhuhr.getTime(),
                    Asr: todayPrayers.Asr.getTime(), Maghrib: todayPrayers.Maghrib.getTime(),
                    Isha: todayPrayers.Isha.getTime(),
                },
                hijri: hijriString,
                tomorrowFajrMs: tomorrowFajr?.getTime() ?? null,
            })).catch(() => {});

            // Enrich Hijri date + get IANA timezone from AlAdhan in background (non-blocking).
            // The timezone is used to re-format prayer times with correct DST handling.
            // Skip in forced offline mode.
            if (isOfflineMode) return;
            fetchAlAdhan(lat, lng, method, school).then(async td => {
                const h = td?.date?.hijri;
                if (h) {
                    const richHijri = `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
                    setHijriDate(richHijri);
                }
                const apiTz: string | undefined = td?.meta?.timezone;
                if (apiTz && apiTz !== cachedTimezone) {
                    setLocationTimezone(apiTz);
                    // Persist timezone in the daily cache so next load is instant
                    try {
                        const existing = await AsyncStorage.getItem(cacheKey);
                        if (existing) {
                            await AsyncStorage.setItem(cacheKey, JSON.stringify({ ...JSON.parse(existing), timezone: apiTz }));
                        }
                    } catch { }
                }
            }).catch((e) => { console.warn('[Noor/AlAdhan] Background Hijri/timezone enrichment failed:', e); });
        } else {
            // Cache hit — still fetch AlAdhan in background to refresh timezone if missing
            if (!cachedTimezone && !isOfflineMode) {
                fetchAlAdhan(lat, lng, method, school).then(async td => {
                    const h = td?.date?.hijri;
                    if (h) {
                        const richHijri = `${h.day} ${h.month.en} ${h.year} ${h.designation.abbreviated}`;
                        setHijriDate(richHijri);
                    }
                    const apiTz: string | undefined = td?.meta?.timezone;
                    if (apiTz) {
                        setLocationTimezone(apiTz);
                        try {
                            const existing = await AsyncStorage.getItem(cacheKey);
                            if (existing) {
                                await AsyncStorage.setItem(cacheKey, JSON.stringify({ ...JSON.parse(existing), timezone: apiTz }));
                            }
                        } catch { }
                    }
                }).catch((e) => { console.warn('[Noor/AlAdhan] Background timezone cache-miss fetch failed:', e); });
            }
        }

        setHijriDate(hijriString);

        // Choose the right UTC offset for displaying prayer times.
        //
        // Problem: adhan.js computes correct UTC timestamps, but moment(date).format()
        // uses the DEVICE timezone. If the device is in a different timezone from the
        // prayer location (e.g. a developer in PKT testing with a San Francisco GPS fix),
        // times display wildly wrong (all times shifted by the timezone difference).
        //
        // Fix: compare device timezone to the solar timezone of the location (lng / 15).
        // • Within 90 minutes → device timezone is correct (handles DST, half-hour offsets
        //   like India +5:30, Iran +3:30, and cities near timezone boundaries like Karachi).
        // • Beyond 90 minutes → device is in a completely different region from the location;
        //   fall back to the solar offset so times are at least in the right ballpark.
        const deviceUtcOffsetMinutes   = -new Date().getTimezoneOffset();          // e.g. PKT = +300
        // Solar estimate: clamp to valid UTC range (-720..+840) and handle the International
        // Date Line wraparound (e.g. Chatham Islands lng≈-176° is actually UTC+12:45, not -12:00).
        const rawSolarOffset = Math.round(lng / 15) * 60;
        const altSolarOffset = rawSolarOffset < 0 ? rawSolarOffset + 1440 : rawSolarOffset - 1440;
        const locationUtcOffsetMinutes = Math.abs(deviceUtcOffsetMinutes - rawSolarOffset) <= Math.abs(deviceUtcOffsetMinutes - altSolarOffset)
            ? rawSolarOffset : altSolarOffset;
        const tzOffsetMinutes =
            Math.abs(deviceUtcOffsetMinutes - locationUtcOffsetMinutes) <= 90
                ? deviceUtcOffsetMinutes   // device is local to the prayer location ✓
                : locationUtcOffsetMinutes; // device is in a very different timezone
        // Use the IANA timezone if already cached, otherwise fall back to offset estimate.
        // formatPrayerTime also respects the device's 24hr/12hr preference.
        const fmtTime = (d: Date) => formatPrayerTime(d, cachedTimezone, tzOffsetMinutes);

        const list = [
            { id: 'fajr',    name: 'Fajr',    time: fmtTime(todayPrayers.Fajr),    date: todayPrayers.Fajr,    icon: 'sunrise' },
            { id: 'dhuhr',   name: 'Dhuhr',   time: fmtTime(todayPrayers.Dhuhr),   date: todayPrayers.Dhuhr,   icon: 'sun' },
            { id: 'asr',     name: 'Asr',     time: fmtTime(todayPrayers.Asr),     date: todayPrayers.Asr,     icon: 'cloud' },
            { id: 'maghrib', name: 'Maghrib', time: fmtTime(todayPrayers.Maghrib), date: todayPrayers.Maghrib, icon: 'sunset' },
            { id: 'isha',    name: 'Isha',    time: fmtTime(todayPrayers.Isha),    date: todayPrayers.Isha,    icon: 'moon' },
        ];

        // Compute sunrise (offline, no network) to define the Fajr window end
        const sunriseMs = new PrayerTimes(coordinates, new Date(), offlineParams).sunrise.getTime();
        const ishaEndMs = tomorrowFajr?.getTime()
            ?? new PrayerTimes(coordinates, (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), offlineParams).fajr.getTime();
        // Each prayer is "active" only within its designated time window:
        // Fajr → sunrise | Dhuhr → Asr | Asr → Maghrib | Maghrib → Isha | Isha → next Fajr
        const windowEnd: Record<string, number> = {
            fajr: sunriseMs, dhuhr: todayPrayers.Asr.getTime(),
            asr: todayPrayers.Maghrib.getTime(), maghrib: todayPrayers.Isha.getTime(), isha: ishaEndMs,
        };

        let activePrayerId = 'none';
        let nextId = 'none';
        for (let i = 0; i < list.length; i++) {
            const s = list[i].date.getTime(), e = windowEnd[list[i].id];
            if (nowTime >= s && nowTime < e) activePrayerId = list[i].id;
            if (nowTime < list[i].date.getTime() && nextId === 'none') nextId = list[i].id;
        }

        let txtColor = '#FFFFFF';
        let subTxtColor = 'rgba(255,255,255,0.8)';
        if (activePrayerId === 'fajr') {
            setEnvGradient(['#E6E6FA', '#E0F2F7']);
            txtColor = '#1B3022'; subTxtColor = 'rgba(27,48,34,0.7)';
        } else if (activePrayerId === 'dhuhr') {
            setEnvGradient(['#f4d125', '#f97316']);
            txtColor = '#142d1a'; subTxtColor = 'rgba(20,45,26,0.8)';
        } else if (activePrayerId === 'asr') {
            setEnvGradient(['#fefce8', '#fef3c7']);
            txtColor = '#1E293B'; subTxtColor = 'rgba(30,41,59,0.7)';
        } else if (activePrayerId === 'maghrib') {
            setEnvGradient(['#ff7e5f', '#feb47b', '#86a8e7']);
        } else if (activePrayerId === 'isha') {
            setEnvGradient(['#3b458a', '#1e244d']);
        } else {
            // Between windows — morning gap (post-sunrise pre-Dhuhr) or pre-Fajr night
            const h = new Date().getHours();
            if (h >= 4 && h < 12) { setEnvGradient(['#a8d8ea', '#d4eaf0']); txtColor = '#1B3022'; subTxtColor = 'rgba(27,48,34,0.7)'; }
            else { setEnvGradient(['#3b458a', '#1e244d']); }
        }
        setThemeTextColor(txtColor);
        setThemeSubTextColor(subTxtColor);
        setCurrentPrayerId(activePrayerId);

        setPrayers(list.map(p => ({ ...p, isNext: p.id === nextId })));
        await loadCompletedPrayers();

        // Store tomorrow Fajr for use in notification toggle
        tomorrowFajrRef.current = tomorrowFajr;

        // ── Schedule notifications ────────────────────────────────────────────
        if (finalStatus === 'granted') {
            let prefs = DEFAULT_NOTIF_PREFS as Record<string, boolean>;
            try {
                const saved = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
                if (saved) prefs = JSON.parse(saved);
            } catch { }
            // Read language via ref — loadPrayers' useCallback has [] deps so `language`
            // closure-captured here would otherwise go stale on language switch.
            const notifLang = (languageRef.current as NotifLang) in NOTIF_UI
                ? (languageRef.current as NotifLang) : 'english';
            await schedulePrayerNotifications(list, prefs, tomorrowFajr, notifLang);
        }

        // ── Countdown timer ───────────────────────────────────────────────────
        let activeNextId = nextId;
        let activeNextTime: Date;

        if (!activeNextId || activeNextId === 'none') {
            activeNextId = 'fajr';
            if (tomorrowFajr) {
                activeNextTime = tomorrowFajr;
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                activeNextTime = new PrayerTimes(coordinates, tomorrow, offlineParams).fajr;
            }
            setNextPrayerName('Fajr');
        } else {
            activeNextTime = list.find(p => p.id === activeNextId)!.date;
            setNextPrayerName(activeNextId.charAt(0).toUpperCase() + activeNextId.slice(1));
        }

        let previousMs: number;
        if (activePrayerId !== 'none') {
            previousMs = list.find(p => p.id === activePrayerId)!.date.getTime();
        } else {
            // Use the end of the most recently completed prayer window as the ring "start"
            let lastWinEnd = new Date().setHours(0, 0, 0, 0);
            for (const p of list) { if (nowTime >= windowEnd[p.id]) lastWinEnd = windowEnd[p.id]; }
            previousMs = lastWinEnd;
        }

        const totalDuration = activeNextTime.getTime() - previousMs;

        const updateTimer = () => {
            const now = new Date().getTime();
            const diff = activeNextTime.getTime() - now;

            // Keep greeting current throughout the day
            setGreeting(getGreeting());

            if (diff <= 0) {
                // A prayer time has passed — reload so hero, gradient, and list advance
                if (coordsRef.current) {
                    clearInterval(timerIntervalRef.current!);
                    timerIntervalRef.current = null;
                    const { lat, lng } = coordsRef.current;
                    loadPrayers(lat, lng, effectiveMethodRef.current, effectiveSchoolRef.current);
                } else {
                    // No coords yet (edge case) — just show 0 until coords arrive
                    setCountdown('0h 0m');
                    setFillPercentage(1);
                }
            } else {
                const d = moment.duration(diff);
                setCountdown(`${Math.floor(d.asHours())}h ${d.minutes()}m`);
                setFillPercentage(Math.max(0, Math.min(1, (now - previousMs) / totalDuration)));
            }
        };
        updateTimer();
        timerIntervalRef.current = setInterval(updateTimer, 60000);

        setLoading(false);
    }, []);

    // ── Startup: daily aya + pulse animation + location → load prayers ─────────
    useEffect(() => {
        let mounted = true;
        setGreeting(getGreeting());

        // Daily Aya is loaded by a dedicated effect keyed on [db, language]
        // so it re-fetches the translation when the user switches languages.

        // Pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        // Load notification prefs
        AsyncStorage.getItem(NOTIF_PREFS_KEY).then(saved => {
            if (!mounted || !saved) return;
            try { setNotifPrefs(JSON.parse(saved)); } catch {
                AsyncStorage.removeItem(NOTIF_PREFS_KEY).catch(() => {});
            }
        }).catch(() => { });

        // Load daily ayah notification pref
        AsyncStorage.getItem(DAILY_AYA_NOTIF_KEY).then(saved => {
            if (!mounted || !saved) return;
            try { setDailyAyaPrefs({ ...DEFAULT_DAILY_AYA_PREFS, ...JSON.parse(saved) }); } catch {
                AsyncStorage.removeItem(DAILY_AYA_NOTIF_KEY).catch(() => {});
            }
        }).catch(() => { });

        // Load Friday Surah al-Kahf reminder pref
        AsyncStorage.getItem(FRIDAY_KAHF_NOTIF_KEY).then(saved => {
            if (!mounted || !saved) return;
            try { setFridayKahfPrefs({ ...DEFAULT_FRIDAY_KAHF_PREFS, ...JSON.parse(saved) }); } catch {
                AsyncStorage.removeItem(FRIDAY_KAHF_NOTIF_KEY).catch(() => {});
            }
        }).catch(() => { });

        // Location + prayer loading
        (async () => {
            // Check for a manually-picked city first — if the user previously chose
            // one (e.g. after declining GPS), respect that instead of asking again.
            let manualCity: { name: string; country: string; iso: string; lat: number; lng: number } | null = null;
            try {
                const saved = await AsyncStorage.getItem(MANUAL_LOCATION_KEY);
                if (saved) manualCity = JSON.parse(saved);
            } catch {}

            let latitude: number;
            let longitude: number;
            let isoCode: string = '';

            if (manualCity) {
                latitude = manualCity.lat;
                longitude = manualCity.lng;
                isoCode = manualCity.iso;
                if (mounted) {
                    setLocationName(manualCity.name);
                    setUsingManualLocation(true);
                }
            } else {
                const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
                if (!mounted) return;

                if (locationStatus !== 'granted') {
                    // Non-blocking: fall back to Makkah and let user pick a city manually.
                    // Previously this rendered a full-screen "Location Required" page that
                    // blocked the entire app — users couldn't reach the Quran/Tasbih/etc.
                    if (mounted) {
                        setLocationName('Makkah');
                        setUsingManualLocation(true);
                        // Auto-open the picker once so user knows they can change it
                        setTimeout(() => { if (mounted) setShowCityPicker(true); }, 600);
                    }
                    latitude = 21.4225;
                    longitude = 39.8262;
                    isoCode = 'SA';
                } else {
                    let location;
                    try {
                        location = await Location.getCurrentPositionAsync({});
                    } catch {
                        location = { coords: { latitude: 21.4225, longitude: 39.8262 } };
                    }
                    if (!mounted) return;
                    latitude = location.coords.latitude;
                    longitude = location.coords.longitude;

                    try {
                        const geo = await reverseGeocode(latitude, longitude);
                        if (mounted) setLocationName(geo.locality || 'Locating...');
                        isoCode = geo.countryCode;
                    } catch {
                        if (mounted) setLocationName(latitude === 21.4225 ? 'Makkah' : 'Locating...');
                    }
                }
            }

            // Store location for later (settings change re-fetch)
            coordsRef.current = { lat: latitude, lng: longitude };
            autoMethodRef.current = COUNTRY_METHODS[isoCode] ?? DEFAULT_METHOD;

            // Read user-saved settings (overrides auto)
            let effectiveMethod = autoMethodRef.current.method;
            let effectiveSchool = autoMethodRef.current.school;
            try {
                const saved = await AsyncStorage.getItem(PRAYER_SETTINGS_KEY);
                if (mounted && saved) {
                    const s: { method: number; school: number } = JSON.parse(saved);
                    setPrayerSettings(s);
                    setDraftMethod(s.method);
                    setDraftSchool(s.school);
                    if (s.method !== -1) {
                        effectiveMethod = s.method;
                        effectiveSchool = s.school;
                    }
                }
            } catch { }

            if (mounted) await loadPrayers(latitude, longitude, effectiveMethod, effectiveSchool);
        })();

        return () => {
            mounted = false;
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, []);

    // ── Apply settings: save + re-fetch prayer times ───────────────────────────
    const applyPrayerSettings = async () => {
        const settings = { method: draftMethod, school: draftSchool };
        try { await AsyncStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(settings)); } catch { }
        setPrayerSettings(settings);
        setShowPrayerSettings(false);

        if (!coordsRef.current) return;
        const { lat, lng } = coordsRef.current;
        const effectiveMethod = draftMethod === -1 ? autoMethodRef.current.method : draftMethod;
        const effectiveSchool = draftMethod === -1 ? autoMethodRef.current.school : draftSchool;
        loadPrayers(lat, lng, effectiveMethod, effectiveSchool);
    };

    const currentNotifLang = (): NotifLang =>
        (language as NotifLang) in NOTIF_UI ? (language as NotifLang) : 'english';

    const toggleNotif = async (id: string) => {
        const newPrefs = { ...notifPrefs, [id]: !notifPrefs[id] };
        setNotifPrefs(newPrefs);
        try { await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(newPrefs)); } catch { }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') { setNotifPermDenied(true); return; }
        setNotifPermDenied(false);
        await schedulePrayerNotifications(prayers, newPrefs, tomorrowFajrRef.current, currentNotifLang());
    };

    // Master toggle — turns ALL prayers on or off in one tap
    const allRemindersOn = Object.values(notifPrefs).every(v => v);

    const toggleAllNotif = async () => {
        const newValue = !allRemindersOn;
        const newPrefs = Object.fromEntries(Object.keys(notifPrefs).map(k => [k, newValue]));
        setNotifPrefs(newPrefs);
        try { await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(newPrefs)); } catch { }

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') { setNotifPermDenied(true); return; }
        setNotifPermDenied(false);
        await schedulePrayerNotifications(prayers, newPrefs, tomorrowFajrRef.current, currentNotifLang());
    };

    const toggleDailyAyaNotif = async () => {
        const next = { ...dailyAyaPrefs, enabled: !dailyAyaPrefs.enabled };
        setDailyAyaPrefs(next);
        try { await AsyncStorage.setItem(DAILY_AYA_NOTIF_KEY, JSON.stringify(next)); } catch { }
        if (next.enabled) {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') setNotifPermDenied(true);
            else setNotifPermDenied(false);
        }
        // Scheduling itself is driven by the effect that watches dailyAyaPrefs.
    };

    const formatDailyAyaTime = () => {
        const h = dailyAyaPrefs.hour % 12 || 12;
        const m = dailyAyaPrefs.minute.toString().padStart(2, '0');
        return `${h}:${m} ${dailyAyaPrefs.hour >= 12 ? 'PM' : 'AM'}`;
    };

    const toggleFridayKahfNotif = async () => {
        const next = { ...fridayKahfPrefs, enabled: !fridayKahfPrefs.enabled };
        setFridayKahfPrefs(next);
        try { await AsyncStorage.setItem(FRIDAY_KAHF_NOTIF_KEY, JSON.stringify(next)); } catch { }
        if (next.enabled) {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') setNotifPermDenied(true);
            else setNotifPermDenied(false);
        }
        // Scheduling driven by the effect that watches fridayKahfPrefs.
    };

    const formatFridayKahfTime = () => {
        const h = fridayKahfPrefs.hour % 12 || 12;
        const m = fridayKahfPrefs.minute.toString().padStart(2, '0');
        return `Friday ${h}:${m} ${fridayKahfPrefs.hour >= 12 ? 'PM' : 'AM'}`;
    };

    // Apply a city from the picker — persists to AsyncStorage and reloads prayers
    // so the user gets accurate times for the selected location immediately.
    const pickCity = async (city: typeof CITY_PRESETS[number]) => {
        setLocationName(city.name);
        setUsingManualLocation(true);
        coordsRef.current = { lat: city.lat, lng: city.lng };
        autoMethodRef.current = COUNTRY_METHODS[city.iso] ?? DEFAULT_METHOD;
        try { await AsyncStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(city)); } catch {}
        setShowCityPicker(false);
        setCitySearchQuery('');
        const effectiveMethod = prayerSettings.method === -1 ? autoMethodRef.current.method : prayerSettings.method;
        const effectiveSchool = prayerSettings.method === -1 ? autoMethodRef.current.school : prayerSettings.school;
        await loadPrayers(city.lat, city.lng, effectiveMethod, effectiveSchool);
    };

    // Switch back to using GPS (clears the manual override)
    const useDeviceLocation = async () => {
        try { await AsyncStorage.removeItem(MANUAL_LOCATION_KEY); } catch {}
        setUsingManualLocation(false);
        setShowCityPicker(false);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Enable location access in Settings to use your current location.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]);
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;
            try {
                const geo = await reverseGeocode(latitude, longitude);
                setLocationName(geo.locality || 'Locating...');
                autoMethodRef.current = COUNTRY_METHODS[geo.countryCode] ?? DEFAULT_METHOD;
            } catch {
                setLocationName('Locating...');
            }
            coordsRef.current = { lat: latitude, lng: longitude };
            const effectiveMethod = prayerSettings.method === -1 ? autoMethodRef.current.method : prayerSettings.method;
            const effectiveSchool = prayerSettings.method === -1 ? autoMethodRef.current.school : prayerSettings.school;
            await loadPrayers(latitude, longitude, effectiveMethod, effectiveSchool);
        } catch {
            Alert.alert('Location unavailable', 'Could not read your current location. Please pick a city manually.');
        }
    };

    const openPrayerSettings = () => {
        // Sync draft to current saved settings before opening
        setDraftMethod(prayerSettings.method);
        setDraftSchool(prayerSettings.school);
        setShowPrayerSettings(true);
    };

    // ── SVG ring ──────────────────────────────────────────────────────────────
    const animatedScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
    const animatedOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (fillPercentage * circumference);

    if (loading) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    // Note: the previous "Location Access Required" full-screen block was removed (#4).
    // Denied permission now silently falls back to a default city (Makkah) and the user
    // can change it via the location pill / city picker without ever leaving the app.

    const currentMethodName = prayerSettings.method === -1
        ? `Auto · ${CALC_METHODS.find(m => m.id === autoMethodRef.current.method)?.name ?? 'MWL'}`
        : CALC_METHODS.find(m => m.id === prayerSettings.method)?.name ?? 'Custom';

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.bg }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.profileAvatar, { backgroundColor: theme.accentLight }]}>
                        <Feather name="user" size={24} color={envGradient[0]} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Falah</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{greeting}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => router.push('/(tabs)/discover/ask' as any)}
                        accessibilityRole="button"
                        accessibilityLabel="Ask AiDeen, Islamic search"
                    >
                        <Feather name="search" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconBtn, { marginLeft: 8 }]}
                        onPress={() => setShowNotifModal(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Adhan notification preferences"
                    >
                        <Feather name="bell" size={20} color={theme.textPrimary} />
                        {Object.values(notifPrefs).some(v => v) && <View style={[styles.notificationDot, { borderColor: theme.bg }]} />}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Now-playing pill (#18) — visible only when Quran audio is active.
                    Tap to jump back to the surah reader. The mini player at the bottom
                    of the tab bar showed this info but was easy to miss. */}
                {audioState.isVisible && audioState.sourceCategory === 'quran' && audioState.sourceId != null && (
                    <TouchableOpacity
                        style={[styles.nowPlayingPill, { backgroundColor: theme.bgCard, borderColor: theme.gold }]}
                        onPress={() => router.push(`/(tabs)/quran/${audioState.sourceId}` as any)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`Now playing ${audioState.title || 'Quran'}, tap to open reader`}
                    >
                        <Feather
                            name={audioState.isPlaying ? 'volume-2' : 'pause'}
                            size={14}
                            color={theme.gold}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.nowPlayingLabel, { color: theme.textTertiary }]} numberOfLines={1}>
                            NOW PLAYING
                        </Text>
                        <Text style={[styles.nowPlayingTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                            {audioState.title || 'Quran'}
                        </Text>
                        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* Prayer Hero */}
                <View style={styles.heroSection}>
                    <LinearGradient colors={envGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                        {/* Mosque watermark */}
                        <View style={styles.mosqueWatermarkContainer}>
                            <Animated.Image
                                source={MOSQUE_IMAGES[mosqueIndex].source}
                                style={[styles.mosqueWatermarkImage, { opacity: mosqueAnim }]}
                                resizeMode="cover"
                            />
                        </View>
                        <Feather name={prayers.find(p => p.id === currentPrayerId)?.icon || 'sun'} size={200} color="rgba(0,0,0,0.06)" style={styles.heroBgIcon} />
                        <View style={styles.heroContent}>
                            <View style={styles.heroTag}>
                                <Feather name={currentPrayerId !== 'none' ? 'sun' : 'clock'} size={14} color={themeTextColor} />
                                <Text style={[styles.heroTagText, { color: themeTextColor }]}>
                                    {currentPrayerId !== 'none' ? 'CURRENT PRAYER' : 'NEXT PRAYER'}
                                </Text>
                            </View>
                            <Text style={[styles.heroPrayerName, { color: themeTextColor }]}>
                                {currentPrayerId !== 'none' ? prayers.find(p => p.id === currentPrayerId)?.name : nextPrayerName}
                            </Text>
                            <Text style={[styles.heroPrayerTime, { color: themeTextColor }]}>
                                {currentPrayerId !== 'none'
                                    ? prayers.find(p => p.id === currentPrayerId)?.time
                                    : prayers.find(p => p.name === nextPrayerName)?.time ?? ''}
                            </Text>
                            <View style={[styles.heroNextBox, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                                <View style={styles.heroNextLeft}>
                                    <Feather name="clock" size={16} color={themeTextColor} />
                                    <Text style={[styles.heroNextText, { color: themeTextColor }]}>
                                        Next: {nextPrayerName} in <Text style={{ fontFamily: fonts.mono }}>{countdown}</Text>
                                    </Text>
                                </View>
                                {/* Per-next-prayer alert indicator (#6). The previous "REMIND ALL"
                                    master toggle was confusing — it said REMIND ALL even when the
                                    next prayer's own alert was on. Now reflects the next prayer
                                    specifically; tap toggles that prayer's alert only. Master
                                    enable/disable still available via the bell icon in the header. */}
                                {(() => {
                                    const nextPrayerId = (nextPrayerName || '').toLowerCase();
                                    const nextAlertOn = !!notifPrefs[nextPrayerId];
                                    return (
                                        <TouchableOpacity
                                            style={[styles.heroRemindBtn, {
                                                backgroundColor: nextAlertOn ? '#2ECC94' : '#142d1a',
                                            }]}
                                            onPress={() => {
                                                if (!nextPrayerId) return;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                toggleNotif(nextPrayerId);
                                            }}
                                            disabled={!nextPrayerId}
                                            accessibilityRole="switch"
                                            accessibilityLabel={`${nextPrayerName} adhan alert`}
                                            accessibilityState={{ checked: nextAlertOn, disabled: !nextPrayerId }}
                                        >
                                            <Feather
                                                name={nextAlertOn ? 'bell' : 'bell-off'}
                                                size={13}
                                                color="#FFFFFF"
                                                style={{ marginRight: 5 }}
                                            />
                                            <Text style={[styles.heroRemindBtnText, { color: '#FFFFFF' }]}>
                                                {nextAlertOn ? 'ALERT ON' : 'ALERT OFF'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })()}
                            </View>
                            {/* Mosque label */}
                            <Animated.Text style={[styles.mosqueLabel, { opacity: mosqueAnim }]}>
                                🕌 {MOSQUE_IMAGES[mosqueIndex].label}
                            </Animated.Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <View style={styles.quickActionsGrid}>
                        {QUICK_ACTIONS.map((tool, idx) => (
                            <View key={idx} style={styles.quickToolItem}>
                                <TouchableOpacity
                                    onPress={() => router.push(tool.route as any)}
                                    activeOpacity={0.82}
                                    accessibilityRole="button"
                                    accessibilityLabel={tool.title}
                                >
                                    <LinearGradient colors={tool.gradient} style={styles.quickToolIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                        <Feather name={tool.icon as any} size={26} color="#FFFFFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                                <Text style={[styles.quickToolText, { color: theme.textPrimary }]}>{tool.title}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Prayer Times List */}
                <View style={styles.prayersListContainer}>
                    <View style={styles.prayersListHeader}>
                        <Text style={[styles.prayerListTitle, { color: theme.textPrimary }]}>Prayer Times</Text>
                        {/* Location tag — tap to change city. Replaces the previous full-screen
                            "permission required" wall when GPS is denied (#4). */}
                        <TouchableOpacity
                            style={styles.locationTag}
                            onPress={() => setShowCityPicker(true)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Change city, currently ${locationName}`}
                        >
                            <Feather name="map-pin" size={12} color={envGradient[0]} style={{ marginRight: 4 }} />
                            <Text style={[styles.locationTagName, { color: envGradient[0] }]}>{locationName}</Text>
                            <Feather name="edit-2" size={11} color={envGradient[0]} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>

                    {/* Active calculation method pill */}
                    <TouchableOpacity
                        style={[styles.methodPill, { backgroundColor: theme.bgSecondary }]}
                        onPress={openPrayerSettings}
                        accessibilityRole="button"
                        accessibilityLabel={`Calculation method: ${currentMethodName}, tap to change`}
                    >
                        <Feather name="sliders" size={11} color={theme.textSecondary} />
                        <Text style={[styles.methodPillText, { color: theme.textSecondary }]}>{currentMethodName}</Text>
                        <Feather name="chevron-right" size={11} color={theme.textTertiary} />
                    </TouchableOpacity>

                    <View style={styles.prayersList}>
                        {prayers.map((prayer) => {
                            const isActive = prayer.id === currentPrayerId;
                            // When no prayer window is active, highlight the upcoming prayer
                            const isNextUp = currentPrayerId === 'none' && prayer.isNext;
                            return (
                                <View
                                    key={prayer.name}
                                    style={[
                                        styles.prayerListItem,
                                        { backgroundColor: theme.bgCard, borderColor: theme.border },
                                        isActive && [styles.prayerListItemActive, { borderColor: envGradient[0], backgroundColor: 'rgba(244, 209, 37, 0.12)' }],
                                        isNextUp && [styles.prayerListItemActive, { borderColor: theme.accent + '90', backgroundColor: theme.accentLight }],
                                    ]}
                                >
                                    <View style={styles.prayerListLeft}>
                                        <Feather name={prayer.icon as any} size={20} color={isActive ? envGradient[0] : isNextUp ? theme.accent : theme.textTertiary} />
                                        <Text style={[styles.prayerListName, { color: theme.textPrimary }, (isActive || isNextUp) && { color: theme.textPrimary, fontWeight: 'bold' }]}>
                                            {prayer.name}
                                        </Text>
                                    </View>
                                    <View style={styles.prayerListRight}>
                                        <Text style={[styles.prayerListTime, { color: theme.textSecondary }, (isActive || isNextUp) && { color: theme.textPrimary, fontWeight: 'bold' }]}>
                                            {prayer.time}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                toggleNotif(prayer.id);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            style={styles.bellToggleBtn}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            accessibilityRole="switch"
                                            accessibilityLabel={`${prayer.name} adhan alert`}
                                            accessibilityState={{ checked: !!notifPrefs[prayer.id] }}
                                        >
                                            <Feather
                                                name={notifPrefs[prayer.id] ? 'bell' : 'bell-off'}
                                                size={16}
                                                color={
                                                    notifPrefs[prayer.id]
                                                        ? (isActive ? envGradient[0] : isNextUp ? theme.accent : theme.gold)
                                                        : theme.textTertiary
                                                }
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Verse of the Day */}
                {dayAya && (
                    <View style={styles.verseSection}>
                        <Text style={[styles.prayerListTitle, { color: theme.textPrimary }]}>Verse of the Day</Text>
                        <View style={[styles.verseCard, { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 }]}>
                            <Text style={[
                                styles.verseArabicText,
                                { color: theme.textPrimary, fontSize: 26 * theme.arabicScale, lineHeight: 46 * theme.arabicScale },
                            ]}>{dayAya.arabic}</Text>
                            <Text style={[styles.verseText, { color: theme.textSecondary }]}>"{dayAya.translation}"</Text>
                            <View style={[styles.verseFooter, { borderTopColor: theme.border }]}>
                                <Text style={[styles.verseRef, { color: theme.accent }]}>
                                    SURAH {dayAya.surahName.toUpperCase()} [{dayAya.surahNumber}:{dayAya.numberInSurah}]
                                </Text>
                                <View style={styles.verseActions}>
                                    <TouchableOpacity
                                        onPress={shareDayAya}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        style={{ marginRight: 16 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Share verse of the day"
                                    >
                                        <Feather name="share-2" size={18} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={toggleDayAyaBookmark}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={dayAyaBookmarked ? 'Remove bookmark' : 'Bookmark verse of the day'}
                                        accessibilityState={{ selected: dayAyaBookmarked }}
                                    >
                                        <Feather
                                            name="bookmark"
                                            size={18}
                                            color={dayAyaBookmarked ? theme.accent : theme.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ── Notification Settings Bottom Sheet ───────────────────────── */}
            <Modal
                visible={showNotifModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNotifModal(false)}
            >
                <View style={styles.sheetOverlay}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: theme.bgCard }]}>
                        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Notifications</Text>
                                <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>Prayer times and daily ayah</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowNotifModal(false)}
                                style={[styles.sheetCloseBtn, { backgroundColor: theme.bgSecondary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Close notification settings"
                            >
                                <Feather name="x" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        {[
                            { id: 'fajr',    name: 'Fajr',    icon: 'sunrise', time: prayers.find(p => p.id === 'fajr')?.time },
                            { id: 'dhuhr',   name: 'Dhuhr',   icon: 'sun',     time: prayers.find(p => p.id === 'dhuhr')?.time },
                            { id: 'asr',     name: 'Asr',     icon: 'cloud',   time: prayers.find(p => p.id === 'asr')?.time },
                            { id: 'maghrib', name: 'Maghrib', icon: 'sunset',  time: prayers.find(p => p.id === 'maghrib')?.time },
                            { id: 'isha',    name: 'Isha',    icon: 'moon',    time: prayers.find(p => p.id === 'isha')?.time },
                        ].map(p => (
                            <View key={p.id} style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                                <View style={[styles.notifIcon, { backgroundColor: notifPrefs[p.id] ? theme.accentLight : theme.bgSecondary }]}>
                                    <Feather name={p.icon as any} size={18} color={notifPrefs[p.id] ? theme.gold : theme.textTertiary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.notifPrayerName, { color: theme.textPrimary }]}>{p.name}</Text>
                                    {p.time && <Text style={[styles.notifPrayerTime, { color: theme.textSecondary }]}>{p.time}</Text>}
                                </View>
                                <Switch
                                    value={!!notifPrefs[p.id]}
                                    onValueChange={() => toggleNotif(p.id)}
                                    trackColor={{ false: theme.border, true: theme.gold }}
                                    thumbColor={'#FFFFFF'}
                                    ios_backgroundColor={theme.border}
                                />
                            </View>
                        ))}
                        <View style={[styles.notifRow, { borderBottomColor: theme.border, borderTopColor: theme.border, borderTopWidth: 1, marginTop: 8, paddingTop: 16 }]}>
                            <View style={[styles.notifIcon, { backgroundColor: dailyAyaPrefs.enabled ? theme.accentLight : theme.bgSecondary }]}>
                                <Feather name="book-open" size={18} color={dailyAyaPrefs.enabled ? theme.gold : theme.textTertiary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.notifPrayerName, { color: theme.textPrimary }]}>Daily Ayah</Text>
                                <Text style={[styles.notifPrayerTime, { color: theme.textSecondary }]}>{formatDailyAyaTime()}</Text>
                            </View>
                            <Switch
                                value={dailyAyaPrefs.enabled}
                                onValueChange={toggleDailyAyaNotif}
                                trackColor={{ false: theme.border, true: theme.gold }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={theme.border}
                            />
                        </View>
                        <View style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                            <View style={[styles.notifIcon, { backgroundColor: fridayKahfPrefs.enabled ? theme.accentLight : theme.bgSecondary }]}>
                                <Feather name="star" size={18} color={fridayKahfPrefs.enabled ? theme.gold : theme.textTertiary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.notifPrayerName, { color: theme.textPrimary }]}>Friday Surah al-Kahf</Text>
                                <Text style={[styles.notifPrayerTime, { color: theme.textSecondary }]}>{formatFridayKahfTime()}</Text>
                            </View>
                            <Switch
                                value={fridayKahfPrefs.enabled}
                                onValueChange={toggleFridayKahfNotif}
                                trackColor={{ false: theme.border, true: theme.gold }}
                                thumbColor={'#FFFFFF'}
                                ios_backgroundColor={theme.border}
                            />
                        </View>
                        {notifPermDenied ? (
                            <TouchableOpacity
                                style={[styles.notifFooter, { backgroundColor: theme.accentLight, borderRadius: 10, padding: 10 }]}
                                onPress={() => Linking.openSettings()}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Open settings to enable notifications"
                            >
                                <Feather name="alert-circle" size={13} color={theme.gold} />
                                <Text style={[styles.notifFooterText, { color: theme.gold }]}>Permission denied — tap to open Settings and enable notifications.</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.notifFooter}>
                                <Feather name="info" size={13} color={theme.textTertiary} />
                                <Text style={[styles.notifFooterText, { color: theme.textTertiary }]}>Notifications require device permission to be granted.</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Prayer Settings Bottom Sheet ──────────────────────────────── */}
            <Modal
                visible={showPrayerSettings}
                transparent
                animationType="slide"
                onRequestClose={applyPrayerSettings}
            >
                <View style={styles.sheetOverlay}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: theme.bgCard }]}>
                        {/* Handle */}
                        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

                        {/* Header — closing the sheet (X / Android back) auto-saves the draft (#8) */}
                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Prayer Time Settings</Text>
                                <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>Tap × to save and close</Text>
                            </View>
                            <TouchableOpacity
                                onPress={applyPrayerSettings}
                                style={[styles.sheetCloseBtn, { backgroundColor: theme.bgSecondary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Save and close prayer settings"
                            >
                                <Feather name="x" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Calculation Method */}
                        <Text style={[styles.sheetSectionLabel, { color: theme.textSecondary }]}>CALCULATION METHOD</Text>
                        <ScrollView style={styles.methodScrollList} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                            {CALC_METHODS.map(m => {
                                const isSelected = draftMethod === m.id;
                                return (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[
                                            styles.methodRow,
                                            { backgroundColor: theme.bgSecondary },
                                            isSelected && [styles.methodRowActive, { backgroundColor: theme.accentLight, borderColor: theme.gold }]
                                        ]}
                                        onPress={() => setDraftMethod(m.id)}
                                        activeOpacity={0.7}
                                        accessibilityRole="radio"
                                        accessibilityLabel={`${m.name}, ${m.region}`}
                                        accessibilityState={{ selected: isSelected, checked: isSelected }}
                                    >
                                        <View style={[styles.methodRadio, { borderColor: theme.border }, isSelected && [styles.methodRadioActive, { borderColor: theme.gold }]]}>
                                            {isSelected && <View style={[styles.methodRadioDot, { backgroundColor: theme.gold }]} />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.methodName, { color: theme.textSecondary }, isSelected && { color: theme.textPrimary, fontWeight: '700' }]}>
                                                {m.name}
                                            </Text>
                                            <Text style={[styles.methodRegion, { color: theme.textTertiary }]}>{m.region}</Text>
                                        </View>
                                        {isSelected && <Feather name="check" size={16} color={theme.gold} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Asr Juristic Method (only when a specific method is chosen) */}
                        {draftMethod !== -1 && (
                            <View>
                                <Text style={[styles.sheetSectionLabel, { marginTop: 16, color: theme.textSecondary }]}>ASR CALCULATION</Text>
                                <View style={styles.asrToggleContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.asrOption,
                                            { backgroundColor: theme.bgSecondary },
                                            draftSchool === 0 && [styles.asrOptionActive, { backgroundColor: theme.accentLight, borderColor: theme.gold }]
                                        ]}
                                        onPress={() => setDraftSchool(0)}
                                        accessibilityRole="radio"
                                        accessibilityLabel="Asr standard, Shafi'i Maliki Hanbali"
                                        accessibilityState={{ selected: draftSchool === 0, checked: draftSchool === 0 }}
                                    >
                                        <Text style={[styles.asrOptionTitle, { color: theme.textSecondary }, draftSchool === 0 && [styles.asrOptionTitleActive, { color: theme.textPrimary }]]}>Standard</Text>
                                        <Text style={[styles.asrOptionSub, { color: theme.textTertiary }]}>Shafi'i · Maliki · Hanbali</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.asrOption,
                                            { backgroundColor: theme.bgSecondary },
                                            draftSchool === 1 && [styles.asrOptionActive, { backgroundColor: theme.accentLight, borderColor: theme.gold }]
                                        ]}
                                        onPress={() => setDraftSchool(1)}
                                        accessibilityRole="radio"
                                        accessibilityLabel="Asr Hanafi"
                                        accessibilityState={{ selected: draftSchool === 1, checked: draftSchool === 1 }}
                                    >
                                        <Text style={[styles.asrOptionTitle, { color: theme.textSecondary }, draftSchool === 1 && [styles.asrOptionTitleActive, { color: theme.textPrimary }]]}>Hanafi</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* "Apply Settings" button removed — × close + Android back already save (#8) */}
                    </View>
                </View>
            </Modal>

            {/* ── City Picker Bottom Sheet (#4) ────────────────────────────── */}
            <Modal
                visible={showCityPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCityPicker(false)}
            >
                <View style={styles.sheetOverlay}>
                    <View style={[styles.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: theme.bgCard, maxHeight: '85%' }]}>
                        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
                        <View style={styles.sheetHeaderRow}>
                            <View>
                                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Choose City</Text>
                                <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
                                    {usingManualLocation ? 'Currently using a manual location' : 'Currently using your device location'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowCityPicker(false)}
                                style={[styles.sheetCloseBtn, { backgroundColor: theme.bgSecondary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Close city picker"
                            >
                                <Feather name="x" size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.citySearchBox, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                            <Feather name="search" size={16} color={theme.textSecondary} />
                            <TextInput
                                style={[styles.citySearchInput, { color: theme.textPrimary }]}
                                placeholder="Search city…"
                                placeholderTextColor={theme.textTertiary}
                                value={citySearchQuery}
                                onChangeText={setCitySearchQuery}
                            />
                            {citySearchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setCitySearchQuery('')}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Clear search"
                                >
                                    <Feather name="x-circle" size={16} color={theme.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Use device location */}
                        <TouchableOpacity
                            style={[styles.cityRow, { backgroundColor: theme.accentLight, borderColor: theme.gold }]}
                            onPress={useDeviceLocation}
                            accessibilityRole="button"
                            accessibilityLabel="Use my current location"
                            accessibilityState={{ selected: !usingManualLocation }}
                        >
                            <Feather name="navigation" size={18} color={theme.gold} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cityName, { color: theme.textPrimary, fontWeight: '700' }]}>Use My Current Location</Text>
                                <Text style={[styles.cityCountry, { color: theme.textSecondary }]}>Requires location permission</Text>
                            </View>
                            {!usingManualLocation && <Feather name="check" size={18} color={theme.gold} />}
                        </TouchableOpacity>

                        {/* City list */}
                        <ScrollView style={{ maxHeight: 380 }} nestedScrollEnabled>
                            {CITY_PRESETS
                                .filter(c => {
                                    if (!citySearchQuery.trim()) return true;
                                    const q = citySearchQuery.trim().toLowerCase();
                                    return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
                                })
                                .map(c => {
                                    const isSelected = usingManualLocation && locationName === c.name;
                                    return (
                                        <TouchableOpacity
                                            key={`${c.name}-${c.iso}`}
                                            style={[
                                                styles.cityRow,
                                                { backgroundColor: theme.bgSecondary },
                                                isSelected && { backgroundColor: theme.accentLight, borderColor: theme.gold },
                                            ]}
                                            onPress={() => pickCity(c)}
                                            activeOpacity={0.75}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${c.name}, ${c.country}`}
                                            accessibilityState={{ selected: isSelected }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.cityName, { color: theme.textPrimary }]}>{c.name}</Text>
                                                <Text style={[styles.cityCountry, { color: theme.textSecondary }]}>{c.country}</Text>
                                            </View>
                                            {isSelected && <Feather name="check" size={18} color={theme.gold} />}
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16, zIndex: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    // Brand mark — serif italic ("Falah.") matches the design mastplate
    headerTitle: { fontSize: 26, fontFamily: fonts.serifBold, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontFamily: fonts.bodyMedium },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    notificationDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53E3E', borderWidth: 1 },
    nowPlayingPill: {
        marginHorizontal: 16, marginBottom: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 14, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    nowPlayingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginRight: 4 },
    nowPlayingTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
    citySearchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 12, borderWidth: 1, marginBottom: 12,
    },
    citySearchInput: { flex: 1, fontSize: 14, padding: 0 },
    cityRow: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderRadius: 12, marginBottom: 8,
        borderWidth: 1, borderColor: 'transparent',
    },
    cityName: { fontSize: 15, fontWeight: '600' },
    cityCountry: { fontSize: 12, marginTop: 2 },
    notifRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
    notifIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    notifPrayerName: { fontSize: 15, fontWeight: '700' },
    notifPrayerTime: { fontSize: 12, marginTop: 1 },
    notifFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 4 },
    notifFooterText: { flex: 1, fontSize: 11, lineHeight: 16 },
    scrollContent: { flexGrow: 1, paddingBottom: 100 },
    heroSection: { paddingHorizontal: 16, paddingTop: 8 },
    heroCard: { borderRadius: 24, padding: 24, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
    mosqueWatermarkContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18, borderRadius: 24, overflow: 'hidden' },
    mosqueWatermarkImage: { width: '100%', height: '100%' },
    mosqueLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 14, letterSpacing: 0.3 },
    heroBgIcon: { position: 'absolute', top: -40, right: -40 },
    heroContent: { position: 'relative', zIndex: 2 },
    heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    heroTagText: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
    // Prayer hero — serif italic per the Falah design ("Maghrib" / "Fajr" etc.)
    heroPrayerName: { fontSize: 48, fontFamily: fonts.serif, letterSpacing: -0.5, marginBottom: 4 },
    // Prayer time in mono for that tactile digital-clock feel
    heroPrayerTime: { fontSize: 18, fontFamily: fonts.mono, marginBottom: 32 },
    heroNextBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, paddingLeft: 16, borderRadius: 30 },
    heroNextLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
    heroNextText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
    heroRemindBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, flexShrink: 0, flexDirection: 'row', alignItems: 'center' },
    heroRemindBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    quickActionsContainer: { marginTop: 24, paddingHorizontal: 16 },
    quickActionsGrid: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    quickToolItem: { alignItems: 'center', gap: 10 },
    quickToolIconBox: {
        width: 76, height: 76, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    },
    quickToolIconBg: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quickToolText: { fontSize: 13, fontWeight: '700' },
    prayersListContainer: { marginTop: 32, paddingHorizontal: 16 },
    prayersListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    prayerListTitle: { fontSize: 18, fontWeight: 'bold' },
    locationTag: { flexDirection: 'row', alignItems: 'center' },
    locationTagName: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    methodPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, marginBottom: 14,
    },
    methodPillText: { fontSize: 11, fontWeight: '600' },
    prayersList: { gap: 12 },
    prayerListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
    prayerListItemActive: { borderWidth: 2 },
    prayerListLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    prayerListName: { fontSize: 16, fontWeight: '600' },
    prayerListRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    prayerListTime: { fontSize: 15, fontWeight: '500' },
    bellToggleBtn: { padding: 2 },
    verseSection: { marginTop: 32, paddingHorizontal: 16 },
    verseCard: { padding: 24, borderRadius: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    verseArabicText: { fontSize: 26, lineHeight: 46, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif', marginBottom: 20 },
    verseText: { fontSize: 16, fontWeight: '400', lineHeight: 26, fontStyle: 'italic', marginBottom: 24 },
    verseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 16 },
    verseRef: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    verseActions: { flexDirection: 'row', alignItems: 'center' },
    // ── Prayer Settings Sheet ─────────────────────────────────────────────────
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, maxHeight: '85%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    sheetTitle: { fontSize: 18, fontWeight: '700' },
    sheetSubtitle: { fontSize: 12, marginTop: 2 },
    sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    sheetSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
    methodScrollList: { maxHeight: 280, marginBottom: 4 },
    methodRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, marginBottom: 4 },
    methodRowActive: { borderWidth: 1.5 },
    methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    methodRadioActive: {},
    methodRadioDot: { width: 10, height: 10, borderRadius: 5 },
    methodName: { fontSize: 14, fontWeight: '500' },
    methodRegion: { fontSize: 11, marginTop: 1 },
    asrToggleContainer: { flexDirection: 'row', gap: 10 },
    asrOption: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center' },
    asrOptionActive: { borderWidth: 1.5 },
    asrOptionTitle: { fontSize: 14, fontWeight: '600' },
    asrOptionTitleActive: {},
    asrOptionSub: { fontSize: 11, marginTop: 3, textAlign: 'center' },
    applyBtn: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    applyBtnText: { fontSize: 15, fontWeight: '700' },
});
