Adhalla form transport V3

Replace these files in the public adhalla-website repository.

What changed:
- no visual/design changes;
- no A/B changes;
- normal form fallback stays on the anonymized FormSubmit endpoint;
- AJAX now uses FormSubmit's documented endpoint:
  https://formsubmit.co/ajax/info@adhalla.ee
- script filename changed to adhalla-form-submit-v3.js to avoid stale browser caches.

After deployment, test one B submission on mobile.
The browser should remain on adhalla.ee and then redirect to /aitah.html on success.
