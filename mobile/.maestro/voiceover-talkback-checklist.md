# Falah — VoiceOver / TalkBack Verification Checklist

A 25-30 minute manual pass. Each item is a `[ ]` checkbox — tick when verified.
Fail any → file as a fix-up issue with screen + element + what was heard.

---

## 0. Setup (2 min)

### iOS Simulator (iPhone 17 Pro)
- [ ] Open the Simulator → **Features → Toggle VoiceOver** (or `⌘⌥+F5`)
- [ ] Speak rate: leave at default
- [ ] Build version showing in Profile/About: confirm latest commit running

### Android Emulator (Medium_Phone_API_36.1)
- [ ] **Settings → Accessibility → TalkBack → On**
  *(simpler alt: ADB Shortcut: `adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService`)*
- [ ] Speak rate: 1× (default)

### Gestures cheat-sheet
| Action | iOS VoiceOver | Android TalkBack |
|---|---|---|
| Move to next element | swipe right | swipe right |
| Move to previous | swipe left | swipe left |
| Activate | double-tap | double-tap |
| Read all from top | two-finger swipe up | two-finger swipe up |
| Stop reading | one-finger tap | one-finger tap |

---

## 1. Home Tab (4 min)

- [ ] Header reads in order: greeting → "Falah" title → search button → notification button
- [ ] Tapping the search button announces "Search" (or similar) before activating
- [ ] Tapping the bell button announces "Notifications" + opens prefs sheet
- [ ] **Prayer card**: each prayer (Fajr, Dhuhr, Asr, Maghrib, Isha) is reachable
- [ ] Active/next prayer is announced as **selected** (not just visually highlighted)
- [ ] Bell switch on each prayer announces "switch, on/off" — **not** "button"
- [ ] Calculation method pill announces its current value (e.g. "Karachi", not just "button")
- [ ] Daily Ayah card is reachable; Arabic text is read (or skipped intentionally)
- [ ] Mosque hero card is reachable (image alt OK to be generic)
- [ ] Now-playing pill (only if audio playing) announces the playing surah name

**Common failure:** prayer-bell switches read as "button" instead of "switch, on" — file as a regression.

---

## 2. Quran Tab (5 min)

### Surah list
- [ ] Each surah row reads: number + English name + Arabic name + ayah count
- [ ] Search field announces "Search surahs"
- [ ] Selected language picker reads "Picker, English" (or current lang)

### Surah reader (open Al-Fatiha)
- [ ] Back button reads "Go back"
- [ ] Bookmark button reads "Bookmark surah" / "Remove bookmark" (state-dependent)
- [ ] Settings (gear) button reads "Reading settings"
- [ ] Per-ayah controls — **for at least 2 different ayahs**:
  - [ ] Play button reads "Play ayah {N:M}" (with verse ref)
  - [ ] Bookmark button reads "Bookmark ayah" / "Remove bookmark"
  - [ ] Tafsir toggle reads "Read tafsir" / "Hide tafsir"
- [ ] Audio bar (when surah playing): play/pause, skip-back, skip-forward, speed all have role="button" + label
- [ ] Reciter row in audio bar announces current reciter name

### Settings modal (gear → open)
- [ ] Reciter rows are role="radio", currently selected one is **selected**
- [ ] Font rows are role="radio", currently selected one is **selected**
- [ ] Font size +/- announce as buttons (with current size if possible)
- [ ] Tajweed switch reads "Switch, on/off"
- [ ] Modal close X reads "Close" or similar

---

## 3. Hadith Tab (3 min)

- [ ] Collection cards (Bukhari, Muslim, Tirmidhi, Abu Dawud, Nasai, Ibn Majah, Malik): each reads collection name + count
- [ ] Open Bukhari → header back button reads
- [ ] Filter button reads **"Show bookmarked only"** (NOT "filter") — toggles to "Show all hadiths"
- [ ] Each hadith row: arabic, translation, ref are all readable
- [ ] Share + bookmark icons announce labels

---

## 4. Qaida Tab (1 min)

- [ ] Lesson cards announce lesson title + completed state
- [ ] Locked/unlocked state communicated (announce as "disabled" or via hint)

---

## 5. Discover Tab (4 min)

### Discover index
- [ ] Each tile reads its label (Recitation, Halal Places, Articles, Live, Ramadan, Ask AiDeen)
- [ ] Search bar announces "Search Quran, Hadith, Fiqh"

