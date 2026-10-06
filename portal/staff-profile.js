import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient} from './campaigns-client.js?v=0.36';
import {ensureExperience} from './experience.js?v=0.36';
import {navigation} from './navigation.js?v=0.36';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const api=createCampaignClient(),$=id=>document.getElementById(id),node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};let epoch=0;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),async user=>{const capture=++epoch;api.start(user);$('profile').replaceChildren();if(!user)return;try{await ensureExperience(user);const cid=new URLSearchParams(location.search).get('client')||document.documentElement.dataset.ownClient;const result=await api.read('/worker/clients/'+cid+'/context');if(capture!==epoch)return;$('company').textContent=result.name+' · '+cid;navigation($('navigation'),{current:'profile',clientId:cid,worker:true});
 for(const[key,label]of [['name','Ettevõte'],['website','Veebileht'],['description','Ettevõttest'],['offering','Pakkumine'],['customer','Kliendid'],['objective','Eesmärk']])$('profile').append(node('h3',label),node('p',result.business[key]||'Täpsustamata'));
 $('status').textContent=result.profile?'Ettevõttel on kinnitatud kontekst.':'Ettevõtte info ootab kinnitamist.';
 if(document.documentElement.dataset.staffTools==='full'){
 const form=node('form','');form.className='staff-profile-fields';const inputs={};
 for(const[key,label]of [['name','Ettevõte'],['website','Veebileht'],['description','Ettevõttest'],['offering','Pakkumine'],['customer','Kliendid'],['objective','Eesmärk']]){const field=node('label',label),input=node('textarea','');input.value=result.business[key]||'';input.maxLength=2000;field.append(input);form.append(field);inputs[key]=input;}
 const save=node('button','Salvesta ettevõtteinfo muudatused');save.type='submit';form.append(node('p','Muudatus salvestatakse töötaja nimel. Kliendi varasem kinnitus säilib; muudetud info vajab kliendi kinnitust.'),save);$('profile').append(form);
 form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{const saved=await api.write('/worker/clients/'+cid+'/context',{base_version:result.version,business:{...result.business,...Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value.trim()]))}});result.version=saved.version;$('status').textContent='✓ Muudatused salvestatud. Kliendi kinnitus on järgmine samm.';}catch(e){$('status').textContent=e.message;}finally{save.disabled=false;}};
 }
 const link=node('a','Ava ettevõtte kogu teadmispagas');link.href='business.html?client='+cid+'&mode=admin&view=worker';$('profile').append(link);
 }catch(e){if(capture===epoch)$('status').textContent=e.message;}});
