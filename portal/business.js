import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient} from './campaigns-client.js?v=0.20';
import {weeklyView} from './weekly.js?v=0.21';
import {calendar,reportEvents} from './timeline.js?v=0.21';
import {questionsWorkflow} from './question-dialog.js?v=0.21';
import {navigation} from './navigation.js?v=0.21';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id),api=createCampaignClient(),views={weekly:weeklyView($('weekly'),api),monthly:weeklyView($('monthly'),api,{cadence:'monthly'})};
let epoch=0,base=null,questions=null,events=[],timeline=null;
const n=(t,s)=>{const e=document.createElement(t);e.textContent=s;return e;};
async function openReport(event){$('weekly').hidden=event.type!=='weekly';$('monthly').hidden=event.type!=='monthly';$('overviewStatus').textContent='Salvestatud '+(event.type==='monthly'?'kuuülevaade':'nädalaülevaade')+' · '+event.period.start+' – '+event.period.end;await views[event.type].load(event.run_id);}
function choices(date,list){$('selectedDay').textContent=date||'Viimased kokkuvõtted';$('dayEvents').replaceChildren();if(!list.length){$('dayEvents').append(n('p','Selle päeva kohta salvestatud aruannet pole. Vali kalendris märgiga päev.'));return;}for(const event of list){const b=n('button',event.label+' · '+event.period.start+' – '+event.period.end);b.className='quiet';b.onclick=()=>openReport(event);$('dayEvents').append(b);}if(date)openReport(list[0]);}
$('historyRange').onchange=()=>{const days=+$('historyRange').value,cutoff=days?Date.now()-days*86400000:0;const list=events.filter(e=>Date.parse(e.date)>=cutoff);timeline.update(list);choices(null,list.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6));};
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{
 const capture=++epoch;api.start(user);questions?.destroy();for(const view of Object.values(views))view.reset();$('business').hidden=true;$('gate').hidden=false;events=[];
 if(!user){$('gateMessage').textContent='Logi portaali kaudu sisse.';return;}
 const selected=new URLSearchParams(location.search).get('client'),worker=selected&&selected!=='0000'&&/^[0-9]{4}$/.test(selected);
 base=worker?'/worker/clients/'+selected:user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
 try{const [metrics,week,month]=await Promise.all([api.read(base+'/metrics'),api.read(base+'/weekly'),api.read(base+'/monthly')]);if(capture!==epoch)return;
  $('clientIdentity').textContent=(metrics.name||'Ettevõte')+' · '+metrics.client_id;navigation($('moduleNav'),{clientId:metrics.client_id,current:'business',worker:!!worker||user.email==='admin@adhalla.ee'});$('dataLink').href='data.html'+(worker?'?client='+selected+'&view=worker':'');
  for(const[k,view]of Object.entries(views)){view.setScope(base,metrics.client_id);view.render(k==='weekly'?week:month);}
  events=reportEvents(week.history,month.history);timeline=calendar($('calendar'),{events,onSelect:choices});choices(null,events.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6));
  $('weekly').hidden=!week.report&&!!month.report;$('monthly').hidden=!!week.report||!month.report;
  $('business').hidden=false;$('gate').hidden=true;questions=questionsWorkflow($('questionAction'),api,base,metrics.client_id,{auto:!worker});
  $('overviewStatus').textContent=week.report?'Viimane nädalaülevaade · '+new Date(week.report.generated_at).toLocaleDateString('et-EE'):'Esimene ülevaade ilmub pärast ühendatud andmete töötlemist.';
 }catch(e){if(capture===epoch)$('gateMessage').textContent=e.message;}
});
