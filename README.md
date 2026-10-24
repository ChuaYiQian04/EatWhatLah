# Eat What Lah?

A little spin. A delicious decision. A Malaysian kopitiam-inspired food picker with 35 local and international foods, custom cravings, an animated wheel and real nearby food discovery.

## Download and launch

1. On GitHub, choose **Code → Download ZIP**.
2. Extract the archive, keeping its files together.
3. Double-click **index.html** in a modern browser.

No installation, Node.js, npm, backend, database, account, API key or build step is needed. All required assets are local. The wheel and food checklist work offline. Nearby search and external Maps links need internet.

## Features

- **Anything lah!** instantly picks from 12 house favourites when you have no preferences, even with an empty checklist. It leaves your selected menu and wheel unchanged, respects **Avoid last result** and **Sound on**, and records the choice in history. **Anything else lah?** gives another instant suggestion. This shortlist does not apply dietary filters or use nearby places.

- Search and seven category filters; Select All and Clear All apply to the complete food menu. Nearby places have separate selection controls.
- Custom foods with trimmed names, duplicate validation, editing, deletion and 16 selectable food icons. Icons remain editable and persist across reloads; older custom foods receive a default icon.
- A 4.8-second eased Canvas wheel, fixed pointer, result dialog and confetti. Enable **Sound on** for spinning ticks and a short ascending chime when the result appears. Sounds are synthesized locally and work offline. Reduced motion uses a brief transition without confetti.
- Uniform selection among eligible choices. Avoid Last Result excludes the previous winner when two or more choices exist.
- Empty and single-choice states; crowded wheels use numbers with an expandable full-name legend.
- Real nearby restaurants, cafés and fast-food outlets with straight-line distances and Google Maps links.
- Nearby results show eight places per page, closest first within the returned results. Search names, filter place types or view selected places only. Selections stay on the wheel across pages and filters. **Select this page** adds only the visible eight (or fewer); **Clear nearby** removes every restaurant selection. Browsing and filtering use the existing results without extra API requests.
- Malaysian Kopitiam (default), Cute Foodie, Midnight Makan and Minimal Makan palettes share the same layout, typography, controls and icon alignment. An original kopi-cup and floral-tile background is included locally; wheel colours follow each palette.
- localStorage saves food selections, custom foods, theme, settings and the last ten spin results. Reset Defaults restores the initial eight default selections and retains custom foods. Reset All Data requires confirmation.
- Responsive styling, keyboard controls, visible focus, native dialogs and status feedback.

## Nearby search and privacy

Click **Use my location** to request browser permission. Geolocation on **file:// is not guaranteed**: many browsers block it. Denial does not affect offline features.

Fallback: expand **Enter coordinates manually**, enter latitude (−90 to 90) and longitude (−180 to 180), select 1, 3, 5 or 10 km and press **Find food**. For example, Kuala Lumpur is approximately `3.1390, 101.6869`. Obtain coordinates from your map app. After changing radius, run the search again.

The app distinguishes permission denial, provider unavailability, timeout, insecure contexts and host policy restrictions. A failed request opens manual input and troubleshooting help. Check your browser’s Location permission and your operating system’s Location Services. On Windows: Settings → Privacy & security → Location, including permission for desktop apps. Local-file access still depends on the browser; code cannot override denied permission. Device requests time out after 20 seconds, with a 25-second watchdog to release the UI if the browser never responds. A manual search supersedes an outstanding device request.

Search sends coordinates to the public Overpass service at overpass-api.de. If that service fails, **Try alternate search** explicitly retries using the public Private.coffee Overpass instance; there is no automatic cross-service retry. Both return OpenStreetMap data. Coordinates, search results and restaurant selections stay in session memory and are not stored permanently. History retains result names but no coordinates. Opening Google Maps sends the selected place query to Google. No analytics or remote fonts are used.

Overpass availability is not guaranteed. Requests have a 30-second client timeout, a 22-second API timeout and a maximum of 150 elements. Identical successful searches are cached in memory for five minutes. Results are sorted by distance within the returned subset; a dense area may not return the nearest 150 places. Nodes use their coordinates; ways and relations use centers. Unnamed places are explicitly labeled; no names, ratings, prices or hours are fabricated.

