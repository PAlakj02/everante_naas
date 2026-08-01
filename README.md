# Everante — Nutrition-as-a-Service Landing Page

Cinematic, scroll-driven landing page for a **high-protein smoothie subscription**
(every flavor: 33g protein · 300 calories, delivered before sunrise).
Static site — no build step.

Section order: Hero → Marquee → Manifesto → **Membership (pricing)** → The Ritual
(journey) → Pillars → Flavors → Dashboard → Testimonials → FAQ → Final CTA.
A sticky "Join" conversion bar appears after the first viewport and hides while
pricing or the final CTA is on screen.

## Run

```
python -m http.server 4173
```

then open http://localhost:4173 (or use the `everante` config in `.claude/launch.json`).

## Stack

- Vanilla HTML/CSS/JS + [Lenis](https://lenis.darkroom.engineering/) smooth scroll (CDN)
- Fonts: Instrument Serif (display italic) + Inter (UI), via Google Fonts
- All motion is IntersectionObserver + rAF driven; degrades gracefully with
  reduced-motion and no-JS (see `html.js` guard + `<noscript>` styles)

## Generated-asset slots (Ideogram → Seedance 2.0)

The page is architected so photoreal/video assets drop in without layout changes:

| Slot | Current placeholder | Drop-in |
|---|---|---|
| Hero sky | Layered CSS sunrise gradient + parallax sun | `assets/video/hero-sunrise.mp4` as `<video class="hero-video">` inside `.hero-sky` (see comment in `index.html`) |
| Journey step visuals | SVG/HTML scenes inside `.j-visual` | One Seedance clip or Ideogram still per step |
| Bottle renders | `bottleSVG()` in `js/main.js` (`[data-bottle]` containers; flavors: cacao, berry, coffee, vanilla, chai) | Photoreal smoothie-bottle renders (transparent PNG) per flavor |
| Final CTA sky | CSS sun + glow | Second sunrise loop |

Generation is currently blocked: the connected Higgsfield account has 0 credits
(free plan) and no `GOOGLE_AI_API_KEY` is configured for the Gemini fallback.
Ideogram is not in the Higgsfield catalog — nearest equivalents there are
Nano Banana 2 / Seedream 5.0 Pro / FLUX.2 for stills; Seedance 2.0 is available
for video once credits exist.
