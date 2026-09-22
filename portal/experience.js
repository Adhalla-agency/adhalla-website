import {createCampaignClient} from './campaigns-client.js?v=0.29';
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./experience.css?v=0.29',import.meta.url).href;document.head.append(style);

// Own workspace only: visiting a client's admin view never changes that client's choice.
let session=null;
export function clearExperience(){session?.destroy();session=null;delete document.documentElement.dataset.experience;delete document.documentElement.dataset.clientExperience;}
export async function ensureExperience(user){
 if(session?.uid!==user.uid){clearExperience();session=workflow(user);}
 return session.load();
}
function workflow(user){
 const api=createCampaignClient();api.start(user);
 const path='/workspaces/'+encodeURIComponent(user.uid)+'/experience';
 const root=document.createElement('div');root.className='experience-setting';
 const button=document.createElement('button');button.type='button';button.textContent='Kasutusviis';
 button.setAttribute('aria-label','Muuda oma Adhalla kasutusviisi');root.append(button);
 (document.querySelector('.product-side,.sidebar')||document.body).append(root);
 let value=null,pending=null,dialog=null,destroyed=false,busy=false;
 const publish=()=>{const tier=value?.selection?.tier;button.textContent='Kasutusviis'+(tier?' · '+value.choices.find(c=>c.id===tier)?.name:'');
  if(tier){document.documentElement.dataset.experience=tier;document.documentElement.dataset.clientExperience=new URLSearchParams(location.search).get('view')==='worker'?'worker':tier;}
  if(tier==='evaluation'&&location.pathname.endsWith('/campaigns.html')&&new URLSearchParams(location.search).get('view')!=='worker'){location.replace('business.html');return;}
  document.dispatchEvent(new CustomEvent('adhalla:experience',{detail:{tier:tier||null,workspaceId:user.uid}}));};
 async function load(){
  if(destroyed)return false;if(value)return !!value.selection;
  if(pending)return pending;
  pending=(async()=>{try{const result=await api.read(path);if(destroyed)return false;value=result;publish();if(!value.selection)open();return !!value.selection;}
   catch{if(!destroyed){button.textContent='Kasutusviis · proovi uuesti';button.title='Valiku laadimine ei õnnestunud. Olemasolevad andmed on alles.';}return false;}
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
  const note=document.createElement('p');note.textContent='Valik ei muuda makseid ega anna reklaamide käivitamise või automaatse muutmise luba. Hindamine keskendub andmetele ja tõlgendustele. Loomise ja Agency töövooge täiendame järgmistes etappides.';
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
   try{const result=await api.write(path,{tier:selected,base_version:value.selection?.version||null});if(destroyed)return;value=result;publish();busy=false;dismiss();button.focus();}
   catch(error){if(destroyed)return;
    if(error.status===409){try{value=await api.read(path);publish();}catch{}status.textContent='Valik muutus teises aknas. Kontrolli oma valikut ja salvesta uuesti.';}
    else status.textContent='Valikut ei saanud kinnitada. Proovi uuesti; ettevõtte andmed on alles.';
   }finally{busy=false;if(!destroyed&&dialog){save.disabled=false;close.disabled=false;choices.querySelectorAll('input').forEach(i=>i.disabled=false);close.hidden=!value.selection;}}
  };dialog.showModal();
 }
 button.onclick=async()=>{await load();open();};
 return {uid:user.uid,load,destroy(){destroyed=true;api.start(null);dialog?.remove();root.remove();}};
}
