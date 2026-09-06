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
