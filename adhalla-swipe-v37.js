
const scopeQuestions = [
  {category:"Suund", left:"Stabiilsus", right:"Kasv", dimension:"growth"},
  {category:"Katsetamine", left:"Kaitse seda, mis töötab", right:"Katseta süsteemselt", dimension:"experiment"},
  {category:"Kontroll", left:"Kinnitan suuremad muutused ise", right:"AI võib turvapiirides tegutseda", dimension:"automation"},
  {category:"Kaasatus", left:"Näita mulle detaile", right:"Näita mulle peamiselt tulemust", dimension:"involvement"},
  {category:"Andmed", left:"Hoia süsteem lihtne", right:"Ühenda rohkem kasulikku infot", dimension:"integration"},
  {category:"Tööviis", left:"Tõestatud käsitsi juhtimine", right:"Uus automatiseeritud tööviis", dimension:"innovation"},
  {category:"Suhtlus", left:"Rohkem inimkontakti", right:"Inimene sekkub vajadusel", dimension:"contact"},
  {category:"Kohanemine", left:"Muuda harva", right:"Õpi ja kohane", dimension:"adaptation"}
];

let scopeIndex = 0;
let scopeAnswers = [];
let dragStartX = 0;
let dragCurrentX = 0;
let dragging = false;
let locked = false;
let visitorHasInteracted = false;

const card = document.getElementById("swipe-card");
const count = document.getElementById("scope-count");
const category = document.getElementById("scope-category");
const leftLabel = document.getElementById("scope-left");
const rightLabel = document.getElementById("scope-right");
const progress = document.getElementById("scope-progress-bar");
const controls = document.getElementById("swipe-controls");
const hint = document.getElementById("swipe-hint");
const stage = document.getElementById("swipe-stage");
const stampLeft = document.getElementById("stamp-left-v34");

const stampRight = document.getElementById("stamp-right-v34");

/* V3.7: a Web Animations API animation with fill:"forwards" keeps controlling
   opacity/transform even after the next card's text has been rendered.
   Always cancel those old animation effects before showing a new card. */
function clearCardAnimations(){
  card.getAnimations().forEach(animation=>{
    try{ animation.cancel(); }catch(_){}
  });
  card.style.opacity = "1";
  card.style.transform = "";
}

function markInteracted(){
  visitorHasInteracted = true;
  document.body.classList.add("v36-user-interacted");
  card.classList.remove("swipe-demo-v34");
  card.classList.add("swipe-demo-disabled-v35");
}

/* Fit text to the REAL available rectangle rather than guessing from character
   count. This prevents both overlap and hidden/clipped words on phones. */
function fitLabel(el){
  const half = el.closest(".swipe-half-v34");
  if(!half) return;

  card.classList.add("fit-measuring-v36");

  el.style.fontSize = "";
  el.style.lineHeight = "";
  el.dataset.fit = "";

  const arrow = half.querySelector(".half-arrow-v34");
  const styles = getComputedStyle(half);
  const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const gap = parseFloat(styles.rowGap || styles.gap || 0);
  const arrowHeight = arrow ? arrow.getBoundingClientRect().height : 0;

  const availableWidth = Math.max(80, half.clientWidth - 2);
  const availableHeight = Math.max(90, half.clientHeight - paddingY - arrowHeight - gap - 6);

  /* Start large, then reduce only until the entire text fits. */
  let size = window.innerWidth <= 560 ? 32 : window.innerWidth <= 820 ? 38 : 50;
  const minSize = window.innerWidth <= 560 ? 18 : window.innerWidth <= 820 ? 20 : 22;

  el.style.width = "100%";
  el.style.maxWidth = "100%";
  el.style.fontSize = size + "px";
  el.style.lineHeight = "1.04";

  while(
    size > minSize &&
    (el.scrollWidth > availableWidth + 1 || el.scrollHeight > availableHeight + 1)
  ){
    size -= 1;
    el.style.fontSize = size + "px";
  }

  /* If height is still very tight at minimum font size, increase line-height
     efficiency slightly rather than clipping anything. */
  if(el.scrollHeight > availableHeight + 1){
    el.style.lineHeight = ".98";
  }

  requestAnimationFrame(()=>card.classList.remove("fit-measuring-v36"));
}

