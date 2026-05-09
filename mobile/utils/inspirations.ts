// Daily Inspiration — curated authentic hadiths + Quranic verses with Arabic
// originals and translations for every supported app language.
// Picked deterministically by day-of-year so it changes daily and is stable
// per-day across reloads.

export type InspirationLang = 'english' | 'urdu' | 'indonesian' | 'french' | 'bengali' | 'turkish';

export interface Inspiration {
    type: 'hadith' | 'quran';
    arabic: string;
    source: string;
    translations: Record<InspirationLang, string>;
}

export const INSPIRATIONS: Inspiration[] = [
    {
        type: 'quran',
        arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
        source: 'Surah Ash-Sharh 94:6',
        translations: {
            english: 'Indeed, with hardship comes ease.',
            urdu: 'بے شک تنگی کے ساتھ آسانی ہے۔',
            indonesian: 'Sesungguhnya bersama kesulitan ada kemudahan.',
            french: 'En vérité, avec la difficulté il y a une facilité.',
            bengali: 'নিশ্চয়ই কষ্টের সঙ্গে স্বস্তি আছে।',
            turkish: 'Şüphesiz güçlükle beraber bir kolaylık vardır.',
        },
    },
    {
        type: 'hadith',
        arabic: 'خِيَارُكُمْ أَحَاسِنُكُمْ أَخْلَاقًا',
        source: 'Sahih al-Bukhari 3559',
        translations: {
            english: 'The best among you are those who have the best manners and character.',
            urdu: 'تم میں سب سے بہتر وہ ہیں جن کے اخلاق سب سے اچھے ہیں۔',
            indonesian: 'Sebaik-baik kalian adalah yang paling baik akhlaknya.',
            french: 'Les meilleurs d’entre vous sont ceux qui ont les meilleurs caractères.',
            bengali: 'তোমাদের মধ্যে সর্বোত্তম সে, যার চরিত্র সর্বোত্তম।',
            turkish: 'Sizin en hayırlınız, ahlakı en güzel olanınızdır.',
        },
    },
    {
        type: 'quran',
        arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
        source: 'Surah At-Talaq 65:2',
        translations: {
            english: 'And whoever fears Allah, He will make for him a way out.',
            urdu: 'اور جو اللہ سے ڈرتا ہے، اللہ اس کے لیے نکلنے کا راستہ بنا دیتا ہے۔',
            indonesian: 'Barangsiapa bertakwa kepada Allah, niscaya Dia akan mengadakan baginya jalan keluar.',
            french: 'Quiconque craint Allah, Il lui donnera une issue.',
            bengali: 'যে কেউ আল্লাহকে ভয় করে, আল্লাহ তার জন্য নিষ্কৃতির পথ করে দেন।',
            turkish: 'Kim Allah’tan korkarsa, Allah ona bir çıkış yolu yaratır.',
        },
    },
    {
        type: 'hadith',
        arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
        source: 'Sahih al-Bukhari 13',
        translations: {
            english: 'None of you truly believes until he loves for his brother what he loves for himself.',
            urdu: 'تم میں سے کوئی اس وقت تک مومن نہیں ہو سکتا جب تک کہ وہ اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے پسند کرتا ہے۔',
            indonesian: 'Tidaklah sempurna iman salah seorang di antara kalian hingga ia mencintai untuk saudaranya apa yang ia cintai untuk dirinya sendiri.',
            french: 'Aucun d’entre vous ne sera vraiment croyant tant qu’il n’aimera pas pour son frère ce qu’il aime pour lui-même.',
            bengali: 'তোমাদের কেউ ততক্ষণ পর্যন্ত পূর্ণ মুমিন হতে পারবে না, যতক্ষণ না সে তার ভাইয়ের জন্য তা পছন্দ করে যা সে নিজের জন্য পছন্দ করে।',
            turkish: 'Sizden biriniz, kendisi için sevdiğini kardeşi için de sevmedikçe (gerçek anlamda) iman etmiş olmaz.',
        },
    },
    {
        type: 'quran',
        arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
        source: "Surah Ar-Ra'd 13:28",
        translations: {
            english: 'Verily, in the remembrance of Allah do hearts find rest.',
            urdu: 'بے شک اللہ کے ذکر سے ہی دلوں کو سکون ملتا ہے۔',
            indonesian: 'Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.',
            french: 'C’est dans le rappel d’Allah que les cœurs trouvent leur quiétude.',
            bengali: 'জেনে রাখো, আল্লাহর স্মরণেই হৃদয় প্রশান্তি লাভ করে।',
            turkish: 'Bilesiniz ki, kalpler ancak Allah’ın zikriyle huzur bulur.',
        },
    },
    {
        type: 'hadith',
        arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ صَدَقَةٌ',
        source: 'Sunan al-Tirmidhi 1956',
        translations: {
            english: 'Smiling at your brother is charity.',
            urdu: 'اپنے بھائی کے سامنے مسکرانا صدقہ ہے۔',
            indonesian: 'Senyummu di hadapan saudaramu adalah sedekah.',
            french: 'Ton sourire envers ton frère est une aumône.',
            bengali: 'তোমার ভাইয়ের সামনে হাসা সদকা।',
            turkish: 'Kardeşinin yüzüne tebessüm etmen sadakadır.',
        },
    },
    {
        type: 'quran',
        arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
        source: 'Surah Al-Baqarah 2:286',
        translations: {
            english: 'Allah does not burden a soul beyond that it can bear.',
            urdu: 'اللہ کسی جان پر اس کی طاقت سے بڑھ کر بوجھ نہیں ڈالتا۔',
            indonesian: 'Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.',
            french: 'Allah n’impose à aucune âme une charge supérieure à sa capacité.',
            bengali: 'আল্লাহ কাউকেই তার সাধ্যের অতিরিক্ত দায়িত্ব দেন না।',
            turkish: 'Allah, hiç kimseye gücünün üstünde bir şey yüklemez.',
        },
    },
    {
        type: 'hadith',
        arabic: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّمَا الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الْغَضَبِ',
        source: 'Sahih al-Bukhari 6114',
        translations: {
            english: 'The strong is not the one who overcomes people by his strength, but the one who controls himself when angry.',
            urdu: 'طاقتور وہ نہیں جو لوگوں کو پچھاڑ دے، بلکہ طاقتور وہ ہے جو غصے کے وقت اپنے آپ پر قابو رکھے۔',
            indonesian: 'Orang yang kuat bukanlah yang menang dalam pergulatan, tetapi yang dapat menahan dirinya ketika marah.',
            french: 'Le fort n’est pas celui qui terrasse les autres, mais celui qui se domine lorsqu’il est en colère.',
            bengali: 'শক্তিশালী সে নয় যে কুস্তিতে অন্যকে পরাজিত করে, বরং শক্তিশালী সে যে রাগের সময় নিজেকে নিয়ন্ত্রণ করতে পারে।',
            turkish: 'Yiğit, güreşte rakibini yenen değildir; asıl yiğit, öfkelendiği zaman kendine hâkim olandır.',
        },
    },
    {
        type: 'quran',
        arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
        source: 'Surah Al-Baqarah 2:153',
        translations: {
            english: 'Indeed, Allah is with the patient.',
            urdu: 'بے شک اللہ صبر کرنے والوں کے ساتھ ہے۔',
            indonesian: 'Sesungguhnya Allah beserta orang-orang yang sabar.',
            french: 'En vérité, Allah est avec les patients.',
            bengali: 'নিশ্চয়ই আল্লাহ ধৈর্যশীলদের সঙ্গে আছেন।',
            turkish: 'Şüphesiz Allah, sabredenlerle beraberdir.',
        },
    },
    {
        type: 'hadith',
        arabic: 'مَنْ لَا يَرْحَمْ لَا يُرْحَمْ',
        source: 'Sahih al-Bukhari 5997',
        translations: {
            english: 'Whoever does not show mercy will not be shown mercy.',
            urdu: 'جو رحم نہیں کرتا، اس پر رحم نہیں کیا جاتا۔',
            indonesian: 'Barangsiapa tidak menyayangi (orang lain), maka ia tidak akan disayangi.',
            french: 'Celui qui n’est pas miséricordieux ne recevra pas de miséricorde.',
            bengali: 'যে দয়া করে না, তাকে দয়া করা হয় না।',
            turkish: 'Merhamet etmeyene merhamet edilmez.',
        },
    },
    {
        type: 'quran',
        arabic: 'وَوَجَدَكَ ضَالًّا فَهَدَىٰ',
        source: 'Surah Ad-Duha 93:7',
        translations: {
            english: 'And He found you lost and guided you.',
            urdu: 'اور اس نے تمہیں راہ سے بے خبر پایا تو رہنمائی فرمائی۔',
            indonesian: 'Dan Dia mendapatimu sebagai seorang yang bingung, lalu Dia memberikan petunjuk.',
            french: 'Il t’a trouvé égaré, et Il t’a guidé.',
            bengali: 'এবং তিনি তোমাকে পথহারা পেয়েছেন, অতঃপর পথ দেখিয়েছেন।',
            turkish: 'Seni yol bilmez bulup doğru yola iletmedi mi?',
        },
    },
    {
        type: 'hadith',
        arabic: 'إِنَّ اللَّهَ رَفِيقٌ يُحِبُّ الرِّفْقَ فِي الْأَمْرِ كُلِّهِ',
        source: 'Sahih al-Bukhari 6024',
        translations: {
            english: 'Allah is gentle and loves gentleness in all matters.',
            urdu: 'بے شک اللہ نرمی کرنے والا ہے، اور وہ ہر کام میں نرمی کو پسند کرتا ہے۔',
            indonesian: 'Sesungguhnya Allah Maha Lembut, Dia mencintai kelembutan dalam segala urusan.',
            french: 'Allah est doux et aime la douceur en toutes choses.',
            bengali: 'নিশ্চয়ই আল্লাহ কোমল, তিনি সকল বিষয়ে কোমলতা পছন্দ করেন।',
            turkish: 'Allah Refîk’tir (yumuşak davranandır), her işte yumuşaklığı sever.',
        },
    },
    {
        type: 'quran',
        arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
        source: 'Surah Al-Baqarah 2:152',
        translations: {
            english: 'So remember Me; I will remember you.',
            urdu: 'پس تم مجھے یاد کرو، میں تمہیں یاد کروں گا۔',
            indonesian: 'Maka ingatlah kepada-Ku, niscaya Aku ingat (pula) kepadamu.',
            french: 'Souvenez-vous de Moi, donc, Je Me souviendrai de vous.',
            bengali: 'অতএব তোমরা আমাকে স্মরণ করো, আমিও তোমাদেরকে স্মরণ করব।',
            turkish: 'Beni anın, ben de sizi anayım.',
        },
    },
    {
        type: 'hadith',
        arabic: 'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا، نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ',
        source: 'Sahih Muslim 2699',
        translations: {
            english: "He who relieves a believer's distress in this world, Allah will relieve his distress on the Day of Judgment.",
            urdu: 'جو شخص کسی مومن کی دنیاوی مصیبتوں میں سے کوئی مصیبت دور کرے، اللہ قیامت کے دن اس کی مصیبتوں میں سے ایک مصیبت دور فرمائے گا۔',
            indonesian: 'Barangsiapa melapangkan satu kesusahan seorang mukmin di dunia, Allah akan melapangkan satu kesusahannya pada hari Kiamat.',
            french: 'Celui qui soulage un croyant d’une difficulté de ce monde, Allah le soulagera d’une difficulté du Jour du Jugement.',
            bengali: 'যে ব্যক্তি কোনো মুমিনের দুনিয়ার কোনো একটি দুঃখ দূর করে, আল্লাহ কিয়ামতের দিনের দুঃখ থেকে তার একটি দুঃখ দূর করবেন।',
            turkish: 'Kim bir mümin kardeşinin dünya sıkıntılarından birini giderirse, Allah da kıyamet günü sıkıntılarından birini ondan giderir.',
        },
    },
    {
        type: 'quran',
        arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
        source: 'Surah At-Talaq 65:3',
        translations: {
            english: 'Whoever puts his trust in Allah, He will be sufficient for him.',
            urdu: 'اور جو اللہ پر بھروسہ کرے، وہ اسے کافی ہے۔',
            indonesian: 'Barangsiapa bertawakal kepada Allah, niscaya Allah akan mencukupkan (keperluan)nya.',
            french: 'Quiconque place sa confiance en Allah, Il lui suffit.',
            bengali: 'এবং যে আল্লাহর উপর ভরসা করে, তার জন্য তিনিই যথেষ্ট।',
            turkish: 'Kim Allah’a tevekkül ederse, O, ona yeter.',
        },
    },
    {
        type: 'hadith',
        arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
        source: 'Sahih al-Bukhari 6018',
        translations: {
            english: 'Whoever believes in Allah and the Last Day should speak good or remain silent.',
            urdu: 'جو اللہ اور آخرت کے دن پر ایمان رکھتا ہے، اسے چاہیے کہ بھلی بات کہے یا خاموش رہے۔',
            indonesian: 'Barangsiapa beriman kepada Allah dan hari akhir, hendaklah ia berkata baik atau diam.',
            french: 'Celui qui croit en Allah et au Jour Dernier qu’il dise du bien ou qu’il se taise.',
            bengali: 'যে আল্লাহ ও শেষ দিনে বিশ্বাস করে, সে যেন ভালো কথা বলে অথবা চুপ থাকে।',
            turkish: 'Allah’a ve ahiret gününe iman eden kimse, ya hayır söylesin ya da sussun.',
        },
    },
    {
        type: 'quran',
        arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ',
        source: "Surah Al-A'raf 7:156",
        translations: {
            english: 'My mercy encompasses all things.',
            urdu: 'اور میری رحمت ہر چیز کو محیط ہے۔',
            indonesian: 'Dan rahmat-Ku meliputi segala sesuatu.',
            french: 'Et Ma miséricorde embrasse toute chose.',
            bengali: 'এবং আমার রহমত সকল কিছুকে পরিবেষ্টন করে রেখেছে।',
            turkish: 'Rahmetim her şeyi kuşatmıştır.',
        },
    },
    {
        type: 'hadith',
        arabic: 'أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ',
        source: 'Sahih al-Bukhari 6464',
        translations: {
            english: 'The deeds dearest to Allah are those done consistently, even if small.',
            urdu: 'اللہ کو سب سے زیادہ پسندیدہ عمل وہ ہیں جو ہمیشگی سے کیے جائیں، چاہے کم ہی کیوں نہ ہوں۔',
            indonesian: 'Amalan yang paling dicintai Allah adalah yang paling konsisten meskipun sedikit.',
            french: 'Les œuvres les plus aimées d’Allah sont les plus constantes, même si elles sont petites.',
            bengali: 'আল্লাহর কাছে সবচেয়ে প্রিয় আমল হলো সেগুলো যা নিয়মিতভাবে করা হয়, যদিও তা কম হয়।',
            turkish: 'Amellerin Allah’a en sevimli olanı, az da olsa devamlı yapılanıdır.',
        },
    },
];

export function getDailyInspiration(date: Date = new Date()): Inspiration {
    const start = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
    return INSPIRATIONS[((dayOfYear % INSPIRATIONS.length) + INSPIRATIONS.length) % INSPIRATIONS.length];
}
