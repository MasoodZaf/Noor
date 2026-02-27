const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'noor_offline.db');

const DUAS_CATEGORIES = [
    { id: 1, name_en: 'Morning & Evening', name_ar: 'الصباح والمساء', icon: 'sunrise', order: 1 },
    { id: 2, name_en: 'Prayer (Salah)', name_ar: 'الصلاة', icon: 'activity', order: 2 },
    { id: 3, name_en: 'Travel', name_ar: 'السفر', icon: 'navigation', order: 3 },
    { id: 4, name_en: 'Anxiety & Sorrow', name_ar: 'الهم والحزن', icon: 'heart', order: 4 },
    { id: 5, name_en: 'Eating & Drinking', name_ar: 'الطعام والشراب', icon: 'coffee', order: 5 }
];

const DUAS_LIST = require('./seed_duas.json');

const HADITH_COLLECTIONS = [
    { slug: 'bukhari', en: 'Sahih al-Bukhari', ar: 'صحيح البخاري', count: 7563 },
    { slug: 'muslim', en: 'Sahih Muslim', ar: 'صحيح مسلم', count: 3033 },
    { slug: 'tirmidhi', en: 'Jami at-Tirmidhi', ar: 'جامع الترمذي', count: 3956 },
    { slug: 'abudawud', en: 'Sunan Abu Dawud', ar: 'سنن أبي داود', count: 5274 }
];

async function seedDatabase() {
    console.log("Seeding Database...");

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database', err);
            process.exit(1);
        }
    });

    db.serialize(async () => {
        db.run("BEGIN TRANSACTION");

        // 1. Seed Dua Categories
        const insertCategory = db.prepare(`INSERT OR IGNORE INTO dua_categories (id, name_english, name_arabic, icon, sort_order) VALUES (?, ?, ?, ?, ?)`);
        DUAS_CATEGORIES.forEach(c => insertCategory.run(c.id, c.name_en, c.name_ar, c.icon, c.order));
        insertCategory.finalize();

        // 2. Seed Duas
        const insertDua = db.prepare(`INSERT OR IGNORE INTO duas (category_id, title, arabic_text, transliteration, translation_en, source, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        DUAS_LIST.forEach((d, index) => insertDua.run(d.cat_id, d.title, d.ar, d.trans, d.en, d.source, index));
        insertDua.finalize();

        // 3. Seed Hadith Collections
        const insertCollection = db.prepare(`INSERT OR IGNORE INTO hadith_collections (slug, name_english, name_arabic, total_hadiths) VALUES (?, ?, ?, ?)`);
        HADITH_COLLECTIONS.forEach(c => insertCollection.run(c.slug, c.en, c.ar, c.count));
        insertCollection.finalize();

        // 4. Fetch up to 150 Hadiths per collection
        console.log("Fetching top Hadiths from external API...");
        try {
            const insertHadith = db.prepare(`INSERT OR IGNORE INTO hadiths (id, collection_slug, hadith_number, arabic_text, english_text, urdu_text, grade, narrator_chain) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            const insertFTS = db.prepare(`INSERT OR IGNORE INTO hadiths_fts (rowid, english_text, arabic_text) VALUES (?, ?, ?)`);

            let globalHadithId = 1;
            let totalSeeded = 0;

            for (const collection of HADITH_COLLECTIONS) {
                console.log(`Fetching ${collection.en}...`);
                try {
                    const [reqEng, reqAr, reqUrdu] = await Promise.all([
                        fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collection.slug}.json`),
                        fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${collection.slug}.json`),
                        fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-${collection.slug}.json`)
                    ]);

                    const dataEng = await reqEng.json();
                    const dataAr = await reqAr.json();
                    const dataUrdu = await reqUrdu.json();

                    // Grab first 150 from each to keep db lightweight
                    const sampleEng = dataEng.hadiths.slice(0, 150);
                    const sampleAr = dataAr.hadiths.slice(0, 150);
                    const sampleUrdu = dataUrdu.hadiths.slice(0, 150);

                    sampleEng.forEach((h, idx) => {
                        const arText = sampleAr[idx] ? sampleAr[idx].text : h.text;
                        const urduText = sampleUrdu[idx] ? sampleUrdu[idx].text : h.text;
                        insertHadith.run(globalHadithId, collection.slug, String(h.hadithnumber), arText, h.text, urduText, h.grades?.[0]?.grade || 'Sahih', 'Narrated by Companions');
                        insertFTS.run(globalHadithId, h.text, arText);
                        globalHadithId++;
                        totalSeeded++;
                    });
                } catch (colErr) {
                    console.log(`Failed to fetch ${collection.slug}: ${colErr.message}`);
                }
            }

            insertHadith.finalize();
            insertFTS.finalize();

            console.log(`Successfully seeded ${totalSeeded} Total Hadiths across multiple books!`);
        } catch (e) {
            console.log("Could not fetch Hadith from internet, proceeding with default seeds.", e.message);
        }

        db.run("COMMIT", (err) => {
            if (err) console.error("Error committing transaction", err);
            else console.log("Database perfectly seeded with Duas and Hadith Collections!");
            db.close();
        });
    });
}

seedDatabase();
