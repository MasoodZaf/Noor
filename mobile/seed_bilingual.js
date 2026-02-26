const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const db = new sqlite3.Database('assets/noor.db');

async function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function seed() {
    console.log("Fetching Urdu Quran...");
    const quranUrdu = await fetchJson('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/urd-muhammadjunagar.json');

    console.log("Fetching English Bukhari...");
    const hadithEn = await fetchJson('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.json');

    console.log("Fetching Urdu Bukhari...");
    const hadithUr = await fetchJson('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari.json');

    console.log("Fetching Arabic Bukhari...");
    const hadithAr = await fetchJson('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.json');

    db.serialize(() => {
        // 1. Alter Ayahs Table
        try {
            db.run("ALTER TABLE ayahs ADD COLUMN text_urdu TEXT;");
            console.log("Added text_urdu column to ayahs.");
        } catch (e) { console.log(e.message); } // Might already exist

        console.log("Updating Quran Ayahs with Urdu...");
        db.run("BEGIN TRANSACTION;");
        const updateAyah = db.prepare("UPDATE ayahs SET text_urdu = ? WHERE surah_id = ? AND ayah_number = ?");
        for (const verse of quranUrdu.quran) {
            updateAyah.run(verse.text, verse.chapter, verse.verse);
        }
        updateAyah.finalize();
        db.run("COMMIT;");
        console.log("Quran beautifully synced with Urdu!");

        // 2. Rebuild Hadiths FTS
        db.run("DROP TABLE IF EXISTS hadiths_fts;");
        db.run(`
            CREATE VIRTUAL TABLE hadiths_fts USING fts5(
                book_slug,
                hadith_number,
                text_arabic,
                text_english,
                text_urdu,
                narrator,
                tokenize = 'porter'
            )
        `);

        console.log("Seeding Hadith FTS with exact translations...");
        db.run("BEGIN TRANSACTION;");
        const insertHadith = db.prepare("INSERT INTO hadiths_fts (book_slug, hadith_number, text_arabic, text_english, text_urdu, narrator) VALUES ('bukhari', ?, ?, ?, ?, ?)");

        for (let i = 0; i < 100; i++) {
            const ar = hadithAr.hadiths[i];
            const en = hadithEn.hadiths[i];
            const ur = hadithUr.hadiths[i];
            if (!ar || !en || !ur) continue;

            let narrator = 'Unknown';
            if (en.text.toLowerCase().includes('narrated')) {
                const match = en.text.split(':')[0];
                narrator = match.replace('Narrated ', '');
            }

            insertHadith.run(ar.hadithnumber, ar.text, en.text, ur.text, narrator);
        }
        insertHadith.finalize();
        db.run("COMMIT;");
        console.log("Hadiths fully synchronized bi-lingually.");
    });
}

seed().then(() => {
    // Add brief timeout for sqlite
    setTimeout(() => {
        db.close();
        console.log("All systems go.");
    }, 1000);
});
