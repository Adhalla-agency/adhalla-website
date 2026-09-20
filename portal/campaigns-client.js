export function createCampaignClient(fetcher=fetch) {
  const base='https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1';
  let user=null, epoch=0, active=new Set(), retries=new Map();
  function start(next){epoch++;for(const c of active)c.abort();active.clear();retries.clear();user=next;}
  async function call(path,body) {
    if(!user)throw Error('Palun logi sisse.');
    const captured=user, generation=epoch, controller=new AbortController();active.add(controller);
    const timeout=setTimeout(()=>controller.abort(),path.endsWith('/pause')?95000:25000);
    try {
      const token=await captured.getIdToken(true);
      if(generation!==epoch)throw Error('Konto muutus.');
      const response=await fetcher(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
        body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
      if(generation!==epoch)throw Error('Konto muutus.');
      if(!response.ok){let detail={};try{detail=await response.json();}catch{}const error=Error(errorMessage(response.status,detail));error.status=response.status;error.field=detail.field;error.code=detail.error;throw error;}
      const result=await response.json();
      if(generation!==epoch)throw Error('Konto muutus.');
      return result.data;
    } finally {clearTimeout(timeout);active.delete(controller);}
  }
  async function write(path,body){
    const key=JSON.stringify({path,body});
    const request_id=retries.get(key)||crypto.randomUUID();retries.set(key,request_id);
    const result=await call(path,{...body,request_id});retries.delete(key);return result;
  }
  return {start,read:(path)=>call(path),write};
}

export const fields=[
 ['objective','Eesmärk','text'],['offer','Pakkumine','text'],['landing_page','Maandumisleht','url'],['audience','Kellele pakkumine sobib?','text'],
 ['daily_budget','Päevane eelarve','money'],['currency','Valuuta (nt EUR)','short'],['max_cpc','Maksimaalne klikihind','money'],
 ['target_cpa','Soovitud CPA (valikuline)','money'],['target_roas','Soovitud ROAS kordajana (valikuline)','money'],
 ['locations','Asukohad','list'],['languages','Keeled','list'],['competitors','Konkurendid','list'],['keywords','Esialgsed märksõnad','list'],
 ['negative_keywords','Välistavad märksõnad (valikuline)','list'],['constraints','Piirangud ja keelatud lubadused (valikuline)','text'],['strategy_notes','Strateegia märkmed (valikuline)','text']];
export const help={
 objective:'Millist äritulemust soovid: päringud, ostud või broneeringud? Näiteks: rohkem sobivaid päringuid ettevõtetelt.',
 offer:'Kirjelda müüdavat teenust või toodet, peamist kasu ja seda, miks klient peaks valima sind. Ära lisa lubadusi, mida sa ei saa täita.',
 landing_page:'Leht, kuhu reklaam viib. Sisesta täielik https:// aadress. Pelgale domeenile lisatakse https://; kontrolli aadress enne esitamist üle.',
 audience:'Kes ostab, millist probleemi ta lahendab ja kellele pakkumine ei sobi? See suunab märksõnu ja tekste; eraldi auditooriumifiltrit praegu ei lisata.',
 daily_budget:'Google Adsi keskmine päevane eelarve konto valuutas. See ei ole jäik ühe päeva kululagi: Google võib päeval kulutada rohkem. Praegu luuakse reklaam peatatud olekus; käivitamine vajab eraldi luba.',
 currency:'Kasuta Google Adsi konto valuutakoodi, näiteks EUR. Valuuta kontrollitakse enne kampaania loomist.',
 max_cpc:'Maximize Clicksi puhul valikuline ühe kliki pakkumise ülempiir. Tühjaks jätmisel määrab Google pakkumised päevase eelarve alusel. Liiga madal piir võib takistada reklaamide kuvamist. Päevaeelarvest ei saa tuletada turu minimaalset klikihinda; võrdle Keyword Planneri hinnavahemikega. Manuaalse CPC puhul on see vajalik algpakkumine.',
 target_cpa:'Soovitud keskmine kulu ühe päringu või ostu kohta konto valuutas. Planeerimise eesmärk, mitte garanteeritud tulemus ega praegu rakendatav pakkumisstrateegia.',
 target_roas:'Soovitud reklaamitulu ja kulu suhe kordajana: 4 tähendab 400%. Planeerimise eesmärk; see ei muuda praegu pakkumisstrateegiat.',
 locations:'Üks täpne asukoht rea kohta, näiteks Estonia või Tallinn, Estonia. Sihtimine põhineb kohalolekul. Ebaselge asukoht peatab loomise.',
 languages:'Üks Google Adsi keel või keelekood rea kohta, näiteks et või en. Keyword Planneri uuringuks vali korraga üks keel.',
 competitors:'Otsesed konkurendid, keda klient võiks sinu asemel valida. AI pakub kuni 20 kontrollimist vajavat kandidaati ja püüab leida vähemalt 10; neid ei esitata kontrollitud turuedetabelina.',
 keywords:'Üks otsingufraas rea kohta. AI kasutab pakkumist, sihtgruppi ja ärikonteksti, seejärel hangib kuni 100 ideed Google Keyword Plannerist. Vaatad valiku enne lisamist üle.',
 negative_keywords:'Otsingud, mille puhul sa ei soovi reklaami näidata. Näidis „tasuta” ei sobi, kui sinu pakkumine on tasuta konsultatsioon. Vali ainult sinu pakkumise jaoks sobivad välistused; neid rakendatakse fraasivastena.',
 constraints:'Kirjelda, mida reklaamis vältida: näiteks garanteeritud tulemused, konkurentide mainimine või teenused, mida sa ei paku. AI arvestab seda teksti ja märksõnade koostamisel. Välja täitmine ei peata kampaania loomist. Eelarve, asukoht ja muud tehnilised seaded sisesta nende eraldi väljadele.',
 strategy_notes:'Taust, varasemad õppetunnid, hooajalisus ja soovitud toon. Need on soovitused plaanile; eelarve- ja tegevusõigused tulevad eraldi kontrollidest.'
};
export function normalizeBrief(value){const b={...value};for(const key of ['max_cpc','target_cpa','target_roas'])if(typeof b[key]==='string'&&['','-','–','—','n/a','ei kohaldu'].includes(b[key].trim().toLowerCase()))b[key]=null;b.currency=b.currency.trim().toUpperCase();if(b.landing_page&&!/^[a-z][a-z0-9+.-]*:/i.test(b.landing_page))b.landing_page='https://'+b.landing_page;return b;}
// A small-budget planning example, never a minimum bid, forecast or automatic setting.
export function cpcGuidance(budget,cap,currency='EUR'){
 if(!(budget>0&&cap>0))return '';
 if(currency!=='EUR')return 'Hinda piirhinda konto valuuta, turuandmete ja tulemuste järgi.';
 if(budget>20)return 'Suurema eelarve puhul hinda piirhinda turuandmete ja tulemuste järgi; kindlat klikkide kordajat siin ei rakendata.';
 if(cap*5<=budget)return '';
 return 'Väikese proovikampaania planeerimisnäide: kui klikk maksaks '+cap.toFixed(2)+' €, vajaks 5 klikki ligikaudu '+(cap*5).toFixed(2)+' € päevaeelarvet. Võid kaaluda suuremat eelarvet või madalamat piirhinda, kui turg seda võimaldab. See ei ole klikkide prognoos ega kohustuslik eelarve.';
}
export function approvalPresentation(request){
 const approved=!!request.authority||['approved','generating','awaiting_action','creating_paused','completed'].includes(request.status);
 return {approved,attention:['failed','limited','awaiting_input','reconciliation_required'].includes(request.status)};
}
export function errorMessage(status,detail={}){
 const label=fields.find(([key])=>key===detail.field)?.[1]||'Lähteülesanne';
 if([401,403].includes(status))return 'Ligipääs puudub või selle toimingu paketiõigus pole lubatud. Sisestatud väljad jäid sellesse vaatesse alles.';
 if(status===409)return 'Vahepeal salvestati uuem versioon. Sinu tekst on alles. Võrdle uuemat salvestust enne oma muudatuste uuesti salvestamist.';
 const messages={approval_snapshot_changed:'taotluse lähteülesanne või alusandmed on muutunud. Ava kliendi vaade, vaata uus eelvaade üle ning saada see uuesti Adhallale.',preview_inputs:'eelvaate jaoks täida eesmärk, pakkumine, maandumisleht, sihtgrupp, keel ja kampaania liik.',campaign_missing_information:'enne loomise kinnitamist täida puuduvad väljad ja ülevaatuskinnitused. Reklaamitekste saad varem eelvaates koostada.',interpretation_cooldown:'järgmine tõlgenduse värskendus on võimalik 24 tunni järel; salvestatud tulemust saad kohe lugeda.',campaign_naming_locked:'kampaania tehnilise nime ja riigikoodi haldab Adhalla adminivaates.',regeneration_stale:'uus tekst vajab praegusele salvestatud lähteülesandele vastavat ettepanekut. Esita muudetud lähteülesanne ülevaatuseks.',regeneration_context:'värsked alusandmed on puudu. Uuenda andmeid ja proovi siis uuesti.',regeneration_limit:'selle kampaania AI uuenduste arv on kasutatud. Käsitsi muutmine jääb võimalikuks.',campaign_busy:'kampaania kinnitatud töö peab enne muudatuste tegemist lõppema.',positive_decimal:'sisesta positiivne arv kuni kahe komakohaga või jäta tühjaks.',currency:'kasuta kolme tähega koodi, näiteks EUR.',https_url:'sisesta https:// aadress ilma kasutajatunnuste ja # osata.',text_length:'tekst on liiga pikk.',list_limit:'liiga palju ridu või mõni rida ületab 160 märki.',private_content:'eemalda võtmed, paroolid ja privaatsed failiteed. Kui sisestasid tavalist äriteksti, vaata märgitud väli üle.',research_context:'AI abi vajab pakkumist ja sihtgrupi kirjeldust.',research_targeting:'märksõnauuring vajab asukohti ja täpselt üht keelt.',research_pending:'eelmine AI uuring on veel tööjärjekorras.'};
 if(messages[detail.error])return label+': '+messages[detail.error]+' Sinu tekst on alles.';
 return status===400?'Toiming ei vasta praegusele tööseisule. Sinu tekst on alles; kontrolli puuduvaid välju ja taotluse seisu.':'Toimingut ei saanud kinnitada. Sinu tekst on alles. Proovi sama toimingut uuesti.';
}
export const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
export const states={cancelled:'Tühistatud',deleted:'Eemaldatud',superseded:'Koondatud kampaania põhitaotlusega',draft:'Lähteülesanne',rejected:'Tagasi lükatud',unassigned:'Määramata',in_progress:'Töös',approved:'Kinnitatud',generating:'Koostamisel',awaiting_action:'Ootab järgmist sammu',
 creating_paused:'Peatatud kampaania loomisel',reconciliation_required:'Vajab tulemuse kontrolli',running:'Koostamisel',
 awaiting_input:'Ootab lisainfot',completed:'Valmis',failed:'Ebaõnnestus',queued:'Tööjärjekorras',limited:'Ootab AI kasutuspiiri vabanemist'};

export function quotaPresentation(job){
 if(job.quota_reason==='invalid_budget_state')return 'AI kasutuspiiri arvestus vajab Adhalla kontrolli. Uut katset ei alustata.';
 const reason=job.quota_reason==='daily_attempt_limit'?'Päevane AI katsete piir on täis.':job.quota_reason==='monthly_model_budget'?'Kuine AI eelarve on täis. Päevavahetus kuupiiri ei lähtesta.':'AI päeva- või kuupiir on täis.';
 const retry=job.retry_at?' Järgmine võimalik algus: '+new Date(job.retry_at).toLocaleString('et-EE')+'.':'';
 return reason+retry+' Töö jääb järjekorda ja jätkub automaatselt vaba mahu ning kehtivate õiguste korral. Uuesti esitada pole vaja.';
}

export function campaignPresentation(item){
 const stop=item.safety_pause;
 if(['requested','running'].includes(stop?.status))return {tone:'pending',text:'Peatamise kinnitus ootel'};
 if(['failed','reconciliation_required'].includes(stop?.status))return {tone:'attention',text:'Peatamine pole kinnitatud · vajab kontrolli'};
 const observed=item.google_state?.result;
 if(item.creation&&['unassigned','in_progress'].includes(item.status)&&item.submitted_version===item.brief_version)return {tone:'pending',text:'Muudatus esitatud · ootab Adhalla kinnitust'+(observed?.campaign_status==='ENABLED'?' · senine reklaam on aktiivne':' · senine kampaania on koostatud')};
 if(stop?.status==='completed'&&(!item.google_state?.observed_at||Date.parse(stop.completed_at)>=Date.parse(item.google_state.observed_at)))return {tone:'ready',text:'Koostatud · peatatud sinu soovil'};
 if(observed?.campaign_status==='ENABLED')return {tone:'approved',text:'Aktiivne · viimane Google Adsi kontroll'};
 if(observed?.campaign_status==='PAUSED')return {tone:'ready',text:'Koostatud · Google Adsis peatatud, reklaam ei tööta'};
 if(item.creation)return {tone:'ready',text:'Koostatud peatatud olekus · hetkeolukord vajab lugemist'};
 const sent=!!item.request_id&&item.status!=='cancelled'&&item.submitted_version===item.brief_version;
 if(!sent)return {tone:'draft',text:item.request_id?'Muudatused salvestatud · ootavad esitamist':item.brief_version?'Salvestatud · veel esitamata':'Veel salvestamata'};
 if(['unassigned','in_progress'].includes(item.status))return {tone:'pending',text:item.status==='in_progress'?'Esitatud · töötaja vaatab üle':'Esitatud · ootab Adhalla kinnitust'};
 if(['approved','generating','awaiting_action','creating_paused','completed'].includes(item.status))return {tone:'pending',text:'Kinnitatud · '+(states[item.status]||item.status)};
 return {tone:'attention',text:'Esitatud · '+(states[item.status]||item.status)};
}
export function researchPresentation(job,now=Date.now()){
 if(!job)return '';
 const age=now-Date.parse(job.created_at||'');
 if(job.status==='queued')return age>10*60*1000?'Uuring on endiselt järjekorras. See pole veel alanud; uut tellimust pole vaja esitada.':'Uuring tellitud · ootab töötlemist. Tulemus ilmub siia nupu alla; välju enne sinu valikut ei muudeta.';
 if(job.status==='running')return 'Uuring käib. Tulemused ilmuvad siia nupu alla.';
 if(job.status==='completed')return '✓ Uuring valmis. Vali allpool sobivad tulemused ja lisa need vormi.';
 if(job.status==='limited')return quotaPresentation(job)+' Uuringul on kampaania koostamisest eraldi päevapiir; kuine AI eelarve on ühine.';
 if(job.status==='failed')return 'Uuring ebaõnnestus. Tulemust ei saadud; sinu väljad jäid alles. Võid tellida uue katse, kui kasutuspiir seda lubab.';
 if(job.status==='access_removed')return 'Uuringu õigus või kehtivus muutus. Tulemust ei lisatud; vajalik on ligipääsu kontroll.';
 return 'Uuringu seis: '+(states[job.status]||'vajab kontrolli');
}
