const REQUIRED_FIELDS = ['name', 'website', 'description', 'offering', 'customer', 'objective'];

// This first milestone is display-only: it grants no entitlement or discount.
export function firstIsland(profile, connections) {
  const business = profile?.confirmed?.status === 'confirmed' ? profile.confirmed.business : null;
  const company = !!business && REQUIRED_FIELDS.every(key => typeof business[key] === 'string' && business[key].trim());
  const sources = Array.isArray(connections?.sources) ? connections.sources : [];
  const connected = name => sources.some(row => row.source === name && row.status === 'connected');
  const analytics = connected('ga4');
  const advertising = connected('google_ads') || connected('meta');
  return {company, analytics, advertising, reached: company && analytics && advertising};
}

export function renderVoyage(root, state) {
  const items = [
    [state.company, 'Ettevõtte info on täidetud ja kinnitatud', '#business'],
    [state.analytics, 'Google Analytics 4 on ühendatud', 'connections.html'],
    [state.advertising, 'Google Ads või Meta on ühendatud', 'connections.html'],
  ];
  root.querySelector('[data-voyage-state]').textContent = state.reached
    ? 'Esimese saare tingimused on täidetud.'
    : 'Valmista oma ettevõtte andmed ja ühendused ette, et jõuda esimesele saarele.';
  root.querySelector('[data-voyage-progress]').textContent = state.reached ? '10%' : 'Teel 10% juurde';
  const list = root.querySelector('[data-voyage-steps]');
  list.replaceChildren();
  for (const [done, label, href] of items) {
    const item = document.createElement('li');
    const mark = document.createElement('span');
    mark.className = done ? 'voyage-mark done' : 'voyage-mark';
    mark.textContent = done ? '✓' : '○';
    mark.setAttribute('aria-label', done ? 'Valmis' : 'Vajab tegemist');
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    item.append(mark, link); list.append(item);
  }
  root.querySelector('[data-voyage-ship]').classList.toggle('arrived', state.reached);
}