function fitCurrentLabels(){
  requestAnimationFrame(()=>{
    fitLabel(leftLabel);
    fitLabel(rightLabel);
  });
}

function renderQuestion(animate=true){
  clearCardAnimations();
  const q = scopeQuestions[scopeIndex];

  count.textContent = `${scopeIndex + 1} / ${scopeQuestions.length}`;
  category.textContent = q.category;
  leftLabel.textContent = q.left;
  rightLabel.textContent = q.right;
  progress.style.width = `${(scopeIndex / scopeQuestions.length) * 100}%`;

  card.className = "swipe-card swipe-card-v34";
  card.style.transform = "";
  card.style.opacity = "1";

  if(!visitorHasInteracted && scopeIndex < 2){
    card.classList.add("swipe-demo-v34");
  }else{
    card.classList.add("swipe-demo-disabled-v35");
  }

  if(animate){
    card.classList.add("enter-v34");
    setTimeout(()=>card.classList.remove("enter-v34"),320);
  }

  fitCurrentLabels();
}

function record(direction){
  const q = scopeQuestions[scopeIndex];
  const fit = direction === "right" ? 1 : direction === "left" ? -1 : 0;
  const label = direction === "right" ? q.right : direction === "left" ? q.left : "Oleneb";
  scopeAnswers.push({
    category:q.category,
    dimension:q.dimension,
    choice:direction,
    label,
    conservative:q.left,
    adhalla:q.right,
    adhalla_fit:fit
  });
}

function showStamp(direction){
  const stamp = direction === "right" ? stampRight : stampLeft;
  if(!stamp) return;
  stamp.classList.remove("show-v34");
  void stamp.offsetWidth;
  stamp.classList.add("show-v34");
}

function nextAfterChoice(){
  stampLeft?.classList.remove("show-v34");
  stampRight?.classList.remove("show-v34");
  scopeIndex += 1;

  if(scopeIndex >= scopeQuestions.length){
    finishScope();
  }else{
    renderQuestion(true);
    locked = false;
  }
}

function chooseFromButton(direction){
  if(locked) return;
  markInteracted();
  locked = true;
  record(direction);

  if(direction === "left" || direction === "right") showStamp(direction);

  const x = direction === "left" ? -180 : direction === "right" ? 180 : 0;
  const r = direction === "left" ? -7 : direction === "right" ? 7 : 0;
  const y = direction === "neutral" ? -12 : 0;

  const anim = card.animate(
    [
      {transform:"translate3d(0,0,0) rotate(0deg) scale(1)",opacity:1},
      {transform:`translate3d(${x}px,${y}px,0) rotate(${r}deg) scale(.97)`,opacity:0}
    ],
    {duration:360,easing:"cubic-bezier(.2,.8,.2,1)",fill:"forwards"}
  );
  anim.onfinish = ()=>{
    try{ anim.cancel(); }catch(_){}
    clearCardAnimations();
    setTimeout(nextAfterChoice,20);
  };
}

/* Important V3.6 behavior:
   drag release is the FIRST FRAME of the exit animation. No recenter,
   no CSS exit class, no second swipe. */
function commitDraggedChoice(direction,dx){
  if(locked) return;
  markInteracted();
  locked = true;
  record(direction);
  showStamp(direction);

  const startRot = Math.max(-8,Math.min(8,dx/24));
  const viewport = Math.max(window.innerWidth,900);
  const endX = direction === "left"
    ? -Math.max(viewport*.48,Math.abs(dx)+320)
    : Math.max(viewport*.48,Math.abs(dx)+320);
  const endRot = direction === "left" ? -14 : 14;

  card.classList.add("drag-committed-v35");

  const anim = card.animate(
    [
      {
        transform:`translate3d(${dx}px,0,0) rotate(${startRot}deg) scale(1)`,
        opacity:1,
        offset:0
      },
      {
        transform:`translate3d(${endX}px,0,0) rotate(${endRot}deg) scale(.94)`,
        opacity:0,
        offset:1
      }
    ],
    {
      duration:340,
      easing:"cubic-bezier(.18,.82,.2,1)",
      fill:"forwards"
    }
  );

  anim.onfinish = ()=>{
    try{ anim.cancel(); }catch(_){}
    clearCardAnimations();
    setTimeout(nextAfterChoice,20);
  };
}

