// Centralized notification scheduling for Noor.
//
// Each screen previously owned its own schedule/cancel logic (prayer, daily ayah,
// Friday Kahf in app/(tabs)/index/index.tsx; sehri/iftar in
// app/(tabs)/discover/ramadan.tsx). They drifted: different permission checks,
// different Android channel handling, different language-fallback paths.
// Everything that schedules an OS notification now lives here.

import * as Notifications from 'expo-notifications';
import { Platform, type PlatformOSType } from 'react-native';
import moment from 'moment-hijri';
import type { SQLiteDatabase } from 'expo-sqlite';
import { sanitizeArabicText } from './arabic';
import { getDailyVerseForDate, nextFridayAt } from './hijriContent';
import { translationCol, type Language } from './language';

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotifLang = 'english' | 'urdu' | 'indonesian' | 'french' | 'bengali' | 'turkish';

export type DailyAyaPrefs = { enabled: boolean; hour: number; minute: number };
export type FridayKahfPrefs = { enabled: boolean; hour: number; minute: number };

// ─── Storage keys ─────────────────────────────────────────────────────────────
export const DAILY_AYA_NOTIF_KEY = '@noor/daily_aya_notif';
export const FRIDAY_KAHF_NOTIF_KEY = '@noor/friday_kahf_notif';
export const RAMADAN_NOTIF_PREF_KEY = '@noor/ramadan_notif';

export const DEFAULT_DAILY_AYA_PREFS: DailyAyaPrefs = { enabled: true, hour: 9, minute: 0 };
export const DEFAULT_FRIDAY_KAHF_PREFS: FridayKahfPrefs = { enabled: true, hour: 7, minute: 0 };

// ─── Notification identifiers ────────────────────────────────────────────────
// Stable IDs let us cancel/replace per-feature without clobbering other features.
export const PRAYER_NOTIF_IDS = {
    fajr:         'falah-prayer-fajr',
    dhuhr:        'falah-prayer-dhuhr',
    asr:          'falah-prayer-asr',
    maghrib:      'falah-prayer-maghrib',
    isha:         'falah-prayer-isha',
    fajrTomorrow: 'falah-prayer-fajr-tomorrow',
} as const;

// Pre-schedule 7 days forward so users still get alerts if they don't open the
// app for a few days. Each schedule call wipes stale entries first.
export const DAILY_AYA_NOTIF_IDS = Array.from({ length: 7 }, (_, i) => `noor-daily-aya-${i}`);
export const FRIDAY_KAHF_NOTIF_IDS = Array.from({ length: 4 }, (_, i) => `noor-friday-kahf-${i}`);

export const RAMADAN_NOTIF_IDS = {
    sehri: 'falah-ramadan-sehri',
    iftar: 'falah-ramadan-iftar',
} as const;

// ─── Per-language strings ────────────────────────────────────────────────────
const PRAYER_DISPLAY_NAMES: Record<NotifLang, Record<string, string>> = {
    english:    { fajr: 'Fajr',  dhuhr: 'Dhuhr',  asr: 'Asr',    maghrib: 'Maghrib', isha: 'Isha'   },
    urdu:       { fajr: 'فجر',   dhuhr: 'ظہر',    asr: 'عصر',    maghrib: 'مغرب',    isha: 'عشاء'   },
    indonesian: { fajr: 'Subuh', dhuhr: 'Zuhur',  asr: 'Asar',   maghrib: 'Magrib',  isha: 'Isya'   },
    french:     { fajr: 'Fajr',  dhuhr: 'Dhuhr',  asr: 'Asr',    maghrib: 'Maghrib', isha: 'Isha'   },
    bengali:    { fajr: 'ফজর',   dhuhr: 'যোহর',   asr: 'আসর',    maghrib: 'মাগরিব',  isha: 'এশা'    },
    turkish:    { fajr: 'Sabah', dhuhr: 'Öğle',   asr: 'İkindi', maghrib: 'Akşam',   isha: 'Yatsı'  },
};

