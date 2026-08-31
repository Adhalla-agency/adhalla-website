# Adhalla Formspree transport V1

Formspree form:
https://formspree.io/f/xzebepaa

Replace the included files in the public `adhalla-website` repository.

What changed:
- FormSubmit removed from the included public form pages.
- All forms now submit to the Formspree form ID `xzebepaa`.
- Submission stays on `adhalla.ee` while the request is sent with AJAX.
- On success the visitor is sent to `/aitah.html`.
- A/B subjects remain EXACTLY:
  - `Adhalla.ee uus testkliendi huvi — Variant A`
  - `Adhalla.ee uus testkliendi huvi — Variant B`
  so the Gmail filters already created can keep working.
- Variant B still submits `scope_answers` and `scope_profile`.
- Formspree's `_gotcha` honeypot is used.
- The visitor email field remains named `email`, so Formspree can use it as Reply-To.

After upload:
1. Let GitHub Pages redeploy.
2. Test Variant A once on mobile.
3. Test Variant B once on mobile and verify the swipe profile fields arrive.
4. In Formspree, make sure the form's target email / Email workflow is `info@adhalla.ee`.
