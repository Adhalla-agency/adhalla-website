// Confirmation is explicit owner input. Saving a draft is never confirmation.
export function confirmationState(view, dirty=false, busy=false) {
  if (busy) return {disabled:true, text:'Kontrollin ettevõtteinfo kinnitust…'};
  if (dirty) return {disabled:true, text:'Salvesta muudatused ja vaata need enne kinnitamist üle. Senine kinnitatud info jääb alles.'};
  if (!view) return {disabled:true, text:'Ettevõtteinfo kinnitus pole veel laaditud.'};
  if (!view.can_confirm) return {disabled:true, text:'Kinnitamiseks salvesta vähemalt ettevõtte nimi ja korrektne veebileht.'};
  if (view.confirmed?.version === view.draft_digest) return {disabled:true, text:'✓ See ettevõtteinfo on kinnitatud. Adhalla saab seda kasutada kampaaniasoovitustes ja nädalaaruannetes.'};
  return {disabled:false, text:view.confirmed
    ? 'Salvestatud muudatused vajavad kinnitamist. Seni kasutab Adhalla eelmist kinnitatud versiooni.'
    : 'Info on salvestatud mustandina. Vaata väljad üle ja kinnita, et Adhalla võiks neid kasutada sinu ettevõtte kontekstina.'};
}

export function matchesSavedProfile(view, values) {
  if (!view?.draft) return false;
  return ['name','website','description','offering','customer','objective'].every(key=>values[key]===view.draft[key]);
}
