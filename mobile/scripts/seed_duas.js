/**
 * seed_duas.js — replaces the abbreviated seed data in the `duas` table with
 * full Arabic + transliteration + English translation for all 34 duas.
 *
 * All entries sourced from Hisnul Muslim (Fortress of the Muslim) by Sa'id ibn
 * Ali ibn Wahf al-Qahtani — each with its primary hadith chain in `source`.
 *
 * Usage:
 *   cd mobile && node scripts/seed_duas.js
 *
 * After running, bump the DB version in context/DatabaseContext.tsx so the app
 * re-copies assets/noor.db to user storage on next launch.
 */

const path = require('path');
const sqlite3 = require('sqlite3');

const DB_PATH = path.join(__dirname, '..', 'assets', 'noor.db');

// Each row matches an existing dua id (1..34) from the current seed.
// Fields: id, arabic_text, transliteration, translation_en, translation_ur, source
const DUAS = [
    // ── Category 1: Morning & Evening ────────────────────────────────────────
    {
        id: 1, title: 'When waking up',
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
        translit: 'Alhamdu lillahi alladhi ahyana ba\'da ma amatana wa ilayhi an-nushur',
        en: 'All praise is due to Allah, Who has given us life after taking it from us, and unto Him is the resurrection.',
        ur: 'تمام تعریفیں اللہ کے لئے ہیں جس نے ہمیں موت کے بعد زندہ کیا اور اسی کی طرف پلٹ کر جانا ہے۔',
        src: 'Sahih al-Bukhari 6312',
    },
    {
        id: 2, title: 'When wearing a garment',
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا الثَّوْبَ وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
        translit: 'Alhamdu lillahi alladhi kasani hadha ath-thawba wa razaqaneehi min ghayri hawlin minni wa la quwwah',
        en: 'All praise is due to Allah Who has clothed me with this garment and provided it for me, with no power or might from myself.',
        ur: 'تمام تعریفیں اللہ کے لئے ہیں جس نے مجھے یہ لباس پہنایا اور مجھے یہ میری طاقت و قوت کے بغیر عطا فرمایا۔',
        src: 'Abu Dawud 4023, Tirmidhi 3458',
    },
    {
        id: 3, title: 'Before undressing',
        arabic: 'بِسْمِ اللَّهِ الَّذِي لَا إِلَهَ إِلَّا هُوَ',
        translit: 'Bismillahi alladhi la ilaha illa huwa',
        en: 'In the name of Allah, besides Whom there is no god.',
        ur: 'اللہ کے نام سے جس کے سوا کوئی معبود نہیں۔',
        src: 'Tirmidhi 606 (reported by Anas)',
    },
    {
        id: 4, title: 'When waking up at night',
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، الْحَمْدُ لِلَّهِ، وَسُبْحَانَ اللَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        translit: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa \'ala kulli shay\'in qadir. Alhamdu lillahi, wa subhanallahi, wa la ilaha illallahu, wallahu akbar, wa la hawla wa la quwwata illa billah',
        en: 'There is none worthy of worship but Allah alone, without partner. To Him belongs all sovereignty and praise, and He is able to do all things. All praise is due to Allah. Glory be to Allah. There is none worthy of worship but Allah. Allah is the greatest. There is no might or power except with Allah.',
        ur: 'اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں، اسی کے لئے ساری بادشاہت اور تعریف ہے اور وہ ہر چیز پر قادر ہے۔ تمام تعریفیں اللہ کے لئے ہیں، اللہ پاک ہے، اللہ کے سوا کوئی معبود نہیں، اللہ سب سے بڑا ہے، اور طاقت و قوت صرف اللہ سے ہے۔',
        src: 'Sahih al-Bukhari 1154',
    },
    {
        id: 5, title: 'Morning Supplication 1',
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translit: 'Asbahna wa asbaha al-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa \'ala kulli shay\'in qadir',
        en: 'We have reached the morning, and at this very time all sovereignty belongs to Allah. All praise is due to Allah. There is none worthy of worship but Allah alone, without partner. To Him belongs all sovereignty and praise, and He is able to do all things.',
        ur: 'ہم نے صبح کی اور ساری بادشاہت اللہ کے لئے ہو گئی، تمام تعریفیں اللہ کے لئے ہیں، اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر قادر ہے۔',
        src: 'Sahih Muslim 2723',
    },
    {
        id: 6, title: 'Morning Supplication 2',
        arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
        translit: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilayka an-nushur',
        en: 'O Allah, by You we reach the morning, and by You we reach the evening; by You we live, and by You we die; and unto You is the resurrection.',
        ur: 'اے اللہ! تیرے ساتھ ہم نے صبح کی اور تیرے ساتھ ہم نے شام کی، تیرے ساتھ ہم زندہ ہیں اور تیرے ساتھ مرتے ہیں اور تیری ہی طرف لوٹ کر جانا ہے۔',
        src: 'Tirmidhi 3391, Abu Dawud 5068',
    },
    {
        id: 7, title: 'Evening Supplication 1',
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translit: 'Amsayna wa amsa al-mulku lillah, walhamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa \'ala kulli shay\'in qadir',
        en: 'We have reached the evening, and at this very time all sovereignty belongs to Allah. All praise is due to Allah. There is none worthy of worship but Allah alone, without partner. To Him belongs all sovereignty and praise, and He is able to do all things.',
        ur: 'ہم نے شام کی اور ساری بادشاہت اللہ کے لئے ہو گئی، تمام تعریفیں اللہ کے لئے ہیں، اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر قادر ہے۔',
        src: 'Sahih Muslim 2723',
    },
    {
        id: 8, title: 'Evening Supplication 2',
        arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
        translit: 'Allahumma ma amsa bi min ni\'matin aw bi ahadin min khalqika fa minka wahdaka la sharika laka, falakal-hamdu wa lakash-shukr',
        en: 'O Allah, whatever blessing has reached me this evening, or has reached any of Your creation, is from You alone, without partner. To You is all praise and to You is all thanks.',
        ur: 'اے اللہ! جو نعمت مجھے یا تیری کسی مخلوق کو اس شام ملی، وہ تیری ہی طرف سے ہے، تیرا کوئی شریک نہیں، پس تمام تعریف اور شکر تیرے لئے ہے۔',
        src: 'Abu Dawud 5073',
    },

    // ── Category 2: Prayer (Wudu / Mosque / Adhan) ──────────────────────────
    {
        id: 9, title: 'Before entering the toilet',
        arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
        translit: 'Allahumma inni a\'udhu bika minal-khubuthi wal-khaba\'ith',
        en: 'O Allah, I seek refuge with You from all male and female evils (or: from evil deeds and evil spirits).',
        ur: 'اے اللہ! میں تیری پناہ مانگتا ہوں ہر قسم کی ناپاکی اور ناپاک جنوں سے۔',
        src: 'Sahih al-Bukhari 142, Sahih Muslim 375',
    },
    {
        id: 10, title: 'After leaving the toilet',
        arabic: 'غُفْرَانَكَ',
        translit: 'Ghufranak',
        en: 'I seek Your forgiveness.',
        ur: 'میں تیری بخشش مانگتا ہوں۔',
        src: 'Abu Dawud 30, Tirmidhi 7',
    },
    {
        id: 11, title: 'Before Wudu',
        arabic: 'بِسْمِ اللَّهِ',
        translit: 'Bismillah',
        en: 'In the name of Allah.',
        ur: 'اللہ کے نام سے۔',
        src: 'Abu Dawud 101 — "There is no wudu for one who does not mention Allah\'s name over it."',
    },
    {
        id: 12, title: 'After Wudu',
        arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
        translit: 'Ashhadu an la ilaha illallahu wahdahu la sharika lahu, wa ashhadu anna Muhammadan \'abduhu wa rasuluh. Allahumma ij\'alni min at-tawwabin, waj\'alni min al-mutatahhirin',
        en: 'I bear witness that there is none worthy of worship but Allah, alone without partner, and I bear witness that Muhammad is His servant and messenger. O Allah, make me of those who repent often and of those who purify themselves.',
        ur: 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے اس کا کوئی شریک نہیں، اور میں گواہی دیتا ہوں کہ محمد ﷺ اللہ کے بندے اور رسول ہیں۔ اے اللہ! مجھے توبہ کرنے والوں اور پاکی حاصل کرنے والوں میں سے بنا۔',
        src: 'Sahih Muslim 234, Tirmidhi 55',
    },
    {
        id: 13, title: 'When going to the mosque',
        arabic: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَمِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ شِمَالِي نُورًا، وَمِنْ أَمَامِي نُورًا، وَمِنْ خَلْفِي نُورًا، وَاجْعَلْ فِي نَفْسِي نُورًا، وَأَعْظِمْ لِي نُورًا',
        translit: 'Allahumma ij\'al fi qalbi nura, wa fi lisani nura, wa fi sam\'i nura, wa fi basari nura, wa min fawqi nura, wa min tahti nura, wa \'an yamini nura, wa \'an shimali nura, wa min amami nura, wa min khalfi nura, waj\'al fi nafsi nura, wa a\'zim li nura',
        en: 'O Allah, place light in my heart, light on my tongue, light in my hearing, light in my sight, light above me, light below me, light to my right, light to my left, light before me, light behind me; place light in my soul, and magnify light for me.',
        ur: 'اے اللہ! میرے دل میں نور، میری زبان میں نور، میرے کانوں میں نور، میری آنکھوں میں نور، میرے اوپر نور، میرے نیچے نور، میرے دائیں نور، میرے بائیں نور، میرے آگے نور، میرے پیچھے نور پیدا کر دے، اور میرے لئے نور کو بڑا کر دے۔',
        src: 'Sahih al-Bukhari 6316, Sahih Muslim 763',
    },
    {
        id: 14, title: 'Upon entering the mosque',
        arabic: 'أَعُوذُ بِاللَّهِ الْعَظِيمِ، وَبِوَجْهِهِ الْكَرِيمِ، وَسُلْطَانِهِ الْقَدِيمِ، مِنَ الشَّيْطَانِ الرَّجِيمِ. بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        translit: 'A\'udhu billahil-\'azim, wa bi wajhihil-karim, wa sultanihil-qadim, minash-shaytani ar-rajim. Bismillah, was-salatu was-salamu \'ala rasulillah. Allahumma iftah li abwaba rahmatik',
        en: 'I seek refuge with Allah the Magnificent, and with His noble face, and with His eternal authority, from the accursed devil. In the name of Allah, and may peace and blessings be upon the Messenger of Allah. O Allah, open for me the gates of Your mercy.',
        ur: 'میں اللہ عظیم، اس کے معزز چہرے اور اس کی قدیم سلطنت کی پناہ مانگتا ہوں شیطان مردود سے۔ اللہ کے نام سے، اور درود و سلام اللہ کے رسول ﷺ پر۔ اے اللہ! میرے لئے اپنی رحمت کے دروازے کھول دے۔',
        src: 'Abu Dawud 466, Sahih Muslim 713',
    },
    {
        id: 15, title: 'Upon leaving the mosque',
        arabic: 'بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ، اللَّهُمَّ اعْصِمْنِي مِنَ الشَّيْطَانِ الرَّجِيمِ',
        translit: 'Bismillah, was-salatu was-salamu \'ala rasulillah. Allahumma inni as\'aluka min fadlika, Allahumma i\'simni minash-shaytani ar-rajim',
        en: 'In the name of Allah, and peace and blessings be upon the Messenger of Allah. O Allah, I ask You of Your favour; O Allah, protect me from the accursed devil.',
        ur: 'اللہ کے نام سے، اور درود و سلام اللہ کے رسول ﷺ پر۔ اے اللہ! میں تیرے فضل کا سوال کرتا ہوں، اے اللہ! مجھے شیطان مردود سے بچا۔',
        src: 'Sahih Muslim 713, Ibn Majah 773',
    },
    {
        id: 16, title: 'After the Adhan',
        arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
        translit: 'Allahumma rabba hadhihi ad-da\'wati at-tammah, was-salati al-qa\'imah, ati Muhammadan al-wasilata wal-fadilah, wab\'athhu maqaman mahmudan alladhi wa\'adtah',
        en: 'O Allah, Lord of this perfect call and this prayer to be established, grant Muhammad al-Wasilah (the highest station in Paradise) and al-Fadilah (a rank above all creation), and raise him to the praised station that You have promised him.',
        ur: 'اے اللہ! اس مکمل دعوت اور قائم ہونے والی نماز کے رب! محمد ﷺ کو وسیلہ اور فضیلت عطا فرما، اور انہیں اس مقام محمود پر فائز فرما جس کا تو نے ان سے وعدہ کیا ہے۔',
        src: 'Sahih al-Bukhari 614',
    },

    // ── Category 3: Travel ──────────────────────────────────────────────────
    {
        id: 17, title: 'When leaving the house',
        arabic: 'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        translit: 'Bismillah, tawakkaltu \'alallah, wa la hawla wa la quwwata illa billah',
        en: 'In the name of Allah, I place my trust in Allah; there is no might or power except with Allah.',
        ur: 'اللہ کے نام سے، میں اللہ پر بھروسہ کرتا ہوں، اور طاقت و قوت صرف اللہ سے ہے۔',
        src: 'Abu Dawud 5095, Tirmidhi 3426',
    },
    {
        id: 18, title: 'When entering the house',
        arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
        translit: 'Bismillahi walajna, wa bismillahi kharajna, wa \'alallahi rabbina tawakkalna',
        en: 'In the name of Allah we enter, and in the name of Allah we leave, and upon our Lord Allah we place our trust.',
        ur: 'اللہ کے نام سے ہم داخل ہوئے، اللہ کے نام سے ہم نکلے، اور اپنے رب اللہ پر ہم نے بھروسہ کیا۔',
        src: 'Abu Dawud 5096',
    },
    {
        id: 19, title: 'Mounting an animal or vehicle',
        arabic: 'بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
        translit: 'Bismillah, alhamdu lillah. Subhana alladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina la munqalibun',
        en: 'In the name of Allah. All praise is due to Allah. Glory be to Him who has subjected this to us, and we could not have achieved it on our own; and indeed, to our Lord we will return.',
        ur: 'اللہ کے نام سے، تمام تعریفیں اللہ کے لئے ہیں۔ پاک ہے وہ ذات جس نے اسے ہمارے تابع کر دیا، ہم اسے قابو نہ کر سکتے تھے، اور ہم اپنے رب کی طرف ہی لوٹنے والے ہیں۔',
        src: 'Abu Dawud 2602, Tirmidhi 3446',
    },
    {
        id: 20, title: 'For travel',
        arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ',
        translit: 'Allahumma inna nas\'aluka fi safarina hadha al-birra wat-taqwa, wa minal-\'amali ma tarda. Allahumma hawwin \'alayna safarana hadha watwi \'anna bu\'dah. Allahumma anta as-sahibu fis-safar, wal-khalifatu fil-ahl',
        en: 'O Allah, we ask You in this journey of ours for righteousness and piety, and for deeds that are pleasing to You. O Allah, make this journey easy for us and fold up for us its distance. O Allah, You are our companion on the journey, and the guardian of our family.',
        ur: 'اے اللہ! ہم اس سفر میں تجھ سے نیکی اور تقویٰ کا سوال کرتے ہیں، اور ایسے اعمال کا جن سے تو راضی ہو۔ اے اللہ! ہمارے لئے یہ سفر آسان کر دے اور اس کی دوری لپیٹ دے۔ اے اللہ! تو ہی سفر میں ساتھی ہے اور گھر والوں پر نگہبان۔',
        src: 'Sahih Muslim 1342',
    },
    {
        id: 21, title: 'Entering a town or village',
        arabic: 'اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَمَا أَظْلَلْنَ، وَرَبَّ الْأَرَضِينَ السَّبْعِ وَمَا أَقْلَلْنَ، وَرَبَّ الشَّيَاطِينِ وَمَا أَضْلَلْنَ، وَرَبَّ الرِّيَاحِ وَمَا ذَرَيْنَ، أَسْأَلُكَ خَيْرَ هَذِهِ الْقَرْيَةِ وَخَيْرَ أَهْلِهَا، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ أَهْلِهَا وَشَرِّ مَا فِيهَا',
        translit: 'Allahumma rabbas-samawati as-sab\'i wa ma azlalna, wa rabbal-aradina as-sab\'i wa ma aqlalna, wa rabbash-shayatini wa ma adlalna, wa rabbar-riyahi wa ma dharayna. As\'aluka khayra hadhihil-qaryati wa khayra ahliha, wa a\'udhu bika min sharriha wa sharri ahliha wa sharri ma fiha',
        en: 'O Allah, Lord of the seven heavens and what they shade, Lord of the seven earths and what they carry, Lord of the devils and whom they lead astray, Lord of the winds and what they scatter — I ask You for the good of this town and the good of its people, and I seek refuge in You from its evil, the evil of its people, and the evil within it.',
        ur: 'اے اللہ! ساتوں آسمانوں اور جن چیزوں پر انہوں نے سایہ کیا ان کے رب، ساتوں زمینوں اور جو کچھ انہوں نے اٹھایا ان کے رب، شیاطین اور جنہیں انہوں نے گمراہ کیا ان کے رب، ہواؤں اور جو کچھ وہ اڑاتی ہیں ان کے رب! میں تجھ سے اس بستی کی بھلائی اور اس کے باسیوں کی بھلائی مانگتا ہوں، اور اس کی برائی، اس کے باسیوں کی برائی اور جو کچھ اس میں ہے اس کی برائی سے تیری پناہ مانگتا ہوں۔',
        src: 'Al-Hakim, Ibn as-Sunni (sahih by al-Albani)',
    },
    {
        id: 22, title: 'Returning from travel',
        arabic: 'آيِبُونَ، تَائِبُونَ، عَابِدُونَ، لِرَبِّنَا حَامِدُونَ',
        translit: 'Ayibuna, ta\'ibuna, \'abiduna, li rabbina hamidun',
        en: 'We return, repent, worship our Lord, and praise Him.',
        ur: 'ہم لوٹنے والے، توبہ کرنے والے، عبادت کرنے والے اور اپنے رب کی حمد کرنے والے ہیں۔',
        src: 'Sahih Muslim 1342 (recited when returning)',
    },

    // ── Category 4: Anxiety & Sorrow ────────────────────────────────────────
    {
        id: 23, title: 'When in distress',
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
        translit: 'La ilaha illallahul-\'Azimul-Halim, la ilaha illallahu rabbul-\'arshil-\'azim, la ilaha illallahu rabbus-samawati wa rabbul-ardi wa rabbul-\'arshil-karim',
        en: 'There is none worthy of worship but Allah, the Mighty, the Forbearing. There is none worthy of worship but Allah, Lord of the Magnificent Throne. There is none worthy of worship but Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.',
        ur: 'اللہ کے سوا کوئی معبود نہیں، جو عظمت والا اور بردبار ہے۔ اللہ کے سوا کوئی معبود نہیں، جو عظیم عرش کا رب ہے۔ اللہ کے سوا کوئی معبود نہیں، جو آسمانوں کا رب، زمین کا رب اور معزز عرش کا رب ہے۔',
        src: 'Sahih al-Bukhari 6346, Sahih Muslim 2730',
    },
    {
        id: 24, title: 'For anxiety and sorrow',
        arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ، سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي',
        translit: 'Allahumma inni \'abduka, ibnu \'abdika, ibnu amatika, nasiyati bi yadika, madin fiyya hukmuka, \'adlun fiyya qadauka. As\'aluka bi kulli-smin huwa lak, sammayta bihi nafsak, aw anzaltahu fi kitabik, aw \'allamtahu ahadan min khalqik, aw ista\'tharta bihi fi \'ilmil-ghaybi \'indak, an taj\'alal-qur\'ana rabi\'a qalbi, wa nura sadri, wa jala\'a huzni, wa dhahaba hammi',
        en: 'O Allah, I am Your servant, son of Your male servant, son of Your female servant. My forelock is in Your hand, Your judgement over me is assured, and Your decree concerning me is just. I ask You by every name that belongs to You, which You have named Yourself with, or sent down in Your Book, or taught to any of Your creation, or kept to Yourself in the knowledge of the unseen — that You make the Quran the spring of my heart, the light of my chest, the departure of my grief, and the vanishing of my anxiety.',
        ur: 'اے اللہ! میں تیرا بندہ ہوں، تیرے بندے اور تیری بندی کا بیٹا، میری پیشانی تیرے ہاتھ میں ہے، مجھ پر تیرا حکم نافذ ہے اور تیرا فیصلہ میرے بارے میں انصاف والا ہے۔ میں تجھ سے سوال کرتا ہوں ہر اس نام کے ساتھ جو تیرا ہے، جس سے تو نے اپنے آپ کا نام رکھا، یا اسے اپنی کتاب میں نازل کیا، یا اپنی مخلوق میں سے کسی کو سکھایا، یا اسے اپنے پاس غیب کے علم میں رکھا — کہ تو قرآن کو میرے دل کی بہار، میرے سینے کا نور، میرے غم کا دور کرنے والا اور میری پریشانی کا مٹانے والا بنا دے۔',
        src: 'Musnad Ahmad 3712 (sahih by al-Albani)',
    },
    {
        id: 25, title: 'Upon encountering an enemy',
        arabic: 'اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ، وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ',
        translit: 'Allahumma inna naj\'aluka fi nuhurihim, wa na\'udhu bika min shururihim',
        en: 'O Allah, we place You before them (to repel them), and we seek refuge in You from their evils.',
        ur: 'اے اللہ! ہم تجھے ان کے سامنے کرتے ہیں، اور ان کی برائیوں سے تیری پناہ مانگتے ہیں۔',
        src: 'Abu Dawud 1537 (sahih)',
    },
    {
        id: 26, title: 'When afraid of people',
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        translit: 'Hasbunallahu wa ni\'mal-wakil',
        en: 'Allah is sufficient for us, and the best Disposer of affairs.',
        ur: 'اللہ ہمارے لئے کافی ہے اور وہ بہترین کارساز ہے۔',
        src: 'Sahih al-Bukhari 4563 (Surah Aal \'Imran 3:173)',
    },
    {
        id: 27, title: 'When faced with a difficult task',
        arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
        translit: 'Allahumma la sahla illa ma ja\'altahu sahla, wa anta taj\'alul-hazna idha shi\'ta sahla',
        en: 'O Allah, there is nothing easy except what You make easy, and You make the difficult easy whenever You wish.',
        ur: 'اے اللہ! کوئی چیز آسان نہیں سوائے اس کے جسے تو آسان کر دے، اور تو مشکل کو جب چاہے آسان کر دیتا ہے۔',
        src: 'Ibn Hibban, Ibn as-Sunni (sahih)',
    },
    {
        id: 28, title: 'For settling a debt',
        arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
        translit: 'Allahumma ikfini bi halalika \'an haramik, wa aghnini bi fadlika \'amman siwak',
        en: 'O Allah, suffice me with what You have made lawful against what You have made unlawful, and enrich me by Your grace so I have no need of anyone besides You.',
        ur: 'اے اللہ! مجھے اپنے حلال کے ذریعے حرام سے بے نیاز کر دے، اور اپنے فضل سے مجھے سب سے بے نیاز کر دے۔',
        src: 'Tirmidhi 3563 (hasan)',
    },

    // ── Category 5: Eating & Drinking ───────────────────────────────────────
    {
        id: 29, title: 'Before eating',
        arabic: 'بِسْمِ اللَّهِ',
        translit: 'Bismillah',
        en: 'In the name of Allah.',
        ur: 'اللہ کے نام سے۔',
        src: 'Abu Dawud 3767 — "When one of you eats, let him mention Allah\'s name."',
    },
    {
        id: 30, title: 'Forgetting to say Bismillah',
        arabic: 'بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ',
        translit: 'Bismillahi fi awwalihi wa akhirih',
        en: 'In the name of Allah, at the beginning and at the end.',
        ur: 'اللہ کے نام سے، اس کی ابتدا اور انتہا میں۔',
        src: 'Abu Dawud 3767, Tirmidhi 1858',
    },
    {
        id: 31, title: 'Upon completing the meal',
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ، مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
        translit: 'Alhamdu lillahi alladhi at\'amani hadha wa razaqanihi, min ghayri hawlin minni wa la quwwah',
        en: 'All praise is due to Allah who has fed me this and provided it for me, with no power or might from myself.',
        ur: 'تمام تعریفیں اللہ کے لئے ہیں جس نے مجھے یہ کھلایا اور عطا فرمایا، میری کسی طاقت و قوت کے بغیر۔',
        src: 'Abu Dawud 4023, Tirmidhi 3458',
    },
    {
        id: 32, title: 'When breaking the fast',
        arabic: 'ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
        translit: 'Dhahabaz-zama\'u, wabtallatil-\'uruq, wa thabatal-ajru insha\'allah',
        en: 'The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
        ur: 'پیاس چلی گئی، رگیں تر ہو گئیں، اور اجر ثابت ہو گیا، اگر اللہ نے چاہا۔',
        src: 'Abu Dawud 2357',
    },
    {
        id: 33, title: 'When someone offers you food',
        arabic: 'اللَّهُمَّ بَارِكْ لَهُمْ فِيمَا رَزَقْتَهُمْ، وَاغْفِرْ لَهُمْ وَارْحَمْهُمْ',
        translit: 'Allahumma barik lahum fima razaqtahum, waghfir lahum warhamhum',
        en: 'O Allah, bless them in what You have provided for them, forgive them, and have mercy on them.',
        ur: 'اے اللہ! ان کے رزق میں برکت دے، انہیں بخش دے اور ان پر رحم فرما۔',
        src: 'Sahih Muslim 2042',
    },
    {
        id: 34, title: 'When drinking milk',
        arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَزِدْنَا مِنْهُ',
        translit: 'Allahumma barik lana fihi wa zidna minh',
        en: 'O Allah, bless us in it and give us more of it.',
        ur: 'اے اللہ! ہمیں اس میں برکت دے اور ہمیں اس سے مزید عطا فرما۔',
        src: 'Abu Dawud 3730, Tirmidhi 3455',
    },
];

