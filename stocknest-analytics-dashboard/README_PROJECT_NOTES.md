# StockNest — Analytics & Reporting (Frontend Clone)

A pixel-close, framework-free recreation of the "Analytics & Reporting" screen
from the uploaded Figma screenshot, built with **plain HTML, CSS, and
JavaScript only**.

## Folder structure

```
stocknest-analytics-dashboard/
├── sn_dashboard_view.html          → Main page markup
├── assets/
│   ├── css/
│   │   └── sn_dashboard_style.css  → All styling (layout, colors, responsive rules)
│   └── js/
│       └── sn_dashboard_script.js  → Chart rendering + button interactions
└── README_PROJECT_NOTES.md         → This file
```

File names are deliberately unique/prefixed (`sn_...`) so they won't collide
with teammates' `index.html` / `style.css` / `script.js` files if you merge
folders in one repo.

## About the images/icons used

- **All UI icons** (sidebar icons, search, bell, calendar, arrows, dots,
  wrench, etc.) are **hand-built inline SVGs**, embedded directly in the CSS
  as `mask-image` data URIs. No icon font, no external icon library, no
  network request required — they render entirely offline.
- **The user avatar** in the top-right corner uses a placeholder image from
  `https://i.pravatar.cc/64?img=13` (a free placeholder-avatar service), since
  the original design's real avatar photo isn't available to reproduce.
  **To replace it:** put your own image (e.g. `profile.jpg`) inside a new
  `assets/img/` folder and update the `src` in `sn_dashboard_view.html`:
  ```html
  <img src="assets/img/profile.jpg" alt="User avatar" />
  ```
  If you have no internet access when opening the page, this avatar simply
  won't load (broken image icon) — everything else on the page is 100% local
  and will still work perfectly.

## Data shown on the page

The stat cards, bar chart, and donut chart use the same sample numbers shown
in the screenshot ($1.24M, 87%, 94.2%, 142, weekly room-utilization bars,
60/25/15% asset status). The bar chart and donut chart are generated
dynamically by `sn_dashboard_script.js` from small JS arrays — edit the
`data` array in `renderRoomUtilizationChart()` or the `segments` array in
`renderAssetStatusDonut()` to plug in your own numbers later.

## What's interactive right now

- Sidebar collapses into a slide-in drawer on mobile widths (hamburger
  button appears below ~860px).
- "Quick Add", "Export", "Notifications", and the chart's "⋯" menu show
  demo alert popups (placeholders for real functionality you'd wire up later).
- "Last 30 Days" button cycles through a few date-range labels on click.
- Bar chart bars and the donut chart are drawn/animated via JavaScript, not
  hardcoded as static images.
