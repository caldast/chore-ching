# chore-ching

A simple kids chore and reward tracker built as a static HTML/JavaScript site.

## Files

- `index.html` — main app UI
- `styles.css` — mobile-friendly styling
- `script.js` — app logic and local storage
- `config.csv` — default user, chores, and rewards data

## Run locally

1. Open `index.html` in a browser, or use a simple local server:
   - `python3 -m http.server 8000`
   - open `http://localhost:8000`

## GitHub Pages Deployment

1. Commit all files to the repository root.
2. In GitHub, enable Pages for this repository:
   - Settings > Pages
   - Source: `main` branch, root
3. Save and open the published site URL.

> The site loads `config.csv` from the same repository, so keep it in the root alongside `index.html`, `styles.css`, `script.js`, and `firebase-config.js`.

## Remote state sync with Firebase

To sync points across devices, use Firebase Firestore as the shared backend.

1. Create a Firebase project at https://console.firebase.google.com.
2. Add a Firestore database and choose a test or open rule set for initial development.
3. Copy `firebase-config.js` and fill in your Firebase project values.
4. Deploy the site to GitHub Pages.

Once configured, the app will save and load the shared state from Firestore.

> This is the cheapest cross-device sync option for a static GitHub Pages site, since Firebase offers a generous free tier and no custom server is required.
