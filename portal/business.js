import {measurementChain} from './measurement-chain.js?v=0.20';
import {firebaseConfig} from './firebase-config.js';
import {weeklyView} from './weekly.js?v=0.20';
import {createCampaignClient} from './campaigns-client.js?v=0.16';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id),api=createCampaignClient();
let base='/internal/clients/0000',route=base+'/metrics';
const weekly=weeklyView($('weekly'),api),monthly=weeklyView($('monthly'),api,{cadence:'monthly'});
let epoch=0,timer=null,current=null,submitting=false;
const node=(tag,text,cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const number=(v,currency)=>v===null||v===undefined?'—':new Intl.NumberFormat('et-EE',currency?{style:'currency',currency,maximumFractionDigits:2}:{maximumFractionDigits:2}).format(v);
const dates=p=>p.start+' – '+p.end;
function clear(){clearInterval(timer);timer=null;current=null;submitting=false;$('business').hidden=true;$('gate').hidden=false;$('metrics').replaceChildren();$('readStatus').textContent='';$('start').value='';$('end').value='';}
function render(data){current=data;$('clientIdentity').textContent=(data.name||'Ettevõte')+' · '+data.client_id;$('clientKind').textContent=data.client_id==='0000'?'KAITSTUD SISEKLIENT':'ETTEVÕTTE ÜLEVAADE';$('campaignLink').hidden=false;$('campaignLink').href='campaigns.html?client='+data.client_id+(base.startsWith('/worker/')?'&view=worker':'')+'&release=0.20';const job=data.job,pending=job&&['queued','running'].includes(job.status);$('loadMetrics').disabled=submitting||pending||data.sources_ready===false;
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
 measurementChain(root,report);
 const gtm=node('section','','card'),inspection=report.gtm;gtm.append(node('h2','Google Tag Manager'));root.append(gtm);
 if(inspection?.status!=='available'){gtm.append(node('p',inspection?.status==='not_authorized'?'○ GTM pole selle kliendiga lugemiseks ühendatud.':'GTM seadistust ei õnnestunud värskelt kontrollida. See ei tähenda, et märgised puuduvad.','source-note'));return;}
 gtm.append(node('p','✓ Konteineri seadistus kontrollitud · '+new Date(inspection.inspected_at).toLocaleString('et-EE'),'source-note'),node('p','See on kontrollihetke seadistus, mitte valitud kuupäevade ajalooline seis.','muted'));
 for(const [label,config] of [['Avaldatud konteineri versioon',inspection.live_configuration],...inspection.workspaces.map((w,i)=>['Tööruum '+(i+1)+' · avaldamata seadistus',w])]){
  const detail=node('details','');detail.append(node('summary',label));gtm.append(detail);
  if(config.status==='unavailable'){detail.append(node('p','Avaldatud versiooni ei saanud lugeda. Tööruumi sisu ei käsitleta avaldatuna.'));continue;}
  detail.append(node('p',`${config.tag_count} märgist · ${config.trigger_count} käivitajat · ${config.variable_count} muutujat`));
  for(const [heading,types] of [['Märgised',config.tag_types],['Käivitajad',config.trigger_types],['Muutujad',config.variable_types]])detail.append(node('p',heading+': '+Object.entries(types||{}).map(([kind,count])=>kind+' ('+count+')').join(', ')));
  detail.append(node('p','Lubatud generate_lead märgiseid seadistuses: '+config.active_generate_lead_tags+'. See ei tõenda päringu kohalejõudmist.'));
  if(config.unpublished_changes!==undefined)detail.append(node('p','Avaldamata muudatusi: '+config.unpublished_changes+' · ühendamiskonflikte: '+config.merge_conflicts));
  if(config.unresolved_trigger_references)detail.append(node('p','Kontrollimist vajavaid käivitajaviiteid: '+config.unresolved_trigger_references,'source-warning'));
 }
 gtm.append(node('p','Veel kontrollimata: märgiste käivitumine veebilehel, nõusoleku toimimine, GA4 sihtkoha vastavus ning päris päringu või ostu mõõtmine. GTM-i lugemine ei muuda ega avalda midagi.','source-note'));
}
async function refresh(){const capture=epoch;try{const data=await api.read(route);if(capture!==epoch)return;$('business').hidden=false;$('gate').hidden=true;if(!$('start').value){const p=data.report?.period||data.default_period;if(p){$('start').value=p.start;$('end').value=p.end;}}render(data);}catch(e){if(capture!==epoch)return;if([401,403].includes(e.status)){clear();$('gateMessage').textContent='Selle ettevõtte vaatamiseks puudub ligipääs.';}else $('readStatus').textContent=e.message;}}
$('dates').onsubmit=async e=>{e.preventDefault();if(submitting)return;const capture=epoch;submitting=true;$('loadMetrics').disabled=true;$('readStatus').textContent='Saadan andmepäringu…';try{const job=await api.write(route,{client_id:current.client_id,start:$('start').value,end:$('end').value});if(capture!==epoch)return;submitting=false;render({...current,job});await refresh();}catch(error){if(capture!==epoch)return;submitting=false;$('loadMetrics').disabled=false;$('readStatus').textContent=error.code==='metrics_limit'?'Tänane 12 andmelugemise piir on täis. Jätka homme.':error.code==='metrics_pending'?'Üks andmelugemine on juba töös. Oota selle lõppu.':error.message;}};
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{
 const capture=++epoch;api.start(user);clear();weekly.reset();monthly.reset();
 if(!user){$('gateMessage').textContent='Logi Google kontoga portaali kaudu sisse.';return;}
 const selected=new URLSearchParams(location.search).get('client');
 base=selected&&/^[0-9]{4}$/.test(selected)&&selected!=='0000'?'/worker/clients/'+selected:user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
 route=base+'/metrics';await refresh();if(capture!==epoch||!current)return;
 weekly.setScope(base,current.client_id);weekly.load();monthly.setScope(base,current.client_id);monthly.load();
});
