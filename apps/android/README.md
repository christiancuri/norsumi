# norsumi for Android

Native Android client for norsumi, written in Kotlin with Jetpack Compose (Material 3). It catches new
screenshots automatically, accepts anything shared from other apps, and lets you browse, search and
edit your library.

This is a standalone Gradle project inside the monorepo. It is not a pnpm package.

## Stack

| | |
|---|---|
| Build | AGP 9.4.1 (built-in Kotlin), Kotlin 2.4.20, Gradle 9.8, JDK 17, compile/target SDK 37, min SDK 29 |
| UI | Compose BOM 2026.09.00 (Material 3, custom color scheme, no dynamic color), Navigation Compose 2.10.2 with type-safe routes, shared-element transitions |
| Data | kotlinx.serialization 1.13.0, OkHttp 5.5.1, DataStore 1.3.0, coroutines 1.11.0 |
| Images | Coil 3.6.3 (`coil-compose` + `coil-network-okhttp`) |
| Background | WorkManager 2.12.0 |
| Sign-in | Credential Manager 1.6.0 + `googleid` 1.2.1 (Sign in with Google) |
| Fonts | Geist, Geist Mono, Instrument Serif (SIL OFL, bundled in `res/font`; licenses in `licenses/`) |

Dependency injection is manual: `AppContainer` is created once per process by `NorsumiApplication`.

## Build and install

```bash
cd apps/android
echo "sdk.dir=/path/to/android-sdk" > local.properties   # gitignored
export JAVA_HOME=/path/to/jdk-17

./gradlew :app:assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:testDebugUnitTest      # unit tests
./gradlew :app:lintDebug              # lint
./gradlew dist                        # signed release APK -> dist/norsumi-<version>.apk

adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Talking to a local API

Debug builds use `http://localhost:3000` as the default server. Forward the port to the phone:

```bash
adb reverse tcp:3000 tcp:3000
```

Cleartext HTTP is allowed only in debug builds, and only to `localhost`, `127.0.0.1` and `10.0.2.2`
(see `src/debug/res/xml/network_security_config.xml`). Release builds are HTTPS-only and default to
`https://norsumi.com`. Self-hosters can change the server under **Advanced** on the welcome screen, or
with **Change** on the sign-in screen. The app checks `GET /api/info` before it saves a new server.

### Demo mode (debug builds only)

Long-press the logo on the welcome screen, or use **Settings › Developer › Demo mode**. Demo mode
swaps in an in-memory library with generated sample images, so every screen works without an API.
It never reads or uploads real photos, and release builds don't include it.

## Release signing

`app/build.gradle.kts` reads signing details from `~/.norsumi-android/keystore.properties`. You can
point it at another file with the `NORSUMI_KEYSTORE_PROPERTIES` environment variable. The file holds
these keys:

```properties
storeFile=/absolute/path/to/release.jks
storePassword=…
keyAlias=norsumi
keyPassword=…
```

If the file is missing, release builds fall back to the debug key and `./gradlew dist` prints a
warning. Keystores and properties files never belong in the repository (see `.gitignore`).

Release builds run R8 with resource shrinking. `proguard-rules.pro` keeps the kotlinx.serialization
serializers that the API models and navigation routes need.

## Sign-in

- Email and password use `POST /api/auth/login` and `/register`.
- **Continue with Google** appears only when `GET /api/info` returns `auth.google.webClientId`. The
  app passes that id as `serverClientId` to Credential Manager. It tries the account picker first,
  then falls back to the full "Sign in with Google" flow. The ID token goes to `POST /api/auth/google`.
  No client id is hardcoded. If the server has no Google config, or can't be reached, the button is
  hidden.
- The access token is kept in memory only. The rotating refresh token is encrypted with AES-256-GCM,
  using a non-exportable Android Keystore key, and stored in DataStore. OkHttp's `Authenticator`
  refreshes on a 401, one request at a time, so concurrent 401s share a single refresh. This matters
  because reusing a refresh token revokes its whole token family.
- If a refresh returns `409`, the token was rotated less than 30 s ago by a concurrent refresh. The
  app re-reads the latest stored token and retries once. Only a `401` signs the user out.
- **Settings › Delete account** calls `DELETE /api/me`. Password accounts must confirm their password;
  Google-only accounts send no body. The app then clears the session, the upload queue, capture
  state and its caches.
- App data is excluded from backups, because the Keystore key can't be restored on another device anyway.

## Keeping screens fresh

`LibraryStore` (`data/repo/LibraryStore.kt`) is the app-wide source of truth for categories and
stats, and the invalidation bus. Screens don't keep their own copies.

- Every mutation emits a `LibraryChange`: edit, favorite, archive, delete, category CRUD, a note or
  link created, a share saved, or an upload finished in a worker. The store then refetches
  categories and stats, and item lists patch themselves or refetch.
- Lists and the detail screen report the items they fetch. When an item leaves pending/processing,
  the store refetches categories and stats, because the AI may have just created or filled a
  category. Lists poll every 3 s while anything is pending.
- `invalidateAll()` bumps a version that every list and detail screen follows. It runs when the app
  returns to the foreground (`ProcessLifecycleOwner` ON_START) and when you switch back to a tab.
- Library, Categories, Category, Search and Item detail all support pull-to-refresh.
- Deletes are optimistic: the item disappears and counts drop at once. If the server refuses, the
  store refetches everything and shows a snackbar.
