export const iso=date=>date.toISOString().slice(0,10);
export function reportEvents(weekly=[],monthly=[]){
 return [...weekly.map(r=>({...r,type:'weekly',date:iso(new Date(Date.parse(r.period.end+'T12:00:00Z')+86400000)),label:'Nädalaülevaade'})),
 ...monthly.map(r=>({...r,type:'monthly',date:r.period.end,label:'Kuuülevaade'}))].filter(r=>r.run_id&&/^\d{4}-\d{2}-\d{2}$/.test(r.date));
}
export function calendarCells(year,month){const first=new Date(Date.UTC(year,month,1));const offset=(first.getUTCDay()+6)%7;const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>iso(new Date(Date.UTC(year,month,i+1))))];}
export function calendar(root,{events=[],onSelect=()=>{},initial=new Date()}={}){
 let year=initial.getFullYear(),month=initial.getMonth(),selected=null;const n=(t,s)=>{const e=document.createElement(t);if(s)e.textContent=s;return e;};
 function render(){root.replaceChildren();const controls=n('div');controls.className='calendar-controls';const prev=n('button','‹'),next=n('button','›'),heading=n('h2',new Intl.DateTimeFormat('et-EE',{month:'long',year:'numeric'}).format(new Date(year,month,1))),years=n('select');prev.setAttribute('aria-label','Eelmine kuu');next.setAttribute('aria-label','Järgmine kuu');years.setAttribute('aria-label','Aasta');
  const earliest=Math.min(new Date().getFullYear()-5,...events.map(e=>Number(e.date.slice(0,4))));for(let y=earliest;y<=new Date().getFullYear()+1;y++){const o=n('option',String(y));o.value=y;years.append(o);}years.value=year;years.onchange=()=>{year=+years.value;render();};prev.onclick=()=>move(-1);next.onclick=()=>move(1);controls.append(prev,heading,years,next);root.append(controls);
  const grid=n('div');grid.className='calendar-grid';for(const day of ['E','T','K','N','R','L','P']){const e=n('div',day);e.className='calendar-weekday';grid.append(e);}
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Tallinn'}).format(new Date());
  for(const date of calendarCells(year,month)){const cell=n(date?'button':'div');cell.className='calendar-day'+(!date?' empty':'')+(date===today?' today':'')+(date===selected?' selected':'');if(date){cell.type='button';cell.append(n('span',String(Number(date.slice(-2)))));const list=events.filter(e=>e.date===date);cell.setAttribute('aria-label',date+(list.length?' · '+list.map(x=>x.label).join(', '):' · salvestatud aruannet pole'));for(const e of list){const marker=n('span',e.type==='monthly'?'● Kuu':'● Nädal');marker.title=e.label;marker.className='event-marker '+e.type;cell.append(marker);}cell.onclick=()=>{selected=date;render();onSelect(date,list);};}grid.append(cell);}root.append(grid);
  const legend=n('p','● Nädalaülevaade    ● Kuuülevaade · märk ilmub ainult salvestatud aruandele');legend.className='calendar-legend';root.append(legend);
 }
 function move(delta){const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();render();}
 render();return {update(next){events=next;render();}};
}
