const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../assets/noor.db');
const db = new sqlite3.Database(dbPath);

const alphabet = "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و ه ء ي".split(' ');
const harakaat = ["ـَ", "ـِ", "ـُ"];
const tanween = ["ـً", "ـٍ", "ـٌ"];

// Audio: TTS-first approach using expo-speech with Arabic language
// All items include a `tts` field for clear Arabic pronunciation
// URL audio field kept null (TTS is the primary source)

// Arabic letter names for clear pronunciation via TTS
const LETTER_NAMES = [
    "أَلِف","بَاء","تَاء","ثَاء","جِيم","حَاء","خَاء",
    "دَال","ذَال","رَاء","زَاي","سِين","شِين","صَاد",
    "ضَاد","طَاء","ظَاء","عَين","غَين","فَاء","قَاف",
    "كَاف","لَام","مِيم","نُون","وَاو","هَاء","هَمزَة","يَاء"
];

const QAIDA_LESSONS = [
    { id: 1, title: 'Alphabet Basics', sub: 'Single Letters',    color: '#3b82f6', arabic: 'ا' },
    { id: 2, title: 'Short Vowels',    sub: 'Harakaat',          color: '#f97316', arabic: 'ـَ' },
    { id: 3, title: 'Tanween',         sub: 'Double Vowels',     color: '#10b981', arabic: 'ـً' },
    { id: 4, title: 'Sukoon',          sub: 'Resting sound',     color: '#8b5cf6', arabic: 'ـْ' },
    { id: 5, title: 'Shaddah',         sub: 'Double consonant',  color: '#ec4899', arabic: 'بّ' },
    { id: 6, title: 'Maddah',          sub: 'Stretching sounds', color: '#14b8a6', arabic: 'آ' },
    { id: 7, title: 'Joined Letters',  sub: 'Letter shapes',     color: '#ef4444', arabic: 'بـ' },
    { id: 8, title: 'Full Words',      sub: 'Quranic words',     color: '#eab308', arabic: 'قُرْآن' },
];

const LESSON_CONTENT = {
    // Lesson 1: Arabic alphabet — TTS speaks letter name clearly
    1: {
        items: alphabet.map((l, i) => ({
            text: l,
            audio: null,
            tts: LETTER_NAMES[i] || l
        }))
    },
    // Lesson 2: Letters with short vowels (fatha/kasra/damma) — TTS reads the syllable
    2: {
        items: alphabet.slice(0, 10).flatMap((l) => harakaat.map((h) => ({
            text: l + h,
            audio: null,
            tts: l + h   // Arabic TTS handles harakaat correctly
        })))
    },
    // Lesson 3: Tanween (double vowels) — TTS handles tanween naturally
    3: {
        items: alphabet.slice(0, 10).flatMap((l) => tanween.map((v) => ({
            text: l + v,
            audio: null,
            tts: l + v
        })))
    },
    // Lesson 4: Sukoon — consonant + sukoon (silent end)
    4: {
        items: alphabet.slice(0, 15).map((l) => ({
            text: l + "ْ",
            audio: null,
            tts: l + "ْ"
        }))
    },
    // Lesson 5: Shaddah (doubled consonant)
    5: {
        items: alphabet.slice(0, 10).flatMap((l) => harakaat.map((h) => ({
            text: l + "ّ" + h,
            audio: null,
            tts: l + "ّ" + h
        })))
    },
    // Lesson 6: Maddah (long vowels: aa, ee, oo)
    6: {
        items: [
            { text: "آ",  audio: null, tts: "آ" },
            { text: "بَا", audio: null, tts: "بَا" },
            { text: "تَا", audio: null, tts: "تَا" },
            { text: "بِي", audio: null, tts: "بِي" },
            { text: "تِي", audio: null, tts: "تِي" },
            { text: "بُو", audio: null, tts: "بُو" },
            { text: "تُو", audio: null, tts: "تُو" },
            { text: "نَا", audio: null, tts: "نَا" },
            { text: "نِي", audio: null, tts: "نِي" },
            { text: "نُو", audio: null, tts: "نُو" },
        ]
    },
    // Lesson 7: Joined letter shapes
    7: {
        items: [
            { text: "بـ",  audio: null, tts: "بَ" },
            { text: "ـبـ", audio: null, tts: "بَ" },
            { text: "ـب",  audio: null, tts: "بَ" },
            { text: "نـ",  audio: null, tts: "نَ" },
            { text: "ـنـ", audio: null, tts: "نَ" },
            { text: "ـن",  audio: null, tts: "نَ" },
            { text: "عـ",  audio: null, tts: "عَ" },
            { text: "ـعـ", audio: null, tts: "عَ" },
            { text: "ـع",  audio: null, tts: "عَ" },
        ]
    },
    // Lesson 8: Common Quranic words
    8: {
        items: [
            { text: "بِسْمِ",   audio: null, tts: "بِسْمِ" },
            { text: "اللَّهِ",  audio: null, tts: "اللَّهِ" },
            { text: "الرَّحْمٰنِ", audio: null, tts: "الرَّحْمٰنِ" },
            { text: "الرَّحِيمِ", audio: null, tts: "الرَّحِيمِ" },
            { text: "قُرْآن",  audio: null, tts: "قُرْآن" },
            { text: "رَبِّ",   audio: null, tts: "رَبِّ" },
            { text: "الْحَمْدُ", audio: null, tts: "الْحَمْدُ" },
            { text: "إِيَّاكَ", audio: null, tts: "إِيَّاكَ" },
            { text: "نَعْبُدُ", audio: null, tts: "نَعْبُدُ" },
        ]
    },
};

db.serialize(() => {
    console.log("Seeding Qaida with sound...");

    // Lessons
    const lessonStmt = db.prepare("INSERT OR REPLACE INTO qaida_lessons (id, title, subtitle, color, arabic_icon) VALUES (?, ?, ?, ?, ?)");
    for (const l of QAIDA_LESSONS) {
        lessonStmt.run(l.id, l.title, l.sub, l.color, l.arabic);
    }
    lessonStmt.finalize();

    // Content
    db.run("DELETE FROM qaida_content");
    const contentStmt = db.prepare("INSERT INTO qaida_content (lesson_id, group_name, content_json) VALUES (?, ?, ?)");
    for (const [id, content] of Object.entries(LESSON_CONTENT)) {
        contentStmt.run(parseInt(id), 'Main', JSON.stringify(content.items));
    }
    contentStmt.finalize();

    db.run("INSERT OR IGNORE INTO qaida_progress (user_id, current_lesson_id, completed_lessons) VALUES ('ahmed', 1, '')");

    console.log("Qaida Database Seeded Successfully with sound links!");
    db.close();
});
