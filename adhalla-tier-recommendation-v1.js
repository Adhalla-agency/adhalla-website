(function(){
  if(typeof finishScope !== "function" || typeof score !== "function") return;

  const baseFinishScope = finishScope;

  function recommendTier(){
    const automation = score("automation");
    const experiment = score("experiment");
    const adaptation = score("adaptation");
    const innovation = score("innovation");
    const contact = score("contact");
    const involvement = score("involvement");
    const integration = score("integration");

    let tier = "Interpretation";
    let reason = "Sinu valikud viitavad sellele, et kõige kasulikum on alustada andmete ühendamisest, ajaloo säilitamisest ja selgest tõlgendusest ilma konto muutmisõiguseta.";

    const wantsHumanLayer = contact < 0 || involvement < 0;
    const automationReady = automation > 0 && (experiment > 0 || adaptation > 0 || innovation > 0);

    if(wantsHumanLayer){
      tier = "Assisted";
      reason = "Sinu valikud näitavad, et süsteemne analüüs ja automatiseerimine võivad olla kasulikud, kuid soovid rohkem inimkontakti, detailset kaasatust või otsuste kinnitamist.";
    }else if(automationReady){
      tier = "Automation";
      reason = "Sinu valikud soosivad kontrollitud automatiseerimist, süsteemset katsetamist ja kohanemist. Adhalla saaks pärast mõõtmise kinnitamist töötada kokkulepitud turvapiirides aktiivsemalt.";
    }else if(integration > 0){
      tier = "Interpretation";
      reason = "Soovid kasutada rohkem kasulikku infot, kuid sinu vastused ei viita veel vajadusele anda süsteemile aktiivset muutmisõigust. Interpretation on loogiline esimene samm.";
    }

    return {tier, reason};
  }

  finishScope = function(){
    baseFinishScope();

    const result = recommendTier();
    const box = document.getElementById("tier-recommendation");
    const title = document.getElementById("tier-recommendation-title");
    const note = document.getElementById("tier-recommendation-note");
    const tierField = document.getElementById("scope-tier-field");
    const tierReasonField = document.getElementById("scope-tier-reason-field");
    const profileField = document.getElementById("scope-readable-profile-field");

    if(title) title.textContent = result.tier;
    if(note) note.textContent = result.reason;
    if(box) box.classList.add("visible");
    if(tierField) tierField.value = result.tier;
    if(tierReasonField) tierReasonField.value = result.reason;

    if(profileField){
      const base = profileField.value || "";
      profileField.value = `${base}\n\nSoovitatud pakett: ${result.tier}\nPõhjendus: ${result.reason}`.trim();
    }
  };

  const restart = document.getElementById("scope-restart");
  if(restart){
    restart.addEventListener("click",function(){
      const box = document.getElementById("tier-recommendation");
      if(box) box.classList.remove("visible");
    });
  }
})();

/* Current product-page refinement.
   Pricing and service copy now live in index.html. This script must not overwrite
   the current Interpretation / managed-service model after page load. */
(function refineProductPage(){
  const cssHref = "adhalla-product-viking-v1.css?v=1.2";
  if(!document.querySelector(`link[href="${cssHref}"]`)){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
    document.head.appendChild(link);
  }

  /* Remove legacy floating founder offer if an older cached DOM/script created it. */
  const legacyOffer = document.querySelector(".founder-offer-float");
  if(legacyOffer) legacyOffer.remove();

  const guardrail = document.querySelector(".guardrail-panel");
  if(guardrail){
    const h3 = guardrail.querySelector("h3");
    const p = guardrail.querySelector("p");
    if(h3) h3.textContent = "Mõõdame tulemust, mitte identiteeti.";
    if(p) p.textContent = "Adhalla eesmärk ei ole ehitada külastajatest isiklikke turundusprofiile. Me ei kogu selle lehe kaudu küpsistega andmeid retargeting-panga ehitamiseks ning usume, et tulemusi on võimalik saavutada ka vähem invasiivselt. Sama põhimõtet järgime kliendi mõõtmise juures siis, kui consent mode jääb Adhalla seadistada.";
  }

  /* Keep the application form aligned with the current two-level model. */
  const benefits = document.querySelectorAll("#waitlist-a .lead-benefit span");
  if(benefits[0]) benefits[0].textContent = "Platvormi või konto ühendamise referentshind on 49 € / konto; testperioodil 0 €, kuni ühendamine vajab Adhalla-poolset käsitsi seadistust.";
  if(benefits[1]) benefits[1].textContent = "Interpretation 20 € / kuu; esimesele 10 valitud testkliendile testperioodil 0 €.";
  if(benefits[2]) benefits[2].textContent = "Kui vajad ka teostust, lisanduvad kontrollitud automatiseerimine ja inimtugi kokkulepitud ulatuses.";
})();
