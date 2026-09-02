# Adhalla Consent Banner V1

Upload/overwrite:
- index.html
- contact.html
- vision.html
- privacy.html
- aitah.html

Add:
- adhalla-consent-v1.css
- adhalla-consent-v1.js

Behavior:
- Consent Mode v2 defaults execute BEFORE GTM.
- First visit defaults:
  analytics_storage = denied
  ad_storage = denied
  ad_user_data = denied
  ad_personalization = denied
- Visitor can reject optional storage, accept all, or choose Analytics and Advertising separately.
- Choice is saved under localStorage key `adhalla_consent_v1`.
- "Küpsiste seaded" reopens the preferences later.

GTM events:
- adhalla_consent_ready
- adhalla_consent_update

Next validation:
1. Deploy to GitHub Pages.
2. Use incognito.
3. GTM Preview -> https://adhalla.ee/
4. Before choosing, verify all four Google consent signals are denied.
5. Choose Analytics only.
6. Verify analytics_storage becomes granted while the three ad signals stay denied.
7. Then add the GA4 Google tag in GTM.

Technical implementation only; this is not a legal compliance certification.
