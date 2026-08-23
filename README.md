# claw_command_site

The marketing site for Claw Command, built for GitHub Pages: plain static
HTML/CSS/JS, no build step to deploy.

## Layout

```
index.html            the page: copy, structure, SEO/AEO head, JSON-LD
assets/site.css       styles; same tokens as the app (palette.ts / app.vue)
assets/fleet.js       the landing-page fleet: hero demo, orbit scene, state cards
assets/claw-demo.js   GENERATED. The app's real renderer (sprites, planets,
                      starfield) bundled from the private claw_command repo by
                      site-design/build.mjs there. Do not hand-edit; rebuild
                      and re-copy when the app's renderer changes.
```

## Deploy

GitHub Pages, from `main`, root folder (Settings → Pages → Deploy from a
branch → `main` / `/`). `.nojekyll` keeps Pages from running Jekyll.

## Still placeholder

- Payment: the buy buttons link nowhere. Candidates: Stripe Payment Link
  (least code), or Lemon Squeezy / Paddle for merchant-of-record tax handling.
- `og.png`: 1200x630 fleet screenshot, then uncomment the og:image block in
  `index.html`.
- `[WINDOWS / LINUX PLANS]` in the FAQ.
- Canonical/og URLs point at the github.io address; swap when a custom domain
  lands.
