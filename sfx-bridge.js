// ======================================================================
// SFX LAB → ドラム合体ラボ 橋渡し
//   SFX LAB が最後に作った（鳴らした）効果音をつかまえて、
//   ボタン1つで合体ラボへ送る／ドラッグで渡す。SFX LAB 本体は変更しません。
// ======================================================================
(function(){
  const SR = 44100;
  let last = null, lastName = '';
  function hook(iframe){
    const install = () => {
      try{
        const W = iframe.contentWindow; if(!W || !W.OfflineAudioContext) return;
        const P = W.OfflineAudioContext.prototype; if(P.__akaiHooked) return;
        const orig = P.startRendering;
        P.startRendering = function(){ const pr = orig.apply(this, arguments); if(pr && pr.then) pr.then(b => { if(b && b.length > 200){ last = b; lastName = guessName(W); update(); } }); return pr; };
        P.__akaiHooked = true;
      }catch(e){}
    };
    iframe.addEventListener('load', install); install();
  }
  function guessName(W){
    try{ const d = W.document; const el = d.querySelector('#plabel') || d.querySelector('.on b, .sel b, h2'); const t = (el && el.textContent || '').trim(); if(t && !/鳴らす/.test(t)) return t.slice(0, 24); }catch(e){}
    return 'SFX ' + new Date().toLocaleTimeString().slice(0, 5);
  }
  function toMono(b){
    const n = Math.min(b.length, Math.ceil(b.sampleRate * 3)), out = new Float32Array(n), ch = b.numberOfChannels;
    for(let c = 0; c < ch; c++){ const d = b.getChannelData(c); for(let i = 0; i < n; i++) out[i] += d[i] / ch; }
    if(b.sampleRate === SR) return out;
    const r = b.sampleRate / SR, m = Math.floor(n / r), o = new Float32Array(m);
    for(let i = 0; i < m; i++){ const x = i * r, j = Math.floor(x), f = x - j; o[i] = out[j] * (1 - f) + (out[j + 1] || 0) * f; }
    return o;
  }
  function payload(){
    if(!last) return null;
    const f = toMono(last); let end = f.length; while(end > 1000 && Math.abs(f[end - 1]) < .002) end--;
    let pk = 0; for(let i = 0; i < end; i++) pk = Math.max(pk, Math.abs(f[i])); const g = pk > 0 ? .9 / pk : 1;
    const u = new Uint8Array(end * 2);
    for(let i = 0; i < end; i++){ let v = Math.round(Math.max(-1, Math.min(1, f[i] * g)) * 32767); if(v < 0) v += 65536; u[2 * i] = v & 255; u[2 * i + 1] = v >> 8; }
    let bin = ''; for(let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return 'POCKETDTM_SAMPLE:' + JSON.stringify({name:lastName, sr:SR, b64:btoa(bin)});
  }
  function send(){
    const s = payload(); if(!s){ msg('まずSFX LABで音を鳴らしてください'); return false; }
    try{ const bc = new BroadcastChannel('drumlab'); bc.postMessage(s); setTimeout(() => bc.close(), 800); }catch(e){}
    try{ localStorage.setItem('drumlab-inbox', Date.now() + '|' + s); }catch(e){}
    msg(`「${lastName}」をドラム合体ラボへ送りました（合体ラボで選んでいる楽器の音になります）`); return true;
  }
  let btn = null, tip = null;
  function update(){ if(!btn) return; btn.disabled = !last; btn.title = last ? `「${lastName}」を合体ラボへ（クリックで送る／ドラッグで渡す）` : 'SFX LABで音を鳴らすと送れるようになります'; btn.querySelector('small').textContent = last ? lastName : 'まず音を鳴らす'; }
  function msg(t){ if(!tip) return; tip.textContent = t; tip.style.opacity = 1; clearTimeout(tip._t); tip._t = setTimeout(() => tip.style.opacity = 0, 3200); }
  function makeButton(parent, opt = {}){
    btn = document.createElement('button');
    btn.innerHTML = '🥁 合体ラボへ<small></small>';
    btn.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:4px 10px;border-radius:8px;border:1px solid #ff4fd8;background:linear-gradient(90deg,#ff4fd833,#8b5cff33);color:#fff;font:600 12px system-ui,sans-serif;cursor:grab;white-space:nowrap;' + (opt.css || '');
    btn.querySelector('small').style.cssText = 'font-size:10px;opacity:.7;max-width:150px;overflow:hidden;text-overflow:ellipsis';
    btn.draggable = true;
    btn.addEventListener('dragstart', e => { const s = payload(); if(!s){ e.preventDefault(); msg('まずSFX LABで音を鳴らしてください'); return; } e.dataTransfer.setData('text/plain', s); e.dataTransfer.effectAllowed = 'copy'; });
    btn.onclick = () => { if(send() && opt.onSent) opt.onSent(); };
    tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#140030;border:1px solid #3ff3ff;color:#fff;padding:9px 14px;font:13px system-ui,sans-serif;z-index:99;opacity:0;transition:opacity .3s;pointer-events:none;max-width:92vw';
    document.body.appendChild(tip);
    parent.appendChild(btn); update(); return btn;
  }
  window.SFXBridge = {hook, makeButton, send, has:() => !!last};
})();
