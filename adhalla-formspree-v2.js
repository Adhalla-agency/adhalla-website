(function () {
  "use strict";
  if (window.__adhallaFormspreeInstalled) return;
  window.__adhallaFormspreeInstalled = true;
  const submitting = new WeakSet();

  function getVariant(form) {
    if (form.dataset && form.dataset.experimentVariant) {
      return form.dataset.experimentVariant;
    }

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
    if (submitting.has(form)) return;
    if (!form.reportValidity()) return;
    submitting.add(form);
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

      if (!response.ok) throw new Error('submission_failed');

    } catch (_) {
      status.textContent = "Päringu saatmine ei õnnestunud. Sinu sisestatud info on alles — proovi hetk hiljem uuesti.";
      submitting.delete(form);
      setBusy(form, false);
      return;
    }

    // A tracking error must never turn an accepted lead into a retryable failure.
    status.textContent = "Päring on saadetud. Avame kinnituse…";
    let redirected = false;
    const finish = () => {
      if (redirected) return;
      redirected = true;
      clearTimeout(fallback);
      window.location.assign(thankYouUrl(form));
    };
    // The independent timeout also works if GTM is blocked or never loads.
    const fallback = setTimeout(finish, 1500);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "adhalla_lead_success_client",
        experiment_id: "landing_v1",
        experiment_variant: getVariant(form),
        lead_type: getLeadType(form),
        eventCallback: finish,
        eventTimeout: 1400
      });
    } catch (_) { finish(); }
  }

  document.addEventListener("submit", function (event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.action || !form.action.startsWith("https://formspree.io/f/")) return;

    event.preventDefault();
    submitForm(form);
  });
})();
