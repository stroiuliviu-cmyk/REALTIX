# REALTIX — Design System

> A working design system distilled from the **REALTIX** production codebase — a
> Moldovan real-estate **SaaS CRM** for agencies and independent realtors.

REALTIX is an all-in-one real-estate platform that combines a **CRM**, a
**multi-portal listing aggregator/scraper** (999.md, imobiliare.md), and an
**AI assistant** (valuation + listing-copy generation). Agencies manage their
own listings, sync external offers, run a client pipeline, schedule viewings,
generate contracts, auto-post to portals, and track commission. It is
multi-tenant (per-agency), role-based (`super_admin` / `admin` / `realtor`),
and trilingual: **Romanian (default), Russian, English**.

The product is built with **Laravel 12 + Inertia.js + React (JSX) + Tailwind CSS**.
This design system recreates its visual language as reusable HTML/CSS/JSX so you
can build on-brand mocks, prototypes, and production-adjacent UI quickly.

---

## Sources

This system was reverse-engineered from one GitHub repository. If you have
access, explore it directly to build higher-fidelity work — the React pages
under `REALTIX/resources/js/Pages/` are the ground truth for every screen.

- **GitHub:** https://github.com/stroiuliviu-cmyk/REALTIX
  - App root: `REALTIX/` (Laravel app in a subfolder)
  - Frontend: `REALTIX/resources/js/` — `Pages/`, `Components/`, `Layouts/`
  - Styling: `REALTIX/resources/css/app.css`, `tailwind.config.js`
  - Logo: `REALTIX/resources/images/logo.svg`
  - Marketing/landing prototype: `index.html` (repo root)

No Figma file or slide deck was provided.

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | This file — product context, content + visual foundations, iconography |
| `colors_and_type.css` | All design tokens: colors, gradients, radii, shadows, type scale + semantic classes |
| `SKILL.md` | Agent-Skill manifest so this system works inside Claude Code |
| `assets/realtix-logo.svg` | Full logo (house mark + wordmark) on white — use on **light** surfaces |
| `assets/realtix-logo-transparent.svg` | Logo with the white plate removed |
| `preview/*.html` | Design-system specimen cards (colors, type, components, spacing) |
| `ui_kits/app/` | **In-app workspace** UI kit — the agency dashboard product (light + dark) |
| `ui_kits/marketing/` | **Marketing + auth** UI kit — landing page and login (light + dark) |
| `ui_kits/theme.css` | Light/dark theme — toggling `dark` on `<html>` remaps the kit's utilities |

> On **dark** surfaces (sidebars, auth panels) the product renders the wordmark
> as **Montserrat black, uppercase, letter-spacing ~0.18em** text — not the SVG —
> because the logo SVG carries a white plate. Do the same.

---

## CONTENT FUNDAMENTALS

**Language.** Romanian is primary (`ro`); Russian (`ru`) and English (`en`) are
supported. Default all sample copy to Romanian unless asked otherwise.