function score(name){
  return scopeAnswers.filter(a=>a.dimension===name)
    .reduce((sum,a)=>sum+a.adhalla_fit,0);
}
function totalFit(){
  return scopeAnswers.reduce((sum,a)=>sum+a.adhalla_fit,0);
}

function finishScope(){
  progress.style.width = "100%";
  stage.style.display = "none";
  controls.style.display = "none";
  hint.style.display = "none";

  const fit = totalFit();
  const growth = score("growth");
  const experiment = score("experiment");
  const automation = score("automation");
  const involvement = score("involvement");
  const integration = score("integration");
  const innovation = score("innovation");
  const contact = score("contact");
  const adaptation = score("adaptation");

  let title = "Tasakaalukas Adhalla kandidaat";
  let summary = "Sinu eelistused on segu automatiseeritud ja klassikalisemast tööviisist. See annab hea lähtekoha, millised piirid tuleks enne koostööd kokku leppida.";

  if(fit >= 5){
    title = "Väga tugev Adhalla sobivus";
    summary = "Sinu eelistused kattuvad tugevalt Adhalla praeguse suunaga: rohkem automatiseerimist, vähem tarbetut käsitööd ja inimkontakti ning rohkem süsteemset õppimist.";
  }else if(fit >= 2){
    title = "Hea Adhalla sobivus";
    summary = "Suurem osa sinu eelistustest sobib Adhalla mudeliga, kuid mõned piirid tasuks onboarding'u alguses täpselt kokku leppida.";
  }else if(fit <= -4){
    title = "Pigem klassikalisem tööviis";
    summary = "Sinu eelistused kalduvad rohkem inimkäega juhitava ja konservatiivsema reklaamihalduse poole. Adhalla võib endiselt sobida, kuid tõenäoliselt väiksema autonoomiaga.";
  }else if(fit < 0){
    title = "Kontrolli eelistav kandidaat";
    summary = "Adhalla võiks sinu puhul töötada rohkem analüüsi- ja soovituskihina, jättes suurema osa otsestest muudatustest inimese kinnitada.";
  }

  const chips = [
    growth > 0 ? "Kasvule avatud" : growth < 0 ? "Stabiilsust eelistav" : "Kasvu suhtes paindlik",
    experiment > 0 ? "Katsetamisvalmis" : experiment < 0 ? "Töökindlust kaitsev" : "Valikuline katsetaja",
    automation > 0 ? "Automatiseerimisvalmis" : automation < 0 ? "Inimkinnitust eelistav" : "Kontrollitud automaatika",
    involvement > 0 ? "Tulemuspõhine kaasatus" : involvement < 0 ? "Detailsem kaasatus" : "Paindlik kaasatus",
    integration > 0 ? "Põhjaliku andmekihi huvi" : integration < 0 ? "Lihtsama süsteemi huvi" : "Mõõdukas integratsioon",
    contact > 0 ? "Vähene inimkontakt sobib" : contact < 0 ? "Soovib rohkem inimkontakti" : "Paindlik suhtlus"
  ];

  document.getElementById("profile-title").textContent = title;
  document.getElementById("profile-summary").textContent = summary;

  const chipsEl = document.getElementById("profile-chips");
  chipsEl.innerHTML = "";
  chips.forEach(text=>{
    const span = document.createElement("span");
    span.className = "profile-chip";
    span.textContent = text;
    chipsEl.appendChild(span);
  });

  const tension = document.getElementById("profile-tension");
  let tensionText = "";
  if(growth > 0 && experiment < 0){
    tensionText = "Soovid kasvu, kuid eelistad olemasolevat kaitsta. Koostöö alguses tasuks täpsustada, kui palju kontrollitud katsetamisruumi süsteem saab.";
  }else if(automation > 0 && contact < 0){
    tensionText = "Oled automatiseerimisele avatud, kuid soovid samal ajal rohkem inimkontakti. Adhalla saab need kaks soovi eraldi seadistada.";
  }else if(integration > 0 && automation < 0){
    tensionText = "Tahad põhjalikku andmekihti, kuid suuremat inimkinnitust. Sellisel juhul saab Adhalla olla tugev analüüsi- ja ettevalmistuskiht ilma suure autonoomiata.";
  }

  if(tensionText){
    tension.style.display = "block";
    tension.textContent = tensionText;
  }else{
    tension.style.display = "none";
  }

  const profileData = {
    title,
    adhalla_fit_score:fit,
    max_score:scopeQuestions.length,
    dimensions:{growth,experiment,automation,involvement,integration,innovation,contact,adaptation},
    chips
  };

  document.getElementById("scope-answers-field").value = JSON.stringify(scopeAnswers);
  document.getElementById("scope-profile-field").value = JSON.stringify(profileData);

  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event:"adhalla_scope_complete",
    experiment_id:"landing_v1",
    experiment_variant:"B",
    adhalla_fit_score:fit
  });

