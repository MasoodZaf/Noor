-- SQLite Schema for Noor App (Offline Mobile Database)

-- Quran
CREATE TABLE IF NOT EXISTS surahs (
  number INTEGER PRIMARY KEY,
  name_arabic TEXT NOT NULL,
  name_english TEXT NOT NULL,
  name_transliteration TEXT NOT NULL,
  revelation_type TEXT CHECK (revelation_type IN ('meccan','medinan')),
  ayah_count INTEGER NOT NULL,
  juz_start INTEGER,
  page_start INTEGER,
  audio_duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS ayahs (
  id INTEGER PRIMARY KEY,                  -- composite: surah*1000 + ayah
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  text_arabic TEXT NOT NULL,               -- full Uthmani Arabic text
  text_english TEXT,
  text_urdu TEXT,
  juz_number INTEGER,
  page_number INTEGER,
  sajda_type TEXT,                         -- "obligatory" | "recommended" | NULL
  FOREIGN KEY (surah_number) REFERENCES surahs(number)
);

CREATE TABLE IF NOT EXISTS translations (
  ayah_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  translator_slug TEXT NOT NULL,           -- "saheeh_international", "jalanhri_urdu"
  text TEXT NOT NULL,
  PRIMARY KEY (ayah_id, language_code, translator_slug)
);

CREATE TABLE IF NOT EXISTS word_translations (
  ayah_id INTEGER NOT NULL,
  word_position INTEGER NOT NULL,
  arabic_text TEXT NOT NULL,
  transliteration TEXT,
  translation_en TEXT,
  root_word TEXT,
  grammar_role TEXT,
  PRIMARY KEY (ayah_id, word_position)
);

-- Hadith
CREATE TABLE IF NOT EXISTS hadith_collections (
  slug TEXT PRIMARY KEY,
  name_english TEXT NOT NULL,
  name_arabic TEXT NOT NULL,
  total_hadiths INTEGER
);

CREATE TABLE IF NOT EXISTS hadiths (
  id INTEGER PRIMARY KEY,
  collection_slug TEXT NOT NULL,
  hadith_number TEXT NOT NULL,
  book_number INTEGER,
  book_name TEXT,
  chapter_name TEXT,
  arabic_text TEXT,
  english_text TEXT NOT NULL,
  urdu_text TEXT,
  grade TEXT,                              -- "Sahih", "Hasan", "Da'if"
  grade_source TEXT,                       -- who graded it
  narrator_chain TEXT,
  FOREIGN KEY (collection_slug) REFERENCES hadith_collections(slug)
);

CREATE VIRTUAL TABLE IF NOT EXISTS hadiths_fts USING fts5(
  english_text,
  arabic_text,
  content=hadiths,
  content_rowid=id
);

-- Duas
CREATE TABLE IF NOT EXISTS dua_categories (
  id INTEGER PRIMARY KEY,
  name_english TEXT NOT NULL,
  name_arabic TEXT,
  icon TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS duas (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL,
  title TEXT,
  arabic_text TEXT NOT NULL,
  transliteration TEXT,
  translation_en TEXT NOT NULL,
  translation_ur TEXT,
  source TEXT,
  count_target INTEGER DEFAULT 1,
  sort_order INTEGER,
  FOREIGN KEY (category_id) REFERENCES dua_categories(id)
);

-- 99 Names
CREATE TABLE IF NOT EXISTS asma_ul_husna (
  id INTEGER PRIMARY KEY,
  name_arabic TEXT NOT NULL,
  name_transliteration TEXT NOT NULL,
  meaning_en TEXT NOT NULL,
  meaning_ur TEXT,
  description_en TEXT,
  audio_url TEXT,
  found_in_quran TEXT,                     -- e.g. "Al-Hashr 59:22"
  sort_order INTEGER
);
