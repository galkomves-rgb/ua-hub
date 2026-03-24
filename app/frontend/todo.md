# UAHAB Platform — Modular Ecosystem MVP

## Design Guidelines

### Design References
- **Olx.ua**: Structured classifieds with category-first navigation
- **DOU.ua**: Ukrainian tech community platform — clean, structured
- **Idealista.com**: Spanish real estate — strong filters, clear cards
- **Style**: Modern Ukrainian Community Platform — warm, trustworthy, structured

### Color Palette
- Primary Blue: #0057B8 (Ukrainian flag blue)
- Primary Gold: #FFD700 (Ukrainian flag gold)
- Dark BG: #0a1628, #0d1f3c, #111d32
- Dark Surface: #162236, #1a2a40
- Dark Border: #1a3050, #253d5c
- Light BG: #FAFAFA, white
- Light Surface: white, #F9FAFB
- Light Border: #E5E7EB, #D1D5DB
- Accent Blue Light: #4a9eff
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444

### Typography
- Font: Inter (Google Fonts) — clean, modern, excellent readability
- H1: Inter 700, 28-32px
- H2: Inter 700, 22-24px
- H3: Inter 600, 18px
- Body: Inter 400, 14-15px
- Small: Inter 400, 12-13px
- Nav: Inter 600, 14px

### Badge System
- Verified: green border + checkmark
- Premium: gold border + star
- Featured: blue highlight
- Business: briefcase icon
- Private: user icon
- Free: green text
- New: blue dot
- Urgent: red pulse
- Remote: wifi icon
- Online: globe icon

### Images to Generate
1. **hero-costa-blanca-community.jpg** — Panoramic view of Spanish coastal city with warm Mediterranean light, Ukrainian community feel (photorealistic, warm tones, 1024x576)
2. **module-jobs-banner.jpg** — Professional workspace, people collaborating, modern office environment (photorealistic, bright, 1024x576)
3. **module-housing-banner.jpg** — Beautiful Spanish apartment building with Mediterranean architecture, balconies with plants (photorealistic, warm, 1024x576)
4. **module-events-banner.jpg** — Community gathering, cultural festival, people celebrating together outdoors (photorealistic, vibrant, 1024x576)

---

## Architecture Overview

### File Structure (8 files max)
1. `src/lib/i18n.ts` — Full i18n system with UA/ES/EN translations + taxonomy data + module config
2. `src/lib/platform.ts` — Platform data: modules, categories, subcategories, sample listings, business data
3. `src/components/Layout.tsx` — Unified layout with header, footer, language switcher, auth, theme toggle
4. `src/components/Cards.tsx` — All card variants (job, housing, service, marketplace, event, community, org, business)
5. `src/pages/Index.tsx` — Homepage: hero, modules grid, featured listings, events, businesses, CTA
6. `src/pages/ModulePage.tsx` — Universal module page with filters, sort, category nav, listing grid
7. `src/pages/DetailPage.tsx` — Universal detail page + business profile + posting flow + platform pages
8. `src/App.tsx` — Router with all routes

### Key Decisions
- Single `ModulePage` component handles all 8 modules via URL params
- Single `DetailPage` component handles listing details, business profiles, create listing, and static pages
- i18n is context-based with useTranslation hook
- All taxonomy/category data lives in platform.ts
- Cards.tsx exports multiple card components
- Layout.tsx is the shared shell

## Development Tasks

1. ✅ Generate 4 images for hero and module banners
2. Create `src/lib/i18n.ts` — i18n system with full UA/ES/EN translations
3. Create `src/lib/platform.ts` — All platform data, modules, categories, sample listings
4. Create `src/components/Layout.tsx` — Unified layout component
5. Create `src/components/Cards.tsx` — All card variants
6. Rewrite `src/pages/Index.tsx` — Full homepage redesign
7. Create `src/pages/ModulePage.tsx` — Universal module page
8. Create `src/pages/DetailPage.tsx` — Detail + business profile + create listing + static pages
9. Rewrite `src/App.tsx` — Updated router
10. Lint & build check
11. UI check