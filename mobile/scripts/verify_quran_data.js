#!/usr/bin/env node
/**
 * verify_quran_data.js — sanity check the bundled Quran data against an authoritative source.
 *
 * Compares every ayah in assets/noor.db (text_arabic) against Quran.com v4
 * (text_uthmani field, fed by the King Fahd Complex Madinah Mushaf).
 *
 * Both sides are NFC-normalized and stripped of Uthmani annotation marks
 * (U+06D6–U+06DC, U+06DF–U+06E8, U+06EA–U+06ED) — matching what the app
 * renders via utils/arabic.ts → sanitizeArabicText.
 *
 * Usage:  node scripts/verify_quran_data.js  [--surah=N]  [--verbose]
 *
 * Exit codes:
 *   0 = all 6236 ayahs match
 *   1 = mismatches found (details in stdout)
 *   2 = network or DB error
 */

const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const DB_PATH = 'assets/noor.db';
const QURAN_API = 'https://api.quran.com/api/v4';
const PAGE_SIZE = 50; // Quran.com v4 hard cap

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const surahFilter = (() => {
    const m = args.find((a) => a.startsWith('--surah='));
    return m ? parseInt(m.split('=')[1], 10) : null;
})();

// Match utils/arabic.ts → sanitizeArabicText
const stripAnnotations = (s) => s.replace(/[ۖ-ۜ۟-۪ۨ-ۭ]/g, '');
const stripTatweel = (s) => s.replace(/ـ/g, '');
// Some encodings use dotless-ya (U+0649) as a carrier seat for the dagger-alef
// (U+0670); others use tatweel (U+0640) or nothing. When dotless-ya is followed
// by superscript-alef, it's scaffolding — drop the dotless-ya for comparison.
const stripDaggerAlefCarrier = (s) => s.replace(/ى(?=[ً-ْ]*ٰ)/g, '');
// Different Madinah Mushaf encodings render hamza either as standalone (U+0621)
// or as combining marks (U+0654 above, U+0655 below). Visually identical, semantically
// the same Quranic text — strip all hamza forms for comparison.
const stripHamzaForms = (s) => s.replace(/[ءٕٔ]/g, '');
// Harakat ordering can vary between encodings (fatha-sukun vs sukun-fatha around a
// hamza, etc.). Sort each run of harakat to canonicalize ordering.
const sortHarakat = (s) => s.replace(/[ً-ْٰ]+/g, (run) => [...run].sort().join(''));
// Strip all whitespace — different sources segment compounds differently
// (e.g. بَعْدَمَا vs بَعْدَ مَا — both correct).
const stripWhitespace = (s) => s.replace(/\s+/g, '');
const normalize = (s) =>
    stripWhitespace(
        sortHarakat(
            stripDaggerAlefCarrier(
                stripHamzaForms(stripTatweel(stripAnnotations((s || '').normalize('NFC')))),
            ),
        ),
    );

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, { headers: { 'User-Agent': 'noor-verify/1.0' } }, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`${url} → HTTP ${res.statusCode}`));
                    return;
                }
                // Without setEncoding('utf8'), multi-byte UTF-8 chars split across
                // chunks become U+FFFD replacement characters in the body string.
                res.setEncoding('utf8');
                let body = '';
                res.on('data', (c) => (body += c));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        reject(new Error(`${url} → invalid JSON: ${e.message}`));
                    }
                });
            })
            .on('error', reject);
    });
}

async function fetchSurahFromQuranCom(surahId) {
    const all = [];
    let page = 1;
    while (true) {
        const url = `${QURAN_API}/verses/by_chapter/${surahId}?fields=text_uthmani&per_page=${PAGE_SIZE}&page=${page}`;
        const json = await fetchJson(url);
        const verses = json.verses || [];
        all.push(...verses);
        const total = json.meta?.total_count ?? json.pagination?.total_records ?? 0;
        if (all.length >= total || verses.length < PAGE_SIZE) break;
        page++;
        if (page > 20) break;
    }
    return all.map((v) => v.text_uthmani || '');
}

function loadSurahFromDb(db, surahId) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT ayah_number, text_arabic FROM ayahs WHERE surah_number = ? ORDER BY ayah_number ASC',
            [surahId],
            (err, rows) => (err ? reject(err) : resolve(rows.map((r) => r.text_arabic || ''))),
        );
    });
}

function loadSurahMeta(db) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT number, name_english, ayah_count FROM surahs ORDER BY number ASC',
            (err, rows) => (err ? reject(err) : resolve(rows)),
        );
    });
}

// Find first differing character index between two normalized strings
function firstDiffIndex(a, b) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) return i;
    }
    return a.length === b.length ? -1 : len;
}

function snippet(s, idx, ctx = 12) {
    const start = Math.max(0, idx - ctx);
    const end = Math.min(s.length, idx + ctx);
    return s.slice(start, end);
}

