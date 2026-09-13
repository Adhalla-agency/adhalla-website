export function createCampaignClient(fetcher=fetch) {
  const base='https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1';
  let user=null, epoch=0, active=new Set(), retries=new Map();
  function start(next){epoch++;for(const c of active)c.abort();active.clear();retries.clear();user=next;}
  async function call(path,body) {
    if(!user)throw Error('Palun logi sisse.');
    const captured=user, generation=epoch, controller=new AbortController();active.add(controller);
    const timeout=setTimeout(()=>controller.abort(),25000);
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
 constraints:'Absoluutsed piirid: näiteks ära luba garanteeritud tulemusi, ära nimeta konkurente reklaamis või ära reklaami teatud teenust. Need lähevad töötajale ülevaatuseks. Kui piirangut ei saa praeguste kontrollidega tagada, automaatne loomine peatub. Eelistused kirjuta strateegia märkmetesse.',
 strategy_notes:'Taust, varasemad õppetunnid, hooajalisus ja soovitud toon. Need on soovitused plaanile; eelarve- ja tegevusõigused tulevad eraldi kontrollidest.'
};
export function normalizeBrief(value){const b={...value};b.currency=b.currency.trim().toUpperCase();if(b.landing_page&&!/^[a-z][a-z0-9+.-]*:/i.test(b.landing_page))b.landing_page='https://'+b.landing_page;return b;}
export function errorMessage(status,detail={}){
 const label=fields.find(([key])=>key===detail.field)?.[1]||'Lähteülesanne';
 if([401,403].includes(status))return 'Ligipääs puudub või selle toimingu paketiõigus pole lubatud. Sisestatud väljad jäid sellesse vaatesse alles.';
 if(status===409)return 'Vahepeal salvestati uuem versioon. Sinu tekst on alles. Võrdle uuemat salvestust enne oma muudatuste uuesti salvestamist.';
 const messages={positive_decimal:'sisesta positiivne arv kuni kahe komakohaga või jäta tühjaks.',currency:'kasuta kolme tähega koodi, näiteks EUR.',https_url:'sisesta https:// aadress ilma kasutajatunnuste ja # osata.',text_length:'tekst on liiga pikk.',list_limit:'liiga palju ridu või mõni rida ületab 160 märki.',private_content:'eemalda võtmed, paroolid ja privaatsed failiteed. Kui sisestasid tavalist äriteksti, vaata märgitud väli üle.',research_context:'AI abi vajab pakkumist ja sihtgrupi kirjeldust.',research_targeting:'märksõnauuring vajab asukohti ja täpselt üht keelt.',research_pending:'eelmine AI uuring on veel tööjärjekorras.'};
 if(messages[detail.error])return label+': '+messages[detail.error]+' Sinu tekst on alles.';
 return status===400?'Toiming ei vasta praegusele tööseisule. Sinu tekst on alles; kontrolli puuduvaid välju ja taotluse seisu.':'Toimingut ei saanud kinnitada. Sinu tekst on alles. Proovi sama toimingut uuesti.';
}
export const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
export const states={unassigned:'Määramata',in_progress:'Töös',approved:'Kinnitatud',generating:'Koostamisel',awaiting_action:'Ootab järgmist sammu',
 creating_paused:'Peatatud kampaania loomisel',reconciliation_required:'Vajab tulemuse kontrolli',running:'Koostamisel',
 awaiting_input:'Ootab lisainfot',completed:'Valmis',failed:'Ebaõnnestus',queued:'Tööjärjekorras',limited:'Mudeli kasutuspiir'};
