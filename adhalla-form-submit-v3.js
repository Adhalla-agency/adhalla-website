/* Adhalla public form transport v2
   Keeps visitors on adhalla.ee while FormSubmit processes in the background. */
(function(){
  const forms = document.querySelectorAll('form[data-adhalla-public-form]');

  function getVariant(form){
    return (form.querySelector('[name="experiment_variant"]') || {}).value ||
      window.adhallaVariant || document.documentElement.dataset.abVariant || 'n/a';
  }

  function getLeadType(form){
    const interest = (form.querySelector('[name="interest_type"]') || {}).value;
    if(interest) return interest;
    if(form.closest('#waitlist-a') || form.closest('#waitlist-b')) return 'client';
    if(location.pathname.includes('contact')) return 'contact';
    return 'client';
  }

  function ensureStatus(form){
    let status = form.querySelector('.form-submit-status');
    if(!status){
      status = document.createElement('div');
      status.className = 'form-submit-status';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      const button = form.querySelector('button[type="submit"]');
      if(button) button.insertAdjacentElement('afterend', status);
      else form.appendChild(status);
    }
    return status;
  }

  forms.forEach(form=>{
    form.addEventListener('submit', async event=>{
      event.preventDefault();
      if(!form.reportValidity()) return;

      const button = form.querySelector('button[type="submit"]');
      const status = ensureStatus(form);
      const oldText = button ? button.textContent : '';
      if(button){ button.disabled = true; button.textContent = 'Saadan…'; }
      status.className = 'form-submit-status sending';
      status.textContent = 'Saadame sinu päringut…';

      const fd = new FormData(form);
      const payload = {};
      for(const [key,value] of fd.entries()){
        if(key === '_next') continue;
        payload[key] = value;
      }

      const controller = new AbortController();
      const timeout = setTimeout(()=>controller.abort(), 15000);

      try{
        const response = await fetch(form.dataset.ajaxEndpoint, {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json'
          },
          body:JSON.stringify(payload),
          signal:controller.signal
        });
        clearTimeout(timeout);

        let result = null;
        try{ result = await response.json(); }catch(_){ }
        const successFlag = result && result.success;
        const rejected =
          !response.ok ||
          successFlag === false ||
          successFlag === 'false';

        if(rejected){
          throw new Error('FormSubmit rejected submission');
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event:'adhalla_lead_success',
          experiment_id:'landing_v1',
          experiment_variant:getVariant(form),
          lead_type:getLeadType(form)
        });

        const requestedNext = (form.querySelector('[name="_next"]') || {}).value;
        const fallback = `/aitah.html?variant=${encodeURIComponent(getVariant(form))}&type=${encodeURIComponent(getLeadType(form))}`;
        const next = requestedNext && requestedNext.startsWith('https://adhalla.ee/') ? requestedNext : fallback;
        window.location.assign(next);
      }catch(error){
        clearTimeout(timeout);
        status.className = 'form-submit-status error';
        status.textContent = 'Päringu saatmine ei õnnestunud. Sinu sisestatud info on alles — proovi hetk hiljem uuesti.';
        if(button){ button.disabled = false; button.textContent = oldText; }
      }
    });
  });
})();