- A category screen whose category was deleted (by you, elsewhere, or by the server once empty)
  navigates back.

Debug builds install as `com.norsumi.app.debug` ("norsumi debug"), next to the release app, with
separate data.

## Screenshot auto-capture

1. **Trigger.** A one-shot WorkManager job, `ScreenshotTriggerWorker`, has a content-URI trigger on
   `MediaStore.Images.Media.EXTERNAL_CONTENT_URI`, with a 600 ms update delay and a 4 s max delay.
   JobScheduler starts it when images change, even when the app isn't running. Each run appends the
   next trigger (`APPEND_OR_REPLACE`), so it re-arms itself. An hourly periodic job is a safety net,
   and `BootReceiver` re-arms everything after a reboot or an app update.
2. **Detection.** `CaptureEngine` queries MediaStore for rows above a persisted `_ID` watermark,
   pending rows included. A row counts as a screenshot when its `RELATIVE_PATH` contains
   "screenshot" (case-insensitive; this covers `Pictures/Screenshots`, Samsung's `DCIM/Screenshots`,
   MIUI and others), or when its name starts with "Screenshot". Pending rows (`IS_PENDING`) hold the
   watermark back until the file is finished.
3. **No history dump.** Turning auto-capture on sets the watermark to the newest image at that
   moment. To upload older screenshots, use **Settings › Import last 20 screenshots**.
4. **Upload.** Each file gets a unique `UploadWorker` (`upload:<clientId>`, `KEEP`), so a file is
   never queued twice. The worker needs a network (unmetered with **Wi-Fi only**), retries with
   exponential backoff, runs expedited with a progress notification, and streams the content URI
   into a multipart `POST /api/items/upload`. The file is never loaded into memory. It sends
   `kind=screenshot`, `capturedAt`, and `clientId = mediastore:<_ID>:<DATE_ADDED>`, so the server can
   deduplicate. The Library header and Settings show the queue state ("Uploading 2…").
5. **Instant capture (optional).** A foreground service of type `specialUse` keeps a
   `ContentObserver` on MediaStore and queues uploads within about a second. It shows a silent,
   minimum-importance notification. Android only allows starting it while the app is in the
   foreground (when you turn it on, or on app resume) or at boot.

### Limits

- Without Instant capture, JobScheduler decides when the trigger runs. Usually that's within seconds
  to a minute, but Doze and App Standby buckets can delay it longer.
- Samsung's battery management can put apps it considers unused into "sleeping apps", which delays or
  stops background work. Onboarding offers the battery-optimization exemption. On Samsung, also
  check **Settings › Battery › Background usage limits**, and keep norsumi out of "Deep sleeping apps".
- Android 14+ "Select photos" (partial access) hides new screenshots. The app detects this and asks
  for "Allow all".
- Images larger than 25 MB, or in formats other than PNG, JPEG, WebP or HEIC, are skipped (the API
  limit).

## Share target

`ShareActivity` handles `ACTION_SEND` and `ACTION_SEND_MULTIPLE`:

- `text/plain` becomes a link if the text contains a URL (the first `http(s)` URL, or a bare `www.`
  host). The rest of the text, plus `EXTRA_SUBJECT`, is sent as context to `POST /api/items/link`.
  Text without a URL goes to `POST /api/items/note`.
- `image/*` (up to 20 images) are copied into private storage while the URI grant is still valid,
  then uploaded with `kind=image` by `UploadWorker`.

The work goes through WorkManager, so it survives process death and offline shares. A compact sheet
confirms the share and closes itself.

## Permissions and why they're needed

| Permission | Why |
|---|---|
| `READ_MEDIA_IMAGES` (API 33+), `READ_EXTERNAL_STORAGE` (≤ 32) | Notice new screenshots. Only screenshot files are ever uploaded. |
| `READ_MEDIA_VISUAL_USER_SELECTED` | Detect Android 14+ partial access, so the app can explain why "Allow all" is needed. |
| `POST_NOTIFICATIONS` | Upload progress and the Instant capture indicator (optional). |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC` | Expedited uploads run as WorkManager foreground work. |
| `FOREGROUND_SERVICE_SPECIAL_USE` | Optional Instant capture service (subtype declared in the manifest). |
| `RECEIVE_BOOT_COMPLETED` | Re-arm capture after a reboot. |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Offer the exemption that keeps background uploads on time (optional). |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Talk to the API, and wait for a network before uploading. |

## Code map

```
app/src/main/java/com/norsumi/app/
  AppContainer.kt, NorsumiApplication.kt, MainActivity.kt
  data/model      API contract mirror (packages/common/src)
  data/api        NorsumiApi (OkHttp), JSON config, auth interceptor + single-flight authenticator
  data/auth       SessionManager, Keystore-encrypted TokenStore
  data/settings   DataStore preferences
  data/repo       LibraryRepository (remote + debug demo implementation)
  capture/        detection, MediaStore scanner, workers, instant service, boot receiver
  share/          share parsing, ShareActivity, ShareWorker
  ui/             theme, components, onboarding, home tabs, detail, categories, search, settings
```

## Brand assets

The launcher icon layers come from `brand/android/` at the repository root. The in-app mark
(`res/drawable/ic_elephant_mark.xml`) and the notification icon (`ic_stat_norsumi.xml`) are converted
from `brand/mark.svg`. When the brand changes, copy those files again rather than redrawing them.
