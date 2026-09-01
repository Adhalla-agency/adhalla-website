# Adhalla GTM installation patch

Container:
GTM-WV2XDRT3

Upload/overwrite these files in the public `adhalla-website` repository:
- index.html
- contact.html
- vision.html
- privacy.html
- aitah.html

What this patch does:
- installs the standard Google Tag Manager web-container script on every public page;
- installs the GTM noscript iframe immediately after the opening body tag;
- does NOT add GA4 directly;
- does NOT change the A/B test, swipe logic, Formspree transport, SEO, or design.

Important:
Keep the GTM container free of live GA4/Ads tags until Consent Mode and the consent UI are configured and tested.

Next test after GitHub Pages deploy:
1. Open Google Tag Manager.
2. Click Preview.
3. Enter https://adhalla.ee/
4. Confirm Tag Assistant connects and detects GTM-WV2XDRT3.
