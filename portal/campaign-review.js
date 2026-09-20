const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const labels={campaign_content_confirmation:'Kliendi sisukinnitus',campaign_review:'Kampaania ülevaatus',campaign_consultation:'Kampaania konsultatsioon',measurement_setup:'Mõõtmise seadistamise abi'};
const states={content_confirmed:'Sisu kliendi poolt kinnitatud',unassigned:'Ootab Adhallat',in_progress:'Töös',awaiting_client:'Vali konsultatsiooni aeg',scheduled:'Konsultatsiooni aeg valitud',completed:'Lõpetatud',declined:'Tagasi lükatud'};
export function clientReview(root,state,api,route,clientId,refresh,{dirty=false}={}){
 root.replaceChildren();if(!state.proposal)return;
 root.append(n('h3','Kuidas soovid edasi minna?'),n('p','Sa ei pea kõike ise teadma. Võid kinnitada sisu, paluda Adhalla ülevaatust või arutada kampaania koos läbi. Ükski neist valikutest ei käivita reklaame.'));
 const message=n('p');message.setAttribute('role','status');const controls=[];
 for(const [decision,label]of [['confirm','Kinnitan reklaami sisu'],['worker_review','Saada Adhallale ülevaatuseks'],['consultation','Soovin 30–60 min konsultatsiooni'],['tracking_help','Vajan mõõtmise seadistamise abi']]){
  const b=n('button',label);b.type='button';b.className='secondary';b.disabled=dirty||['queued','running','limited'].includes(state.generation?.status);controls.push(b);root.append(b);
  b.onclick=async()=>{controls.forEach(c=>c.disabled=true);message.textContent='Salvestan…';try{await api.write(route+'review',{client_id:clientId,proposal_version:state.proposal.version,decision});message.textContent=decision==='confirm'?'Sisu kinnitatud. Loomine läbib eraldi paketi- ja tegevusõiguse kontrolli.':'✓ Soov saadetud Adhallale.';await refresh();}catch(e){message.textContent=e.message;controls.forEach(c=>c.disabled=dirty);}};
 }
 const help=n('details');help.className='field-help';help.append(n('summary','? Mida tähendab arutelu Adhallaga?'),n('p','Soovituslik 30–60 minuti veebikohtumine, kus töötaja aitab kampaania ülesehituse, sihtimise ja sisu läbi vaadata. Adhalla pakub kuni kolm aega ning sina valid sobiva.'));root.append(help,message);const review=state.content_review;if(!review)return;
 const same=review.proposal_version===state.proposal.version&&review.brief_version===state.brief?.version;
 root.append(n('p',(labels[review.kind]||'Taotlus')+' · '+(states[review.status]||review.status)+(same?'':' · varasema sisu kohta')));
 if(review.selected_slot)root.append(n('p','Valitud aeg: '+new Date(review.selected_slot.start).toLocaleString('et-EE')+' · '+review.selected_slot.minutes+' min'));
 if(review.status==='awaiting_client')for(const [index,slot]of (review.slots||[]).entries()){
  const b=n('button',new Date(slot.start).toLocaleString('et-EE')+' · '+slot.minutes+' min');b.type='button';b.onclick=async()=>{b.disabled=true;try{await api.write(route+'appointment',{client_id:clientId,review_version:review.version,slot:index});await refresh();}catch(e){message.textContent=e.message;b.disabled=false;}};root.append(b);
 }
}

export async function workerReviews(root,api,openCampaign){
 const records=await api.read('/worker/service-requests');root.replaceChildren(n('h3','Ülevaatused ja abipalved'));
 for(const row of records.filter(Boolean)){
  const card=n('button',(labels[row.kind]||'Abipalve')+' · klient '+row.client_id+' · '+row.campaign_id+' · '+(states[row.status]||row.status));card.type='button';card.className='ticket-card';root.append(card);
  card.onclick=async()=>{const record=await api.read('/worker/service-requests/'+row.request_id),dialog=n('dialog'),close=n('button','Sulge');close.type='button';close.onclick=()=>{dialog.close();dialog.remove();};dialog.addEventListener('cancel',()=>dialog.remove(),{once:true});dialog.append(n('h2',labels[record.kind]||'Abipalve'),n('p','Klient '+record.client_id+' · '+record.campaign_id),n('p',states[record.status]||record.status),close);document.body.append(dialog);dialog.showModal();
   const proposal=record.snapshot.proposal;dialog.append(n('h3',proposal.campaign_name),n('p',proposal.rationale));for(const group of proposal.ad_groups)dialog.append(n('h4',group.name),n('p',group.headlines.join(' · ')),n('p',group.descriptions.join(' · ')));
   dialog.append(n('p','Sisu versioon '+record.proposal_version.slice(0,8)+'. See abipalve ei anna Google’i muutmisõigust.'));
   if(record.snapshot.measurement)dialog.append(n('p','Mõõtmise kontroll: '+record.snapshot.measurement.status+'. Päris teekonna läbimine '+(record.snapshot.measurement.end_to_end_verified?'kinnitatud':'kontrollimata')+'.'));
   const open=n('button','Ava täpse kampaania loomise ülevaatus');open.type='button';open.onclick=async()=>{dialog.close();dialog.remove();await openCampaign(record.campaign_request_id);};dialog.append(open);
   const message=n('p');message.setAttribute('role','status');dialog.append(message);let pending=false;
   async function send(action,slots=[]){if(pending)return;pending=true;message.textContent='Salvestan…';try{await api.write('/worker/service-requests/'+record.request_id,{base_version:record.version,action,slots});dialog.close();dialog.remove();await workerReviews(root,api,openCampaign);}catch(e){message.textContent=e.message;pending=false;}}
   if(!['completed','declined'].includes(record.status)){
    for(const[action,label]of [['claim','Dibs · võtan tööks'],['complete','Märgi abipalve lõpetatuks'],['decline','Lükka abipalve tagasi']]){const b=n('button',label);b.type='button';b.onclick=()=>send(action);dialog.append(b);}
    if(record.kind==='campaign_consultation'){
     dialog.append(n('h3','Paku kuni kolm aega'));const fields=[];
     for(let i=0;i<3;i++){const label=n('label','Aeg '+(i+1)+' · sinu brauseri ajavöönd'),input=n('input');input.type='datetime-local';label.append(input);dialog.append(label);fields.push(input);}
     const label=n('label','Kestus minutites'),duration=n('select');for(const v of [30,45,60]){const o=n('option',String(v));o.value=v;duration.append(o);}label.append(duration);dialog.append(label);const offer=n('button','Saada ajad kliendile');offer.type='button';offer.onclick=()=>{try{const slots=fields.filter(f=>f.value).map(f=>({start:new Date(f.value).toISOString(),minutes:Number(duration.value)}));send('offer_times',slots);}catch{message.textContent='Kontrolli kuupäevi.';}};dialog.append(offer);
    }
   }
  };
 }
}
