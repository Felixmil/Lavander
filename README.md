## Lavender Pricing Calculator

Set the right price per unit for custom lavender pouches with a clean, static web app you can deploy to GitHub Pages.

### Features
- Raw materials, units, total time, hourly rate, and fixed costs (design, communication, shipping)
- Automatic cost breakdown: total and per-unit
- Smart price suggestions: Break-even, Budget (25%), Standard (50%), Premium (100%), plus a Custom margin
- Practical rounding to the nearest €0.50
- One-click export (print/save as PDF)
- 100% client-side — your data stays in your browser

### Getting started (local)
1. Open `index.html` in your browser, or serve the folder locally, e.g.:
   - Python: `python3 -m http.server` then visit `http://localhost:8000`
2. Enter your numbers in the Inputs panel; results and suggestions update instantly.

### Deploy to GitHub Pages
This repo includes a workflow at `.github/workflows/deploy.yml` that deploys the site automatically on every push to `main`.

Steps:
1. Create a new GitHub repository and push this folder as the root of the repo.
2. Ensure your default branch is `main` (or update the workflow if you use a different branch).
3. Go to the repo’s Settings → Pages and ensure “Build and deployment” is set to “GitHub Actions.”
4. Push to `main`. The action will build and deploy. Your site will be available at the URL shown in the workflow run and in Settings → Pages.

### How pricing works
- Materials = `cost_per_unit × units`
- Labour = `time_hours × hourly_rate`
- Fixed = `design + communication + shipping`
- Total cost = `materials + labour + fixed`
- Cost per unit = `total_cost ÷ units`
- Suggestions apply a margin to cost per unit, then round to the nearest €0.50.

### Customization
- Rounding step: change `roundingStep` in `app.js` (default: `0.5`).
- Default margins: adjust the 25/50/100 values in `app.js`.
- Styling: edit `styles.css` (colors and layout use CSS variables at the top).

### License
MIT