const NOTIF_UI: Record<NotifLang, { title: string; body: string; fajrRise: string }> = {
    english:    { title: '🕌 Time for {name}',          body: 'It is time to pray {name}.',                    fajrRise: 'Rise for the dawn prayer.'              },
    urdu:       { title: '🕌 {name} کا وقت',            body: '{name} کی نماز کا وقت ہو گیا ہے۔',              fajrRise: 'فجر کی نماز کے لیے اٹھیں۔'              },
    indonesian: { title: '🕌 Waktu {name}',              body: 'Sudah waktunya shalat {name}.',                 fajrRise: 'Bangunlah untuk shalat Subuh.'           },
    french:     { title: "🕌 L'heure de {name}",         body: "Il est l'heure de prier {name}.",               fajrRise: "Levez-vous pour la prière de l'aube."   },
    bengali:    { title: '🕌 {name} এর সময়',            body: '{name} নামাজের সময় হয়েছে।',                    fajrRise: 'ফজরের নামাজের জন্য উঠুন।'              },
    turkish:    { title: '🕌 {name} Vakti',              body: '{name} namazı için vakit girdi.',                fajrRise: 'Sabah namazı için kalkın.'              },
};

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

const DAILY_AYA_TITLES: Record<string, string> = {
    english:    "📖 Today's Ayah",
    urdu:       '📖 آج کی آیت',
    indonesian: '📖 Ayat Hari Ini',
    french:     '📖 Verset du Jour',
    bengali:    '📖 আজকের আয়াত',
    turkish:    '📖 Günün Ayeti',
};

const FRIDAY_KAHF_STRINGS: Record<string, { title: string; body: string }> = {
    english:    { title: '🕌 Jumuʿah Mubarak',     body: 'It is Friday — recite Surah al-Kahf for blessings between this Friday and the next.' },
    urdu:       { title: '🕌 جمعہ مبارک',           body: 'آج جمعہ ہے — اس جمعہ سے اگلے جمعہ تک کی برکتوں کے لیے سورۃ الکہف پڑھیں۔' },
    indonesian: { title: '🕌 Jumʿah Mubarak',       body: 'Hari Jumat — bacalah Surah al-Kahfi untuk keberkahan hingga Jumat berikutnya.' },
    french:     { title: '🕌 Joumouʿah Moubarak',   body: "C'est vendredi — récitez Sourate al-Kahf pour les bénédictions jusqu'à vendredi prochain." },
    bengali:    { title: '🕌 জুমু’আহ মুবারক',         body: 'আজ শুক্রবার — পরবর্তী শুক্রবার পর্যন্ত বরকতের জন্য সূরা আল-কাহফ তিলাওয়াত করুন।' },
    turkish:    { title: '🕌 Cuma Mübarek',         body: 'Bugün Cuma — bu Cumadan diğerine kadar bereket için Kehf Suresi’ni okuyun.' },
};

