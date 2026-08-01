# Arna Job Alerts — Production Documentation

**Brand:** Arna Job Alerts / Arna Digital Hub  
**Hosting:** https://arna-jobs.web.app  
**Firebase project:** `arna-jobs`  
**Version:** Final Production Release (2026-08-01)

---

## 1. Architecture

Static multi-page HTML/CSS/JS application on Firebase Hosting.

| Layer | Implementation |
|-------|----------------|
| Public site | Root HTML + `js/*` modules |
| Admin | `admin/*` (Auth-gated) |
| Database | Cloud Firestore only |
| Auth | Firebase Auth (email/password) |
| Media upload | Cloudinary (`admin/cloudinary.js`) |
| AI | Admin-only Research Assistant (`admin/arna-ai.html`) — never auto-publishes |
| Android | WebView app in `android/` → same Hosting URL |
| PWA | `manifest.json` + `sw.js` (`arna-job-alerts-v2.2`) |

**Publish rule:** Admin Publish → Firestore write → public listeners/queries update. Nothing auto-publishes.

---

## 2. Collections

| Collection | Purpose |
|------------|---------|
| `jobs` | Job posts |
| `results` | Exam results |
| `halltickets` | Hall tickets |
| `schemes` | Schemes |
| `users` | Users |
| `notifications` | Admin notifications |
| `loginHistory` | Login audit |
| `activityLogs` | Admin activity |
| `settings/website` | Site/SEO/ads/social/AI settings |

---

## 3. Rules

- File: `firestore.rules` (deployed)
- Admin write gate: email `rkarjundev@gmail.com`
- Public job reads allowed
- Public may increment `jobs.views` only
- Results/HT/Schemes: public read when `published != false`
- `settings/*`: public read, admin write
- Storage: `storage.rules` deny-all present in repo; **Firebase Storage API not enabled** (uploads use Cloudinary)

---

## 4. Indexes

- File: `firestore.indexes.json` (deployed)
- Composite helpers for jobs/results/halltickets/schemes + `createdAt`

---

## 5. Deployment

```bash
firebase use arna-jobs
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Do **not** deploy Storage until Storage is enabled in the Firebase console (not required for current Cloudinary flow).

**Deployed on 2026-08-01:** Hosting + Firestore rules + indexes.

---

## 6. Production Checklist

- [x] Homepage jobs load from Firestore
- [x] Single `#modulePreviews` (no duplicates)
- [x] No `IMAGE_FALLBACK` SyntaxError
- [x] Categories / search / district
- [x] Featured / Trending / Closing Soon
- [x] Job Details render (views increment non-blocking)
- [x] Share URL pattern `https://arna-jobs.web.app/job.html?id=<id>`
- [x] Results / Hall Tickets / Schemes pages load
- [x] Admin auth gate (login redirect)
- [x] Settings + Arna AI pages exist (auth-gated)
- [x] Hosting deployed
- [x] Firestore rules deployed
- [x] Indexes deployed

### Manual configuration (outside code)

1. Cloudinary account/preset (already wired in `admin/cloudinary.js`)
2. Arna AI: Admin → Settings → `aiProvider` / `aiApiKey` / `aiModel`
3. Optional: enable Firebase Storage only if you stop using Cloudinary
4. Confirm admin Auth user email matches rules (`rkarjundev@gmail.com`)

---

## 7. Verified bugs fixed in this release QA

| Bug | Fix |
|-----|-----|
| Production stale (duplicate previews + IMAGE_FALLBACK crash) | Hosting redeploy |
| Broken `notifications.html` link | Point to `#notificationsContainer` |
| Admin Results fallback image path | `../assets/images/no-image.png` |
| RSS referenced deleted Auto Post | Copy updated |
| SW serving stale JS | Cache bumped to `v2.2` |
| Job Details failed after rules deploy (views write) | Rules allow views-only + best-effort increment |
| Missing `.firebaserc` | Added (`arna-jobs`) |
| Unused rules helper | Removed |

---

*Generated for Final QA / Production Release.*
