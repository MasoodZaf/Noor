-- Supabase Schema for Noor App

-- Users & Auth
CREATE TABLE user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name    TEXT,
  avatar_url      TEXT,
  madhab          TEXT DEFAULT 'shafi' CHECK (madhab IN ('hanafi','shafi','maliki','hanbali')),
  calculation_method TEXT DEFAULT 'karachi',
  language_code   TEXT DEFAULT 'en',
  translation_ids TEXT[] DEFAULT ARRAY['saheeh_international'],
  theme           TEXT DEFAULT 'dark' CHECK (theme IN ('dark','light','system')),
  is_pro          BOOLEAN DEFAULT FALSE,
  pro_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,           -- "Home", "Office", "Lahore"
  city            TEXT NOT NULL,
  country_code    TEXT NOT NULL,
  latitude        DECIMAL(10,6) NOT NULL,
  longitude       DECIMAL(10,6) NOT NULL,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Prayer & Ibadah Tracking
CREATE TABLE prayer_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  prayer_date     DATE NOT NULL,
  prayer_name     TEXT NOT NULL CHECK (prayer_name IN ('fajr','dhuhr','asr','maghrib','isha')),
  status          TEXT NOT NULL CHECK (status IN ('ontime','qada','missed','skipped')),
  logged_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prayer_date, prayer_name)
);

CREATE TABLE tasbih_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  dhikr_text      TEXT NOT NULL,           -- "سُبْحَانَ ٱللَّٰهِ"
  dhikr_name      TEXT NOT NULL,           -- "SubhanAllah"
  count           INTEGER NOT NULL,
  target          INTEGER,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Quran Progress & Personalization
CREATE TABLE quran_bookmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  surah_number    SMALLINT NOT NULL CHECK (surah_number BETWEEN 1 AND 114),
  ayah_number     SMALLINT NOT NULL,
  label           TEXT,
  color           TEXT DEFAULT 'gold',
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quran_highlights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  surah_number    SMALLINT NOT NULL,
  ayah_number     SMALLINT NOT NULL,
  color           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quran_reading_progress (
  user_id         UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_surah      SMALLINT,
  last_ayah       SMALLINT,
  last_juz        SMALLINT,
  total_ayat_read INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  last_read_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Hifz (memorization) tracking
CREATE TABLE hifz_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  surah_number    SMALLINT NOT NULL,
  ayah_number     SMALLINT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('not_started','learning','memorized','needs_review')),
  srs_due_date    DATE,                    -- SM-2 next review date
  srs_interval    INTEGER DEFAULT 1,       -- SM-2 interval in days
  srs_easiness    DECIMAL(3,2) DEFAULT 2.5, -- SM-2 easiness factor
  srs_repetitions INTEGER DEFAULT 0,
  last_reviewed   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, surah_number, ayah_number)
);

-- Hadith Favorites
CREATE TABLE hadith_favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  collection_slug TEXT NOT NULL,           -- "bukhari", "muslim", etc.
  hadith_number   TEXT NOT NULL,
  collection_name TEXT,
  hadith_preview  TEXT,                    -- first 100 chars for display
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, collection_slug, hadith_number)
);

CREATE TABLE hadith_collections_custom (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hadith_collection_items (
  collection_id   UUID REFERENCES hadith_collections_custom(id) ON DELETE CASCADE,
  collection_slug TEXT NOT NULL,
  hadith_number   TEXT NOT NULL,
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(collection_id, collection_slug, hadith_number)
);

-- Subscriptions & Payments
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  plan            TEXT NOT NULL CHECK (plan IN ('monthly','yearly','lifetime')),
  status          TEXT NOT NULL CHECK (status IN ('active','cancelled','expired','trial')),
  provider        TEXT NOT NULL CHECK (provider IN ('apple','google','stripe','promo')),
  provider_sub_id TEXT,                    -- Apple/Google/Stripe subscription ID
  started_at      TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);