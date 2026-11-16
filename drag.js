/* 音楽理論ノート 共通：コードのドラッグ＆MIDI書き出し
   - PC（Chrome / Edge）：ドラッグでテキスト＋MIDIファイルを渡す（DAWやデスクトップにドロップ可）
   - コード設計スタジオは application/x-mtn-chords を受け取る */
(function(){
const PCN={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function norm(s){return String(s).trim().replace(/♭/g,'b').replace(/♯/g,'#').replace(/[△Δ]/g,'maj').replace(/M7/g,'maj7').replace(/ø7?/,'m7(b5)').replace(/°7/,'dim7').replace(/°/,'dim').replace(/\s+/g,'')}
function root(s){const m=s.match(/^([A-G])([#b]*)/);if(!m)return null;let p=PCN[m[1]];for(const c of m[2])p+=c=='#'?1:-1;return{pc:(p+120)%12,len:m[0].length}}
const Q={'':[0,4,7],maj:[0,4,7],'5':[0,7],m:[0,3,7],'6':[0,4,7,9],'69':[0,4,7,9,14],m6:[0,3,7,9],m69:[0,3,7,9,14],
 '7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],mmaj7:[0,3,7,11],m7b5:[0,3,6,10],dim:[0,3,6],dim7:[0,3,6,9],
 aug:[0,4,8],aug7:[0,4,8,10],augmaj7:[0,4,8,11],sus4:[0,5,7],sus2:[0,2,7],'7sus4':[0,5,7,10],'7sus2':[0,2,7,10],
 add9:[0,4,7,14],madd9:[0,3,7,14],'9':[0,4,7,10,14],maj9:[0,4,7,11,14],m9:[0,3,7,10,14],mmaj9:[0,3,7,11,14],
 '11':[0,7,10,14,17],m11:[0,3,7,10,14,17],'13':[0,4,7,10,14,21],maj13:[0,4,7,11,14,21],m13:[0,3,7,10,14,21],'7b9':[0,4,7,10,13],'7#9':[0,4,7,10,15]};
const TEN={b9:13,'9':14,'#9':15,'11':17,'#11':18,b13:20,'13':21,add9:14,add2:2,add11:17,add4:5,'6':9,maj7:11,'7':10};
function parse(sym){
  let s=norm(sym),bass=null;
  const sl=s.lastIndexOf('/');if(sl>0){const b=root(s.slice(sl+1));if(b){bass=b.pc;s=s.slice(0,sl);}}
  const r=root(s);if(!r)return null;let rest=s.slice(r.len),toks=[];
  rest=rest.replace(/\(([^)]*)\)/g,(m,a)=>{toks.push(...a.split(/[,、 ]+/).filter(Boolean));return ''});
  let iv=null;
  if(Q[rest])iv=Q[rest].slice();
  else{let best='';for(const k in Q)if(k.length>best.length&&rest.startsWith(k))best=k;iv=(Q[best]||Q['']).slice();
    const left=rest.slice(best.length);(left.match(/(add\d+|[#b]?\d+|sus\d)/g)||[]).forEach(t=>toks.push(t));}
  toks.forEach(t=>{
    if(t=='b5'||t=='-5')iv=iv.map(x=>x==7?6:x);
    else if(t=='#5'||t=='+5')iv=iv.map(x=>x==7?8:x);
    else if(t=='sus4')iv=iv.map(x=>x==3||x==4?5:x);
    else if(t=='sus2')iv=iv.map(x=>x==3||x==4?2:x);
    else if(TEN[t]!=null&&!iv.includes(TEN[t]))iv.push(TEN[t]);
  });
  iv.sort((a,b)=>a-b);
  return{root:r.pc,bass:bass==null?r.pc:bass,slash:bass!=null,iv};
}
function midiNotes(sym){
  const c=parse(sym);if(!c)return null;
  const rm=48+c.root+(c.root<4?12:0);
  const tones=c.iv.map(i=>rm+i);
  const b=36+c.bass;return{bass:b,tones};
}
/* MIDI（SMF type0）を作る: items=[{sym,beats}] */
function vlq(n){const a=[n&0x7f];while(n>>=7)a.unshift((n&0x7f)|0x80);return a}
function smf(items,bpm=100,withBass=true){
  const PPQ=480,ev=[];let t=0;
  items.forEach(it=>{const n=midiNotes(it.sym);const d=Math.round((it.beats||4)*PPQ);if(n){
    const all=(withBass?[n.bass]:[]).concat(n.tones);
    all.forEach(m=>{ev.push([t,0x90,m,90]);ev.push([t+d-10,0x80,m,0]);});}
    t+=d;});
  ev.sort((a,b)=>a[0]-b[0]||(a[1]-b[1]));
  const tr=[];const us=Math.round(60000000/bpm);
  tr.push(0,0xff,0x51,3,(us>>16)&255,(us>>8)&255,us&255);
  tr.push(0,0xff,0x58,4,4,2,24,8);
  let last=0;ev.forEach(([tt,st,n,v])=>{tr.push(...vlq(tt-last),st,n,v);last=tt;});
  tr.push(0,0xff,0x2f,0);
  const L=tr.length;
  const head=[0x4d,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(PPQ>>8)&255,PPQ&255,0x4d,0x54,0x72,0x6b,(L>>>24)&255,(L>>16)&255,(L>>8)&255,L&255];
  return new Uint8Array(head.concat(tr));
}
function b64(u8){let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
function fileName(chords){return (chords.slice(0,6).join('-').replace(/[\/\\:*?"<>|]/g,'on').replace(/♭/g,'b').replace(/♯/g,'#').replace(/[△Δ]/g,'M')||'chords')+'.mid'}
function payload(chords,bpm){const items=chords.map(c=>typeof c=='string'?{sym:c,beats:4}:c);let key=null;try{if(window.MTN_KEY)key=window.MTN_KEY()}catch(_){}return{items,text:items.map(i=>i.sym).join(' '),bpm:bpm||100,key}}
function onDragStart(e,chords,bpm){
  const p=payload(chords,bpm);
  e.dataTransfer.effectAllowed='copy';
  if(!e.dataTransfer.getData('text/plain'))e.dataTransfer.setData('text/plain',p.text);
  e.dataTransfer.setData('application/x-mtn-chords',JSON.stringify(p));
  try{const u8=smf(p.items,p.bpm);e.dataTransfer.setData('DownloadURL','audio/midi:'+fileName(p.items.map(i=>i.sym))+':data:audio/midi;base64,'+b64(u8));}catch(_){}
}
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u8){let c=0xffffffff;for(let i=0;i<u8.length;i++)c=CRC[(c^u8[i])&255]^(c>>>8);return (c^0xffffffff)>>>0}
/* 無圧縮zip（files=[{name,data:Uint8Array}]） */
function zip(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  const le=(n,b)=>{const a=[];for(let i=0;i<b;i++)a.push((n>>>(8*i))&255);return a};
  files.forEach(f=>{const nm=enc.encode(f.name),c=crc32(f.data),L=f.data.length;
    const h=[0x50,0x4b,3,4,...le(20,2),...le(0x800,2),0,0,0,0,0x21,0,...le(c,4),...le(L,4),...le(L,4),...le(nm.length,2),0,0];
    parts.push(new Uint8Array(h),nm,f.data);
    cen.push(new Uint8Array([0x50,0x4b,1,2,...le(20,2),...le(20,2),...le(0x800,2),0,0,0,0,0x21,0,...le(c,4),...le(L,4),...le(L,4),...le(nm.length,2),0,0,0,0,0,0,0,0,0,0,0,0,...le(off,4)]),nm);
    off+=h.length+nm.length+L;});
  const cs=cen.reduce((a,b)=>a+b.length,0);
  const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...le(files.length,2),...le(files.length,2),...le(cs,4),...le(off,4),0,0]);
  return new Blob([...parts,...cen,end],{type:'application/zip'});
}
async function saveMidi(u8,name){
  let C=null;try{C=window.claude||(window.parent!==window&&window.parent.claude)||null}catch(_){}
  let dl=null;if(C&&C.use){try{dl=await C.use('downloads')}catch(_){}}
  if(dl){await dl.save({filename:name.replace(/\.mid$/,'')+'.zip',data:zip([{name,data:u8}])});return 'zip';}
  if(C)throw new Error('sandbox');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u8],{type:'audio/midi'}));a.download=name;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);return 'mid';
}
function download(chords,bpm){
  const p=payload(chords,bpm);return saveMidi(smf(p.items,p.bpm),fileName(p.items.map(i=>i.sym)));
}
/* 委任：root 内で selector に合う要素をドラッグ可能に。get(el) がコード配列を返す */
function bind(rootEl,selector,get,bpmFn){
  rootEl.addEventListener('dragstart',e=>{const el=e.target.closest&&e.target.closest(selector);if(!el)return;const ch=get(el);if(!ch||!ch.length)return;onDragStart(e,ch,bpmFn&&bpmFn());el.classList.add('dragging');});
  rootEl.addEventListener('dragend',e=>{const el=e.target.closest&&e.target.closest(selector);el&&el.classList.remove('dragging');});
  new MutationObserver(()=>rootEl.querySelectorAll(selector).forEach(el=>{if(!el.draggable)el.draggable=true})).observe(rootEl,{childList:true,subtree:true});
  rootEl.querySelectorAll(selector).forEach(el=>el.draggable=true);
}
window.MTNDrag={parse,midiNotes,smf,onDragStart,download,saveMidi,zip,bind,norm};
})();
