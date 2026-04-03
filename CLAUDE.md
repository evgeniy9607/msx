# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Media Station X (MSX) Smart TV portal — a launcher interface built entirely with static JSON files. No build step, no dependencies, no source code. Dual-hosted: GitHub Pages (`evgeniy9607.github.io/msx/`) and VPS (`xxitv.ru`).

## Architecture

**DO NOT modify the architecture.** Only change content within the existing structure.

**Entry point:**

- **start.json** — Application Root Object. Loads `menu.json` via `parameter: "menu:URL"`. Also sets the dictionary for UI localization.
- **menu.json** — Menu Root Object. Renders a sidebar on the left with 5 categories. Contains inline data for 4 categories and an external URL reference for TV.

**Sidebar categories (5 + Settings):**

| Category | Icon | Content source | Action types used |
|----------|------|---------------|-------------------|
| Онлайн-кинотеатры | `movie` | inline in menu.json (9 items) | mixed: `link:` (SmartTV apps) + `panel:` (MSX browser) |
| Бесплатные сервисы | `play-circle-outline` | inline in menu.json (6 items) | mixed: `link:`, `panel:`, `menu:request:interaction:` |
| ТВ Каналы | `live-tv` | VPS API `https://xxitv.ru/api/tv` | `video:` (HLS streams) |
| IPTV | `settings-input-antenna` | inline in menu.json (6 items) | `link:` + `panel:` (TorrServer) |
| Детям | `child-care` | inline in menu.json (3 items) | mixed: `link:` + `panel:` |

**TV channels:** served dynamically by VPS API (`https://xxitv.ru/api/tv`). API checks HLS stream availability and returns MSX Content Root Object. Fallback: `tv-cache.json` (auto-cached every 10 min) served by nginx if API is down.

**VPS (`xxitv.ru` / `155.212.247.44`):** Docker stack — nginx (reverse proxy + static), msx-api (Node.js, TV channel monitoring), TorrServer (torrent streaming). SSL via Let's Encrypt (auto-renewed). SSH user: `msx` (root disabled).

**Standalone content files (legacy, not linked in menu):**

- **streaming.json**, **free.json**, **kids.json** — alternative access via direct URL, use `panel:` actions with generic web URLs (vs `link:` with SmartTV URLs in menu.json).

**Layouts:**

| Content type | Layout | Template type | Tiles per row |
|-------------|--------|---------------|---------------|
| Streaming/Free services | `0,0,2,3` | `separate` | 6 large cards |
| TV channels/Kids/IPTV | `0,0,6,1` | `default` + `imageFiller: "height-left"` | 2 wide rows |

## Start URL

**Via VPS (primary):**
```
msx.benzac.de/index.html?start=menu:https://xxitv.ru/msx/start.json
```

**Via GitHub Pages (fallback):**
```
msx.benzac.de/index.html?start=menu:https://evgeniy9607.github.io/msx/start.json
```

Note: prefix is `menu:` (not `content:`). This is what enables the sidebar layout.

## Deployment

**GitHub Pages:** static files from `main` branch. Push to `main` → ~1 min → live. Menu.json uses `github.io` URLs for assets, `xxitv.ru` for API.

**VPS:** files in `/opt/msx/static/` (git clone of this repo). After push, run `deploy/sync.js` to pull changes. VPS menu.json uses `xxitv.ru` URLs (auto-replaced on sync). Deploy scripts require `deploy/.env` file (not in repo).

## MSX JSON Reference

**Application Root Object** (start.json):
- `name`, `version`, `dictionary`, `parameter` — app configuration
- `parameter: "menu:URL"` — loads a Menu Root Object

**Menu Root Object** (menu.json):
- `menu[]` — array of menu items with `label`, `icon`, `data` (inline object or URL to content JSON)
- `headline`, `background`, `transparent`, `dictionary` — visual and localization properties

**Content Root Object** (streaming.json, tv-*.json, etc.):
- `type: "list"` with `template` and `items[]` — templated tile grid
- `template.layout: "col,row,width,height"` — 12-column grid system
- `compress: true` — reduces vertical gaps between tiles
- Item properties: `label`, `sublabel`, `image`, `color`, `action`
- Optional: `badge`, `badgeColor`, `tag`, `tagColor` — labels on tiles

**Action types:**
- `link:URL` — opens URL in TV's native browser/app launcher (exits MSX)
- `panel:URL` — opens URL in MSX's built-in browser panel (stays in MSX)
- `video:URL` — plays HLS/m3u8 video stream directly
- `content:URL` — loads another Content Root Object (for navigation/subcategories)
- `menu:request:interaction:menu@URL` — loads dynamic MSX menu from remote endpoint

## Conventions

- All UI text in Russian
- Service logos via Google Favicons: `https://www.google.com/s2/favicons?domain={domain}&sz=128`
- Colors are brand-specific hex values per service
- MSX icon names follow Material Design (e.g., `movie`, `live-tv`, `child-care`)
- All service URLs must use HTTPS (except HLS video streams where HTTPS is unavailable)
