// Confirmation is explicit owner input. Saving a draft is never confirmation.
export function confirmationState(view, dirty=false, busy=false) {
  if (busy) return {disabled:true, text:'Kontrollin ettevõtteinfo kinnitust…'};
  if (dirty) return {disabled:true, text:'Salvesta muudatused ja vaata need enne kinnitamist üle. Senine kinnitatud info jääb alles.'};
  if (!view) return {disabled:true, text:'Ettevõtteinfo kinnitus pole veel laaditud.'};
  if (!view.can_confirm) return {disabled:true, text:'Kinnitamiseks salvesta vähemalt ettevõtte nimi ja korrektne veebileht.'};
  if ((view.confirmed?.business_digest||view.confirmed?.version) === view.draft_digest && !view.details_changed) return {disabled:true, text:'✓ See ettevõtteinfo on kinnitatud. Adhalla saab seda kasutada kampaaniasoovitustes ja nädalaaruannetes.'};
  return {disabled:false, text:view.confirmed
    ? 'Salvestatud muudatused vajavad kinnitamist. Seni kasutab Adhalla eelmist kinnitatud versiooni.'
    : 'Info on salvestatud mustandina. Vaata väljad üle ja kinnita, et Adhalla võiks neid kasutada sinu ettevõtte kontekstina.'};
}

export const detailLists=['products_services','positioning','business_facts','locations','value_propositions','conversion_paths','relevant_pages'];
export function emptyDetails(){return {...Object.fromEntries(detailLists.map(key=>[key,[]])),logo_url:'',phone:'',phone_opt_in:false};}
export function discoveryText(job){
 if(!job)return 'Salvesta ettevõtte nimi ja veebileht. Leitud info saad enne kasutamist üle vaadata.';
 return ({queued:'Adhalla mõtleb… Veebilehe analüüs ja ettevõtteinfo koostamine võib võtta kuni 5 minutit. Võid vahepeal mujale liikuda.',running:'Adhalla mõtleb… Koostame ettevõtteinfo ettepanekut. See võib võtta kuni 5 minutit; võid vahepeal mujale liikuda.',
 completed:'Ettepanekud on valmis. Too need vormi, kontrolli ja paranda enne kinnitamist.',
 failed:'Veebilehe uuring ei õnnestunud. Võid uuesti proovida või info ise täita.',
 stale:'Ettevõtte info muutus. Käivita uuring uuesti salvestatud andmetega.',
 limited:'Uuring ootab järgmist lubatud töötlemisaega; see jätkub automaatselt.'})[job.status]||'Kontrollin uuringu seisu…';
}

export function matchesSavedProfile(view, values) {
  if (!view?.draft) return false;
  return ['name','website','description','offering','customer','objective'].every(key=>values[key]===view.draft[key]);
}
