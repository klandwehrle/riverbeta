# River Beta — setup

River Beta is a phone app for logging river trips and levels. It works with no service: trips save on the phone and upload to your Google Sheet when you're back in range.

There are two parts. Your Google Sheet runs a small Apps Script that the app talks to, and the app files are hosted for free on GitHub Pages.

## 1. Update the Apps Script (about 5 minutes)

1. Open your River Beta Google Sheet and go to **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with the new `Code.gs`.
3. Delete the old `index`, `json`, and service worker files from the Apps Script project. The app doesn't use them anymore.
4. *Optional:* to keep strangers out, set `PASSCODE` near the top of `Code.gs` (for example `"eddyout"`). Everyone enters it once in the app's Settings.
5. Choose `setup` from the function menu and click **Run**. Approve the permissions when asked. This adds `Paddler`, `Trip ID`, and `Logged at` headers to columns G–I of the Data sheet. Your existing trips stay as they are.
6. Click **Deploy → New deployment**. Choose the type **Web app** and set:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## 2. Connect the app

Open `config.js` and paste that URL between the quotes.

## 3. Put the app online with GitHub Pages (free)

1. Create a free account at github.com, then click **New repository**. Name it `riverbeta` and make it **Public**.
2. Click **uploading an existing file**. Drag in every file from this folder, including the `icons` folder, and click **Commit changes**.
3. Go to **Settings → Pages**. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
4. After a minute your app is live at `https://YOUR-USERNAME.github.io/riverbeta/`.
5. Point your Google Site's link or button at that address instead of the old `/exec` link.

## 4. Install it on your phone

Open the app's address once **with service** so it can save itself on the phone.

- **iPhone:** open it in Safari, tap **Share**, then tap **Add to Home Screen**.
- **Android:** open it in Chrome and tap **Install app** in the app's Settings, or use the ⋮ menu.

Installing matters on iPhone. Safari can clear saved data for websites you haven't opened in a while, but home-screen apps are exempt.

## How offline logging works

- Every trip is saved on the phone first, then uploaded. The badge at the top shows how many trips are waiting to upload. Tap it to try again right away.
- The app uploads automatically when you open it, when service returns, and every minute while it's open. On Android it can also upload in the background after you close it.
- Each trip has a unique ID, so a retry after a dropped connection never creates a duplicate row.
- New rivers, sections, and boats you type in are added to the Rivers and Boats sheets automatically when the trip uploads.
- Dropdowns and History use the last copy downloaded from the sheet, so they still work in the canyon.

## Making changes later

- **Changed `Code.gs`?** Go to **Deploy → Manage deployments**, click the pencil icon, choose **Version: New version**, and click **Deploy**. This keeps the same URL.
- **Changed any app file?** Change `CACHE_VERSION` in `sw.js` (for example, to `river-beta-v2`) so phones pick up the update. The new version appears the second time the app is opened.

## Quick test

1. Log a trip with service and check that it appears in the Data sheet.
2. Turn on airplane mode and log another trip. The badge should say "1 waiting to upload."
3. Turn airplane mode off and open the app. The trip uploads and the badge returns to "Up to date."
