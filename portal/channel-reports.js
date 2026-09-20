import {reportLink,renderReport} from './report-content.js?v=0.23';
import {reportEvents,calendar} from './timeline.js?v=0.23';
const n=(t,s)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=s;return e;};
const labels={impressions:'Näitamised',clicks:'Klikid',cost:'Reklaamikulu',conversions:'Konversioonid',conversion_value:'Omistatud konversiooniväärtus'};
export async function channelReports(root,api,base){
 const epoch=(root.dataset.epoch=String(Number(root.dataset.epoch||0)+1));root.replaceChildren(n('h2','Google Ads · raportid'),n('p','Avan salvestatud aruandeid…'));
 try{const [week,month]=await Promise.all([api.read(base+'/weekly'),api.read(base+'/monthly')]);if(root.dataset.epoch!==epoch)return;
  const events=reportEvents(week.history,month.history).sort((a,b)=>b.date.localeCompare(a.date));root.replaceChildren(n('h2','Google Ads · raportid'));
  const label=n('label','Salvestatud periood '),select=n('select');select.setAttribute('aria-label','Google Adsi aruande periood');for(const e of events){const option=n('option',(e.type==='monthly'?'Monthly Review · ':'Nädal · ')+e.period.start+' – '+e.period.end);option.value=e.type+'/'+e.run_id;select.append(option);}label.append(select);root.append(label);
  const history=n('details');history.className='advanced-section';history.append(n('summary','Aruannete kalender'));const cal=n('div');history.append(cal);root.append(history);const body=n('div');root.append(body);let read=0;calendar(cal,{events,onSelect:(date,list)=>{if(list.length){select.value=list[0].type+'/'+list[0].run_id;select.onchange();}}});
  function render(report){body.replaceChildren();if(!report){body.append(n('p','Salvestatud Google Adsi aruannet veel pole.'));return;}
   body.append(n('h3',(report.cadence==='monthly'?'Monthly Review · ':'')+report.period.start+' – '+report.period.end),n('p','Google Adsi väljavõte salvestatud ettevõtte ülevaatest. Kogu ettevõtte hinnang asub Äri ülevaates.'));
   const facts=report.evidence?.observed_facts||[],rows=facts.filter(f=>f.id.startsWith('google_ads.current.')&&labels[f.id.split('.').at(-1)]);
   const grid=n('div');grid.className='metric-grid';for(const fact of rows){const tile=n('article');tile.className='metric-tile';tile.append(n('span',labels[fact.id.split('.').at(-1)]),n('strong',new Intl.NumberFormat('et-EE',{maximumFractionDigits:2}).format(fact.value)));grid.append(tile);}body.append(grid);if(!rows.length)body.append(n('p','Google Adsi mõõdikuid selles aruandes ei kinnitatud. Puuduv info ei tähenda nulli.'));
   body.append(n('p','Konversioonid ja nende omistatud väärtus ei kinnita iseenesest müüki ega kasumit. Arvud säilitavad aruandeaegse seisu.'));
   const prose=n('section');renderReport(prose,report,{cadence:select.value.split('/')[0],source:'google_ads'});body.append(prose);const link=n('a','Ava selle perioodi mõõdikud ja raport →');link.href=reportLink(report,select.value.split('/')[0],{clientId:base.split('/').at(-1),worker:base.startsWith('/worker/'),source:'google_ads'});body.append(link);const detail=n('details');detail.className='advanced-section';detail.append(n('summary','Allikad ja piirangud'));for(const f of facts.filter(f=>f.id.startsWith('google_ads.')))detail.append(n('p',f.statement+': '+String(f.value)));body.append(detail);
  }
  select.onchange=async()=>{const current=++read;try{const value=await api.read(base+'/'+select.value);if(root.dataset.epoch===epoch&&current===read)render(value.report);}catch(e){if(current===read)body.replaceChildren(n('p',e.message));}};
  const backlog=n('div');backlog.className='report-backlog';label.after(backlog);
  for(const e of events){const button=n('button',(e.type==='monthly'?'Kuuülevaade · ':'Nädalaülevaade · ')+e.period.start+' – '+e.period.end);button.type='button';button.onclick=()=>{select.value=e.type+'/'+e.run_id;select.onchange();};backlog.append(button);}
  const candidates=[{report:week.report,cadence:'weekly'},{report:month.report,cadence:'monthly'}].filter(x=>x.report).sort((a,b)=>b.report.period.end.localeCompare(a.report.period.end));
  const latest=candidates[0];select.value=latest?latest.cadence+'/'+latest.report.run_id:'';render(latest?.report);
 }catch(e){if(root.dataset.epoch===epoch)root.replaceChildren(n('h2','Google Ads · raportid'),n('p',e.message));}
}
