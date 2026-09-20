import {automationControls} from './automation-controls.js?v=0.23';
import {managementReview} from './management-review.js?v=0.23';
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const labels={pause_keywords:'Märksõna peatamine',add_keywords:'Märksõna lisamine',add_negatives:'Välistuse lisamine',create_ads:'Uus reklaam',edit_ads:'Reklaami uuendamine',adjust_budget:'Eelarve muutmine',change_bidding_strategy:'Pakkumisstrateegia katse',activate_campaign:'Kampaania käivitamine'};
const states={proposed:'Ettepanek · kinnitamata',approved:'Kinnitatud · ootab töötlemist',completed:'Tehtud',rejected:'Tagasi lükatud',blocked:'Õigus või alusandmed vajavad kontrolli',failed:'Tegevus ei alanud',reconciliation_required:'Tulemus vajab kontrolli · kordus lukus',rolled_back:'Tagasi pööratud',rollback_approved:'Tagasipööre kinnitatud'};
function explain(root,value){const list=node('dl');for(const[key,val]of Object.entries(value||{})){list.append(node('dt',key),node('dd',typeof val==='object'?JSON.stringify(val):String(val)));}root.append(list);}
export function managementView(root,api){
 let epoch=0,route=null,clientId=null,isWorker=false,data=null,timer=null,policy=null;
 function reset(){epoch++;route=null;data=null;clearTimeout(timer);root.replaceChildren();root.hidden=true;document.querySelectorAll('dialog[data-management]').forEach(d=>{d.close();d.remove();});}
 async function load(){const capture=epoch,path=route;if(!path)return;try{const [value,rights]=await Promise.all([api.read(path+'optimization'),api.read(path+'automation').catch(()=>null)]);if(capture!==epoch)return;data=value;policy=rights;render();}catch(error){if(capture===epoch){root.replaceChildren(node('p','Kampaania halduse andmeid ei saanud praegu lugeda.'));}}}
 function render(){root.hidden=false;root.replaceChildren(node('h2','Kampaania hetkeseis ja haldus'));
  const message=node('p');message.setAttribute('role','status');message.textContent=data.job?.summary||'Siin näed Google’ist loetud kampaaniat, soovitatud muudatusi ja tehtud tegevusi.';root.append(message);
  root.append(node('p','Ettepanek ei muuda reklaame. Täitmine vajab paketiõigust, kliendi lubatud tegevusi ja serveri kontrolli. Käivitamine ning eelarvemuudatus vajavad eraldi kinnitust.'));
  const refresh=node('button','Loe kampaania hetkeseis');refresh.type='button';refresh.disabled=['queued','running'].includes(data.job?.status);root.append(refresh);const capture=epoch;
  automationControls(root,api,route,clientId,policy,{worker:isWorker,current:()=>capture===epoch,reload:load});
  if(data.observation_stale_configuration)root.append(node('p','Ühenduse seadistus on muutunud. Allolev seis on varasem; enne toiminguid on vaja uut lugemist.'));
  if(isWorker)managementReview(root,data,(command,version,payload)=>api.write(route+'optimization',{client_id:clientId,command,version,payload}),{current:()=>capture===epoch,reload:load});
  refresh.onclick=async()=>{refresh.disabled=true;message.textContent='Andmelugemine saadetakse tööjärjekorda…';try{await api.write(route+'optimization',{client_id:clientId,command:'refresh',version:null,payload:{}});if(capture!==epoch)return;await load();}catch(e){if(capture===epoch){message.textContent=e.message;refresh.disabled=false;}}};
  const observation=data.observation;
  if(observation){const metrics=observation.metrics,summary=node('p',new Date(observation.observed_at).toLocaleString('et-EE')+' · '+observation.period.start+' – '+observation.period.end+' · '+metrics.impressions+' näitamist · '+metrics.clicks+' klikki · '+(metrics.cost_micros/1e6).toFixed(2)+' '+(observation.entities.campaign?.currency||''));root.append(summary);
   const detail=node('details');detail.append(node('summary','Näita märksõnu, reklaame ja mõõdikuid'));root.append(detail);
   for(const[ref,item]of Object.entries(observation.entities)){if(!['keyword','ad'].includes(item.kind))continue;const section=node('section');section.append(node('h4',item.text||'Reklaam'),node('p',item.status+(item.ad_strength?' · Google Ad Strength: '+item.ad_strength:'')));if(item.headlines)section.append(node('p',item.headlines.join(' · ')),node('p',item.descriptions.join(' · ')));if(observation.keyword_metrics[ref])explain(section,observation.keyword_metrics[ref]);detail.append(section);}
  }
  for(const plan of (data.plans||[]).filter(Boolean)){const b=node('button',(labels[plan.action.action]||'Muudatus')+' · '+(states[plan.status]||plan.status));b.type='button';b.className='ticket-card';b.onclick=()=>open(plan);root.append(b);}
  const history=node('details');history.append(node('summary','Tehtud muudatused ja katsed'));root.append(history);
  if(!data.journal.length)history.append(node('p','Adhalla tehtud haldusmuudatusi pole veel registreeritud.'));
  for(const item of data.journal){const row=node('details');row.append(node('summary',(labels[item.action]||item.action)+' · '+(states[item.status]||item.status)+' · '+new Date(item.at).toLocaleString('et-EE')),node('p',item.reason));explain(row,{before:item.before,change:item.requested_change,evidence:item.evidence_refs});history.append(row);}
  for(const experiment of data.experiments.filter(Boolean)){const trial=node('details');trial.append(node('summary',experiment.definition.hypothesis+' · '+(experiment.outcome||'Katse käib')),node('p','Võrdlus: '+experiment.definition.control),node('p','Mõõdik: '+experiment.definition.primary_metric+' · vähemalt '+experiment.definition.minimum_days+' päeva ja '+experiment.definition.minimum_clicks+' klikki. See ei tõenda iseenesest põhjuslikku mõju.'));history.append(trial);}
  if(['queued','running'].includes(data.job?.status)){clearTimeout(timer);timer=setTimeout(()=>{if(capture===epoch&&!document.hidden)load();},30000);}
 }
 function open(plan){const capture=epoch,path=route,cid=clientId,dialog=node('dialog');dialog.dataset.management='true';const close=node('button','Sulge');close.type='button';close.onclick=()=>{dialog.close();dialog.remove();};dialog.addEventListener('cancel',()=>dialog.remove(),{once:true});dialog.append(node('h2',labels[plan.action.action]||plan.action.action),node('p','Klient '+cid+' · '+plan.campaign_id),node('p',plan.action.reason),close);explain(dialog,{before:plan.before,proposed:plan.action.values,evidence:plan.action.evidence_refs,experiment:plan.action.experiment});
  if(plan.affected_entities)for(const value of Object.values(plan.affected_entities)){dialog.append(node('p','Käivitatav osa: '+(value.text||value.name||value.headlines?.join(' · ')||value.kind)));}
  dialog.append(node('p','See on konkreetne muudatus ülal näidatud varasema seisu ja tõendite alusel. Muutunud sisu või õigused blokeerivad täitmise.'));
  const message=node('p');message.setAttribute('role','status');dialog.append(message);let sending=false;
  if(isWorker){const confirm=node('input');confirm.type='checkbox';const label=node('label');label.append(confirm,document.createTextNode(' Olen kliendi, täpse muudatuse, tõendid ja mõju üle vaadanud.'));dialog.append(label);
   for(const[command,text]of plan.status==='proposed'?[['approve','Kinnita see muudatus'],['reject','Lükka tagasi']]:plan.status==='completed'?[['rollback','Taotle täpset tagasipööret']]:[]){const b=node('button',text);b.type='button';dialog.append(b);b.onclick=async()=>{if(sending)return;if(command!=='reject'&&!confirm.checked){message.textContent='Vaata muudatus üle ja märgi kinnitus.';return;}sending=true;b.disabled=true;try{await api.write(path+'optimization',{client_id:cid,command,version:plan.version,payload:{plan_id:plan.plan_id}});if(capture!==epoch)return;dialog.close();dialog.remove();await load();}catch(e){if(capture===epoch){message.textContent=e.status===403?'Selle tegevuse jaoks puudub praegu vajalik paketiõigus, kliendi luba või serveri tegevusõigus.':e.message;sending=false;b.disabled=false;}}};}
  }
  dialog.className='product-modal';dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
 }
 return {reset,setScope(path,id,worker){if(path!==route||id!==clientId||worker!==isWorker){reset();route=path;clientId=id;isWorker=worker;load();}},load};
}
