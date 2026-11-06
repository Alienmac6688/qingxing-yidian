/* FSRS-4.5-inspired reference implementation (standard default parameters).
   Separate from discernment metrics. No claim of parity with current Anki FSRS-6. */
(function(root){'use strict';
const W=[0.4,0.6,2.4,5.8,4.93,0.94,0.86,0.01,1.49,0.14,0.94,2.18,0.05,0.34,1.26,0.29,2.61];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function retrievability(s,elapsed){return Math.pow(1+Math.max(0,elapsed)/(9*Math.max(.01,s)),-1)}
function interval(s,retention=.9){return Math.max(1,Math.min(36500,Math.round(9*s*(1/retention-1))))}
function update(previous,grade,now=Date.now()){
 if(!Number.isInteger(grade)||grade<1||grade>4)throw Error('grade must be 1..4');
 if(!Number.isFinite(now))throw Error('invalid time');
 const prev=previous&&Number.isFinite(previous.s)&&Number.isFinite(previous.d)&&Number.isFinite(previous.last)?previous:null;
 let s,d,reps=prev?.reps||0;
 if(!prev){s=W[grade-1];d=clamp(W[4]-W[5]*(grade-3),1,10)}
 else{
  const elapsed=Math.max(0,(now-prev.last)/86400000),r=retrievability(prev.s,elapsed);
  d=clamp(W[7]*W[4]+(1-W[7])*(prev.d-W[6]*(grade-3)),1,10);
  if(grade===1){s=Math.max(.01,W[11]*Math.pow(d,-W[12])*(Math.pow(prev.s+1,W[13])-1)*Math.exp(W[14]*(1-r)))}
  else{s=Math.max(.01,prev.s*(1+Math.exp(W[8])*(11-d)*Math.pow(prev.s,-W[9])*(Math.exp((1-r)*W[10])-1)*(grade===2?W[15]:1)*(grade===4?W[16]:1)))}
 }
 const days=grade===1?1:interval(s);return {s:+s.toFixed(5),d:+d.toFixed(5),reps:reps+1,last:now,due:now+days*86400000,grade,algorithm:'fsrs-4.5-reference'};
}
const api={update,interval,retrievability,weights:W};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.QXFSRS=api;
})(typeof globalThis!=='undefined'?globalThis:this);