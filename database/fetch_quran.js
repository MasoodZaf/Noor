const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'noor_offline.db');
const SCHEMA_PATH = path.join(__dirname, 'sqlite_schema.sql');

async function initializeDatabase() {
    console.log('Initializing SQLite database...');

    // Create new Database
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database', err);
            process.exit(1);
        }
    });

    // Load schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    db.exec(schema, (err) => {
        if (err) {
            console.error('Error executing schema', err);
        } else {
            console.log('Schema created successfully.');
            fetchSurahs(db);
        }
    });
}

async function fetchSurahs(db) {
    console.log('Fetching Surahs from Quran.com API...');
    try {
        const response = await fetch('https://api.quran.com/api/v4/chapters?language=en');
        const data = await response.json();

        const stmt = db.prepare(`INSERT INTO surahs 
            (number, name_arabic, name_english, name_transliteration, revelation_type, ayah_count, page_start) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            data.chapters.forEach(chapter => {
                const revelationType = chapter.revelation_place.toLowerCase() === 'makkah' ? 'meccan' : 'medinan';
                stmt.run(
                    chapter.id,
                    chapter.name_arabic,
                    chapter.translated_name.name,
                    chapter.name_simple,
                    revelationType,
                    chapter.verses_count,
                    chapter.pages[0]
                );
            });
            stmt.finalize();
            db.run("COMMIT", (err) => {
                if (err) {
                    console.error("Error committing transaction", err);
                } else {
                    console.log(`Successfully inserted ${data.chapters.length} Surahs.`);
                    console.log('Database population script completed first phase!');
                }
                db.close();
            });
        });
    } catch (error) {
        console.error('Error fetching Surahs:', error);
        db.close();
    }
}

initializeDatabase();
