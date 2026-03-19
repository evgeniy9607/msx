# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Media Station X (MSX) Smart TV portal — a launcher interface built entirely with static JSON files. No build step, no dependencies, no source code. Files are served via GitHub Pages at `evgeniy9607.github.io/msx/`.

## Architecture

**DO NOT modify the architecture.** Only change content within the existing structure.

**Sidebar menu + content pattern:**

- **start.json** — Menu Root Object. Renders a sidebar on the left with 4 categories. Each menu item's `data` points to a content JSON file. Uses custom background image (`background.png`) and `transparent: 2`.
- **streaming.json** — Онлайн-кинотеатры (Кинопоиск, IVI, Okko, etc.)
- **free.json** — Открытые сервисы (YouTube, RuTube, Смотрим, etc.)
- **tv.json** — ТВ Каналы (Первый канал, Россия 1, НТВ, etc.)
- **kids.json** — Детям (YouTube Kids, IVI Детям, Мульт, etc.)

Content files use Content Root Object format: `type: "list"`, `compress: true`, template `layout: "0,0,2,2"` (6 tiles per row).

## Start URL

```
https://msx.benzac.de/index.html?start=menu:https://evgeniy9607.github.io/msx/start.json
```

Note: prefix is `menu:` (not `content:`). This is what enables the sidebar layout.

## Deployment

Static files hosted on GitHub Pages from the `main` branch. Push to `main` → wait ~1 minute → changes live. No build process.

## MSX JSON Reference

**Menu Root Object** (start.json):
- `menu[]` — array of menu items with `label`, `icon`, `data` (URL to content JSON)
- `headline`, `background`, `transparent`, `style` — visual properties

**Content Root Object** (streaming.json, etc.):
- `type: "list"` with `template` and `items[]` — templated tile grid
- `template.layout: "col,row,width,height"` — 12-column grid system
- `compress: true` — reduces vertical gaps between tiles
- Item properties: `label`, `sublabel`, `image`, `color`, `action`
- `action: "panel:URL"` — opens a service link

## Conventions

- All UI text in Russian
- Service logos via Clearbit: `https://logo.clearbit.com/{domain}`
- Colors are brand-specific hex values per service
- MSX icon names follow Material Design (e.g., `movie`, `live-tv`, `child-care`)