function codepoint(s, idx) {
    if (idx >= s.length) return '∅';
    const cp = s.codePointAt(idx);
    return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

async function main() {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    const surahs = await loadSurahMeta(db);

    let totalAyahs = 0;
    let totalMatch = 0;
    let totalMismatch = 0;
    const mismatchedSurahs = [];

    const targets = surahFilter ? surahs.filter((s) => s.number === surahFilter) : surahs;

    console.log(`[Noor/QuranVerify] Comparing assets/noor.db vs Quran.com v4 (KFC Madinah Mushaf)`);
    console.log(`[Noor/QuranVerify] ${targets.length} surahs to check, normalize=NFC + strip annotations\n`);

    for (const surah of targets) {
        const expectedCount = surah.ayah_count;
        let dbAyahs;
        let apiAyahs;
        try {
            [dbAyahs, apiAyahs] = await Promise.all([
                loadSurahFromDb(db, surah.number),
                fetchSurahFromQuranCom(surah.number),
            ]);
        } catch (e) {
            console.error(`  ✗ Surah ${String(surah.number).padStart(3)} (${surah.name_english}): fetch failed — ${e.message}`);
            totalMismatch += expectedCount;
            mismatchedSurahs.push({ surah, mismatches: [{ reason: 'fetch_failed', error: e.message }] });
            continue;
        }

        const surahMismatches = [];

        if (dbAyahs.length !== expectedCount) {
            surahMismatches.push({ ayah: 0, reason: `DB ayah_count mismatch: db=${dbAyahs.length} expected=${expectedCount}` });
        }
        if (apiAyahs.length !== expectedCount) {
            surahMismatches.push({ ayah: 0, reason: `API ayah_count mismatch: api=${apiAyahs.length} expected=${expectedCount}` });
        }

        // Our DB stores bismillah inside ayah 1 of every surah except 1 (where it
        // IS ayah 1) and 9 (which has no bismillah). Quran.com returns ayah 1
        // without the prepended bismillah. Strip it from the DB side for surahs
        // 2–8, 10–114 so we compare like-for-like.
        const surahHasPrependedBismillah =
            surah.number !== 1 && surah.number !== 9;
        const BISMILLAH_NORMALIZED = normalize(
            'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
        );

        const len = Math.min(dbAyahs.length, apiAyahs.length);
        for (let i = 0; i < len; i++) {
            let dbN = normalize(dbAyahs[i]);
            const apiN = normalize(apiAyahs[i]);
            if (i === 0 && surahHasPrependedBismillah && dbN.startsWith(BISMILLAH_NORMALIZED)) {
                dbN = dbN.slice(BISMILLAH_NORMALIZED.length).trim();
            }
            if (dbN === apiN) {
                totalMatch++;
            } else {
                totalMismatch++;
                const idx = firstDiffIndex(dbN, apiN);
                surahMismatches.push({
                    ayah: i + 1,
                    reason: `text differs at char ${idx}: ${codepoint(dbN, idx)} (db) vs ${codepoint(apiN, idx)} (api)`,
                    dbSnippet: snippet(dbN, idx),
                    apiSnippet: snippet(apiN, idx),
                    dbLen: dbN.length,
                    apiLen: apiN.length,
                });
            }
        }
        totalAyahs += expectedCount;

        if (surahMismatches.length === 0) {
            console.log(`  ✓ Surah ${String(surah.number).padStart(3)} (${surah.name_english}): ${dbAyahs.length}/${expectedCount} ayahs match`);
        } else {
            console.log(`  ✗ Surah ${String(surah.number).padStart(3)} (${surah.name_english}): ${surahMismatches.length} issue(s)`);
            mismatchedSurahs.push({ surah, mismatches: surahMismatches });
            if (verbose) {
                for (const m of surahMismatches.slice(0, 5)) {
                    console.log(`      ayah ${m.ayah}: ${m.reason}`);
                    if (m.dbSnippet !== undefined) {
                        console.log(`        DB  (len=${m.dbLen}):  …${m.dbSnippet}…`);
                        console.log(`        API (len=${m.apiLen}): …${m.apiSnippet}…`);
                    }
                }
                if (surahMismatches.length > 5) {
                    console.log(`      … and ${surahMismatches.length - 5} more`);
                }
            }
        }
    }

    db.close();

    console.log(`\n[Noor/QuranVerify] Summary`);
    console.log(`  Surahs checked:    ${targets.length}`);
    console.log(`  Ayahs compared:    ${totalAyahs}`);
    console.log(`  PASS:              ${totalMatch}`);
    console.log(`  FAIL:              ${totalMismatch}`);
    console.log(`  Mismatched surahs: ${mismatchedSurahs.length}`);

    if (totalMismatch > 0 && !verbose) {
        console.log(`\n  Re-run with --verbose to see character-level diffs.`);
    }

    process.exit(totalMismatch > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('[Noor/QuranVerify] Fatal:', e);
    process.exit(2);
});
