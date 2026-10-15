import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient} from './campaigns-client.js?v=0.40';
import {navigation} from './navigation.js?v=0.41';
import {ensureExperience} from './experience.js?v=0.36';
import {diagnosticsView} from './diagnostics-view.js?v=0.41';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const api=createCampaignClient();let workflow=null,epoch=0;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{
 const current=++epoch;workflow?.destroy();workflow=null;api.start(user);
 document.getElementById('diagnosticConversation').replaceChildren();document.getElementById('diagnosticFindings').replaceChildren();document.getElementById('diagnosticQuestion').value='';
 if(!user){document.getElementById('diagnosticStatus').textContent='Logi portaali kaudu sisse.';return;}
 try{if(!await ensureExperience(user)||current!==epoch)return;
  const q=new URLSearchParams(location.search),selected=q.get('client');
  const base=q.get('view')==='worker'&&/^[0-9]{4}$/.test(selected||'')?'/worker/clients/'+selected:user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
  navigation(document.getElementById('navigation'),{current:'diagnostics',clientId:selected,worker:base.startsWith('/worker/')});
  workflow=diagnosticsView({api,base});
 }catch(e){if(current===epoch)document.getElementById('diagnosticStatus').textContent=e.message;}
});
