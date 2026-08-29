# Adhalla public site V2

Static multi-page Estonian website.

## Pages

- `index.html` — client-facing landing page only
- `vision.html` — broader Adhalla work/pay/human-development vision
- `contact.html` — contact page
- `privacy.html` — starter privacy page
- `styles.css`
- `script.js`
- `assets/adhalla-logo-placeholder.svg`

## Important: logo

The included SVG is only an approximate placeholder based on the previously established Adhalla design direction.

Replace:
`assets/adhalla-logo-placeholder.svg`

with the actual approved Adhalla logo file when available. If you rename the logo, update the `<img>` path in all HTML files.

Recovered earlier palette:
- Purple: `#895D7C`
- Deep purple: `#4C3645`

This site adds a warm yellow accent: `#F4C95D`.

## Forms

All forms contain placeholder Formspree endpoints:

- `YOUR_FORM_ID_CLIENT`
- `YOUR_FORM_ID_WORKER`
- `YOUR_FORM_ID_CONTACT`

Create real endpoints that forward to the correct Adhalla mailbox, then replace the placeholders.

Do not advertise or collect real leads until:
1. each form has been tested end-to-end;
2. the privacy page reflects the actual form provider;
3. analytics/consent language reflects the actual tags installed.

## GitHub Pages

Upload these files to a GitHub repository and publish from the repository root with GitHub Pages.

## For the first Google Ads technical test

Use the client-facing `index.html`, not the vision page, as the ad landing page.

The first campaign only needs enough real activity to prove the Adhalla backend can read live campaign data. €10–20 total is enough for that technical test; it is not enough to judge marketing performance.

Keep Adhalla backend writes disabled during this first read-data test.


## V2.1 changes

- Ongoing service pricing now reads `250 € / month + actual AI/API token usage`.
- Vision page now reserves a future constitutional / legitimacy failsafe:
  - locked assessment reserve;
  - periodic large-scale public-impact review;
  - independent methodology;
  - staged wind-down instead of destructive instant shutdown;
  - explicit protection against bot/brigaded internet polls.
