(function(){
  "use strict";
  const KEY = "adhalla_consent_v1";

  function readChoice(){
    try{
      const value = JSON.parse(localStorage.getItem(KEY));
      if(!value || typeof value !== "object") return null;
      return {analytics:value.analytics === true, ads:value.ads === true};
    }catch(_){ return null; }
  }

  function saveChoice(choice){
    const value = {
      version:1,
      analytics:choice.analytics === true,
      ads:choice.ads === true,
      updated_at:new Date().toISOString()
    };
    try{ localStorage.setItem(KEY, JSON.stringify(value)); }catch(_){}
    return value;
  }

  function sendConsentUpdate(choice, source){
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

    gtag("consent","update",{
      analytics_storage:choice.analytics ? "granted" : "denied",
      ad_storage:choice.ads ? "granted" : "denied",
      ad_user_data:choice.ads ? "granted" : "denied",
      ad_personalization:choice.ads ? "granted" : "denied"
    });

    window.dataLayer.push({
      event:"adhalla_consent_update",
      consent_analytics:choice.analytics ? "granted" : "denied",
      consent_ads:choice.ads ? "granted" : "denied",
      consent_source:source || "unknown"
    });
  }

  function createUI(){
    const backdrop = document.createElement("div");
    backdrop.className = "adhalla-consent-backdrop";
    backdrop.setAttribute("aria-hidden","true");

    const banner = document.createElement("section");
    banner.className = "adhalla-consent-banner";
    banner.setAttribute("role","dialog");
    banner.setAttribute("aria-modal","false");
    banner.setAttribute("aria-labelledby","adhalla-consent-title");
    banner.innerHTML = `
      <div class="adhalla-consent-inner">
        <div>
          <span class="adhalla-consent-kicker">PRIVAATSUS</span>
          <h2 class="adhalla-consent-title" id="adhalla-consent-title">Sina valid, mida mõõdame.</h2>
          <p class="adhalla-consent-copy">
            Vajalikud brauserisalvestused hoiavad lehe toimivana. Sinu loal kasutame analüütikat
            A/B testi ja lehe kasutuse mõõtmiseks ning reklaamitehnoloogiat kampaaniate mõõtmiseks.
            Valikut saad hiljem muuta. <a href="/privacy.html">Loe privaatsusest</a>.
          </p>
        </div>
        <div class="adhalla-consent-actions">
          <button class="adhalla-consent-button reject" type="button" data-consent-reject>Keeldu valikulistest</button>
          <button class="adhalla-consent-button accept" type="button" data-consent-accept>Aktsepteeri kõik</button>
          <button class="adhalla-consent-button manage" type="button" data-consent-manage>Vali eraldi</button>
        </div>
      </div>
    `;

    const settingsButton = document.createElement("button");
    settingsButton.className = "adhalla-consent-settings";
    settingsButton.type = "button";
    settingsButton.textContent = "Küpsiste seaded";
    settingsButton.setAttribute("aria-label","Muuda küpsiste ja analüütika seadeid");

    const modal = document.createElement("section");
    modal.className = "adhalla-consent-modal";
    modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");
    modal.setAttribute("aria-labelledby","adhalla-consent-settings-title");
    modal.innerHTML = `
      <div class="adhalla-consent-modal-inner">
        <div class="adhalla-consent-modal-header">
          <span class="adhalla-consent-kicker">KÜPSISTE SEADED</span>
          <h2 id="adhalla-consent-settings-title">Vali, mida Adhalla võib kasutada.</h2>
          <p>Vajalikud funktsioonid on alati aktiivsed. Analüütika ja reklaami saad lubada teineteisest sõltumatult.</p>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Vajalikud</strong>
            <span>Hoiavad meeles nõusolekuvaliku ja sama sessiooni A/B variandi ning toetavad lehe põhifunktsioone.</span>
          </div>
          <div class="adhalla-consent-always">ALATI SEES</div>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Analüütika</strong>
            <span>Aitab mõõta lehe kasutust, vormi teekonda ja A/B testi tulemusi Google Analyticsi kaudu.</span>
          </div>
          <label class="adhalla-consent-switch" aria-label="Analüütika nõusolek">
            <input type="checkbox" data-consent-analytics>
            <span class="adhalla-consent-slider"></span>
          </label>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Reklaam</strong>
            <span>Lubab Google Adsiga seotud salvestuse, kasutajaandmete ja reklaamide isikupärastamise nõusolekusignaalid.</span>
          </div>
          <label class="adhalla-consent-switch" aria-label="Reklaami nõusolek">
            <input type="checkbox" data-consent-ads>
            <span class="adhalla-consent-slider"></span>
          </label>
        </div>

        <div class="adhalla-consent-modal-actions">
          <button class="adhalla-consent-button reject" type="button" data-consent-save>Salvesta valik</button>
          <button class="adhalla-consent-button accept" type="button" data-consent-modal-accept>Aktsepteeri kõik</button>
        </div>

        <p class="adhalla-consent-modal-note">
          Nõusoleku muutmine mõjutab edasist mõõtmist selles brauseris. Täpsem info on
          <a href="/privacy.html">privaatsuslehel</a>.
        </p>
      </div>
    `;

    document.body.append(backdrop,banner,modal,settingsButton);

    return {
      backdrop,banner,modal,settingsButton,
      analytics:modal.querySelector("[data-consent-analytics]"),
      ads:modal.querySelector("[data-consent-ads]")
    };
  }

  function init(){
    const ui = createUI();
    const stored = readChoice();

    function syncControls(choice){
      ui.analytics.checked = !!choice.analytics;
      ui.ads.checked = !!choice.ads;
    }

    function closeModal(){
      ui.modal.classList.remove("is-visible");
      ui.backdrop.classList.remove("is-visible");
      document.documentElement.classList.remove("adhalla-consent-lock");
    }

    function openModal(){
      syncControls(readChoice() || {analytics:false,ads:false});
      ui.backdrop.classList.add("is-visible");
      ui.modal.classList.add("is-visible");
      document.documentElement.classList.add("adhalla-consent-lock");
    }

    function hideBanner(){ ui.banner.classList.remove("is-visible"); }

    function persistAndApply(choice, source){
      saveChoice(choice);
      sendConsentUpdate(choice, source);
      hideBanner();
      closeModal();
    }

    ui.banner.querySelector("[data-consent-accept]").addEventListener("click",()=>{
      persistAndApply({analytics:true,ads:true},"banner_accept_all");
    });

    ui.banner.querySelector("[data-consent-reject]").addEventListener("click",()=>{
      persistAndApply({analytics:false,ads:false},"banner_reject_optional");
    });

    ui.banner.querySelector("[data-consent-manage]").addEventListener("click",openModal);
    ui.settingsButton.addEventListener("click",openModal);
    ui.backdrop.addEventListener("click",closeModal);

    ui.modal.querySelector("[data-consent-save]").addEventListener("click",()=>{
      persistAndApply({analytics:ui.analytics.checked,ads:ui.ads.checked},"settings_save");
    });

    ui.modal.querySelector("[data-consent-modal-accept]").addEventListener("click",()=>{
      syncControls({analytics:true,ads:true});
      persistAndApply({analytics:true,ads:true},"settings_accept_all");
    });

    document.addEventListener("keydown",(event)=>{
      if(event.key === "Escape" && ui.modal.classList.contains("is-visible")) closeModal();
    });

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event:"adhalla_consent_ready",
      consent_has_choice:!!stored,
      consent_analytics:stored && stored.analytics ? "granted" : "denied",
      consent_ads:stored && stored.ads ? "granted" : "denied"
    });

    if(stored){
      syncControls(stored);
    }else{
      requestAnimationFrame(()=>ui.banner.classList.add("is-visible"));
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",init,{once:true});
  }else{
    init();
  }
})();
