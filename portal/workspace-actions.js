const API = 'https://adhalla-workspace-api-184522982163.europe-north1.run.app';

export function createActionClient({fetchImpl = globalThis.fetch, newId = () => crypto.randomUUID()} = {}) {
  let session = null, generation = 0;
  const requests = new Map(), controllers = new Set();
  function stop() {
    generation++; session = null; requests.clear();
    controllers.forEach(controller => controller.abort()); controllers.clear();
  }
  function start(user) { stop(); session = user; }
  async function submit(report, recommendation, kind, choice, note) {
    const current = session, epoch = generation;
    if (!current || report?.status !== 'validated' || !report.recommendations?.some(item => item.id === recommendation.id)) throw new Error('Ligipääs puudub.');
    const choices = kind === 'response' ? ['accept','defer','reject'] : kind === 'request' ? ['analysis_review','setup_help','implementation_review'] : [];
    if (!choices.includes(choice) || typeof note !== 'string' || note.length > 1000) throw new Error('Kontrolli valikut ja märkust.');
    const key = JSON.stringify([report.report_id, recommendation.id, kind, choice, note]);
    if (!requests.has(key)) requests.set(key, newId());
    const body = {request_id:requests.get(key), report_id:report.report_id, recommendation_id:recommendation.id, note,
      [kind === 'response' ? 'decision' : 'service']:choice};
    const controller = new AbortController(); controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const token = await current.getIdToken(true);
      if (epoch !== generation) return null;
      const response = await fetchImpl(`${API}/v1/workspaces/${encodeURIComponent(current.uid)}/${kind}`, {
        method:'POST', mode:'cors', credentials:'omit', redirect:'error', cache:'no-store', signal:controller.signal,
        headers:{'Authorization':`Bearer ${token}`, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if (epoch !== generation) return null;
      if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? 'Ligipääs pole praegu lubatud. Värskenda tööruumi või logi uuesti sisse.' : 'Salvestamist ei saanud kinnitada. Proovi sama valikut uuesti.');
      const result = (await response.json()).data;
      if (epoch !== generation) return null;
      if (result?.request_id !== body.request_id || result?.binding_version !== report.binding_version || result?.status !== (kind === 'response' ? 'recorded' : 'requested')) throw new Error('Salvestamist ei saanud kinnitada.');
      return result;
    } catch (error) {
      if (epoch !== generation) return null;
      if (error?.name === 'AbortError' || error?.name === 'TypeError') throw new Error('Ühendus katkes. Proovi sama valikut uuesti.');
      throw error;
    } finally { clearTimeout(timer); controllers.delete(controller); }
  }
  return {start, stop, submit};
}

export function recommendationControls(client, card, report, recommendation) {
  const noteLabel = document.createElement('label'); noteLabel.className = 'action-note';
  noteLabel.textContent = 'Märkus (soovi korral)';
  const note = document.createElement('textarea'); note.maxLength = 1000; note.rows = 2;
  noteLabel.append(note); card.append(noteLabel);
  for (const [kind, label, buttonText, options] of [
    ['response','Sinu vastus','Salvesta vastus',[['accept','Nõustun'],['defer','Hiljem'],['reject','Ei nõustu']]],
    ['request','Abi Adhallalt','Saada teenusetaotlus',[['analysis_review','Tõlgenduse ülevaatus'],['setup_help','Seadistamise abi'],['implementation_review','Muudatuse läbivaatamine']]],
  ]) {
    const form = document.createElement('form'); form.className = 'recommendation-action';
    const field = document.createElement('label'); field.textContent = label;
    const select = document.createElement('select');
    for (const [value,text] of options) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
    field.append(select);
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = buttonText;
    const state = document.createElement('span'); state.setAttribute('role','status');
    form.append(field,button,state); card.append(form);
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (button.disabled) return;
      button.disabled = true; state.textContent = 'Salvestan…';
      try {
        const result = await client.submit(report, recommendation, kind, select.value, note.value.trim());
        if (result && card.isConnected) state.textContent = kind === 'response' ? 'Vastus salvestatud.' : 'Taotlus on saadetud Adhallale läbivaatamiseks.';
      } catch (error) { if (card.isConnected) state.textContent = error.message; }
      finally { button.disabled = false; }
    });
  }
  const help = document.createElement('p'); help.className = 'action-help';
  help.textContent = 'Teenusetaotlus vajab Adhalla kinnitust. Võimalik töömaht ja hind lepitakse eraldi kokku.';
  card.append(help);
}
