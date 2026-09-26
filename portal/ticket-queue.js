const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
export function ticketState(row){
 if(['cancelled','canceled','deleted','rejected','declined','superseded'].includes(row.status))return 'cancelled';
 if(['failed','limited','awaiting_input','reconciliation_required','blocked'].includes(row.status))return 'review';
 if(['approved','generating','awaiting_action','creating_paused','created_paused','completed','resolved','content_confirmed'].includes(row.status))return 'approved';
 return 'review';
}
export function ticketPriority(row){
 // Only structured records count; client prose and suggested ad budgets are not payments.
 if(row.payment?.status==='paid'||row.payment_status==='paid'||row.financial_approval_required===true||['activate_campaign','adjust_budget'].includes(row.action?.action))return 'top';
 if(row.source||['binding','connection','connection_help','measurement_setup','google_ads_campaign'].includes(row.kind)||['failed','blocked','reconciliation_required'].includes(row.status))return 'important';
 if(['campaign_review','campaign_consultation','campaign_content_confirmation','campaign_help'].includes(row.kind))return 'medium';
 return 'small';
}
export function ticketQueue(root){
 root.replaceChildren();const groups={};
 for(const[id,title,note]of [['top','Top priority','Kinnitatud makse või eraldi rahalise otsusega tööd.'],['important','Olulised','Ühendused, konto töövalmidus, mõõtmine ja kampaaniate loomine.'],['medium','Keskmiselt olulised','Sisuline ülevaatus, konsultatsioonid ja kliendi abipalved.'],['small','Nipetnäpet','Muud täiendused ja väiksemad järeltegevused.']]){
  const box=node('details',''),heading=node('summary',title+' · 0'),items=node('div','');box.className='priority-group';box.dataset.priority=id;box.open=['top','important'].includes(id);box.append(heading,node('p',note),items);root.append(box);groups[id]={box,heading,items,title,count:0};
 }
 return {add(row,card){const g=groups[ticketPriority(row)];g.count++;g.heading.textContent=g.title+' · '+g.count;card.classList.add('ticket-card','ticket-'+ticketState(row));card.dataset.ticketState=ticketState(row);g.items.append(card);},reload:null};
}
