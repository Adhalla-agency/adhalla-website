// Public artifacts are authorized by Firestore. Never read private bindings here.
export function createArtifactFeed(subscribe, render) {
  let generation = 0, stops = [], data = null, report = null, response = null, request = null;
  const present = () => render(data, data && report?.status === 'validated' &&
    report.binding_version === data.binding_version ? report : null, {
      response:data && report?.status === 'validated' && report.binding_version === data.binding_version && response?.binding_version === data.binding_version ? response : null,
      request:data && request?.binding_version === data.binding_version ? request : null});
  function stop() {
    generation++;
    stops.forEach(unsubscribe => unsubscribe()); stops = [];
    data = report = response = request = null; present();
  }
  function start(workspaceId) {
    stop();
    const current = generation;
    for (const kind of ['dataViews', 'interpretations', 'recommendationResponses', 'actionRequests']) {
      stops.push(subscribe(workspaceId, kind, snapshot => {
        if (current !== generation) return;
        const value = snapshot.exists() && !snapshot.metadata.fromCache ? snapshot.data() : null;
        if (kind === 'dataViews') data = value;
        else if (kind === 'interpretations') report = value;
        else if (kind === 'recommendationResponses') response = value;
        else request = value;
        present();
      }, () => {
        if (current !== generation) return;
        if (kind === 'dataViews') data = null;
        else if (kind === 'interpretations') report = null;
        else if (kind === 'recommendationResponses') response = null;
        else request = null;
        present();
      }));
    }
  }
  return {start, stop};
}

const gateLabels = {
  historical_trend_claims_allowed: 'Muutus ajas',
  paid_media_performance_judgment_allowed: 'Reklaami tulemuslikkus',
  funnel_rate_interpretation_allowed: 'Teekond päringuni',
  measurement_validated_claim_allowed: 'Mõõtmise usaldusväärsus',
};
function textElement(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = String(text ?? 'Teadmata');
  if (className) element.className = className;
  return element;
}
function timestamp(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function rows(target, items, label) {
  target.replaceChildren();
  for (const item of items || []) target.append(textElement('li', item[label]));
}

export function renderArtifacts(data, report, activity = {}, mountActions = null) {
  const $ = id => document.getElementById(id);
  $('dataContent').hidden = !data;
  $('dataEmpty').hidden = !!data;
  $('interpretationContent').hidden = !report;
  $('interpretationEmpty').hidden = !!report;
  for (const id of ['dataFacts', 'dataUnderstanding', 'dataMissing', 'dataGates', 'dataCautions', 'reportInferences', 'reportRecommendations', 'reportFacts', 'reportMissing']) $(id).replaceChildren();
  $('dataUpdated').textContent = $('reportUpdated').textContent = '';
  $('sourceSummary').textContent = '';
  $('confidence').textContent = 'Kinnitatud andmeid veel pole';
  $('confidenceNote').textContent = 'Kindlust saab hinnata pärast esimeste andmete saabumist.';
  if ($('latestActivity')) {
    $('latestActivity').replaceChildren();
    const decisions = {accept:'Nõustun',defer:'Hiljem',reject:'Ei nõustu'};
    const services = {analysis_review:'Tõlgenduse ülevaatus',setup_help:'Seadistamise abi',implementation_review:'Muudatuse läbivaatamine'};
    if (activity.response?.status === 'recorded') $('latestActivity').append(textElement('p',`Viimane salvestatud vastus: ${decisions[activity.response.decision] || 'Salvestatud'}.`));
    if (activity.request?.status === 'requested') $('latestActivity').append(textElement('p',`Viimane teenusetaotlus: ${services[activity.request.service] || 'Ülevaatus'} · Ootab Adhalla kinnitust.`));
    if (!activity.response && !activity.request) $('latestActivity').append(textElement('p','Salvestatud vastuseid ega teenusetaotlusi veel pole.'));
  }
  if (data) {
    const collected = timestamp(data.snapshot_generated_at);
    const stale = !collected || Date.now() - collected.getTime() > 36 * 3600000;
    $('dataUpdated').textContent = collected ? `Andmed seisuga ${collected.toLocaleString('et-EE')}${stale ? ' · Vajavad värskendamist' : ''}` : 'Andmete aeg on teadmata';
    const names = {google_ads:'Google Ads', ga4:'Google Analytics', gtm:'Tag Manager'};
    $('sourceSummary').textContent = Object.entries(names).map(([key, name]) => `${name}: ${data.source_status?.[key] === 'retrieved' ? 'andmed olemas' : 'andmeid pole'}`).join(' · ');
    for (const fact of data.facts || []) {
      const row = textElement('div', '', 'fact-row');
      row.append(textElement('span', fact.statement), textElement('strong', fact.value === null ? 'Teadmata' : typeof fact.value === 'number' ? fact.value.toLocaleString('et-EE') : fact.value));
      $('dataFacts').append(row);
    }
    for (const fact of data.understanding?.configured_facts || []) {
      $('dataUnderstanding').append(textElement('li', `${fact.statement} ${fact.value === null ? 'Teadmata' : fact.value}`));
    }
    rows($('dataMissing'), data.understanding?.missing_information, 'label');
    rows($('dataCautions'), data.confidence?.limitations, 'statement');
    let limited = stale;
    for (const [key, label] of Object.entries(gateLabels)) {
      const allowed = !stale && data.confidence?.evidence_gates?.[key]?.allowed === true;
      limited ||= !allowed;
      $('dataGates').append(textElement('li', `${label}: ${allowed ? 'tõendeid on hinnangu andmiseks' : 'tõendeid veel ei piisa'}`));
    }
    $('confidence').textContent = stale ? 'Andmed vajavad värskendamist' : limited ? 'Hinnangul on piirangud' : 'Tõendid on hinnanguks olemas';
    $('confidenceNote').textContent = 'Piirangud ja puuduv info on allpool eraldi välja toodud.';
  }
  if (report) {
    const generated = timestamp(report.generated_at);
    $('reportUpdated').textContent = generated ? `Koostatud ${generated.toLocaleString('et-EE')}` : 'Koostamise aeg on teadmata';
    rows($('reportInferences'), report.interpretations, 'text');
    rows($('reportMissing'), report.missing_information, 'label');
    for (const fact of report.facts || []) $('reportFacts').append(textElement('li', `${fact.statement} ${fact.value ?? 'Teadmata'}`));
    for (const recommendation of [...(report.recommendations || [])].sort((a,b) => a.priority - b.priority)) {
      const card = textElement('article', '', 'recommendation');
      card.append(textElement('small', `Prioriteet ${recommendation.priority}`), textElement('h3', recommendation.title), textElement('p', recommendation.rationale));
      if (mountActions) mountActions(card, report, recommendation);
      $('reportRecommendations').append(card);
    }
  }
}
