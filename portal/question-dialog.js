import './dialogs.js?v=0.32';
import {understandingWorkflow} from './understanding.js?v=0.32';
// Optional context only. No answer is an approval or an execution command.
export function questionsWorkflow(root,api,base,clientId,{auto=true,controls=true}={}){
 let alive=true,busy=false,dialog=null,latest=null,index=0,values={},resolved=[],dismissed=null;
 const n=(t,s)=>{const e=document.createElement(t);if(s)e.textContent=s;return e;};
 const next=n('button','Järgmine küsimus'),status=n('span');next.type='button';next.className='quiet';status.setAttribute('role','status');root.replaceChildren(next,status);
 const understanding=controls?understandingWorkflow(root,api,base,clientId):null;
 function close(){dialog?.close();dialog?.remove();dialog=null;}
 function modal(title){close();dialog=n('dialog');dialog.className='product-modal question-modal';dialog.setAttribute('aria-label',title);const top=n('div');top.className='modal-top';const x=n('button','Sulge');x.type='button';x.onclick=()=>{dismissed=latest?.report?.run_id;close();};top.append(n('h2',title),x);dialog.append(top,n('p','Vastamine on vabatahtlik. Võid akna sulgeda ja tavapäraselt jätkata.'));document.body.append(dialog);dialog.showModal();const opened=dialog;opened.addEventListener('close',()=>{dismissed=latest?.report?.run_id;opened.remove();},{once:true});return dialog;}
 
 function renderWeekly(){if(!alive||!latest?.report)return;const report=latest.report;while(resolved.includes(report.questions[index]?.id))index++;const q=report.questions[index];if(!q){close();status.textContent='Aitäh! Küsimuste ring on lõpetatud.';return;}
  const box=modal('Nädala küsimused'),progress=n('p',`Küsimus ${index+1} / ${report.questions.length}`);progress.className='question-progress';const label=n('label',q.question),input=n('textarea');input.maxLength=1500;input.value=values[q.id]||'';label.append(input);const why=n('p',q.why);why.className='note';const note=n('p');note.setAttribute('role','status');const controls=n('footer'),skip=n('button','Jäta vahele'),save=n('button',index+1===report.questions.length?'Salvesta ja lõpeta':'Salvesta ja edasi');skip.type=save.type='button';controls.append(skip,save);box.append(progress,label,why,note,controls);
  async function send(skipped){if(busy)return;if(!skipped&&!input.value.trim()){note.textContent='Kirjuta vastus või jäta küsimus vahele.';return;}const proposed={...values};if(!skipped)proposed[q.id]=input.value.trim();busy=true;save.disabled=skip.disabled=true;try{const result=await api.write(base+'/weekly_answers',{client_id:clientId,report_id:report.run_id,report_version:report.version,base_version:latest.answers?.version||null,answers:proposed,resolved_question_ids:[...new Set([...resolved,q.id])]});if(!alive)return;latest.answers=result;values=proposed;resolved=result.resolved_question_ids||[...resolved,q.id];index++;renderWeekly();}catch(e){if(alive&&box.isConnected)note.textContent=e.message;}finally{busy=false;save.disabled=skip.disabled=false;}}
  skip.onclick=()=>send(true);save.onclick=()=>send(false);
 }
 next.onclick=async()=>{if(busy)return;busy=true;next.disabled=true;status.textContent='Otsin järgmist kasulikku küsimust…';try{const value=await api.read(base+'/questions');if(!alive)return;const q=value.questions?.[0];if(!q){status.textContent='Praegu rohkem küsimusi pole.';return;}status.textContent='';const box=modal('Järgmine küsimus'),label=n('label',q.question),input=n('textarea');input.maxLength=1500;label.append(input);const note=n('p');note.setAttribute('role','status');const controls=n('footer'),skip=n('button','Jäta vahele'),save=n('button','Salvesta vastus');skip.type=save.type='button';controls.append(skip,save);box.append(label,n('p',q.why),note,controls);
   async function send(skipped){if(busy)return;if(!skipped&&!input.value.trim()){note.textContent='Kirjuta vastus või jäta küsimus vahele.';return;}busy=true;save.disabled=skip.disabled=true;try{await api.write(base+'/questions',{client_id:clientId,version:value.version,question_id:q.id,answer:skipped?'':input.value.trim(),skip:skipped});if(!alive)return;close();status.textContent=skipped?'Küsimus jäetud vahele.':'Vastus salvestatud.';}catch(e){if(alive)note.textContent=e.message;}finally{busy=false;save.disabled=skip.disabled=false;}}
   save.onclick=()=>send(false);skip.onclick=()=>send(true);
  }catch(e){if(alive)status.textContent=e.message;}finally{busy=false;next.disabled=false;}};
 let checking=false;
 async function checkWeekly(){
  if(!alive||!auto||busy||checking||document.hidden||document.querySelector('dialog[open]'))return;
  checking=true;
  try{const value=await api.read(base+'/weekly');if(!alive)return;
   const report=value.question_report===undefined?value.report:value.question_report,answers=value.question_answers===undefined?value.answers:value.question_answers;
   latest={...value,report,answers};
   if(!report?.questions?.length||report.run_id===dismissed)return;
   // Old complete-form saves resolve the whole set. New saves track each question.
   resolved=answers?.resolved_question_ids||(answers?report.questions.map(q=>q.id):[]);
   if(report.questions.every(q=>resolved.includes(q.id)))return;
   if(busy||document.hidden||document.querySelector('dialog[open]'))return;
   values=Object.fromEntries(report.questions.map(q=>[q.id,answers?.answers?.find(a=>a.id===q.id)?.answer||'']));index=0;renderWeekly();
  }catch{/* Optional questions never block the page. */}finally{checking=false;}
 }
 checkWeekly();
 const timer=auto?setInterval(checkWeekly,60000):null;
 const visible=()=>{if(!document.hidden)checkWeekly();};
 document.addEventListener('visibilitychange',visible);window.addEventListener('focus',checkWeekly);
 return {destroy(){alive=false;understanding?.destroy();clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',checkWeekly);close();root.replaceChildren();}};
}
