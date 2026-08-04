# Everante — Nutrition-as-a-Service

Scroll-driven landing page for a high-protein smoothie subscription
(33g protein · 300 calories, delivered before seven). Static site, no build step.

**Section order:** Hero → Marquee → Manifesto → Membership → The Ritual →
Pillars → Flavors → Dashboard → **Provenance** → FAQ → Final CTA.
A sticky Join bar appears after the first viewport and hides over pricing and the final CTA.

## Run

```
python -m http.server 4173 --directory Code
```

Then open http://localhost:4173 (or use the `everante` config in `.claude/launch.json`).

---

## ⚠ Open questions on the new plan / offerings model

Three numbers in the source poster do not reconcile with "one smoothie
per day, Monday to Saturday". The site is built on the arithmetic that
holds; confirm which is authoritative.

| Item | Poster | On the site | Why |
|---|---|---|---|
| Days per plan | 14 / 28 / 56 | 12 / 24 / 48 | Mon–Sat is 6 days a week, not 7 |
| Rate | ₹160.71 / ₹156.54 / ₹154.45 per day | ₹187 / ₹183 / ₹180 per smoothie | Same totals over 6-day weeks |
| Saving | ~₹250 / ~₹600 / ~₹1,500 | ₹250 / ₹487 / ₹961 | A true 10% of the standard price. The poster's larger figures appear to bundle the complimentary smoothies |

Prices themselves (₹2,250 / ₹4,383 / ₹8,649) are used exactly as given.

Also open:
- **1-on-1 call duration.** Specified as "10 days or 5 minutes", which
  did not parse. The page says "a 1-on-1 nutrition call, included" with
  no duration. Add one once it is decided.
- **Progress dashboard tier.** Was assigned to Signature, which no
  longer exists. Mapped to the 8-week plan as the closest equivalent —
  confirm.
- **Packaging.** Bottle renders were removed from the offerings. The
  Provenance step still describes collecting and reusing empties; if
  that loop has changed, rewrite or delete that step.

---

## ⚠ Claims register — verify before launch

Every factual claim on the page is listed here. **A founder must confirm each one
is true, or the line must be deleted.** Do not soften a claim you cannot support —
delete it. Under ASCI and CCPA rules on misleading advertisement, an
unsubstantiated claim is the liability, not an unimpressive one.

| Claim | Where | Status |
|---|---|---|
| Delivered before 7 AM | Hero badge, stats, process 04, FAQ | **Verify** — is this the guaranteed window? |
| No preservatives, ever | Hero trust row, stats, standards | **Verify** — formulation dependent |
| 48 hrs max, blend to door | Stats, FAQ | **Verify** — is this enforced operationally? |
| 365 mornings a year | Stats, pricing | **Verify** — including public holidays? |
| 33g protein · 300 calories | Throughout | **Verify** — must match lab analysis on every flavor |
| Cold-chain held door to door | Process 04, pillars, FAQ | **Verify** |
| Small batches, blended overnight | Process 02, FAQ | **Verify** |
| Named suppliers, audited quarterly | Process 01 | **Verify** — is an audit process actually in place? |
| Every batch temperature-logged | Process 03 | **Verify** |
| Glass collected, sanitised, reused | Process 05, FAQ | **Verify** |
| Nutritionist-designed / signed off | Hero trust row, standards, pillars | **Verify** — named, registered practitioner? |
| Pause / cancel anytime, no fees | Hero, standards, pricing, FAQ | **Verify** — must match actual billing terms |
| Delivering in Mumbai · Bengaluru · Delhi NCR | Footer | **Verify** |

### Removed on purpose

These were on the site and were **fabricated**. Do not reinstate without real data:

- `12,400+ members nourished daily`
- `4.9 average member rating`
- `96% renew after month three`
- `6:42 AM average doorstep drop`
- Three named testimonials — *Aisha Rahman, Karan Mehta, Nadia & Rohan* — invented people
  with invented occupations and quotes

They were replaced with operational commitments (figures the business sets and
controls) which cannot expire or be challenged.

---

## Trust components awaiting real data

Both ship in the markup with `hidden`. Remove the attribute when the data exists —
each carries a full brief in an HTML comment directly above it.

| Component | Unblocks when |
|---|---|
| `#testimonials` | You hold ≥3 real quotes with written consent to publish name + words |
| `.proof-grid` | Rating / review count / repeat rate / delivery count can each be sourced |
| `#founder` | The real story is written (~60 words, first person) and a photograph exists |

**Rule for `.proof-grid`:** if a number cannot be sourced, delete its tile rather
than estimate it. Show the source as visible microcopy — an unsourced number is
worth less than no number.

---

## Stack

- Vanilla HTML/CSS/JS + [Lenis](https://lenis.darkroom.engineering/) smooth scroll (CDN)
- **Type:** Playfair Display (display) + Inter (UI/body) via Google Fonts
- **Color:** "The Blue Hour" — cool grounds, one warm accent (`#D8A65C`,
  stepping to `#8A6220` on light grounds for AA). Tokens at the top of `style.css`
- Motion is IntersectionObserver + rAF driven; degrades with reduced-motion and no-JS

## Photography

Filled: hero (`assets/hero-morning.*`) and footer band (`assets/footer-band.*`).

Six slots remain as labelled placeholders — 3 pillar frames, 3 portraits. Every
photo enters through `.ev-shot`, which reserves its aspect ratio, applies the
shared grade, and hides its placeholder automatically once an `<img>` is present:

```html
<figure class="ev-shot ar-editorial" data-shot="SHOT 02 · …">
  <img src="assets/02-doorstep.jpg" alt="" width="1200" height="800"
       loading="lazy" decoding="async">
</figure>
```

Ship `width`/`height`, export WebP with a JPEG fallback, and adjust crop with
`style="--pos:50% 30%"` rather than a second file.

> Note when generating: prompt for an **opaque matte bottle, no visible liquid,
> not a wine or beer bottle** — image models reliably render "smoked-glass bottle"
> as alcohol, which is brand-damaging here.
