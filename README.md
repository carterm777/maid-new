# Maid New — Homepage Demo

Static homepage demo for a residential and commercial cleaning company in Red Deer, Alberta. Plain HTML/CSS/JS, no build step.

- `index.html`: markup, meta, and LocalBusiness + FAQPage JSON-LD
- `styles.css`, `main.js`: styling and the interaction/motion layer
- `assets/`: logo files and photography

The page is set to `noindex` (plus `robots.txt`) because it's a pitch demo, not the business's official site.

## Before this goes live as the official site
- Replace `#TODO-client-login-url` (3 places) with the real Jobber client-portal URL.
- Confirm (587) 306-0182 accepts SMS, or remove the "Text for a Quote" links.
- Connect the estimate form to the client's Jobber request flow (it currently validates in the browser only).
- Remove the `noindex` meta tag and `robots.txt`.

Deployed on Vercel. Every push to `main` deploys to production.
