# Arna Job Alerts — Android App

Native Android (WebView) client for the production site hosted at Firebase:

`https://arna-jobs.web.app`

## Features

- Same Firebase backend (web app / Firestore)
- Realtime content via the live website
- Push notifications via Firebase Cloud Messaging (WebView + FCM ready)
- Saved Jobs / Results / Hall Tickets / Schemes (site modules)
- Admin notifications (when signed in on web)
- Offline mode via site Service Worker + Android cache fallback
- Deep links: `https://arna-jobs.web.app/*` and `arnajobs://`

## Open in Android Studio

1. Open the `android/` folder as an existing Gradle project
2. Sync Gradle
3. Add your `google-services.json` from the **arna-jobs** Firebase Android app (same project)
4. Run on emulator or device

## Package

`com.arnajobalerts.app`

## Notes

- Do not change the website folder structure — this app loads the hosted site.
- For local debugging against Firebase Hosting preview, change `BuildConfig.WEB_URL` / `strings.xml` `app_web_url`.
