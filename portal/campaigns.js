import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient,fields,lines,states} from './campaigns-client.js?v=0.5';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id), client=createCampaignClient();
const route='/internal/clients/0000/';
let state=null, worker=false, dirty=false, proposalDirty=false, userEpoch=0, selected=null, timer=null;
const say=text=>$('message').textContent=text;
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
for(const [key,label,type]of fields){
 const wrap=node('label',label), input=node(['text','list'].includes(type)?'textarea':'input');input.id='brief-'+key;
 if(type==='money'){input.inputMode='decimal';input.placeholder='Teadmata';}
 if(type==='url')input.placeholder='https://';
 input.maxLength=({objective:1500,landing_page:500,currency:3,strategy_notes:5000,constraints:3000})[key]||(type==='list'?16100:type==='money'?10:2000);
 if(type==='list')wrap.append(node('small','Üks väärtus rea kohta.'));
 wrap.append(input);if(['objective','offer','constraints','strategy_notes'].includes(key))wrap.className='wide';$('briefFields').append(wrap);
}
const political=node('label','Kas kampaania sisaldab EL-i poliitreklaami?'), select=node('select');select.id='brief-eu_political_ads';
for(const [value,text]of [['unknown','Pole veel kinnitatud'],['no','Ei'],['yes','Jah']]){const o=node('option',text);o.value=value;select.append(o);}political.append(select);$('briefFields').append(political);
function fillBrief(brief){for(const[key,,type]of fields)$('brief-'+key).value=type==='list'?(brief[key]||[]).join('\n'):brief[key]??'';$('brief-eu_political_ads').value=brief.eu_political_ads||'unknown';}
function briefValue(){const result={schema_version:1};for(const[key,,type]of fields){const raw=$('brief-'+key).value.trim();result[key]=type==='list'?lines(raw):type==='money'?raw.replace(',','.')||null:raw;}result.eu_political_ads=$('brief-eu_political_ads').value;return result;}
function input(label,value,tag='input'){const l=node('label',label),i=node(tag);i.value=value;l.append(i);return [l,i];}
let proposalInputs=null;
function renderProposal(record){
 $('proposalEmpty').hidden=!!record;$('proposalForm').hidden=!record;proposalInputs=null;$('proposalFields').replaceChildren();if(!record)return;
 const value=record.proposal, root=$('proposalFields'), [name,n]=input('Kampaania nimi',value.campaign_name),[why,w]=input('Põhjendus',value.rationale,'textarea');root.append(name,why);
 const groups=[];
 for(const group of value.ad_groups){const card=node('div');card.className='ad-group';const[nl,ni]=input('Reklaamirühm',group.name),[hl,hi]=input('Pealkirjad · üks rea kohta · kuni 30 märki',group.headlines.join('\n'),'textarea'),[dl,di]=input('Kirjeldused · üks rea kohta · kuni 90 märki',group.descriptions.join('\n'),'textarea');card.append(nl,hl,dl);const keywords=[];
 for(const kw of group.keywords){const row=node('div');row.className='keyword-row';const t=node('input');t.value=kw.text;t.setAttribute('aria-label','Märksõna');const s=node('select');s.setAttribute('aria-label','Vaste tüüp');for(const[v,label]of [['EXACT','Täpne'],['PHRASE','Fraas']]){const o=node('option',label);o.value=v;s.append(o);}s.value=kw.match;row.append(t,s);card.append(row);keywords.push([t,s]);}root.append(card);groups.push({ni,hi,di,keywords});}
 const[nl,neg]=input('Välistavad märksõnad · üks rea kohta',value.negative_keywords.join('\n'),'textarea');root.append(nl);
 if(value.assumptions.length){root.append(node('h3','Eeldused, mida üle vaadata'));const list=node('ul');value.assumptions.forEach(x=>list.append(node('li',x)));root.append(list);}
 proposalInputs={n,w,groups,neg,original:value};
}
function proposalValue(){const p=proposalInputs;return {...p.original,campaign_name:p.n.value.trim(),rationale:p.w.value.trim(),negative_keywords:lines(p.neg.value),ad_groups:p.groups.map(g=>({name:g.ni.value.trim(),headlines:lines(g.hi.value),descriptions:lines(g.di.value),keywords:g.keywords.map(([t,s])=>({text:t.value.trim(),match:s.value}))}))};}
function render(populate=false){
 if(populate&&!dirty)fillBrief(state.brief?.brief||state.prefill);
 if(!proposalDirty)renderProposal(state.proposal);
 $('briefVersion').textContent=state.brief?'Salvestatud · '+state.brief.version.slice(0,8):'Veel salvestamata';
 const labels=Object.fromEntries(fields.map(([k,l])=>[k,l]));labels.eu_political_ads='Poliitreklaami kinnitus';
 $('missing').textContent=!state.brief?'Täida ja salvesta lähteülesanne.':state.brief.missing_information?.length?'Enne loomise kinnitamist täida: '+state.brief.missing_information.map(x=>labels[x]||x).join(', '):'Kõik loomise põhiväljad on täidetud.';
 const source=state.context.source_status||{};$('adsState').textContent=source.google_ads==='retrieved'?'Kontrollitud andmed':'Andmeid ootel';$('gaState').textContent=source.ga4==='retrieved'?'Kontrollitud andmed':'Andmeid ootel';
 $('evidenceTime').textContent=state.context.generated_at?'Viimane andmelugemine: '+new Date(state.context.generated_at).toLocaleString('et-EE'):'Värske andmelugemine on ootel.';
 $('evidence').replaceChildren();for(const fact of state.context.evidence?.observed_facts||[])$('evidence').append(node('li',fact.statement+' · '+String(fact.value)));
 $('generationStatus').textContent=state.generation?'Koostamise seis: '+(states[state.generation.status]||state.generation.status):'Esita lähteülesanne Adhalla töötajale. AI koostamine algab alles pärast kinnitamist.';
 let tickets=$('clientRequests');if(!tickets){tickets=node('div');tickets.id='clientRequests';$('generationStatus').after(tickets);}tickets.replaceChildren();for(const r of state.requests||[])tickets.append(node('p','Taotlus '+r.request_id.slice(0,8)+' · '+(states[r.status]||r.status)));
 $('generate').textContent='Esita Adhallale';$('generate').disabled=!state.brief||dirty;
 $('history').replaceChildren();for(const kind of ['brief','proposal']){const label=node('p',kind==='brief'?'Lähteülesande versioonid':'Ettepaneku versioonid');$('history').append(label);for(const version of state.history[kind]||[]){const b=node('button',version.slice(0,8));b.type='button';b.onclick=async()=>{try{const r=await client.read(route+kind+'/'+version);const box=$('historyDetail');box.replaceChildren(node('strong',(kind==='brief'?'Lähteülesanne':'Ettepanek')+' · '+version.slice(0,8)));const value=r[kind];for(const[k,v]of Object.entries(value)){if(k==='schema_version')continue;box.append(node('p',(labels[k]||k)+': '+(Array.isArray(v)?v.map(x=>typeof x==='string'?x:Object.values(x).flat().join(' · ')).join('\n'):v??'Teadmata')));}box.hidden=false;}catch(e){say(e.message);}};$('history').append(b);}}
}
function clearProtected(){state=null;selected=null;dirty=false;proposalDirty=false;proposalInputs=null;$('product').hidden=true;$('gate').hidden=false;$('briefForm').reset();for(const id of ['proposalFields','workerSummary','historyDetail','history','evidence','clientRequests'])$(id)?.replaceChildren();$('requestReview')?.remove();}
async function refresh(populate=false){const epoch=userEpoch;try{const result=await client.read(route+'overview');if(epoch!==userEpoch)return;state=result;$('gate').hidden=true;$('product').hidden=false;render(populate);if(worker)await loadQueue();}catch(e){if(epoch===userEpoch){if([401,403].includes(e.status))clearProtected();say(e.message);if(!state)$('gateMessage').textContent=e.message;}}}
async function loadQueue(){const records=await client.read('/worker/requests');const list=$('workerSummary');list.replaceChildren();if(!records.length){list.append(node('p','Ühtegi taotlust veel pole. Esita lähteülesanne kliendivaates.'));selected=null;return;}
 for(const r of records){const b=node('button',`Adhalla · ${r.client_id} · ${states[r.status]||r.status} · ${r.request_id.slice(0,8)}`);b.className='secondary';b.type='button';b.onclick=()=>review(r);list.append(b);}if(selected){const current=records.find(x=>x.request_id===selected.request_id);if(current)review(current);}else review(records[0]);}