function main() {
    const db = new sqlite3.Database(DB_PATH);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(`
            UPDATE duas
            SET arabic_text     = ?,
                transliteration = ?,
                translation_en  = ?,
                translation_ur  = ?,
                source          = ?
            WHERE id = ?
        `);

        for (const d of DUAS) {
            stmt.run(d.arabic, d.translit, d.en, d.ur, d.src, d.id, (err) => {
                if (err) console.error(`✗ Failed to update id=${d.id}:`, err.message);
            });
        }

        stmt.finalize((err) => {
            if (err) {
                console.error('stmt finalize error:', err);
                db.run('ROLLBACK');
                db.close();
                process.exit(1);
            }
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    console.error('commit error:', commitErr);
                    db.run('ROLLBACK');
                } else {
                    console.log(`✓ Updated ${DUAS.length} duas with full content.`);
                }

                // Verify by sampling lengths
                db.get("SELECT COUNT(*) AS total, SUM(CASE WHEN translation_en LIKE '%...' THEN 1 ELSE 0 END) AS truncated, AVG(length(translation_en)) AS avg_len FROM duas", (err, row) => {
                    if (err) console.error('verify error:', err);
                    else console.log(`Verification — total: ${row.total}, still truncated: ${row.truncated}, avg translation_en length: ${Math.round(row.avg_len)} chars`);
                    db.close();
                });
            });
        });
    });
}

main();
