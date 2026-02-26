const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../assets/noor.db');

// Ensure assets directory exists
const assetsDir = path.dirname(DB_PATH);
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Remove old database to start fresh
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

const db = new sqlite3.Database(DB_PATH);

db.serialize(async () => {
    console.log("Creating database schemas...");
    db.run(`PRAGMA journal_mode = DELETE;`);

    // Quran tables
    db.run(`
        CREATE TABLE IF NOT EXISTS surahs (
            id INTEGER PRIMARY KEY,
            name_arabic TEXT NOT NULL,
            name_english TEXT NOT NULL,
            revelation_type TEXT NOT NULL,
            total_ayahs INTEGER NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ayahs (
            id INTEGER PRIMARY KEY,
            surah_id INTEGER NOT NULL,
            ayah_number INTEGER NOT NULL,
            text_arabic TEXT NOT NULL,
            text_english TEXT NOT NULL,
            FOREIGN KEY(surah_id) REFERENCES surahs(id)
        )
    `);

    // Hadith FTS5 Table
    db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS hadiths_fts USING fts5(
            book_slug,
            hadith_number,
            text_arabic,
            text_english,
            narrator,
            tokenize = 'porter'
        );
    `);

    console.log("Tables created. Fetching Quran Data...");

    try {
        // Fetch Arabic text
        const arabicResponse = await fetch('http://api.alquran.cloud/v1/quran/quran-simple');
        const arabicData = await arabicResponse.json();

        // Fetch English text (Sahih International)
        const englishResponse = await fetch('http://api.alquran.cloud/v1/quran/en.sahih');
        const englishData = await englishResponse.json();

        if (arabicData.code !== 200 || englishData.code !== 200) {
            throw new Error("Failed to fetch Quran from API");
        }

        const surahs = arabicData.data.surahs;
        const enSurahs = englishData.data.surahs;

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            const insertSurah = db.prepare(`INSERT INTO surahs (id, name_arabic, name_english, revelation_type, total_ayahs) VALUES (?, ?, ?, ?, ?)`);
            const insertAyah = db.prepare(`INSERT INTO ayahs (surah_id, ayah_number, text_arabic, text_english) VALUES (?, ?, ?, ?)`);

            for (let i = 0; i < surahs.length; i++) {
                const surah = surahs[i];
                const enSurah = enSurahs[i];

                // Keep revelation type simple capitalized
                const revType = surah.revelationType.charAt(0).toUpperCase() + surah.revelationType.slice(1);

                insertSurah.run(surah.number, surah.name, surah.englishName, revType, surah.ayahs.length);

                for (let j = 0; j < surah.ayahs.length; j++) {
                    const ayah = surah.ayahs[j];
                    const enAyah = enSurah.ayahs[j];

                    insertAyah.run(surah.number, ayah.numberInSurah, ayah.text, enAyah.text);
                }
            }

            insertSurah.finalize();
            insertAyah.finalize();

            // Insert extensive mock Hadiths
            console.log("Inserting Hadith Collection...");
            const insertHadith = db.prepare(`INSERT INTO hadiths_fts (book_slug, hadith_number, text_arabic, text_english, narrator) VALUES (?, ?, ?, ?, ?)`);

            insertHadith.run('bukhari', '1', 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'Actions are judged by motives (niyyah)...', 'Umar bin Al-Khattab');
            insertHadith.run('muslim', '2699', 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', 'He who follows a path in quest of knowledge, Allah will make the path of Jannah easy for him.', 'Abu Huraira');
            insertHadith.run('bukhari', '47', 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ', 'A Muslim is the one who avoids harming Muslims with his tongue and hands.', 'Abdullah bin Amr');
            insertHadith.run('tirmidhi', '2001', 'مَا مِنْ شَىْءٍ أَثْقَلُ فِي الْمِيزَانِ مِنْ حُسْنِ الْخُلُقِ', 'Nothing is heavier on the Scale than good character.', 'Abu Darda');
            insertHadith.run('tirmidhi', '2398', 'الْكَيِّسُ مَنْ دَانَ نَفْسَهُ وَعَمِلَ لِمَا بَعْدَ الْمَوْتِ', 'The wise man is one who holds himself accountable and performs good deeds for life after death.', 'Shaddad bin Aus');
            insertHadith.run('abudawud', '1522', 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', 'O Allah, help me remember You, continuously thank You, and worship You perfectly.', 'Muadh bin Jabal');

            insertHadith.finalize();

            db.run("COMMIT", (err) => {
                if (err) console.error("Commit error", err);
                else {
                    console.log(`\n✅ Database seed successful! Created assets/noor.db with 114 Surahs and FTS Hadiths.`);
                    db.run("VACUUM", () => {
                        db.close();
                    });
                }
            });
        });

    } catch (e) {
        console.error("Seeding Error: ", e);
    }
});
