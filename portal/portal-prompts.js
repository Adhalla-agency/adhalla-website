// Weekly prompts belong to the signed-in owner, independently of the open module.
// A worker browsing another business must never receive that business's questions.
import {firebaseConfig} from './firebase-config.js';
import {ensureExperience,clearExperience} from './experience.js?v=0.36';
import {createCampaignClient} from './campaigns-client.js?v=0.36';
import {questionsWorkflow} from './question-dialog.js?v=0.36';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const api=createCampaignClient(),root=document.createElement('div');root.hidden=true;document.body.append(root);
let epoch=0,workflow=null,timer=null,events=null,celebrationTimer=null,celebrationDialog=null;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),user=>{
 const capture=++epoch;workflow?.destroy();workflow=null;clearInterval(timer);clearTimeout(celebrationTimer);celebrationDialog?.remove();celebrationDialog=null;events?.abort();events=new AbortController();api.start(user);if(!user){clearExperience();return;}
 const base=user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
 // An admin browsing a different client's worker view must not see that client's popup.
 const staffView=new URLSearchParams(location.search).get('view')==='worker';
 async function checkIsland(){
  if(capture!==epoch||staffView)return;
  if(document.hidden){celebrationTimer=setTimeout(checkIsland,60000);return;}
  try{const value=await api.read('/workspaces/'+encodeURIComponent(user.uid)+'/voyage');
   if(capture!==epoch)return;
   if(!value.first_island){celebrationTimer=setTimeout(checkIsland,60000);return;}
   if(value.first_island.celebrated_at)return;
   if(document.querySelector('dialog[open]')){celebrationTimer=setTimeout(checkIsland,5000);return;}
   const css=document.createElement('link');css.rel='stylesheet';css.href='voyage.css?v=0.2';document.head.append(css);
   const dialog=document.createElement('dialog');celebrationDialog=dialog;dialog.className='voyage-celebration';dialog.setAttribute('aria-labelledby','firstIslandTitle');
   dialog.innerHTML='<div class="voyage-celebration-art" aria-hidden="true">⛵ 🏝️</div><p class="voyage-celebration-kicker">ESIMENE SAAR · 10%</p><h2 id="firstIslandTitle">Jõudsid esimesele saarele!</h2><p>Ettevõtte info ja esimesed andmeühendused on valmis. Nüüd saad tutvuda Loomise taseme võimalustega.</p><div class="voyage-celebration-actions"><a href="plans.html">Vaata pakette</a><form method="dialog"><button>Jätka teekonda</button></form></div>';
   document.body.append(dialog);
   const acknowledge=async()=>{try{await api.write('/workspaces/'+encodeURIComponent(user.uid)+'/voyage',{});}catch{}};
   dialog.querySelector('a').addEventListener('click',event=>{event.preventDefault();acknowledge().finally(()=>{if(capture===epoch)location.href='plans.html';});});
   dialog.addEventListener('close',()=>{if(capture===epoch)acknowledge();dialog.remove();celebrationDialog=null;},{once:true});
   dialog.showModal();
  }catch{if(capture===epoch)celebrationTimer=setTimeout(checkIsland,60000);}
 }
 celebrationTimer=setTimeout(checkIsland,1500);
 let reading=false;
 async function connect(){if(capture!==epoch||workflow||reading||document.hidden)return;reading=true;
  try{if(!await ensureExperience(user))return;if(capture!==epoch)return;const value=await api.read(base+'/weekly');if(capture!==epoch||!value.client_id)return;
   workflow=questionsWorkflow(root,api,base,value.client_id,{auto:true,controls:false});clearInterval(timer);
  }catch{/* An unpromoted workspace has no report access; retry after registration. */}finally{reading=false;}
 }
 connect();timer=setInterval(connect,60000);
 document.addEventListener('adhalla:experience',()=>{if(capture===epoch)setTimeout(connect,0);},{signal:events.signal});
});

