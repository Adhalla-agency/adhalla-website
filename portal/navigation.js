export function navigation(root,{current='business',clientId=null,worker=false,confirmed=true}={}){
 const query=clientId?'?client='+encodeURIComponent(clientId)+(worker?'&view=worker':''):'';
 const profile=worker&&clientId&&clientId!=='0000'?'clients.html?client='+encodeURIComponent(clientId):'index.html';
 const items=[['profile','Ettevõtte info',profile],['business','Äri ülevaade','business.html'+query],['ads','Google Ads','campaigns.html'+query],['data','Andmed ja raportid','data.html'+query],['connections','Ühendused','connections.html']];
 const nav=document.createElement('nav');nav.className='module-nav';nav.setAttribute('aria-label','Portaali moodulid');
 for(const[key,label,url]of items){const a=document.createElement('a');a.textContent=label;a.href=url;if(current===key)a.setAttribute('aria-current','page');
  if(key==='ads'&&!confirmed){a.textContent='◷ Google Ads';a.setAttribute('aria-disabled','true');a.title='Esmalt kinnita ettevõtte info.';a.onclick=e=>{e.preventDefault();let p=nav.querySelector('[role=status]');if(!p){p=document.createElement('p');p.setAttribute('role','status');nav.append(p);}p.textContent='Esmalt vaata ettevõtte info üle ja kinnita see.';};}nav.append(a);}
 for(const label of ['Meta','TikTok','LinkedIn']){const a=document.createElement('span');a.className='future';a.textContent=label+' · tulekul';nav.append(a);}
 if(worker){const a=document.createElement('a');a.href='clients.html';a.textContent='Admin · kliendid';nav.append(a);}
 const packages=document.createElement('a');packages.href='plans.html'+query;packages.textContent='Paketid';packages.className='packages-link';if(current==='plans')packages.setAttribute('aria-current','page');nav.append(packages);
 root.replaceChildren(nav);return nav;
}