function review(r){selected=r;$('approveCheck').checked=false;$('approve').disabled=true;$('approvalStatus').textContent=states[r.status]||r.status;let detail=$('requestReview');if(!detail){detail=node('div');detail.id='requestReview';$('workerSummary').after(detail);}detail.replaceChildren(node('h3','Taotlus · klient '+r.client_id),node('p','Soov: koostada ja valideerida Search kampaania ning luua see peatatud olekus. Käivitamine ei ole lubatud.'));
 const labels=Object.fromEntries(fields.map(([k,l])=>[k,l]));for(const[k,v]of Object.entries(r.snapshot.brief)){if(k==='schema_version')continue;detail.append(node('p',(labels[k]||k)+': '+(Array.isArray(v)?v.join(', '):v??'Teadmata')));}detail.append(node('small','Lähteülesanne '+r.snapshot.brief_version.slice(0,8)+' · Vastutav töötaja: '+(r.responsible_worker?'Määratud':'Määramata')));
 detail.append(node('h3','Taotlusega kaasas olev kontekst'));for(const fact of r.snapshot.context.evidence?.observed_facts||[])detail.append(node('p',fact.statement+' · '+String(fact.value)));
 for(const caution of r.snapshot.context.evidence?.cautions||[])detail.append(node('p',caution.statement));
 detail.append(node('p','Andmete aeg: '+(r.snapshot.context.generated_at?new Date(r.snapshot.context.generated_at).toLocaleString('et-EE'):'Puudub')));
 if(['unassigned','in_progress'].includes(r.status)){const claim=node('button','Võta töösse');claim.className='secondary';claim.onclick=async()=>{try{await client.write('/worker/requests/'+r.request_id+'/claim',{review_digest:r.review_digest});await loadQueue();}catch(e){say(e.message);}};detail.append(claim);}
 if(r.reason==='paused_creation_not_enabled')detail.append(node('p','Ettepanek on koostatud. Päris kampaania loomine on blokeeritud: kirjutusõigus ja teenusepoliitika on keelatud ning loomise adapter vajab veel juurutamist.'));
 if(['awaiting_input','failed','limited'].includes(r.status))detail.append(node('p','See katse on peatatud. Kontrolli lähteülesannet, värskeid andmeid ja kasutuspiire ning esita vajadusel uus taotlus. Automaatset korduskatset ei tehta.'));
}
function mode(value){worker=value;$('workerPanel').hidden=!worker;$('briefCard').hidden=worker;$('modeLabel').textContent=worker?'ADHALLA TÖÖTAJA · KAITSTUD VAADE':'ADHALLA KLIENDINA · 0000';$('workerView').setAttribute('aria-pressed',String(worker));$('clientView').setAttribute('aria-pressed',String(!worker));if(worker)loadQueue().catch(e=>say(e.message));}
$('clientView').onclick=()=>mode(false);$('workerView').onclick=()=>mode(true);$('refresh').onclick=()=>refresh(!dirty);
$('briefForm').oninput=()=>{dirty=true;$('generate').disabled=true;};$('proposalForm').oninput=()=>proposalDirty=true;
$('briefForm').onsubmit=async e=>{e.preventDefault();try{await client.write(route+'brief',{client_id:'0000',base_version:state.brief?.version||null,brief:briefValue()});dirty=false;await refresh(true);say('Lähteülesanne salvestatud. Esita see nüüd Adhallale.');}catch(e){say(e.message);}};
$('prefill').onclick=()=>{const current=briefValue();for(const[k,v]of Object.entries(state.prefill)){if((current[k]===null||current[k]===''||(Array.isArray(current[k])&&!current[k].length))&&v)current[k]=v;}fillBrief(current);dirty=true;$('generate').disabled=true;say('Olemasolevad äriväärtused lisatud tühjadele väljadele. Vaata üle ja salvesta.');};
$('generate').onclick=async()=>{try{const r=await client.write(route+'submit',{client_id:'0000',base_version:state.brief.version});say('Taotlus '+r.request_id.slice(0,8)+' on Adhalla tööjärjekorras. Kampaaniat pole loodud.');await refresh();}catch(e){say(e.message);}};
$('proposalForm').onsubmit=async e=>{e.preventDefault();try{await client.write(route+'proposal',{client_id:'0000',base_version:state.proposal.version,proposal:proposalValue()});proposalDirty=false;await refresh();say('Muudetud ettepanek salvestatud. Muudatus ei anna loomise ega käivitamise luba.');}catch(e){say(e.message);}};
$('approveCheck').onchange=()=>{$('approve').disabled=!$('approveCheck').checked||!selected||!['unassigned','in_progress'].includes(selected.status);};
$('approve').onclick=async()=>{if(!selected||!$('approveCheck').checked)return;try{await client.write('/worker/requests/'+selected.request_id+'/approve',{review_digest:selected.review_digest});say('Täpselt see taotlus on kinnitatud. Järgmine samm on automaatne koostamine ja valideerimine.');await refresh();}catch(e){say(e.message);}};
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),current=>{userEpoch++;clearInterval(timer);client.start(current);state=null;selected=null;dirty=false;proposalDirty=false;mode(false);$('product').hidden=true;$('gate').hidden=false;$('briefForm').reset();$('proposalFields').replaceChildren();$('requestReview')?.remove();$('workerSummary').replaceChildren();$('historyDetail').replaceChildren();if(!current){$('gateMessage').textContent='Logi Google kontoga sisse portaali kaudu.';return;}refresh(true);timer=setInterval(()=>{if(!document.hidden)refresh(false);},30000);});
