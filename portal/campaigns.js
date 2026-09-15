import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient,fields,lines,states,help,normalizeBrief,cpcGuidance,approvalPresentation,campaignPresentation,researchPresentation,quotaPresentation} from './campaigns-client.js?v=0.14';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id), client=createCampaignClient();
const rootRoute='/internal/clients/0000/';
let statusCampaign=null,researchSending=null,researchFeedback={};
let campaignId='campaign-01',route=rootRoute+'campaigns/'+campaignId+'/',catalog=[],editing=false,submitting=false,selectionEpoch=0;
let state=null, worker=false, dirty=false, proposalDirty=false, userEpoch=0, selected=null, timer=null, draftBase=null, saving=false;
let automationPrice=null;fetch('./plans.json',{cache:'no-cache'}).then(r=>r.json()).then(x=>{automationPrice=x.plans?.automation?.monthly_eur;if(state)renderResearch();}).catch(()=>{});
const say=text=>$('message').textContent=text;
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
for(const [key,label,type]of fields){
 const wrap=node('div'), fieldLabel=node('label',label), input=node(['text','list'].includes(type)?'textarea':'input');input.id='brief-'+key;input.required=false;fieldLabel.htmlFor=input.id;wrap.append(fieldLabel);const hint=node('details');hint.className='field-help';hint.append(node('summary','? Selgitus'),node('p',help[key]));wrap.append(hint);
 if(type==='money'){input.inputMode='decimal';input.placeholder=['target_cpa','target_roas','max_cpc'].includes(key)?'Valikuline · jäta tühjaks':'Näiteks 10,00';}
 if(type==='url')input.placeholder='https://';
 input.maxLength=({objective:1500,landing_page:500,currency:3,strategy_notes:5000,constraints:3000})[key]||(type==='list'?16100:type==='money'?10:2000);
 if(type==='list')wrap.append(node('small','Üks väärtus rea kohta.'));
 wrap.append(input);if(['target_cpa','target_roas'].includes(key)){const optional=node('label');optional.className='optional-choice';const toggle=node('input');toggle.type='checkbox';toggle.id='use-'+key;toggle.setAttribute('aria-controls',input.id);optional.append(toggle,node('span',key==='target_roas'?'Soovin määrata ROAS eesmärgi':'Soovin määrata CPA eesmärgi'));wrap.prepend(optional);input.disabled=true;toggle.onchange=()=>{input.disabled=!toggle.checked;if(!toggle.checked)input.value='';markDirty();};}if(['objective','offer','constraints','strategy_notes'].includes(key))wrap.className='wide';$('briefFields').append(wrap);
}
const bidding=node('label','Pakkumisstrateegia'), strategy=node('select');strategy.id='brief-bidding_strategy';
for(const [value,text]of [['MAXIMIZE_CLICKS','Maximize Clicks · võimalikult palju klikke'],['MANUAL_CPC','Manuaalne CPC · fikseeritud algpakkumine']]){const o=node('option',text);o.value=value;strategy.append(o);}bidding.append(strategy);$('briefFields').prepend(bidding);
const political=node('label','Kas kampaania sisaldab EL-i poliitreklaami?'), select=node('select');select.id='brief-eu_political_ads';
for(const [value,text]of [['unknown','Pole veel kinnitatud'],['no','Ei'],['yes','Jah']]){const o=node('option',text);o.value=value;select.append(o);}political.append(select);$('briefFields').append(political);
function fillBrief(brief){$('brief-bidding_strategy').value=brief.bidding_strategy||(state?.brief?'MANUAL_CPC':'MAXIMIZE_CLICKS');for(const[key,,type]of fields)$('brief-'+key).value=type==='list'?(brief[key]||[]).join('\n'):brief[key]??'';$('brief-eu_political_ads').value=brief.eu_political_ads||'unknown';for(const key of ['target_cpa','target_roas']){const active=brief[key]!==null&&brief[key]!==undefined&&brief[key]!=='';$('use-'+key).checked=active;$('brief-'+key).disabled=!active;}}
function briefValue(){const result={schema_version:1};for(const[key,,type]of fields){const raw=$('brief-'+key).value.trim();result[key]=type==='list'?lines(raw):type==='money'?raw.replace(',','.')||null:raw;}result.eu_political_ads=$('brief-eu_political_ads').value;result.bidding_strategy=$('brief-bidding_strategy').value;for(const key of ['target_cpa','target_roas'])if(!$('use-'+key).checked)result[key]=null;return normalizeBrief(result);}
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
 if(!dirty){fillBrief(state.brief?.brief||state.prefill);draftBase=state.brief?.version||null;}
 if(!proposalDirty)renderProposal(state.proposal);
 $('personalPrefill').hidden=!Object.keys(state.personal_business_draft||{}).length;
 $('briefVersion').textContent=dirty?'Salvestamata muudatused':state.brief?'Salvestatud · '+state.brief.version.slice(0,8):'Veel salvestamata';
 const labels=Object.fromEntries(fields.map(([k,l])=>[k,l]));labels.bidding_strategy='Pakkumisstrateegia';labels.eu_political_ads='Poliitreklaami kinnitus';
 $('missing').textContent=!state.brief?'Täida ja salvesta lähteülesanne.':state.brief.missing_information?.length?'Enne loomise kinnitamist täida: '+state.brief.missing_information.map(x=>labels[x]||x).join(', '):'Kõik loomise põhiväljad on täidetud.';
 const source=state.context.source_status||{};
 for(const [id,key]of [['adsState','google_ads'],['gaState','ga4'],['gtmState','gtm']]){const good=source[key]==='retrieved',configured=state.connection_status?.[key],bound=good||(configured?.bound===true&&configured?.read_enabled===true),el=$(id);el.textContent=good?'✓ Ühendatud · andmed loetud':bound?'✓ Seotud · varasem kontroll':configured?.bound===false?'○ Ühendamata':'◷ Ühendus vajab kontrolli';el.closest('article').classList.toggle('connected',bound);}
 renderResearch();updateCpc();renderCards();if(statusCampaign&&$('campaignStatusDialog').open){const c=catalog.find(x=>x.campaign_id===statusCampaign);if(c)showCampaignStatus(c);}$('briefCard').hidden=worker||!editing;$('proposalCard').hidden=worker||!editing;$('editingCampaignLabel').textContent=campaignLabel(campaignId)+' · LÄHTEÜLESANNE';$('editNotice').textContent=state.requests?.length?'Muuda soovitud välju ja salvesta. Varasem esitatud sisu säilib; töötaja näeb enne kinnitamist täpset võrdlust. Olemasolevaid reklaame see vorm otse ei muuda.':'';
 $('evidenceTime').textContent=state.context.generated_at?'Viimane andmelugemine: '+new Date(state.context.generated_at).toLocaleString('et-EE'):'Värske andmelugemine on ootel.';
 $('evidence').replaceChildren();for(const fact of state.context.evidence?.observed_facts||[])$('evidence').append(node('li',fact.statement+' · '+String(fact.value)));
 $('generationStatus').textContent=state.generation?'Koostamise seis: '+(states[state.generation.status]||state.generation.status):'Esita lähteülesanne Adhalla töötajale. AI koostamine algab alles pärast kinnitamist.';
 $('executionPolicy').textContent=state.action_classes?.includes('create_campaign_paused')?'Sisemine arendusõigus: lubatud on ainult kinnitatud uue Search kampaania loomine peatatud olekus. Käivitamine ja olemasolevate kampaaniate muutmine on lukus.':'AI ettepanekud on lubatud. Kampaaniate loomise õigust pole serveris lubatud.';
 let tickets=$('clientRequests');if(!tickets){tickets=node('div');tickets.id='clientRequests';$('generationStatus').after(tickets);}tickets.replaceChildren();for(const r of state.requests||[])tickets.append(node('p','Taotlus '+r.request_id.slice(0,8)+' · '+(states[r.status]||r.status)));
 $('generate').textContent='Esita Adhallale';$('generate').disabled=!state.brief||dirty;
 $('history').replaceChildren();for(const kind of ['brief','proposal']){const label=node('p',kind==='brief'?'Lähteülesande versioonid':'Ettepaneku versioonid');$('history').append(label);for(const version of state.history[kind]||[]){const b=node('button',version.slice(0,8));b.type='button';b.onclick=async()=>{try{const r=await client.read(route+kind+'/'+version);const box=$('historyDetail');box.replaceChildren(node('strong',(kind==='brief'?'Lähteülesanne':'Ettepanek')+' · '+version.slice(0,8)));const value=r[kind];for(const[k,v]of Object.entries(value)){if(k==='schema_version')continue;box.append(node('p',(labels[k]||k)+': '+(Array.isArray(v)?v.map(x=>typeof x==='string'?x:Object.values(x).flat().join(' · ')).join('\n'):v??'Teadmata')));}box.hidden=false;}catch(e){say(e.message);}};$('history').append(b);}}
}
function clearProtected(){researchSending=null;researchFeedback={};for(const key of ['keywords','competitors']){$('research-feedback-'+key)?.replaceChildren();$('research-results-'+key)?.replaceChildren();}statusCampaign=null;$('campaignStatusDialog').close();$('newCampaignDialog').close();$('campaignStatusDetail').replaceChildren();$('copyCampaign').replaceChildren();catalog=[];editing=false;campaignId='campaign-01';route=rootRoute+'campaigns/'+campaignId+'/';selectionEpoch++;$('campaignCards').replaceChildren();state=null;selected=null;draftBase=null;dirty=false;proposalDirty=false;proposalInputs=null;$('product').hidden=true;$('gate').hidden=false;$('briefForm').reset();for(const id of ['proposalFields','workerSummary','historyDetail','history','evidence','clientRequests'])$(id)?.replaceChildren();closeReview();$('approvalControls').hidden=true;$('researchResults').replaceChildren();}
async function refresh(populate=false){const epoch=userEpoch,scope=selectionEpoch;try{const [result,list]=await Promise.all([client.read(route+'overview'),client.read(rootRoute+'campaigns')]);if(epoch!==userEpoch||scope!==selectionEpoch)return;catalog=list;state=result;if(!state.brief)editing=true;$('gate').hidden=true;$('product').hidden=false;render(populate);if(worker)await loadQueue();}catch(e){if(epoch===userEpoch&&scope===selectionEpoch){if([401,403].includes(e.status))clearProtected();say(e.message);if(!state)$('gateMessage').textContent=e.message;}}}
async function loadQueue(){const clients=await client.read('/worker/clients');const chooser=$('adminClient');chooser.replaceChildren();for(const item of clients){const option=node('option',item.name+' · '+item.client_id+(item.protected?' · kaitstud':''));option.value=item.client_id;option.disabled=!item.campaign_workspace;chooser.append(option);}$('clientProgress').textContent=clients.length+(clients.length===1?' klient registris. ':' klienti registris. ')+(state.brief?'Lähteülesanne salvestatud.':'Lähteülesanne veel salvestamata.')+' Puudu: '+(state.brief?.missing_information?.length??'täitmata')+'. Väliskliendi kampaaniatööruum avaneb pärast tema eraldi seostamist.';const records=await client.read('/worker/requests');const list=$('workerSummary');list.replaceChildren();if(!records.length){list.append(node('p','Ühtegi taotlust veel pole. Esita lähteülesanne kliendivaates.'));selected=null;$('approvalControls').hidden=true;closeReview();return;}
 for(const r of records){const b=node('button',`Adhalla · ${r.client_id} · ${campaignLabel(r.campaign_id||'campaign-01')} · ${states[r.status]||r.status} · ${r.request_id.slice(0,8)}`);const visual=approvalPresentation(r);b.className='ticket-card'+(visual.approved?' ticket-approved':'')+(visual.attention?' ticket-attention':'');if(visual.approved)b.prepend(node('span','✓ Kinnitatud · '));b.type='button';b.onclick=async()=>{try{review(await client.read('/worker/requests/'+r.request_id));}catch(e){say(e.message);}};list.append(b);}if(selected){const current=records.find(x=>x.request_id===selected.request_id),{creation_review,...plain}=selected;if(current&&JSON.stringify(current)!==JSON.stringify(plain)){const detail=await client.read('/worker/requests/'+current.request_id);if(JSON.stringify(detail)!==JSON.stringify(selected))review(detail);}}}
