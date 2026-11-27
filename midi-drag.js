/* =========================================================
   midi-drag.js  —  ポケットDTM → Cakewalk Sonar などのDAWへ
   トラックを「MIDIファイル」としてドラッグで書き出す部品
   ---------------------------------------------------------
   使い方（dtm.html の </body> の直前に1行）:
     <script src="midi-drag.js"><\/script>   ← 実際は \ を取って書く
   そのあと、アプリのデータを渡す関数を1つ登録する:
     PocketMidiDrag.mountButton({ getSong: () => ({ ... }) });

   getSong が返す形:
   {
     bpm: 120,
     tracks: [
       { name: "Piano", channel: 0, program: 0,
         notes: [ { pitch: 60, start: 0, dur: 1, vel: 100 }, ... ] },
       { name: "Drums", channel: 9, notes: [...] }   // ドラムは channel 9（=MIDI 10ch）
     ]
   }
   start / dur は「拍」単位（1 = 4分音符）。vel は 1〜127。
   ========================================================= */
(function (global) {
  "use strict";
  const TPQ = 480; // 書き出すMIDIの4分音符あたりのtick

  function vlq(n) {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  }
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u16 = n => [(n >> 8) & 255, n & 255];
  const ascii = s => Array.from(s, c => c.charCodeAt(0) & 0x7f);

  function chunk(type, data) {
    const out = ascii(type).concat(u32(data.length));
    for (let i = 0; i < data.length; i++) out.push(data[i]);
    return out;
  }
  function metaText(type, text) {
    const b = Array.from(new TextEncoder().encode(text || ""));
    return [0xff, type].concat(vlq(b.length), b);
  }

  function conductorTrack(bpm, num, den) {
    const mpqn = Math.round(60000000 / (bpm || 120));
    const d = [];
    d.push(0, ...metaText(0x03, "Pocket DTM"));
    d.push(0, 0xff, 0x51, 0x03, (mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255);
    d.push(0, 0xff, 0x58, 0x04, num || 4, Math.log2(den || 4) | 0, 24, 8);
    d.push(0, 0xff, 0x2f, 0x00);
    return chunk("MTrk", d);
  }

  function noteTrack(tr) {
    const ch = Math.max(0, Math.min(15, tr.channel | 0));
    const ev = [];
    (tr.notes || []).forEach(n => {
      const p = Math.max(0, Math.min(127, Math.round(n.pitch)));
      const v = Math.max(1, Math.min(127, Math.round(n.vel == null ? 100 : n.vel)));
      const on = Math.max(0, Math.round(n.start * TPQ));
      const off = Math.max(on + 1, Math.round((n.start + n.dur) * TPQ));
      ev.push({ t: on, k: 1, b: [0x90 | ch, p, v] });
      ev.push({ t: off, k: 0, b: [0x80 | ch, p, 0] }); // 同じ時刻なら off を先に
    });
    ev.sort((a, b) => a.t - b.t || a.k - b.k);

    const d = [];
    d.push(0, ...metaText(0x03, tr.name || "Track"));
    if (tr.program != null && ch !== 9) d.push(0, 0xc0 | ch, tr.program & 0x7f);
    let last = 0;
    ev.forEach(e => {
      const dv = vlq(e.t - last);
      for (let i = 0; i < dv.length; i++) d.push(dv[i]);
      d.push(e.b[0], e.b[1], e.b[2]);
      last = e.t;
    });
    d.push(0, 0xff, 0x2f, 0x00);
    return chunk("MTrk", d);
  }

  /** 曲データ → SMF(Type 1) のバイト列 */
  function buildMidi(song) {
    const tracks = (song.tracks || []).filter(t => t && t.notes && t.notes.length);
    const parts = [conductorTrack(song.bpm, song.beatsPerBar, song.beatUnit)];
    tracks.forEach(t => parts.push(noteTrack(t)));
    let all = chunk("MThd", [...u16(1), ...u16(parts.length), ...u16(TPQ)]);
    parts.forEach(p => { for (let i = 0; i < p.length; i++) all.push(p[i]); });
    return new Uint8Array(all);
  }

  function toBase64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function safeName(name) {
    return (String(name || "pocket-dtm").replace(/[\\/:*?"<>|\s]+/g, "_") || "pocket-dtm") + ".mid";
  }

  /** 要素をドラッグ元にする。Edge / Chrome ならデスクトップや DAW にファイルとして落とせる */
  function attachDrag(el, getSong, getName) {
    el.setAttribute("draggable", "true");
    el.addEventListener("dragstart", e => {
      const song = getSong();
      const bytes = buildMidi(song);
      const url = "data:audio/midi;base64," + toBase64(bytes);
      const file = safeName(getName ? getName() : song.title);
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("DownloadURL", "audio/midi:" + file + ":" + url);
      e.dataTransfer.setData("text/plain", file);
    });
  }

  /** クリックで .mid をダウンロード（ドラッグがうまくいかない時の保険） */
  function download(song, name) {
    const blob = new Blob([buildMidi(song)], { type: "audio/midi" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safeName(name || song.title);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /** 画面右下に「ドラッグで書き出し」チップを置く */
  function mountButton(opts) {
    const getSong = opts.getSong;
    const chip = document.createElement("div");
    chip.id = "pocket-midi-drag";
    chip.title = "Sonarのトラック画面へドラッグ／クリックで .mid を保存";
    chip.textContent = "🎹 MIDIをドラッグ";
    Object.assign(chip.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: 99999,
      padding: "10px 16px", borderRadius: "999px", cursor: "grab",
      font: "600 14px system-ui, sans-serif", color: "#fff",
      background: "linear-gradient(135deg,#ff71ce,#01cdfe)",
      boxShadow: "0 4px 16px rgba(185,103,255,.5)", userSelect: "none"
    }, opts.style || {});
    attachDrag(chip, getSong, opts.getName);
    chip.addEventListener("click", () => download(getSong(), opts.getName && opts.getName()));
    (opts.parent || document.body).appendChild(chip);
    return chip;
  }

  global.PocketMidiDrag = { buildMidi, attachDrag, download, mountButton, TPQ };
})(typeof window !== "undefined" ? window : globalThis);


/* ---------------------------------------------------------
   ポケットDTM Studio 用：曲データ(P)を読み取ってボタンを置く
   SONGモード → 曲全体／PATモード → 編集中のパターンだけ
   ミュート・ソロの状態に合わせて、聞こえているトラックだけ書き出す
   --------------------------------------------------------- */
(function () {
  "use strict";
  if (typeof P === "undefined" || typeof patById !== "function") return; // ポケットDTM以外では何もしない
  const Q = (typeof PPQ === "number") ? PPQ : 96;
  const hits = (tr, pat) => {
    try { const h = hitsOf(tr, pat); if (Array.isArray(h)) return h; } catch (e) {}
    return pat.notes.map(n => Object.assign({ base: n.t }, n));
  };
  const sw = t => { try { return swingOff(t) || 0; } catch (e) { return 0; } };
  const SYNTH_CH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];

  function pocketSong() {
    const solo = P.tracks.some(t => t.solo);
    const patOnly = (typeof songMode !== "undefined" && !songMode && typeof editP === "function") ? editP() : null;
    const song = { title: P.name, bpm: P.bpm, beatsPerBar: P.beats || 4, beatUnit: 4, tracks: [] };
    let si = 0;
    for (const tr of P.tracks) {
      if (tr.mute || (solo && !tr.solo)) continue;
      if (patOnly && patOnly.track !== tr.id) continue;
      const notes = [];
      const add = (n, at, end) => {
        const d = Math.max(1, Math.min(n.d || 24, end - at));
        notes.push({ pitch: n.p, start: (at + sw(n.base != null ? n.base : n.t)) / Q, dur: d / Q, vel: n.v != null ? n.v : 100 });
      };
      if (patOnly) {
        for (const n of hits(tr, patOnly)) add(n, n.t, Infinity);
      } else {
        for (const c of tr.clips) {
          const pat = patById(c.pat); if (!pat || pat.len <= 0) continue;
          const end = c.t + clipLen(c);
          for (let base = c.t; base < end; base += pat.len)
            for (const n of hits(tr, pat)) { const at = base + n.t; if (at < end) add(n, at, end); }
        }
      }
      if (!notes.length) continue;
      const drum = tr.kind === "drum";
      song.tracks.push({
        name: tr.name, notes,
        channel: drum ? 9 : SYNTH_CH[si++ % SYNTH_CH.length],
        program: drum ? null : (tr.params && tr.params.prog != null ? tr.params.prog : 0)
      });
    }
    if (!song.tracks.length && typeof toast === "function") toast("書き出せるノートがありません");
    return song;
  }
  function pocketName() {
    const p = (typeof songMode !== "undefined" && !songMode && typeof editP === "function") ? editP() : null;
    return (P.name || "pocket-dtm") + (p ? "_" + p.name : "");
  }
  const chip = PocketMidiDrag.mountButton({
    getSong: pocketSong, getName: pocketName,
    style: { bottom: "76px", right: "12px" }
  });
  chip.title = "SONG：曲全体／PAT：編集中のパターン を、Cakewalk Sonar のトラック画面へドラッグ（クリックで .mid 保存）";
  PocketMidiDrag.pocketSong = pocketSong;
})();
