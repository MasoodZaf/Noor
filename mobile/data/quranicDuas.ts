/**
 * Authentic ("Mustanad") Quranic duas sourced from the in-house
 * Mustanad Duas document. Used by the /duas/quranic screens.
 *
 * Each dua carries Arabic (Uthmani), Latin transliteration, and an English
 * translation. Non-English UIs auto-translate the English via
 * useTranslatedTexts — Urdu translations are hand-supplied to bypass the
 * network call (matches the pattern in the SQLite-seeded duas table).
 */

import type { Language } from '../utils/language';

export interface QuranicDua {
    id: string;
    title: string;
    reference: string;        // e.g. "Surah Al-Baqarah · 2:201" or "Sunan Ibn Majah · 898"
    surah?: number;           // present for Quran duas; omitted for hadith duas
    ayahFrom?: number;
    ayahTo?: number;
    arabic: string;
    transliteration: string;
    translationEn: string;
    translationUr?: string;   // optional hand-curated Urdu
    use: string;              // suggested usage
}

export interface QuranicCategory {
    id: string;
    title: string;
    titleUr: string;
    subtitle: string;
    icon: 'sun' | 'moon' | 'shield' | 'heart' | 'gift' | 'book-open';
    accent: string;           // hex
    duas: QuranicDua[];
}

