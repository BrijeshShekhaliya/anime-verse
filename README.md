# Anime - Vers website

A Next.js landing page for the Anime - Vers Android app. This website is focused on introducing the mobile app and directing visitors to the APK download.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Add the Android APK

Place the final APK at:

`public/downloads/anime-vers.apk`

Both download buttons already point to `/downloads/anime-vers.apk`. Once the file is added and deployed, the buttons will download it.

## Replace the temporary app preview

The hero currently uses a CSS phone mockup so the page looks complete before final screenshots are ready. Replace the mockup in `app/page.tsx` with your real app screenshots when available.

## Deploy

Connect this repository to Vercel. The project is configured as a standard Next.js app; Vercel will detect the framework automatically.
