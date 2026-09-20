// Model prose is always text, never HTML. Answers remain bound to one report version.
import {questionBacklog} from './questions.js?v=0.26';
export function weeklyView(root,api,{cadence='weekly',showQuestions=false}={}){
 const monthly=cadence==='monthly';
 let data=null,epoch=0,timer=null,shown=null,saving=false;
 const n=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
 let base='/internal/clients/0000',clientId='0000';
 function setScope(path,id){reset();base=path;clientId=id;}
 function reset(){epoch++;clearTimeout(timer);timer=null;data=null;shown=null;saving=false;root.replaceChildren();}
 function references(parent,refs,report){const detail=n('details'),summary=n('summary','Millistel andmetel see põhineb?');detail.append(summary);
  const facts=report.evidence.observed_facts.concat(report.evidence.configuration_facts);
  for(const ref of refs){const [kind,id]=ref.split(':');let text;
   if(kind==='FACT'){const f=facts.find(v=>v.id===id);text=f?f.statement+': '+f.value:null;}
   if(kind==='MISSING')text=report.evidence.missing_information.find(v=>v.id===id)?.label;
   if(kind==='CAUTION')text=report.evidence.cautions.find(v=>v.id===id)?.statement;
   if(text)detail.append(n('p',text,'source-note'));}
  parent.append(detail);
 }
 function render(value){data=value;const report=value.report;
  if(report&&shown===report.run_id)return;
  root.replaceChildren(n('p',monthly?'KUU KOKKUVÕTE':'NÄDALA FOOKUS','eyebrow'),n('h2','Mida andmed sinu ettevõtte kohta ütlevad?'));
  root.append(n('p',value.schedule_enabled?(monthly?'Kokkuvõte valminud kalendrikuust · iga kuu alguses pärast 09.00.':'Uus kokkuvõte esmaspäeviti alates 09.00 Eesti aja järgi. Hilinenud töö võetakse uuesti järjekorda.'):'Automaatne nädalakokkuvõte pole veel sisse lülitatud.','muted'));
  if(!report){const status=value.job?.status;root.append(n('p',status==='running'?'AI koostab kokkuvõtet…':status==='waiting_provider'?'Google’i AI teenus on ajutiselt päringu tagasi lükanud. Järgmine piiratud korduskatse: '+new Date(value.job.retry_at).toLocaleString('et-EE')+'. Uut taotlust pole vaja.':status==='limited'?'Kokkuvõte ootab mudeli kasutuslimiidi vabanemist.':status==='failed'?'Kokkuvõtet ei õnnestunud avaldada. Adhalla saab vea üle vaadata; varasemaid mõõdikuid see ei muuda.':'Esimest nädalakokkuvõtet pole veel.','source-note'));return;}
  shown=report.run_id;if(monthly){const heading=root.querySelector('h2');if(heading)heading.textContent=new Intl.DateTimeFormat('et-EE',{month:'long',year:'numeric'}).format(new Date(report.period.start+'T12:00:00Z'))+' — Monthly Review';}
  if(value.history?.length>1){const label=n('label',monthly?'Vaata kuud ':'Vaata nädalat '),select=n('select');for(const item of value.history){const option=n('option',item.period.start+' – '+item.period.end);option.value=item.run_id;select.append(option);}select.value=report.run_id;select.onchange=()=>load(select.value);label.append(select);root.append(label);}
  root.append(n('p',report.period.start+' – '+report.period.end+' · koostatud '+new Date(report.generated_at).toLocaleString('et-EE'),'report-dates'));
  const notice=n('p','See on andmetel põhinev AI hinnang. Soovitused ei käivita, peata ega muuda reklaame.','source-note');root.append(notice);
  root.append(n('h3','Olulisemad tähelepanekud'));
  for(const item of report.interpretations){const card=n('article','','weekly-item');card.append(n('p',item.text));references(card,item.evidence_refs,report);root.append(card);}
  root.append(n('h3','Järgmised sammud'));
  for(const item of [...report.recommendations].sort((a,b)=>a.priority-b.priority)){const card=n('article','','weekly-item');card.append(n('h4',item.priority+'. '+item.title),n('p',item.rationale));references(card,item.evidence_refs,report);root.append(card);}
  const actions=n('details');actions.append(n('summary','Salvestatud tegevused sel perioodil ('+report.completed_actions.length+')'));
  if(!report.completed_actions.length)actions.append(n('p','Selle perioodi kohta ei ole Adhalla ajaloos lõpetatud tegevusi. See ei ole Google konto täielik muudatuste ajalugu.'));
  const actionNames={pause_campaign:'kampaania peatatud kliendi soovil',pause_keywords:'märksõna peatatud',add_keywords:'märksõna lisatud',add_negatives:'välistus lisatud',create_ads:'reklaamiversioon loodud',edit_ads:'reklaam uuendatud',adjust_budget:'eelarve muudetud',change_bidding_strategy:'pakkumisstrateegia muudetud',activate_campaign:'kampaania käivitatud',experiment_review:'katse hinnang salvestatud'};
  for(const item of report.completed_actions)actions.append(n('p',item.campaign+' · '+(item.state==='rolled_back'?'muudatus tagasi pööratud':actionNames[item.action]||'loodud peatatud olekus')+' · '+new Date(item.at).toLocaleString('et-EE')));root.append(actions);
  const gaps=n('details');gaps.append(n('summary','Mida me veel kindlalt ei tea?'));for(const item of report.missing_information)gaps.append(n('p',item.label));for(const item of report.evidence.cautions)gaps.append(n('p',item.statement));root.append(gaps);
  if(monthly||!showQuestions)return;
  root.append(n('h3','Vabatahtlikud küsimused järgmise nädala paremaks otsuseks'),n('p','Võid vastata kõigile, osale või jätta kõik vahele. Vastused lähevad järgmise kokkuvõtte konteksti; need ei anna reklaamide muutmiseks luba.','muted'));
  const form=n('form','','weekly-questions'),fields={};
  for(const q of report.questions){const label=n('label',q.question),input=n('textarea');input.rows=3;input.maxLength=1500;input.value=value.answers?.answers.find(a=>a.id===q.id)?.answer||'';fields[q.id]=input;label.append(input,n('small',q.why));form.append(label);}
  const button=n('button','Salvesta vastused'),status=n('p',value.answers?'Vastused on salvestatud.':'');status.setAttribute('role','status');form.append(button,status);root.append(form);
  const skip=n('button','Jäta kõik küsimused vahele');skip.type='button';skip.onclick=()=>{if(saving)return;for(const field of Object.values(fields))field.value='';form.requestSubmit();};form.append(skip);
  questionBacklog(root,api,base,clientId);
  form.onsubmit=async event=>{event.preventDefault();if(saving)return;saving=true;button.disabled=true;status.textContent='Salvestan…';const capture=epoch;
   try{const result=await api.write(base+'/weekly_answers',{client_id:clientId,report_id:report.run_id,report_version:report.version,base_version:data.answers?.version||null,answers:Object.fromEntries(Object.entries(fields).map(([id,e])=>[id,e.value.trim()]))});if(capture!==epoch)return;data.answers=result;status.textContent=result.skipped_all?'Küsimused jäetud vahele. Teenus jätkub.':'Vastused salvestatud. Adhalla arvestab nendega järgmises kokkuvõttes.';}
   catch(error){if(capture!==epoch)return;status.textContent=error.message;}
   finally{if(capture===epoch){saving=false;button.disabled=false;}}
  };
 }
 async function load(id){const capture=epoch;try{const value=await api.read(base+'/'+cadence+(id?'/'+id:''));if(capture!==epoch)return;render(value);clearTimeout(timer);if(!value.report&&value.schedule_enabled&&value.job?.status!=='failed')timer=setTimeout(()=>load(),30000);}
  catch(error){if(capture!==epoch)return;root.replaceChildren(n('h2','Nädalaülevaade'),n('p',error.message));}}
 return {reset,load,setScope,render};
}
