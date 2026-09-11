import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {getFirestore, doc, onSnapshot, setDoc, updateDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = id => document.getElementById(id);
const auth = getAuth(initializeApp(firebaseConfig));
const database = getFirestore(auth.app);
const fields = ['name','website','description','offering','customer','objective'];
let user = null, savedWorkspace = null, unsubscribe = null, epoch = 0, canSave = false, dirty = false;
function message(text) { $('message').textContent = text; }
function clearWorkspace() {
  canSave = false;
  dirty = false;
  savedWorkspace = null;
  $('workspaceForm').reset();
  $('businessName').textContent = 'Minu ettevõte';
  $('understanding').textContent = '0 / 6';
  $('confidence').textContent = 'Andmeallikas ühendamata';
  $('lastSaved').textContent = 'Veel salvestamata';
}
function render(workspace, populate = true) {
  savedWorkspace = workspace;
  const business = workspace?.business || {};
  if (populate) fields.forEach(key => { $(key).value = business[key] || ''; });
  $('businessName').textContent = business.name || 'Minu ettevõte';
  const completed = fields.filter(key => typeof business[key] === 'string' && business[key].trim()).length;
  $('understanding').textContent = `${completed} / 6`;
  $('lastSaved').textContent = workspace?.updated_at?.toDate ? `Salvestatud ${workspace.updated_at.toDate().toLocaleString('et-EE')}` : 'Veel salvestamata';
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
$('workspaceForm').addEventListener('input', () => { dirty = true; });
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
  $('saveWorkspace').disabled = true;
  message('Laadin sinu tööruumi…');
  unsubscribe = onSnapshot(doc(database, 'workspaces', current.uid), snapshot => {
    if (thisEpoch !== epoch) return;
    render(snapshot.exists() ? snapshot.data() : null, !dirty && !snapshot.metadata.hasPendingWrites);
    canSave = true;
    $('saveWorkspace').disabled = false;
    message(snapshot.exists() ? '' : 'Alusta oma ettevõtte põhiinfost. Sinu tööruum on teistest eraldatud.');
  }, () => {
    if (thisEpoch !== epoch) return;
    clearWorkspace();
    $('saveWorkspace').disabled = true;
    message('Tööruum pole kättesaadav või ligipääs on eemaldatud. Proovi uuesti sisse logida.');
  });
});
$('workspaceForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!user || $('saveWorkspace').disabled) return;
  const currentEpoch = epoch;
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
    if (currentEpoch === epoch) { dirty = false; message('Ettevõtte info on salvestatud.'); }
  } catch { if (currentEpoch === epoch) message('Salvestamine ei õnnestunud. Kontrolli ühendust ja ligipääsu.'); }
  finally { if (currentEpoch === epoch && canSave) $('saveWorkspace').disabled = false; }
});
