# Maestro UI smoke tests

Eleven flows that walk every primary screen of Falah / Noor on a running
simulator or emulator. They assert that each tab opens, key text renders, and
the Quran reader paginates past verse 50 (regression guard for the missing-aya
fix).

## Install Maestro (once)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# or, on macOS:
brew tap mobile-dev-inc/tap && brew install maestro
```

## Run

Boot a simulator/emulator and install the dev build first:

```bash
# iOS
npx expo run:ios            # builds & launches the dev build
maestro test .maestro       # runs every flow

# Android
npx expo run:android
maestro test .maestro
```

Run a single flow:

```bash
maestro test .maestro/flows/02_quran_surah.yaml
```

Filter by tag:

```bash
maestro test --include-tags smoke .maestro
maestro test --include-tags quran .maestro
```

## What each flow covers

| #  | File                              | Purpose                                          |
|----|-----------------------------------|--------------------------------------------------|
| 00 | `00_smoke_all_tabs.yaml`          | Tap every bottom tab, assert the screen renders  |
| 01 | `01_home.yaml`                    | Home: Verse of the Day + prayer strip            |
| 02 | `02_quran_surah.yaml`             | Surah list + opens Al-Baqarah & scrolls past 50  |
| 03 | `03_quran_juz.yaml`               | Juz list (verifies vertical layout)              |
| 04 | `04_hadith.yaml`                  | Hadith index lists at least one collection       |
| 05 | `05_qaida.yaml`                   | Qaida lessons screen renders                     |
| 06 | `06_discover.yaml`                | Discover tiles open + come back                  |
| 07 | `07_qibla.yaml`                   | Qibla compass (tolerates location prompt)        |
| 08 | `08_settings.yaml`                | Settings sections + language picker sheet        |
| 09 | `09_duas.yaml`                    | Duas screen reachable from Home quick action     |
| 10 | `10_hifz_tasbih_zakat.yaml`       | Hifz / Tasbih / Zakat tools                      |
| 11 | `11_notifications_modal.yaml`     | Notifications sheet shows Salah + Daily Ayah +   |
|    |                                   | Friday Surah al-Kahf toggles                     |

## Bundle ID

All flows target `com.falah.islamic` (matches `app.json`). Update the `appId:`
header if you ship a separate dev/prod ID.

## Updating flows

- Tabs use the `title:` from `app/(tabs)/_layout.tsx`. Profile renders as
  **Settings**, not "Profile".
- Maestro matches with substring-by-default; regex is supported via `text:`.
- For elements that may be missing during loading states, add `optional: true`.
- Don't `clearState: true` — flows assume the SQLite DB is seeded on first run.
