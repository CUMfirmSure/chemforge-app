# ChemForge

Chemistry sandbox: valence rules, 2D/3D VSEPR shapes, bond-stretching energies, aromatic templates, discovery log.
Everything runs offline in the browser (IndexedDB). No backend.

* `www/` is the whole app (edit `www/index.html`).
* **Android APK** is built by GitHub Actions (Capacitor). **Web/PWA** is deployed by GitHub Pages.

## One-time setup (about 10 minutes)

1. Create a GitHub account if you do not have one, then **New repository** -> name it `chemforge` -> **Public** (free Actions minutes are unlimited for public repos) -> Create.
2. Upload this project:
   * **Easiest:** unzip this package on a computer. In the new repo click **uploading an existing file**, drag in *everything inside the unzipped folder* (including the hidden `.github` folder), and click **Commit changes**.
   * If the `.github` folder did not upload: **Add file -> Create new file**, type `.github/workflows/android.yml` as the name (typing `/` makes folders), paste the file's contents, commit. Repeat for `pages.yml`.
   * **Or with git:** `git init && git add . && git commit -m "ChemForge" && git branch -M main && git remote add origin https://github.com/YOUR-NAME/chemforge.git && git push -u origin main`
3. The repo's default branch must be `main` (it is, if you created the repo normally).

## Get the Android app on your phone

1. Repo -> **Actions** tab -> **Build Android APK** -> **Run workflow** -> Run. (It also runs by itself whenever you change `www/`.)
2. Wait 5-10 minutes for the green tick.
3. Repo -> **Releases** (right side of the repo page) -> newest build -> download **ChemForge.apk** (do this on your phone, or send the link to it).
4. Open the APK. Android asks to allow installs from your browser/Files app: allow it, then install.
   Google Play Protect may warn that the app is unrecognised. That is expected for a personal debug build: choose **Install anyway**.

## Get the web / installable PWA

1. Repo -> **Settings -> Pages** -> **Source: GitHub Actions**.
2. Repo -> **Actions** -> **Deploy web app (GitHub Pages)** -> Run workflow.
3. Your address is `https://YOUR-NAME.github.io/chemforge/`. Open it in Chrome on your phone -> menu -> **Install app**. After the first load it works offline.

## Updating the app

Edit `www/index.html` (GitHub's pencil icon works on a phone), commit to `main`, and both workflows rebuild. New APK = new Release; install it over the old one (data is kept because the version number increases).

## Notes

* The APK is signed with a debug key. That is fine for your own phone. Publishing on Google Play needs a release keystore (ask for a signed-release workflow when you want one).
* If a build fails, open the failed run, click the red step, and read the last lines. Paste them to me and I will fix it.
* App name, id and icon: `capacitor.config.json` and `resources/android-icons/`.

## Hand mode (selfie camera)

Tap **Hand** in the toolbar and allow the camera. Steer with your hand, **pinch** thumb and index to grab, open your fingers to release.
Pull an element tile onto the canvas, drop an atom on another to bond, pinch empty space to pan or orbit, pinch a toolbar button to press it.
The hand model is bundled into the app at build time (from the `@mediapipe/hands` npm package), so it works offline. It runs best in good light with your hand about an arm's length from the camera.

### Reach and speed
Keep your hand inside the dashed box shown on the camera preview: that box (the middle 45% of the camera frame) maps to the whole screen, so corners are reachable without leaving the frame.
Hand mode renders at 1x resolution and skips duplicate camera frames to stay fast; if the phone is still slow it drops to one-hand tracking automatically.

### Two hands
* Pinch empty space with both hands: zoom and pan.
* Hold one atom in each hand and pull apart: the bond between them stretches, shows its energy, and breaks at its dissociation energy.
* Quick pinch-tap on an element tile arms it; pinch empty space to place it, or an atom to bond a new one. Pinch the tile again to stop.

## Updating from an earlier version

Unzip the new zip *into your existing project folder* (choose to replace files), then in GitHub Desktop commit the changes and click **Push origin**.
