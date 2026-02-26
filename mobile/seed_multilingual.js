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

const quranApis = {
    ind: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ind-indonesianislam.json',
    fra: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/fra-islamicfoundati.json',
    ben: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ben-muhiuddinkhan.json',
    tur: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/tur-diyanetisleri.json',
    urd: 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/urd-muhammadjunagar.json'
};

const hadithApis = {
    ar: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.json',
    en: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari.json',
    ur: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari.json',
    ind: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ind-bukhari.json',
    fra: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/fra-bukhari.json',
    ben: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ben-bukhari.json',
    tur: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/tur-bukhari.json'
};

async function seed() {
    console.log("Fetching Quran Multi-Language data...");
    const qQuran = {};
    for (const [lang, url] of Object.entries(quranApis)) {
        console.log(`Fetching ${lang} Quran...`);
        qQuran[lang] = await fetchJson(url);
    }

    console.log("Fetching Hadith Multi-Language data...");
    const qHadith = {};
    for (const [lang, url] of Object.entries(hadithApis)) {
        console.log(`Fetching ${lang} Bukhari...`);
        qHadith[lang] = await fetchJson(url);
    }

    db.serialize(() => {
        // 1. Alter Ayahs Table
        const columns = ['text_ind', 'text_fra', 'text_ben', 'text_tur']; // text_urdu might already exist
        for (const col of columns) {
            db.run(`ALTER TABLE ayahs ADD COLUMN ${col} TEXT;`, (err) => {
                if (!err) console.log(`Added ${col} column to ayahs (or it already existed).`);
            });
        }

        console.log("Updating Quran Ayahs with translations...");
        db.run("BEGIN TRANSACTION;");
        const updateAyah = db.prepare("UPDATE ayahs SET text_urdu = ?, text_ind = ?, text_fra = ?, text_ben = ?, text_tur = ? WHERE surah_id = ? AND ayah_number = ?");

        const q_ur = qQuran['urd'].quran;
        const q_ind = qQuran['ind'].quran;
        const q_fra = qQuran['fra'].quran;
        const q_ben = qQuran['ben'].quran;
        const q_tur = qQuran['tur'].quran;

        for (let i = 0; i < q_ur.length; i++) {
            updateAyah.run(
                q_ur[i].text,
                q_ind[i].text,
                q_fra[i].text,
                q_ben[i].text,
                q_tur[i].text,
                q_ur[i].chapter,
                q_ur[i].verse
            );
        }
        updateAyah.finalize();
        db.run("COMMIT;");
        console.log("Quran beautifully synced with 6 languages!");

        // 2. Rebuild Hadiths FTS
        db.run("DROP TABLE IF EXISTS hadiths_fts;");
        db.run(`
            CREATE VIRTUAL TABLE hadiths_fts USING fts5(
                book_slug,
                hadith_number,
                text_arabic,
                text_english,
                text_urdu,
                text_ind,
                text_fra,
                text_ben,
                text_tur,
                narrator,
                tokenize = 'porter'
            )
        `);

        console.log("Seeding Hadith FTS with exact multi-translations...");
        db.run("BEGIN TRANSACTION;");
        const insertHadith = db.prepare("INSERT INTO hadiths_fts (book_slug, hadith_number, text_arabic, text_english, text_urdu, text_ind, text_fra, text_ben, text_tur, narrator) VALUES ('bukhari', ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        // Take 100 for fast local indexing demo
        for (let i = 0; i < 100; i++) {
            const ar = qHadith['ar'].hadiths[i];
            const en = qHadith['en'].hadiths[i];
            const ur = qHadith['ur']?.hadiths[i];
            const ind = qHadith['ind']?.hadiths[i];
            const fra = qHadith['fra']?.hadiths[i];
            const ben = qHadith['ben']?.hadiths[i];
            const tur = qHadith['tur']?.hadiths[i];

            if (!ar || !en) continue;

            let narrator = 'Unknown';
            if (en.text.toLowerCase().includes('narrated')) {
                const match = en.text.split(':')[0];
                narrator = match.replace('Narrated ', '');
            }

            insertHadith.run(
                ar.hadithnumber,
                ar.text,
                en.text,
                ur ? ur.text : '',
                ind ? ind.text : '',
                fra ? fra.text : '',
                ben ? ben.text : '',
                tur ? tur.text : '',
                narrator
            );
        }
        insertHadith.finalize();
        db.run("COMMIT;");
        console.log("Hadiths fully synchronized heavily multi-lingual.");
    });
}

seed().then(() => {
    // Add brief timeout for sqlite
    setTimeout(() => {
        db.close();
        console.log("All systems go.");
    }, 1000);
}).catch(console.error);