### Ask AiDeen / Search
- [ ] Scope chips (Quran/Hadith/Fiqh) are role="tab"; current one is **selected**
- [ ] Result cards read collection ref + arabic + translation
- [ ] "Tap to read full / Tap to collapse" hint reaches screen reader

### Recitation
- [ ] Surah picker pill announces current surah
- [ ] Big record button announces state (idle/recording/done)
- [ ] **No-audio result** (try recording without speaking on simulator):
  - [ ] Card reads "No audio captured" — **not** a numeric score (regression check)

### Halal Places
- [ ] Search bar reachable
- [ ] Filter chips role="tab"
- [ ] If Overpass fails (turn off WiFi briefly): "Try again" button is reachable + activates
- [ ] List rows announce place name + type + distance

---

## 6. Qibla Tab (1 min)

- [ ] Compass needle direction is announced (or marked decorative if redundant)
- [ ] Calibrate button reachable

---

## 7. Profile Tab (3 min)

- [ ] Theme picker rows role="radio"; current theme is **selected**
- [ ] Accent picker rows role="radio"; current accent is **selected**
- [ ] Arabic Scale slider announces current value
- [ ] Madhab radio (Standard/Hanafi); current is selected
- [ ] Reciter picker (radio); current is selected
- [ ] Language picker opens; each language row is reachable
- [ ] **Adhan Notifications** menu item reads + on tap reads alert content
- [ ] **Calculation Method** menu item reads + on tap reads alert content
- [ ] **Database Status** menu item reads + on tap reads alert content
- [ ] Privacy Policy menu reads + opens external link or fallback alert
- [ ] Pro banner reads + tap shows "coming soon" alert
- [ ] Sign out button reads + opens confirmation

---

## 8. Duas Screen (2 min)

- [ ] Search bar reachable; "Clear search" X has hitSlop
- [ ] Each category card announces "{title}, {N} duas" (combined label, not just title)
- [ ] Detail screen: top-right bookmark filter announces "Show bookmarked / show all"
- [ ] Per-dua copy + bookmark icons announce labels; bookmark is selected when active

---

## 9. Tasbih + Zakat + Hifz (2 min)

### Tasbih
- [ ] Counter reads current count
- [ ] Sound + haptic switches role="switch"
- [ ] Reset button reads + asks confirmation

### Zakat
- [ ] Help (?) icons each have a label like "Help on {field}"
- [ ] Calculate button announces

### Hifz Tracker
- [ ] Each tracked surah row reads name + status
- [ ] Add surah button reachable
- [ ] Drill quality buttons: Again / Hard / Good / Easy each read clearly with role="button"

---

## 10. Top-level + General (1 min)

- [ ] Tab bar: Home, Quran, Hadith, Qaida, Discover, Qibla, Settings — each role="tab", currently active is **selected**
- [ ] No element announces only "button" with no description
- [ ] No element gets stuck in focus or skipped
- [ ] All Alerts (e.g. confirm sign-out) are read fully on appear

---

## Pass Criteria

- **Pass:** 95%+ of items checked. Any unchecked items are minor (decorative or single-screen) — file as cleanup, ship.
- **Soft fail:** 80-95%. Address the regressions in named labels (especially switches misreading as buttons).
- **Hard fail:** <80%. Re-run the accessibility sweep agent on flagged screens.

---

## Common issues (look for these)

1. **Switch misread as button** — `accessibilityRole="switch"` was missed and `accessibilityState={{ checked }}` is absent.
2. **Tab bar not selected-indicated** — current tab needs `accessibilityState={{ selected: true }}`.
3. **Icon-only buttons silent** — missing `accessibilityLabel` entirely.
4. **Repeated labels in lists** — every row reads the same title because the row's label doesn't include the per-item info.
5. **Modals trap focus** — VoiceOver may keep reading background content; ensure `accessibilityViewIsModal={true}` on the modal container.
6. **Small targets unreachable** — VoiceOver focus is fine but double-tap misses; check `hitSlop` was added.

---

## After the pass

1. Note failures in a single file: `screen / element / what was heard / what should be heard`.
2. Push fixes in a single follow-up commit titled `fix(a11y): VoiceOver pass corrections — {N} items`.
3. Re-run only the failing screens — no need for a full pass.

**ETA:** ~25 min for a focused pass with no failures, ~45 min if you encounter and re-test 5+ items.
