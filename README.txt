Adhalla readable B-swipe email patch

Replace/upload these three files in the public adhalla-website repository:
- index.html
- adhalla-swipe-v38.js
- adhalla-formspree-v2.js

No visual swipe changes.

B email now contains:
- normal contact fields
- Valikud: one readable line per swipe
- Kokkuvõte: profile title + summary + optional tension note

Removed from B email:
- raw scope_answers JSON
- raw scope_profile JSON
- dimension names
- adhalla_fit per-answer metadata
- conservative/adhalla internal option metadata
- raw attribution JSON
- experiment_variant body field (the subject still says Variant B)

A/B analytics still knows the variant through a data attribute on the form.

Do NOT delete adhalla-formspree-v1.js yet because contact.html and vision.html may still reference it.
