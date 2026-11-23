(function () {
  'use strict';
  const S = window.STORY;
  const $ = (s) => document.querySelector(s);
  const app = $('#app'), feed = $('#feed'), chipsEl = $('#chips'), form = $('#composer'),
    input = $('#input'), sendBtn = $('#send'), subEl = $('#subtitle'), menuBtn = $('#menuBtn'),
    menu = $('#menu'), sheet = $('#sheet');

  if (!S || !S.scenes || !S.members) { feed.textContent = 'story.js failed to load.'; return; }

  const KEY = 'btsxmas.chat.v1', MAX = 400, GROUP_MS = 5 * 60 * 1000, CANCEL = { cancel: true };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function period(d) {
    const h = (d || new Date()).getHours();
    return h >= 5 && h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
  }
  function resolve(t) {
    if (t && typeof t === 'object') return String(t[period()] || t.default || '');
    return String(t == null ? '' : t);
  }
  const member = (id) => (has(S.members, id) ? S.members[id] : { name: id, badge: '?', color: '#8b93a7' });
  const SUB = Object.values(S.members).map((m) => m.name).join(', ');

  /* ---------- persistence ---------- */
  const fresh = () => ({ messages: [], progress: { scene: S.start, idx: 0, waiting: false, done: false } });
  const doneProgress = () => ({ scene: S.start, idx: 0, waiting: false, done: true });

  function sanitizeProgress(p) {
    if (!p || typeof p !== 'object' || p.done) return doneProgress();
    if (!has(S.scenes, p.scene)) return doneProgress();
    const steps = S.scenes[p.scene].steps || [];
    if (!Number.isInteger(p.idx) || p.idx < 0 || p.idx > steps.length) return doneProgress();
    if (p.waiting && !(steps[p.idx] && steps[p.idx].type === 'choices')) return doneProgress();
    return { scene: p.scene, idx: p.idx, waiting: !!p.waiting, done: false };
  }
  const newId = (ts) => ts.toString(36) + Math.random().toString(36).slice(2, 6);
  function cleanMsg(m) {
    if (!m || typeof m.who !== 'string' || typeof m.text !== 'string' || !Number.isFinite(m.ts)) return null;
    const o = { id: typeof m.id === 'string' && m.id.length < 40 ? m.id : newId(m.ts), who: m.who, text: m.text.slice(0, 1000), ts: m.ts };
    if (m.react === true) o.react = true;
    if (m.type === 'sticker' || m.type === 'voice') o.type = m.type;
    for (const [k, max] of [['sticker', 40], ['voiceId', 40], ['transcript', 600], ['audioSrc', 2000]]) {
      if (typeof m[k] === 'string' && m[k].length <= max) o[k] = m[k];
    }
    if (Number.isFinite(m.duration)) o.duration = m.duration;
    if (m.reply && typeof m.reply.who === 'string' && typeof m.reply.text === 'string') o.reply = { who: m.reply.who, text: m.reply.text.slice(0, 120) };
    return o;
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || !Array.isArray(d.messages)) return fresh();
      const messages = d.messages.map(cleanMsg).filter(Boolean).slice(-MAX);
      return messages.length ? { messages, progress: sanitizeProgress(d.progress) } : fresh();
    } catch (e) { return fresh(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, storyVersion: S.version, messages: state.messages, progress: state.progress })); } catch (e) {}
  }

  /* ---------- rendering ---------- */
  let state = load(), lastRender = null, lastDay = null, typingRow = null, stick = true, ignoreUntil = 0;

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function fmtDay(ts) {
    const k = dayKey(ts);
    if (k === dayKey(Date.now())) return 'Today';
    if (k === dayKey(Date.now() - 864e5)) return 'Yesterday';
    return new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  const nearBottom = () => feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
  function scrollBottom(smooth) {
    stick = true;
    requestAnimationFrame(() => {
      ignoreUntil = Date.now() + (smooth ? 450 : 60);
      feed.scrollTo({ top: feed.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    });
  }
  feed.addEventListener('scroll', () => { if (Date.now() >= ignoreUntil) stick = nearBottom(); }, { passive: true });
  const insert = (n) => feed.insertBefore(n, typingRow);

  function avatar(m) { const a = el('div', 'avatar', m.badge); a.setAttribute('aria-hidden', 'true'); return a; }

  const stickerById = (id) => (S.stickers || []).find((s) => s.id === id);
  const YOU = { name: 'You', color: '#7bd8a4' };

  function setReact(bw, on) {
    const cur = bw.querySelector('.react');
    if (on && !cur) { bw.appendChild(el('span', 'react', '💜')); bw.classList.add('reacted'); }
    else if (!on && cur) { cur.remove(); bw.classList.remove('reacted'); }
  }
  function quoteEl(r) {
    const m = r.who === 'me' ? YOU : member(r.who), q = el('div', 'quote');
    q.style.setProperty('--qc', m.color);
    q.append(el('b', null, m.name), el('span', null, r.text));
    return q;
  }
  function voiceData(msg) {
    const v = msg.voiceId && S.voices && has(S.voices, msg.voiceId) ? S.voices[msg.voiceId] : msg;
    return v && v.audioSrc ? v : null;
  }

  /* voice-note player: one clip at a time, audio is created inside the tap so mobile autoplay rules are met */
  let current = null;
  const fmtDur = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function voiceEl(v) {
    const box = el('div', 'voice'), row = el('div', 'vrow');
    const btn = el('button', 'vplay', '▶'), track = el('div', 'track'), fill = el('div', 'fill'), thumb = el('div', 'thumb');
    const time = el('span', 'vtime', fmtDur(v.duration));
    btn.type = 'button'; btn.setAttribute('aria-label', 'Play voice note');
    track.setAttribute('aria-label', 'Seek'); track.append(fill, thumb);
    row.append(btn, track, time);
    const tr = resolve(v.transcript);
    if (tr) {
      const tb = el('button', 'vtx', 'Aa'), tx = el('div', 'vtext', tr);
      tb.type = 'button'; tb.setAttribute('aria-label', 'Toggle transcript'); tx.hidden = true;
      tb.addEventListener('click', () => { tx.hidden = !tx.hidden; });
      row.appendChild(tb); box.append(row, tx);
    } else box.appendChild(row);

    let audio = null, playing = false, raf = 0, pending = 0, drag = false;
    const api = { pause };
    const total = () => (audio && isFinite(audio.duration) && audio.duration > 0 ? audio.duration : v.duration || 0);
    const frac = () => (audio && audio.readyState > 0 && total() ? audio.currentTime / total() : pending);
    function paint() {
      const f = Math.min(1, Math.max(0, frac()));
      fill.style.width = f * 100 + '%'; thumb.style.left = f * 100 + '%';
      time.textContent = fmtDur(f > 0 ? total() * (1 - f) : total());
    }
    function ensure() {
      if (audio) return audio;
      audio = new Audio(); audio.preload = 'metadata'; audio.src = v.audioSrc;
      audio.addEventListener('loadedmetadata', () => { if (pending && total()) audio.currentTime = pending * total(); paint(); });
      audio.addEventListener('ended', () => { pause(); audio.currentTime = 0; pending = 0; paint(); });
      audio.addEventListener('error', () => { pause(); btn.disabled = true; btn.textContent = '!'; time.textContent = 'Error'; });
      return audio;
    }
    function pause() {
      playing = false; cancelAnimationFrame(raf);
      if (audio) audio.pause();
      btn.textContent = '▶'; btn.setAttribute('aria-label', 'Play voice note');
      if (current === api) current = null;
      paint();
    }
    function tick() { paint(); if (playing) raf = requestAnimationFrame(tick); }
    btn.addEventListener('click', () => {
      if (playing) { pause(); return; }
      const a = ensure();
      if (current && current !== api) current.pause();
      current = api;
      const p = a.play();               // called synchronously inside the tap
      playing = true; btn.textContent = '❚❚'; btn.setAttribute('aria-label', 'Pause voice note'); tick();
      if (p && p.catch) p.catch(() => pause());
    });
    const seekTo = (e) => {
      const r = track.getBoundingClientRect(), f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (audio && audio.readyState > 0 && total()) audio.currentTime = f * total(); else { pending = f; ensure(); }
      paint();
    };
    track.addEventListener('pointerdown', (e) => { drag = true; try { track.setPointerCapture(e.pointerId); } catch (_) {} seekTo(e); });
    track.addEventListener('pointermove', (e) => { if (drag) seekTo(e); });
    ['pointerup', 'pointercancel'].forEach((t) => track.addEventListener(t, () => { drag = false; }));
    return box;
  }

  function addMessage(msg, animate) {
    const follow = stick || nearBottom();
    if (dayKey(msg.ts) !== lastDay) { insert(el('div', 'divider', fmtDay(msg.ts))); lastDay = dayKey(msg.ts); lastRender = null; }
    if (msg.who === 'system') { insert(el('div', 'note', msg.text)); lastRender = null; if (follow) scrollBottom(animate); return; }

    const me = msg.who === 'me', m = me ? null : member(msg.who);
    const grouped = !!lastRender && lastRender.who === msg.who && msg.ts - lastRender.ts < GROUP_MS;
    if (grouped) lastRender.timeEl.classList.add('hide');

    const row = el('div', 'row ' + (me ? 'me' : 'other') + (grouped ? ' grouped' : '') + (animate ? ' enter' : ''));
    if (!me) {
      row.style.setProperty('--c', m.color);
      row.appendChild(grouped ? el('div', 'spacer') : avatar(m));
    }
    const body = el('div', 'body');
    if (!me && !grouped) body.appendChild(el('div', 'name', m.name));
    row.dataset.id = msg.id || '';
    const line = el('div', 'line'), time = el('span', 'time', fmtTime(msg.ts)), bw = el('div', 'bw');
    const quote = msg.reply ? quoteEl(msg.reply) : null, st = msg.type === 'sticker' ? stickerById(msg.sticker) : null;
    if (st) {
      const s = el('div', 'sticker');
      s.append(el('div', 'se', st.emoji), el('div', 'sl', st.label));
      if (quote) bw.appendChild(quote);
      bw.appendChild(s);
    } else {
      const b = el('div', 'bubble'), v = msg.type === 'voice' ? voiceData(msg) : null;
      if (quote) b.appendChild(quote);
      if (v) { b.classList.add('vb'); b.appendChild(voiceEl(v)); }
      else b.appendChild(el('span', 'txt', msg.type === 'voice' ? '🎤 Voice note unavailable' : msg.text));
      bw.appendChild(b);
    }
    setReact(bw, !!msg.react);
    const rb = el('button', 'rb', '↩');
    rb.type = 'button'; rb.setAttribute('aria-label', 'Reply');
    bw.appendChild(rb);
    line.append(el('span', 'sw-ic', '↩'), bw, time);
    body.appendChild(line); row.appendChild(body);
    insert(row);
    lastRender = { who: msg.who, ts: msg.ts, timeEl: time };
    if (follow || me) scrollBottom(animate);
  }

  function showTyping(id, verb) {
    verb = verb || 'typing';
    hideTyping();
    const m = member(id), row = el('div', 'row other typing');
    row.style.setProperty('--c', m.color);
    const dots = el('div', 'bubble dots'); dots.append(el('i'), el('i'), el('i'));
    const body = el('div', 'body'); body.append(el('div', 'name', m.name + ' is ' + verb + '…'), dots);
    row.append(avatar(m), body);
    feed.appendChild(row); typingRow = row;
    subEl.textContent = m.name + ' is ' + verb + '…'; subEl.classList.add('typing');
    if (stick) scrollBottom(true);
  }
  function hideTyping() {
    if (typingRow) { typingRow.remove(); typingRow = null; }
    subEl.textContent = SUB; subEl.classList.remove('typing');
  }

  /* ---------- engine ---------- */
  let runId = 0, running = false, replyQueue = [];
  const lastPick = {};
  const wait = async (ms, tok) => { await new Promise((r) => setTimeout(r, ms)); if (tok !== runId) throw CANCEL; };
  const typingMs = (t) => Math.min(2600, Math.max(700, 450 + t.length * 32));

  function push(msg) {
    if (!msg.id) msg.id = newId(msg.ts);
    state.messages.push(msg);
    if (state.messages.length > MAX) state.messages.splice(0, state.messages.length - MAX);
    addMessage(msg, true);
  }
  async function say(line, tok) {
    let extra, verb = 'typing', ms;
    if (line.sticker) {
      const st = stickerById(line.sticker);
      if (!st) return;
      extra = { type: 'sticker', sticker: st.id, text: st.label }; ms = 900;
    } else if (line.voice) {
      const byId = typeof line.voice === 'string', v = byId ? (S.voices || {})[line.voice] : line.voice;
      if (!v || !v.audioSrc) return;
      extra = { type: 'voice', text: '🎤 Voice note' };
      if (byId) extra.voiceId = line.voice;
      else { extra.audioSrc = v.audioSrc; extra.duration = v.duration; extra.transcript = resolve(v.transcript) || undefined; }
      verb = 'recording'; ms = Math.min(3000, 1000 + (v.duration || 3) * 250);
    } else {
      const text = resolve(line.text);
      if (!text) return;
      extra = { text }; ms = typingMs(text);
    }
    await wait(line.pause != null ? line.pause : rand(260, 620), tok);
    showTyping(line.who, verb);
    await wait(line.typing != null ? line.typing : ms, tok);
    hideTyping();
    push(Object.assign({ who: line.who, ts: Date.now() }, extra));
  }
  function jump(to) {
    const p = state.progress, steps = (S.scenes[p.scene] || {}).steps || [];
    const i = steps.findIndex((s) => s.type === 'label' && s.id === to);
    if (i >= 0) p.idx = i;
    else if (has(S.scenes, to)) { p.scene = to; p.idx = 0; }
    else p.done = true;
  }
  const currentStep = () => { const p = state.progress; return has(S.scenes, p.scene) ? S.scenes[p.scene].steps[p.idx] : null; };

  async function playStep(tok) {
    const p = state.progress, step = currentStep();
    if (!step) { p.done = true; save(); return; }
    if (step.only && !step.only.includes(period())) { p.idx++; save(); return; }
    switch (step.type) {
      case 'say': await say(step, tok); p.idx++; save(); break;
      case 'goto': jump(step.to); save(); break;
      case 'choices': p.waiting = true; save(); break;
      case 'end': p.done = true; save(); break;
      default: p.idx++;
    }
  }

  async function pump() {
    if (running) return;
    running = true;
    const tok = runId;
    renderChips();
    try {
      while (tok === runId) {
        if (replyQueue.length) { for (const l of replyQueue.shift()) { await say(l, tok); save(); } continue; }
        const p = state.progress;
        if (p.done || p.waiting) break;
        await playStep(tok);
      }
    } catch (e) { if (e !== CANCEL) console.error(e); }
    finally { if (tok === runId) { running = false; hideTyping(); renderChips(); } }
  }

  /* ---------- replies ---------- */
  const reCache = {};
  const phraseRe = (s) => reCache[s] || (reCache[s] = new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&') + '(?![a-z0-9])', 'i'));
  function pickSeq(key, seqs) {
    if (!seqs || !seqs.length) return null;
    let i = Math.floor(Math.random() * seqs.length);
    if (seqs.length > 1 && i === lastPick[key]) i = (i + 1) % seqs.length;
    lastPick[key] = i;
    return seqs[i];
  }
  function findReply(raw) {
    const t = raw.toLowerCase().replace(/[’‘]/g, "'");
    const who = Object.keys(S.members).find((id) => (S.members[id].aliases || []).some((a) => phraseRe(a).test(t)));
    if (who && S.members[who].mention) return pickSeq('m:' + who, S.members[who].mention);
    let best = null, bestScore = 0;
    for (const kw of S.keywords || []) {
      let score = 0;
      for (const tr of kw.triggers || []) if (tr instanceof RegExp ? tr.test(t) : phraseRe(tr).test(t)) score++;
      if (score) { score += (kw.priority || 0) * 0.1; if (score > bestScore) { best = kw; bestScore = score; } }
    }
    return best ? pickSeq(best.id, best.replies) : pickSeq('fallback', S.fallbacks);
  }

  function handleChoice(opt) {
    const p = state.progress;
    if (!p.waiting || running) return;
    p.waiting = false;
    push({ who: 'me', text: opt.say || opt.label, ts: Date.now() });
    if (opt.goto) jump(opt.goto); else p.idx++;
    save(); pump();
  }
  function sendText(raw) {
    const text = String(raw).trim().slice(0, 500);
    if (!text) return;
    push(withReply({ who: 'me', text, ts: Date.now() })); save();
    const reply = findReply(text);
    if (reply) replyQueue.push(reply);
    pump();
  }

  function sendSticker(id) {
    const st = stickerById(id);
    if (!st) return;
    setTray(false);
    push(withReply({ who: 'me', type: 'sticker', sticker: st.id, text: st.label, ts: Date.now() })); save();
    const seq = pickSeq('st:' + st.mood, (S.stickerReplies || {})[st.mood]) || pickSeq('fallback', S.fallbacks);
    if (seq) replyQueue.push(seq);
    pump();
  }

  function renderChips() {
    chipsEl.replaceChildren();
    if (!running) {
      const p = state.progress, step = currentStep();
      let items = [];
      if (p.waiting && step && step.type === 'choices') {
        items = (step.options || []).filter((o) => !o.only || o.only.includes(period()))
          .map((o) => ({ label: o.label, choice: true, run: () => handleChoice(o) }));
      } else if (p.done) {
        items = (S.suggestions || []).map((s) => ({ label: s, run: () => sendText(s) }));
      }
      for (const it of items) {
        const b = el('button', 'chip' + (it.choice ? ' choice' : ''), it.label);
        b.type = 'button'; b.addEventListener('click', it.run); chipsEl.appendChild(b);
      }
    }
    if (stick) scrollBottom(false);
  }

  /* ---------- UI wiring ---------- */
  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    sendBtn.disabled = !input.value.trim();
  }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendText(input.value); input.value = ''; autosize();
  });
  // keep the keyboard open when tapping send or a chip
  [sendBtn, chipsEl, $('#stickerBtn'), $('#tray'), $('#cancelReply')].forEach((n) => n.addEventListener('pointerdown', (e) => { if (document.activeElement === input) e.preventDefault(); }));
  input.addEventListener('focusin', () => app.classList.add('kb'));
  input.addEventListener('focusout', () => app.classList.remove('kb'));

  const vv = window.visualViewport;
  function fit() {
    if (!vv) return;
    app.style.height = vv.height + 'px';
    app.style.transform = 'translateY(' + vv.offsetTop + 'px)';
    if (stick) scrollBottom(false);
  }
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }

  const setMenu = (open) => { menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setMenu(false); });
  $('#resetBtn').addEventListener('click', () => { setMenu(false); sheet.hidden = false; });
  $('#cancelReset').addEventListener('click', () => { sheet.hidden = true; });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { sheet.hidden = true; setMenu(false); } });
  $('#confirmReset').addEventListener('click', () => {
    sheet.hidden = true;
    runId++; running = false; replyQueue = [];
    if (current) current.pause();
    clearReply(); setTray(false); lastTap = { id: '', t: 0 };
    try { localStorage.removeItem(KEY); } catch (e) {}
    state = fresh(); lastRender = null; lastDay = null; typingRow = null;
    feed.replaceChildren(); hideTyping(); stick = true;
    begin();
  });

  /* ---------- reply bar ---------- */
  const replyBar = $('#replybar'), tray = $('#tray'), stBtn = $('#stickerBtn');
  let replyTo = null;
  const snippet = (m) => (m.type === 'sticker' ? 'Sticker · ' + m.text : m.type === 'voice' ? '🎤 Voice note' : m.text.slice(0, 90));
  function setReply(id) {
    const m = state.messages.find((x) => x.id === id);
    if (!m || m.who === 'system') return;
    const who = m.who === 'me' ? YOU : member(m.who);
    replyTo = { who: m.who, text: snippet(m) };
    replyBar.style.setProperty('--qc', who.color);
    $('#rqName').textContent = 'Replying to ' + who.name; $('#rqText').textContent = replyTo.text;
    replyBar.hidden = false; setTray(false);
    input.focus({ preventScroll: true });
    if (stick) scrollBottom(false);
  }
  function clearReply() { replyTo = null; replyBar.hidden = true; }
  function withReply(msg) { if (replyTo) { msg.reply = replyTo; clearReply(); } return msg; }
  $('#cancelReply').addEventListener('click', clearReply);
  feed.addEventListener('click', (e) => { const rb = e.target.closest('.rb'); if (rb) setReply(rb.closest('.row').dataset.id); });

  /* ---------- sticker tray ---------- */
  function setTray(open) {
    tray.hidden = !open; stBtn.setAttribute('aria-expanded', String(open)); stBtn.classList.toggle('on', open);
    if (open && !tray.childElementCount) {
      for (const st of S.stickers || []) {
        const b = el('button', 'st'); b.type = 'button'; b.dataset.mood = st.mood;
        b.setAttribute('aria-label', 'Send sticker: ' + st.label);
        b.append(el('span', 'se', st.emoji), el('span', 'sl', st.label));
        b.addEventListener('click', () => sendSticker(st.id));
        tray.appendChild(b);
      }
    }
    if (stick) scrollBottom(false);
  }
  stBtn.addEventListener('click', () => setTray(tray.hidden));

  /* ---------- gestures: double-tap = 💜, swipe right = reply (vertical scroll stays native via touch-action: pan-y) ---------- */
  let sw = null, lastTap = { id: '', t: 0 };
  function toggleReact(id, bw) {
    const m = state.messages.find((x) => x.id === id);
    if (!m) return;
    if (m.react) delete m.react; else m.react = true;
    setReact(bw, !!m.react); save();
  }
  feed.addEventListener('pointerdown', (e) => {
    const bw = e.target.closest('.bw');
    if (!bw || e.target.closest('.track,button,.vtext')) { sw = null; return; }
    const row = bw.closest('.row');
    sw = { bw, id: row.dataset.id, body: row.querySelector('.body'), ic: row.querySelector('.sw-ic'),
      x: e.clientX, y: e.clientY, dx: 0, locked: false, moved: false, mouse: e.pointerType === 'mouse' };
  });
  feed.addEventListener('pointermove', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) sw.moved = true;
    if (sw.mouse) return;
    if (!sw.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }   // vertical: let the feed scroll
      if (dx > 10 && dx > Math.abs(dy) * 1.2) { sw.locked = true; sw.body.style.transition = 'none'; try { feed.setPointerCapture(e.pointerId); } catch (_) {} }
      else return;
    }
    sw.dx = Math.max(0, Math.min(dx, 140));
    const t = Math.min(sw.dx * 0.55, 66);
    sw.body.style.transform = 'translateX(' + t + 'px)';
    sw.ic.style.opacity = Math.min(1, t / 44);
    sw.ic.style.transform = 'scale(' + (0.6 + Math.min(0.4, t / 110)) + ')';
  });
  function endGesture(cancel) {
    const s = sw; sw = null;
    if (!s) return;
    if (s.locked) {
      s.body.style.transition = 'transform .2s ease'; s.body.style.transform = ''; s.ic.style.opacity = ''; s.ic.style.transform = '';
      if (!cancel && s.dx >= 70) { if (navigator.vibrate) navigator.vibrate(8); setReply(s.id); }
      return;
    }
    if (cancel || s.moved) return;
    const now = Date.now();
    if (lastTap.id === s.id && now - lastTap.t < 320) { lastTap = { id: '', t: 0 }; toggleReact(s.id, s.bw); }
    else lastTap = { id: s.id, t: now };
  }
  feed.addEventListener('pointerup', () => endGesture(false));
  feed.addEventListener('pointercancel', () => endGesture(true));

  /* ---------- home-screen icon + manifest (generated, so no extra files) ---------- */
  function homeScreen() {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 512, 512);
      g.addColorStop(0, '#6e2323'); g.addColorStop(1, '#1b5640');
      x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      x.font = '300px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🎄', 256, 276);
      const url = c.toDataURL('image/png');
      $('#touchIcon').href = url;
      const manifest = {
        name: S.groupName, short_name: 'Xmas Chat', display: 'standalone',
        start_url: location.href.split('#')[0], scope: new URL('.', location.href).href,
        background_color: '#0e1014', theme_color: '#14171d',
        icons: [{ src: url, sizes: '512x512', type: 'image/png' }]
      };
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
      document.head.appendChild(link);
    } catch (e) {}
  }

  /* ---------- start ---------- */
  function begin() {
    if (!state.messages.length) {
      push({ who: 'system', text: S.joinNote || 'Chat started', ts: Date.now() });
      save();
    }
    pump();
  }
  function init() {
    $('#title').textContent = S.groupName; $('#gavatar').textContent = S.groupEmoji; subEl.textContent = SUB;
    homeScreen(); fit(); autosize();
    for (const m of state.messages) addMessage(m, false);
    scrollBottom(false);

    const last = state.messages[state.messages.length - 1];
    if (last && state.progress.done && Date.now() - last.ts > 4 * 3600 * 1000) {
      const seq = pickSeq('back', (S.welcomeBack || {})[period()]);
      if (seq) replyQueue.push(seq);
    }
    begin();
  }
  init();
})();