const RAMADAN_STRINGS: Record<string, { sehriTitle: string; sehriBody: string; iftarTitle: string; iftarBody: string }> = {
    english:    { sehriTitle: '🌙 Sehri Time Ending',      sehriBody: 'Fajr is approaching. Stop eating and prepare for prayer.',         iftarTitle: '🌅 Iftar Time',          iftarBody: 'Allahu Akbar! It is time to break your fast. Bismillah.'         },
    urdu:       { sehriTitle: '🌙 سحری کا وقت ختم ہو رہا ہے', sehriBody: 'فجر قریب ہے۔ کھانا بند کریں اور نماز کی تیاری کریں۔',          iftarTitle: '🌅 افطار کا وقت',         iftarBody: 'اللہ اکبر! روزہ افطار کرنے کا وقت آ گیا ہے۔ بسم اللہ۔'            },
    indonesian: { sehriTitle: '🌙 Waktu Sahur Hampir Habis', sehriBody: 'Subuh hampir tiba. Berhenti makan dan bersiap untuk shalat.',      iftarTitle: '🌅 Waktu Berbuka',        iftarBody: 'Allahu Akbar! Waktunya berbuka puasa. Bismillah.'                  },
    french:     { sehriTitle: '🌙 Fin du Suhoor',           sehriBody: 'Le Fajr approche. Arrêtez de manger et préparez-vous à prier.',   iftarTitle: '🌅 Heure de l\'Iftar',    iftarBody: 'Allahu Akbar ! Il est temps de rompre le jeûne. Bismillah.'        },
    bengali:    { sehriTitle: '🌙 সেহরির সময় শেষ হচ্ছে',   sehriBody: 'ফজর আসছে। খাওয়া বন্ধ করুন এবং নামাজের প্রস্তুতি নিন।',        iftarTitle: '🌅 ইফতারের সময়',         iftarBody: 'আল্লাহু আকবর! রোজা ভাঙার সময় হয়েছে। বিসমিল্লাহ।'              },
    turkish:    { sehriTitle: '🌙 Sahur Vakti Bitiyor',      sehriBody: 'Sabah ezanı yaklaşıyor. Yemeği bırakın ve namaza hazırlanın.',    iftarTitle: '🌅 İftar Vakti',          iftarBody: 'Allahu Ekber! Orucunuzu açma vakti geldi. Bismillah.'              },
};

// ─── Pref sanitization ───────────────────────────────────────────────────────
// AsyncStorage is app-private on iOS/Android but JSON.parse can still yield
// garbage if a previous app version wrote a different shape. Coerce so that
// `setHours(NaN, …)` / "__proto__" can never reach the OS.
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function sanitizeDailyAyaPrefs(parsed: unknown): DailyAyaPrefs {
    const p = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    return {
        enabled: p.enabled !== false,
        hour:    clampInt(p.hour,   0, 23, DEFAULT_DAILY_AYA_PREFS.hour),
        minute:  clampInt(p.minute, 0, 59, DEFAULT_DAILY_AYA_PREFS.minute),
    };
}

export function sanitizeFridayKahfPrefs(parsed: unknown): FridayKahfPrefs {
    const p = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    return {
        enabled: p.enabled !== false,
        hour:    clampInt(p.hour,   0, 23, DEFAULT_FRIDAY_KAHF_PREFS.hour),
        minute:  clampInt(p.minute, 0, 59, DEFAULT_FRIDAY_KAHF_PREFS.minute),
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const androidChannel = (platform: PlatformOSType = Platform.OS) =>
    platform === 'android' ? { channelId: 'adhan' } : {};

// Clamp notification body length — system trays truncate anyway; keeping it
// bounded avoids spammy preview text and keeps prompt sources predictable.
const MAX_NOTIF_BODY = 240;
const clampBody = (s: string) => (s.length > MAX_NOTIF_BODY ? s.slice(0, MAX_NOTIF_BODY) : s);

async function hasPermission(): Promise<boolean> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    } catch {
        return false;
    }
}

const langOrEnglish = (lang: string): NotifLang =>
    (lang as NotifLang) in NOTIF_UI ? (lang as NotifLang) : 'english';

const getPrayerQuote = (prayerId: string, lang: NotifLang): string => {
    const langQuotes = PRAYER_QUOTES[lang] ?? PRAYER_QUOTES.english;
    const quotes = langQuotes[prayerId] ?? langQuotes.fajr;
    return quotes[Math.floor(Math.random() * quotes.length)];
};

const buildPrayerContent = (prayerId: string, lang: NotifLang) => {
    const ui = NOTIF_UI[lang] ?? NOTIF_UI.english;
    const name = (PRAYER_DISPLAY_NAMES[lang] ?? PRAYER_DISPLAY_NAMES.english)[prayerId] ?? prayerId;
    const quote = getPrayerQuote(prayerId, lang);
    return {
        title: ui.title.replace('{name}', name),
        body: clampBody(`${ui.body.replace('{name}', name)}\n\n${quote}`),
    };
};

