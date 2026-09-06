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

/* V1.2 product refinement: client-facing copy/layout only. Existing GTM,
   consent, Formspree and swipe event wiring are intentionally untouched. */
(function refineProductPage(){
  const cssHref = "adhalla-product-viking-v1.css?v=1.1";
  if(!document.querySelector(`link[href="${cssHref}"]`)){
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
    document.head.appendChild(link);
  }

  if(!document.querySelector(".founder-offer-float")){
    const offer = document.createElement("a");
    offer.className = "founder-offer-float";
    offer.href = "#tiers";
    offer.setAttribute("aria-label", "Ava Interpretation testkliendi pakkumine");
    offer.innerHTML = `
      <img src="assets/adhalla-logo.png" alt="" aria-hidden="true">
      <span class="offer-sail"><strong>49 €</strong><small>TESTÜHENDUS</small></span>
      <span class="offer-copy">Esimesed 10 kohta</span>`;
    document.body.appendChild(offer);
  }

  const consoleRows = document.querySelectorAll(".console-row");
  if(consoleRows[2]){
    const small = consoleRows[2].querySelector("small");
    if(small) small.textContent = "ajalugu säilib soovi korral ka paketi lõppedes";
  }

  const serviceHead = document.querySelector("#service .section-head");
  if(serviceHead){
    const kicker = serviceHead.querySelector(".kicker");
    const p = serviceHead.querySelector("p");
    if(kicker) kicker.textContent = "KAART ENNE KURSSI";
    if(p) p.textContent = "Adhalla eraldab andmete kogumise, faktikihi, tõlgenduse ja tegevuse. Eesmärk ei ole anda jutukale mudelile rohkem enesekindlust, vaid teha selgeks, millal järeldus toetub päris tõendile ja millal veel mitte.";
  }

  const process = document.querySelector("#service .product-process");
  if(process){
    const cards = process.querySelectorAll(".process-step");
    if(cards[2]) cards[2].querySelector("p").textContent = "Deterministlik faktikiht eraldab faktid, puuduvad andmed ja lubatud järeldused.";
    if(cards[4]) cards[4].querySelector("p").textContent = "Automation paketis saavad põhjendatud muudatused liikuda kontole ainult määratud piirides.";
  }

  const memory = document.querySelector(".memory-panel");
  if(memory){
    const p = memory.querySelector("p");
    if(p) p.textContent = "Ajalugu säilib soovi korral ka paketi lõppedes. Kliendivaate ligipääs lõpeb koos tellimusega, kuid sulle saadetud PDF-raportid jäävad alles. Soovi korral võivad alles jääda ka Adhalla süsteemis säilitatav ajalugu ja ühenduste konfiguratsioon, et tagasitulek ei algaks nullist. Lahkuda saab alati ning säilitamise asemel saab paluda andmed ja ühendused eemaldada.";
  }

  const guardrail = document.querySelector(".guardrail-panel");
  if(guardrail){
    const h3 = guardrail.querySelector("h3");
    const p = guardrail.querySelector("p");
    if(h3) h3.textContent = "Mõõdame tulemust, mitte identiteeti.";
    if(p) p.textContent = "Adhalla eesmärk ei ole ehitada külastajatest isiklikke turundusprofiile. Me ei kogu selle lehe kaudu küpsistega andmeid retargeting-panga ehitamiseks ning usume, et tulemusi on võimalik saavutada ka vähem invasiivselt. Sama põhimõtet järgime kliendi mõõtmise juures siis, kui consent mode jääb Adhalla seadistada.";
  }

  const tiers = document.getElementById("tiers");
  if(tiers){
    const cards = tiers.querySelectorAll(".tier-card");

    if(cards[0]){
      const top = cards[0].querySelector(".tier-top");
      if(top && !cards[0].querySelector(".tier-mark")){
        top.insertAdjacentHTML("afterend", `<div class="tier-mark"><img src="assets/adhalla-logo.png" alt="" aria-hidden="true"><span>kaart enne kurssi</span></div>`);
      }
      cards[0].querySelector("ul").innerHTML = `
        <li>Google Ads + GA4 + GTM ühendused</li>
        <li>püsiv turundusmälu ja snapshot'id</li>
        <li>ajalooline baseline ja perioodide võrdlus</li>
        <li>nädala- või kuupõhised raportid ja soovitused</li>
        <li>ei muuda ise reklaamikontot</li>`;

      const oldPrice = cards[0].querySelector(".tier-price");
      if(oldPrice) oldPrice.remove();
      const footer = cards[0].querySelector(".tier-footer");
      if(footer){
        footer.insertAdjacentHTML("beforebegin", `
          <div class="tier-price founder-tier-price">
            <strong>20 € / kuu</strong>
            <span>14 päeva tasuta tellimusperioodi. Esimene automaatne kuumakse alles 14 päeva pärast.</span>
          </div>
          <div class="founder-offer-inline">
            <b>ESIMESED 10 TESTKLIENTI</b>
            <strong>Ühendamine 49 € <s>99 €</s></strong>
            <span>Esimese maksena tasud ainult ühendamise. Pakkumine purjetab siin seni, kuni esimesed 10 kohta on täidetud; pärast seda taastub tavahind.</span>
          </div>`);
        footer.innerHTML = `<strong>Interpretation on kohe kasutatav</strong><span>Ühendust kontrollib ja vajadusel aitab teha inimene; see töö on ühendamistasu osa, mitte tasuta prooviperiood.</span>`;
      }
    }

    if(cards[1]){
      const badge = cards[1].querySelector(".tier-badge");
      if(badge){ badge.textContent = "COMING SOON"; badge.classList.add("coming"); }
      const top = cards[1].querySelector(".tier-top");
      if(top && !cards[1].querySelector(".tier-mark")){
        top.insertAdjacentHTML("afterend", `<div class="tier-mark tier-mark-active"><img src="assets/adhalla-logo.png" alt="" aria-hidden="true"><span>puri töötab kokkulepitud kursil</span></div>`);
      }
      cards[1].querySelector("ul").innerHTML = `
        <li>kõik Interpretation paketist</li>
        <li>automaatsed kampaaniate loomised</li>
        <li>järjepidevad A/B testid</li>
        <li>regulaarne tulemuste kontroll kokkulepitud intervalliga</li>
        <li>põhjendatud muudatuste elluviimine turvapiirides</li>`;
      const footer = cards[1].querySelector(".tier-footer");
      if(footer) footer.innerHTML = `<strong>Adhalla põhitoode</strong><span>Hind avalikustatakse pärast päris kontodel valideerimist.</span>`;
    }

    if(cards[2]){
      const badge = cards[2].querySelector(".tier-badge");
      if(badge){ badge.textContent = "COMING SOON"; badge.classList.add("coming"); }
      const top = cards[2].querySelector(".tier-top");
      if(top && !cards[2].querySelector(".tier-mark")){
        top.insertAdjacentHTML("afterend", `<div class="tier-mark assisted-mark"><img src="assets/adhalla-logo.png" alt="" aria-hidden="true"><span class="captain-dot"></span><span>kapten jääb pardale</span></div>`);
      }
      const desc = cards[2].querySelector(":scope > p");
      if(desc) desc.textContent = "Kui süsteem teeb suure osa raskest tööst, aga inimene jääb aktiivseks partneriks ja suunanäitajaks.";
      cards[2].querySelector("ul").innerHTML = `
        <li>kõik Automation paketist</li>
        <li>rohkem käsitsi kontrolli, suhtlust ja sekkumist</li>
        <li>outside-the-box mõtlemine ja ebatavaline ärikontekst</li>
        <li>strateegia, läbirääkimine ja kliendipsühholoogia</li>
        <li>AI ei piira inimese leidlikkust, kirjusid mõtteid ega loovust — ta võrdleb neid tulemuste vastu ja põrgatab strateegiat inimesega</li>`;
      const footer = cards[2].querySelector(".tier-footer");
      if(footer) footer.innerHTML = `<strong>Kõige personaalsem mudel</strong><span>Inimene läheb sinna, kuhu süsteem ise ei vaata.</span>`;
    }

    if(!document.getElementById("onboarding")){
      const onboarding = document.createElement("section");
      onboarding.className = "section shell";
      onboarding.id = "onboarding";
      onboarding.innerHTML = `
        <div class="section-head">
          <span class="kicker">PARDALE TULEK / ONBOARDING</span>
          <h2>Ühendused paika. Siis hakkab Adhalla kaarti joonistama.</h2>
          <p>Interpretation algab tasulisest ühendamisest: inimene kontrollib kliendi Google Adsi, GA4 ja/või GTM ligipääsud, aitab need Adhalla süsteemiga ühendada ning veendub, et vajalikud kontod on olemas. Kui ühendamine on tasutud ja kliendi kasutaja loodud, algab 14-päevane tasuta tellimusperiood.</p>
        </div>
        <div class="connection-grid">
          <article class="connection-card"><span class="connection-code">01</span><h3>Vali ühendused</h3><p>Võid alustada ühest või mitmest allikast.</p><div class="connection-pills"><span>Google Ads</span><span>GA4</span><span>GTM</span></div></article>
          <article class="connection-card"><span class="connection-code">02</span><h3>Ühendamine inimesega</h3><p>Adhalla inimene kontrollib õigused, aitab ühendused teha ja kinnitab, et süsteem saab vajalikku infot lugeda. Tavahind 99 €; esimese 10 testkliendi ühendamine 49 €.</p></article>
          <article class="connection-card"><span class="connection-code">03</span><h3>Esmasünkroniseerimine</h3><p>Pärast edukat ühendamist on siht umbes 20 minutit, kuni klient on süsteemis ja esimesed andmed hakkavad kogunema. Katkiste või keeruliste kontode puhul võib minna kauem.</p></article>
          <article class="connection-card"><span class="connection-code">04</span><h3>Ajaloo kaart</h3><p>Adhalla tõmbab kättesaadava ajaloo tagasi nii kaugele kui allikas seda lubab — eesmärgiga kuni 5 aastat — ning võrdleb perioode kuni värskeimate tulemusteni.</p></article>
          <article class="connection-card"><span class="connection-code">05</span><h3>Esimene põhjalik analüüs</h3><p>Planeeritud töövoos tekib esimene baseline-analüüs ligikaudu 30 minuti jooksul pärast edukat esmasünkroniseerimist. Suurema ajaloo puhul võib see võtta kauem.</p></article>
          <article class="connection-card"><span class="connection-code">06</span><h3>14 päeva prooviperioodi</h3><p>Kliendivaade ja Interpretation tellimus on 14 päeva tasuta kasutuses. Kui tellimust ei lõpetata, läheb alles pärast seda kontolt automaatselt maha 20 € kuumakse.</p></article>
        </div>
        <div class="onboarding-endpoint">
          <div><span class="kicker">INTERPRETATION LÕPUPUNKT</span><h3>Ühendatud konto + ajalooline baseline + korduv raportirütm.</h3><p>See on esimese taseme täielik väärtus ka ilma automatiseerimiseta. Kui klient tahab järgmise purje üles tõmmata, liigub ta Automation tasemele.</p></div>
          <div class="setup-pricing">
            <div><span>49 €</span><small>esimese 10 testkliendi ühendamine; tavahind 99 €</small></div>
            <div><span>14 päeva</span><small>tasuta Interpretation tellimus pärast edukat ühendamist</small></div>
            <div><span>20 € / kuu</span><small>esimene automaatne kuumakse pärast 14 päeva</small></div>
            <div><span>+60 €</span><small>iga puuduva konto loomine ja seadistuse juhendamine</small></div>
          </div>
        </div>
        <div class="portal-preview">
          <div class="portal-copy"><span class="kicker">KLIENDIVAADE · ARENDUSES</span><h3>Raportid ei pea kaduma Gmaili otsingusse.</h3><p>Pikem siht on eraldi sisselogimisega kliendivaade: viimase nädala põhinumbrid, varasemad raportid plokkidena, kalender raportipäevadega ning võimalus avada iga suurem analüüs PDF-ina. Kliendi kasutaja näeb ainult oma ettevõtte read-only andmeid.</p></div>
          <div class="portal-mock" aria-hidden="true">
            <div class="portal-top"><span>CLIENT / 0007</span><span>READ ONLY</span></div>
            <div class="portal-metrics"><div><b>7D</b><span>latest snapshot</span></div><div><b>30D</b><span>monthly view</span></div><div><b>HISTORY</b><span>baseline + reports</span></div></div>
            <div class="portal-calendar"><span>01</span><span>08</span><span class="has-report">15</span><span>22</span><span class="has-report">29</span></div>
            <div class="portal-report"><strong>29 AUG · Monthly interpretation</strong><span>open report ↗</span></div>
          </div>
        </div>`;
      tiers.parentNode.insertBefore(onboarding, tiers);

      const nav = document.querySelector(".nav-links");
      if(nav && !nav.querySelector('a[href="#onboarding"]')){
        const packages = nav.querySelector('a[href="#tiers"]');
        if(packages) packages.insertAdjacentHTML("beforebegin", `<a href="#onboarding">Alustamine</a>`);
      }
    }
  }

  const benefits = document.querySelectorAll("#waitlist-a .lead-benefit span");
  if(benefits[0]) benefits[0].textContent = "Esimese 10 testkliendi ühendamine 49 € tavapärase 99 € asemel.";
  if(benefits[1]) benefits[1].textContent = "Pärast ühendamist 14 päeva tasuta; alles seejärel 20 € / kuu.";
  if(benefits[2]) benefits[2].textContent = "Automatiseerimise õigused lisatakse eraldi, mitte vaikimisi.";
})();
