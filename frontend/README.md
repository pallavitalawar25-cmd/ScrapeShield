# ScrapeShield — Frontend

Plain HTML/CSS/JS dashboard that talks directly to your existing Flask
backend at `http://127.0.0.1:5000`. No build step, no framework — open it
with any static file server and it's live.

## File structure

```
scrapeshield/frontend/
├── index.html     # markup for the dashboard
├── style.css       # dark cybersecurity design system + animations
├── config.js       # API_BASE_URL + COLLECTION_ID (no secrets, ever)
├── app.js          # fetch calls, rendering, self-heal animation
└── README.md
```

## 1. Install

Nothing to install for the frontend — it's static files. You just need any
way to serve them (opening `index.html` directly with `file://` will hit
CORS issues in most browsers, so use a tiny local server instead):

```bash
cd scrapeshield/frontend
python3 -m http.server 5500
```

## 2. Run the frontend

```bash
# from scrapeshield/frontend
python3 -m http.server 5500
```

Then open **http://127.0.0.1:5500** in your browser. Keep your Flask app
running on port 5000 at the same time.

If you'd rather use Node, `npx serve -l 5500` works identically.

## 3. Backend CORS change (required)

Right now a browser page served from `http://127.0.0.1:5500` calling
`http://127.0.0.1:5000` is a cross-origin request, and Flask will block it
by default. Add `flask-cors` to your existing app — nothing else about your
backend needs to change:

```bash
pip install flask-cors
```

```python
# app.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://127.0.0.1:5500"}}, )
# also allow the root "/" health-check route ScrapeShield pings on load:
CORS(app, resources={r"/": {"origins": "http://127.0.0.1:5500"}})
```

(Simplest version if you just want it working fast: `CORS(app)` with no
restrictions — fine for a hackathon demo, just don't ship it that way.)

If you serve the frontend from a different port, update the origin above
and update `API_BASE_URL` in `config.js` if you move the backend.

## 4. Test every feature

| Feature | How to test |
|---|---|
| Connection indicator | Load the page with Flask running → top-right pill turns green, "Bright Data Connected". Stop Flask and reload → pill turns red, red banner appears with a **retry connection** link. |
| Collector metric | Should show `c_mt4depzp1d2e94mq76`, pulled live from `GET /`. |
| Extraction health | Loads from `GET /api/health/j_mt557r17c8k753mgr` on page load — 6 fields, each with an icon, animated progress bar, and present/total count. |
| Refresh Health button | Click it — re-fetches the same endpoint and re-renders the bars with a fresh animation. |
| Latest Scraped Record | Loads from `GET /api/results/j_mt557r17c8k753mgr` — shows the actual title/price/availability/rating/category/product URL. If your endpoint wraps the record in `{ "results": [...] }` or `{ "data": [...] }` or returns it as a bare object, `app.js`'s `extractRecord()` handles all three shapes. |
| Self-Healing Engine | Click **Run Self-Healing Demo** — plays "Extraction failure detected" → "Analyzing failed fields…" → calls `POST /api/self-heal` → animates through the returned `steps[]` one at a time → ends with "Recovery workflow completed / Data pipeline restored", badge turns green (RESTORED), and the health panel silently re-fetches. |
| Activity Timeline | Every real event above (connect, health check, data received, self-heal steps) prepends a timestamped entry — nothing here is hardcoded, it's a log of what actually happened in the session. |
| Error handling | Kill Flask mid-session and click Refresh Health or Run Self-Healing — you get an inline error state in that panel instead of a crash. |
| Responsive | Resize down to ~375px — metrics collapse to 2-up, the two-column section stacks, field rows drop the count column. |

## Notes

- `config.js` only ever holds `API_BASE_URL` and `COLLECTION_ID` — the
  Bright Data token stays server-side in your Flask app, as it should.
- The pulse/EKG graphic under the hero is the signature visual: it traces
  Website → Collector → Structured JSON → Health Monitoring → Self-Healing,
  so a judge gets the whole pitch before reading a word of copy.