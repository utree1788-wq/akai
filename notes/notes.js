/* 創作の手帖 — まとめノート共通レンダラー */
(function(){
const B = BOOKS.find(b => b.id === window.BOOK_ID);
document.documentElement.style.setProperty('--accent', B.color);
document.documentElement.style.setProperty('--accent-soft', B.color + '18');
document.title = B.title + '｜創作の手帖';

const LS = 'souzou-notes-v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(LS) || '{}'); } catch(e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch(e) {} };
const key = id => B.id + ':' + id;

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2, '0');
const img = p => `../scans/${B.id}/${pad(p)}.jpg`;

const extraTabs = [];
if (B.id === 'emotion') extraTabs.push(['mix', '🎨 感情の色ミックス']);
if (B.id === 'story') extraTabs.push(['sheet', '✍ 物語設計シート']);

const app = document.getElementById('app');
app.innerHTML = `
<div class="wrap">
  <header class="hero">
    <div class="no">まとめノート ${B.no} / 6 ・ 原本 ${B.pages}ページ</div>
    <h1>${B.icon} ${esc(B.title)}</h1>
    <p>${esc(B.sub)}</p>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-v="notes">📝 まとめ</button>
      ${extraTabs.map(t => `<button class="tab" role="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}
      <button class="tab" role="tab" data-v="scans">📄 原本ページ</button>
    </div>
  </header>
  <section id="v-notes"></section>
  <section id="v-scans" hidden></section>
  <section id="v-mix" hidden></section>
  <section id="v-sheet" hidden></section>
</div>
<div class="lb" id="lb" aria-hidden="true">
  <div class="lb-bar"><span class="ttl" id="lbT"></span>
    <button id="lbPrev" aria-label="前のページ">◀</button><button id="lbNext" aria-label="次のページ">▶</button>
    <button id="lbZoom">拡大</button><button id="lbClose" aria-label="閉じる">✕</button></div>
  <div class="lb-body" id="lbB"><img id="lbI" alt=""></div>
</div>`;

/* ---------- まとめ ---------- */
const vNotes = document.getElementById('v-notes');
vNotes.innerHTML = `
  <div class="toolbar">
    <input class="search" id="q" type="search" placeholder="この本の中を検索（例：${esc(B.sections[0].cards[0].kw[0])}）" aria-label="この本の中を検索">
    <button class="chip" id="favOnly">★ お気に入りだけ</button>
    <span class="count" id="cnt"></span>
  </div>
  <nav class="toc">${B.sections.map((s,i) => `<button class="chip" data-sec="${i}">${esc(s.h)}</button>`).join('')}</nav>
  <div id="cards"></div>`;

function hl(text, q){
  const t = esc(text);
  if (!q) return t;
  const qe = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return t.replace(new RegExp(qe, 'gi'), m => `<mark>${m}</mark>`);
}
let favOnly = false;
function renderCards(){
  const q = document.getElementById('q').value.trim();
  let html = '', n = 0;
  B.sections.forEach((s, si) => {
    let inner = '';
    s.cards.forEach((c, ci) => {
      const id = `c-${si}-${ci}`;
      const st = store[key(id)] || {};
      const hay = (c.t + c.b.join('') + c.kw.join('') + (st.memo || '')).toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return;
      if (favOnly && !st.fav) return;
      n++;
      inner += `<article class="card" id="${id}">
        <h3><span class="t">${hl(c.t, q)}</span>
          <button class="icon-btn ${st.fav ? 'on' : ''}" data-fav="${id}" aria-label="お気に入り" title="お気に入り">${st.fav ? '★' : '☆'}</button>
          <button class="icon-btn" data-memo="${id}" aria-label="メモ" title="自分のメモ">✎</button></h3>
        <ul>${c.b.map(x => `<li>${hl(x, q)}</li>`).join('')}</ul>
        ${st.memo ? `<div class="memo-view">📝 ${hl(st.memo, q)}</div>` : ''}
        <div class="meta">${c.p.map(p => `<button class="pg" data-p="${p}">原本 p.${p}</button>`).join('')}
          ${c.kw.map(k => `<span class="kw">#${esc(k)}</span>`).join('')}</div>
      </article>`;
    });
    if (inner) html += `<div class="sec" id="s-${si}"><h2>${esc(s.h)}</h2>${inner}</div>`;
  });
  document.getElementById('cards').innerHTML = html || `<p class="empty">見つかりませんでした。別の言葉で探してみてください。</p>`;
  document.getElementById('cnt').textContent = `${n} 項目`;
}
renderCards();
document.getElementById('q').addEventListener('input', renderCards);
document.getElementById('favOnly').addEventListener('click', e => {
  favOnly = !favOnly; e.currentTarget.classList.toggle('on', favOnly); renderCards();
});
vNotes.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.sec !== undefined) {
    const el = document.getElementById('s-' + t.dataset.sec);
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  } else if (t.dataset.p) openLB(+t.dataset.p);
  else if (t.dataset.fav) {
    const k = key(t.dataset.fav); store[k] = store[k] || {}; store[k].fav = !store[k].fav; save(); renderCards();
  } else if (t.dataset.memo) {
    const card = document.getElementById(t.dataset.memo);
    if (card.querySelector('.memo')) return;
    const k = key(t.dataset.memo);
    const ta = document.createElement('textarea');
    ta.className = 'memo'; ta.placeholder = '自分のメモ（歌詞や物語のアイデアなど）。枠の外をタップで保存';
    ta.value = (store[k] && store[k].memo) || '';
    const mv = card.querySelector('.memo-view'); if (mv) mv.remove();
    card.querySelector('ul').after(ta); ta.focus();
    ta.addEventListener('blur', () => { store[k] = store[k] || {}; store[k].memo = ta.value.trim(); save(); renderCards(); });
  }
});

/* ---------- 原本ページ ---------- */
const vScans = document.getElementById('v-scans');
let thumbs = '';
for (let p = 1; p <= B.pages; p++) thumbs += `<button class="thumb" data-p="${p}"><img loading="lazy" src="${img(p)}" alt="原本 ${p}ページ"><span>p.${p}</span></button>`;
vScans.innerHTML = `<p class="note-hand">スキャンした原本です。手書きの書き込みもそのまま見られます。タップで大きく表示。</p><div class="grid">${thumbs}</div>`;
vScans.addEventListener('click', e => { const t = e.target.closest('[data-p]'); if (t) openLB(+t.dataset.p); });

/* ---------- ライトボックス ---------- */
const lb = document.getElementById('lb'), lbI = document.getElementById('lbI'), lbB = document.getElementById('lbB');
let cur = 1;
function openLB(p){ cur = Math.min(Math.max(1, p), B.pages); lbI.src = img(cur); document.getElementById('lbT').textContent = `${B.title}　原本 p.${cur} / ${B.pages}`; lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); lbB.scrollTop = 0; }
function closeLB(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); lbB.classList.remove('zoom'); }
document.getElementById('lbClose').onclick = closeLB;
document.getElementById('lbPrev').onclick = () => openLB(cur - 1);
document.getElementById('lbNext').onclick = () => openLB(cur + 1);
document.getElementById('lbZoom').onclick = () => lbB.classList.toggle('zoom');
lb.addEventListener('click', e => { if (e.target === lb || e.target === lbB) closeLB(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowLeft') openLB(cur - 1); if (e.key === 'ArrowRight') openLB(cur + 1);
});

/* ---------- タブ ---------- */
const views = ['notes','scans','mix','sheet'];
function show(v){
  views.forEach(x => { const el = document.getElementById('v-' + x); if (el) el.hidden = x !== v; });
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.v === v));
}
document.querySelector('.tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) show(t.dataset.v); });
show('notes');

/* ハブからの #c-1-2 などのジャンプ */
function jump(){
  const h = location.hash.slice(1);
  if (!h) return;
  if (h === 'scans' || h === 'mix' || h === 'sheet') { show(h); return; }
  const el = document.getElementById(h);
  if (el) { show('notes'); setTimeout(() => { el.scrollIntoView({block: 'start'}); el.classList.add('flash'); }, 60); }
}
window.addEventListener('hashchange', jump); jump();

/* ---------- 感情の色ミックス（感情ページだけ） ---------- */
if (B.id === 'emotion') {
  const E = [
    ['喜び','#f5c518'],['信頼','#9acd32'],['恐れ','#2e9e5b'],['驚き','#3bb4d8'],
    ['悲しみ','#3a6fd8'],['嫌悪','#8e5bc6'],['怒り','#e0413a'],['予期','#f08a24']];
  const COMBOS = [
    ['愛',['喜び','信頼']],['服従',['信頼','恐れ']],['畏怖',['恐れ','驚き']],['失望',['驚き','悲しみ']],
    ['後悔',['悲しみ','嫌悪']],['軽蔑',['嫌悪','怒り']],['攻撃性',['怒り','予期']],['楽観',['予期','喜び']],
    ['憧れ',['予期','喜び','信頼','驚き']],['嫉妬',['予期','恐れ','怒り'],'原本では「不安＋恐れ＋怒り」。不安は予期と恐れの混ざった状態として扱っています。'],
    ['恥ずかしさ',['嫌悪','驚き','恐れ']],['屈辱感',['嫌悪','恐れ','怒り']],['自尊心',['怒り','喜び','信頼']],
    ['劣等感',['悲しみ','恐れ','嫌悪','怒り']],['不満',['悲しみ','嫌悪','驚き','予期']],['孤独感',['悲しみ','嫌悪','恐れ']],
    ['優越感',['怒り','信頼','喜び']],['孤独欲',['喜び','恐れ','嫌悪']],['自己犠牲心',['恐れ','嫌悪','悲しみ','予期']]];
  const findCard = name => {
    for (let si = 0; si < B.sections.length; si++) for (let ci = 0; ci < B.sections[si].cards.length; ci++)
      if (B.sections[si].cards[ci].t.startsWith(name)) return {id:`c-${si}-${ci}`, c:B.sections[si].cards[ci]};
    return null;
  };
  const basicCard = name => findCard(name) || (() => {
    for (let si = 0; si < B.sections.length; si++) for (let ci = 0; ci < B.sections[si].cards.length; ci++)
      if (B.sections[si].cards[ci].t.includes(name)) return {id:`c-${si}-${ci}`, c:B.sections[si].cards[ci]};
  })();
  const col = n => E.find(e => e[0] === n)[1];
  let sel = [];
  const v = document.getElementById('v-mix');
  const cx = 180, cy = 180, R = 165, r0 = 58;
  const arc = i => {
    const a0 = (i * 45 - 90 - 22.5) * Math.PI / 180, a1 = (i * 45 - 90 + 22.5) * Math.PI / 180;
    const p = (rr, a) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
    return `M${p(r0,a0)} L${p(R,a0)} A${R},${R} 0 0 1 ${p(R,a1)} L${p(r0,a1)} A${r0},${r0} 0 0 0 ${p(r0,a0)}Z`;
  };
  const lab = i => { const a = (i * 45 - 90) * Math.PI / 180, rr = (R + r0) / 2; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  function draw(){
    const svg = `<svg viewBox="0 0 360 360" role="group" aria-label="8つの基本感情の輪">
      ${E.map((e, i) => { const [x, y] = lab(i); const on = sel.includes(e[0]);
        return `<g data-e="${e[0]}" tabindex="0" role="button" aria-pressed="${on}"><path d="${arc(i)}" fill="${e[1]}" opacity="${sel.length && !on ? .28 : 1}" stroke="#fffdf8" stroke-width="3"/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="16" font-weight="700" fill="${sel.length && !on ? '#5d564e' : '#fff'}" style="pointer-events:none;paint-order:stroke" stroke="${sel.length && !on ? 'transparent' : 'rgba(0,0,0,.25)'}" stroke-width="2">${e[0]}</text></g>`; }).join('')}
      <circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="${sel.length ? mixColor() : '#fffdf8'}" stroke="#e3dbcd"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="13" fill="${sel.length ? '#fff' : '#5d564e'}">${sel.length ? sel.length + 'つ選択' : 'タップで選ぶ'}</text>
    </svg>`;
    const exact = COMBOS.find(c => c[1].length === sel.length && c[1].every(x => sel.includes(x)));
    const near = sel.length ? COMBOS.filter(c => c !== exact && sel.every(x => c[1].includes(x))) : [];
    let res = '';
    if (!sel.length) res = `<h3>基本感情を組み合わせる</h3><p>輪の色をタップして選ぶと、その組み合わせで生まれる感情が出ます。下のボタンからも逆引きできます。</p>`;
    else {
      const sw = sel.map(n => `<span class="sw"><i style="background:${col(n)}"></i>${n}</span>`).join(' ＋ ');
      if (sel.length === 1) { const bc = basicCard(sel[0]); res = `<div class="swatches">${sw}</div><h3>${sel[0]}（基本感情）</h3>${bc ? cardMini(bc) : ''}`; }
      else if (exact) { const fc = findCard(exact[0]); res = `<div class="swatches">${sw}</div><h3>＝ ${exact[0]}</h3>${exact[2] ? `<p class="note-hand">${exact[2]}</p>` : ''}${fc ? cardMini(fc) : ''}`; }
      else res = `<div class="swatches">${sw}</div><h3>この組み合わせは本に載っていません</h3><p class="note-hand">あと1〜2色足すと、下の感情になります。</p>`;
      if (near.length) res += `<p style="margin:12px 0 0;font-weight:700;font-size:14px">さらに色を足すと…</p><div class="combo-list">${near.map(c => `<button data-combo="${c[0]}">${c[0]}（${c[1].join('＋')}）</button>`).join('')}</div>`;
    }
    v.innerHTML = `<div class="tool"><h2>🎨 感情の色ミックス</h2><p class="lead">本の色分け（8つの基本感情）を混ぜて、二次感情・複合感情を引けます。歌詞や登場人物の気持ちを決めるときに。</p>
      <div class="wheel-wrap"><div class="wheel">${svg}<div class="btns" style="margin-top:8px"><button class="btn ghost" id="mixClear">選択をクリア</button></div></div><div class="result">${res}</div></div>
      <p style="margin:16px 0 4px;font-weight:700;font-size:14px">逆引き：感情から色を見る</p>
      <div class="combo-list">${COMBOS.map(c => `<button data-combo="${c[0]}"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c[1].map(col)[0]}"></i> ${c[0]}</button>`).join('')}</div></div>`;
  }
  function mixColor(){
    const rgb = sel.map(n => col(n)).map(h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16)));
    const m = [0,1,2].map(k => Math.round(rgb.reduce((s, c) => s + c[k], 0) / rgb.length));
    return `rgb(${m.join(',')})`;
  }
  function cardMini(fc){
    return `<ul>${fc.c.b.map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="meta">${fc.c.p.map(p => `<button class="pg" data-p="${p}">原本 p.${p}</button>`).join('')}<button class="pg" data-goto="${fc.id}">まとめで見る →</button></div>`;
  }
  v.addEventListener('click', e => {
    const g = e.target.closest('[data-e]');
    if (g) { const n = g.dataset.e; sel = sel.includes(n) ? sel.filter(x => x !== n) : [...sel, n]; draw(); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'mixClear') { sel = []; draw(); }
    else if (b.dataset.combo) { sel = [...COMBOS.find(c => c[0] === b.dataset.combo)[1]]; draw(); }
    else if (b.dataset.p) openLB(+b.dataset.p);
    else if (b.dataset.goto) { location.hash = b.dataset.goto; jump(); }
  });
  v.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.e) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', {bubbles: true})); } });
  draw();
}

/* ---------- 物語設計シート（物語の構造ページだけ） ---------- */
if (B.id === 'story') {
  const F = [
    ['title','タイトル／曲名',''],
    ['want','主人公は何が欲しい？','3大黄金ルール①：目的を最初に決める'],
    ['premise','【前提】主人公が信じ込んでいる誤った信念','例：「私は一人で生きなければならない」'],
    ['reason','【考え・動機・根拠】なぜそう信じているのか','過去の傷や経験'],
    ['ki','【起】日常と欠落','いつ・どこで・誰が／日常の不満'],
    ['sho','【承】もしも（What if）とだがしかし（But）','逆境と伏線'],
    ['ten','【転】最大の絶望・予想外の裏切り（前提を壊す行動）','主人公が「これまでのやり方は通用しない」と悟る瞬間'],
    ['ketsu','【結】起との対比・余韻','何が変わったか。説明しすぎない'],
    ['result','【結果】新しい現実・新しい前提','ループの到達点'],
    ['lesson','【教訓】この物語が証明するテーマ（問いの形で）','例：「愛は死に打ち勝てるか？」'],
    ['desire','受け手のどの欲求を満たす？','願望充足／情緒的解放（カタルシス）／承認と共感']];
  const SK = 'souzou-story-sheet-v1';
  let data = {}; try { data = JSON.parse(localStorage.getItem(SK) || '{}'); } catch(e) {}
  const v = document.getElementById('v-sheet');
  v.innerHTML = `<div class="tool"><h2>✍ 物語設計シート</h2><p class="lead">「前提ループ」と「起承転結」を一枚に。歌詞や物語の骨組みづくりに使えます。入力は自動で保存されます。</p>
    ${F.map(f => `<div class="field"><label for="f-${f[0]}">${f[1]} ${f[2] ? `<small>— ${f[2]}</small>` : ''}</label>
      ${f[0] === 'title' ? `<input id="f-${f[0]}" data-k="${f[0]}">` : `<textarea id="f-${f[0]}" data-k="${f[0]}" rows="2"></textarea>`}</div>`).join('')}
    <div class="btns"><button class="btn" id="shCopy">テキストでコピー</button><button class="btn ghost" id="shClear">白紙に戻す</button><span class="count" id="shMsg"></span></div></div>`;
  v.querySelectorAll('[data-k]').forEach(el => { el.value = data[el.dataset.k] || ''; el.addEventListener('input', () => { data[el.dataset.k] = el.value; try { localStorage.setItem(SK, JSON.stringify(data)); } catch(e) {} }); });
  const msg = t => { const m = document.getElementById('shMsg'); m.textContent = t; setTimeout(() => m.textContent = '', 2000); };
  document.getElementById('shCopy').onclick = () => {
    const txt = F.map(f => `■${f[1]}\n${data[f[0]] || ''}`).join('\n\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => msg('コピーしました'), () => msg('コピーできませんでした'));
  };
  document.getElementById('shClear').onclick = () => { if (!Object.values(data).some(Boolean)) return; data = {}; try { localStorage.removeItem(SK); } catch(e) {} v.querySelectorAll('[data-k]').forEach(el => el.value = ''); msg('白紙にしました'); };
}
})();
