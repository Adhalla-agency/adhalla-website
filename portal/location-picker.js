const n=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const types={City:'linn',County:'maakond',Municipality:'omavalitsus',Country:'riik',Region:'piirkond',State:'osariik','Postal Code':'sihtnumber',Province:'provints'};

export function locationPicker(source,lookup){
 const host=n('div');host.className='location-picker';source.after(host);source.hidden=true;
 const input=n('input');input.id=source.id+'-search';input.type='search';input.placeholder='Otsi linna, maakonda või riiki, nt Tartu';input.autocomplete='off';input.maxLength=100;
 const label=document.querySelector('label[for="'+source.id+'"]');if(label)label.htmlFor=input.id;
 input.setAttribute('aria-label','Otsi reklaami asukohta');
 const status=n('p'),results=n('div'),chosen=n('ul');status.setAttribute('role','status');status.id=input.id+'-status';input.setAttribute('aria-describedby',status.id);results.className='location-options';chosen.className='location-selected';
 host.append(chosen,input,status,results);
 let epoch=0,timer=null;const labels=new Map();
 const values=()=>source.value.split('\n').map(s=>s.trim()).filter(Boolean);
 function render(){chosen.replaceChildren();for(const value of values()){const row=n('li'),remove=n('button','Eemalda');remove.type='button';remove.className='text-button';remove.setAttribute('aria-label','Eemalda asukoht '+value);remove.onclick=()=>{source.value=values().filter(v=>v!==value).join('\n');source.dispatchEvent(new Event('input',{bubbles:true}));render();};row.append(n('span',labels.get(value)||value.replace(/ \[geo:[0-9]+\]$/,'')),remove);chosen.append(row);}}
 function select(option){if(values().length>=20&&!values().includes((option.value||option.canonical_name))){status.textContent='Valida saab kuni 20 asukohta.';return;}labels.set(option.value||option.canonical_name,option.name+' · '+(types[option.type]||option.type)+' · '+option.country);source.value=[...new Set([...values(),option.value||option.canonical_name])].join('\n');epoch++;input.value='';results.replaceChildren();status.textContent='✓ Asukoht lisatud. Võid otsida järgmise linna, piirkonna või riigi.';render();source.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
 async function search(){const query=input.value.trim(),run=++epoch;results.replaceChildren();if(query.length<2){status.textContent='Sisesta vähemalt kaks tähte ja vali allpool täpne asukoht.';return;}status.textContent='Otsin asukohti…';try{const value=await lookup(query);if(run!==epoch)return;status.textContent=value.options.length?'Vali täpne asukoht'+(value.more?' · rohkem vasteid, täpsusta otsingut':'')+'.':'Vasteid ei leitud. Proovi täpsemat või ingliskeelset kohanime.';for(const option of value.options){const button=n('button');button.type='button';button.className='secondary';button.style.cssText='display:block;text-align:left;margin:0.4rem 0;width:100%';button.append(n('strong',option.name+' · '+(types[option.type]||option.type)),n('small',' — '+option.canonical_name+' · '+option.country));button.onclick=()=>select(option);results.append(button);}}catch(error){if(run!==epoch)return;status.textContent='Asukohaotsing ei õnnestunud. '+error.message;}}
 input.addEventListener('input',event=>{event.stopPropagation();epoch++;clearTimeout(timer);results.replaceChildren();status.textContent='Vali otsingutulemus, et asukoht kampaaniale lisada.';timer=setTimeout(search,250);});
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(timer);search();}if(event.key==='ArrowDown')results.querySelector('button')?.focus();if(event.key==='Escape'){epoch++;results.replaceChildren();}});
 function sync(){epoch++;clearTimeout(timer);input.value='';results.replaceChildren();status.textContent='Vali otsingust linn, maakond või riik. Lisatakse ainult sinu valitud asukohad.';render();}
 sync();return {sync};
}
