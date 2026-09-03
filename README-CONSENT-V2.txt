Adhalla privacy-first consent V2

Principle: Measure outcomes, not identity.

First layer:
- Ainult vajalik
- Luba tulemuslikkuse mõõtmine
- Vali täpsemalt

Main measurement choice:
- analytics_storage = granted
- ad_storage = granted
- ad_user_data = granted
- ad_personalization = denied

Company-level privacy guardrails:
- Google Signals disabled
- ad personalization signals disabled
- ad_personalization always denied
- ads_data_redaction enabled
- no remarketing/personalized-ad option in the banner

Granular settings:
- Website analytics
- Google Ads conversion measurement

Advanced Consent Mode remains enabled. Visitors choosing only necessary keep all consent states denied; consent-aware Google tags may send cookieless pings for modeling.

Upload/overwrite:
- index.html
- contact.html
- vision.html
- privacy.html
- aitah.html
- adhalla-consent-v2.js
- adhalla-consent-v2.css

Technical implementation/product-policy design, not a legal compliance certification.