function review(r){selected=r;$('approvalControls').hidden=!['unassigned','in_progress'].includes(r.status);$('approveCheck').checked=false;$('approve').disabled=true;$('approvalStatus').textContent=states[r.status]||r.status;const dialog=$('requestDialog');let detail=$('requestReview');if(!detail){detail=node('div');detail.id='requestReview';dialog.insertBefore(detail,$('approvalControls'));}if(!dialog.open)dialog.showModal();detail.replaceChildren(node('h3',campaignLabel(r.campaign_id||'campaign-01')+' · klient '+r.client_id+' · versioon '+(r.submission_revision||1)),node('p',r.snapshot.operation==='review_existing_campaign_change'?'Soov: analüüsida olemasoleva kampaania muudatust. Reklaamide muutmine vajab eraldi kontrolli.':'Soov: koostada ja valideerida Search kampaania ning luua see peatatud olekus. Käivitamine ei ole lubatud.'));
 const openClient=node('button','Ava selle kliendi vaade');openClient.type='button';openClient.className='secondary';openClient.onclick=async()=>{if(r.client_id==='0000'){closeReview();mode(false);await selectCampaign(r.campaign_id||'campaign-01',true);}};const close=node('button','Sulge ülevaade');close.type='button';close.className='secondary';close.onclick=()=>{closeReview();};detail.append(openClient,close);
 if(Object.keys(r.snapshot.changes||{}).length){detail.append(node('h3','Mis muutus?'));const labels=Object.fromEntries(fields.map(([k,l])=>[k,l]));for(const [key,delta] of Object.entries(r.snapshot.changes)){const change=node('div');change.className='campaign-change';change.append(node('strong',labels[key]||key),node('p','Varem: '+displayValue(delta.before)),node('p','Soovitakse: '+displayValue(delta.after)));detail.append(change);}}
 $('approvalControls').querySelector('p').textContent=r.snapshot.operation==='review_existing_campaign_change'?'Kinnitus lubab AI-l muudatussoovi analüüsida. Olemasolevate reklaamide muutmist ega uue kampaania loomist see ei luba.':'Kinnitus lubab AI plaani koostada ja valideerida ning serveri eraldi õiguste piires ühe uue Search kampaania peatatud olekus luua. Käivitamine pole lubatud.';
 if(r.snapshot.operation==='review_existing_campaign_change')detail.append(node('p','Olemasoleva kampaania muudatuse ülevaatus. Kinnitus lubab AI analüüsi. Reklaamide muutmine vajab eraldi hetkeolukorra kontrolli ja tegevusluba; uut kampaaniat ei looda.'));
 const labels={...Object.fromEntries(fields.map(([k,l])=>[k,l])),bidding_strategy:'Pakkumisstrateegia',eu_political_ads:'EL-i poliitreklaam'};for(const[k,v]of Object.entries(r.snapshot.brief)){if(k==='schema_version')continue;detail.append(node('p',(labels[k]||k)+': '+(Array.isArray(v)?v.join(', '):v??'Teadmata')));}detail.append(node('small','Lähteülesanne '+r.snapshot.brief_version.slice(0,8)+' · Vastutav töötaja: '+(r.responsible_worker?'Määratud':'Määramata')));
 if(r.snapshot.creation_profile)detail.append(node('p','Loomiseprofiil: Google Search, '+(r.snapshot.creation_profile.bidding==='MAXIMIZE_CLICKS'?'Maximize Clicks':'manuaalne CPC')+', asukohas kohalolek. Kampaania, reklaamid ja märksõnad luuakse peatatud olekus. Sihtgrupp suunab märksõnu ja tekste; auditooriumifiltrit ei lisata. CPA/ROAS on planeerimise eesmärgid. Piirangute tekst suunab reklaami sisu; eelarve ja sihtimine tulevad eraldi kinnitatud väljadest.'));
 detail.append(node('h3','Taotlusega kaasas olev kontekst'));for(const fact of r.snapshot.context.evidence?.observed_facts||[])detail.append(node('p',fact.statement+' · '+String(fact.value)));
 for(const caution of r.snapshot.context.evidence?.cautions||[])detail.append(node('p',caution.statement));
 detail.append(node('p','Andmete aeg: '+(r.snapshot.context.generated_at?new Date(r.snapshot.context.generated_at).toLocaleString('et-EE'):'Puudub')));
 if(['unassigned','in_progress'].includes(r.status)){const claim=node('button','Dibs · võtan enda vastutada');claim.className='secondary';claim.onclick=async()=>{try{await client.write('/worker/requests/'+r.request_id+'/claim',{review_digest:r.review_digest});await loadQueue();}catch(e){say(e.message);}};claim.title='Määrab sind vastutavaks töötajaks 30 minutiks. See ei kinnita taotlust ega alusta AI tööd.';detail.append(node('p','Dibs määrab vastutaja. Kinnitamine on eraldi otsus pärast sisu ülevaatamist.'),claim);const reject=node('button','Lükka tagasi');reject.type='button';reject.className='secondary';reject.onclick=async()=>{reject.disabled=true;try{await client.write('/worker/requests/'+r.request_id+'/reject',{review_digest:r.review_digest});closeReview();say('Taotlus tagasi lükatud. Klient saab sisu muuta ja sama taotluse uuesti esitada.');await refresh();}catch(e){say(e.message);reject.disabled=false;}};detail.append(reject);}
 if(r.status==='awaiting_action')detail.append(node('p','Ettepanek on valideeritud. Järgmine samm kontrollib serveri tegevusõigust ja Google Ads loomise tingimusi.'));
 if(r.legacy_request_ids?.length){const old=node('details');old.append(node('summary','Varasemate esitamiste ajalugu ('+r.legacy_request_ids.length+')'));for(const key of r.legacy_request_ids){const b=node('button','Ava varasem esitamine '+key.slice(0,8));b.type='button';b.className='secondary';b.onclick=async()=>{try{review(await client.read('/worker/requests/'+key));}catch(e){say(e.message);}};old.append(b);}detail.append(old);}
 if(r.creation)detail.append(node('p','Loodud: '+r.creation.campaign_name+' · PEATATUD. Reklaame pole käivitatud.'));
 if(r.status==='reconciliation_required')detail.append(node('p','Google vastus jäi ebakindlaks. Uus loomine on lukus, kuni töötaja on tulemuse Google Adsis kontrollinud. Automaatselt uuesti ei proovita.'));
 if(r.reason){const reasons={model_generation_failed:'Mudeli vastuse saamine ebaõnnestus.',proposal_validation_failed:'AI plaan ei läbinud reklaamteksti või tõendite kontrolli.',proposal_persistence_failed:'Valideeritud plaani salvestamine või selle õigusekontroll ebaõnnestus.'};if(reasons[r.reason])detail.append(node('p',reasons[r.reason]));}
 if(r.creation_review)renderCreationReview(detail,r);
 if(r.status==='limited')detail.append(node('p',quotaPresentation(r)));
 if(['awaiting_input','failed'].includes(r.status))detail.append(node('p','See katse vajab Adhalla kontrolli. Aegunud kinnitust ei uuendata ega ebaõnnestunud või ebakindlat toimingut korrata automaatselt.'));
}
function renderCreationReview(detail,r){
 const review=r.creation_review, p=review.proposal;
 detail.append(node('h3','Valmis reklaamid · kinnita loomine'),node('p','See kasutab olemasolevat ettepanekut. AI-d uuesti ei käivitata. Google Adsi luuakse üks uus peatatud kampaania; olemasolevaid reklaame ei muudeta.'),node('strong',p.campaign_name),node('p',p.rationale));
 for(const group of p.ad_groups){const box=node('div');box.className='campaign-change';box.append(node('h4',group.name),node('p','Pealkirjad: '+group.headlines.join(' · ')),node('p','Kirjeldused: '+group.descriptions.join(' · ')),node('p','Märksõnad: '+group.keywords.map(k=>k.text+' ('+k.match+')').join(' · ')));detail.append(box);}
 detail.append(node('p','Välistused: '+(p.negative_keywords.join(', ')||'Puuduvad')),node('p','Päevaeelarve: '+review.brief.daily_budget+' '+review.brief.currency+' · Google Adsis: '+review.google_campaign_name));
 const targeting=[];
 if(review.targeting_choices){detail.append(node('h3','Täpsusta Google’i asukohad'),node('p','Google kasutab osa kohanimede ingliskeelset kirjapilti. Vali täpselt soovitud linn või piirkond. Algne lähteülesanne ja valmis reklaamid jäävad alles.'));
 for(const choice of review.targeting_choices){const label=node('label',choice.input+' '),select=node('select');const empty=node('option',choice.options.length?'Vali täpne asukoht…':'Vaste puudub – muuda lähteülesande asukohta');empty.value='';select.append(empty);for(const option of choice.options){const o=node('option',option.canonical_name+' · '+({City:'linn',Municipality:'vald',Country:'riik',County:'maakond'}[option.type]||option.type));o.value=option.canonical_name;select.append(o);}select.value=choice.exact||'';label.append(select);detail.append(label);targeting.push(select);}}
 const label=node('label'),check=node('input');check.type='checkbox';label.append(check,document.createTextNode(' Olen reklaamtekstid, märksõnad, piirangud, sihtimise ja eelarve üle vaadanud. Luban selle kampaania luua PEATATUD olekus.'));
 const approve=node('button','Kinnita peatatud loomine');approve.type='button';approve.disabled=true;const ready=()=>check.checked&&targeting.every(s=>s.value);check.onchange=()=>approve.disabled=!ready();for(const select of targeting)select.onchange=()=>{check.checked=false;approve.disabled=true;};
 approve.onclick=async()=>{if(!ready())return;approve.disabled=true;try{await client.write('/worker/requests/'+r.request_id+'/approve_creation',{review_digest:review.review_digest,...(targeting.length?{target_locations:targeting.map(s=>s.value)}:{})});closeReview();say('Loomine kinnitatud. Adhalla kontrollib Google Adsi seadeid ja loob kampaania peatatud olekus.');await refresh();}catch(e){say(e.message);approve.disabled=!ready();}};
 detail.append(label,approve);
}
function closeReview(){selected=null;$('requestDialog').close();$('requestReview')?.remove();$('approvalControls').hidden=true;}
$('requestDialog').addEventListener('cancel',()=>{selected=null;$('approvalControls').hidden=true;});
function mode(value){if(!value)closeReview();worker=value;$('clientChooser').hidden=!worker;$('workerPanel').hidden=!worker;$('briefCard').hidden=worker||!editing;$('proposalCard').hidden=worker||!editing;$('campaignHome').hidden=worker;$('modeLabel').textContent=worker?'ADMINI VAADE':'KLIENDI VAADE · ADHALLA 0000';$('workerView').setAttribute('aria-pressed',String(worker));$('clientView').setAttribute('aria-pressed',String(!worker));if(worker)loadQueue().catch(e=>say(e.message));}
$('clientView').onclick=()=>mode(false);$('workerView').onclick=()=>mode(true);$('refresh').onclick=async()=>{await refresh(!dirty);say('Taotluste ja salvestuse seis uuendatud. Sinu sisestatud välju ei tühjendatud.');};
function markDirty(){document.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));dirty=true;$('generate').disabled=true;$('briefVersion').textContent='Salvestamata muudatused';updateCpc();}
$('briefForm').oninput=markDirty;$('proposalForm').oninput=()=>proposalDirty=true;
$('briefForm').onsubmit=async e=>{e.preventDefault();if(saving)return;saving=true;$('saveBrief').disabled=true;
 const value=briefValue(),signature=JSON.stringify(value);
 try{const saved=await client.write(route+'brief',{client_id:'0000',base_version:draftBase,brief:value});draftBase=saved.version;dirty=JSON.stringify(briefValue())!==signature;if(!dirty)editing=false;await refresh(!dirty);say(dirty?'Eelmine versioon salvestatud. Hilisemad sisestused vajavad veel salvestamist.':'Lähteülesanne salvestatud. Võid selle nüüd Adhallale esitada.');}
 catch(e){say(e.message);if(e.field){$('brief-'+e.field)?.setAttribute('aria-invalid','true');$('brief-'+e.field)?.focus();}if(e.status===409){await refresh(false);const box=$('conflict');box.replaceChildren(node('h3','Serveris on uuem salvestus'),node('pre',JSON.stringify(state.brief?.brief,null,2)));const use=node('button','Olen võrrelnud · salvesta minu väljad uuema versioonina');use.type='button';use.onclick=()=>{draftBase=state.brief?.version||null;box.hidden=true;$('briefForm').requestSubmit();};box.append(use);box.hidden=false;}}
 finally{saving=false;$('saveBrief').disabled=false;renderCards();}};
