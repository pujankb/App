# ASPD — Complete Educational Platform

**ASPD** is a full-stack educational platform built for structured academic courses, chapter-wise PDF study notes, HD video lectures, official faculty announcements, student inquiries, and role-protected administration across web and Android.

---

## 1. Architecture Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Web Frontend** | React 19, TypeScript, Tailwind CSS v4, React Router | Responsive Student Portal + Separate `/admin` Dashboard |
| **Shared Backend API** | Express + TypeScript (`server.ts`) | REST API (`/api/*`), Firebase ID token verification, Multer file uploads, on-demand PDF 1.4 streaming |
| **Relational Database** | PostgreSQL (Cloud SQL + Drizzle ORM in AI Studio; Supabase SQL + RLS in `/supabase/schema.sql`) | Single source of truth for courses, subjects, chapters, topics, notes, videos, bookmarks, downloads, progress, announcements, and messages |
| **Authentication & RBAC** | Firebase Authentication (Google Sign-In) + PostgreSQL `profiles` / `user_roles` | Server-verified Bearer ID tokens; strict `admin` role enforcement for `/api/admin/*` |
| **Android Native App** | Kotlin, Jetpack Compose, Material 3, Media3, Android `PdfRenderer` (`/android`) | Min SDK 24 (Android 7.0+), universal release APK (`ASPD-Release.apk`) synced with the same backend |

---

## 2. Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (provisioned automatically in AI Studio Cloud SQL, or via Supabase)

### Run Locally
```bash
npm install
cp .env.example .env
# Populate SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD
npm run dev
```
The full-stack app runs on `http://localhost:3000`.

### Production Build & Start
```bash
npm run build
npm start
```

---

## 3. Database Setup (Cloud SQL & Supabase)

### Option A: Cloud SQL (Active in AI Studio)
Schema is defined in `src/db/schema.ts` and managed via Drizzle ORM (`src/db/drizzle.config.ts`). All 16 relational tables, foreign keys, and indexes are provisioned automatically.

### Option B: External Supabase Deployment
1. Open the **Supabase SQL Editor** in your project.
2. Execute `/supabase/schema.sql`. This creates all tables, foreign keys, indexes, `public.is_admin()` helper, Row Level Security (RLS) policies, and the `study-notes` and `course-media` Storage buckets.
3. Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code or Android builds.

---

## 4. Admin Account Setup (`/admin`)

1. Sign in with Google on `/login` or `/admin`.
2. By default, the email configured in `ADMIN_EMAIL` (or the project owner email) is automatically assigned the `admin` role in PostgreSQL.
3. Additional administrators can be promoted or revoked anytime from **`/admin` -> Students & Roles**.
4. Non-admin student accounts attempting to access `/admin` or `/api/admin/*` receive HTTP `403 Forbidden`.

---

## 5. Website Deployment (Vercel / Cloud Run)

1. Push the repository to GitHub (never commit `.env`, `uploads/`, or `*.jks` keystores).
2. Configure environment variables from `.env.example` in your hosting dashboard.
3. Build command: `npm run build`. Start command: `npm start` (for Node servers) or configure Vercel routes to point `/api/*` to the Express backend.

---

## 6. Native Android Application & Universal Release APK (`ASPD-Release.apk`)

The native Kotlin Android Studio project is located in `/android`.

### Prerequisites
- Android Studio Ladybug (2024.2+) with JDK 17 and Android SDK 35.

### Step 1: Point Android App to Your Live Backend
In `android/gradle.properties` (or pass via CLI `-PASPD_API_BASE_URL=...`), set your deployed ASPD URL:
```properties
ASPD_API_BASE_URL=https://your-deployed-aspd-url.example.com
```

### Step 2: Generate a Release Signing Keystore (One-Time)
```bash
keytool -genkeypair -v \
  -keystore android/aspd-release.jks \
  -alias aspd-release \
  -keyalg RSA -keysize 2048 -validity 10000
```
Copy `android/keystore.properties.example` to `android/keystore.properties` and fill in your keystore path, alias, and passwords. Keep `aspd-release.jks` and `keystore.properties` strictly private and backed up securely.

### Step 3: Build the Signed Universal Release APK
`android/app/build.gradle.kts` explicitly disables ABI splits (`splits { abi { isEnable = false } }`), sets `minSdk = 24`, enables R8 minification/shrinking, and outputs a single universal **`ASPD-Release.apk`** compatible with ARM64 (`arm64-v8a`) and ARMv7 (`armeabi-v7a`) Android phones:

```bash
cd android
./gradlew clean assembleRelease
```
Output location:
`android/app/build/outputs/apk/release/ASPD-Release.apk`

### Step 4: Verify Signature & Install on a Device
```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/ASPD-Release.apk
adb install -r android/app/build/outputs/apk/release/ASPD-Release.apk
```

### Generating Future Updates
1. Increment `versionCode` (e.g., `1 -> 2`) and `versionName` (e.g., `"1.0.0" -> "1.1.0"`) in `android/app/build.gradle.kts`.
2. Always sign updates with the **same** `aspd-release.jks` keystore so Android devices accept in-place upgrades without uninstalling.
3. Re-run `./gradlew clean assembleRelease`.

---

## 7. Troubleshooting

- **Google Sign-In popup blocked**: Allow popups for the preview domain and verify the domain is listed under Authorized Domains in Firebase Authentication.
- **Admin access shows 403**: Ensure you are signed in with the owner email or promote your user inside PostgreSQL `profiles` (`role = 'admin'`).
- **Uploaded files rejected**: Only allowed educational formats (`PDF`, `PNG`, `JPG`, `WEBP`, `DOC`, `DOCX`, `TXT`, `MD`, `MP4`, `WEBM`) up to 25 MB are accepted.
