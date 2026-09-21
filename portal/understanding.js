import './dialogs.js?v=0.27';
const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const labels={current_state:'Praegune olukord',trajectory:'Suund ja muutused',key_findings:'Olulised tähelepanekud',explanations:'Mis võib seda selgitada?',unknowns:'Mida me veel ei tea?'};
const certainty={observed:'Andmetes nähtav või kliendi kinnitatud',possible:'Võimalik selgitus · pole tõestatud',unknown:'Praegu teadmata'};
const stamp=v=>new Date(v).toLocaleString('et-EE');
export function renderAssessment(root,value){
 root.replaceChildren();if(!value)return;
 const names={context_completeness:'Ettevõtte kontekst',data_reliability:'Andmete usaldusväärsus',cross_channel_visibility:'Kanalite ülevaade'},levels={HIGH:'Kõrge',MEDIUM:'Keskmine',LOW:'Piiratud'};
 for(const[key,label]of Object.entries(names)){const item=value[key];if(!item)continue;const box=n('div');box.className='knowledge-assessment';box.append(n('h3',label+' · '+levels[item.level]));for(const reason of item.reasons||[])box.append(n('p',reason));root.append(box);}
 root.append(n('h3','Järgmine tähelepanu'));const list=n('ol');for(const item of value.priorities||[])list.append(n('li',item));root.append(list);
}
export function understandingWorkflow(root,api,base,clientId){
 let alive=true,dialog=null,timer=null,value=null,pending=false,epoch=0,loadError=null;
 const open=n('button','Tõlgenda');open.type='button';open.className='interpret-action';root.append(open);
 function close(){epoch++;clearTimeout(timer);const opened=dialog;dialog=null;opened?.close();opened?.remove();}
 function render(){if(!alive||!dialog)return;const title=n('div');title.className='modal-top';const exit=n('button','Sulge');exit.type='button';exit.onclick=close;title.append(n('h2','Adhalla tõlgendus'),exit);dialog.replaceChildren(title);
  if(loadError){const message=n('p','Salvestatud tõlgenduse laadimine ebaõnnestus. '+loadError);message.setAttribute('role','alert');const retry=n('button','Proovi laadimist uuesti');retry.type='button';retry.onclick=()=>{loadError=null;render();load();};dialog.append(message,retry);}
  if(!value){if(!loadError)dialog.append(n('p','Laadin salvestatud tõlgendust…'));return;}
  const report=value.report;
  if(report){dialog.append(n('p','Viimati tõlgendatud: '+stamp(report.generated_at)));if(value.new_information)dialog.append(n('p','Pärast viimast tõlgendust on lisandunud või muutunud ettevõtte infot.'));
   for(const section of Object.keys(labels)){const item=report.interpretations?.find(x=>x.section===section);if(!item)continue;const box=n('section');box.append(n('h3',labels[section]),n('small',certainty[item.certainty]||'Hinnang'),n('p',item.text));dialog.append(box);}
   dialog.append(n('h3','Prioriteedid ja järgmised sammud'));const list=n('ol');for(const item of [...(report.recommendations||[])].sort((a,b)=>a.priority-b.priority)){const li=n('li');li.append(n('strong',item.title),n('p',item.rationale));list.append(li);}dialog.append(list);
  }else dialog.append(n('p','Ettevõtte esimene terviklik tõlgendus pole veel koostatud. Värskenda tõlgendust, et kasutada olemasolevat ettevõtteinfot, vastuseid ja seotud andmeid.'));
  const details=n('details');details.append(n('summary','Praegune andmete ja konteksti hinnang'));const assessment=n('div');renderAssessment(assessment,value.assessment);details.append(assessment);dialog.append(details);
  const footer=n('footer'),refresh=n('button','Värskenda tõlgendust'),status=n('p');refresh.type='button';status.setAttribute('role','status');const busy=['queued','running','waiting_provider','limited'].includes(value.job?.status);
  refresh.disabled=pending||!value.can_refresh;
  if(busy)status.textContent=value.job.status==='limited'?'Tõlgendus ootab teenuse kasutuslimiidi vabanemist. Taotlus on alles.':value.job.status==='waiting_provider'?'AI teenus on hõivatud. Salvestatud taotlust proovitakse uuesti.':'Tõlgendus on koostamisel. Uus tulemus ilmub siia automaatselt; varasem jääb seni alles.';
  else if(value.job?.status==='failed')status.textContent='Uus tõlgendus ei läbinud koostamist või kontrolli. Varasem tulemus on alles.';
  footer.append(refresh,status);if(value.next_refresh_at&&Date.parse(value.next_refresh_at)>Date.now())footer.append(n('p','Järgmine värskendus võimalik '+stamp(value.next_refresh_at)+'.'));
  refresh.onclick=async()=>{if(pending||!value.can_refresh)return;pending=true;refresh.disabled=true;status.textContent='Saadan tõlgenduse värskendamise taotluse…';let error=null;try{await api.write(base+'/understanding',{client_id:clientId});if(alive&&dialog)await load();}catch(e){error=e.message;if(alive&&dialog)await load(false);}finally{pending=false;if(alive&&dialog){render();if(error){const message=n('p',error);message.setAttribute('role','alert');(dialog.querySelector('footer')||dialog).append(message);}}}};dialog.append(footer);
 }
 async function load(redraw=true){const generation=epoch;try{const result=await api.read(base+'/understanding');if(!alive||generation!==epoch)return;value=result;loadError=null;if(redraw)render();clearTimeout(timer);if(dialog&&['queued','running','waiting_provider','limited'].includes(value.job?.status))timer=setTimeout(()=>load(),15000);}catch(e){if(alive&&dialog&&generation===epoch){loadError=e.message;render();}}}
 open.onclick=()=>{close();dialog=n('dialog');dialog.className='product-modal interpretation-modal';dialog.setAttribute('aria-label','Adhalla tõlgendus');document.body.append(dialog);const opened=dialog;opened.addEventListener('close',()=>{if(dialog===opened)close();},{once:true});render();dialog.showModal();load();};
 return{destroy(){alive=false;close();open.remove();}};
}
