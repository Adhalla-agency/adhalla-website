// Saved reports only. Opening a report never queues model work or data retrieval.
import './dialogs.js?v=0.30';
export const sources={all:'Ettevõte',google_ads:'Google Ads',ga4:'Google Analytics',gtm:'Google Tag Manager',meta:'Meta',linkedin:'LinkedIn',tiktok:'TikTok'};
const n=(t,s)=>{const e=document.createElement(t);if(s!==undefined)e.textContent=s;return e;};
export function reportLink(report,cadence,{clientId,worker=false,source='all'}={}){
 const q=new URLSearchParams({source,cadence,run:report.run_id,start:report.period.start,end:report.period.end});
 if(worker&&clientId){q.set('client',clientId);q.set('view','worker');}
 return 'data.html?'+q;
}
export function renderReport(root,report,{cadence='weekly',source='all',compact=false}={}){
 root.replaceChildren();root.classList.add('report-prose');
 if(!report){root.append(n('h2','Salvestatud raport'),n('p','Selle perioodi kohta salvestatud raportit veel pole. Puuduv raport ei tähenda, et tulemus oleks null.'));return;}
 root.append(n('h2',(cadence==='monthly'?'Kuuülevaade':'Nädalaülevaade')+' · '+report.period.start+' – '+report.period.end));
 root.append(n('p','Koostatud '+new Date(report.generated_at).toLocaleString('et-EE')+' · '+sources[source]));
 const evidence=report.evidence||{},items=[...(evidence.observed_facts||[]),...(evidence.configuration_facts||[]),...(evidence.missing_information||[]),...(evidence.cautions||[])];
 const related=item=>source==='all'||(item.evidence_refs||[]).some(ref=>{
  const id=ref.slice(ref.indexOf(':')+1),fact=items.find(v=>v.id===id);
  return id.startsWith(source+'.')||fact?.source===source||fact?.source_system===source;
 });
 const insights=(report.interpretations||[]).filter(related),recommendations=(report.recommendations||[]).filter(related).sort((a,b)=>a.priority-b.priority);
 if(source!=='all')root.append(n('p','Selle allikaga tõendatult seotud väljavõte ettevõtte raportist. Ühist hinnangut vaata valikust „Ettevõte”.'));
 if(!insights.length&&!recommendations.length)root.append(n('p','Selles raportis ei ole valitud allika kohta eraldi tõendatud järeldusi.'));
 root.append(n('h3','Olulisemad tähelepanekud'));
 for(const item of compact?insights.slice(0,3):insights)root.append(n('p',item.text));
 if(recommendations.length)root.append(n('h3','Järgmised sammud'));
 for(const item of compact?recommendations.slice(0,3):recommendations)root.append(n('h4',item.priority+'. '+item.title),n('p',item.rationale));
 if(!compact){const gaps=n('details');gaps.append(n('summary','Piirangud ja teadmata asjaolud'));for(const item of [...(report.missing_information||[]),...(evidence.cautions||[])])gaps.append(n('p',item.label||item.statement));root.append(gaps);}
 root.append(n('p','See on salvestatud AI hinnang. Soovitused ei käivita ega muuda reklaame.'));
}
export function reportDialog(api,base,event,options){
 const dialog=n('dialog');dialog.className='product-modal';dialog.setAttribute('aria-label','Salvestatud raport');
 const top=n('div');top.className='modal-top';const close=n('button','Sulge');close.onclick=()=>dialog.close();top.append(n('h2','Raporti lühikokkuvõte'),close);const body=n('div');body.append(n('p','Avan salvestatud raportit…'));dialog.append(top,body);document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 api.read(base+'/'+event.type+'/'+encodeURIComponent(event.run_id)).then(value=>{if(!dialog.isConnected)return;renderReport(body,value.report,{cadence:event.type,compact:true,source:options.source||'all'});if(value.report){const link=n('a','Vaata mõõdikuid ja kogu raportit →');link.href=reportLink(value.report,event.type,options);link.className='report-detail-link';body.append(link);}}).catch(e=>{if(dialog.isConnected)body.replaceChildren(n('p',e.message));});
 return dialog;
}
