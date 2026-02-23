# 🌙 NOOR — نُور
## Islamic Companion App — Product Requirements Document

**Version:** 1.0  
**Date:** February 2026  
**Status:** Draft — For Development Review  
**Prepared by:** Product Team  

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Target Users & Personas](#2-target-users--personas)
3. [Feature Modules — Detailed Requirements](#3-feature-modules--detailed-requirements)
4. [UX & Design System](#4-ux--design-system)
5. [Technical Architecture](#5-technical-architecture)
6. [Database Design](#6-database-design)
7. [External APIs & Data Sources](#7-external-apis--data-sources)
8. [Monetization & Subscription Model](#8-monetization--subscription-model)
9. [Release Roadmap](#9-release-roadmap)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Appendix — Competitor Analysis](#12-appendix--competitor-analysis)

---

## 1. Executive Overview

### 1.1 Product Vision

> **"To be the most thoughtfully designed Islamic companion — one that seamlessly integrates worship tools into daily life with beauty, precision, and deep respect for tradition."**

**Noor** (نُور — Arabic for *Light*) is a comprehensive Islamic companion mobile application targeting the 1.9 billion global Muslim population. It consolidates prayer timings, the complete Holy Quran with multilingual translations and recitation, extensive Hadith libraries, Qibla direction, Islamic calendar, Tasbih counter, Dua collections, and more — into a single, beautifully minimal, offline-capable application.

### 1.2 Problem Statement

Existing Islamic applications suffer from:

- **Fragmentation** — users maintain 3–5 separate apps (Muslim Pro for prayer, Quran Majeed for Quran, Islam 360 for Hadith, etc.)
- **Monetization aggression** — Muslim Pro is notorious for banner ads even during Quran reading
- **Poor offline support** — core features fail without internet connectivity
- **Inconsistent translation quality** — machine-translated or unverified religious content
- **Limited localization** — poor Urdu, Bangla, Turkish, and regional language support
- **Heavy battery and storage footprint** — apps with bloated features drain device resources

### 1.3 Strategic Goals

| Goal | Target | Timeline |
|------|--------|----------|
| App Store Rating | ≥ 4.7 stars (iOS + Android) | 3 months post-launch |
| Active Users | 500,000 MAU | 12 months post-launch |
| Quran Completion Rate | 40% of users read 1+ Juz/month | 6 months |
| Pro Conversion | 8% free-to-paid conversion | 12 months |
| Supported Languages | 20+ translation languages | Launch |
| Offline Core Features | 100% of core features offline | Launch |

### 1.4 Competitive Positioning

| Feature | Noor | Muslim Pro | Islam 360 | Quran Majeed |
|---------|------|-----------|-----------|--------------|
| Ad-free free tier | ✅ Limited | ❌ Heavy ads | ✅ | ✅ |
| Complete Hadith Library | ✅ | ❌ | ✅ | ❌ |
| Word-by-word Quran | ✅ | ❌ | ✅ | ✅ |
| Offline-first | ✅ | Partial | Partial | ✅ |
| Tajweed Coloring | ✅ | ❌ | ✅ | ✅ |
| 99 Names with Audio | ✅ | ✅ | ✅ | ❌ |
| Hifz (Memorization) Mode | ✅ | ❌ | ❌ | ✅ |
| Islamic Articles/Knowledge | ✅ | ✅ | ✅ | ❌ |
| iOS/Android Widgets | ✅ | ✅ | ❌ | ❌ |

---

## 2. Target Users & Personas

### 2.1 User Segments

| Segment | Profile | Primary Features Used |
|---------|---------|----------------------|
| Daily Practitioner | Prays 5x daily, moderate tech savvy | Prayer times, Qibla, Tasbih, Adhkar |
| Quran Learner | Student, memorizer, or new reader | Translation, Word-by-word, Recitation, Hifz |
| Knowledge Seeker | University-educated, curious about Islam | Hadith, Tafsir, 99 Names, Articles |
| Ramadan User | Seasonal heavy user (Ramadan month) | Suhoor/Iftar, Taraweeh tracker, Khatm tracker |
| New Muslim / Convert | Discovering Islam, needs guidance | Onboarding, transliteration, beginner content |
| Diaspora Muslim | Living in non-Muslim majority country | Accurate local prayer, mosque finder |

### 2.2 Primary Persona

**Bilal Ahmed, 28 — Software Engineer, Lahore, Pakistan**
- Prays 5 times daily; misses occasional prayer due to work
- Currently uses Muslim Pro (dislikes ads), Quran Majeed, and WhatsApp Hadith groups
- Wants: one clean app, works without internet in the office basement, Urdu translations
- Device: Samsung Galaxy S24 Ultra | Storage conscious | 15–20 min/day app use
- Pain point: Prayer notification fires at wrong time during work meetings

### 2.3 Secondary Persona

**Aisha Khan, 19 — University Student, London, UK**
- Enrolled in online Tajweed course; memorizing Juz Amma
- Needs: word-by-word audio, color-coded Tajweed, bookmark system, dark mode
- Device: iPhone 15 Pro | Heavy Quran user — 45+ min/day
- Pain point: Audio doesn't sync with highlighted text in current app

### 2.4 Tertiary Persona

**Dr. Omar Farooq, 52 — GP Doctor, Toronto, Canada**
- Daily Hadith reader; references Hadith for Islamic rulings (Fiqh)
- Needs: full Hadith collections with grading, Arabic text, search by narrator or topic
- Device: iPad Pro (primary) + iPhone (secondary)
- Pain point: Islam 360 UI is outdated and search is too slow

---

## 3. Feature Modules — Detailed Requirements

---

### 3.1 Module 1: Prayer Times

The highest-frequency daily-use feature. Must be accurate, instant-loading, and highly configurable.

#### 3.1.1 Core Prayer Display

- Display all 5 obligatory prayers: **Fajr, Dhuhr, Asr, Maghrib, Isha**
- Additional times: Sunrise (Shuruq), Sunset, Islamic Midnight, Last Third of Night
- Live countdown timer to next prayer (updates every second)
- Visual progress bar between last and next prayer
- Current Hijri date alongside Gregorian date
- Prayer status indicators: Upcoming / Current / Passed

#### 3.1.2 Location & Calculation

- GPS auto-detection on first launch (permission prompt with clear explanation)
- Manual search: city/country autocomplete (10,000+ cities database, offline-capable)
- Saved locations list (up to 5 locations — e.g., home + office)
- Calculation methods supported:

| Method | Region |
|--------|--------|
| Karachi (University of Islamic Sciences) | Pakistan, Afghanistan, Bangladesh, India |
| Muslim World League (MWL) | Europe, Far East, parts of Americas |
| ISNA (Islamic Society of North America) | USA, Canada |
| Umm al-Qura University, Makkah | Saudi Arabia |
| Egyptian General Authority of Survey | Egypt, Africa |
| Institute of Geophysics (Tehran) | Iran, Shia communities |
| JAKIM | Malaysia |
| DIYANET | Turkey |
| Gulf Region (Dubai / Qatar) | UAE, Qatar, Bahrain |
| Singapore MUIS | Singapore |

- Madhab selector for Asr: Standard (Shafi/Maliki/Hanbali) vs. Hanafi
- Elevation adjustment for high-altitude users
- Summer time / DST auto-handling
- Hijri calendar offset: -1 / 0 / +1 day for local moon sighting differences

#### 3.1.3 Notifications & Adhan

- Per-prayer notification configuration: Adhan audio / Silent alarm / Disabled
- Built-in Adhan library:
  - Makkah (Sheikh Ali Ahmed Mulla)
  - Madinah (Sheikh Esam Bukhari)
  - Al-Azhar, Cairo (Egyptian style)
  - Short athan / Long athan options
  - Custom audio upload (Noor Pro)
- Pre-prayer reminder: configurable 5 / 10 / 15 / 30 minutes before
- Fajr: Optional Du'a after Adhan notification
- Jumu'ah (Friday): Reminder notification at user-set time before Khutbah
- iOS Critical Alerts support (bypasses Do Not Disturb for Fajr)
- Android: Foreground service for reliable delivery; full-volume channel for Fajr

#### 3.1.4 Widgets

- **iOS:** Lock Screen widget (next prayer + countdown), Home Screen Small (next prayer), Home Screen Medium (all 5 prayers)
- **Android:** 2x1 and 4x2 home screen widgets (resizable)
- Widget refreshes every minute; auto-updates at midnight for new day

#### 3.1.5 Monthly Timetable

- Full month view in tabular format
- Export to PDF or CSV
- Sync to iOS Calendar / Google Calendar (iCal format)

---

### 3.2 Module 2: Quran

The most complex and highest-value module. Supports reading, listening, memorization, and deep learning.

#### 3.2.1 Text & Typography

- Complete Quran: 114 Surahs, 30 Juz, 6,236 Ayat
- Arabic font: **KFGQPC Uthmani Script** (the official font used in all Saudi-printed Mushaf)
- Tajweed color-coded mode:
  - 🔴 Qalqala (echoing letters)
  - 🟢 Ghunna (nasalization)
  - 🔵 Madd (elongation rules)
  - 🟡 Idgham / Ikhfa
  - Full 10-color Tajweed system
- Adjustable font size: 14px to 56px with smooth slider
- Line height and letter spacing controls
- Transliteration (Roman script) toggle per ayah
- Verse numbers in Arabic-Indic or Western numerals

#### 3.2.2 Translations

20+ languages supported. Users can select up to 2 translations displayed simultaneously (side-by-side or sequential per ayah):

| Language | Primary Translation | Secondary Option |
|----------|--------------------|--------------------|
| English | Saheeh International | Yusuf Ali, Pickthall, Dr. Mustafa Khattab |
| Urdu | Maulana Fateh Muhammad Jalandhri | Maulana Abul Ala Mawdudi |
| Arabic (Classical commentary) | Al-Jalalayn | Ibn Kathir (abridged) |
| French | Muhammad Hamidullah | Si Hamza Boubakeur |
| Turkish | Diyanet Isleri Baskanligi | Suat Yildirim |
| Indonesian | Ministry of Religious Affairs | Muhammad Quraish Shihab |
| Malay | JAKIM | Abdullah Muhammad Basmeih |
| Bangla | Muhiuddin Khan | — |
| German | Bubenheim & Elyas | Ahmad von Denffer |
| Spanish | Julio Cortes | Abdel Ghani Melara |
| Russian | Elmir Kuliev | Osmanov |
| Persian/Farsi | Makarem Shirazi | Fooladvand |
| Chinese (Simplified) | Ma Jian | — |
| Tamil | Omar Sharif | — |
| Hausa | — | — |
| Swahili | — | — |
| Azerbaijani | — | — |
| Bosnian | Besim Korkut | — |
| Albanian | Sherif Ahmeti | — |
| + more | Community-contributed, scholar-reviewed | — |

#### 3.2.3 Audio Recitation

- **15+ Reciters available:**
  - Sheikh Mishary Rashid Al-Afasy (most popular globally)
  - Sheikh Abdul Rahman Al-Sudais (Imam of Masjid al-Haram)
  - Sheikh Saud Al-Shuraim
  - Sheikh Maher Al-Muaiqly
  - Sheikh Saad Al-Ghamdi
  - Sheikh Mahmoud Khalil Al-Husary (Mujawwad & Murattal)
  - Sheikh Muhammad Siddiq Al-Minshawi
  - Sheikh Abdul Basit Abdul Samad
  - Sheikh Yasser Al-Dosari
  - Sheikh Hani Ar-Rifai
  - Sheikh Muhammad Al-Tablawi
  - Sheikh Khalid Al-Jalil
  - Sheikh Nasser Al-Qatami
  - Sheikh Wadih Al-Yamani (for children)
  - Sheikh Ibrahim Al-Akhdar

- **Playback features:**
  - Streaming (WiFi / cellular) + offline download
  - Download per Surah, per Juz, or full Quran (~400MB per reciter)
  - **Ayah-by-ayah audio highlighting** — current ayah highlighted and auto-scrolls as audio plays
  - **Word-by-word audio sync** for Afasy and Husary (via segmented audio files)
  - Playback speed: 0.75x / 1.0x / 1.25x / 1.5x
  - Repeat: single ayah / ayah range / full surah / continuous playlist
  - Sleep timer: 15 / 30 / 60 min or end of current surah
  - Background playback with lock screen controls (AirPlay, Bluetooth, car audio)
  - CarPlay and Android Auto support

#### 3.2.4 Navigation

- Navigation modes:
  - By Surah (alphabetical / sequential)
  - By Juz (30 Juz)
  - By Hizb (60 Hizb)
  - By Page (matching the Madinah Mushaf page layout)
  - By Ruku / Manzil
- Go-to Ayah: jump directly to Surah:Ayah reference
- Continuous scroll (like reading a book) or page-flip mode

#### 3.2.5 Learning & Personalization

- **Bookmarks** — unlimited, with custom labels, color tags, and notes
- **Highlights** — 5 color options, sync to account across devices
- **Reading Position** — auto-saves on exit; resume prompt on next open
- **Daily Reading Goal** — set goal in pages, Juz, or ayat; progress ring widget
- **Khatm Tracker** — complete Quran completion tracker with date history
- **Tafsir** — inline access to:
  - Ibn Kathir (English, Urdu, Arabic)
  - Maariful Quran — Mufti Muhammad Shafi (Urdu/English)
  - Tafsir al-Jalalayn (Arabic/English)
  - Tafsir as-Sa'di (English)
- **Full-text Search** — search across Arabic text AND all installed translations simultaneously
- **Word-by-word Translation** — tap any word for instant Arabic root, translation, grammar role

#### 3.2.6 Hifz (Memorization) Mode — Noor Pro

- **Blank word mode** — words blanked out, tap to reveal
- **Spaced repetition system (SRS)** — uses SM-2 algorithm to schedule review sessions
- **Memorization progress tracker** — ayat/surah status: Not Started / Learning / Memorized / Needs Review
- **Audio-only mode** — tests recall by playing audio without showing text
- **Daily hifz reminder** notification

---

### 3.3 Module 3: Hadith Library

Full scholarly Hadith collection with grading, search, and cross-referencing.

#### 3.3.1 Collections Included

| Collection | Arabic Name | Approximate Count |
|-----------|-------------|-------------------|
| Sahih al-Bukhari | صحيح البخاري | 7,563 |
| Sahih Muslim | صحيح مسلم | 7,470 |
| Sunan Abu Dawood | سنن أبي داود | 5,274 |
| Jami at-Tirmidhi | جامع الترمذي | 3,956 |
| Sunan an-Nasa'i | سنن النسائي | 5,758 |
| Sunan Ibn Majah | سنن ابن ماجه | 4,341 |
| Muwatta Malik | موطأ مالك | 1,832 |
| Musnad Ahmad | مسند أحمد | 27,647 |
| Riyadh as-Salihin | رياض الصالحين | 1,906 |
| Al-Adab Al-Mufrad | الأدب المفرد | 1,322 |
| Forty Hadith (al-Nawawi) | الأربعون النووية | 42 |
| Bulugh al-Maram | بلوغ المرام | 1,597 |

#### 3.3.2 Features

- **Browse by:** Collection → Book → Chapter → Hadith number
- **Full-text search** across all collections (Arabic + English simultaneously)
- **Authenticity grading** displayed per hadith:
  - Sahih (Authentic) ✅
  - Hasan (Good) 🟡
  - Da'if (Weak) 🔴
  - Mawdu' (Fabricated) ⛔
  - Hasan Sahih, Sahih li-ghayrihi, etc.
- **Isnad (Chain of narration)** display with brief narrator biographies
- **Cross-reference** — link to same/related hadiths in other collections
- **Topic browser** — curated collections by theme: Iman, Salah, Zakat, Fasting, Hajj, Marriage, Business, Character, Manners, Jannah, Hellfire, Day of Judgment
- **Favorites and custom collections** — user-curated Hadith lists
- **Daily Hadith notification**
- **Share** as plain text, formatted card image, or with full reference chain
- **Arabic text** for every hadith with translation

---

### 3.4 Module 4: Qibla Compass

- Real-time compass pointing toward Masjid al-Haram, Makkah al-Mukarramah
- Uses device magnetometer via native platform API
- Bearing shown in degrees (e.g., 247°) with cardinal direction (WSW)
- Animated compass needle with smooth rotation
- Calibration guide triggered when compass accuracy is low (figure-8 motion)
- Works **fully offline** — direction calculated from device GPS coordinates
- GPS accuracy indicator
- Advanced: Toggle between Great Circle (geodesic) and Rhumb Line calculation
- Distance to Makkah displayed

---

### 3.5 Module 5: Islamic Calendar & Events

- Dual calendar: Hijri (Umm al-Qura) and Gregorian side-by-side
- Hijri date conversion tool — input any Gregorian date, get Hijri and vice versa
- Adjustable Hijri offset (-1 / 0 / +1) for regional moon sighting differences
- Highlighted Islamic events:
  - Ramadan start/end
  - Eid al-Fitr (1 Shawwal)
  - Eid al-Adha (10 Dhul Hijjah)
  - Ashura (10 Muharram)
  - Mawlid an-Nabi (12 Rabi al-Awwal)
  - Isra wal-Miraj (27 Rajab)
  - Laylat al-Qadr (27 Ramadan + surrounding odd nights)
  - First 10 days of Dhul Hijjah
  - Day of Arafah (9 Dhul Hijjah)
- **Ramadan Mode** (auto-activates during Ramadan):
  - Suhoor and Iftar countdown timers
  - Taraweeh prayer tracker (how many rakaat prayed)
  - Daily Quran reading target for Khatm in Ramadan
  - Laylat al-Qadr countdown (last 10 nights)
- Export events to iOS/Google Calendar (iCal format)

---

### 3.6 Module 6: Tasbih Counter

- Tap counter with **haptic feedback** per count
- Default dhikr cycle:
  1. سُبْحَانَ ٱللَّٰهِ (SubhanAllah) — 33 counts
  2. ٱلْحَمْدُ لِلَّٰهِ (Alhamdulillah) — 33 counts
  3. ٱللَّٰهُ أَكْبَرُ (Allahu Akbar) — 34 counts
  → Auto-reset and cycle to next dhikr
- **Custom Dhikr** — define any Arabic phrase, set target count (1–1000), cycle count
- **Session history** — log with date/time and dhikr performed
- **Cumulative statistics** — lifetime total counts, average per day, streaks
- Vibration at completion of each cycle
- **Background mode** — count from notification or lock screen (Noor Pro)
- Large counter display for easy tap accuracy

---

### 3.7 Module 7: Dua & Adhkar

- Complete **Fortress of the Muslim** (Hisnul Muslim) — 200+ authenticated duas
- **Categories:**
  - Morning Adhkar (Adhkar as-Sabah) — 22 items with counts
  - Evening Adhkar (Adhkar al-Masa') — 22 items with counts
  - After Fardh Prayer adhkar sequence
  - Before/After eating, drinking, entering home, leaving home
  - Entering/Leaving Masjid
  - Before sleep / Upon waking
  - Entering/Exiting bathroom
  - Sneezing etiquette duas
  - Travelling duas
  - Dua for rain, thunder, seeing the moon
  - Dua when in difficulty, illness, grief
  - Dua for parents
  - Dua for entering Jannah
- Each dua includes: Arabic text, transliteration, English translation, source reference, virtue/reward
- **Audio recitation** for major adhkar sets
- **Guided Adhkar mode** — step-by-step mode with count tracking for Morning/Evening
- **Daily dua notification** — one dua per day
- **Offline-first** — all content pre-bundled in app, no network required

---

### 3.8 Module 8: 99 Names of Allah (Asma ul-Husna)

- All 99 names with:
  - Arabic calligraphic display
  - Transliteration
  - English meaning (literal + explained)
  - Urdu meaning
  - Detailed explanation of the Name's significance
  - Quranic references where the Name appears
  - Audio pronunciation (by a qualified reciter)
- **Daily Name notification** — one name per day with its meaning
- **Memorization quiz** — multiple choice, fill-in-the-blank, matching modes
- **Share as card** — beautifully designed image card for social sharing (Instagram, WhatsApp)
- Organized by root word groupings

---

### 3.9 Module 9: Mosque Finder

- Map view using device GPS location
- Data source: Google Places API + community-contributed data
- Show distance and walking/driving time to each mosque
- **Mosque details:**
  - Prayer times (where available)
  - Jumu'ah time
  - Women's section available (Y/N)
  - Parking availability
  - Accessibility (wheelchair)
  - Contact number / website
- **Filter options:** Open now / Women's section / Parking / Distance radius
- **Directions** — opens Apple Maps or Google Maps
- **Community submissions** — users can add/correct mosque information (moderated)

---

### 3.10 Module 10: Islamic Knowledge Hub (Noor Pro)

- **Short-form articles** by qualified Islamic scholars:
  - Aqeedah (Islamic theology fundamentals)
  - Fiqh basics (Islamic jurisprudence — Hanafi, Maliki, Shafi, Hanbali)
  - Seerah (Biography of Prophet Muhammad ﷺ)
  - Sahaba Profiles (Companions of the Prophet)
  - Islamic History timeline — illustrated, interactive
- **Prophets of Islam** — illustrated stories of all 25 prophets mentioned in Quran
- **Five Pillars deep-dive** — comprehensive guides
- **Islamic Etiquette (Adab)** — guide to Islamic manners in daily life
- **Scholar-verified badge** — all content reviewed by qualified Islamic scholars (named)
- Content available **offline** after first load (cached)

---

## 4. UX & Design System

### 4.1 Design Philosophy

Noor's design language rests on three pillars:

1. **Reverence** — Arabic Quran text is always treated as sacred content. Generous spacing, premium typography, no ads adjacent to Quranic text. Ever.
2. **Clarity** — One primary action per screen. Zero ambiguity in navigation. Prayer times visible in 1 tap from anywhere.
3. **Calm** — Dark mode is the default. Colors drawn from nature: deep forest greens, warm candlelight golds, aged parchment whites. No aggressive CTAs.

### 4.2 Themes

| Theme | Background | Surface | Primary Text | Accent |
|-------|-----------|---------|-------------|--------|
| Dark (Default) | `#0C0F0E` | `#1A1F1D` | `#E8E6E1` | `#C9A84C` (Gold) |
| Light | `#F8F6F0` | `#EEEBE3` | `#1A1A1A` | `#1F4E3D` (Forest Green) |
| Ramadan Special | `#070A1A` | `#0E1228` | `#E8E6E1` | `#C9A84C` + star motifs |

### 4.3 Color Tokens

```
--color-primary:       #1F4E3D   /* Forest Green — actions, headers */
--color-primary-light: #2E7D52   /* Mid Green — hover states */
--color-accent:        #C9A84C   /* Gold — highlights, Arabic numerals, active state */
--color-accent-light:  #E8C96A   /* Light Gold — glow effects */
--color-bg:            #0C0F0E   /* Main background (dark) */
--color-surface:       #1A1F1D   /* Cards, modals */
--color-border:        rgba(255,255,255,0.07)
--color-text:          #E8E6E1   /* Primary text */
--color-text-2:        #9A9590   /* Secondary text */
--color-text-3:        #5E5C58   /* Placeholder/hint */
```

### 4.4 Typography Stack

| Usage | Font | Weight | Notes |
|-------|------|--------|-------|
| Quran Arabic | KFGQPC Uthmani Script | Regular | Official Saudi Mushaf font |
| Arabic UI | Amiri | 400, 700 | Classical Arabic elegance |
| Urdu content | Jameel Noori Nastaleeq | Regular | Standard Urdu print font |
| App headings | Playfair Display | 400–600 | Serif — classical authority |
| Body & UI | DM Sans | 300–500 | Clean, high legibility |
| Numbers/times | DM Mono | 400 | Tabular numerals for countdown |

### 4.5 Navigation Architecture

```
Bottom Tab Bar (Mobile):
├── 🕌  Home (Prayer Times)
├── 📖  Quran
├── 📜  Hadith
├── 🔍  Discover (Dua, 99 Names, Calendar)
└── 👤  Profile / Settings

Persistent Elements:
├── Mini Audio Player (above tab bar, during Quran playback)
├── Prayer Countdown Widget (home screen only)
└── Global Search (tap magnifier from any screen)

Gestures:
├── Swipe left/right between Quran ayahs
├── Swipe down to dismiss full-screen player (back to mini)
├── Long-press ayah → context menu (bookmark, share, tafsir, copy)
└── Pinch to resize Arabic font (Quran screen)
```

### 4.6 Accessibility Standards

- WCAG 2.1 Level AA minimum compliance; AAA for all Quran text
- Full VoiceOver (iOS) and TalkBack (Android) support
- Dynamic Type — respects iOS/Android system font size settings
- Reduce Motion — disables non-essential animations
- High Contrast mode
- RTL (Right-to-Left) full layout support for Arabic and Urdu interface languages
- Minimum touch target: 44×44 pt (Apple HIG standard)

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────┐
│                   CLIENT LAYER                   │
│  iOS App (RN)  │  Android App (RN)  │  Web (Next)│
└────────────────────┬────────────────────────────┘
                     │ HTTPS / WSS
┌────────────────────▼────────────────────────────┐
│                   API GATEWAY                    │
│         AWS API Gateway / Cloudflare Workers     │
└──────┬─────────────┬──────────────┬─────────────┘
       │             │              │
┌──────▼──┐   ┌──────▼──┐   ┌──────▼──────┐
│  Auth   │   │ Content │   │   Personali │
│ Service │   │   API   │   │  zation API │
│(Supabase│   │ (Node)  │   │   (Node)    │
└──────┬──┘   └──────┬──┘   └──────┬──────┘
       │             │              │
┌──────▼─────────────▼──────────────▼──────┐
│              DATABASE LAYER               │
│  PostgreSQL (Supabase) + Redis (Upstash)  │
└──────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│           STORAGE & CDN LAYER            │
│  Supabase Storage + Cloudflare CDN       │
│  (Audio files, images, offline bundles)  │
└─────────────────────────────────────────┘
```

### 5.2 Mobile App Stack

```
Framework:        React Native 0.73+ with Expo SDK 50
Language:         TypeScript (strict mode)
Navigation:       React Navigation v6 (native stack)
State:            Zustand (global) + React Query v5 (server cache)
Styling:          StyleSheet API + custom design token system
Storage:          MMKV (fast key-value) + SQLite via expo-sqlite
Audio:            React Native Track Player v4
Animations:       Reanimated v3 + Gesture Handler v2
Maps:             React Native Maps (Apple Maps / Google Maps)
Compass:          expo-sensors (Magnetometer)
Location:         expo-location
Notifications:    expo-notifications + Firebase Cloud Messaging
Calendar:         expo-calendar (iCal export)
Offline:          react-query persister + SQLite offline DB
i18n:             i18next + react-i18next (RTL-aware)
Fonts:            expo-font
OTA Updates:      Expo Updates (EAS Update)
Build:            EAS Build (CI/CD)
```

### 5.3 Web App Stack

```
Framework:        Next.js 14 (App Router)
Language:         TypeScript
UI Components:    Tailwind CSS + Radix UI primitives
State:            Zustand + TanStack Query
Auth:             Supabase Auth (shared with mobile)
Admin Panel:      Next.js + shadcn/ui
Deployment:       Vercel (main) + Cloudflare Pages (backup)
```

### 5.4 Backend Stack

```
Runtime:          Node.js 20 LTS
Framework:        Fastify v4 (high performance REST API)
Language:         TypeScript
Auth:             Supabase Auth (JWT, OAuth providers)
API Gateway:      AWS API Gateway v2 (HTTP API)
Queue:            AWS SQS (notification delivery)
Scheduler:        AWS EventBridge (daily prayer time recalc, daily Hadith push)
CDN:              Cloudflare (audio files, static assets)
Monitoring:       Sentry (errors) + Grafana + Prometheus (metrics)
Logs:             AWS CloudWatch
Secrets:          AWS Secrets Manager
```

### 5.5 Core Libraries & SDKs

| Purpose | Library | Notes |
|---------|---------|-------|
| Prayer time calculation | `adhan-js` | Offline, supports all methods, TypeScript |
| Quran text & translation | Quran.com API + local SQLite bundle | Full offline fallback |
| Hadith data | Sunnah.com API + local SQLite bundle | Full offline fallback |
| Audio playback | `react-native-track-player` v4 | Background audio, lock screen controls |
| Compass | `expo-sensors` Magnetometer | Native accuracy |
| Maps | `react-native-maps` | Apple Maps (iOS) / Google Maps (Android) |
| Notifications | `expo-notifications` + FCM | Cross-platform push |
| Offline DB | `expo-sqlite` + SQLite | Full Quran + Hadith stored locally |
| Caching | `MMKV` | 10x faster than AsyncStorage |
| HTTP Client | `axios` + React Query | Retry, caching, background sync |
| Authentication | Supabase Auth | Email, Google, Apple Sign-In |
| Crash reporting | Sentry React Native | Error tracking |
| Analytics | PostHog (self-hosted) | Privacy-respecting analytics |
| Hifz SRS | Custom SM-2 implementation | Spaced repetition for memorization |
| i18n | `i18next` | 20+ languages, RTL support |
| PDF Export | `react-native-html-to-pdf` | Timetable export |

---

## 6. Database Design

### 6.1 Database Technology Choices

| Database | Use Case | Technology |
|----------|----------|-----------|
| Primary DB | User accounts, progress, settings, bookmarks | PostgreSQL (via Supabase) |
| Cache | Session data, prayer time cache, daily content | Redis (Upstash) |
| Local Mobile DB | Quran text, Hadith, Duas, 99 Names (offline) | SQLite (bundled in app) |
| Search Index | Hadith full-text search | PostgreSQL FTS (tsvector) |
| Object Storage | Audio files, images, app bundles | Supabase Storage + Cloudflare CDN |

### 6.2 PostgreSQL Schema (Supabase)

#### Users & Auth

```sql
-- Managed by Supabase Auth, extended with:
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
```

#### Prayer & Ibadah Tracking

```sql
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
```

#### Quran Progress & Personalization

```sql
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
```

#### Hadith Favorites

```sql
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
```

#### Subscriptions & Payments

```sql
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
```

### 6.3 SQLite Local Database Schema (Mobile — Bundled)

The offline SQLite database is bundled with the app at install time and covers all core content:

```sql
-- Quran
CREATE TABLE surahs (
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

CREATE TABLE ayahs (
  id INTEGER PRIMARY KEY,                  -- composite: surah*1000 + ayah
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  text_uthmani TEXT NOT NULL,              -- full Uthmani Arabic text
  text_simple TEXT,                        -- simplified Arabic for search
  juz_number INTEGER,
  page_number INTEGER,
  sajda_type TEXT,                         -- "obligatory" | "recommended" | NULL
  FOREIGN KEY (surah_number) REFERENCES surahs(number)
);

CREATE TABLE translations (
  ayah_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  translator_slug TEXT NOT NULL,           -- "saheeh_international", "jalanhri_urdu"
  text TEXT NOT NULL,
  PRIMARY KEY (ayah_id, language_code, translator_slug)
);

CREATE TABLE word_translations (
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
CREATE TABLE hadith_collections (
  slug TEXT PRIMARY KEY,
  name_english TEXT NOT NULL,
  name_arabic TEXT NOT NULL,
  total_hadiths INTEGER
);

CREATE TABLE hadiths (
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

CREATE VIRTUAL TABLE hadiths_fts USING fts5(
  hadith_id UNINDEXED,
  english_text,
  arabic_text,
  content=hadiths,
  content_rowid=id
);

-- Duas
CREATE TABLE dua_categories (
  id INTEGER PRIMARY KEY,
  name_english TEXT NOT NULL,
  name_arabic TEXT,
  icon TEXT,
  sort_order INTEGER
);

CREATE TABLE duas (
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
CREATE TABLE asma_ul_husna (
  number INTEGER PRIMARY KEY,
  arabic_name TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  meaning_en TEXT NOT NULL,
  meaning_ur TEXT,
  explanation TEXT,
  quran_references TEXT                    -- JSON array of surah:ayah refs
);
```

### 6.4 Redis Cache Structure (Upstash)

```
prayer:lahore:2026-02-20        TTL: 24h   -- Calculated prayer times for city+date
daily:hadith:en:2026-02-20      TTL: 24h   -- Hadith of the day
daily:ayah:en:2026-02-20        TTL: 24h   -- Ayah of the day
user:session:{user_id}          TTL: 7d    -- Session data
user:pro:{user_id}              TTL: 1h    -- Pro status cache
mosque:nearby:{lat}:{lng}       TTL: 6h    -- Nearby mosques cache
```

---

## 7. External APIs & Data Sources

### 7.1 Quran Content

| Resource | URL / Package | License | Usage |
|----------|---------------|---------|-------|
| Quran.com API v4 | `api.quran.com/api/v4` | Free for non-commercial | Real-time translation fetch, reciter metadata |
| Tanzil Quran Text | `tanzil.net` | Creative Commons | Uthmani text — bundled in SQLite |
| KFGQPC Uthmani Font | King Fahd Complex | Free for Islamic use | Arabic Quran font |
| EveryAyah Audio | `everyayah.com` | Free for Islamic apps | Per-reciter audio files (MP3) |
| QuranicAudio.com | `quranicaudio.com` | Free for Islamic apps | Supplementary audio source |
| Verses (word-by-word) | `quranwbw.com` | Open | Word-by-word data |

### 7.2 Hadith Content

| Resource | URL | License | Usage |
|----------|-----|---------|-------|
| Sunnah.com API | `sunnah.com/api` | Free, attribution required | All Hadith collections |
| HadithAPI.com | `hadithapi.com` | Free tier available | Backup source |

### 7.3 Prayer Times

| Resource | Package | Notes |
|----------|---------|-------|
| Adhan.js | `npm: adhan` | Primary calculation — fully offline, MIT license |
| Aladhan.com API | `aladhan.com/prayer-times-api` | Fallback API if local calc fails |

### 7.4 Location & Maps

| Resource | Usage | Cost |
|----------|-------|------|
| Google Maps Platform (Places API) | Mosque finder, city autocomplete | Pay-per-use (~$0.017/request) |
| Mapbox | Map display (potential alternative — better pricing) | Free tier 50K loads/month |
| OpenStreetMap + Overpass API | Mosque data (community-sourced) | Free |
| GeoNames | City/country database for offline location search | Free, attribution required |

### 7.5 Notifications & Infrastructure

| Service | Usage | Cost |
|---------|-------|------|
| Firebase Cloud Messaging (FCM) | Android push notifications | Free |
| Apple Push Notification Service (APNs) | iOS push notifications | Free (requires Apple Developer account) |
| Expo Push Notifications | Unified push service layer | Free up to 10K/month |
| AWS SES | Transactional email (welcome, receipt) | $0.10 / 1,000 emails |

### 7.6 Payments

| Platform | Usage | Fee |
|----------|-------|-----|
| Apple In-App Purchase (StoreKit 2) | iOS subscription billing | 15–30% Apple commission |
| Google Play Billing | Android subscription billing | 15–30% Google commission |
| Stripe | Web subscriptions + one-time payments | 2.9% + $0.30 per transaction |
| RevenueCat | Subscription management SDK (cross-platform) | Free up to $2,500 MRR |

### 7.7 Analytics & Monitoring

| Service | Purpose | Privacy |
|---------|---------|---------|
| PostHog (self-hosted) | Product analytics, funnels, session replay | GDPR compliant, data owned by us |
| Sentry | Crash reporting + performance monitoring | Standard |
| Grafana + Prometheus | Backend infrastructure metrics | Self-hosted |
| AWS CloudWatch | Log aggregation | AWS-managed |

---

## 8. Monetization & Subscription Model

### 8.1 Free Tier (Noor Free)

All core features are free — permanently. Free users are never shown ads adjacent to Quran or prayer content.

| Feature | Free |
|---------|------|
| Prayer times (all 5 + extras) | ✅ |
| Complete Quran reading | ✅ |
| 2 translations | ✅ |
| 5 reciters (streaming) | ✅ |
| Offline: Al-Fatiha + Juz Amma only | ✅ |
| Hadith (Bukhari + Muslim only) | ✅ |
| Qibla compass | ✅ |
| Basic Tasbih | ✅ |
| Morning/Evening Adhkar | ✅ |
| 99 Names | ✅ |
| Islamic Calendar | ✅ |
| Mosque Finder | ✅ |
| Widget (next prayer only) | ✅ |
| 3 bookmarks per month | ✅ |

### 8.2 Noor Pro Subscription

| Feature | Noor Pro |
|---------|----------|
| All Quran translations (20+) | ✅ |
| All reciters (15+) | ✅ |
| Full offline Quran download (any reciter) | ✅ |
| All Hadith collections (12+) | ✅ |
| Hifz (Memorization) mode + SRS | ✅ |
| Full-text Hadith search | ✅ |
| All Tafsir libraries | ✅ |
| Word-by-word audio sync | ✅ |
| Unlimited bookmarks + highlights | ✅ |
| Multiple saved locations | ✅ |
| Prayer history & statistics | ✅ |
| Custom Adhan upload | ✅ |
| All widgets (full prayer times) | ✅ |
| Dark/light/Ramadan themes | ✅ |
| Islamic Knowledge Hub articles | ✅ |
| Background Tasbih counter | ✅ |
| Quran reading statistics | ✅ |
| Priority customer support | ✅ |
| No ads (entire app) | ✅ |

### 8.3 Pricing

| Plan | Price (USD) | Notes |
|------|------------|-------|
| Monthly | $2.99/month | Cancel anytime |
| Yearly | $19.99/year | ~44% savings vs monthly |
| Lifetime | $49.99 one-time | Limited early access offer |
| Family (6 users) | $29.99/year | Shared Pro benefits |
| Student Discount | $12.99/year | With .edu email verification |
| Ramadan Special | $9.99/year | Offered during Ramadan only |

**Regional Pricing:** Localized pricing for Pakistan (~PKR 399/month), Indonesia, Turkey, Egypt, and other key markets at ~30–50% of USD price.

### 8.4 Free Trial

- 30-day free trial of Noor Pro for all new users (no credit card required)
- Ramadan: Extended 40-day free trial during Ramadan month

---

## 9. Release Roadmap

### Phase 1 — Foundation (Months 1–3)
**Goal:** Core functionality, stable, polished MVP

- Prayer times with GPS, all calculation methods, adhan notifications
- Complete Quran (Uthmani text + 5 translations + 5 reciters, streaming)
- Qibla compass
- Basic Tasbih
- Morning/Evening Adhkar (Hisnul Muslim)
- 99 Names of Allah
- Islamic Calendar
- User accounts (email + Google/Apple Sign-In)
- iOS + Android launch
- Urdu + English + Arabic interface languages
- App Store & Google Play submission

### Phase 2 — Content Depth (Months 4–6)
**Goal:** Expand content, add Pro features, improve retention

- All 12 Hadith collections with search
- All 15+ reciters
- Word-by-word Quran translation
- Tajweed color-coding
- Full offline Quran download (per reciter)
- Mosque finder (Google Places integration)
- Quran bookmarks, highlights, reading progress
- Tafsir (Ibn Kathir + Maariful Quran)
- Prayer history & statistics
- Noor Pro subscription launch (RevenueCat)
- Push notification system (daily Hadith, daily Ayah)
- iOS Widgets (Lock Screen + Home Screen)
- Android Widgets

### Phase 3 — Learning & Growth (Months 7–9)
**Goal:** Hifz platform, social features, growth loops

- Hifz (Memorization) mode with SRS algorithm
- Quran reading goals & streaks
- Ramadan Mode (full feature set)
- Islamic Knowledge Hub articles (20+ articles at launch)
- Share as card feature (Hadith, Ayah, Dua image cards)
- CarPlay + Android Auto support
- Multi-language interface expansion (Turkish, French, Indonesian, Bangla)
- Family plan subscription
- Web app (Next.js) — basic feature set

### Phase 4 — Scale & Community (Months 10–12)
**Goal:** Community features, platform expansion

- Community mosque submissions
- User-submitted dua (moderated)
- Quran class / group hifz tracking
- Live Islamic events (Ramadan countdown, Eid announcements)
- iPad + Android tablet optimized layout
- Apple Watch complication (next prayer time)
- Android Wear OS app
- Web app full feature parity
- Localization: 20 interface languages complete

---

## 10. Success Metrics & KPIs

### 10.1 Acquisition

| Metric | Month 3 Target | Month 12 Target |
|--------|---------------|-----------------|
| Total Downloads | 50,000 | 1,000,000 |
| Monthly Active Users (MAU) | 30,000 | 500,000 |
| Daily Active Users (DAU) | 12,000 | 200,000 |
| DAU/MAU Ratio | 40% | 40% |
| App Store Rating (avg) | 4.5+ | 4.7+ |
| App Store Reviews | 500+ | 10,000+ |

### 10.2 Engagement

| Metric | Target |
|--------|--------|
| Average sessions per day per user | 4–6 (prayer times) |
| Average session duration | 8 min |
| Quran module open rate | 60% of DAU |
| Prayer notification open rate | 35% |
| Day 7 retention | 45% |
| Day 30 retention | 30% |
| Day 90 retention | 22% |

### 10.3 Revenue

| Metric | Month 6 | Month 12 |
|--------|---------|----------|
| Noor Pro subscribers | 2,000 | 25,000 |
| Monthly Recurring Revenue (MRR) | $4,000 | $50,000 |
| Annual Recurring Revenue (ARR) | — | $600,000 |
| Free-to-Pro conversion rate | 5% | 8% |
| Average Revenue Per Paying User | $2.50/mo | $2.50/mo |

### 10.4 Content Quality

| Metric | Target |
|--------|--------|
| Translation accuracy (scholar review pass rate) | 100% |
| Prayer time accuracy vs. local authority | ≤ 1 minute deviation |
| Audio availability uptime | 99.9% |
| App crash rate | < 0.1% |
| API response time (p95) | < 300ms |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Prayer time inaccuracy (wrong calculation method for region) | Medium | High | Default to most common local method; allow user override; partner with local Islamic authorities for verification |
| Copyright issues with Quran audio files | Low | High | Use only openly-licensed sources (EveryAyah, QuranicAudio); obtain explicit permission from reciters' estates |
| Translation quality controversy | Medium | High | All translations sourced from established published works; scholar review badge; user reporting mechanism |
| App Store rejection (religious content policies) | Low | High | Follow App Store guidelines strictly; avoid any political content; no Hadith grading controversy in UI |
| Offline database size too large | Medium | Medium | Quran SQLite ~15MB; Hadith ~50MB; offer selective downloads for Hadith; use SQLite compression |
| Adhan notification delivery failure (iOS) | Medium | Medium | Implement local notifications (no network required) as primary; push as secondary; Critical Alerts entitlement for Fajr |
| Localization errors in Urdu/Arabic UI | Medium | Medium | Native speaker review for all RTL languages; community beta program |
| Competition from Muslim Pro/Islam 360 copying features | High | Low | Noor's advantage is UX quality and offline-first architecture — not easily copied quickly |

---

## 12. Appendix — Competitor Analysis

### Muslim Pro
- **Strengths:** 120M+ downloads, brand recognition, comprehensive feature set, localized heavily
- **Weaknesses:** Aggressive ads (even in Quran reading), history of data privacy controversy (2020), cluttered UI, no full Hadith library, weak Hifz tools
- **Noor advantage:** No ads in Quran, privacy-first, cleaner UX, offline-first

### Islam 360
- **Strengths:** Excellent Hadith library, Quran with full Tafsir, popular in Pakistan/South Asia
- **Weaknesses:** Outdated UI (looks like a 2012 app), Android-only for years, no iOS polish, heavy app size, limited reciter options
- **Noor advantage:** Modern design, iOS + Android parity, better Quran audio

### Quran Majeed (Pakistan Data Management)
- **Strengths:** Excellent Arabic font, good Urdu translations, decent reciter selection
- **Weaknesses:** No Hadith library, limited to Quran/prayer, aging UI, subscription is expensive for South Asian users
- **Noor advantage:** Consolidated feature set, Hadith library, better pricing for Pakistan market

### Key Differentiators for Noor

1. **Design quality** — Genuinely beautiful, prayer-worthy UI
2. **Offline-first** — 100% core functionality without internet
3. **No ads near sacred content** — Quran reader is always ad-free
4. **Hifz platform** — SRS-based memorization not available in competitors
5. **Unified experience** — Replaces 3–4 apps in one
6. **Privacy** — No data selling, self-hosted analytics, transparent data policy

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Jan 2026 | Product Team | Initial draft |
| 0.9 | Feb 2026 | Product Team | Added DB schema, API table, monetization |
| 1.0 | Feb 2026 | Product Team | Final review, competitor analysis added |

---

*This document is confidential and intended for internal development and investor use only.*

*بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ*