document.getElementById("profile-panel").classList.add("visible");
  document.getElementById("scope-form-wrap").classList.add("visible");
  document.getElementById("profile-panel").scrollIntoView({behavior:"smooth",block:"center"});
}

document.getElementById("choose-left").addEventListener("click",()=>chooseFromButton("left"));
document.getElementById("choose-neutral").addEventListener("click",()=>chooseFromButton("neutral"));
document.getElementById("choose-right").addEventListener("click",()=>chooseFromButton("right"));

document.getElementById("scope-restart").addEventListener("click",()=>{
  scopeIndex = 0;
  scopeAnswers = [];
  locked = false;
  visitorHasInteracted = false;
  document.body.classList.remove("v36-user-interacted");

  stage.style.display = "block";
  controls.style.display = "flex";
  hint.style.display = "block";
  document.getElementById("profile-panel").classList.remove("visible");
  document.getElementById("scope-form-wrap").classList.remove("visible");
  renderQuestion(false);
  stage.scrollIntoView({behavior:"smooth",block:"center"});
});

function pointerStart(x){
  if(locked) return;
  markInteracted();
  dragging = true;
  dragStartX = x;
  dragCurrentX = x;
  card.classList.add("dragging");
}
function pointerMove(x){
  if(!dragging || locked) return;
  dragCurrentX = x;
  const dx = dragCurrentX-dragStartX;
  const rot = Math.max(-8,Math.min(8,dx/24));
  card.style.transform = `translate3d(${dx}px,0,0) rotate(${rot}deg)`;
  card.classList.toggle("drag-left-v34",dx < -20);
  card.classList.toggle("drag-right-v34",dx > 20);
}
function pointerEnd(){
  if(!dragging || locked) return;
  dragging = false;
  card.classList.remove("dragging");

  const dx = dragCurrentX-dragStartX;

  if(dx <= -95){
    commitDraggedChoice("left",dx);
  }else if(dx >= 95){
    commitDraggedChoice("right",dx);
  }else{
    const current = card.style.transform || "translate3d(0,0,0) rotate(0deg)";
    const anim = card.animate(
      [
        {transform:current},
        {transform:"translate3d(0,0,0) rotate(0deg)"}
      ],
      {duration:170,easing:"ease-out",fill:"forwards"}
    );
    anim.onfinish = ()=>{
      try{ anim.cancel(); }catch(_){}
      card.style.transform = "";
      card.style.opacity = "1";
      card.classList.remove("drag-left-v34","drag-right-v34");
    };
  }
}

card.addEventListener("pointerdown",e=>{
  if(locked) return;
  card.setPointerCapture(e.pointerId);
  pointerStart(e.clientX);
});
card.addEventListener("pointermove",e=>pointerMove(e.clientX));
card.addEventListener("pointerup",pointerEnd);
card.addEventListener("pointercancel",pointerEnd);

/* Re-fit labels whenever responsive layout changes. */
let resizeTimer;
window.addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitCurrentLabels,100);
});

if("ResizeObserver" in window){
  const ro = new ResizeObserver(()=>fitCurrentLabels());
  ro.observe(stage);
}

renderQuestion(false);
