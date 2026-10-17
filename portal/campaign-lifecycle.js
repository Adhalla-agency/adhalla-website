const node=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function observedStatus(item){
 const state=item.google_state,latest=item.google_status;
 if(latest?.campaign_status&&(!state?.observed_at||Date.parse(latest.observed_at)>=Date.parse(state.observed_at)))return latest.campaign_status;
 return state?.result?.campaign_status;
}
export function lifecycleControls(container,item,{api,root,clientId,reload,valid=()=>true}){
 const feedback=node('p');feedback.setAttribute('role','status');feedback.className='campaign-lifecycle-feedback';
 const bound=!!item.creation,status=observedStatus(item),pending=['requested','running'].includes(item.removal?.status);
 if(bound){
  const pause=node('button',status==='PAUSED'?'✓ Peatatud':'Peata kampaania');pause.type='button';pause.className='danger-quiet';
  pause.disabled=pending||status==='REMOVED'||['requested','running'].includes(item.safety_pause?.status);
  if(['requested','running'].includes(item.safety_pause?.status))pause.textContent='Peatan…';
  pause.onclick=async()=>{pause.disabled=true;pause.textContent='Peatan…';feedback.textContent='Saadan Google Adsile peatamise käsu…';
   try{const result=await api.write(root+'campaigns/'+item.campaign_id+'/pause',{client_id:clientId});if(!valid())return;
    if(result.status==='completed'){feedback.textContent=result.campaign_status==='REMOVED'?'Kampaania on Google Adsist eemaldatud.':'✓ Google Ads kinnitas: kampaania on peatatud.';pause.textContent='✓ Peatatud';}
    else if(['failed','reconciliation_required'].includes(result.status)){feedback.textContent='Google ei kinnitanud peatamist. Kontrolli kampaaniat Google Adsis; peatamist ei loeta õnnestunuks.';pause.disabled=false;pause.textContent='Kontrolli peatamist uuesti';}
    else feedback.textContent='Google’i kinnitus on veel ootel. Olekut kontrollitakse automaatselt.';
    await reload();
   }catch(e){if(valid()){feedback.textContent='Peatamine pole kinnitatud. '+e.message;pause.disabled=false;pause.textContent='Kontrolli peatamist uuesti';}}
  };container.append(pause);
 }
 const remove=node('button',pending?'Eemaldan…':'Kustuta');remove.type='button';remove.className='danger-quiet';remove.disabled=pending;
 remove.onclick=()=>{
  const dialog=node('dialog');dialog.className='campaign-remove-dialog';const heading=node('h2','Kustuta kampaania?');
  dialog.append(heading,node('strong',item.summary||item.label),node('p',bound?'See eemaldab seotud kampaania ka Google Adsist. Eemaldatud Google Adsi kampaaniat ei saa taastada. Tegevuste ajalugu jääb Adhallasse alles.':'See eemaldab mustandi ja tühistab selle ootel taotlused. Tegevuste ajalugu jääb alles.'));
  const cancel=node('button','Tagasi'),confirm=node('button',bound?'Kustuta ka Google Adsist':'Kustuta mustand'),message=node('p');message.setAttribute('role','status');
  cancel.onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};
  confirm.onclick=async()=>{confirm.disabled=true;message.textContent=bound?'Eemaldan Google Adsist…':'Eemaldan mustandi…';
   try{const result=await api.write(root+'campaigns/'+item.campaign_id+'/lifecycle',{client_id:clientId,base_version:item.brief_version,action:bound?'remove':'delete'});if(!valid()){dialog.close();return;}
    if(['completed','deleted'].includes(result.status)){dialog.close();await reload();}
    else {message.textContent=['failed','reconciliation_required'].includes(result.status)?'Eemaldamine pole Google’i poolt kinnitatud. Kampaania jääb nähtavaks, kuni tulemus on kontrollitud.':'Eemaldamine on ootel. Tulemus ilmub kampaania juurde.';confirm.disabled=false;await reload();}
   }catch(e){if(valid()){message.textContent=e.message;confirm.disabled=false;}else dialog.close();}
  };dialog.append(message,confirm,cancel);document.body.append(dialog);dialog.showModal();
 };container.append(remove,feedback);
 if(pending)feedback.textContent='Kampaania eemaldamine Google Adsist on ootel.';
 else if(['failed','reconciliation_required'].includes(item.removal?.status))feedback.textContent='Eemaldamine pole kinnitatud. Kampaaniat ei ole nimekirjast peidetud.';
 else if(['failed','reconciliation_required'].includes(item.safety_pause?.status))feedback.textContent='Google ei kinnitanud peatamist. Kampaania võib endiselt töötada.';
}
const actions={pause:'Peatamine',pause_campaign:'Peatamine',remove:'Kustutamine',delete:'Mustandi kustutamine',cancel:'Taotluse tühistamine',google_status_observed:'Google Adsi olek',removed_in_google:'Google Adsist eemaldatud',brief_saved:'Lähteülesanne salvestatud',proposal_saved:'Reklaamisisu salvestatud',activate_campaign:'Kampaania käivitamine',adjust_budget:'Eelarve muutmine',pause_keywords:'Märksõna peatamine',add_keywords:'Märksõnade lisamine',add_negatives:'Välistuste lisamine',create_ads:'Reklaamide loomine',edit_ads:'Reklaamide muutmine',change_bidding_strategy:'Pakkumisstrateegia muutmine'};
const states={requested:'Saadetud',running:'Töös',completed:'Kinnitatud',failed:'Ebaõnnestus',reconciliation_required:'Tulemus vajab kontrolli',deleted:'Eemaldatud',draft:'Mustand',PAUSED:'Peatatud',ENABLED:'Aktiivne',REMOVED:'Eemaldatud',created_paused:'Loodud peatatud olekus',cancelled:'Tühistatud',approved:'Kinnitatud',unassigned:'Esitatud',generating:'Koostamine',creating_paused:'Loomine',submitted:'Esitatud'};
export function campaignHistory(container,scope){
 const details=node('details'),summary=node('summary','Tegevuste ajalugu'),content=node('div');details.className='card campaign-activity';details.append(summary,content);container.append(details);let version=0;
 details.ontoggle=async()=>{if(!details.open)return;const current=++version,{api,root,valid}=scope();content.replaceChildren(node('p','Laen ajalugu…'));
  try{const rows=await api.read(root+'campaigns/history');if(current!==version||!valid())return;content.replaceChildren();
   for(const row of rows){if(!row.events.length)continue;const group=node('details');group.append(node('summary',row.name+(row.removed?' · eemaldatud':'')));
    for(const e of row.events){const line=node('p'),time=e.completed_at||e.at;line.append(node('strong',(actions[e.action]||states[e.state]||'Kampaania tegevus')+' · '+(states[e.status]||states[e.state]||e.status||'')),node('br'),document.createTextNode((time?new Date(time).toLocaleString('et-EE')+' · ':'')+(e.actor_type==='google_ads_actor_unknown'?'Google Ads · tegija teadmata':e.actor_uid?'Kasutaja '+e.actor_uid:'Adhalla süsteem')));group.append(line);}content.append(group);
   }if(!content.childNodes.length)content.append(node('p','Tegevusi veel pole.'));
  }catch(e){if(current===version&&valid())content.replaceChildren(node('p',e.message));}
 };
 return {reset(){version++;details.open=false;content.replaceChildren();},refresh(){if(details.open)details.ontoggle();}};
}
