# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Media Station X (MSX)** portal — a Smart TV launcher interface built entirely with JSON configuration files. MSX is a media app platform for Smart TVs and set-top boxes that renders UI from JSON descriptors. There is no build step, no dependencies, and no source code — just JSON files served to the MSX app.

## Architecture

- **start.json** — Main entry point. Single-page layout using absolute positioning (`layout: "col,row,width,height"`). Contains all service cards organized under section headers (Стриминг, Бесплатно, ТВ Каналы, Детям). Uses `type: "list"` with manual grid coordinates.
- **streaming.json** — Streaming services sub-page (Кинопоиск, IVI, Okko, etc.). Uses `template` with `type: "separate"` for uniform card layout.
- **free.json** — Free content sub-page (YouTube, RuTube, Смотрим, etc.)
- **tv.json** — TV channels sub-page (Первый канал, Россия 1, НТВ, etc.)
- **kids.json** — Kids content sub-page (YouTube Kids, IVI Детям, Мульт, etc.)

## MSX JSON Format

Each file follows the MSX content format:
- `type`: layout type (`"list"` for grid layouts)
- `headline`: page title
- `template`: default item properties (used in sub-pages)
- `items[]`: array of service cards with `label`, `sublabel`, `image`, `color`, `action`
- `layout`: absolute grid position as `"col,row,width,height"` (12-column grid, used in start.json)
- `action`: typically `"panel:URL"` to open a service link
- `image`: service logos via clearbit API (`https://logo.clearbit.com/domain`)

## Conventions

- All UI text is in Russian
- Section headers in start.json use items with only `label` and `color` (no action/image) and span full width (`12,1`)
- Service cards are 3x4 grid units in start.json, 4x4 in sub-pages
- Colors are brand-specific hex values per service
