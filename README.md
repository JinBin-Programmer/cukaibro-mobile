# CukaiBro Mobile (Expo)

A React Native (Expo) companion app for **CukaiBro**. It shares the **same Supabase project** as the web app (`cukaibro.com`), so the same login, the same `receipts` table, and the same private storage bucket are used. Snap or pick a receipt photo and it uploads straight into your CukaiBro account.

## What's inside
- **Auth** — email/password via Supabase (same accounts as the website).
- **Receipts tab** — your receipts for the latest tax year, with image previews via signed URLs. Long-press to delete.
- **Capture tab** — scan a document (auto edge-detect + crop), take a photo, or pick from the library; on-device OCR auto-fills the amount/date/merchant; then upload.
- **Settings tab** — account info + log out.

It mirrors the web's exact storage contract:
`receipts` bucket · path `‹user_id›/‹year›/‹category_code›/‹timestamp›_‹filename›` · `receipts` table.

## Prerequisites
- Node.js 18+ and a phone with the **Expo Go** app (iOS App Store / Google Play), or an emulator.
- The CukaiBro **Supabase backend must be provisioned** — run `supabase/receipts-setup.sql` (in the web repo) in the Supabase SQL editor first.

## Setup
```bash
cd cukaibro-mobile

# 1. Install dependencies
npm install

# 2. Align native module versions with this Expo SDK (recommended)
npx expo install

# 3. Configure your Supabase keys (SAME values as the web app's NEXT_PUBLIC_SUPABASE_*)
cp .env.example .env
#   then edit .env and fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 4. Run it
npx expo start
```
Scan the QR code with Expo Go (Android) or the Camera app (iOS).

> If you hit a dependency/version warning, run `npx expo install --fix` once.

## Document scanner + OCR (native — needs a dev build)
The **Capture** tab has three options: **Scan Document**, **Take Photo**, **Choose from Library**.

- **Scan Document** uses `react-native-document-scanner-plugin` (native ML Kit Document Scanner on Android, VisionKit on iOS) for automatic edge detection + perspective crop.
- After any capture, **on-device OCR** (`@react-native-ml-kit/text-recognition`, Google ML Kit — free, offline, private) reads the receipt and **auto-fills the amount, date, and merchant**. You just confirm and save.

These are **native modules**, so they do **not** run in Expo Go. The app still *launches* in Expo Go (it falls back to camera/library and skips OCR), but to use scanning + OCR you need a **development build**:

```bash
# Easiest from Windows — cloud build via EAS (no Android Studio / Mac needed):
npm install -g eas-cli
eas login
eas build --profile development --platform android   # produces an installable .apk
# install the .apk on your phone, then:
npx expo start --dev-client
```
On a Mac you can also do `npx expo run:ios`; with Android Studio installed, `npx expo run:android`.

> The first `eas build` will prompt to create `eas.json` and an Expo project — accept the defaults.

## Publishing to the stores
Build with EAS (`eas build --profile production --platform android` / `ios`). You'll need an Expo account, plus a Google Play Console ($25 one-time) and/or Apple Developer account ($99/yr).

## Notes
- A tax year must exist for your account (created in the web app's onboarding) before receipts can attach to it.
- OCR is best-effort — it guesses the grand total and date from the text; always verify before saving.

## Project layout
```
app/
  _layout.tsx        Root layout + auth provider
  index.tsx          Redirects to /login or /(tabs)
  login.tsx          Email/password auth
  (tabs)/
    _layout.tsx      Tab navigator (auth-guarded)
    index.tsx        Receipts list
    capture.tsx      Camera/library capture + upload
    settings.tsx     Account + log out
lib/
  supabase.ts        Supabase client (AsyncStorage session)
  auth.tsx           Auth context/hook
  receipts.ts        Shared upload/list/delete + signed URLs
  types.ts           Shared table types
```
