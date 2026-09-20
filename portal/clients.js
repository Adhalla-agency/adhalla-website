import {firebaseConfig} from './firebase-config.js';
import {createCampaignClient} from './campaigns-client.js?v=0.16';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const $=id=>document.getElementById(id),api=createCampaignClient();let epoch=0,selection=0,busy=false;
const node=(tag,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
const labels={unreviewed:'Ülevaatamata',discovery:'Üle vaadatud',approved:'Piloodiks kinnitatud',promoted:'Püsiklient'};
let requestedClient=new URLSearchParams(location.search).get('client');
function message(error){return error.status===403?'Selleks puudub Adhalla kliendihalduse õigus.':error.status===400?'Kontrolli ettevõtte veebiaadressi, valitud sammu ja kinnitust. Andmed võisid vahepeal muutuda; ava tööruum uuesti.':error.message;}
async function load(){const capture=epoch;$('status').textContent='Laadin…';try{const rows=await api.read('/worker/workspaces');if(capture!==epoch)return;$('list').replaceChildren();
 for(const row of rows){const b=node('button');b.append(node('strong',(row.client_id?row.client_id+' · ':'')+(row.name||'Nimeta tööruum')),node('small',labels[row.status]||row.status));b.onclick=()=>open(row.workspace_id);$('list').append(b);}
 $('status').textContent=rows.length?rows.length+' tööruumi.':'Väliste ettevõtete tööruume pole veel. Klient registreerub portaali kaudu ja salvestab ettevõtte info. 0000 jääb eraldi kaitstud sisekliendiks.';
 if(requestedClient){const selected=rows.find(r=>r.client_id===requestedClient);requestedClient=null;if(selected)await open(selected.workspace_id);}
 }catch(e){if(capture===epoch)$('status').textContent=message(e);}}
async function open(id){const capture=epoch,pick=++selection;busy=false;$('content').replaceChildren();$('detailStatus').textContent='Laadin ülevaatust…';if(!$('detail').open)$('detail').showModal();
 try{const review=await api.read('/worker/workspaces/'+encodeURIComponent(id));if(capture!==epoch||pick!==selection)return;const root=$('content'),profile=review.snapshot.business;
 root.append(node('h2',profile.name));for(const [key,title] of [['website','Veebileht'],['description','Ettevõte'],['offering','Pakkumine'],['customer','Kliendid'],['objective','Eesmärk']])root.append(node('h3',title),node('p',profile[key]||'Täpsustamata'));
 root.append(node('p','Tööruumi tunnus: '+id));const state=review.lifecycle?.status||'unreviewed';$('detailStatus').textContent=labels[state]||state;
 if(state==='promoted'){const clientId=review.lifecycle.client_id;const link=node('a','Ava selle kliendi äri ülevaade');link.href='business.html?client='+encodeURIComponent(clientId)+'&release=0.17';root.append(link);await sourceForm(root,clientId,capture,pick);return;}
 const action=state==='discovery'?'approve':state==='approved'?'promote':'qualify';
 const explanation=node('p',action==='promote'?'See loob järgmise püsikliendi numbri ja tasuta piloodi Interpretation ligipääsu. Number jääb sellele ettevõttele. Ühendused ja reklaamide muutmine on alguses keelatud.':action==='approve'?'Kinnitan selle täpse ettevõtteprofiili valitud piloodiks. Püsikliendi numbrit veel ei looda.':'Märgin selle täpse ettevõtteprofiili üle vaadatuks. See ei loo püsikliendi numbrit.');root.append(explanation);
 const label=node('label','Kinnituseks sisesta tööruumi tunnus'),confirm=node('input');confirm.autocomplete='off';label.append(confirm);root.append(label);
 const button=node('button',action==='promote'?'Loo püsiklient':action==='approve'?'Kinnita piloodiks':'Märgi üle vaadatuks');root.append(button);
 button.onclick=async()=>{if(busy)return;if(confirm.value!==id){$('detailStatus').textContent='Sisesta ülal näidatud tööruumi täpne tunnus.';return;}busy=true;button.disabled=true;$('detailStatus').textContent='Salvestan…';
  try{await api.write('/worker/workspaces/'+encodeURIComponent(id)+'/'+action,{confirm_workspace_id:id,review_digest:review.review_digest});if(capture!==epoch||pick!==selection)return;await open(id);load();}
  catch(e){if(capture===epoch&&pick===selection){$('detailStatus').textContent=message(e);button.disabled=false;busy=false;}}};
 }catch(e){if(capture===epoch&&pick===selection)$('detailStatus').textContent=message(e);}}
async function sourceForm(root,clientId,capture,pick){const data=await api.read('/worker/clients/'+clientId+'/sources');if(capture!==epoch||pick!==selection)return;
 root.append(node('h3','Google’i allikate ühendamine'),node('p','Esmalt peab klient andma Adhallale ligipääsu Google Adsis (MCC kaudu) või GA4-s. ID sisestamine ei saada kutset ega anna õigusi. Sisesta täpne konto või atribuudi nimi; server kontrollib seda Google’ist. See samm lubab ainult lugemist.'));
 const status=node('p',data.job?.status==='queued'||data.job?.status==='running'?'Ühenduse kontroll on järjekorras või käib. Laadi nimekiri mõne minuti pärast uuesti.':data.job?.status==='failed'?'Kontroll ebaõnnestus. Kontrolli Google’i ligipääsu ja täpset konto/atribuudi nime.':data.sources_ready?'✓ Allikad on kontrollitud ja seotud selle kliendiga.':'Ühendused on veel seadistamata.');root.append(status);
 root.append(node('p','GTM-i jaoks anna Adhallale konteineri lugemisõigus. Konto ja konteineri numbrid leiad GTM-i aadressist; avalik tunnus algab GTM-. Tööruumide muutmine ja avaldamine jäävad keelatuks.'));
 const form=node('form');form.className='fields';const fields={};
 for(const [kind,title] of [['google_ads','Google Ads'],['ga4','GA4']]){fields[kind]={};for(const [key,labelText] of [['resource_id',title+' ID (ainult numbrid)'],['name',title+' täpne nimi']]){const label=node('label',labelText),input=node('input');input.maxLength=key==='name'?160:20;input.autocomplete='off';label.append(input);form.append(label);fields[kind][key]=input;}}
 fields.gtm={};for(const [key,text] of [['account_id','GTM konto number'],['container_id','GTM konteineri number'],['public_id','GTM avalik tunnus (GTM-…)']]){const label=node('label',text),input=node('input');input.maxLength=24;input.autocomplete='off';label.append(input);form.append(label);fields.gtm[key]=input;}
 const checkLabel=node('label'),check=node('input');check.type='checkbox';check.style.width='auto';checkLabel.append(check,document.createTextNode('Olen kontrollinud kliendi '+clientId+' antud lugemisõigust ja nende allikate kuuluvust.'));form.append(checkLabel);
 const submit=node('button','Kontrolli ja seo allikad');submit.disabled=['queued','running'].includes(data.job?.status);form.append(submit);root.append(form);
 form.onsubmit=async event=>{event.preventDefault();if(busy)return;if(!check.checked){status.textContent='Kinnita täpse kliendi lugemisõigus ja allikate kuuluvus.';return;}const sources={};for(const [kind,pair] of Object.entries(fields)){const value=Object.fromEntries(Object.entries(pair).map(([key,input])=>[key,input.value.trim()]));if(Object.values(value).some(Boolean))sources[kind]=value;}
  if(!Object.keys(sources).length){status.textContent='Sisesta vähemalt üks allikas.';return;}busy=true;submit.disabled=true;status.textContent='Saadan ühenduse kontrolli…';
  try{await api.write('/worker/clients/'+clientId+'/sources',{confirm_client_id:clientId,base_version:data.version,sources});if(capture===epoch&&pick===selection){status.textContent='Ühenduse kontroll on esitatud. Server kontrollib õigusi ja allika nime enne ühenduse aktiveerimist.';}}
  catch(e){if(capture===epoch&&pick===selection){status.textContent=message(e);submit.disabled=false;}}finally{if(capture===epoch&&pick===selection)busy=false;}};
}
$('close').onclick=()=>{$('detail').close();selection++;};$('detail').addEventListener('cancel',()=>selection++);$('refresh').onclick=load;
onAuthStateChanged(getAuth(initializeApp(firebaseConfig)),user=>{epoch++;selection++;api.start(user);$('detail').close();$('content').replaceChildren();$('list').replaceChildren();if(user)load();else $('status').textContent='Logi esmalt portaali kaudu Adhalla töötaja Google kontoga sisse.';});
