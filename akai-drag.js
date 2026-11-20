/* akai-drag.js — 自作アプリの中身を「コードメモ」へドラッグ／送信できるようにする共通スクリプト
   使い方：各アプリの </body> の直前に1行
     <script src="akai-drag.js"></script>
   を足すだけ。カード・用語・句・音色・プリセットなどが自動でドラッグできるようになります。
   ・PC（Edge等）：つまんでコードメモの点線エリアへドラッグ
   ・スマホ：長押し → 「📌 メモへ送る」（同じサイト＝同じリポジトリに置いたコードメモに届く）
   ・特定の要素だけ確実に送りたい時は data-akai='{"type":"chord","name":"Cmaj7"}' のように書ける
*/
(function () {
  if (window.__akaiDrag) return; window.__akaiDrag = true;
  var APP = (document.title || location.pathname.split('/').pop() || 'アプリ').trim();
  var SEL = '[data-akai],[data-chord],.card,.item,.entry,.chip,.term,.word,.tile,.preset,.pad,.sound,.chord,.kigo,.tanka,.haiku,.ku,.metaphor,.effect,.fx,.tag,.cell,li,tr';
  var CHORD = /^[A-G][#b♯♭]?(maj|min|m|M|dim|aug|sus|add|[0-9]|[#b♯♭+\-()△Δø°,/A-G])*$/;

  function okEl(el) {
    if (!el || el === document.body) return false;
    if (el.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]')) return false;
    if (el.closest('.akai-send')) return false;
    var t = (el.innerText || '').trim();
    if (!t && !el.dataset.akai) return false;
    var tag = el.tagName;
    if ((tag === 'LI' || tag === 'TR') && t.length > 300) return false;
    return t.length < 2000;
  }
  function find(target) {
    var el = target && target.closest ? target.closest(SEL) : null;
    while (el && !okEl(el)) el = el.parentElement ? el.parentElement.closest(SEL) : null;
    return el;
  }
  function payload(el) {
    if (el.dataset.akai) { try { var o = JSON.parse(el.dataset.akai); o.app = o.app || APP; return o; } catch (e) {} }
    if (el.dataset.chord) return { app: APP, type: 'chord', name: el.dataset.chord };
    var text = (el.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    var h = el.querySelector('h1,h2,h3,h4,h5,strong,b,.title,.name,.nm,.label,.head,dt');
    var title = (h ? h.innerText : text.split('\n')[0]).trim().slice(0, 60);
    var first = text.split(/\s+/)[0] || '';
    if (text.length < 24 && CHORD.test(first) && text.split(/\s+/).length <= 2)
      return { app: APP, type: 'chord', name: first };
    return { app: APP, type: 'clip', title: title, text: text.slice(0, 4000) };
  }

  // PC：ドラッグ
  document.addEventListener('mouseover', function (e) {
    var el = find(e.target);
    if (el && !el.hasAttribute('draggable')) { el.setAttribute('draggable', 'true'); el.dataset.akaiAuto = '1'; }
  }, true);
  document.addEventListener('dragstart', function (e) {
    var el = find(e.target); if (!el || !e.dataTransfer) return;
    var p = payload(el);
    try {
      e.dataTransfer.setData('application/x-akai', JSON.stringify(p));
      // アプリ自身のドラッグ（ポケットDTM行きなど）が既にあれば text/plain は上書きしない
      if (!e.dataTransfer.getData('text/plain')) e.dataTransfer.setData('text/plain', p.type === 'chord' ? p.name : (p.text || p.title));
      e.dataTransfer.effectAllowed = 'copy';
    } catch (err) {}
  });

  // スマホ：長押し → 送る
  var btn = document.createElement('button');
  btn.className = 'akai-send';
  btn.textContent = '📌 メモへ送る';
  btn.style.cssText = 'position:fixed;z-index:99999;display:none;padding:8px 14px;border-radius:20px;border:none;background:#d9653b;color:#fff;font:600 14px system-ui;box-shadow:0 4px 14px #0004';
  var pending = null, timer = null, sx = 0, sy = 0;
  function attach() { if (!btn.parentNode) document.body.appendChild(btn); }
  document.addEventListener('touchstart', function (e) {
    var el = find(e.target); if (!el) return;
    var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    clearTimeout(timer);
    timer = setTimeout(function () {
      attach(); pending = el;
      btn.style.left = Math.max(8, Math.min(innerWidth - 150, sx - 60)) + 'px';
      btn.style.top = Math.max(8, sy - 60) + 'px';
      btn.style.display = 'block';
      el.style.outline = '2px solid #d9653b';
      setTimeout(function () { if (pending === el) hide(); }, 4000);
    }, 550);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (Math.abs(t.clientX - sx) + Math.abs(t.clientY - sy) > 12) clearTimeout(timer);
  }, { passive: true });
  document.addEventListener('touchend', function () { clearTimeout(timer); }, { passive: true });
  function hide() { btn.style.display = 'none'; if (pending) pending.style.outline = ''; pending = null; }
  btn.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (!pending) return;
    var p = payload(pending);
    try {
      var box = JSON.parse(localStorage.getItem('akai.inbox') || '[]');
      box.push(p); localStorage.setItem('akai.inbox', JSON.stringify(box));
      btn.textContent = '✓ 送りました';
    } catch (err) { btn.textContent = '送れませんでした'; }
    setTimeout(function () { btn.textContent = '📌 メモへ送る'; hide(); }, 900);
  });
  document.addEventListener('click', function (e) { if (e.target !== btn && pending) hide(); }, true);
})();
