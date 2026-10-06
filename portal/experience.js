import {createCampaignClient} from './campaigns-client.js?v=0.36';
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./experience.css?v=0.36',import.meta.url).href;document.head.append(style);const staffStyle=document.createElement('link');staffStyle.rel='stylesheet';staffStyle.href=new URL('./staff.css?v=0.36',import.meta.url).href;document.head.append(staffStyle);

// Own workspace only: visiting a client's admin view never changes that client's choice.
let session=null;
export function clearExperience(){session?.destroy();session=null;delete document.documentElement.dataset.experience;delete document.documentElement.dataset.clientExperience;delete document.documentElement.dataset.ownClient;delete document.documentElement.dataset.portalAdmin;delete document.documentElement.dataset.selectedClient;delete document.documentElement.dataset.staffTools;delete document.documentElement.dataset.supportCount;}
export async function ensureExperience(user){
 if(session?.uid!==user.uid){clearExperience();session=workflow(user);}
 return session.load();
}
function workflow(user){
 const api=createCampaignClient();api.start(user);document.documentElement.dataset.portalAdmin=String(/@adhalla\.ee$/i.test(user.email||''));const brand=document.querySelector('.product-side .brand,.sidebar .brand');if(brand&&!brand.querySelector('img')){const logo=document.createElement('img');logo.src='../assets/adhalla-logo.png';logo.alt='';brand.prepend(logo);}
 const path='/workspaces/'+encodeURIComponent(user.uid)+'/experience';
 const root=document.createElement('div');root.className='experience-setting';
 const button=document.createElement('button');button.type='button';button.textContent='Kasutusviis';
 button.setAttribute('aria-label','Muuda oma Adhalla kasutusviisi');root.append(button);
 (document.querySelector('.product-side,.sidebar')||document.body).append(root);
 let staffContext=null,staffClients=[],toolsToggle=null;const pageQuery=new URLSearchParams(location.search);let selectedClient=pageQuery.get('client');let fullTools=pageQuery.get('technical')==='1';let viewToggle=null;const viewKey='adhalla:view:'+user.uid;let adminMode=false;try{adminMode=sessionStorage.getItem(viewKey)==='admin';}catch{}if(pageQuery.get('mode')==='admin')adminMode=true;else if(pageQuery.get('mode')==='client')adminMode=false;document.documentElement.dataset.portalView=adminMode?'admin':'client';try{sessionStorage.setItem(viewKey,adminMode?'admin':'client');}catch{}
 function setView(){if(!/@adhalla\.ee$/i.test(user.email||''))return;const side=document.querySelector('.product-side,.sidebar');if(!side)return;if(!viewToggle){viewToggle=document.createElement('div');viewToggle.className='portal-view-toggle';viewToggle.setAttribute('aria-label','Portaali vaade');for(const[mode,label]of [['client','Kliendi vaade'],['admin','Admini vaade']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.mode=mode;b.onclick=()=>{try{sessionStorage.setItem(viewKey,mode);}catch{}const id=mode==='admin'?(selectedClient||ownClient):ownClient;location.href=mode==='admin'?(id?'business.html?client='+id+'&view=worker&technical=0&mode=admin':'clients.html?mode=admin'):(id?'business.html?client='+id+'&mode=client':'index.html?mode=client');};viewToggle.append(b);}side.append(viewToggle);}for(const b of viewToggle.children)b.setAttribute('aria-pressed',String((adminMode?'admin':'client')===b.dataset.mode));document.documentElement.dataset.portalView=adminMode?'admin':'client';}document.addEventListener('adhalla:navigation',setView);
 let value=null,pending=null,dialog=null,destroyed=false,busy=false,ownClient=null;
 const identity=document.querySelector('.identity,.client-chip')||document.createElement('div');identity.className='identity';const side=document.querySelector('.product-side,.sidebar');if(side)side.querySelector('.brand')?.after(identity);else root.before(identity);const existingName=identity.querySelector('strong'),existingKind=identity.querySelector('small');if(existingKind?.id)identity.dataset.kindId=existingKind.id;identity.replaceChildren();button.className='client-switch';button.replaceChildren();const tierLabel=document.createElement('small'),company=document.createElement('strong');if(identity.dataset.kindId)tierLabel.id=identity.dataset.kindId;company.textContent=existingName?.textContent||'Minu ettevõte';if(existingName?.id)identity.dataset.nameId=existingName.id;if(identity.dataset.nameId)company.id=identity.dataset.nameId;button.append(tierLabel,company);identity.append(button);root.hidden=true;
 const setIdentity=()=>{if(adminMode&&staffContext){company.textContent=staffContext.name+' · '+selectedClient;tierLabel.textContent=fullTools?'Admin · kõik tööriistad':({evaluation:'Hindamine',creation:'Loomine',agency:'Agency'}[staffContext.experience?.tier]||'Kasutusviis valimata');button.disabled=true;return;}const q=new URLSearchParams(location.search),foreign=ownClient&&q.get('view')==='worker'&&q.get('client')&&q.get('client')!==ownClient;button.disabled=!!foreign;tierLabel.textContent=foreign?'Töötaja vaade':value?.choices.find(c=>c.id===value.selection?.tier)?.name||'Vali kasutusviis';const businessName=document.getElementById('businessName')?.textContent;if(businessName&&businessName!=='Minu ettevõte'&&!foreign)company.textContent=businessName+(ownClient?' · '+ownClient:'');if(ownClient==='0000'&&!foreign)company.textContent='Adhalla · 0000';else if(ownClient&&!foreign&&!company.textContent.includes(ownClient))company.textContent+=' · '+ownClient;};document.addEventListener('adhalla:navigation',setIdentity);
 const publish=()=>{const tier=value?.selection?.tier;setIdentity();setView();
  if(tier){document.documentElement.dataset.experience=tier;document.documentElement.dataset.clientExperience=adminMode&&staffContext?(fullTools?'worker':staffContext.experience?.tier||'evaluation'):tier;}document.documentElement.dataset.selectedClient=adminMode?(selectedClient||ownClient||''):(ownClient||'');document.documentElement.dataset.staffTools=adminMode&&staffContext&&fullTools?'full':'client';
  const q=new URLSearchParams(location.search);const workerView=q.get('view')==='worker';
  if(!adminMode&&workerView&&q.get('client')===ownClient&&q.get('technical')!=='1'){q.delete('view');location.replace(location.pathname+'?'+q);return;}
  if((!workerView||(adminMode&&!fullTools))&&(staffContext?.experience?.tier||tier)==='agency'&&location.pathname.endsWith('/campaigns.html')){location.replace('agency.html'+location.search);return;}
  if((!workerView||(adminMode&&!fullTools))&&tier&&(staffContext?.experience?.tier||tier)!=='agency'&&location.pathname.endsWith('/agency.html')){location.replace(((staffContext?.experience?.tier||tier)==='evaluation'?'business.html':'campaigns.html')+location.search);return;}
  if(tier==='evaluation'&&location.pathname.endsWith('/campaigns.html')&&!workerView){location.replace('business.html');return;}
  document.dispatchEvent(new CustomEvent('adhalla:experience',{detail:{tier:tier||null,workspaceId:user.uid}}));};
 async function load(){
  if(destroyed)return false;if(pending)return pending;
  if(value)return !!value.selection;
  pending=(async()=>{try{const result=await api.read(path);if(destroyed)return false;value=result;try{ownClient=(await api.read('/workspaces/'+encodeURIComponent(user.uid)+'/connections')).client_id;document.documentElement.dataset.ownClient=ownClient||'';}catch{}if(destroyed)return false;
    selectedClient=selectedClient||ownClient;
    if(adminMode&&document.documentElement.dataset.portalAdmin==='true'&&selectedClient){
     try{[staffContext,staffClients]=await Promise.all([api.read('/worker/clients/'+selectedClient+'/context'),api.read('/worker/clients')]);
      if(destroyed)return false;if(staffContext?.client_id!==selectedClient||!staffContext.name||!Array.isArray(staffClients))throw new Error('Invalid staff context');
      const box=document.createElement('div');box.className='staff-scope';toolsToggle=box;
      const label=document.createElement('label');label.textContent='Valitud klient';const choose=document.createElement('select');
      for(const item of staffClients){const o=document.createElement('option');o.value=item.client_id;o.textContent=item.name+' · '+item.client_id;choose.append(o);}choose.value=selectedClient;
      choose.onchange=()=>{const q=new URLSearchParams(location.search);q.set('client',choose.value);q.set('mode','admin');q.set('view','worker');location.href='business.html?'+q;};label.append(choose);box.append(label);
      const tools=document.createElement('button');tools.type='button';tools.textContent=fullTools?'Näita kliendi tööriistu':'Ava kõik töötaja tööriistad';tools.onclick=()=>{const q=new URLSearchParams(location.search);q.set('client',selectedClient);q.set('mode','admin');q.set('view','worker');q.set('technical',fullTools?'0':'1');location.href=(location.pathname.endsWith('/agency.html')?'campaigns.html':location.pathname)+'?'+q;};box.append(tools);identity.after(box);
     }catch{staffContext=null;fullTools=false;}
    }
    publish();if(adminMode&&staffContext)api.read('/worker/work-center').then(result=>{if(destroyed)return;const count=result.tickets.filter(r=>r.category==='support'&&!r.done&&!r.archived).length;document.documentElement.dataset.supportCount=String(count);document.dispatchEvent(new CustomEvent('adhalla:experience',{detail:{tier:value.selection?.tier}}));}).catch(()=>{});if(!value.selection&&!adminMode)open();return !!value.selection;}
   catch{if(!destroyed){tierLabel.textContent='Kasutusviis · proovi uuesti';button.title='Valiku laadimine ei õnnestunud. Olemasolevad andmed on alles.';}return false;}
   finally{pending=null;}})();return pending;
 }
 function open(){
  if(destroyed||dialog||!value)return;
  dialog=document.createElement('dialog');dialog.className='experience-dialog';dialog.setAttribute('aria-labelledby','experienceTitle');
  const title=document.createElement('h2');title.id='experienceTitle';title.textContent=value.selection?'Muuda oma kasutusviisi':'Kuidas soovid Adhallat kasutada?';
  const intro=document.createElement('p');intro.textContent='Vali endale sobiv tööviis. Saad seda hiljem muuta; sinu ettevõte, ühendused ja senine töö jäävad alles.';
  const choices=document.createElement('div');choices.className='experience-choices';
  const form=document.createElement('form');form.method='dialog';
  for(const choice of value.choices){const label=document.createElement('label');label.className='experience-choice';
   const input=document.createElement('input');input.type='radio';input.name='experience';input.value=choice.id;input.required=true;input.checked=value.selection?.tier===choice.id;
   const name=document.createElement('strong');name.textContent=choice.name;const description=document.createElement('span');description.textContent=choice.description;label.append(input,name,description);choices.append(label);}
  const note=document.createElement('p');note.textContent='Valik ei muuda makseid ega anna reklaamide käivitamise või automaatse muutmise luba. Hindamine keskendub andmetele ja tõlgendustele. Loomine lisab iseteeninduse kampaaniatööriistad; automaatika ja reklaamide käivitamine vajavad eraldi luba.';
  const status=document.createElement('p');status.setAttribute('role','status');
  const save=document.createElement('button');save.type='submit';save.textContent='Salvesta kasutusviis';
  const close=document.createElement('button');close.type='button';close.textContent='Sulge';
  const dismiss=()=>{if(busy)return;dialog?.close();dialog?.remove();dialog=null;};
  close.onclick=dismiss;close.hidden=!value.selection;
  form.append(choices,note,status,save,close);dialog.append(title,intro,form);document.body.append(dialog);
  dialog.oncancel=e=>{e.preventDefault();if(value.selection)dismiss();};
  dialog.onclick=e=>{if(e.target!==dialog||!value.selection)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();};
  form.onsubmit=async e=>{e.preventDefault();if(busy)return;const selected=form.querySelector('input:checked')?.value;if(!selected)return;
   busy=true;save.disabled=true;close.disabled=true;choices.querySelectorAll('input').forEach(i=>i.disabled=true);status.textContent='Salvestan valiku…';
   try{const result=await api.write(path,{tier:selected,base_version:value.selection?.version||null});if(destroyed)return;value=result;if(ownClient&&new URLSearchParams(location.search).get('client')===ownClient&&new URLSearchParams(location.search).get('view')==='worker'){const q=new URLSearchParams(location.search);q.delete('view');q.delete('technical');location.replace((selected==='agency'?'agency.html':selected==='evaluation'?'business.html':'campaigns.html')+'?'+q);return;}publish();busy=false;dismiss();button.focus();}
   catch(error){if(destroyed)return;
    if(error.status===409){try{value=await api.read(path);publish();}catch{}status.textContent='Valik muutus teises aknas. Kontrolli oma valikut ja salvesta uuesti.';}
    else status.textContent='Valikut ei saanud kinnitada. Proovi uuesti; ettevõtte andmed on alles.';
   }finally{busy=false;if(!destroyed&&dialog){save.disabled=false;close.disabled=false;choices.querySelectorAll('input').forEach(i=>i.disabled=false);close.hidden=!value.selection;}}
  };dialog.showModal();
 }
 button.onclick=async()=>{await load();open();};
 return {uid:user.uid,load,destroy(){destroyed=true;api.start(null);dialog?.remove();document.removeEventListener('adhalla:navigation',setIdentity);document.removeEventListener('adhalla:navigation',setView);viewToggle?.remove();toolsToggle?.remove();delete document.documentElement.dataset.portalView;button.remove();root.remove();}};
}
