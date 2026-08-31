(function () {
  "use strict";

  function getVariant(form) {
    const field = form.querySelector('[name="experiment_variant"]');
    return field && field.value ? field.value : "n/a";
  }

  function getLeadType(form) {
    const interest = form.querySelector('[name="interest_type"]');
    if (interest && interest.value) return interest.value;

    const subject = form.querySelector('[name="subject"]');
    const value = subject ? subject.value : "";

    if (value.includes("kontaktivormi")) return "contact";
    if (value.includes("Variant A") || value.includes("Variant B")) return "client";
    return "client";
  }

  function thankYouUrl(form) {
    const variant = getVariant(form);
    const type = getLeadType(form);
    const params = new URLSearchParams();

    if (variant !== "n/a") params.set("variant", variant);
    params.set("type", type);

    return "/aitah.html?" + params.toString();
  }

  function ensureStatus(form) {
    let status = form.querySelector("[data-adhalla-form-status]");
    if (!status) {
      status = document.createElement("p");
      status.setAttribute("data-adhalla-form-status", "");
      status.setAttribute("aria-live", "polite");
      status.style.marginTop = "16px";
      form.appendChild(status);
    }
    return status;
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    if (busy) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.disabled = true;
      button.textContent = "Saadan…";
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  async function submitForm(form) {
    const status = ensureStatus(form);
    status.textContent = "";
    setBusy(form, true);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          "Accept": "application/json"
        }
      });

      let result = null;
      try {
        result = await response.json();
      } catch (_) {}

      if (!response.ok) {
        let message = "Päringu saatmine ei õnnestunud. Sinu sisestatud info on alles — proovi hetk hiljem uuesti.";
        if (result && Array.isArray(result.errors) && result.errors[0] && result.errors[0].message) {
          message = result.errors[0].message;
        }
        throw new Error(message);
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "adhalla_lead_success_client",
        experiment_id: "landing_v1",
        experiment_variant: getVariant(form),
        lead_type: getLeadType(form)
      });

      window.location.assign(thankYouUrl(form));
    } catch (error) {
      status.textContent =
        error && error.message
          ? error.message
          : "Päringu saatmine ei õnnestunud. Sinu sisestatud info on alles — proovi hetk hiljem uuesti.";
      setBusy(form, false);
    }
  }

  document.addEventListener("submit", function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.action || !form.action.startsWith("https://formspree.io/f/")) return;

    event.preventDefault();
    submitForm(form);
  });
})();
