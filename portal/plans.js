import {navigation} from './navigation.js?v=0.41';
import {createCampaignClient} from './campaigns-client.js?v=0.36';
import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const query=new URLSearchParams(location.search);navigation(document.getElementById('navigation'),{current:'plans',clientId:query.get('client'),worker:query.get('view')==='worker'});
fetch('./plans.json',{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{for(const key of ['interpretation','automation']){const value=c.plans?.[key]?.monthly_eur;if(!Number.isFinite(value)||value<0)throw Error();document.getElementById(key+'Price').textContent='Tavahind '+new Intl.NumberFormat('et-EE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value)+' / kuu';}}).catch(()=>{for(const key of ['interpretation','automation'])document.getElementById(key+'Price').textContent='Hinnakirja laadimine ei õnnestunud.';});
const api=createCampaignClient();let epoch=0;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{
 const capture=++epoch;api.start(user);const status=document.getElementById('offerStatus');
 if(!user){status.textContent='Logi sisse, et näha oma teekonna seisu.';return;}
 try{const offer=await api.read('/workspaces/'+encodeURIComponent(user.uid)+'/commercial');if(capture!==epoch)return;
  status.textContent=offer.first_island_earned?'Oled jõudnud esimesele saarele! Veebiostu avamiseni jääb sinu saavutus alles.':'Täida ettevõtte info ning ühenda GA4 ja Google Ads või Meta, et jõuda esimesele saarele.';
 }catch{if(capture===epoch)status.textContent='Teekonna seisu ei saanud praegu kontrollida. Sinu senine ligipääs jääb alles.';}
});

