// Weekly prompts belong to the signed-in owner, independently of the open module.
// A worker browsing another business must never receive that business's questions.
import {firebaseConfig} from './firebase-config.js';
import {ensureExperience,clearExperience} from './experience.js?v=0.30';
import {createCampaignClient} from './campaigns-client.js?v=0.30';
import {questionsWorkflow} from './question-dialog.js?v=0.30';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const api=createCampaignClient(),root=document.createElement('div');root.hidden=true;document.body.append(root);
let epoch=0,workflow=null,timer=null,events=null;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),user=>{
 const capture=++epoch;workflow?.destroy();workflow=null;clearInterval(timer);events?.abort();events=new AbortController();clearExperience();api.start(user);if(!user)return;
 const base=user.email==='admin@adhalla.ee'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid);
 let reading=false;
 async function connect(){if(capture!==epoch||workflow||reading||document.hidden)return;reading=true;
  try{if(!await ensureExperience(user))return;if(capture!==epoch)return;const value=await api.read(base+'/weekly');if(capture!==epoch||!value.client_id)return;
   workflow=questionsWorkflow(root,api,base,value.client_id,{auto:true,controls:false});clearInterval(timer);
  }catch{/* An unpromoted workspace has no report access; retry after registration. */}finally{reading=false;}
 }
 connect();timer=setInterval(connect,60000);
 document.addEventListener('adhalla:experience',()=>{if(capture===epoch)setTimeout(connect,0);},{signal:events.signal});
});
