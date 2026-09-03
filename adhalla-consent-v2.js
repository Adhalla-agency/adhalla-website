(function(){
  "use strict";
  const KEY = "adhalla_consent_v2";

  function readChoice(){
    try{
      const value = JSON.parse(localStorage.getItem(KEY));
      if(!value || typeof value !== "object") return null;
      return {analytics:value.analytics === true, ads_measurement:value.ads_measurement === true};
    }catch(_){ return null; }
  }

  function saveChoice(choice){
    const value = {
      version:2,
      analytics:choice.analytics === true,
      ads_measurement:choice.ads_measurement === true,
      ad_personalization:false,
      updated_at:new Date().toISOString()
    };
    try{ localStorage.setItem(KEY, JSON.stringify(value)); }catch(_){}
    return value;
  }

  function applyChoice(choice, source){
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };

    gtag("set", "allow_google_signals", false);
    gtag("set", "allow_ad_personalization_signals", false);
    gtag("set", "ads_data_redaction", true);

    gtag("consent", "update", {
      analytics_storage:choice.analytics ? "granted" : "denied",
      ad_storage:choice.ads_measurement ? "granted" : "denied",
      ad_user_data:choice.ads_measurement ? "granted" : "denied",
      ad_personalization:"denied"
    });

    window.dataLayer.push({
      event:"adhalla_consent_update",
      consent_analytics:choice.analytics ? "granted" : "denied",
      consent_ads_measurement:choice.ads_measurement ? "granted" : "denied",
      consent_ad_personalization:"denied",
      consent_source:source || "unknown"
    });
  }

  function createUI(){
    const backdrop=document.createElement("div");
    backdrop.className="adhalla-consent-backdrop";
    backdrop.setAttribute("aria-hidden","true");

    const banner=document.createElement("section");
    banner.className="adhalla-consent-banner";
    banner.setAttribute("role","dialog");
    banner.setAttribute("aria-modal","false");
    banner.setAttribute("aria-labelledby","adhalla-consent-title");
    banner.innerHTML=`
      <div class="adhalla-consent-inner">
        <div>
          <span class="adhalla-consent-kicker">PRIVAATSUS</span>
          <h2 class="adhalla-consent-title" id="adhalla-consent-title">Mõõdame tulemust, mitte identiteeti.</h2>
          <p class="adhalla-consent-copy">
            Adhalla tahab teada, milline reklaam ja leheversioon töötab — mitte ehitada külastajast reklaamiprofiili.
            Kui lubad mõõtmise, kasutame leheanalüütikat ja Google Ads konversioonimõõtmist.
            Adhalla hoiab remarketingu ja reklaamide personaliseerimise sellel veebilehel välja lülitatuna.
            <a href="/privacy.html">Loe privaatsusest</a>.
          </p>
        </div>
        <div class="adhalla-consent-actions">
          <button class="adhalla-consent-button reject" type="button" data-consent-reject>Ainult vajalik</button>
          <button class="adhalla-consent-button accept" type="button" data-consent-measure>Luba tulemuslikkuse mõõtmine</button>
          <button class="adhalla-consent-button manage" type="button" data-consent-manage>Vali täpsemalt</button>
        </div>
      </div>`;

    const settingsButton=document.createElement("button");
    settingsButton.className="adhalla-consent-settings";
    settingsButton.type="button";
    settingsButton.textContent="Privaatsuse seaded";
    settingsButton.setAttribute("aria-label","Muuda mõõtmise ja privaatsuse seadeid");

    const modal=document.createElement("section");
    modal.className="adhalla-consent-modal";
    modal.setAttribute("role","dialog");
    modal.setAttribute("aria-modal","true");
    modal.setAttribute("aria-labelledby","adhalla-consent-settings-title");
    modal.innerHTML=`
      <div class="adhalla-consent-modal-inner">
        <div class="adhalla-consent-modal-header">
          <span class="adhalla-consent-kicker">MÕÕTMISE SEADED</span>
          <h2 id="adhalla-consent-settings-title">Vali, kui palju mõõtmist lubad.</h2>
          <p>Adhalla eelistab reklaami kavatsuse ja tulemuse mõõtmist inimese võimalikult põhjalikule profileerimisele.</p>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Vajalikud</strong>
            <span>Hoiavad meeles sinu privaatsusvaliku ja sama sessiooni A/B variandi ning toetavad lehe põhifunktsioone.</span>
          </div>
          <div class="adhalla-consent-always">ALATI SEES</div>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Leheanalüütika</strong>
            <span>Mõõdab Adhalla lehel toimuvat: külastusi, A/B varianti, vormi teekonda ja kasutusmustreid.</span>
          </div>
          <label class="adhalla-consent-switch" aria-label="Leheanalüütika nõusolek">
            <input type="checkbox" data-consent-analytics>
            <span class="adhalla-consent-slider"></span>
          </label>
        </div>

        <div class="adhalla-consent-choice">
          <div class="adhalla-consent-choice-copy">
            <strong>Google Ads konversioonimõõtmine</strong>
            <span>Lubab reklaamiga seotud salvestust ja mõõtmissignaale, et hinnata täpsemalt, millised reklaamid toovad päriselt häid päringuid. Adhalla ei luba selle valikuga remarketingut ega personaliseeritud reklaame.</span>
          </div>
          <label class="adhalla-consent-switch" aria-label="Google Ads konversioonimõõtmise nõusolek">
            <input type="checkbox" data-consent-ads-measurement>
            <span class="adhalla-consent-slider"></span>
          </label>
        </div>

        <div class="adhalla-consent-policy">
          <div class="adhalla-consent-policy-mark">AD</div>
          <div>
            <strong>Isikupärastatud reklaamid ja remarketing</strong>
            <span>Adhalla veebis välja lülitatud. Need ei ole Adhalla põhioptimeerimismudeli eeltingimus.</span>
          </div>
        </div>

        <div class="adhalla-consent-modal-actions">
          <button class="adhalla-consent-button reject" type="button" data-consent-save>Salvesta valik</button>
          <button class="adhalla-consent-button accept" type="button" data-consent-modal-measure>Luba mõlemad mõõtmised</button>
        </div>
        <p class="adhalla-consent-modal-note">Valikut saad igal ajal muuta nupu „Privaatsuse seaded” kaudu. Täpsem info on <a href="/privacy.html">privaatsuslehel</a>.</p>
      </div>`;

    document.body.append(backdrop,banner,modal,settingsButton);
    return {backdrop,banner,modal,settingsButton,analytics:modal.querySelector("[data-consent-analytics]"),adsMeasurement:modal.querySelector("[data-consent-ads-measurement]")};
  }

  function init(){
    const ui=createUI();
    const stored=readChoice();
    function sync(c){ ui.analytics.checked=!!c.analytics; ui.adsMeasurement.checked=!!c.ads_measurement; }
    function closeModal(){ ui.modal.classList.remove("is-visible"); ui.backdrop.classList.remove("is-visible"); document.documentElement.classList.remove("adhalla-consent-lock"); }
    function openModal(){ sync(readChoice()||{analytics:false,ads_measurement:false}); ui.backdrop.classList.add("is-visible"); ui.modal.classList.add("is-visible"); document.documentElement.classList.add("adhalla-consent-lock"); }
    function hideBanner(){ ui.banner.classList.remove("is-visible"); }
    function persist(choice,source){ saveChoice(choice); applyChoice(choice,source); hideBanner(); closeModal(); }

    ui.banner.querySelector("[data-consent-reject]").addEventListener("click",()=>persist({analytics:false,ads_measurement:false},"banner_necessary_only"));
    ui.banner.querySelector("[data-consent-measure]").addEventListener("click",()=>persist({analytics:true,ads_measurement:true},"banner_allow_measurement"));
    ui.banner.querySelector("[data-consent-manage]").addEventListener("click",openModal);
    ui.settingsButton.addEventListener("click",openModal);
    ui.backdrop.addEventListener("click",closeModal);
    ui.modal.querySelector("[data-consent-save]").addEventListener("click",()=>persist({analytics:ui.analytics.checked,ads_measurement:ui.adsMeasurement.checked},"settings_save"));
    ui.modal.querySelector("[data-consent-modal-measure]").addEventListener("click",()=>persist({analytics:true,ads_measurement:true},"settings_allow_both_measurements"));
    document.addEventListener("keydown",e=>{ if(e.key==="Escape" && ui.modal.classList.contains("is-visible")) closeModal(); });

    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({
      event:"adhalla_consent_ready",
      consent_has_choice:!!stored,
      consent_analytics:stored&&stored.analytics?"granted":"denied",
      consent_ads_measurement:stored&&stored.ads_measurement?"granted":"denied",
      consent_ad_personalization:"denied"
    });

    if(stored) sync(stored); else requestAnimationFrame(()=>ui.banner.classList.add("is-visible"));
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