const buildFajrRiseContent = (lang: NotifLang) => {
    const ui = NOTIF_UI[lang] ?? NOTIF_UI.english;
    const name = (PRAYER_DISPLAY_NAMES[lang] ?? PRAYER_DISPLAY_NAMES.english).fajr;
    const quote = getPrayerQuote('fajr', lang);
    return {
        title: ui.title.replace('{name}', name),
        body: clampBody(`${ui.fajrRise}\n\n${quote}`),
    };
};

// translationCol is imported from utils/language.ts — same function lived
// here as a private copy before consolidation.

// ─── Cancel helpers ──────────────────────────────────────────────────────────
async function cancelIds(ids: readonly string[]) {
    for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
}

export const cancelPrayerNotifications = () => cancelIds(Object.values(PRAYER_NOTIF_IDS));
export const cancelDailyAyaNotifications = () => cancelIds(DAILY_AYA_NOTIF_IDS);
export const cancelFridayKahfNotifications = () => cancelIds(FRIDAY_KAHF_NOTIF_IDS);
export const cancelRamadanNotifications = () => cancelIds(Object.values(RAMADAN_NOTIF_IDS));

// ─── Schedulers ──────────────────────────────────────────────────────────────

/**
 * Cancels all prayer-scoped notifications (by identifier) and reschedules them
 * with the given language. Safe to call whenever prayers, prefs, or language
 * change — does not touch Ramadan or Daily Ayah identifiers.
 */
export async function schedulePrayerNotifications(
    prayers: { id: string; date: Date }[],
    prefs: Record<string, boolean>,
    tomorrowFajr: Date | null,
    lang: string,
) {
    const notifLang = langOrEnglish(lang);
    await cancelPrayerNotifications();

    const nowMs = Date.now();
    const channel = androidChannel();

    for (const prayer of prayers) {
        if (!prefs[prayer.id]) continue;
        if (prayer.date.getTime() <= nowMs) continue;
        const identifier = (PRAYER_NOTIF_IDS as Record<string, string>)[prayer.id];
        if (!identifier) continue;
        const { title, body } = buildPrayerContent(prayer.id, notifLang);
        await Notifications.scheduleNotificationAsync({
            identifier,
            content: { title, body, sound: true, color: '#C9A84C', ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.date },
        }).catch(() => {});
    }

    if (prefs.fajr && tomorrowFajr && tomorrowFajr.getTime() > nowMs) {
        const { title, body } = buildFajrRiseContent(notifLang);
        await Notifications.scheduleNotificationAsync({
            identifier: PRAYER_NOTIF_IDS.fajrTomorrow,
            content: { title, body, sound: true, color: '#C9A84C', ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrowFajr },
        }).catch(() => {});
    }
}

/**
 * Pre-schedules the next 7 days of Daily Ayah notifications. Each fires at the
 * user-chosen hh:mm with content selected by Hijri month from `hijriContent`.
 * Skips entries with no available translation+arabic for the picked verse.
 */