$('prefill').onclick=()=>{const current=briefValue();for(const[k,v]of Object.entries(state.prefill)){if((current[k]===null||current[k]===''||(Array.isArray(current[k])&&!current[k].length))&&v)current[k]=v;}fillBrief(current);markDirty();$('generate').disabled=true;say('Olemasolevad äriväärtused lisatud tühjadele väljadele. Vaata üle ja salvesta.');};
$('generate').onclick=()=>submitCampaign(campaignId);
$('proposalForm').onsubmit=async e=>{e.preventDefault();try{await client.write(route+'proposal',{client_id:'0000',base_version:state.proposal.version,proposal:proposalValue()});proposalDirty=false;await refresh();say('Muudetud ettepanek salvestatud. Muudatus ei anna loomise ega käivitamise luba.');}catch(e){say(e.message);}};
$('approveCheck').onchange=()=>{$('approve').disabled=!$('approveCheck').checked||!selected||!['unassigned','in_progress'].includes(selected.status);};
$('approve').onclick=async()=>{if(!selected||!$('approveCheck').checked)return;try{await client.write('/worker/requests/'+selected.request_id+'/approve',{review_digest:selected.review_digest});closeReview();say('Täpselt see taotlus on kinnitatud. Järgmine samm on automaatne koostamine ja valideerimine.');await refresh();}catch(e){say(e.message);}};

