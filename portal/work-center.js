import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient,states} from './campaigns-client.js?v=0.36';
import {ensureExperience} from './experience.js?v=0.36';
import {navigation} from './navigation.js?v=0.36';
import {ticketQueue} from './ticket-queue.js?v=0.36';
import {workerReviews} from './campaign-review.js?v=0.36';
import {connectionSupport} from './connection-support.js?v=0.36';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id),node=(tag,text='')=>{const el=document.createElement(tag);el.textContent=text;return el;},api=createCampaignClient();
const params=new URLSearchParams(location.search),category=params.get('category')==='support'?'support':'work';
let clientId=params.get('client'),folder='active',rows=[],epoch=0;
$('title').textContent=category==='support'?'Kasutajatugi':'Töökeskus';
function campaignUrl(row){const q=new URLSearchParams({client:row.client_id,view:'worker',mode:'admin',technical:'1',campaign:row.campaign_id||'campaign-01'});if(row.request_id)q.set('ticket',row.request_id);return 'campaigns.html?'+q;}
function visible(row){return row.client_id===clientId&&row.category===category&&(folder==='archive'?row.archived:!row.archived&&(folder==='done'?row.done:!row.done));}
async function load(){const capture=epoch;$('status').textContent='Laadin tööde seisu…';try{
 const [result,clients]=await Promise.all([api.read('/worker/work-center'),api.read('/worker/clients')]);if(capture!==epoch)return;rows=result.tickets;
 const counts=id=>rows.filter(r=>r.client_id===id&&!r.archived&&!r.done),rank=id=>counts(id).reduce((score,r)=>score+[1000,100,10,1][r.priority],0);
 const sorted=[...clients].sort((a,b)=>rank(b.client_id)-rank(a.client_id)||counts(b.client_id).length-counts(a.client_id).length||a.name.localeCompare(b.name));
 if(!sorted.some(c=>c.client_id===clientId))clientId=sorted[0]?.client_id;
 $('clients').replaceChildren();for(const c of sorted){const o=node('option',c.name+' · '+c.client_id+' · '+counts(c.client_id).length+' tööd');o.value=c.client_id;$('clients').append(o);}$('clients').value=clientId||'';
 if(clientId)document.documentElement.dataset.selectedClient=clientId;
 navigation($('navigation'),{current:category==='support'?'support':'work',clientId,worker:true});
 await render();if(capture===epoch)$('status').textContent='✓ Tööseis uuendatud · '+new Date().toLocaleTimeString('et-EE');
 }catch(e){if(capture===epoch)$('status').textContent=e.message;}}
async function render(){
 document.querySelectorAll('[data-folder]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.folder===folder)));
 const queue=ticketQueue($('tickets'));queue.reload=load;$('support').replaceChildren();let count=0;
 const add=(row,card)=>{count++;const wrapper=node('article');wrapper.className='work-item';wrapper.append(card);const archive=node('button',row.archived?'Taasta nimekirja':'Arhiveeri');archive.type='button';archive.className='quiet';archive.onclick=async()=>{archive.disabled=true;try{await api.write('/worker/work-center',{key:row.key,revision:row.revision,archived:!row.archived});await load();}catch(e){$('status').textContent=e.message;archive.disabled=false;}};wrapper.append(archive);queue.add({...row,financial_approval_required:row.priority===0},wrapper);};
 if(category==='work')for(const row of rows.filter(visible)){const a=node('a',(row.campaign_id||'Kampaania')+' · '+(states[row.status]||row.status));a.href=campaignUrl(row);a.className='work-open';add(row,a);}
 else{
  const filterQueue={reload:load,add(record,card){const row=rows.find(r=>r.category==='support'&&(record.request_id?r.request_id===record.request_id:r.source===record.source&&r.workspace_id===record.workspace_id));if(row&&visible(row))add(row,card);}};
  await workerReviews($('support'),api,id=>{const row=rows.find(r=>r.request_id===id);location.href=campaignUrl(row||{client_id:clientId,request_id:id});},filterQueue);
  await connectionSupport($('support'),api,{queue:filterQueue}).load();
 }
 if(!count)$('tickets').append(node('p','Selles kaustas pole töid.'));
}
$('clients').onchange=()=>{const q=new URLSearchParams(location.search);q.set('client',$('clients').value);q.set('mode','admin');q.set('view','worker');q.set('technical','0');location.href='work-center.html?'+q;};
document.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{folder=b.dataset.folder;render().catch(e=>$('status').textContent=e.message);});$('refresh').onclick=load;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{epoch++;api.start(user);rows=[];$('tickets').replaceChildren();if(!user){$('status').textContent='Logi Adhalla töötaja kontoga sisse.';return;}await ensureExperience(user);await load();});
