import {firebaseConfig} from './firebase-config.js';
import {weeklyView} from './weekly.js?v=0.17';
import {createCampaignClient} from './campaigns-client.js?v=0.16';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id),api=createCampaignClient();
let base='/internal/clients/0000',route=base+'/metrics';
const weekly=weeklyView($('weekly'),api);
let epoch=0,timer=null,current=null,submitting=false;
const node=(tag,text,cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const number=(v,currency)=>v===null||v===undefined?'—':new Intl.NumberFormat('et-EE',currency?{style:'currency',currency,maximumFractionDigits:2}:{maximumFractionDigits:2}).format(v);
const dates=p=>p.start+' – '+p.end;
function clear(){clearInterval(timer);timer=null;current=null;submitting=false;$('business').hidden=true;$('gate').hidden=false;$('metrics').replaceChildren();$('readStatus').textContent='';$('start').value='';$('end').value='';}
function render(data){current=data;$('clientIdentity').textContent=(data.name||'Ettevõte')+' · '+data.client_id;$('clientKind').textContent=data.client_id==='0000'?'KAITSTUD SISEKLIENT':'ETTEVÕTTE ÜLEVAADE';$('campaignLink').hidden=data.client_id!=='0000';const job=data.job,pending=job&&['queued','running'].includes(job.status);$('loadMetrics').disabled=submitting||pending||data.sources_ready===false;
 $('readStatus').textContent=pending?(job.status==='running'?'Loen Google’i andmeid…':'Andmelugemine on järjekorras. Tulemus ilmub siia tavaliselt kuni 5 minuti jooksul.'):(job?.status==='failed'?'Andmelugemine ei õnnestunud. Varasemad andmed jäävad nähtavale; proovi uuesti.':data.report?'Andmed loetud. Perioodi muutmine ei muuda reklaame.':'Vali periood ja vajuta „Näita perioodi”.');
 if(data.sources_ready===false)$('readStatus').textContent='Adhalla peab esmalt kontrollima ja ühendama sinu ettevõtte andmeallika. Seejärel saad siit valida perioodi.';
 if(!timer&&pending)timer=setInterval(()=>{if(!document.hidden)refresh();},15000);if(timer&&!pending){clearInterval(timer);timer=null;}
 const report=data.report,root=$('metrics');root.replaceChildren();if(!report){root.append(node('p','Selle ettevõtte mõõdikuid pole veel loetud.'));return;}
 root.append(node('h2','Valitud periood'),node('p',dates(report.period)+' · võrdlus '+report.period.comparison_start+' – '+report.period.comparison_end,'report-dates'),node('p','Andmed loetud '+new Date(report.generated_at).toLocaleString('et-EE')+'.','muted'));
 for(const [key,title,fields] of [['google_ads','Google Ads',[['impressions','Näitamised'],['clicks','Klikid'],['cost','Reklaamikulu',true],['conversions','Konversioonid'],['conversion_value','Konversiooniväärtus',true]]],['ga4','Google Analytics',[['activeUsers','Aktiivsed kasutajad'],['sessions','Seansid'],['engagedSessions','Kaasatud seansid'],['keyEvents','Võtmesündmused'],['totalRevenue','Mõõdetud tulu',true]]]]){
  const source=report.sources[key],section=node('section','', 'card');section.append(node('h2',title));root.append(section);
  if(!source||source.status!=='available'){section.append(node('p',source?.status==='not_authorized'?'Allikale pole lubatud ligipääsu.':'Allika andmed ei ole praegu saadaval. Puuduv tulemus ei tähenda nulli.','source-note source-warning'));continue;}
  const a=source.current,b=source.previous,currency=a.currency||source.currency,previousCurrency=b.currency||source.currency;
  section.append(node('p','Allika ajavöönd: '+(a.timezone||source.timezone),'muted'));
  const limited=a.status==='limited'||b.status==='limited'||!a.period_complete||!b.period_complete;
  if(limited)section.append(node('p','Periood või andmete täielikkus on piiratud. Nende arvude põhjal ei kuvata kindlat muutuse hinnangut.','source-note source-warning'));
  if((key==='google_ads'?a.metrics?.clicks:a.metrics?.activeUsers)<30)section.append(node('p','Andmemaht on väike. Suur protsentuaalne muutus ei tõenda veel äri kasvu ega reklaami tulemuslikkust.','source-note'));
  const grid=node('div','','metric-grid');section.append(grid);
  for(const [field,label,money] of fields){const value=a.metrics?.[field],old=b.metrics?.[field],tile=node('article','','metric-tile');tile.append(node('span',label),node('strong',number(value,money?currency:null)),node('small','Eelmine periood: '+number(old,money?previousCurrency:null)));
   if(!limited&&value!=null&&old!=null&&old!==0&&(!money||currency===previousCurrency)){const change=(value-old)/Math.abs(old)*100;tile.append(node('small',(change>0?'+':'')+number(change)+'% võrreldes eelmise perioodiga'));}
   else if(!limited&&old===0)tile.append(node('small','Eelmine väärtus oli 0; protsentuaalset muutust ei arvutata.'));grid.append(tile);}
  for(const message of key==='google_ads'?['Konversioon ei võrdu automaatselt müügiga. Tulemus sõltub konto mõõtmise ja omistamise seadistusest.']:['Võtmesündmused on GA4-s määratud tegevused. Need ei tähenda automaatselt kinnitatud müüke või päringuid.','GA4 tulu ja Google Adsi konversiooniväärtust ei liideta kokku.'])section.append(node('p',message,'source-note'));
 }
 const gtm=node('section','','card');gtm.append(node('h2','Google Tag Manager'),node('p','Värske GTM seadistuse kontroll pole selles ülevaates veel saadaval. GTM on mõõtmise seadistus, mitte eraldi külastuste või müükide loendur.','source-note'));root.append(gtm);
}
async function refresh(){const capture=epoch;try{const data=await api.read(route);if(capture!==epoch)return;$('business').hidden=false;$('gate').hidden=true;if(!$('start').value){const p=data.report?.period||data.default_period;if(p){$('start').value=p.start;$('end').value=p.end;}}render(data);}catch(e){if(capture!==epoch)return;if([401,403].includes(e.status)){clear();$('gateMessage').textContent='Selle ettevõtte vaatamiseks puudub ligipääs.';}else $('readStatus').textContent=e.message;}}
$('dates').onsubmit=async e=>{e.preventDefault();if(submitting)return;const capture=epoch;submitting=true;$('loadMetrics').disabled=true;$('readStatus').textContent='Saadan andmepäringu…';try{const job=await api.write(route,{client_id:current.client_id,start:$('start').value,end:$('end').value});if(capture!==epoch)return;submitting=false;render({...current,job});await refresh();}catch(error){if(capture!==epoch)return;submitting=false;$('loadMetrics').disabled=false;$('readStatus').textContent=error.code==='metrics_limit'?'Tänane 12 andmelugemise piir on täis. Jätka homme.':error.code==='metrics_pending'?'Üks andmelugemine on juba töös. Oota selle lõppu.':error.message;}};
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{
 const capture=++epoch;api.start(user);clear();weekly.reset();
 if(!user){$('gateMessage').textContent='Logi Google kontoga portaali kaudu sisse.';return;}
 const selected=new URLSearchParams(location.search).get('client');
 base=selected&&/^[0-9]{4}$/.test(selected)&&selected!=='0000'?'/worker/clients/'+selected:user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
 route=base+'/metrics';await refresh();if(capture!==epoch||!current)return;
 weekly.setScope(base,current.client_id);weekly.load();
});
