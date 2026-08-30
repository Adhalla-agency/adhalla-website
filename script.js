
document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

/* Preserve ad attribution so the future form endpoint receives the same context
   regardless of which landing-page variant the visitor saw. */
(function captureAttribution(){
  const params = new URLSearchParams(window.location.search);
  const keys = ["gclid","utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
  const data = {};
  keys.forEach(k => { if (params.get(k)) data[k] = params.get(k); });
  document.querySelectorAll('input[name="attribution"]').forEach(el => {
    el.value = JSON.stringify(data);
  });
})();

document.querySelectorAll("form[data-placeholder-form]").forEach(form => {
  form.addEventListener("submit", e => {
    if (form.action.includes("YOUR_FORM_ID")) {
      e.preventDefault();
      const note = form.querySelector("[data-form-note]");
      if (note) note.textContent = "Vorm pole veel e-posti teenusega ühendatud. Ühenda endpoint enne lehe avalikku reklaamimist.";
    }
  });
});


/* Adhalla V3.2 immersive layer */
(function(){
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const progress = document.getElementById("scroll-progress");
  const ambientOne = document.querySelector(".ambient-one");
  const ambientTwo = document.querySelector(".ambient-two");
  const hero = document.querySelector(".hero");

  function updateScrollEffects(){
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const y = window.scrollY || doc.scrollTop || 0;
    const ratio = Math.min(1, Math.max(0, y / max));

    if(progress) progress.style.width = `${ratio * 100}%`;

    if(!reduceMotion){
      if(ambientOne) ambientOne.style.transform = `translate3d(0, ${y * 0.055}px, 0)`;
      if(ambientTwo) ambientTwo.style.transform = `translate3d(0, ${-y * 0.035}px, 0)`;
      if(hero) hero.style.setProperty("--hero-scroll", `${y * 0.035}px`);
    }
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if(!ticking){
      requestAnimationFrame(() => {
        updateScrollEffects();
        ticking = false;
      });
      ticking = true;
    }
  }, {passive:true});
  updateScrollEffects();

  const items = document.querySelectorAll(".reveal");
  if(reduceMotion || !("IntersectionObserver" in window)){
    items.forEach(el => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.13, rootMargin:"0px 0px -6% 0px"});
    items.forEach(el => observer.observe(el));
  }
})();


/* Production A/B instrumentation.
   These dataLayer events are inert until GTM/GA4 is connected. */
(function(){
  const variant = window.adhallaVariant || document.documentElement.dataset.abVariant || "A";
  document.querySelectorAll('input[name="experiment_variant"]').forEach(el=>{
    if(!el.value) el.value = variant;
  });

  let formStarted = false;
  document.addEventListener("focusin", e=>{
    if(formStarted) return;
    if(e.target && e.target.closest && e.target.closest("form")){
      formStarted = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event:"adhalla_lead_form_start",
        experiment_id:"landing_v1",
        experiment_variant:variant
      });
    }
  });

  document.addEventListener("submit", e=>{
    const form = e.target;
    if(!(form instanceof HTMLFormElement)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:"adhalla_lead_submit",
      experiment_id:"landing_v1",
      experiment_variant:variant,
      form_subject:(form.querySelector('[name="_subject"]')||{}).value || ""
    });
  }, true);
})();