function campaignLabel(id){return 'Kampaania '+id.split('-')[1];}
function displayValue(value){return Array.isArray(value)?value.join(', '):value===null||value===undefined||value===''?'Määramata':String(value);}
async function selectCampaign(id,open=false){
 if(saving||submitting)return;
 if(dirty||proposalDirty){if(id===campaignId){editing=true;render();$('briefCard').scrollIntoView({behavior:'smooth'});}else say('Salvesta praegused muudatused enne teise kampaania avamist.');return;}
 campaignId=id;route=rootRoute+'campaigns/'+id+'/';selectionEpoch++;editing=open;state=null;dirty=false;proposalDirty=false;draftBase=null;await refresh(true);
 if(open)$('briefCard').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderCards(){
 const box=$('campaignCards');box.replaceChildren();
 for(const item of catalog){
  const card=node('article');card.className='campaign-tile';const sent=!!item.request_id&&item.submitted_version===item.brief_version;
  const presentation=campaignPresentation(item);card.classList.add('campaign-'+presentation.tone);
  card.append(node('small',item.label),node('h3',item.summary||'Uue kampaania lähteülesanne'));
  const badge=node('p',presentation.text);badge.className='campaign-badge';card.append(badge);
  const actions=node('div');actions.className='campaign-actions';
  const edit=node('button',sent?'Muuda kampaania sisu':item.brief_version?'Muuda sisu':'Täida lähteülesanne');edit.type='button';edit.className='secondary';edit.disabled=saving||submitting;edit.onclick=()=>selectCampaign(item.campaign_id,true);actions.append(edit);
  if(item.brief_version&&!sent){const submit=node('button',item.request_id?'Esita muudatused Adhallale':'Esita Adhallale');submit.type='button';submit.disabled=submitting||saving||dirty;submit.onclick=()=>submitCampaign(item.campaign_id);actions.append(submit);}
  if(item.request_id){const show=node('button','Vaata taotlust');show.type='button';show.className='secondary';show.onclick=async()=>{await selectCampaign(item.campaign_id,true);$('proposalCard').scrollIntoView({behavior:'smooth'});};actions.append(show);}
  const live=node('button','Kuva hetke reklaami olukorda');live.type='button';live.className='text-button';live.onclick=()=>showCampaignStatus(item);actions.append(live);card.append(actions);box.append(card);
 }
}
async function submitCampaign(id){
 if(submitting||saving||dirty)return;
 const item=catalog.find(x=>x.campaign_id===id);if(!item?.brief_version)return;
 submitting=true;renderCards();
 try{const r=await client.write(rootRoute+'campaigns/'+id+'/submit',{client_id:'0000',base_version:item.brief_version});say('✓ '+item.label+' on Adhallale esitatud. Taotlus '+r.request_id.slice(0,8)+' · versioon '+(r.submission_revision||1)+'. Kampaaniat pole selle vajutusega loodud ega muudetud.');await refresh();}
 catch(e){say(e.message);}finally{submitting=false;renderCards();}
}
function showCampaignStatus(item){
 statusCampaign=item.campaign_id;
 const box=$('campaignStatusDetail');box.replaceChildren(node('h2',item.label+' · reklaami olukord'));
 const observation=item.google_state, result=observation?.result;
 if(result){
  box.append(node('p','Kontrollitud: '+new Date(observation.observed_at).toLocaleString('et-EE')),node('h3',result.campaign_name),node('p','Google Adsi seis: '+result.campaign_status+' · päevaeelarve '+(result.daily_budget_micros/1e6).toFixed(2)+' '+result.currency));
  for(const ad of result.ads||[]){const card=node('div');card.className='campaign-change';card.append(node('strong',ad.ad_group+' · '+ad.status),node('p',ad.headlines.join(' · ')),node('p',ad.descriptions.join(' ')));box.append(card);}
  box.append(node('h3','Google Adsis seotud eksperimendid'));
  if(!result.experiments?.length)box.append(node('p','Selle kampaaniaga seotud eksperimente viimane lugemine ei leidnud.'));
  for(const exp of result.experiments||[])box.append(node('p',exp.name+' · '+exp.status+' · '+exp.arm+' · '+exp.traffic_percent+'%'));
  if(result.truncated)box.append(node('p','Näidatakse piiratud väljavõtet; kõiki reklaame või katseid ei pruugi loendis olla.'));
 }else if(item.creation)box.append(node('p','Viimane kinnitatud loomistulemus: '+item.creation.campaign_name+' · peatatud.'),node('p','Google Adsi hetkeolukorda pole veel loetud.'));
 else box.append(node('p','Selle kampaania kohta pole kinnitatud Google Adsi loomistulemust.'),node('p','Taotluse seis: '+(states[item.status]||'Lähteülesanne')));
 if(item.creation){const pending=['queued','running'].includes(observation?.status);box.append(node('p',pending?'Värske lugemine on tööjärjekorras, tavaliselt kuni 5 minutit.':observation?.status==='failed'?'Viimane lugemine ebaõnnestus. Varasem tulemus ei pruugi kajastada hetkeseisu.':''));const refresh=node('button','Värskenda Google Adsist');refresh.disabled=pending;refresh.onclick=async()=>{refresh.disabled=true;try{const result=await client.write(rootRoute+'campaigns/'+item.campaign_id+'/status',{client_id:'0000'});if(result.status==='binding_unavailable'){box.append(node('p','Selle varasema loomise täpne Google Adsi seos vajab töötaja kontrolli. Konto või kampaania sihtmärki ei oletata.'));return;}await windowRefresh();}catch(e){box.append(node('p',e.message));}finally{refresh.disabled=false;}};box.append(refresh);}
 box.append(node('small','Vaade näitab viimast lugemist, mitte pidevat reaalajas ühendust. Adhalla korduvad reklaamimuudatused pole sisse lülitatud; automaatsete muudatuste ajalugu veel ei ole.'));
 if(!$('campaignStatusDialog').open)$('campaignStatusDialog').showModal();
}
async function windowRefresh(){await refresh();}
$('closeCampaignStatus').onclick=()=>{statusCampaign=null;$('campaignStatusDialog').close();};$('campaignStatusDialog').addEventListener('cancel',()=>statusCampaign=null);
$('closeBrief').onclick=()=>{if(dirty||proposalDirty){say('Salvesta muudatused enne kampaaniakaartide juurde naasmist.');return;}editing=false;$('briefCard').hidden=true;$('proposalCard').hidden=true;$('campaignHome').scrollIntoView({behavior:'smooth'});};
$('newCampaign').onclick=()=>{if(dirty||proposalDirty){say('Salvesta muudatused enne uue kampaania loomist.');return;}const select=$('copyCampaign');select.replaceChildren();const blank=node('option','Alusta tühjalt');blank.value='';select.append(blank);for(const c of catalog.filter(x=>x.brief_version)){const option=node('option','Kasuta '+c.label.toLowerCase()+' sisu');option.value=c.campaign_id;select.append(option);}$('newCampaignDialog').showModal();};
$('cancelCampaign').onclick=()=>$('newCampaignDialog').close();
$('createCampaign').onclick=async()=>{const b=$('createCampaign');b.disabled=true;try{const result=await client.write(rootRoute+'campaigns',{client_id:'0000',copy_from:$('copyCampaign').value||null});$('newCampaignDialog').close();await selectCampaign(result.campaign_id,true);say('Uus kampaania valmis täitmiseks. Kopeeritud väljad vaata enne esitamist üle.');}catch(e){say(e.message);}finally{b.disabled=false;}};

window.addEventListener('beforeunload',e=>{if(dirty||proposalDirty){e.preventDefault();e.returnValue='';}});
function updateCpc(){const budget=Number($('brief-daily_budget').value.replace(',','.')),cap=Number($('brief-max_cpc').value.replace(',','.'));const manual=strategy.value==='MANUAL_CPC';if(manual)$('cpcOptions').open=true;$('cpcOptionsLabel').textContent=manual?'Manuaalse CPC algpakkumine':'Lisavalik: klikihinna ülempiir';$('cpcExplanation').textContent=cpcGuidance(budget,cap,$('brief-currency').value.trim().toUpperCase())+(cap>0?' Liiga madal ülempiir võib takistada reklaamide kuvamist.':'');}
const cpcOptions=node('details');cpcOptions.id='cpcOptions';cpcOptions.className='optional-cpc';const cpcTitle=node('summary','Lisavalik: klikihinna ülempiir');cpcTitle.id='cpcOptionsLabel';const cpcWrap=$('brief-max_cpc').parentElement;cpcWrap.before(cpcOptions);cpcOptions.append(cpcTitle,cpcWrap);cpcWrap.prepend(node('small','Maximize Clicksi puhul võid selle tühjaks jätta.'));
const cpcHint=node('small');cpcHint.id='cpcExplanation';$('brief-max_cpc').after(cpcHint);
for(const key of ['keywords','competitors']){
 const button=node('button',key==='keywords'?'✦ Leia märksõnad Keyword Plannerist':'✦ Paku konkurente');button.id='research-'+key;button.type='button';button.className='secondary';
 const feedback=node('p');feedback.id='research-feedback-'+key;feedback.className='research-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');button.setAttribute('aria-describedby',feedback.id);
 const results=node('div');results.id='research-results-'+key;results.className='research-results';
 button.onclick=async()=>{
  if(researchSending)return;
  const epoch=userEpoch,scope=selectionEpoch,feedbackKey=campaignId+':'+key;
  researchSending=feedbackKey;researchFeedback[feedbackKey]={text:'Saadan uuringut…',job:state?.research?.request_id};renderResearch();
  try{const job=await client.write(route+'research',{client_id:'0000',kind:key,brief:briefValue()});if(epoch!==userEpoch||scope!==selectionEpoch)return;researchFeedback[feedbackKey]=null;state.research=job;renderResearch();await refresh(false);}
  catch(e){if(epoch===userEpoch&&scope===selectionEpoch){researchFeedback[feedbackKey]={text:e.message,job:state?.research?.request_id};renderResearch();if(e.field)$('brief-'+e.field)?.setAttribute('aria-invalid','true');}}
  finally{if(researchSending===feedbackKey)researchSending=null;if(epoch===userEpoch&&scope===selectionEpoch&&state)renderResearch();}
 };
 $('brief-'+key).after(button,feedback,results);
}