**Voice & address.** Warm, direct, second-person informal **"tu"** — the product
talks *to* the realtor like a capable colleague. Examples from the app:
- *"Ai nevoie de ajutor?"* (Need help?)
- *"Iată rezumatul activității tale de azi."* (Here's a summary of your activity today.)
- *"Oportunități cu potențial ridicat pentru portofoliul tău"* (High-potential opportunities for your portfolio)
- *"Adaugă primul anunț sau ajustează filtrele."* (Add your first listing or adjust the filters.)

**Tone.** Professional but friendly and pragmatic. Confident, never salesy in-app.
Marketing is slightly more aspirational: *"Găsește. Evaluează. Vinde mai rapid."*
(Find. Evaluate. Sell faster.) and *"Găsește, evaluează, vinde — ușor."*

**Casing.** Sentence case for headings and buttons (*"Anunț nou"*, *"Vezi statistici"*,
*"Resetează filtrele"*). UPPERCASE is reserved for the **wordmark** and small
**eyebrow/section labels** (e.g. `INDICATORI CHEIE`, `PLATFORMĂ IMOBILIARĂ`), set
with wide letter-spacing.

**Technical terms stay in English** even inside Romanian copy: *Workspace, trial,
AI, CRM, lead, pipeline, dashboard*.

**Numbers & money.** Locale-formatted (`ro` / `ro-MD`): `12.812`, `€65,000`,
`55 m²`, `+373 ...`. Big metrics use tabular figures and heavy weight.

**Emoji are NOT used in this system.** The source product used emoji liberally
as accents; this design system replaces them entirely with **Lucide icons** for a
more sober, enterprise feel. Use a Lucide glyph wherever you'd reach for an emoji
(see ICONOGRAPHY). Reserve any emoji strictly for user-generated content.

**Vibe.** A trustworthy, enterprise-grade control panel for a traditionally
low-tech industry — "the calm, precise operating system for your agency."

---

## VISUAL FOUNDATIONS

**Overall feel.** Clean, airy, light-mode **enterprise SaaS** with a confident
navy + blue identity and crisp white cards. Restrained: a single blue accent over
a slate-neutral base, flat fills, minimal soft shadows, calmer radii, and a
signature **navy panel ⇄ light content** pairing. (This is a deliberate evolution
of the source product, which leaned more casual/colourful.)

> **Enterprise refinement applied:** emoji → Lucide icons; vivid button gradients
> + colored glows → flat blue with subtle shadow; rainbow stat tiles → neutral
> slate icon squares; rounded-3xl/4xl surfaces → mostly 12–16px; blue→emerald
> accent retired in favour of a single restrained blue.

**Color.**
- **Primary blue** `#2563eb` (hover `#1d4ed8`) drives all interaction: buttons,
  active nav, links, focus rings, selected chips, checkboxes.
- **Slate neutrals** form the entire surface + text system (`slate-50` canvas →
  `slate-900` headings). Deep navy `#0f172a → #0b1120 → #020617` for dark rails.
- **Semantic:** emerald `#10b981` (success/active/paid), amber `#f59e0b`
  (trial/archive/pending), red `#dc2626` (delete/error), **rose `#e11d48`**
  (super-admin only). Reserved strictly for status — **not** for decoration.
- **Category tiles are neutral** (slate icon on a `slate-100` square); teal/pink/
  violet survive only for multi-series charts, used sparingly.
- **Brand accents** from the logo: navy `#0B1A4A`, gold `#F0AB29`, swoosh-blue
  `#1A97FB` — used in the mark and rare brand moments.

**Type.** **Inter** for everything UI (weights 300–900). **Montserrat** (700/800)
for the wordmark and a few hero headings. Big numbers go `font-bold` (700) with
tight tracking; the wordmark is Montserrat 800, `0.16em`. Small labels are
uppercase + letter-spaced. Body is 14px.

**Spacing & layout.** 4px base rhythm; cards use 16–24px padding; sections gap
16–24px. Fixed 256px (`w-64`) dark sidebar on desktop; sticky glassy header
(`bg-white/90 backdrop-blur-xl`); raised-FAB bottom nav on mobile. Content max
width ~`screen-2xl`. Two-pane filter+list layouts for catalog pages.

**Backgrounds.** Mostly flat white cards on a barely-there page gradient
(`slate-50 → white → blue-50`). Dark surfaces use multi-stop navy gradients.
Decorative-but-subtle motifs appear behind dark heroes: a **dotted radial grid**
(opacity ~0.07), a **wireframe skyline silhouette** (opacity ~0.08), and an
**animated market line-chart** on the auth panel. No photography in chrome;
listing imagery is user-supplied (cover photos), shown in `object-cover` tiles
with a building-icon placeholder when missing. No heavy textures, no
glassmorphism beyond the header blur.

**Gradients.** Reserved for **dark surfaces only**: sidebar/hero/auth navy
gradients + the whisper-faint page canvas. Buttons and accents are **flat** — no
button gradients, no blue→emerald text gradient, no purple gradients.

**Corner radii.** Calmer than the source: chips/badges `8px`, most
surfaces — inputs, buttons, cards `12px`, panels/menus/rails `16px`, login &
modals `24px`, pills & avatars fully round.

**Cards.** White, `border border-slate-200/70`, `rounded-xl`, `shadow-sm` at
rest. Hover lifts gently: shadow grows to `shadow-lg` + border darkens, `200ms`.
Listing/deal cards scale the image only on hover.

**Shadows.** Soft and minimal. `shadow-sm` on resting cards; gentle `shadow-lg`
on hover; a deeper menu shadow for dropdowns. **No colored glow** — the primary
button carries only a subtle 1px shadow. No inner shadows.

**Borders.** Hairline `1px` in `slate-100` (inside light cards) or `slate-200`
(inputs, dividers). On dark surfaces, `white/6–white/10`. Inputs go to
`blue-500` on focus with a soft `0 0 0 3px rgba(59,130,246,.12)` ring.

**Hover / press.**
- Buttons: primary shifts one step darker (`blue-600 → blue-700`), no lift, no
  glow. Dark buttons → `slate-800`. Secondary/ghost → `slate-50` fill.
- Nav/menu items: fill `slate-50` (light) or `white/5` (dark); active nav is a
  flat `blue-600` pill (no gradient).
- Cards/rows: border darkens (`slate-300`) + shadow grows slightly.
- Press: simple color change; no scale.

**Animation.** Restrained and functional. `transition-colors`/`transition-all`
at `150–250ms`, ease or `cubic-bezier(.4,0,.2,1)` for the segmented-control
sliding pill. Entrance: gentle `fadeSlideIn` (16px rise, 0.5s). Ambient loops on
auth only (floating stat cards, scrolling charts, pulsing loader dots). No
bounces, no parallax, `prefers-reduced-motion` respected by keeping motion small.

**Transparency & blur.** Reserved for the sticky header (`white/90` + `backdrop-blur-xl`),
mobile drawer scrims (`black/40` + `backdrop-blur-sm`), and translucent stat
tiles on dark heroes (`white/6` + `backdrop-blur-sm`). Use sparingly.

**Imagery vibe.** Neutral, true-color real-estate photos (user uploads); no
filters/grain/duotone applied by the system. Empty states fall back to a centered
Lucide glyph + muted copy rather than illustration.

---

## ICONOGRAPHY

This system standardizes on **Lucide** for all iconography — emoji from the
source product have been removed for a more enterprise look.

**1. Lucide (the icon system).** Clean, **2px stroke**, rounded line icons from
[`lucide-react`](https://lucide.dev) (the app's own dependency). Active nav items
bump the stroke to `2.25–2.5`. In the kits, icons are inlined as a small Lucide
path set (see `ui_kits/app/ui.jsx` → `<Icon name>`); in plain HTML, load from CDN:
`<script src="https://unpkg.com/lucide@latest"></script>` then `lucide.createIcons()`,
or copy individual SVGs from lucide.dev. Color inherits `currentColor`
(slate-400/500 idle, slate-600 in tiles, blue-600/white when active).

Mapping that replaces the old emoji set: `building` listings/agency · `users`
clients · `refresh-cw` deals · `banknote`/`credit-card` revenue/billing ·
`calendar`/`calendar-check` calendar/viewings · `globe` web offers · `sparkles`
AI · `clock`/`alert-triangle` trial/warning · `lock`/`shield-check`/`zap` trust
badges · `pencil`/`archive`/`trash` row actions · `log-out` logout · `bell`
notifications.

**2. Unicode micro-glyphs.** Still fine for lightweight inline marks where an
icon is overkill: `›` chevron, `✓` check, `✕` close, `↑`/`↓` valuation arrows,
`→` "see all" links.

**Emoji: do not use.** The source product used emoji as accents; this system
replaces them with Lucide. Only user-generated content may contain emoji.

**Logo mark.** A house/roof silhouette with a stylized navy **"R"**, a **gold**
(`#F0AB29`) roof outline + window grid, and a **bright-blue** (`#1A97FB`) swoosh.
In compact UI the app substitutes the Lucide `Home` icon + Montserrat wordmark
instead of the full SVG. No other illustration system; **never hand-draw new
icons** — use Lucide, an emoji from the set above, or the logo.

---

## Quick start

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Montserrat:wght@700;800&display=swap" rel="stylesheet">
<link href="colors_and_type.css" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>   <!-- the product is Tailwind-based -->
<script src="https://unpkg.com/lucide@latest"></script>
```

Then build with the tokens in `colors_and_type.css` and the patterns shown in
`preview/` and `ui_kits/`. When in doubt, match the source repo screen-for-screen.