export const QURANIC_CATEGORIES: QuranicCategory[] = [
    {
        id: 'daily',
        title: 'Daily Duas',
        titleUr: 'روزانہ کی دعائیں',
        subtitle: 'Best for daily recitation',
        icon: 'sun',
        accent: '#D4A24C',
        duas: [
            {
                id: 'guidance',
                title: 'Dua for Guidance',
                reference: 'Surah Al-Fatihah · 1:6-7',
                surah: 1,
                ayahFrom: 6,
                ayahTo: 7,
                arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
                transliteration: "Ihdinas-siratal-mustaqeem. Siratal-lazeena an'amta 'alaihim ghairil-maghdubi 'alaihim walad-daalleen.",
                translationEn: 'Guide us to the straight path — the path of those upon whom You have bestowed favor, not of those who earned Your anger nor of those who went astray.',
                translationUr: 'ہمیں سیدھے راستے کی ہدایت دے۔ ان لوگوں کے راستے پر جن پر تو نے انعام فرمایا، نہ کہ ان پر جن پر غضب ہوا اور نہ گمراہوں کے راستے پر۔',
                use: 'Daily recitation, every Salah.',
            },
            {
                id: 'good-life',
                title: 'Dua for a Beneficial Life & Hereafter',
                reference: 'Surah Al-Baqarah · 2:201',
                surah: 2,
                ayahFrom: 201,
                arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
                transliteration: "Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina 'adhaban-naar.",
                translationEn: 'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
                translationUr: 'اے ہمارے رب! ہمیں دنیا میں بھی بھلائی عطا فرما اور آخرت میں بھی، اور ہمیں آگ کے عذاب سے بچا۔',
                use: 'The most comprehensive daily dua — excellent after Salah.',
            },
            {
                id: 'knowledge',
                title: 'Dua for Increase in Knowledge',
                reference: 'Surah Taha · 20:114',
                surah: 20,
                ayahFrom: 114,
                arabic: 'رَبِّ زِدْنِي عِلْمًا',
                transliteration: "Rabbi zidni 'ilma.",
                translationEn: 'My Lord, increase me in knowledge.',
                translationUr: 'اے میرے رب! میرے علم میں اضافہ فرما۔',
                use: 'Before study, meetings, learning, or teaching.',
            },
            {
                id: 'gratitude',
                title: 'Dua for Gratitude',
                reference: "Surah An-Naml · 27:19",
                surah: 27,
                ayahFrom: 19,
                arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ',
                transliteration: "Rabbi awzi'ni an ashkura ni'matakal-lati an'amta 'alayya wa 'ala walidayya wa an a'mala salihan tardah.",
                translationEn: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteousness that pleases You.',
                translationUr: 'اے میرے رب! مجھے توفیق دے کہ میں تیری اُس نعمت کا شکر ادا کروں جو تو نے مجھ پر اور میرے والدین پر کی، اور ایسے نیک عمل کروں جو تجھے پسند ہوں۔',
                use: 'Morning/evening recitation.',
            },
        ],
    },
    {
        id: 'salah',
        title: 'During Salah',
        titleUr: 'نماز میں',
        subtitle: 'Recited inside or after prayer',
        icon: 'book-open',
        accent: '#6B8E6B',
        duas: [
            {
                id: 'between-sujood',
                title: 'Dua Between Two Sujood (Sunnah)',
                reference: 'Sunan Ibn Majah · 898 · Abu Dawood · 850',
                arabic: 'رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي وَاعْفُ عَنِّي',
                transliteration: "Rabbighfirli, warhamni, wajburni, warfa'ni, warzuqni, wahdini, wa'afini, wa'fu 'anni.",
                translationEn: 'My Lord, forgive me; have mercy on me; cover my shortcomings; raise my rank; grant me sustenance; guide me; grant me well-being; and pardon me.',
                translationUr: 'اے میرے رب! مجھے بخش دے، مجھ پر رحم فرما، میری کمیوں کو پورا فرما، میرے درجات بلند فرما، مجھے رزق عطا فرما، مجھے ہدایت دے، مجھے عافیت عطا فرما، اور مجھے معاف فرما۔',
                use: 'Recite while sitting between the two prostrations (jalsah) in every Salah.',
            },
            {
                id: 'adam-dua',
                title: 'Dua of Repentance (Adam A.S.)',
                reference: "Surah Al-A'raf · 7:23",
                surah: 7,
                ayahFrom: 23,
                arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
                transliteration: 'Rabbana zalamna anfusana wa illam taghfir lana wa tarhamna lanakoonanna minal-khasireen.',
                translationEn: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.',
                translationUr: 'اے ہمارے رب! ہم نے اپنی جانوں پر ظلم کیا، اگر تو نے ہمیں نہ بخشا اور ہم پر رحم نہ کیا تو ہم خسارہ پانے والوں میں سے ہو جائیں گے۔',
                use: 'In sujood or after Salah — Adam (A.S.) recited this in repentance.',
            },
            {
                id: 'firmness',
                title: 'Dua for Firmness & Patience',
                reference: 'Surah Al-Baqarah · 2:250',
                surah: 2,
                ayahFrom: 250,
                arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ',
                transliteration: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana wansurna 'alal-qawmil-kafireen.",
                translationEn: 'Our Lord, pour upon us patience, make our feet firm, and grant us victory.',
                translationUr: 'اے ہمارے رب! ہم پر صبر اُنڈیل دے، ہمارے قدم جما دے، اور ہمیں نصرت عطا فرما۔',
                use: 'During hardships, stress, pressure, or fear.',
            },
            {
                id: 'acceptance',
                title: 'Dua for Acceptance of Worship',
                reference: 'Surah Al-Baqarah · 2:127',
                surah: 2,
                ayahFrom: 127,
                arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ',
                transliteration: "Rabbana taqabbal minna innaka Antas-Sami'ul-'Aleem.",
                translationEn: 'Our Lord, accept from us. Indeed, You are the All-Hearing, All-Knowing.',
                translationUr: 'اے ہمارے رب! ہم سے قبول فرما۔ بے شک تو ہی سننے والا، جاننے والا ہے۔',
                use: 'After Salah, Quran recitation, charity, or good deeds.',
            },
        ],
    },
    {
        id: 'hardship',
        title: 'Difficulties & Hardship',
        titleUr: 'مشکلات اور آزمائش',
        subtitle: 'For stress, fear, and trials',
        icon: 'heart',
        accent: '#A85A5A',
        duas: [
            {
                id: 'yunus',
                title: 'Dua of Yunus (A.S.)',
                reference: 'Surah Al-Anbiya · 21:87',
                surah: 21,
                ayahFrom: 87,
                arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
                transliteration: 'La ilaha illa Anta subhanaka inni kuntu minaz-zalimeen.',
                translationEn: 'There is no deity except You. Glory be to You. Indeed, I was among the wrongdoers.',
                translationUr: 'تیرے سوا کوئی معبود نہیں، تو پاک ہے، بے شک میں ہی ظالموں میں سے ہوں۔',
                use: 'One of the greatest duas during distress, anxiety, depression, or fear.',
            },
            {
                id: 'ease',
                title: 'Dua for Ease',
                reference: 'Surah Ash-Sharh · 94:5-6',
                surah: 94,
                ayahFrom: 5,
                ayahTo: 6,
                arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
                transliteration: "Fa inna ma'al-'usri yusra. Inna ma'al-'usri yusra.",
                translationEn: 'Indeed, with hardship comes ease. Indeed, with hardship comes ease.',
                translationUr: 'پس بے شک مشکل کے ساتھ آسانی ہے۔ بے شک مشکل کے ساتھ آسانی ہے۔',
                use: 'Recite during stress, business pressure, illness, or uncertainty.',
            },
            {
                id: 'reliance',
                title: 'Dua for Reliance Upon Allah',
                reference: 'Surah Aal-e-Imran · 3:173',
                surah: 3,
                ayahFrom: 173,
                arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
                transliteration: "Hasbunallahu wa ni'mal wakeel.",
                translationEn: 'Allah is sufficient for us, and He is the best disposer of affairs.',
                translationUr: 'ہمارے لیے اللہ کافی ہے، اور وہ بہترین کارساز ہے۔',
                use: 'Fear, enemies, uncertainty, legal or financial worries.',
            },
            {
                id: 'forgiveness-mistakes',
                title: 'Dua After Mistakes',
                reference: 'Surah Al-Baqarah · 2:286',
                surah: 2,
                ayahFrom: 286,
                arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا',
                transliteration: "Rabbana la tu'akhizna in naseena aw akhta'na.",
                translationEn: 'Our Lord, do not hold us accountable if we forget or make mistakes.',
                translationUr: 'اے ہمارے رب! اگر ہم بھول جائیں یا غلطی کر بیٹھیں تو ہمارا مؤاخذہ نہ فرما۔',
                use: 'After mistakes, emotional burden, or guilt.',
            },
        ],
    },
    {
        id: 'rizq',
        title: 'Rizq & Success',
        titleUr: 'رزق اور کامیابی',
        subtitle: 'For provision, family, and barakah',
        icon: 'gift',
        accent: '#B8843A',
        duas: [
            {
                id: 'halal-rizq',
                title: 'Dua for Halal Rizq',
                reference: 'Surah Al-Qasas · 28:24',
                surah: 28,
                ayahFrom: 24,
                arabic: 'رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
                transliteration: 'Rabbi inni lima anzalta ilayya min khairin faqeer.',
                translationEn: 'My Lord, indeed I am, for whatever good You would send down to me, in need.',
                translationUr: 'اے میرے رب! تو میری طرف جو بھلائی بھی نازل کرے، میں اس کا محتاج ہوں۔',
                use: 'For rizq, jobs, business opportunities.',
            },
            {
                id: 'family',
                title: 'Dua for Family & Righteous Children',
                reference: 'Surah Al-Furqan · 25:74',
                surah: 25,
                ayahFrom: 74,
                arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
                transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqeena imama.",
                translationEn: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous.',
                translationUr: 'اے ہمارے رب! ہمیں ہمارے بیویوں اور اولاد کی طرف سے آنکھوں کی ٹھنڈک عطا فرما، اور ہمیں متقیوں کا امام بنا۔',
                use: 'For family peace and righteous children.',
            },
        ],
    },
    {
        id: 'protection',
        title: 'Protection',
        titleUr: 'حفاظت',
        subtitle: 'Refuge from evil and harm',
        icon: 'shield',
        accent: '#5B7FA6',
        duas: [
            {
                id: 'evil',
                title: 'Protection from Evil',
                reference: "Surah Al-Mu'minun · 23:97-98",
                surah: 23,
                ayahFrom: 97,
                ayahTo: 98,
                arabic: 'رَبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ ۝ وَأَعُوذُ بِكَ رَبِّ أَنْ يَحْضُرُونِ',
                transliteration: "Rabbi a'udhu bika min hamazatish-shayateen. Wa a'udhu bika Rabbi an yahduroon.",
                translationEn: 'My Lord, I seek refuge in You from the incitements of devils, and I seek refuge in You, my Lord, lest they be present with me.',
                translationUr: 'اے میرے رب! میں شیطانوں کے وسوسوں سے تیری پناہ مانگتا ہوں، اور اے میرے رب! میں اس بات سے بھی تیری پناہ مانگتا ہوں کہ وہ میرے پاس آئیں۔',
                use: 'Protection from negative thoughts, evil influences, or fear.',
            },
            {
                id: 'ayat-kursi',
                title: 'Ayat-ul-Kursi',
                reference: 'Surah Al-Baqarah · 2:255',
                surah: 2,
                ayahFrom: 255,
                arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
                transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyoom. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard. Man dhalladhi yashfa'u 'indahu illa bi-idhnih. Ya'lamu ma bayna aydihim wa ma khalfahum. Wa la yuhitoona bishay'in min 'ilmihi illa bima sha'. Wasi'a kursiyyuhus-samawati wal-ard. Wa la ya'uduhu hifzuhuma. Wa Huwal-'Aliyyul-'Azeem.",
                translationEn: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
                use: 'After every Salah, before sleep, and for the protection of home and family.',
            },
            {
                id: 'last-two-baqarah',
                title: 'Last Two Verses of Al-Baqarah',
                reference: 'Surah Al-Baqarah · 2:285-286',
                surah: 2,
                ayahFrom: 285,
                ayahTo: 286,
                arabic: 'آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْ رُسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ',
                transliteration: "Amanar-Rasulu bima unzila ilayhi mir-Rabbihi wal-mu'minoon… Ghufranaka Rabbana wa ilaykal-maseer.",
                translationEn: 'The Messenger has believed in what was revealed to him from his Lord, and the believers… "Our Lord, we seek Your forgiveness, and to You is the destination."',
                use: 'Recite at night for protection and sufficiency.',
            },
        ],
    },
];

