# Form transport v2

Public forms now submit to FormSubmit with AJAX. Visitors remain on adhalla.ee and are redirected to the local `aitah.html` only after a successful response. If the third-party endpoint cannot be reached, the form stays visible and the entered data is preserved with an inline retry message.
