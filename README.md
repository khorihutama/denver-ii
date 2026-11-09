# Denver II — Child Development Screening

A mobile-friendly web app for Denver II developmental screening of children
**0–6 years (0–72 months)**, across the 4 Denver II sectors:

- Personal–Social
- Fine Motor–Adaptive
- Language
- Gross Motor

General-purpose: usable for any child, no account, no backend, no build step.
Pure HTML/CSS/JavaScript — deploy it anywhere static files can be hosted.

## Features

- **Simplified checklist (default)** — items are grouped for the child's age:
  - *Expected by now* — a Fail is a **Delay**
  - *Due around now* — a Fail in the 75–90% zone is a **Caution**
  - *Coming up next* — preview only, not scored
- **Chart view** — the classic Denver II layout: one bar per item spanning the
  age when 25%–90% of children pass it (darker tail = 75%–90%), with a red
  age line for the child.
- **Scoring** — Pass / Fail / Refusal / No Opportunity per item, with a
  simplified Denver II interpretation:
  - **Normal:** no Delays, at most 1 Caution
  - **Suspect:** ≥1 Delay and/or ≥2 Cautions
  - **Untestable:** Refusal on an expected/due item — retest in 1–2 weeks
- **Corrected age** — if a child was born prematurely (weeks early) and is
  under 24 months, the age line uses corrected age.
- **Bilingual** — English / Bahasa Indonesia toggle (UI + item names).
- **History** — save screenings in the browser (`localStorage`) and reload
  them later. Nothing is sent to a server. No PDF/export by design (v1).

## Run it locally

No build step. Any static server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` in a browser.

## Deploy it yourself

### GitHub Pages (free)

1. Push this repo to GitHub (see below).
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. Your app is live at `https://<your-username>.github.io/<repo-name>/` in a few minutes.

### Other static hosts

The same files work unchanged on Netlify, Vercel, Cloudflare Pages, etc. —
point the host at the repo root, no build command, publish directory `.`.

## Push this project to your own GitHub

```bash
# Option A — GitHub CLI
gh repo create denver-ii --public --source=. --remote=origin --push

# Option B — manual: create an empty repo on github.com first, then
git remote add origin https://github.com/<your-username>/denver-ii.git
git push -u origin main
```

> The commits in this repo were authored locally as `Muse <muse@localhost>`.
> To use your own identity: `git config --global user.name "Your Name"` and
> `git config --global user.email "you@example.com"` before your next commits.

## Project structure

```
.
├── index.html      # App shell / UI
├── css/styles.css  # Mobile-first styles
└── js/
    ├── data.js     # Milestone dataset: 105 items, ages in months [p25,p50,p75,p90]
    ├── i18n.js     # UI strings EN / ID
    └── app.js      # Age calc, checklist, scoring, chart, history
```

## About the data — please read

The ages in `js/data.js` are a **simplified approximation** of the published
Denver II norms, included so the app works out of the box and so the dataset
stays readable and editable. Denver II has 125 items; this v1 ships 105
representative items across all ages and sectors.

**This app is a screening aid for education and screening support — it is
not a diagnosis and does not replace the official Denver II test form or a
professional assessment.** Verify the dataset against the official form
before any clinical use, and discuss a *Suspect* result with a paediatrician
or child-development professional.

## License

MIT — see `LICENSE` if present, or treat the code as MIT-licensed.
The Denver II name and test are trademarks/properties of their respective owners;
this is an independent, unofficial implementation aid.