const negatives=node('div');negatives.className='suggested-negatives';negatives.append(node('small','Näited, mitte automaatsed välistused: '));for(const term of ['tasuta','koolitus','tööpakkumised','praktika','ise tegemine']){const b=node('button','+ '+term);b.type='button';b.className='secondary';b.onclick=()=>{const el=$('brief-negative_keywords');el.value=[...new Set([...lines(el.value),term])].join('\n');markDirty();};negatives.append(b);}$('brief-negative_keywords').after(negatives);
$('personalPrefill').onclick=()=>{const b=state.personal_business_draft||{},v=briefValue();for(const [target,source]of [['offer','offering'],['objective','objective'],['audience','customer'],['landing_page','website']])if(!v[target]&&b[source])v[target]=b[source];fillBrief(v);markDirty();say('Sinu portaali ettevõtteväljad lisati tühjadele väljadele. Kontrolli, et need kirjeldavad Adhallat (0000), ning salvesta.');};
function renderResearch(){
 const job=state.research,pending=['queued','running'].includes(job?.status);
 for(const key of ['keywords','competitors']){
  const button=$('research-'+key), feedback=$('research-feedback-'+key),local=researchFeedback[campaignId+':'+key];
  button.disabled=!state.research_enabled||pending||!!researchSending;
  button.setAttribute('aria-busy',String(!!researchSending||pending&&job.kind===key));
  const sameJob=local&&local.job===job?.request_id;
  feedback.textContent=sameJob?local.text:job?.kind===key?researchPresentation(job):pending?'Teine uuring on töös. Selle lõppedes saad tellida järgmise.':!state.research_enabled?'AI uuring vajab Automation paketti'+(automationPrice?' · '+automationPrice+' €/kuu':'')+'.':'';
  feedback.classList.toggle('research-attention',job?.kind===key&&['limited','failed','access_removed'].includes(job.status)||!!sameJob&&!researchSending);
  if(job?.kind!==key)$('research-results-'+key).replaceChildren();
 }
 $('researchPlan').textContent=state.research_enabled?'AI uuringud on sisekliendi arendusõigusega avatud. Uuring ei anna reklaamide loomise luba.':'AI uuringud on Automation paketis'+(automationPrice?' · '+automationPrice+' €/kuu':'')+'. Paketiõigust kontrollib ka server.';
 if(!job||!['keywords','competitors'].includes(job.kind))return;
 const box=$('research-results-'+job.kind);const checked=box.dataset.job===job.request_id?new Set([...box.querySelectorAll('input:checked')].map(el=>el.value)):new Set();box.dataset.job=job.request_id||'';box.replaceChildren();
 if(job.status!=='completed')return;const result=job.result;box.append(node('h3',job.kind==='keywords'?'Google Keyword Planneri ideed':'AI pakutud konkurendikandidaadid · kontrollimata'),node('p',result.explanation));
 if(job.kind==='keywords')box.append(node('small','Kuni 100 ideed valitud asukohtade ja keele jaoks. Mahud ning lehe ülaosa pakkumised on ajaloolised hinnangud, mitte lubatud klikihind või garanteeritud tulemus.'));
 else box.append(node('small','Need ei ole kontrollitud 10 peamist konkurenti. Kontrolli ettevõtete olemasolu ja asjakohasust enne kasutamist.'));
 const values=job.kind==='keywords'?(result.ideas||[]):result.suggestions.map(text=>({text}));const choices=[];
 for(const idea of values){const label=node('label');label.className='research-choice';const c=node('input');c.type='checkbox';c.value=idea.text;c.checked=checked.has(idea.text);label.append(c,node('span',idea.text+(idea.avg_monthly_searches!==undefined?' · '+idea.avg_monthly_searches+' otsingut/kuu':'')));if(idea.low_top_of_page_bid_micros>0)label.append(node('small','Lehe ülaosa pakkumine: '+(idea.low_top_of_page_bid_micros/1e6).toFixed(2)+'–'+(idea.high_top_of_page_bid_micros/1e6).toFixed(2)+' '+result.currency));box.append(label);choices.push(c);}
 if(!values.length){box.append(node('p','Planner ei tagastanud ideid. Täpsusta pakkumist ja sihtimist.'));return;}
 const all=node('button','Vali kõik');all.type='button';all.className='secondary';all.onclick=()=>choices.forEach(c=>c.checked=true);
 const apply=node('button','Lisa valitud vormi');apply.type='button';apply.onclick=()=>{const field=job.kind==='keywords'?'keywords':'competitors',limit=field==='keywords'?100:20,el=$('brief-'+field);const next=[...new Set([...lines(el.value),...choices.filter(c=>c.checked).map(c=>c.value)])];if(next.length>limit){$('research-feedback-'+job.kind).textContent='Valikus võib olla kuni '+limit+' rida. Vähenda valikut.';return;}el.value=next.join('\n');markDirty();$('research-feedback-'+job.kind).textContent='✓ Valik lisatud vormi. Vaata üle ja salvesta lähteülesanne.';};box.append(all,apply);
}
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),current=>{userEpoch++;clearInterval(timer);client.start(current);clearProtected();mode(false);if(!current){$('gateMessage').textContent='Logi Google kontoga sisse portaali kaudu.';return;}refresh(true);timer=setInterval(()=>{if(!document.hidden)refresh(false);},30000);});
