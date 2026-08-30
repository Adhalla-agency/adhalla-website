# Adhalla production website

Public production build for `adhalla.ee`.

## A/B test
The public homepage uses one canonical URL. During a browser session the visitor is assigned 50/50 to:
- A — conventional lead form
- B — swipe-based scoping flow

The assignment is stored in sessionStorage and emitted as:
`adhalla_ab_exposure`
with event parameter:
`experiment_variant`

Lead events:
- `adhalla_lead_form_start`
- `adhalla_lead_submit`
- `adhalla_lead_success`
- `adhalla_scope_complete` (B only)

These events are pushed to `dataLayer` and become measurable once GTM/GA4 is connected.

## Forms
Forms submit through FormSubmit to `info@adhalla.ee`.
The FIRST test submission triggers an activation/confirmation email to that mailbox. Confirm it before sending real traffic.

## Production domain
The repo includes `CNAME` with:
`adhalla.ee`

## SEO
Includes:
- canonical URLs
- Estonian titles/descriptions
- Organization + Service schema
- favicon/search icon
- Open Graph image
- robots.txt
- sitemap.xml
- visible Estonian Google Ads / AI marketing / automated marketing copy

## Before paid traffic
1. Confirm FormSubmit delivery.
2. Connect GTM + GA4 and verify the A/B events.
3. Implement Consent Mode / consent handling before analytics or advertising cookies are enabled.
4. Verify Google Ads conversion import only after GA4 tracking is tested.