export async function scheduleDailyAyaNotifications(
    db: SQLiteDatabase,
    hour: number,
    minute: number,
    lang: string,
) {
    if (!(await hasPermission())) return;
    await cancelDailyAyaNotifications();

    const baseTitle = DAILY_AYA_TITLES[lang] ?? DAILY_AYA_TITLES.english;
    const transCol = translationCol(lang as Language);
    const channel = androidChannel();
    const now = new Date();

    for (let offset = 0; offset < DAILY_AYA_NOTIF_IDS.length; offset++) {
        const fireAt = new Date(now);
        fireAt.setDate(fireAt.getDate() + offset);
        fireAt.setHours(hour, minute, 0, 0);
        if (fireAt.getTime() <= now.getTime()) continue;

        const { surah, ayah, monthName } = getDailyVerseForDate(fireAt);
        const row = await db.getFirstAsync(
            `SELECT a.surah_number, a.ayah_number, a.text_arabic, a.${transCol} AS translation, a.text_english, s.name_english
             FROM ayahs a JOIN surahs s ON s.number = a.surah_number
             WHERE a.surah_number = ? AND a.ayah_number = ?
             LIMIT 1`,
            [surah, ayah]
        ).catch(() => null) as { text_arabic?: string; translation?: string; text_english?: string; name_english?: string; surah_number?: number; ayah_number?: number } | null;
        if (!row) continue;

        const translation = (row.translation || row.text_english || '').trim();
        const arabic = sanitizeArabicText(row.text_arabic || '').trim();
        if (!translation && !arabic) continue;

        const title = monthName ? `${baseTitle} · ${monthName}` : baseTitle;
        const body = clampBody(`${arabic}\n\n${translation}\n\n— ${row.name_english} ${row.surah_number}:${row.ayah_number}`);

        await Notifications.scheduleNotificationAsync({
            identifier: DAILY_AYA_NOTIF_IDS[offset],
            content: { title, body, sound: true, color: '#C9A84C', ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
        }).catch(() => {});
    }
}

/**
 * Pre-schedules the next 4 Fridays at the user's chosen hh:mm. The Prophet ﷺ
 * encouraged reciting Surah al-Kahf on Fridays for blessings until the next.
 */
export async function scheduleFridayKahfNotifications(hour: number, minute: number, lang: string) {
    if (!(await hasPermission())) return;
    await cancelFridayKahfNotifications();

    const strings = FRIDAY_KAHF_STRINGS[lang] ?? FRIDAY_KAHF_STRINGS.english;
    const channel = androidChannel();

    let next = nextFridayAt(hour, minute);
    for (let i = 0; i < FRIDAY_KAHF_NOTIF_IDS.length; i++) {
        await Notifications.scheduleNotificationAsync({
            identifier: FRIDAY_KAHF_NOTIF_IDS[i],
            content: { title: strings.title, body: clampBody(strings.body), sound: true, color: '#C9A84C', ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
        }).catch(() => {});
        next = new Date(next);
        next.setDate(next.getDate() + 7);
    }
}

/**
 * Schedules sehri (10 min before Fajr) + iftar alerts for today. Only fires
 * during the Hijri month of Ramadan; outside Ramadan we still cancel any stale
 * IDs so users don't see leftover alerts from a prior month / install.
 */
export async function scheduleRamadanNotifications(
    sehriDate: Date,
    iftarDate: Date,
    lang: string,
    enabled: boolean,
) {
    if (!(await hasPermission())) return;
    await cancelRamadanNotifications();

    if (!enabled) return;
    // moment-hijri iMonth is 0-indexed, so Ramadan = 8.
    if (moment().iMonth() !== 8) return;

    const strings = RAMADAN_STRINGS[lang] ?? RAMADAN_STRINGS.english;
    const channel = androidChannel();
    const nowMs = Date.now();
    const sehriAlertAt = new Date(sehriDate.getTime() - 10 * 60 * 1000);

    if (sehriAlertAt.getTime() > nowMs) {
        await Notifications.scheduleNotificationAsync({
            identifier: RAMADAN_NOTIF_IDS.sehri,
            content: { title: strings.sehriTitle, body: clampBody(strings.sehriBody), sound: true, ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sehriAlertAt },
        }).catch(() => {});
    }
    if (iftarDate.getTime() > nowMs) {
        await Notifications.scheduleNotificationAsync({
            identifier: RAMADAN_NOTIF_IDS.iftar,
            content: { title: strings.iftarTitle, body: clampBody(strings.iftarBody), sound: true, ...channel },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: iftarDate },
        }).catch(() => {});
    }
}
