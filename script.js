
document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

document.querySelectorAll("form[data-placeholder-form]").forEach(form => {
  form.addEventListener("submit", e => {
    if (form.action.includes("YOUR_FORM_ID")) {
      e.preventDefault();
      const note = form.querySelector("[data-form-note]");
      if (note) note.textContent = "Vorm pole veel e-posti teenusega ühendatud. Ühenda endpoint enne lehe avalikku reklaamimist.";
    }
  });
});
