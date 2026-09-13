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
      if(!response.ok){const error=Error([401,403].includes(response.status)?'Ligipääs on eemaldatud või see konto pole Adhalla töötaja.':response.status===400?'Kontrolli puuduvaid välju ja versiooni. Uuema salvestuse korral värskenda vaadet.':'Toimingut ei saanud kinnitada. Proovi sama toimingut uuesti.');error.status=response.status;throw error;}
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
 ['daily_budget','Päevane eelarve','money'],['currency','Valuuta (nt EUR)','short'],['max_cpc','Maksimaalne kliki hind','money'],
 ['target_cpa','Soovitud CPA (valikuline)','money'],['target_roas','Soovitud ROAS kordajana (valikuline)','money'],
 ['locations','Asukohad','list'],['languages','Keeled','list'],['competitors','Konkurendid','list'],['keywords','Esialgsed märksõnad','list'],
 ['negative_keywords','Välistavad märksõnad','list'],['constraints','Piirangud ja keelatud lubadused','text'],['strategy_notes','Strateegia märkmed','text']];
export const lines=value=>value.split('\n').map(x=>x.trim()).filter(Boolean);
export const states={unassigned:'Määramata',in_progress:'Töös',approved:'Kinnitatud',generating:'Koostamisel',awaiting_action:'Ootab järgmist sammu',
 awaiting_input:'Ootab lisainfot',completed:'Valmis',failed:'Ebaõnnestus',queued:'Tööjärjekorras',limited:'Mudeli kasutuspiir'};
