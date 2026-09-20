import {questionsWorkflow} from './question-dialog.js?v=0.25.1';
import {createCampaignClient} from './campaigns-client.js?v=0.25.1';
import {firebaseConfig} from './firebase-config.js';
import {confirmationState,matchesSavedProfile,detailLists,emptyDetails,discoveryText} from './business-profile-client.js?v=0.25.1';
import {renderKnowledge,knowledgePending} from './company-knowledge.js?v=0.25.1';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore, doc, onSnapshot, setDoc, updateDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = id => document.getElementById(id);
const auth = getAuth(initializeApp(firebaseConfig));
const database = getFirestore(auth.app);
const fields = ['name','website','description','offering','customer','objective'];
let registered=false,registering=false,permanentId=null,questionsUI=null;const questionApi=createCampaignClient();const questionRoot=document.createElement('div');questionRoot.className='head-actions';document.querySelector('.workspace-head').append(questionRoot);
let user = null, savedWorkspace = null, unsubscribe = null, epoch = 0, canSave = false, dirty = false;
let businessConfirmation=null,confirmationBusy=false,confirmationEpoch=0;
let detailsDirty=false,discoveryJob=null,discoveryBusy=false,discoveryEpoch=0,discoveryError='',formRevision=0;
function readDetails(){return {...Object.fromEntries(detailLists.map(key=>[key,$('detail_'+key).value.split('\n').map(v=>v.trim()).filter(Boolean)])),logo_url:$('detail_logo_url').value.trim(),phone:$('detail_phone').value.trim(),phone_country:$('detail_phone_country').value.trim().toUpperCase(),phone_opt_in:$('detail_phone_opt_in').checked};}
function populateDetails(value){for(const key of detailLists)$('detail_'+key).value=(value[key]||[]).join('\n');$('detail_logo_url').value=value.logo_url||'';$('detail_phone').value=value.phone||'';$('detail_phone_country').value=value.phone_country||'';$('detail_phone_opt_in').checked=value.phone_opt_in===true;}
function sameDetails(left,right){return [...detailLists,'logo_url','phone','phone_opt_in'].every(key=>JSON.stringify(left[key])===JSON.stringify(right[key]))&&(left.phone_country||'')===(right.phone_country||'');}
function renderDiscovery(){
 $('discoveryStatus').textContent=discoveryBusy?'Kontrollin veebilehe uuringut…':discoveryError||discoveryText(discoveryJob);
 $('generateBusiness').disabled=!user||!$('name').value.trim()||!$('website').value.trim()||discoveryBusy||['queued','running','limited'].includes(discoveryJob?.status);
 $('applyBusinessCandidate').hidden=discoveryJob?.status!=='completed';
 $('discoverySources').textContent=discoveryJob?.candidate?.source_urls?'Loetud lehed: '+discoveryJob.candidate.source_urls.join(' · '):'';
}
async function discoveryRequest(body){
 const owner=user,captured=epoch,seq=++discoveryEpoch;if(!owner)return;
 const token=await owner.getIdToken(true);if(captured!==epoch)return;
 const response=await fetch('https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1/workspaces/'+encodeURIComponent(owner.uid)+'/business_discovery',{
  method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',redirect:'error',cache:'no-store'});
 if(!response.ok)throw Error();const {data}=await response.json();if(captured!==epoch||seq!==discoveryEpoch)return;
 discoveryJob=data;discoveryError='';renderDiscovery();
}
$('generateBusiness').onclick=async()=>{
 if($('generateBusiness').disabled)return;const captured=epoch;if(dirty||!savedWorkspace){await saveWorkspace();if(captured!==epoch||dirty||!savedWorkspace)return;}await refreshConfirmation();if(!businessConfirmation?.can_confirm)return;discoveryBusy=true;discoveryError='';renderDiscovery();
 try{await discoveryRequest({request_id:crypto.randomUUID(),draft_digest:businessConfirmation.draft_digest});}
 catch{if(captured===epoch)discoveryError='Uuringut ei saanud alustada. Kontrolli salvestatud nime ja veebilehte ning proovi uuesti.';}
 finally{if(captured===epoch){discoveryBusy=false;renderDiscovery();}}
};
$('applyBusinessCandidate').onclick=()=>{
 if(discoveryJob?.status!=='completed'||!discoveryJob.candidate)return;
 for(const key of fields)$(key).value=discoveryJob.candidate.business[key]||'';
 populateDetails(discoveryJob.candidate.details);dirty=true;detailsDirty=true;++formRevision;renderConfirmation();
 message('Veebist leitud ettepanekud on vormis. Vaata need üle, paranda ja salvesta enne kinnitamist.');
};
setInterval(()=>{if(user&&savedWorkspace&&!document.hidden&&['queued','running','limited'].includes(discoveryJob?.status))discoveryRequest().catch(()=>{});},30000);
function message(text) { $('message').textContent = text; }
function currentBusinessValues(){
 const values=Object.fromEntries(fields.map(key=>[key,$(key).value.trim()]));
 if(values.website&&!/^https?:\/\//i.test(values.website))values.website='https://'+values.website;
 return values;
}
function renderConfirmation(){
 const changed=dirty||!!(businessConfirmation?.draft&&!matchesSavedProfile(businessConfirmation,currentBusinessValues()));
 const view=businessConfirmation?{...businessConfirmation,details_changed:!sameDetails(readDetails(),businessConfirmation.confirmed?.details||emptyDetails())}:null;
 const state=confirmationState(view,changed,confirmationBusy);
 $('confirmBusiness').disabled=state.disabled||!user||!savedWorkspace;
 $('businessConfirmationStatus').textContent=state.text;
 renderDiscovery();renderChannelGate();
}
async function profileRequest(owner,body,action='confirm'){
 const token=await owner.getIdToken(true);
 const response=await fetch('https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1/workspaces/'+encodeURIComponent(owner.uid)+'/business_profile'+(body?'/'+action:''),{
  method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',redirect:'error',cache:'no-store'});
 if(!response.ok){const error=Error('Ettevõtteinfo kinnitamine ei õnnestunud.');error.status=response.status;throw error;}
 return (await response.json()).data;
}
async function refreshConfirmation(){
 if(!user||!savedWorkspace||confirmationBusy)return;
 const captured=epoch,version=++confirmationEpoch,owner=user;
 try{const view=await profileRequest(owner);if(captured!==epoch||version!==confirmationEpoch)return;businessConfirmation=view;refreshKnowledge();if(!detailsDirty)populateDetails(view.draft_details?.details||view.confirmed?.details||emptyDetails());renderConfirmation();}
 catch{if(captured===epoch&&version===confirmationEpoch){businessConfirmation=null;renderConfirmation();$('businessConfirmationStatus').textContent='Kinnituse kontroll ei õnnestunud. Salvestatud info on alles; proovi „Värskenda vaadet”.';}}
}
$('confirmBusiness').onclick=async()=>{
 if(!user||confirmationBusy||dirty||!businessConfirmation?.can_confirm||!matchesSavedProfile(businessConfirmation,currentBusinessValues()))return;
 const captured=epoch,owner=user,view=businessConfirmation,reviewedRevision=formRevision;
 confirmationBusy=true;++confirmationEpoch;renderConfirmation();
 try{await profileRequest(owner,{request_id:crypto.randomUUID(),base_version:view.confirmed?.version||null,draft_digest:view.draft_digest,details:readDetails()});if(captured===epoch&&reviewedRevision===formRevision)detailsDirty=false;}
 catch(error){if(captured===epoch)message(error.status===409?'Ettevõtteinfo muutus. Vaata praegune salvestatud sisu uuesti üle.':'Kinnitus ei õnnestunud. Kontrollin salvestatud seisu.');}
 finally{if(captured===epoch){confirmationBusy=false;await refreshConfirmation();renderConfirmation();}}
};
async function registerWorkspace(){
 if(!user||registered||registering||!savedWorkspace)return;
 const capture=epoch,owner=user;registering=true;
 try{const token=await owner.getIdToken(true);if(capture!==epoch)return;
  const response=await fetch('https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1/workspaces/'+encodeURIComponent(owner.uid)+'/register',{
   method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',credentials:'omit',redirect:'error',cache:'no-store'});
  if(!response.ok)throw Error();const {data}=await response.json();if(capture!==epoch)return;
  registered=true;permanentId=data.client_id||permanentId;refreshKnowledge();$('businessOverview').hidden=!permanentId;renderChannelGate();if(permanentId&&!questionsUI){questionApi.start(user);questionsUI=questionsWorkflow(questionRoot,questionApi,permanentId==='0000'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(user.uid),permanentId);}
  $('promotionStatus').textContent=data.client_id?'Sinu kliendinumber: '+data.client_id+'. Mõõdikud ja nädalakokkuvõtted leiad „Äri ülevaate” lehelt.':'Tööruum on Adhalla ülevaatuse nimekirjas. Püsikliendi ligipääs aktiveeritakse pärast kinnitamist.';
 }catch{if(capture===epoch)$('promotionStatus').textContent='Ettevõtte info on alles. Adhalla ülevaatuse järjekorda lisamine ei õnnestunud; vajuta „Värskenda vaadet”.';}
 finally{if(capture===epoch)registering=false;}
}
function clearWorkspace() {
  detailsDirty=false;discoveryJob=null;discoveryBusy=false;discoveryError='';++discoveryEpoch;++formRevision;populateDetails(emptyDetails());
  businessConfirmation=null;confirmationBusy=false;++confirmationEpoch;
  registered=false;registering=false;permanentId=null;questionsUI?.destroy();questionsUI=null;questionApi.start(null);$('businessOverview').hidden=true;$('promotionStatus').textContent='';
  knowledgePending();
  canSave = false;
  dirty = false;
  savedWorkspace = null;
  $('workspaceForm').reset();
  $('businessName').textContent = 'Minu ettevõte';
  $('understanding').textContent = '0 / 6';
  $('lastSaved').textContent = 'Veel salvestamata';
  renderConfirmation();
}
function render(workspace, populate = true) {
  savedWorkspace = workspace;
  const business = workspace?.business || {};
  if (populate) fields.forEach(key => { $(key).value = business[key] || ''; });
  $('businessName').textContent = business.name || 'Minu ettevõte';
  const completed = fields.filter(key => typeof business[key] === 'string' && business[key].trim()).length;
  $('understanding').textContent = `${completed} / 6`;
  $('lastSaved').textContent = workspace?.updated_at?.toDate ? `Salvestatud ${workspace.updated_at.toDate().toLocaleString('et-EE')}` : 'Veel salvestamata';
  renderConfirmation();
}
$('googleSignIn').addEventListener('click', async () => {
  $('googleSignIn').disabled = true;
  try {
    await setPersistence(auth, browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    await signInWithPopup(auth, provider);
  } catch (error) {
    $('authNote').textContent = error.code === 'auth/popup-closed-by-user' ? 'Sisselogimine katkestati. Võid uuesti proovida.' : 'Sisselogimine ei õnnestunud. Palun proovi uuesti.';
  } finally { $('googleSignIn').disabled = false; }
});
$('signOut').addEventListener('click', async () => {
  try { await signOut(auth); }
  catch { message('Väljalogimine ei õnnestunud. Palun proovi uuesti.'); }
});
$('workspaceForm').addEventListener('input', event => { dirty = true;++formRevision;if(event.target.id.startsWith('detail_'))detailsDirty=true;renderConfirmation(); });
onAuthStateChanged(auth, current => {
  const thisEpoch = ++epoch;
  unsubscribe?.(); unsubscribe = null;
  user = current;
  clearWorkspace(); message('');
  $('authGate').hidden = !!current;
  $('appShell').hidden = !current;
  if (!current) return;

  $('userName').textContent = current.displayName || 'Minu konto';
  $('userEmail').textContent = current.email || '';
  const internalLink=$('internalProduct');
  internalLink.hidden=false;internalLink.setAttribute('aria-disabled','true');
  if(current.email==='admin@adhalla.ee') current.getIdToken(true).then(token=>{if(thisEpoch!==epoch)throw Error('Account changed');return fetch('https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1/internal/clients/0000/overview',
    {headers:{Authorization:'Bearer '+token},credentials:'omit',redirect:'error',cache:'no-store'});}).then(response=>{if(thisEpoch===epoch&&response.ok){permanentId='0000';$('workerDirectory').hidden=false;renderChannelGate();}}).catch(()=>{});
  $('saveWorkspace').disabled = true;
  message('Laadin sinu tööruumi…');

  unsubscribe = onSnapshot(doc(database, 'workspaces', current.uid), snapshot => {
    if (thisEpoch !== epoch) return;
    render(snapshot.exists() ? snapshot.data() : null, !dirty && !snapshot.metadata.hasPendingWrites);
    canSave = true;
    if(snapshot.exists()&&!snapshot.metadata.hasPendingWrites&&!snapshot.metadata.fromCache){registerWorkspace();refreshConfirmation();discoveryRequest().catch(()=>{});}

    $('saveWorkspace').disabled = false;
    message(snapshot.exists() ? '' : 'Alusta oma ettevõtte põhiinfost. Sinu tööruum on teistest eraldatud.');
  }, () => {
    if (thisEpoch !== epoch) return;
    clearWorkspace();
    $('saveWorkspace').disabled = true;
    message('Tööruum pole kättesaadav või ligipääs on eemaldatud. Proovi uuesti sisse logida.');
  });
});
$('refreshWorkspace').addEventListener('click', () => {
  registered=false;registerWorkspace();
  refreshConfirmation();
  discoveryRequest().catch(()=>{});
  if (user && savedWorkspace) refreshKnowledge();
});
async function saveWorkspace(event) {
  event?.preventDefault();
  if (!user || $('saveWorkspace').disabled) return;
  const currentEpoch = epoch;
  const savedRevision=formRevision,savedDetails=readDetails(),saveDetails=detailsDirty;
  const business = Object.fromEntries(fields.map(key => [key, $(key).value.trim()]));
  if (!business.name) { $('name').focus(); return; }
  if (business.website && !/^https?:\/\//i.test(business.website)) business.website = `https://${business.website}`;
  if (business.website) {
    try { const url = new URL(business.website); if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { message('Sisesta korrektne avaliku veebilehe aadress.'); return; }
  }
  $('saveWorkspace').disabled = true; message('Salvestan…');
  try {
    const target = doc(database,'workspaces',user.uid);
    if (savedWorkspace) await updateDoc(target,{business,updated_at:serverTimestamp()});
    else await setDoc(target,{schema_version:1,owner_uid:user.uid,member_uids:[user.uid],status:'active',business,created_at:serverTimestamp(),updated_at:serverTimestamp()});
    if (currentEpoch === epoch) {
      await refreshConfirmation();
      if(saveDetails&&businessConfirmation?.draft_digest){
        await profileRequest(user,{request_id:crypto.randomUUID(),base_version:businessConfirmation.draft_details?.version||null,draft_digest:businessConfirmation.draft_digest,details:savedDetails},'draft');
        if(savedRevision===formRevision)detailsDirty=false;
      }
      if(savedRevision===formRevision)dirty=false;message(dirty?'Varasem sisestus salvestati; viimased muudatused vajavad veel salvestamist.':'Ettevõtte info on salvestatud.');await refreshConfirmation();
    }
  } catch { if (currentEpoch === epoch) message('Salvestamine ei õnnestunud. Kontrolli ühendust ja ligipääsu.'); }
  finally { if (currentEpoch === epoch && canSave) $('saveWorkspace').disabled = false; }
}
$('workspaceForm').addEventListener('submit',saveWorkspace);

function renderChannelGate(){const link=$('internalProduct'),ready=!!businessConfirmation?.confirmed;link.hidden=false;link.classList.toggle('channel-pending',!ready);link.setAttribute('aria-disabled',String(!ready||!permanentId));link.textContent=ready?'Google Ads':'◷ Google Ads';link.title=!ready?'Esmalt kinnita ettevõtte info.':!permanentId?'Adhalla peab esmalt kinnitama sinu klienditööruumi.':'Ava kampaaniad';link.href=permanentId?'campaigns.html?client='+permanentId+'&release=0.25.1':'#business';link.onclick=e=>{if(!ready||!permanentId){e.preventDefault();message(!ready?'Vaata ettevõtte info üle ja kinnita see, et avada reklaamide tööruum.':'Ettevõtte info on kinnitatud. Adhalla seob sinu tööruumi enne reklaamide seadistamist.');}};$('dataReports').hidden=!permanentId;const more=$('businessReview');if(more)more.hidden=!ready&&!discoveryJob?.candidate&&!fields.slice(2).some(k=>$(k).value.trim());}

let knowledgeSequence=0;
async function refreshKnowledge(){
 const captured=epoch,owner=user,seq=++knowledgeSequence;
 if(!owner)return;
 if(!permanentId){knowledgePending(businessConfirmation?.confirmed);return;}
 const base=permanentId==='0000'?'/internal/clients/0000':'/workspaces/'+encodeURIComponent(owner.uid);
 try{const token=await owner.getIdToken();if(captured!==epoch)return;
  const response=await fetch('https://adhalla-workspace-api-184522982163.europe-north1.run.app/v1'+base+'/knowledge',{headers:{Authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error();const {data}=await response.json();
  if(captured===epoch&&seq===knowledgeSequence)renderKnowledge(data);
 }catch{if(captured===epoch&&seq===knowledgeSequence)knowledgePending(businessConfirmation?.confirmed,'Infopagasi laadimine ei õnnestunud. Salvestatud info on alles; proovi värskendada.');}
}
setInterval(()=>{if(user&&!document.hidden)refreshKnowledge();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshKnowledge();});
window.addEventListener('focus',()=>refreshKnowledge());
