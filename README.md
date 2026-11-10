# TumbuhKembang — Child Development Screening (Unofficial)

A mobile-friendly, **unofficial** web app for child developmental screening,
based on Denver II–style milestones, for children
**0–6 years (0–72 months)**, across the 4 sectors used by the Denver II:

- Personal–Social
- Fine Motor–Adaptive
- Language
- Gross Motor

General-purpose: usable for any child, no account, no backend, no build step.
Pure HTML/CSS/JavaScript in a multi-file structure — deploy it anywhere
static files can be hosted.

## Features

- **Simplified checklist (default)** — items are grouped for the child's age:
  - *Expected by now* — a Fail is a **Delay**
  - *Due around now* — a Fail in the 75–90% zone is a **Caution**
  - *Coming up next* — preview only, not scored
- **Chart view** — one bar per item spanning the age when 25%–90% of children
  pass it (darker tail = 75%–90%), with a red age line for the child.
  The chart is windowed around the child's age so it never scrolls
  sideways on a phone.
- **Scoring** — Pass / Fail / Refusal / No Opportunity per item, with a
  simplified interpretation based on the Denver II method:
  - **Normal:** no Delays, at most 1 Caution
  - **Suspect:** ≥1 Delay and/or ≥2 Cautions
  - **Untestable:** Refusal on an expected/due item — retest in 1–2 weeks
- **Corrected age** — if a child was born prematurely (weeks early) and is
  under 24 months, the age line uses corrected age.
- **Bilingual** — English / Bahasa Indonesia toggle (UI + item names).
- **History** — screenings saved during a visit are kept in page memory for
  comparing repeat screenings in the same session (they clear on reload).
  Nothing is sent to a server. No PDF/export by design (v1).

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
gh repo create tumbuh-kembang --public --source=. --remote=origin --push

# Option B — manual: create an empty repo on github.com first, then
git remote add origin https://github.com/<your-username>/tumbuh-kembang.git
git push -u origin main
```

## Project structure

```
.
├── index.html      # App shell / UI (loads the files below)
├── css/styles.css  # Mobile-first styles
└── js/
    ├── data.js     # Milestone dataset: 108 items, ages in months [p25,p50,p75,p90]
    ├── i18n.js     # UI strings EN / ID
    └── app.js      # Age calc, checklist, scoring, chart, history
```

## About the data — please read

The milestone ages in `js/data.js` (the `RAW` dataset) are a **simplified
approximation** of the published Denver II norms, included so the app works
out of the box and so the dataset stays readable and editable. Denver II has
125 items; this version ships 108 representative items across all ages and
sectors (Personal–Social 24, Fine Motor–Adaptive 27, Language 30, Gross Motor 27).

**This app is a screening aid for education and screening support only — it
is not the official Denver II test, it is not a diagnosis, and it does not
replace the official test form (administered and interpreted by trained
professionals) or a professional assessment. Do not use it for clinical
decisions.** Discuss a *Suspect* result with a paediatrician or
child-development professional.

## License & legal status

- **Code** — the HTML/CSS/JavaScript written for this project is MIT-licensed;
  see `LICENSE`. The MIT license covers the code only.
- **Dataset** — the milestone dataset in `js/data.js` is **not** official
  Denver II test content and is **not** covered by the MIT license as an
  original work of the test authors: it is a simplified approximation based
  on Denver II milestones, provided for education and screening support only.
- **Affiliation** — this is an independent, unofficial project. It is not
  affiliated with, endorsed by, or sponsored by Denver Developmental
  Materials, Inc. or the authors of the Denver Developmental Screening
  Test II (Frankenburg et al.). The name "Denver II" is used descriptively
  only, to identify the method this aid is based on; the test, its forms and
  manuals remain the property of their respective owners.
