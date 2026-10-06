export function navigation(root,options={}){
 const {current='business',clientId=null,worker=false,confirmed=true}=options;
 const render=()=>{
  const data=document.documentElement.dataset,q=new URLSearchParams(location.search);
  const admin=data.portalAdmin==='true'&&(data.portalView==='admin'||q.get('mode')==='admin');
  const id=data.selectedClient||clientId||q.get('client')||data.ownClient;
  const selected=new URLSearchParams();if(id)selected.set('client',id);
  if(admin){selected.set('mode','admin');selected.set('view','worker');selected.set('technical',data.staffTools==='full'?'1':'0');}
  const query=selected.size?'?'+selected:'';
  const profile=admin?'staff-profile.html':'index.html';
  const ads=admin&&data.staffTools==='full'?'campaigns.html':data.clientExperience==='agency'?'agency.html':'campaigns.html';
  const items=[['profile','Ettevõtte info',profile],['business','Äri ülevaade','business.html'],['ads','Google Ads',ads],['data','Andmed ja raportid','data.html'],['connections','Ühendused','connections.html']];
  const nav=document.createElement('nav');nav.className='module-nav';nav.setAttribute('aria-label','Portaali moodulid');
  for(const[key,label,path]of items){const a=document.createElement('a');a.textContent=label;a.href=path+query;if(current===key)a.setAttribute('aria-current','page');
   if(key==='ads'&&!confirmed&&!admin){a.setAttribute('aria-disabled','true');a.onclick=e=>{e.preventDefault();a.title='Esmalt kinnita ettevõtte info.';};}nav.append(a);}
  for(const label of ['Meta','TikTok','LinkedIn']){const a=document.createElement('span');a.className='future';a.textContent=label+' · tulekul';nav.append(a);}
  if(admin)for(const[key,label,path]of [['work','Töökeskus','work-center.html'],['support','Kasutajatugi','work-center.html'],['clients','Kliendid','clients.html']]){
   const a=document.createElement('a');a.textContent=label+(key==='support'&&Number(data.supportCount)?' · '+data.supportCount:'');a.href=path+query+(key==='support'?'&category=support':'');a.dataset.workerAction='true';if(current===key)a.setAttribute('aria-current','page');nav.append(a);
  }
  root.replaceChildren(nav);document.dispatchEvent(new CustomEvent('adhalla:navigation',{detail:{clientId:id,worker,admin}}));
 };
 if(root._navigationListener)document.removeEventListener('adhalla:experience',root._navigationListener);
 root._navigationListener=render;document.addEventListener('adhalla:experience',render);render();return root.querySelector('nav');
}
