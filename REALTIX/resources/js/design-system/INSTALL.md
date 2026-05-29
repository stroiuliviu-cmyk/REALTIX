# REALTIX Design System — pachet pentru repo

Conține design tokens, theme dark mode, și referințe componente pentru refactor-ul UI.

## Unde se pune în repo

Copiază TOT folderul în:
```
REALTIX/resources/js/design-system/
```

Astfel Claude Code îl poate citi ca referință autoritativă.

## Conținut

| Fișier | Rol |
|--------|-----|
| `DESIGN_SYSTEM.md` | Filozofia completă + foundations (citește ÎNTÂI) |
| `colors_and_type.css` | Toate tokens: culori, gradient, radii, shadow, type |
| `theme.css` | Dark mode (class `.dark` pe `<html>` remap utilities) |
| `ui-kit-reference.jsx` | Cod referință primitive (Icon/Button/Badge/Card/Wordmark/ThemeToggle) |
| `AppShell-reference.jsx` | Cod referință sidebar + header |
| `assets/` | Logo SVG (light + transparent) |

## Reguli cheie (rezumat)

- Primary blue `#2563eb` (hover `#1d4ed8`) — TOATE interacțiunile
- Slate neutrals pentru surface + text
- Navy gradient DOAR pe dark surfaces (sidebar, hero, auth)
- Emoji → Lucide icons peste tot
- Butoane FLAT (fără gradient, fără glow colorat)
- Stat tiles NEUTRE (slate icon pe slate-100, nu colorate)
- Radii: chips 8px, cards/buttons/inputs 12px, panels 16px, modals 24px
- Cards: white + border-slate-200/70 + rounded-xl + shadow-sm; hover shadow-lg
- Type: Inter (UI), Montserrat (wordmark 800, 0.16em)
- Dark mode: toggle sun/moon în header, persist localStorage
