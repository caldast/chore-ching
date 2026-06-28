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

> The site loads `config.csv` from the same repository, so keep it in the root alongside `index.html`, `styles.css`, and `script.js`.
