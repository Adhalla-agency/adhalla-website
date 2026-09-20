const n=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
export function measurementChain(root,report){
 const section=n('section','');section.className='card';section.append(n('h2','Kas mõõtmise osad on omavahel seotud?'));root.append(section);const chain=report.measurement_chain;
 if(chain?.status!=='inspected'){section.append(n('p','Konversioonide seost pole veel värskelt kontrollitud. See ei takista kampaania kavandi koostamist.'));return;}
 if(!chain.chains?.length)section.append(n('p',chain.ads?.status==='available'?'Google Adsis ei leitud praegu lubatud konversioonitegevusi.':'Google Adsi konversiooniseadistus jäi kontrollimata.'));
 for(const item of chain.chains||[]){const detail=n('details','');detail.append(n('summary',item.label+' · '+(item.primary?'Peamine tulemus':'Lisamõõtmine')+' · '+item.category));detail.append(n('p','Google Ads: '+item.status+' · omistatud konversioone valitud perioodis: '+item.all_conversions));detail.append(n('p',item.bound_ga4_matches?'✓ Seotud selle kliendi GA4-ga · sündmus '+item.ga4_event:'○ Seost selle kliendi GA4-ga ei ole kinnitatud.'));
  if(item.ga4_observation)detail.append(n('p','GA4-s täheldatud sündmusi: '+item.ga4_observation.event_count+'. Need pole automaatselt samad inimesed või Google Adsi konversioonid.'));
  detail.append(n('p',item.gtm_published_event_configuration?'✓ Sama sündmusenimega seadistus on avaldatud GTM-is. Käivitumine ja õige sihtkoht vajavad eraldi kontrolli.':'○ Avaldatud GTM-ist ei ole selle sündmuse seadistust kinnitatud.'));section.append(detail);
 }
 section.append(n('p','Päris päringu või ostu läbimine, nõusolek ja sündmuse kohalejõudmine vajavad eraldi testi. Seadistuse olemasolu ei tähenda, et kogu teekond töötab.'));
}
