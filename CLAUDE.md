# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Media Station X (MSX) Smart TV portal — a launcher interface built entirely with static JSON files. No build step, no dependencies, no source code. Files are served via GitHub Pages at `evgeniy9607.github.io/msx/`.

## Architecture

**DO NOT modify the architecture.** Only change content within the existing structure.

**Entry point:**

- **start.json** — Application Root Object. Loads `menu.json` via `parameter: "menu:URL"`. Also sets the dictionary for UI localization.
- **menu.json** — Menu Root Object. Renders a sidebar on the left with 5 categories. Contains inline data for 4 categories and an external URL reference for TV.

**Sidebar categories (5):**

| Category | Icon | Content source | Action type |
|----------|------|---------------|-------------|
| Онлайн-кинотеатры | `movie` | inline in menu.json | `link:` (opens SmartTV app) |
| Бесплатные сервисы | `play-circle-outline` | inline in menu.json | `link:` (opens SmartTV app) |
| ТВ Каналы | `live-tv` | external `tv.json` | `content:` (subcategories) |
| IPTV | `settings-input-antenna` | inline in menu.json | `link:` (opens SmartTV app) |
| Детям | `child-care` | inline in menu.json | `link:` (opens SmartTV app) |

**TV subcategories (tv.json → external files):**

- **tv-federal.json** — Федеральные каналы (Первый, Россия 1, НТВ, etc.)
- **tv-news.json** — Новости (Россия 24, etc.)
- **tv-entertainment.json** — Развлекательные (ТНТ, СТС, Пятница, etc.)
- **tv-kids.json** — Детские (Карусель, Мульт)
- **tv-sport.json** — Спорт (Матч ТВ)

**Standalone content files (alternative access):**

- **streaming.json** — Стриминговые сервисы (uses `panel:` action, Clearbit logos)
- **free.json** — Бесплатный контент (uses `panel:` action, Clearbit logos)
- **kids.json** — Детский контент (uses `panel:` action, Clearbit logos)

Note: Standalone files use `panel:` with generic web URLs. Menu.json inline uses `link:` with SmartTV-specific URLs (LG/WebOS apps). These are intentionally different — `link:` launches native TV apps, `panel:` opens in MSX's built-in browser.

**Layouts:**

| Content type | Layout | Template type | Tiles per row |
|-------------|--------|---------------|---------------|
| Streaming/Free services | `0,0,2,3` | `separate` | 6 large cards |
| TV channels/Kids/IPTV | `0,0,6,1` | `default` + `imageFiller: "height-left"` | 2 wide rows |

## Start URL

```
https://msx.benzac.de/index.html?start=menu:https://evgeniy9607.github.io/msx/start.json
```

Note: prefix is `menu:` (not `content:`). This is what enables the sidebar layout.

## Deployment

Static files hosted on GitHub Pages from the `main` branch. Push to `main` → wait ~1 minute → changes live. No build process.

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
- Service logos via Clearbit: `https://logo.clearbit.com/{domain}`
- Colors are brand-specific hex values per service
- MSX icon names follow Material Design (e.g., `movie`, `live-tv`, `child-care`)
- All service URLs must use HTTPS (except HLS video streams where HTTPS is unavailable)