/** Section 6: recommended surahs for daily/weekly recitation. */
export interface RecommendedSurah {
    surah: number;
    name: string;
    arabicName: string;
    timing: string;       // e.g. "Morning & Evening", "Friday", "Before Sleep"
    note: string;
}

export const RECOMMENDED_SURAHS: RecommendedSurah[] = [
    { surah: 112, name: 'Al-Ikhlas',    arabicName: 'الإخلاص',   timing: 'Morning & Evening', note: 'Equal to one-third of the Quran.' },
    { surah: 113, name: 'Al-Falaq',     arabicName: 'الفلق',     timing: 'Morning & Evening', note: 'Protection from external harm.' },
    { surah: 114, name: 'An-Naas',      arabicName: 'الناس',     timing: 'Morning & Evening', note: 'Protection from inner whispers.' },
    { surah: 36,  name: 'Ya-Sin',       arabicName: 'يس',        timing: 'Daily blessings',   note: 'The heart of the Quran.' },
    { surah: 55,  name: 'Ar-Rahman',    arabicName: 'الرحمن',    timing: 'Daily blessings',   note: 'Mercy and creation.' },
    { surah: 56,  name: 'Al-Waqiah',    arabicName: 'الواقعة',   timing: 'Daily blessings',   note: 'Recited for rizq.' },
    { surah: 67,  name: 'Al-Mulk',      arabicName: 'الملك',     timing: 'Before sleep',      note: 'Protection in the grave.' },
    { surah: 18,  name: 'Al-Kahf',      arabicName: 'الكهف',     timing: 'Every Friday',      note: 'Light between two Fridays.' },
];

export function getCategory(id: string): QuranicCategory | undefined {
    return QURANIC_CATEGORIES.find(c => c.id === id);
}

/** Pick the best translation given the user's language. */
export function translationFor(dua: QuranicDua, language: Language): string {
    if (language === 'urdu' && dua.translationUr) return dua.translationUr;
    return dua.translationEn;
}