## Screenshots

- Desktop kopitiam experience — screenshot placeholder.
- Mobile wheel and checklist — screenshot placeholder.
- Midnight Makan and nearby results — screenshot placeholder.

## Structure and technologies

```text
index.html          Interface and native dialogs
css/style.css       Responsive styling and four themes
js/food-data.js     Default food catalogue
js/storage.js       Versioned, validated localStorage
js/wheel.js         Canvas animation and pointer alignment
js/nearby.js        Overpass, cache, Haversine distance, map URLs
js/location.js      Browser location checks, errors and timeout recovery
js/app.js           UI and interaction state
components/         Shared SVG icons, accessible food-icon picker and styles
assets/             Original kopi-cup logo and kopitiam background SVGs
tests/verify.cjs    Optional developer verification
tests/browser-check.cjs  Optional local Chrome desktop/mobile check
LICENSE            MIT
```

Built with HTML5, CSS3 and vanilla ES6+ JavaScript, Canvas, Web Audio, Fetch, Geolocation and localStorage. Deferred classic scripts support opening directly via file://. User and API text uses safe DOM methods rather than HTML strings. Icons are local CSS/SVG/text and system emoji. No dependencies or CDN assets are required.

## Verification

Optional developer check: `node tests/verify.cjs`. Node is used only for this check, never to run the site. It verifies syntax, asset paths, DOM references, catalogue, corrupted storage recovery and persistence, wheel alignment with 1–150 choices, avoidance, distance, Overpass parsing, deduplication, cache reuse and input validation.

Location regression checks also cover permission denial, unavailable providers, timeout/watchdog, insecure contexts and host policy. UI regression checks cover icon selection/editing/reload and alternate-search recovery. These checks use fixtures; they do not measure the user’s real location. During the live check, the primary service returned errors/timeouts and later a successful diagnostic response; the alternate service timed out. Public service availability remains a limitation.

Manual acceptance checks:

1. Open index.html offline. Select, clear, search, filter, add, edit and delete foods. Spin and confirm the pointer matches the result.
2. Enable avoidance and sound, spin repeatedly, change themes, reload and check persistence. Test empty, single-choice and crowded wheels.
3. Check desktop (1440×1000) and mobile (390×844), keyboard focus, dialogs and reduced motion.
4. Online, test manual coordinates, denied location, nearby selection, Maps links, empty results, connection errors and Retry.
5. Confirm Reset Defaults retains custom foods and Reset All Data clears preferences and history.

Optional browser check: `node tests/browser-check.cjs` uses installed Chrome on Windows (or set `CHROME_PATH` for another location). It opens the actual file:// app at desktop and mobile viewport sizes, checks overflow, shared theme geometry, search-icon centering, custom-icon add/edit/persistence and checklist controls, and saves ignored screenshots in tests/. It also tests device location success/denial/unavailability/timeout using explicit test fixtures. Add `--live` for one real nearby request using the Kuala Lumpur example; add `--alternate` to use the alternate provider. No packages are installed. Real device positioning and browser/OS permissions still require manual verification.

## Limitations and troubleshooting

- Nearby errors: check internet, retry later or reduce the radius. CORS restrictions, public service failures, rate limits and timeouts are explained in the UI. Mock data is never substituted.
- Location unavailable: enter coordinates manually. HTTPS hosting may improve browser location support, subject to permission.
- Preferences not remembered: browser storage may be blocked, full or restricted in private/file browsing. The app still works for the current visit. Moving the folder or changing browsers may change storage scope.
- Place data may be incomplete, duplicated or outdated. Name-and-coordinate deduplication is approximate. Distances are straight-line estimates, not travel distances.
- Wheel labels may be abbreviated; full names remain in the checklist, legend and result.
- Sound and emoji appearance depend on browser and OS. Sound is off by default and starts only from a user gesture.

## Acknowledgments and license

Place data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under ODbL, accessed via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). Google Maps links open externally. System fonts and emoji are provided by your device.

MIT license — see [LICENSE](LICENSE). OpenStreetMap data retains its own attribution and licensing requirements.
