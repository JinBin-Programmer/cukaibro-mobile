# CukaiBro Mobile (Expo)

A React Native (Expo) companion app for **CukaiBro**. It shares the **same Supabase project** as the web app (`cukaibro.com`), so the same login, the same `receipts` table, and the same private storage bucket are used. Snap or pick a receipt photo and it uploads straight into your CukaiBro account.

## What's inside
- **Auth** — email/password via Supabase (same accounts as the website).
- **Receipts tab** — your receipts for the latest tax year, with image previews via signed URLs. Long-press to delete.
- **Capture tab** — take a photo or pick from the library, fill amount/merchant/date/category, and upload.
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

## Notes
- **Document scanner with auto edge-detection/crop:** this MVP uses the system camera (`expo-image-picker`). For a true "scanner" experience (auto-crop, deskew), add `react-native-document-scanner-plugin` — it needs a **development build** (`npx expo run:android` / `run:ios` or EAS), not Expo Go.
- **OCR (auto-read the amount):** can be added later with Google ML Kit text recognition (also requires a dev build).
- **Publishing to the stores:** build with **EAS** (`npx eas build`). You'll need an Expo account, plus an Apple Developer account ($99/yr) and/or Google Play Console ($25 one-time).
- A tax year must exist for your account (created in the web app's onboarding) before receipts can attach to it.

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
