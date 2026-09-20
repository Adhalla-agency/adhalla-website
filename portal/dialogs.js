let pressed=null;
const outside=(d,e)=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
document.addEventListener('pointerdown',e=>{pressed=e.target instanceof HTMLDialogElement&&outside(e.target,e)?e.target:null;});
document.addEventListener('click',e=>{if(pressed===e.target&&pressed.open&&outside(pressed,e))pressed.close();pressed=null;});
