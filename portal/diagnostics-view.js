import './dialogs.js?v=0.36';
const n=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const stamps=v=>v?new Date(v).toLocaleString('et-EE'):'Pole veel kontrollitud';
const certainty={observed:'Andmetega kinnitatud',possible:'Võimalik probleem',unknown:'Vajab tõendeid'};
const states={open:'Avatud',reported_fixed:'Klient märkis tehtuks · kontrollimata',not_applicable:'Kliendi hinnangul ei kohaldu',snoozed:'Meenutus nädala pärast',verified_resolved:'Kontroll korras'};
const priorities={1:'Oluline',2:'Kontrolli järgmisena',3:'Täiendav selgus'};
const pending=job=>['queued','running','limited','waiting_provider'].includes(job?.status);
export function diagnosticsView({api,base,root=document}){
 const $=id=>root.getElementById(id);let value=null,busy=false,alive=true,timer=null,sequence=0,filter='open',conversationKey='';
 const message=text=>{$('diagnosticStatus').textContent=text;};
 function schedule(){clearTimeout(timer);if(alive&&(busy||pending(value?.job)))timer=setTimeout(()=>load(),4000);}
 async function load(){const call=++sequence;try{const fresh=await api.read(base+'/diagnostics');if(!alive||call!==sequence)return;value=fresh;render();}catch(e){if(alive&&call===sequence){message(e.message);$('refreshDiagnostics').disabled=false;}}finally{schedule();}}
 async function send(action,row=null,text=''){
  if(busy||!value)return false;busy=true;message(action==='chat'?'Salvestan küsimust…':action==='fix'?'Alustan selle leiu uurimist…':'Salvestan…');render();schedule();
  try{await api.write(base+'/diagnostics',{client_id:value.client_id,action,finding_id:row?.id||'',version:row?.version||'',message:text});
   if(!alive)return false;busy=false;if(action==='chat')$('diagnosticQuestion').value='';await load();
   if(!pending(value?.job)&&!['chat','fix','refresh'].includes(action))message(action==='support'?'Abipalve on Adhallale saadetud. Tasulist tööd pole tellitud.':'Valik salvestatud.');return true;
  }catch(e){if(alive){busy=false;await load();message(e.code==='diagnostics_pending'?'Eelmine uurimine või vastus on veel töös.':e.code==='diagnostics_limit'?'Tänane kasutuspiir on täis. Salvestatud tulemused on alles.':e.code==='diagnostics_cooldown'?'Värske kontroll on juba tellitud. Proovi mõne minuti pärast.':e.message);}return false;
  }finally{busy=false;if(alive){controls();schedule();}}
 }
 function controls(){const locked=busy||pending(value?.job);$('refreshDiagnostics').disabled=!value||locked;$('sendDiagnosticQuestion').disabled=!value||locked;
  $('diagnosticChatStatus').textContent=value?.job?.kind==='chat'&&pending(value.job)?'Koostan tõenditele toetuvat vastust. Võid siit lahkuda ja hiljem tagasi tulla.':'';}
 function detail(row){const el=n('details');el.className='diagnostic-evidence';el.append(n('summary','Tõendid ja järgmine samm'),n('p','Viimati kontrollitud: '+stamps(row.checked_at)),n('p',row.next_step));
  const labels={source:'Allikas',status:'Lugemise olek',stale:'Andmed on aegunud',fresh:'Värske kontroll',mismatched_destinations:'Erinevaid sihtkohti',checked_chains:'Kontrollitud seoseid',end_to_end_verified:'Terve teekond kontrollitud',configured_conversion_count:'Seadistatud konversioone',observed_event_count:'Leitud sündmusi',business_outcomes_verified:'Äritulemused kontrollitud',comparison_available:'Võrdlusandmed olemas',paid:'Tasuline otsing',organic:'Orgaaniline otsing',period:'Periood',sessions:'Külastusi',engagedSessions:'Kaasatud külastusi',keyEvents:'Võtmesündmusi',start:'Algus',end:'Lõpp'};
  const describe=v=>v===true?'Jah':v===false?'Ei':v===null?'Teadmata':typeof v==='object'?Object.entries(v).map(([k,x])=>(labels[k]||k)+': '+describe(x)).join(' · '):({available:'Loetud',unavailable:'Lugemine ei õnnestunud',unknown:'Teadmata',not_configured:'Seadistamata'})[v]||String(v);
  for(const[k,v]of Object.entries(row.evidence))el.append(n('p',(labels[k]||k)+': '+describe(v)));
  if(row.last_investigation)el.append(n('h4','Viimane uurimine · '+stamps(row.last_investigation.at)),n('p',row.last_investigation.summary),n('p',row.last_investigation.next_step));
  if(row.history?.length){const history=n('details');history.append(n('summary','Varasemad sammud'));for(const event of row.history)history.append(n('p',stamps(event.at)+' · '+(states[event.status]||'Uurimine lõpetatud')));el.append(history);}return el;}
 function support(row){const dialog=n('dialog');dialog.className='diagnostic-modal';const title=n('h2','Küsi Adhalla abi'),label=n('label','Kirjelda olukorda'),input=n('textarea');input.rows=5;input.maxLength=2000;label.append(input);
  const note=n('p','Kui konteiner võib olla kadunud, kontrollime esmalt taastamise võimalust. Uue konteineri ja mõõtmise ülesehitus vajab eraldi töömahtu, hinnapakkumist ning sinu kinnitust. Abipalve saatmine ei telli tasulist tööd.');
  const submit=n('button','Saada kasutajatoele'),close=n('button','Sulge');close.onclick=()=>dialog.close();submit.onclick=async()=>{submit.disabled=true;const ok=await send('support',row,input.value);if(ok)dialog.close();else submit.disabled=false;};
  dialog.append(title,label,note,submit,close);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();}
 function render(){if(!value)return;controls();$('diagnosticCoverage').textContent=value.coverage;
  if(pending(value.job))message(value.job.status==='limited'?'Taotlus on alles ja ootab teenuse kasutuslimiidi vabanemist.':value.job.status==='waiting_provider'?'AI teenus on hõivatud; sama küsimust proovitakse uuesti.':value.job.kind==='chat'?'Adhalla koostab vastust…':'Kontrollin seotud allikate värsket seisu…');
  else if(value.job?.status==='failed')message('Viimane toiming ei õnnestunud. Varasemad tulemused on alles; võid uuesti proovida.');
  else if(!busy)message('Salvestatud seisu laadimine lõpetatud. Uueks allikakontrolliks vali „Kontrolli uuesti”.');
  const openIds=new Set([...$('diagnosticFindings').querySelectorAll('article')].filter(x=>x.querySelector('details')?.open).map(x=>x.dataset.id));
  $('diagnosticFindings').replaceChildren();let count=0;
  for(const row of value.findings){if(filter==='open'&&['verified_resolved','not_applicable','snoozed'].includes(row.status))continue;count++;
   const card=n('article');card.className='card diagnostic-finding';card.dataset.id=row.id;card.dataset.check=row.check;card.dataset.priority=row.priority;
   card.setAttribute('aria-busy',String(pending(value.job)&&value.job.finding_id===row.id));
   const badges=n('div');badges.className='diagnostic-badges';const priority=n('span',priorities[row.priority]);priority.className='diagnostic-priority';badges.append(priority,n('span',certainty[row.certainty]),n('span',states[row.status]));
   const facts=detail(row);facts.open=openIds.has(row.id);card.append(badges,n('h3',row.title),n('p',row.text),facts);
   const actions=n('div');actions.className='diagnostic-actions';const add=(label,action)=>{const b=n('button',label);b.type='button';b.disabled=busy||pending(value.job);b.onclick=()=>send(action,row);actions.append(b);};
   if(value.can_fix&&row.check!=='pass')add('Fix · uuri probleemi','fix');
   if(row.check!=='pass'){add(row.status==='reported_fixed'?'Ava uuesti':'Märgi enda poolt tehtuks',row.status==='reported_fixed'?'open':'reported_fixed');add('Ei kohaldu','not_applicable');add('Meenuta hiljem','snoozed');}
   if(['not_applicable','snoozed'].includes(row.status))add('Ava uuesti','open');
   const help=n('button','Küsi Adhalla abi');help.type='button';help.disabled=busy;help.onclick=()=>support(row);actions.append(help);card.append(actions);
   if(row.support){card.append(n('p','Abipalve: '+(row.support.status==='completed'?'vastatud':'Adhalla tööjärjekorras')));if(row.support.worker_answer)card.append(n('p',row.support.worker_answer));}
   $('diagnosticFindings').append(card);
  }
  if(!count)$('diagnosticFindings').append(n('p','Avatud tähelepanekuid pole. Kontrollitud ja peidetud leiud leiad „Kõik ja ajalugu” alt.'));
  const result=value.job?.result,investigation=$('diagnosticInvestigation');investigation.hidden=!result?.checks;
  if(result?.checks){investigation.replaceChildren(n('h3','Uurimise tulemus'),n('p',result.summary),n('p',result.next_step));for(const c of result.checks)investigation.append(n('h4',c.title),n('p',c.text));}
  const key=JSON.stringify(value.conversation);if(key!==conversationKey){conversationKey=key;$('diagnosticConversation').replaceChildren();for(const turn of value.conversation){
    const box=n('article');box.className='diagnostic-turn';const question=n('p',turn.question);question.className='client-question';box.append(question,n('small','Andmed: '+stamps(turn.evidence_at)));
    for(const item of turn.answer.interpretations){const p=n('p',item.text);p.className='diagnostic-answer';box.append(n('small',certainty[item.certainty]||'AI hinnang'),p);}
    for(const item of turn.answer.recommendations)box.append(n('strong',item.title),n('p',item.rationale));
    const refs=n('details');refs.append(n('summary','Millel vastus põhineb?'));for(const cite of turn.answer.citations||[])refs.append(n('p',cite.statement+(cite.value===undefined?'':': '+String(cite.value))));box.append(refs);$('diagnosticConversation').append(box);
  }}
 }
 $('refreshDiagnostics').onclick=()=>value?send('refresh'):load();$('diagnosticChatForm').onsubmit=e=>{e.preventDefault();if($('diagnosticQuestion').value.trim())send('chat',null,$('diagnosticQuestion').value.trim());};
 for(const button of $('diagnosticFilters').querySelectorAll('[data-filter]'))button.onclick=()=>{filter=button.dataset.filter;for(const b of $('diagnosticFilters').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));render();};
 load();return {destroy(){alive=false;sequence++;clearTimeout(timer);$('refreshDiagnostics').disabled=true;$('sendDiagnosticQuestion').disabled=true;$('diagnosticInvestigation').replaceChildren();$('diagnosticCoverage').textContent='';},load};
}
