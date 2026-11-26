'use strict';
/* Nguyên ơi học đi: học từ vựng theo chủ đề (Thẻ, Đoạn văn, Đặt câu, Nghe chép, Shadowing, Đọc báo, Nhật ký, Báo cáo tuần).
   Dữ liệu lưu trong localStorage (khóa len-trinh.v3). Không cần mạng, trừ nút "Bổ sung IPA tự động". */
const KEY = 'len-trinh.v3', DAYS = [0, 1, 3, 7, 14, 30, 60];
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const fmt = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const today = () => fmt(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d); };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ns = () => ({ b: 0, due: null, lapses: 0, reps: 0 });
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chu-de';

/* ---------- Dữ liệu ---------- */
const blank = () => ({ topics: [], noted: [], articles: [], artRead: {}, journal: {}, dict: {}, log: {}, day: {}, shadow: {}, settings: { newPerDay: 15, newSent: 8, rate: 0.85, voice: '', goalDays: 5 } });
function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && Array.isArray(j.topics)) { const b = blank(); return Object.assign(b, j, { settings: Object.assign(b.settings, j.settings || {}) }); } } catch (e) { } return blank(); }
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Không lưu được: bộ nhớ trình duyệt bị chặn hoặc đầy. Hãy xuất sao lưu.'); } }
const dayRec = () => (S.day[today()] = S.day[today()] || { new: 0, reviews: 0, sent: 0, shadow: 0, ok: 0, hard: 0, miss: 0, dict: 0, journal: 0 });
const ui = { view: 'home', tid: 'all', cs: null, ss: null, pv: { pi: 0, ipa: true, vi: true, hide: false }, sh: { pi: 0, li: 0, res: null, rec: false, hide: false }, tok: 0, msg: null, open: {}, pick: new Set(), sfilter: '', ipa: { text: '', acc: 'uk', res: null }, nfilter: '', lk: {}, dc: { src: 'p', pi: 0, aid: '', i: 0, res: null, val: '', hint: 0, done: false }, jr: { mood: '', text: '', open: null }, rp: { off: 0 }, nw: { id: null, mode: 'all', open: {}, paste: false } };
const selTopics = tid => tid === 'all' ? S.topics : S.topics.filter(t => t.id === tid);

/* ---------- Tiện ích: so khớp, khoảng cách, diff ---------- */
const nz = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CONTR = [[/won't/g, 'will not'], [/can't/g, 'can not'], [/cannot/g, 'can not'], [/n't/g, ' not'], [/'m\b/g, ' am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/\bit's\b/g, 'it is'], [/\bhe's\b/g, 'he is'], [/\bshe's\b/g, 'she is'], [/\bthat's\b/g, 'that is'], [/\bthere's\b/g, 'there is'], [/\bwhat's\b/g, 'what is'], [/\blet's\b/g, 'let us']];
const nzs = s => { let x = String(s).toLowerCase().replace(/[’‘]/g, "'"); CONTR.forEach(([a, b]) => x = x.replace(a, b)); return x.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }
function judgeWord(input, answers) { const x = nz(input); if (!x) return 'no'; if (answers.some(a => nz(a) === x)) return 'yes'; if (x.length > 3 && answers.some(a => lev(nz(a), x) <= 1)) return 'near'; return 'no'; }
function lcsDiff(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { ops.push({ w: a[i], t: 'ok' }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ w: a[i++], t: 'miss' }); else ops.push({ w: b[j++], t: 'extra' }); }
  while (i < n) ops.push({ w: a[i++], t: 'miss' }); while (j < m) ops.push({ w: b[j++], t: 'extra' });
  return { ops, ratio: (n + m) ? 2 * dp[0][0] / (n + m) : 1, hit: dp[0][0] };
}
const diffHtml = ops => ops.map(o => o.t === 'ok' ? esc(o.w) : o.t === 'miss' ? `<span class="miss" title="thiếu hoặc sai">${esc(o.w)}</span>` : `<del class="extra" title="thừa">${esc(o.w)}</del>`).join(' ');
function clozeOf(w) {
  if (!w.ex) return null;
  const re = new RegExp('\\b' + reEsc(w.w) + '(?:s|es|ed|d|ing)?\\b', 'i'), m = w.ex.match(re);
  return m ? { text: w.ex.replace(re, '_____'), ans: m[0] } : null;
}

/* ---------- SRS (hộp Leitner, 6 hộp: 1, 3, 7, 14, 30, 60 ngày) ---------- */
function nextBox(s, g) { return g === 0 ? 1 : g === 1 ? Math.max(1, s.b) : Math.min(6, s.b + (g === 2 ? 1 : 2)); }
function previewDays(s, g) { if (g === 0) return 1; const d = DAYS[nextBox(s, g)]; return g === 1 ? Math.max(1, Math.round(d / 2)) : d; }
function applyGrade(s, g, kind) {
  const wasNew = s.b === 0, d = previewDays(s, g); s.reps++; if (g === 0) s.lapses++;
  s.b = nextBox(s, g); s.due = addDays(today(), d);
  const r = dayRec(); if (wasNew) r[kind === 'sent' ? 'sentNew' : 'new'] = (r[kind === 'sent' ? 'sentNew' : 'new'] || 0) + 1;
  if (kind === 'sent') r.sent++; else r.reviews++;
  if (g >= 2) r.ok = (r.ok || 0) + 1; else if (g === 1) r.hard = (r.hard || 0) + 1; else r.miss = (r.miss || 0) + 1;
  S.log[today()] = (S.log[today()] || 0) + 1; save();
}
const shortTense = t => { const [a, b] = String(t).split(' · '); return b && /^(Động từ khuyết thiếu|Cấu trúc bắt buộc|Nghĩa vụ|Lời rủ rê|Động từ tri giác)$/.test(a) ? b.replace(/\s*\(.*?\)/g, '').trim() : a; };
const dueTxt = d => d === 1 ? '1 ngày' : d + ' ngày';
function streak() { let n = 0, d = today(); if (!S.log[d]) d = addDays(d, -1); while (S.log[d] > 0) { n++; d = addDays(d, -1); } return n; }

function cardsOf(tp) { const out = []; tp.words.forEach(w => { w.srs = w.srs || {}; const ty = ['r', 'p']; if (clozeOf(w)) ty.push('c'); ty.forEach(t => out.push({ tp, w, ty: t, s: w.srs[t] || (w.srs[t] = ns()) })); }); return out; }
function cardQueue(tid, extra = 0) {
  const t0 = today(), due = [], newR = [], newO = [];
  selTopics(tid).forEach(tp => cardsOf(tp).forEach(c => { if (c.s.b > 0) { if (c.s.due <= t0) due.push(c); } else if (c.ty === 'r') newR.push(c); else if (c.w.srs.r.b > 0) newO.push(c); }));
  const budget = Math.max(0, S.settings.newPerDay - (dayRec().new || 0)) + extra;
  return { due: shuffle(due), fresh: [...newO, ...newR].slice(0, budget), totalNew: newO.length + newR.length };
}
const sentsOf = tp => tp.sentences.map(s => (s.srs = s.srs || ns(), { tp, q: s, s: s.srs }));
function sentQueue(tid, extra = 0) {
  const t0 = today(), due = [], fresh = [];
  selTopics(tid).forEach(tp => sentsOf(tp).forEach(c => { if (c.s.b > 0) { if (c.s.due <= t0) due.push(c); } else fresh.push(c); }));
  const budget = Math.max(0, S.settings.newSent - (dayRec().sentNew || 0)) + extra;
  return { due: shuffle(due), fresh: fresh.slice(0, budget), totalNew: fresh.length };
}
function counts() { const c = cardQueue('all'), s = sentQueue('all'); return { cards: c.due.length + c.fresh.length, sents: s.due.length + s.fresh.length }; }

/* ---------- Giọng nói ---------- */
const tts = 'speechSynthesis' in window;
const voiceScore = v => (/natural|neural|online/i.test(v.name) ? 100 : 0) + (/premium|enhanced|siri/i.test(v.name) ? 60 : 0) + (/google/i.test(v.name) ? 40 : 0) + (/aria|jenny|guy|sonia|libby|ryan|samantha|ava|allison|serena|daniel/i.test(v.name) ? 20 : 0) + (/en-US|en-GB/i.test(v.lang) ? 10 : 0) - (/zira|david|mark|hazel|george/i.test(v.name) && !/natural|online/i.test(v.name) ? 30 : 0);
function pickVoice() { if (!tts) return null; const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (S.settings.voice) { const v = vs.find(v => v.name === S.settings.voice); if (v) return v; } return [...vs].sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null; }
function speak(text, rate) {
  return new Promise(res => {
    if (!tts) { toast('Trình duyệt này không hỗ trợ đọc tiếng Anh. Hãy dùng Chrome hoặc Edge.'); return res(); }
    const u = new SpeechSynthesisUtterance(text), v = pickVoice(); u.lang = v ? v.lang : 'en-US'; u.rate = rate || S.settings.rate; if (v) u.voice = v;
    u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
  });
}
const stopSpeak = () => { ui.tok++; if (tts) speechSynthesis.cancel(); if (ui.rec) { try { ui.rec.abort(); } catch (e) { } } document.querySelectorAll('.line.playing').forEach(x => x.classList.remove('playing')); const b = $('#echo'); if (b) b.textContent = ''; };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function listen() {
  return new Promise((res, rej) => {
    if (!SR) return rej('unsupported');
    const r = new SR(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1; let got = false;
    r.onresult = e => { got = true; res(e.results[0][0].transcript); };
    r.onerror = e => rej(e.error || 'error'); r.onend = () => { if (!got) rej('no-speech'); };
    ui.rec = r; try { r.start(); } catch (e) { rej('error'); }
  });
}
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); }

/* ---------- Nhập dữ liệu ---------- */
function importText(txt) {
  txt = (txt || '').replace(/^\uFEFF/, '').trim(); if (!txt) return { err: 'Chưa có nội dung để nhập.' };
  txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (txt[0] === '{' || txt[0] === '[') { try { return importPack(JSON.parse(txt)); } catch (e) { return { err: 'File JSON bị lỗi cú pháp: ' + e.message + '. Hãy nhờ Claude gửi lại file.' }; } }
  return importRaw(txt);
}
function importPack(j) {
  let list = Array.isArray(j) ? j : j.topics ? j.topics : (j.words ? [j] : null);
  const arts = !Array.isArray(j) && Array.isArray(j.articles) ? j.articles : [];
  if ((!list || !list.length) && !arts.length) return { err: 'Không thấy chủ đề hay bài báo nào. File cần có mục "topics" (hoặc "words") hoặc "articles".' };
  list = list || [];
  const rep = { topics: 0, wNew: 0, wUp: 0, pas: 0, sen: 0, wr: 0, art: 0, warn: [] };
  arts.forEach(a => {
    const paragraphs = (Array.isArray(a.paragraphs) ? a.paragraphs : []).map(par => (Array.isArray(par) ? par : []).map(s => ({ en: String(s.en || '').trim(), vi: String(s.vi || '').trim() })).filter(s => s.en)).filter(par => par.length);
    if (!a.title || !paragraphs.length) { rep.warn.push('Bỏ qua một bài báo thiếu tiêu đề hoặc nội dung.'); return; }
    const id = a.id ? slug(a.id) : slug(a.title), o = { id, title: String(a.title), source: a.source || '', level: a.level || '', summary: a.summary || '', tags: Array.isArray(a.tags) ? a.tags : [], paragraphs }, i = S.articles.findIndex(x => x.id === id);
    if (i >= 0) S.articles[i] = o; else S.articles.push(o); rep.art++;
  });
  list.forEach(t => {
    if (!t || !Array.isArray(t.words) || !t.words.length) { rep.warn.push('Bỏ qua một chủ đề vì không có "words".'); return; }
    const name = String(t.name || 'Chủ đề').trim(), id = t.id ? slug(t.id) : slug(name);
    let tp = S.topics.find(x => x.id === id || x.name.toLowerCase() === name.toLowerCase());
    if (!tp) { tp = { id, name, created: today(), words: [], passages: [], sentences: [], writings: [] }; S.topics.push(tp); } else tp.name = name;
    tp.writings = tp.writings || []; rep.topics++;
    (t.writings || []).forEach(w => { const ss = (w.sentences || []).map(x => ({ vi: String(x.vi || '').trim(), en: String(x.en || '').trim(), alt: Array.isArray(x.alt) ? x.alt : [] })).filter(x => x.vi && x.en); if (!w.title || !ss.length) return; const i = tp.writings.findIndex(x => x.title === w.title); if (i >= 0) tp.writings[i] = { title: w.title, sentences: ss }; else tp.writings.push({ title: w.title, sentences: ss }); rep.wr++; });
    t.words.forEach(w => {
      const word = String(w.w || w.word || '').trim(); if (!word) return;
      const o = { w: word, ipa: String(w.ipa || '').replace(/^\/|\/$/g, '').trim(), pos: w.pos || '', vi: w.vi || w.meaning || '', ex: w.ex || '', exVi: w.exVi || '', coll: Array.isArray(w.coll) ? w.coll : [] };
      const old = tp.words.find(x => x.w.toLowerCase() === word.toLowerCase());
      if (old) { Object.assign(old, o); rep.wUp++; } else { o.srs = { r: ns(), p: ns() }; tp.words.push(o); rep.wNew++; }
      if (!o.vi) rep.warn.push(`Từ "${word}" chưa có nghĩa tiếng Việt.`);
    });
    (t.passages || []).forEach(p => {
      const lines = (p.lines || []).map(l => ({ en: String(l.en || '').trim(), vi: l.vi || '', ipa: String(l.ipa || '').replace(/^\/|\/$/g, '').trim() })).filter(l => l.en);
      if (!lines.length) return; const title = p.title || 'Đoạn văn';
      const i = tp.passages.findIndex(x => x.title === title); if (i >= 0) tp.passages[i] = { title, lines }; else tp.passages.push({ title, lines }); rep.pas++;
    });
    (t.sentences || []).forEach(s => {
      const en = (Array.isArray(s.en) ? s.en : [s.en]).filter(Boolean); if (!s.vi || !en.length) { rep.warn.push('Bỏ qua một câu đặt câu thiếu "vi" hoặc "en".'); return; }
      const old = tp.sentences.find(x => x.vi === s.vi), o = { vi: s.vi, en, uses: s.uses || [], note: s.note || '', tense: s.tense || '', alts: (Array.isArray(s.alts) ? s.alts : []).map(x => ({ vi: String(x.vi || '').trim(), en: (Array.isArray(x.en) ? x.en : [x.en]).filter(Boolean), tense: x.tense || '' })).filter(x => x.vi && x.en.length) };
      if (old) Object.assign(old, o); else { o.srs = ns(); tp.sentences.push(o); } rep.sen++;
    });
    if (tp.passages.length) { const all = tp.passages.flatMap(p => p.lines.map(l => l.en)).join(' ').toLowerCase(), miss = tp.words.filter(w => !new RegExp('\\b' + reEsc(w.w.toLowerCase()) + '(s|es|ed|d|ing)?\\b').test(all)); if (miss.length) rep.warn.push(`Các đoạn văn chưa dùng: ${miss.map(w => w.w).join(', ')}.`); }
    if (!tp.passages.length) rep.warn.push(`Chủ đề "${name}" chưa có đoạn văn.`);
  });
  save(); return { rep };
}
function importRaw(txt) {
  let name = '', tp = null; const rep = { topics: 0, wNew: 0, wUp: 0, pas: 0, sen: 0, warn: [], raw: true }, made = [];
  const ensure = () => { if (tp) return tp; const nm = name || ('Chủ đề ' + today()); tp = S.topics.find(x => x.name.toLowerCase() === nm.toLowerCase()); if (!tp) { tp = { id: slug(nm) + '-' + Math.random().toString(36).slice(2, 5), name: nm, created: today(), words: [], passages: [], sentences: [] }; S.topics.push(tp); } if (!made.includes(tp)) { made.push(tp); rep.topics++; } return tp; };
  txt.split(/\r?\n/).forEach(raw => {
    const l = raw.trim(); if (!l) return;
    if (/^#+\s*/.test(l)) { name = l.replace(/^#+\s*/, '').trim(); tp = null; return; }
    let w, ipa = '', pos = '', vi = '';
    const parts = l.split('|').map(x => x.trim());
    if (parts.length >= 4) [w, ipa, pos, vi] = parts; else { const m = l.match(/^(.+?)\s*(?:\t|\s[-–—:=]\s|\s?[:=]\s|\s*\|\s*)\s*(.+)$/); if (m) { w = m[1].trim(); vi = m[2].trim(); } else { w = l; } }
    if (!w) return; const t = ensure(); const old = t.words.find(x => x.w.toLowerCase() === w.toLowerCase());
    if (old) { if (vi) old.vi = vi; if (ipa) old.ipa = ipa.replace(/^\/|\/$/g, ''); if (pos) old.pos = pos; rep.wUp++; } else { t.words.push({ w, ipa: ipa.replace(/^\/|\/$/g, ''), pos, vi, ex: '', exVi: '', coll: [], srs: { r: ns(), p: ns() } }); rep.wNew++; }
    if (!vi && !old) rep.warn.push(`Từ "${w}" chưa có nghĩa. Thẻ vẫn tạo được nhưng bạn nên bổ sung.`);
  });
  if (!rep.wNew && !rep.wUp) return { err: 'Không đọc được từ nào. Mỗi dòng viết dạng "word - nghĩa tiếng Việt", chủ đề bắt đầu bằng "# Tên chủ đề".' };
  save(); return { rep };
}
const REP_FMT = '{"format":"lentrinh-pack","version":1,"topics":[{"id":"ten-ngan-gon","name":"Tên chủ đề","words":[{"w":"router","ipa":"ˈruːtər","pos":"n","vi":"bộ định tuyến","ex":"The router is in the server room.","exVi":"Bộ định tuyến nằm trong phòng máy chủ.","coll":["configure a router"]}],"passages":[{"title":"Tiêu đề","lines":[{"en":"Câu tiếng Anh.","vi":"Bản dịch.","ipa":"IPA cả câu"}]}],"sentences":[{"vi":"Câu tiếng Việt để dịch","en":["Đáp án 1","Đáp án 2"],"uses":["từ cần dùng"],"tense":"Quá khứ đơn · S + V2/V-ed","note":"Giải thích ngắn"}]}]}';
function claudePrompt(listText) {
  return `Hãy soạn gói bài cho web học từ vựng của tôi từ danh sách bên dưới. Trả về DUY NHẤT một khối JSON (không thêm lời dẫn) theo đúng mẫu:\n${REP_FMT}\n\nYêu cầu:\n- Tự phân nhóm từ thành các chủ đề hợp lý (6 đến 15 từ mỗi chủ đề); mỗi từ có IPA (kiểu Anh-Mỹ, không có dấu gạch chéo), từ loại, nghĩa, 1 câu ví dụ có từ đó và bản dịch.\n- Mỗi chủ đề có 1 đoạn văn 6 đến 10 câu, trình độ A2 đến B1, dùng ĐỦ mọi từ của chủ đề, mỗi câu kèm bản dịch tiếng Việt tự nhiên và IPA cả câu.\n- Mỗi chủ đề có 8 đến 10 câu tiếng Việt để dịch sang tiếng Anh, mỗi câu dùng 1 đến 2 từ của chủ đề, có 1 đến 3 đáp án chấp nhận được, "tense" gợi ý thì hoặc cấu trúc cần dùng (ghi tên thì và công thức ngắn, ví dụ "Quá khứ đơn · S + V2/V-ed"), và "note" giải thích điểm ngữ pháp.\n- Chỉ dùng từ trong danh sách làm từ mục tiêu, không bịa nghĩa.\n\nDanh sách từ:\n${listText}`;
}
async function fillIpa() {
  const words = S.topics.flatMap(t => t.words).filter(w => !w.ipa && !/\s/.test(w.w)); if (!words.length) return toast('Mọi từ đã có IPA.');
  toast(`Đang tra IPA cho ${words.length} từ…`); let n = 0;
  for (const w of words) {
    try { const r = await fetch('https://api.dictionaryapi.dev/v2/entries/en/' + encodeURIComponent(w.w.toLowerCase())); if (!r.ok) continue; const j = await r.json(), e = j[0], ph = (e.phonetic || (e.phonetics || []).map(p => p.text).find(Boolean) || ''); if (ph) { w.ipa = ph.replace(/^\/|\/$/g, ''); n++; } if (!w.pos && e.meanings && e.meanings[0]) w.pos = e.meanings[0].partOfSpeech.slice(0, 4); } catch (e) { break; }
  }
  save(); ui.msg = { text: n ? `Đã bổ sung IPA cho ${n}/${words.length} từ.` : 'Không tra được IPA (cần có mạng). Bạn có thể nhờ Claude soạn IPA.', kind: n ? '' : 'warn' }; render();
}

/* ---------- Giao diện chung ---------- */
const VIEWS = {};
function nav() {
  const c = counts(), G = [['Học', [['home', '🏠', 'Chủ đề', 0], ['cards', '🃏', 'Thẻ', c.cards], ['passage', '📖', 'Đoạn văn', 0], ['sent', '✍️', 'Đặt câu', c.sents]]], ['Luyện kỹ năng', [['dict', '🎧', 'Nghe chép', 0], ['shadow', '🗣️', 'Shadowing', 0], ['news', '📰', 'Đọc báo', 0], ['journal', '📔', 'Nhật ký', 0]]], ['Công cụ', [['ipa', '🔤', 'Tra IPA', 0], ['noted', '📒', 'Đã note', S.noted.length], ['report', '📊', 'Báo cáo tuần', 0]]]];
  $('#nav').innerHTML = G.map(g => `<div class="navgroup">${g[0]}</div>` + g[1].map(i => `<button data-act="go" data-v="${i[0]}" class="${ui.view === i[0] ? 'on' : ''}" ${ui.view === i[0] ? 'aria-current="page"' : ''}><span class="ni">${i[1]}</span>${i[2]}${i[3] ? `<span class="badge">${i[3]}</span>` : ''}</button>`).join('')).join('');
  const sf = $('#sidefoot'); if (sf) { const st = streak(); sf.innerHTML = `<div class="streakcard"><span class="fl">${st ? '🔥' : '🌱'}</span><div><b>${st}</b><span>${st ? 'ngày học liên tiếp' : 'Học hôm nay để bắt đầu chuỗi'}</span></div></div><button class="themebtn" data-act="theme">🌓 Đổi giao diện sáng / tối</button>`; }
}
function render() { $('#app').innerHTML = VIEWS[ui.view](); nav(); const f = $('#ans') || $('#sans') || $('#dans') || $('#jtx'); if (f && !ui.noFocus) f.focus(); if (ui.view === 'journal') jRender(); }
function topicSelect(only) {
  const list = only ? S.topics.filter(only) : S.topics;
  return `<label class="small muted" for="tsel">Chủ đề</label> <select id="tsel" data-chg="tsel">${only ? '' : '<option value="all">Tất cả chủ đề</option>'}${list.map(t => `<option value="${t.id}" ${ui.tid === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
}
function empty(msg) { return `<div class="panel"><h2>Chưa có dữ liệu</h2><p>${msg}</p><button class="btn pri" data-act="go" data-v="home">Về trang Chủ đề để nhập từ vựng</button></div>`; }
const spk = (t, extra = '') => `<button class="ico" data-act="say" data-t="${esc(t)}" aria-label="Nghe" title="Nghe">🔊</button>${extra}`;

/* ---------- Trang Chủ đề ---------- */
const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; };
function hero(c) {
  const done = S.log[today()] || 0, left = c.cards + c.sents, pct = done + left ? Math.round(100 * done / (done + left)) : (done ? 100 : 0), st = streak();
  const go = c.cards ? ['cards', '🃏 Học ' + c.cards + ' thẻ ngay'] : c.sents ? ['sent', '✍️ Đặt ' + c.sents + ' câu ngay'] : (S.journal[today()] ? ['report', '📊 Xem báo cáo tuần'] : ['journal', '📔 Viết nhật ký hôm nay']);
  const msg = !S.topics.length ? 'Nhập chủ đề đầu tiên để bắt đầu nhé.' : left ? `Hôm nay còn ${c.cards} thẻ và ${c.sents} câu đang chờ. Mỗi ngày một chút, đừng bỏ chuỗi ${st} ngày nhé.` : 'Bạn đã hoàn thành phần ôn hôm nay. Thử nghe chép hoặc viết nhật ký để luyện thêm.';
  return `<section class="hero"><div class="grow"><h1>${greet()}, Nguyên ơi! 👋</h1><p>${msg}</p><div class="row" style="margin-top:14px"><button class="btn big" data-act="go" data-v="${go[0]}">${go[1]}</button></div></div><div class="ring" style="--p:${pct}"><div><b>${pct}%</b><small>hôm nay</small></div></div></section>`;
}
VIEWS.home = () => {
  const c = counts(), r = dayRec(), nW = S.topics.reduce((a, t) => a + t.words.length, 0), mastered = S.topics.reduce((a, t) => a + t.words.filter(w => w.srs && w.srs.r && w.srs.r.b >= 4).length, 0);
  const m = ui.msg; ui.msg = null;
  const msgHtml = !m ? '' : `<div class="msg ${m.kind || ''}" role="status">${m.html || esc(m.text)}</div>`;
  const stats = `<div class="grid g4" style="margin-bottom:18px"><div class="stat"><b>${c.cards}</b><span>thẻ cần học hôm nay</span></div><div class="stat"><b>${c.sents}</b><span>câu cần đặt hôm nay</span></div><div class="stat"><b>${streak()}</b><span>ngày liên tiếp</span></div><div class="stat"><b>${mastered}/${nW}</b><span>từ đã thuộc (hộp 4 trở lên)</span></div></div>`;
  const imp = `<div class="panel"><h2>Nhập từ vựng</h2><p class="muted small" style="margin-top:0">Cách nhanh nhất: gửi danh sách từ cho Claude, nhận lại một file <b>.json</b> đã có đoạn văn, IPA, bản dịch và câu đặt câu, rồi kéo thả vào ô dưới. Cũng có thể dán thẳng danh sách thô, mỗi dòng "word - nghĩa", chủ đề bắt đầu bằng "# Tên chủ đề" (chỉ tạo thẻ).</p>
    <div class="drop" id="drop"><p style="margin:0 0 8px"><b>Kéo thả file .json hoặc .txt vào đây</b>, hoặc</p><input type="file" id="file" accept=".json,.txt,.csv,.md" aria-label="Chọn file"></div>
    <label class="small muted" for="paste" style="display:block;margin-top:12px">Hoặc dán nội dung</label><textarea id="paste" placeholder="# Thiết bị mạng&#10;router - bộ định tuyến&#10;switch - bộ chuyển mạch"></textarea>
    <div class="row" style="margin-top:10px"><button class="btn pri" data-act="doImport">Nhập</button><button class="btn" data-act="copyPrompt">Sao chép lời nhắn gửi Claude</button><button class="btn" data-act="fillIpa">Bổ sung IPA tự động</button></div></div>`;
  const tcs = S.topics.map(t => {
    const n = t.words.length, mst = t.words.filter(w => w.srs && w.srs.r && w.srs.r.b >= 4).length, leech = t.words.filter(w => Object.values(w.srs || {}).some(s => s.lapses >= 4)).length;
    const open = ui.open[t.id], rows = open ? `<table class="wl" style="margin-top:10px"><tr><th>Từ</th><th>IPA</th><th>Nghĩa</th><th>Hộp</th></tr>${t.words.map(w => { const b = (w.srs && w.srs.r) ? w.srs.r.b : 0, lc = Object.values(w.srs || {}).some(s => s.lapses >= 4); return `<tr><td><b>${esc(w.w)}</b> <small class="muted">${esc(w.pos)}</small></td><td class="ipa">${w.ipa ? '/' + esc(w.ipa) + '/' : ''}</td><td>${esc(w.vi)}</td><td><span class="box b${b}">${b}</span>${lc ? ' <span title="Hay quên: nên đọc lại ví dụ và đặt câu thêm">⚠</span>' : ''}</td></tr>`; }).join('')}</table>` : '';
    return `<article class="panel tcard"><div class="row"><h3 style="margin:0">${esc(t.name)}</h3><span class="sp"></span><button class="btn sm" data-act="toggleOpen" data-tid="${t.id}">${open ? 'Ẩn từ' : 'Xem từ'}</button><button class="btn sm bad" data-act="delTopic" data-tid="${t.id}" aria-label="Xoá chủ đề ${esc(t.name)}">Xoá</button></div>
      <div style="margin:6px 0"><span class="chip">${n} từ</span><span class="chip ${t.passages.length ? 't' : 'r'}">${t.passages.length} đoạn văn</span><span class="chip ${t.sentences.length ? 't' : 'r'}">${t.sentences.length} câu đặt câu</span>${leech ? `<span class="chip y">⚠ ${leech} từ hay quên</span>` : ''}</div>
      <div class="bar" role="progressbar" aria-valuenow="${mst}" aria-valuemin="0" aria-valuemax="${n}"><i style="width:${n ? Math.round(100 * mst / n) : 0}%"></i></div><p class="small muted" style="margin:4px 0 10px">${mst}/${n} từ đã thuộc</p>
      <div class="row"><button class="btn sm pri" data-act="startCards" data-tid="${t.id}">🃏 Thẻ</button><button class="btn sm" data-act="goT" data-v="passage" data-tid="${t.id}" ${t.passages.length ? '' : 'disabled'}>📖 Đọc</button><button class="btn sm" data-act="goT" data-v="sent" data-tid="${t.id}" ${t.sentences.length ? '' : 'disabled'}>✍️ Đặt câu</button><button class="btn sm" data-act="goT" data-v="shadow" data-tid="${t.id}" ${t.passages.length ? '' : 'disabled'}>🗣️ Shadowing</button></div>${rows}</article>`;
  }).join('');
  const voices = tts ? speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => voiceScore(b) - voiceScore(a)) : [];
  const set = `<div class="panel"><h2>Cài đặt và sao lưu</h2><div class="row"><label class="small" for="npd">Từ mới mỗi ngày</label><input id="npd" type="number" min="0" max="100" value="${S.settings.newPerDay}" data-chg="npd" style="width:80px"><label class="small" for="nsd">Câu mới mỗi ngày</label><input id="nsd" type="number" min="0" max="100" value="${S.settings.newSent}" data-chg="nsd" style="width:80px"></div>
    <div class="row" style="margin-top:10px"><label class="small" for="rate">Tốc độ đọc</label><select id="rate" data-chg="rate">${[0.6, 0.75, 0.85, 1].map(v => `<option value="${v}" ${S.settings.rate === v ? 'selected' : ''}>${v}x</option>`).join('')}</select>${voices.length ? `<label class="small" for="voice">Giọng</label><select id="voice" data-chg="voice"><option value="">Tự chọn (ưu tiên giọng tự nhiên nhất)</option>${voices.map(v => `<option value="${esc(v.name)}" ${S.settings.voice === v.name ? 'selected' : ''}>${voiceScore(v) >= 100 ? '★ ' : ''}${esc(v.name)}</option>`).join('')}</select><button class="btn sm" data-act="testVoice">🔊 Nghe thử</button>` : ''}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="export">⬇ Xuất sao lưu</button><label class="btn" style="cursor:pointer">⬆ Nhập sao lưu<input type="file" id="bk" accept=".json" hidden></label><button class="btn bad" data-act="reset">Xoá toàn bộ</button></div><p class="small muted" style="margin-bottom:0">Dữ liệu chỉ nằm trong trình duyệt này. Hãy xuất sao lưu thỉnh thoảng, nhất là trước khi xoá lịch sử duyệt web.</p></div>`;
  return `${msgHtml}${hero(c)}${stats}${S.topics.length ? `<div class="grid g2">${tcs}</div>` : `<div class="panel"><h2>Bắt đầu</h2><p>Chưa có chủ đề nào. Hãy nhập từ vựng bên dưới, hoặc bấm nút này để thử với một gói mẫu.</p><button class="btn go big" data-act="sample">Nạp gói mẫu "Thiết bị mạng"</button></div>`}${imp}${set}`;
};

/* ---------- Phần 1: Thẻ ---------- */
function startCards(tid, extra) {
  ui.tid = tid || ui.tid; const q = cardQueue(ui.tid, extra || 0), queue = [...q.due, ...q.fresh];
  ui.cs = { queue, i: 0, flipped: false, res: null, val: '', n: 0, again: 0, fresh: q.fresh.length, done: !queue.length, empty: !queue.length, q }; ui.view = 'cards'; render();
}
VIEWS.cards = () => {
  if (!S.topics.length) return empty('Hãy nhập từ vựng trước khi học thẻ.');
  const c = ui.cs;
  if (!c || c.empty && !c.show) {
    const q = cardQueue(ui.tid), nd = q.due.length, nf = q.fresh.length;
    return `<h1>Thẻ từ vựng</h1><p class="muted" style="margin-top:0">Học ngắt quãng: thẻ nhớ tốt sẽ xuất hiện thưa dần (1, 3, 7, 14, 30, 60 ngày), thẻ quên quay lại ngay hôm sau. Mỗi từ có thẻ nhận biết (Anh sang Việt), thẻ gõ từ (Việt sang Anh) và thẻ điền từ vào câu.</p>
    <div class="panel"><div class="row">${topicSelect()}</div><div class="grid g4" style="margin:14px 0"><div class="stat"><b>${nd}</b><span>thẻ đến hạn ôn</span></div><div class="stat"><b>${nf}</b><span>thẻ mới hôm nay</span></div><div class="stat"><b>${q.totalNew - nf}</b><span>thẻ mới còn lại</span></div></div>
    ${nd + nf ? `<button class="btn pri big" data-act="startCards" data-tid="${ui.tid}">▶ Bắt đầu (${nd + nf} thẻ)</button>` : `<p>🎉 Hôm nay bạn đã xong phần ôn của chủ đề này.</p>`}${q.totalNew > nf ? ` <button class="btn big" data-act="more">+10 thẻ mới</button>` : ''}</div>`;
  }
  if (c.done) return summaryHtml('Thẻ từ vựng', c, 'startCards');
  const k = c.queue[c.i], w = k.w, pct = Math.round(100 * c.i / c.queue.length), isNew = k.s.b === 0;
  const head = `<div class="prog"><div class="row"><span class="small muted">${c.i + 1}/${c.queue.length}${isNew ? ' · thẻ mới' : ''}</span><span class="sp"></span><button class="btn sm" data-act="endSess">Dừng</button></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  let body = '', typed = k.ty !== 'r';
  if (k.ty === 'r') {
    body = `<div class="ctype">Nhận biết · nhớ nghĩa</div><div class="word">${esc(w.w)}</div>${w.ipa ? `<div class="ipa" style="font-size:20px">/${esc(w.ipa)}/</div>` : ''}<div class="muted">${esc(w.pos)}</div><div style="margin-top:10px">${spk(w.w)}</div>`;
    if (c.flipped) body += `<div class="ans"><div class="vi-big">${esc(w.vi)}</div>${w.ex ? `<div class="ex">${esc(w.ex)} ${spk(w.ex)}<br><span class="muted">${esc(w.exVi)}</span></div>` : ''}${w.coll && w.coll.length ? `<p class="small" style="margin:8px 0 0"><b>Cụm hay gặp:</b> ${w.coll.map(esc).join(' · ')}</p>` : ''}</div>`;
  } else if (k.ty === 'p') {
    body = `<div class="ctype">Gõ từ tiếng Anh</div><div class="vi-big">${esc(w.vi)}</div><p class="muted">${esc(w.pos)} · ${w.w.length} ký tự, bắt đầu bằng “${esc(w.w[0])}”</p>${typedForm(c)}`;
    if (c.res) body += resultHtml(c, w.w, w);
  } else {
    const cz = clozeOf(w); body = `<div class="ctype">Điền từ vào câu</div><div class="vi-big" style="font-size:24px">${esc(cz.text)}</div><p class="muted">${esc(w.exVi)}</p><p class="small muted">Gợi ý nghĩa: ${esc(w.vi)}</p>${typedForm(c)}`;
    if (c.res) body += resultHtml(c, cz.ans, w);
  }
  let btns = '';
  if (!typed) btns = c.flipped ? gradeBtns(k.s, [0, 1, 2, 3], ['Quên', 'Khó', 'Nhớ', 'Dễ']) : `<div style="margin-top:18px"><button class="btn pri big" data-act="flip">Hiện đáp án (Space)</button></div>`;
  else if (c.res) btns = c.res === 'yes' ? gradeBtns(k.s, [2, 3], ['Đúng', 'Quá dễ']) : c.res === 'near' ? gradeBtns(k.s, [1], ['Sai chính tả, tiếp tục']) : gradeBtns(k.s, [0], ['Tiếp tục']);
  return `${head}<div class="panel flash">${body}${btns}</div><p class="small muted" style="text-align:center">Phím tắt: Space hoặc Enter để lật hoặc kiểm tra, 1 đến 4 để chấm.</p>`;
};
const typedForm = c => c.res ? `<input type="text" id="ans" value="${esc(c.val)}" disabled aria-label="Câu trả lời">` : `<div class="row" style="justify-content:center"><input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" style="max-width:360px" aria-label="Gõ đáp án"><button class="btn pri" data-act="check">Kiểm tra (Enter)</button></div>`;
const resultHtml = (c, ans, w) => `<div class="res ${c.res}"><b>${c.res === 'yes' ? '✔ Chính xác' : c.res === 'near' ? '≈ Gần đúng, sai chính tả' : '✘ Chưa đúng'}</b><br>Đáp án: <b>${esc(ans)}</b> ${w.ipa ? `<span class="ipa">/${esc(w.ipa)}/</span>` : ''} ${spk(w.w)}<br><span class="muted">${esc(w.vi)}</span>${w.ex ? `<br><span class="small">${esc(w.ex)}</span>` : ''}</div>`;
const gradeBtns = (s, gs, labels) => `<div class="grades">${gs.map((g, i) => `<button class="btn ${g === 0 ? 'bad' : g === 3 ? 'go' : g === 2 ? 'pri' : 'warn'}" data-act="grade" data-g="${g}"><span>${labels[i]} (${gs.length === 4 ? g + 1 : (g === 0 || gs.length === 1) ? 1 : g === 2 ? 1 : 2})</span><small>${dueTxt(previewDays(s, g))}</small></button>`).join('')}</div>`;
function summaryHtml(title, c, again) {
  const ok = c.n - c.again; return `<h1>${title}: xong phiên</h1><div class="panel"><div class="grid g4"><div class="stat"><b>${c.n}</b><span>lượt chấm</span></div><div class="stat"><b>${c.n ? Math.round(100 * ok / c.n) : 0}%</b><span>nhớ ngay lần đầu</span></div><div class="stat"><b>${c.fresh}</b><span>mục mới học</span></div></div><div class="row" style="margin-top:16px"><button class="btn pri" data-act="endSess">Quay lại</button><button class="btn" data-act="${again === 'startCards' ? 'more' : 'moreS'}">+10 mục mới</button></div></div>`;
}

/* ---------- Phần 2: Đoạn văn ---------- */
const pasTopics = t => t.passages.length > 0;
function curTopic(only) { const list = S.topics.filter(only); return list.find(t => t.id === ui.tid) || list[0]; }
function hlWords(text, words) {
  const alts = words.map(w => reEsc(w.w)).sort((a, b) => b.length - a.length); if (!alts.length) return esc(text);
  const re = new RegExp('\\b(' + alts.join('|') + ')(s|es|ed|d|ing)?\\b', 'gi'); let out = '', last = 0, m;
  while ((m = re.exec(text))) { out += esc(text.slice(last, m.index)) + `<mark data-act="tip" data-w="${esc(m[1].toLowerCase())}" tabindex="0">${esc(m[0])}</mark>`; last = m.index + m[0].length; }
  return out + esc(text.slice(last));
}
VIEWS.passage = () => {
  const tp = curTopic(pasTopics); if (!tp) return empty('Chưa có đoạn văn nào. Gói bài do Claude soạn sẽ có sẵn đoạn văn cho mỗi chủ đề.');
  ui.tid = tp.id; const pv = ui.pv; pv.pi = Math.min(pv.pi, tp.passages.length - 1); const p = tp.passages[pv.pi];
  const lines = p.lines.map((l, i) => `<div class="line ${pv.hide ? 'blur' : ''}" data-i="${i}">${spk(l.en)}<div style="flex:1"><div class="en" ${pv.hide ? 'data-act="unblur"' : ''}>${hlWords(l.en, tp.words)}</div>${pv.ipa && l.ipa ? `<span class="ipa">/${esc(l.ipa)}/</span>` : ''}${pv.vi && l.vi ? `<div class="vi">${esc(l.vi)}</div>` : ''}</div></div>`).join('');
  return `<h1>Đoạn văn</h1><div class="panel"><div class="row">${topicSelect(pasTopics)}${tp.passages.length > 1 ? `<select data-chg="pi" aria-label="Chọn đoạn">${tp.passages.map((x, i) => `<option value="${i}" ${i === pv.pi ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>` : ''}</div>
    <div class="row toggles" style="margin-top:12px"><button class="btn pri" data-act="playAll">▶ Nghe cả đoạn</button><button class="btn" data-act="stop">⏹ Dừng</button><label><input type="checkbox" data-chg="tg" data-k="ipa" ${pv.ipa ? 'checked' : ''}> IPA</label><label><input type="checkbox" data-chg="tg" data-k="vi" ${pv.vi ? 'checked' : ''}> Tiếng Việt</label><label><input type="checkbox" data-chg="tg" data-k="hide" ${pv.hide ? 'checked' : ''}> Giấu chữ (luyện nghe)</label></div></div>
    <div class="panel"><h2>${esc(p.title)}</h2><p class="small muted" style="margin-top:0">Từ tô vàng là từ vựng của chủ đề, bấm vào để xem nghĩa.</p>${lines}</div>
    <div class="panel"><h3>Từ vựng trong chủ đề</h3>${tp.words.map(w => `<span class="chip y">${esc(w.w)} · ${esc(w.vi)}</span>`).join('')}</div>`;
};

/* ---------- Đổi câu ngẫu nhiên cho mỗi từ ---------- */
function variantPool(tp, q) {
  const out = [{ vi: q.vi, en: q.en, uses: q.uses, note: q.note, tense: q.tense, base: true }], seen = new Set(q.en.map(e => e.toLowerCase()));
  const add = (vi, en, u, extra) => { if (!vi || !en) return; const k = en.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push(Object.assign({ vi, en: [en], uses: [u], note: '', tense: '' }, extra || {})); };
  (q.alts || []).forEach(a => add(a.vi, (Array.isArray(a.en) ? a.en[0] : a.en), (q.uses && q.uses[0]) || '', { en: Array.isArray(a.en) ? a.en : [a.en], tense: a.tense || '' }));
  (q.uses || []).forEach(u => {
    const w = tp.words.find(x => x.w.toLowerCase() === u.toLowerCase()); if (w && w.ex && w.exVi) add(w.exVi, w.ex, u);
    const re = new RegExp('\\b' + reEsc(u.toLowerCase()) + '(s|es|ed|d|ing)?\\b');
    tp.passages.forEach(ps => ps.lines.forEach(l => { if (l.vi && re.test(l.en.toLowerCase())) add(l.vi, l.en, u); }));
  });
  return out;
}
function vary(k, force) {
  const base = k.base || k.q, pool = variantPool(k.tp, base);
  let cand = pool.filter(v => v.en[0] !== base.lastEn); if (!cand.length) cand = pool;
  if (force && k.q) cand = cand.filter(v => v.en[0] !== k.q.en[0]); if (!cand.length) cand = pool;
  const v = cand[Math.floor(Math.random() * cand.length)]; base.lastEn = v.en[0]; save();
  return { tp: k.tp, s: k.s, q: v, base, n: pool.length };
}

/* ---------- Phần 3: Đặt câu ---------- */
const senTopics = t => t.sentences.length > 0;
function startSent(tid, extra) {
  ui.tid = tid || ui.tid; const q = sentQueue(ui.tid, extra || 0), queue = [...q.due, ...q.fresh].map(k => vary(k));
  ui.ss = { queue, i: 0, res: null, n: 0, again: 0, fresh: q.fresh.length, done: !queue.length, empty: !queue.length }; ui.view = 'sent'; render();
}
VIEWS.sent = () => {
  if (!S.topics.some(senTopics)) return empty('Chưa có câu đặt câu nào. Gói bài do Claude soạn sẽ có sẵn câu cho mỗi chủ đề.');
  const c = ui.ss;
  if (!c || c.empty) {
    const q = sentQueue(ui.tid), nd = q.due.length, nf = q.fresh.length;
    return `<h1>Đặt câu</h1><p class="muted" style="margin-top:0">Đọc câu tiếng Việt, tự viết lại bằng tiếng Anh, dùng đúng từ vựng được nhắc. Câu viết đúng sẽ lùi lại ôn thưa dần, câu sai quay lại sớm.</p><div class="panel"><div class="row">${topicSelect(senTopics)}</div><div class="grid g4" style="margin:14px 0"><div class="stat"><b>${nd}</b><span>câu đến hạn ôn</span></div><div class="stat"><b>${nf}</b><span>câu mới hôm nay</span></div></div>${nd + nf ? `<button class="btn pri big" data-act="startSent" data-tid="${ui.tid}">▶ Bắt đầu (${nd + nf} câu)</button>` : '<p>🎉 Hôm nay bạn đã xong phần này.</p>'}${q.totalNew > nf ? ' <button class="btn big" data-act="moreS">+10 câu mới</button>' : ''}</div><div class="panel">${lkBox('s')}</div>${sentList()}`;
  }
  if (c.done) return summaryHtml('Đặt câu', c, 'startSent');
  const k = c.queue[c.i], q = k.q, pct = Math.round(100 * c.i / c.queue.length);
  let res = '';
  if (c.res) {
    const r = c.res; res = `<div class="res ${r.v}"><b>${r.v === 'yes' ? '✔ Chính xác' : r.v === 'near' ? '≈ Gần đúng' : '✘ Chưa đúng'}</b> · khớp ${Math.round(r.ratio * 100)}%<p style="margin:6px 0">Câu của bạn so với đáp án (từ <span class="miss">xanh</span> là thiếu hoặc sai, <del class="extra">gạch đỏ</del> là thừa):</p><p style="margin:0">${diffHtml(r.ops)}</p>${r.unused.length ? `<p style="margin:8px 0 0">⚠ Bạn chưa dùng: <b>${r.unused.map(esc).join(', ')}</b></p>` : ''}${r.tips && r.tips.length ? `<p style="margin:8px 0 0"><b>Lỗi có thể gặp:</b></p><ul style="margin:4px 0 0 18px">${r.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="small muted" style="margin:4px 0 0">Gợi ý tự động so với đáp án mẫu, có thể chưa đúng nếu bạn diễn đạt theo cách khác. Muốn chắc chắn thì bấm nút nhờ Claude bên dưới.</p>` : ''}<p style="margin:8px 0 0"><b>Đáp án:</b> ${q.en.map(e => `${esc(e)} ${spk(e)}`).join('<br>')}</p>${q.note ? `<p class="small" style="margin:8px 0 0">💡 ${esc(q.note)}</p>` : ''}${r.v !== 'yes' ? '<p style="margin:10px 0 0"><button class="btn sm" data-act="askClaude">📋 Nhờ Claude chấm chi tiết</button></p>' : ''}</div>`;
  }
  const btns = c.res ? gradeBtns(k.s, c.res.v === 'yes' ? [2, 3] : c.res.v === 'near' ? [1, 2] : [0], c.res.v === 'yes' ? ['Đúng', 'Quá dễ'] : c.res.v === 'near' ? ['Tạm được', 'Coi là đúng'] : ['Tiếp tục']) : '';
  return `<div class="prog"><div class="row"><span class="small muted">${c.i + 1}/${c.queue.length}${k.s.b === 0 ? ' · câu mới' : ''}</span><span class="sp"></span><button class="btn sm" data-act="endSess">Dừng</button></div><div class="bar"><i style="width:${pct}%"></i></div></div>
  <div class="panel"><div class="ctype">Dịch sang tiếng Anh</div><div class="vi-big" style="font-size:24px">${esc(q.vi)}</div>${q.tense ? `<p style="margin:8px 0">Dùng thì: <span class="chip t">${esc(shortTense(q.tense))}</span></p>` : ''}${q.uses.length ? `<p style="margin:8px 0">Dùng từ <span class="small muted">(bấm vào từ để note)</span>: ${q.uses.map(u => noteChip(u, k.tp.id)).join('')}</p>` : ''}
  <textarea id="sans" rows="2" placeholder="Viết câu tiếng Anh ở đây" ${c.res ? 'disabled' : ''} aria-label="Câu tiếng Anh của bạn">${esc(c.val || '')}</textarea>${c.res ? '' : `<div class="row" style="margin-top:10px"><button class="btn pri" data-act="checkS">Kiểm tra (Enter)</button><button class="btn" data-act="giveUp">Chưa biết, xem đáp án</button>${k.n > 1 ? `<button class="btn" data-act="reVary">🔀 Đổi câu khác (${k.n - 1})</button>` : ''}</div>`}${res}${btns}</div><div class="panel">${lkBox('s')}</div>`;
};
/* Danh sách chọn câu bất kỳ để luyện */
function sentList() {
  const f = (ui.sfilter || '').toLowerCase().trim(), t0 = today(), many = selTopics(ui.tid).length > 1;
  const rows = selTopics(ui.tid).flatMap(tp => sentsOf(tp)).map(k => {
    const id = k.tp.id + '|' + k.q.vi, txt = (k.q.uses.join(' ') + ' ' + k.q.vi + ' ' + k.q.en.join(' ')).toLowerCase(), show = !f || txt.includes(f);
    const st = k.s.b === 0 ? 'mới' : 'hộp ' + k.s.b + (k.s.due <= t0 ? ' · đến hạn' : '');
    return `<div class="srow" data-t="${esc(txt)}" style="display:${show ? 'flex' : 'none'};gap:10px;align-items:flex-start;padding:8px 4px;border-bottom:1px solid rgba(128,128,128,.25)"><input type="checkbox" class="spick" data-chg="spick" data-id="${esc(id)}" aria-label="Chọn câu" ${ui.pick.has(id) ? 'checked' : ''} style="margin-top:5px"><div style="flex:1"><div>${k.q.uses.map(u => noteChip(u, k.tp.id)).join('')}${many ? ` <span class="small muted">${esc(k.tp.name)}</span>` : ''}</div><div style="margin-top:4px">${esc(k.q.vi)}</div></div><div style="text-align:right"><div class="small muted">${st}</div><button class="btn sm" data-act="pickOne" data-id="${esc(id)}">▶ Làm</button></div></div>`;
  }).join('');
  return `<div class="panel"><h2>Chọn câu để luyện</h2><p class="muted small" style="margin-top:0">Tìm theo từ vựng hoặc nội dung câu, tích chọn các câu muốn làm, hoặc bấm "Làm" ở từng câu. Câu nào làm cũng được tính vào lịch ôn.</p><div class="row"><input type="text" id="sfilter" placeholder="Tìm từ vựng hoặc câu..." value="${esc(ui.sfilter || '')}" style="max-width:280px" aria-label="Tìm câu" autocomplete="off"><button class="btn sm" data-act="pickAll">Chọn tất cả</button><button class="btn sm" data-act="pickNone">Bỏ chọn</button><span class="sp"></span><span class="small muted">Đã chọn <b id="pickN">${ui.pick.size}</b></span><button class="btn pri sm" data-act="pickStart">▶ Làm các câu đã chọn</button></div><div style="max-height:440px;overflow:auto;margin-top:8px">${rows || '<p class="muted">Chưa có câu nào.</p>'}</div></div>`;
}
function sentById(id) { const i = id.indexOf('|'), tp = S.topics.find(t => t.id === id.slice(0, i)), q = tp && tp.sentences.find(x => x.vi === id.slice(i + 1)); return q ? { tp, q, s: (q.srs = q.srs || ns()) } : null; }
function startPick(ids) {
  const queue = ids.map(sentById).filter(Boolean).map(k => vary(k)); if (!queue.length) return toast('Hãy chọn ít nhất một câu.');
  ui.ss = { queue, i: 0, res: null, n: 0, again: 0, fresh: queue.filter(k => k.s.b === 0).length, done: false, empty: false }; ui.view = 'sent'; render();
}
/* Phân tích lỗi sai bằng quy tắc (không cần mạng) */
const ART = new Set(['a', 'an', 'the']), BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const AUX = new Set(['do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'must', 'may', 'might', 'shall']);
const PRON = new Set(['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'it', 'its']);
const PREP = new Set(['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'into', 'over', 'under', 'between', 'during', 'after', 'before', 'through', 'along', 'across', 'against', 'up', 'down', 'out', 'off']);
const IRR = { went: 'go', gone: 'go', took: 'take', taken: 'take', made: 'make', bought: 'buy', was: 'be', were: 'be', been: 'be', had: 'have', did: 'do', done: 'do', saw: 'see', seen: 'see', came: 'come', got: 'get', gave: 'give', given: 'give', found: 'find', knew: 'know', known: 'know', thought: 'think', told: 'tell', became: 'become', left: 'leave', felt: 'feel', kept: 'keep', began: 'begin', begun: 'begin', brought: 'bring', wrote: 'write', written: 'write', ran: 'run', ate: 'eat', eaten: 'eat', drank: 'drink', drove: 'drive', driven: 'drive', grew: 'grow', grown: 'grow', threw: 'throw', thrown: 'throw', broke: 'break', broken: 'break', spoke: 'speak', spoken: 'speak', chose: 'choose', chosen: 'choose', sat: 'sit', stood: 'stand', heard: 'hear', met: 'meet', paid: 'pay', said: 'say', sold: 'sell', taught: 'teach', won: 'win', lost: 'lose', built: 'build', sent: 'send', spent: 'spend', fell: 'fall', fallen: 'fall', rose: 'rise', risen: 'rise', swam: 'swim', sang: 'sing', wore: 'wear', worn: 'wear', slept: 'sleep', burst: 'burst' };
const skey = w => { let x = IRR[w] || w; x = x.replace(/(ing|ed|es|s|d)$/, '').replace(/e$/, '').replace(/y$/, 'i'); return x.replace(/([b-df-hj-np-tv-z])\1$/, '$1'); };
const fdesc = w => IRR[w] ? 'quá khứ/phân từ bất quy tắc' : /ing$/.test(w) ? 'V-ing' : /ed$/.test(w) ? 'V-ed' : /(es|s)$/.test(w) ? 'có s/es' : 'nguyên mẫu hoặc số ít';
function explainSentence(u, best, q) {
  if (!u.length) return ['Bạn chưa viết câu trả lời, hãy xem đáp án bên dưới.'];
  const ref = nzs(best.e).split(' ').filter(Boolean), ten = q.tense ? shortTense(q.tense) : '', out = [];
  if (u.length === ref.length && [...u].sort().join(' ') === [...ref].sort().join(' ')) return ['Đủ các từ nhưng sai trật tự từ. Hãy xem lại thứ tự: chủ ngữ, động từ, tân ngữ, trạng ngữ.'];
  const mAll = best.ops.filter(o => o.t === 'miss').map(o => o.w), xAll = best.ops.filter(o => o.t === 'extra').map(o => o.w), moved = new Set(mAll.filter(w => xAll.includes(w)));
  const pair = (m, x) => {
    if (moved.has(m) || moved.has(x)) return null;
    if (ART.has(m) && ART.has(x)) return `Sai mạo từ: bạn dùng "${x}", đáp án dùng "${m}". "a/an" cho danh từ đếm được số ít chưa xác định (an đứng trước âm nguyên âm), "the" cho vật đã xác định.`;
    if (BE.has(m) && BE.has(x)) return `Sai dạng to be: bạn dùng "${x}", đáp án dùng "${m}". Xem lại chủ ngữ (số ít hay số nhiều) và thì${ten ? ' (' + ten + ')' : ''}.`;
    if (AUX.has(m) && AUX.has(x)) return `Sai trợ động từ hoặc thì: bạn dùng "${x}", đáp án dùng "${m}"${ten ? '. Câu này cần: ' + ten : ''}.`;
    if (PRON.has(m) && PRON.has(x)) return `Sai đại từ: bạn dùng "${x}", đáp án dùng "${m}". Xem lại vai trò chủ ngữ, tân ngữ hay sở hữu.`;
    if (PREP.has(m) && PREP.has(x)) return `Sai giới từ: bạn dùng "${x}", đáp án dùng "${m}". Giới từ đi theo cụm cố định nên hãy học cả cụm.`;
    if (m.length >= 2 && x.length >= 2 && skey(m) === skey(x) && fdesc(m) !== fdesc(x)) {
      const vf = IRR[m] || IRR[x] || /(ed|ing)$/.test(m) || /(ed|ing)$/.test(x);
      return `Sai dạng từ: bạn viết "${x}" (${fdesc(x)}), đáp án dùng "${m}" (${fdesc(m)}).` + (vf ? (ten ? ' Thì yêu cầu: ' + ten + '.' : '') : ' Hiện tại đơn: chủ ngữ số ít thì động từ thêm s/es, chủ ngữ số nhiều thì không; danh từ số nhiều cũng thêm s/es.');
    }
    if (m.length >= 4 && x.length >= 4 && lev(m, x) <= 2) return `Sai chính tả: "${x}" nên viết "${m}".`;
    return `Từ "${x}" chưa đúng, đáp án dùng "${m}". Hãy kiểm tra lại nghĩa và cách dùng của từ này.`;
  };
  const miss = w => moved.has(w) ? null : ART.has(w) ? `Thiếu mạo từ "${w}". Danh từ đếm được số ít cần a/an/the.` : PREP.has(w) ? `Thiếu giới từ "${w}".` : (BE.has(w) || AUX.has(w)) ? `Thiếu "${w}" (to be hoặc trợ động từ), có thể bạn chưa chia đúng thì${ten ? '. Câu này cần: ' + ten : ''}.` : w === 'not' ? 'Thiếu từ phủ định "not".' : `Thiếu từ "${w}".`;
  const extra = w => moved.has(w) ? null : ART.has(w) ? `Thừa mạo từ "${w}", câu này không cần.` : PREP.has(w) ? `Thừa giới từ "${w}".` : `Thừa từ "${w}".`;
  let M = [], X = [];
  const flush = () => { const n = Math.min(M.length, X.length); for (let i = 0; i < n; i++) out.push(pair(M[i], X[i])); M.slice(n).forEach(w => out.push(miss(w))); X.slice(n).forEach(w => out.push(extra(w))); M = []; X = []; };
  best.ops.forEach(o => { if (o.t === 'ok') flush(); else if (o.t === 'miss') M.push(o.w); else X.push(o.w); });
  flush(); if (moved.size) out.push(`Từ ${[...moved].map(w => '"' + w + '"').join(', ')} có trong câu nhưng đặt sai vị trí hoặc sai cấu trúc câu so với đáp án.`);
  return [...new Set(out.filter(Boolean))].slice(0, 6);
}
function judgeSentence(val, q) {
  const u = nzs(val).split(' ').filter(Boolean); let best = null;
  q.en.forEach(e => { const d = lcsDiff(nzs(e).split(' '), u); if (!best || d.ratio > best.ratio) best = Object.assign(d, { e }); });
  const unused = (q.uses || []).filter(w => !new RegExp('\\b' + reEsc(nzs(w)) + '(s|es|ed|d|ing)?\\b').test(nzs(val)));
  const exact = q.en.some(e => nzs(e) === u.join(' ')); const v = exact ? 'yes' : best.ratio >= 0.85 && !unused.length ? 'near' : 'no';
  return { v, ratio: best.ratio, ops: best.ops, unused, tips: v === 'yes' ? [] : explainSentence(u, best, q) };
}

/* ---------- Phần 4: Shadowing ---------- */
VIEWS.shadow = () => {
  const tp = curTopic(pasTopics); if (!tp) return empty('Chưa có đoạn văn để shadowing.');
  ui.tid = tp.id; const sh = ui.sh; sh.pi = Math.min(sh.pi, tp.passages.length - 1); const p = tp.passages[sh.pi]; sh.li = Math.min(sh.li, p.lines.length - 1); const l = p.lines[sh.li];
  const key = (i) => tp.id + '|' + sh.pi + '|' + i;
  const list = p.lines.map((x, i) => { const b = S.shadow[key(i)]; return `<div class="sline ${i === sh.li ? 'on' : ''}" data-act="pickLine" data-i="${i}" tabindex="0" role="button"><b>${i + 1}</b><span style="flex:1" class="en-t">${esc(x.en)}</span>${b != null ? `<span class="chip ${b >= 80 ? 't' : b >= 50 ? 'y' : 'r'}">${b}%</span>` : ''}</div>`; }).join('');
  let res = '';
  if (sh.res) { const r = sh.res; res = `<div class="res ${r.score >= 80 ? 'yes' : r.score >= 50 ? 'near' : 'no'}"><div class="row"><span class="score">${r.score}%</span><div><b>${r.score >= 80 ? 'Rất tốt' : r.score >= 50 ? 'Khá, thử lại để rõ hơn' : 'Cần luyện thêm'}</b><br><span class="small">Máy nghe thấy: “${esc(r.said)}”</span></div></div><p style="margin:8px 0 0">${diffHtml(r.ops)}</p><p class="small muted" style="margin:6px 0 0">Từ <span class="miss">xanh</span> là từ máy không nghe ra hoặc bạn nói khác, <del class="extra">gạch đỏ</del> là từ thừa. Điểm do trình nhận dạng giọng nói của trình duyệt chấm, chỉ để tham khảo.</p></div>`; }
  if (sh.err) res = `<div class="msg warn">${esc(sh.err)}</div>`;
  return `<h1>Shadowing</h1><p class="muted" style="margin-top:0">Nghe một câu, nhại lại ngay theo nhịp và ngữ điệu, rồi thu âm để so với bản gốc. Bắt đầu chậm, sau đó tăng dần tốc độ.</p>
  <div class="panel"><div class="row">${topicSelect(pasTopics)}${tp.passages.length > 1 ? `<select data-chg="spi" aria-label="Chọn đoạn">${tp.passages.map((x, i) => `<option value="${i}" ${i === sh.pi ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>` : ''}<span class="sp"></span><button class="btn go" data-act="echo">▶ Nhại tự động cả đoạn</button><button class="btn" data-act="stop">⏹ Dừng</button></div><p id="echo" class="small" style="margin:8px 0 0" aria-live="polite"></p></div>
  <div class="grid g2" style="align-items:start"><div class="panel" style="padding:8px">${list}</div>
  <div class="panel ${sh.hide ? 'hide-en' : ''}"><div class="ctype">Câu ${sh.li + 1}/${p.lines.length}</div><div class="en-t" style="font-size:22px;font-weight:800">${hlWords(l.en, tp.words)}</div>${l.ipa ? `<div class="ipa">/${esc(l.ipa)}/</div>` : ''}<p class="muted">${esc(l.vi)}</p>
  <div class="row"><button class="btn pri" data-act="sayLine" data-r="1">🔊 Nghe</button><button class="btn" data-act="sayLine" data-r="0.6">🐢 Nghe chậm</button><button class="btn warn" data-act="rec" ${SR ? '' : 'disabled title="Cần Chrome hoặc Edge"'}>🎙 ${sh.rec ? 'Đang nghe…' : 'Thu âm và chấm'}</button></div>
  <label class="small" style="display:block;margin-top:10px"><input type="checkbox" data-chg="shHide" ${sh.hide ? 'checked' : ''}> Giấu chữ, chỉ nghe</label>${res}${SR ? '' : '<p class="small muted">Trình duyệt này không có nhận dạng giọng nói, bạn vẫn nghe và nhại được nhưng không có điểm. Dùng Chrome hoặc Edge để chấm.</p>'}</div></div>`;
};

/* ---------- Tra IPA cho cả câu ---------- */
const IPAK = 'len-trinh.ipa'; let IPAC = {}; try { IPAC = JSON.parse(localStorage.getItem(IPAK)) || {}; } catch (e) { }
const saveIpa = () => { try { localStorage.setItem(IPAK, JSON.stringify(IPAC)); } catch (e) { } };
const ipaTokens = t => String(t).match(/[A-Za-z]+(?:['’][A-Za-z]+)*(?:-[A-Za-z]+)*/g) || [];
const ipaMemo = {};
const ARPA = { AA: 'ɑː', AE: 'æ', AH: 'ʌ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', EH: 'e', ER: 'ɜːr', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'iː', JH: 'dʒ', K: 'k', L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', UH: 'ʊ', UW: 'uː', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ' };
const ARVOW = new Set(['AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW']);
function arpaToIpa(str) {
  const ph = String(str).trim().split(/\s+/).filter(Boolean).map(t => { const m = t.match(/^([A-Z]+)(\d)?$/); return m ? { b: m[1], st: m[2] || '' } : null; });
  if (!ph.length || ph.some(x => !x || !ARPA[x.b])) return '';
  const legal = c => c.length === 1 ? c[0] !== 'NG' : c.length === 2 ? ((c[0] === 'S' && ['P', 'T', 'K', 'M', 'N', 'L', 'W', 'F'].includes(c[1])) || (['P', 'B', 'T', 'D', 'K', 'G', 'F', 'TH', 'SH'].includes(c[0]) && ['L', 'R', 'W', 'Y'].includes(c[1]))) : (c[0] === 'S' && ['P', 'T', 'K'].includes(c[1]) && ['L', 'R', 'W', 'Y'].includes(c[2]));
  const nv = ph.filter(x => ARVOW.has(x.b)).length, marks = {};
  if (nv > 1) ph.forEach((x, i) => {
    if (x.st !== '1' && x.st !== '2') return; const cl = []; let j = i;
    while (j > 0 && !ARVOW.has(ph[j - 1].b) && cl.length < 3) { cl.unshift(ph[j - 1].b); j--; }
    let start = i - cl.length; while (cl.length && !legal(cl)) { cl.shift(); start++; }
    marks[start] = x.st === '1' ? 'ˈ' : 'ˌ';
  });
  return ph.map((x, i) => (marks[i] || '') + (x.b === 'AH' && x.st === '0' ? 'ə' : x.b === 'ER' && x.st === '0' ? 'ər' : x.b === 'IY' && x.st === '0' ? 'i' : ARPA[x.b])).join('');
}
async function ipaLookup(w) {
  const lw = w.toLowerCase().replace(/’/g, "'");
  for (const t of S.topics) { const x = t.words.find(v => v.w.toLowerCase() === lw && v.ipa); if (x) return { r: { uk: x.ipa, us: x.ipa }, src: 'vocab' }; }
  if (IPAC[lw]) return { r: IPAC[lw], src: IPAC[lw].src || 'dict' };
  if (lw in ipaMemo) return ipaMemo[lw];
  const why = []; let net = false; const cl = x => String(x || '').replace(/^\/|\/$/g, '').trim();
  try {
    const res = await fetch('https://api.dictionaryapi.dev/v2/entries/en/' + encodeURIComponent(lw));
    if (res.ok) {
      const j = await res.json(), ph = (Array.isArray(j) ? j : []).flatMap(e => e.phonetics || []).filter(p => p.text), any = (ph[0] && ph[0].text) || (Array.isArray(j) && j[0] && j[0].phonetic) || '';
      const by = re => { const p = ph.find(p => p.audio && re.test(p.audio)); return p ? p.text : ''; };
      const r = { uk: cl(by(/-uk\.|_gb_|-gb\./i) || any), us: cl(by(/-us\.|_us_/i) || any) };
      if (r.uk || r.us) { IPAC[lw] = r; saveIpa(); return { r, src: 'dict' }; }
      why.push('từ điển: không có IPA');
    } else why.push('từ điển: HTTP ' + res.status);
  } catch (e) { net = true; why.push('từ điển: ' + (e.message || 'lỗi mạng')); }
  try {
    const res = await fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(lw) + '&qe=sp&md=r&max=1');
    if (res.ok) {
      const j = await res.json(), tag = (j[0] && j[0].word === lw && (j[0].tags || []).find(t => /^pron:/.test(t))) || '', ip = tag ? arpaToIpa(tag.replace(/^pron:/, '')) : '';
      if (ip) { const r = { uk: ip, us: ip, src: 'dm' }; IPAC[lw] = r; saveIpa(); return { r, src: 'dm' }; }
      why.push('Datamuse: không có từ này');
    } else why.push('Datamuse: HTTP ' + res.status);
  } catch (e) { net = true; why.push('Datamuse: ' + (e.message || 'lỗi mạng')); }
  const out = { r: null, net, diag: why.join('; ') }; if (!net) ipaMemo[lw] = out; return out;
}
function ipaNotes(res) {
  const bad = res.items.filter(i => !i.r), dm = res.items.some(i => i.r && i.src === 'dm'), diag = [...new Set(bad.map(i => i.w.toLowerCase() + ' → ' + (i.diag || '?')))].slice(0, 4);
  return (dm ? '<p class="small muted" style="margin:10px 0 0">Dấu ≈ là IPA lấy từ từ điển phát âm (kiểu Mỹ), mang tính gần đúng.</p>' : '') + (bad.length ? `<p class="small muted" style="margin:10px 0 0">Không tra được ${bad.length} từ (hiện —).${res.net ? ' Có vẻ không kết nối được từ điển, hãy kiểm tra mạng.' : ' Có thể là tên riêng hoặc từ không có trong từ điển.'}</p><ul class="small muted" style="margin:4px 0 0 18px">${diag.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : '');
}
const ipaOf = (i, acc) => i.r ? (i.r[acc] || i.r.uk || i.r.us) : '';
VIEWS.ipa = () => {
  const s = ui.ipa, res = s.res; let out = '';
  if (res && res.busy) out = '<div class="panel"><p>Đang tra IPA…</p></div>';
  else if (res) {
    const acc = s.acc, line = res.items.map(i => ipaOf(i, acc) || '?').join(' ');
    out = `<div class="panel"><div class="row"><b>IPA cả câu</b><span class="sp"></span><button class="btn sm" data-act="ipaCopy">Sao chép</button></div><p class="ipa" style="font-size:20px;margin:8px 0">/${esc(line)}/</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">${res.items.map(i => `<div style="border:1px solid rgba(128,128,128,.35);border-radius:10px;padding:6px 10px;text-align:center"><div><b>${esc(i.w)}</b> ${spk(i.w)}</div><div class="ipa">${i.r ? (i.src === 'dm' ? '≈ ' : '') + '/' + esc(ipaOf(i, acc)) + '/' : '—'}</div></div>`).join('')}</div>${ipaNotes(res)}</div>`;
  }
  return `<h1>Tra IPA</h1><p class="muted" style="margin-top:0">Dán một câu hoặc cả đoạn tiếng Anh, web sẽ hiện IPA của từng từ. Từ nào có trong từ vựng của bạn thì dùng IPA trong tài liệu của bạn. Các từ khác tra từ điển trực tuyến (cần mạng) và được lưu lại để lần sau không phải tra lại.</p>
  <div class="panel"><textarea id="ipaText" rows="3" placeholder="Dán câu tiếng Anh vào đây, ví dụ: Our hotel room overlooked the harbour." aria-label="Câu tiếng Anh">${esc(s.text)}</textarea>
  <div class="row" style="margin-top:10px"><button class="btn pri" data-act="ipaRun">Tra IPA (Ctrl+Enter)</button><button class="btn" data-act="ipaClear">Xóa</button><span class="sp"></span><label class="small" for="ipaAcc">Giọng</label><select id="ipaAcc" data-chg="ipaAcc"><option value="uk" ${s.acc === 'uk' ? 'selected' : ''}>Anh (UK)</option><option value="us" ${s.acc === 'us' ? 'selected' : ''}>Mỹ (US)</option></select></div></div>${out}`;
};

/* ---------- Từ vựng đã note ---------- */
const isNoted = w => S.noted.some(x => x.w.toLowerCase() === String(w).toLowerCase());
const noteChip = (u, tid) => `<span class="chip y" data-act="noteWord" data-w="${esc(u)}" data-tid="${esc(tid)}" title="Bấm để note hoặc bỏ note từ này" style="cursor:pointer">${isNoted(u) ? '📌 ' : '＋ '}${esc(u)}</span>`;
async function copyText(t) {
  let ok = false; try { await Promise.race([navigator.clipboard.writeText(t), new Promise((_, no) => setTimeout(no, 1000))]); ok = true; } catch (e) { }
  if (!ok) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
}
VIEWS.noted = () => {
  const f = (ui.nfilter || '').toLowerCase().trim();
  const rows = S.noted.map(x => { const t = (x.w + ' ' + x.vi).toLowerCase(); return `<div class="nrow" data-t="${esc(t)}" style="display:${!f || t.includes(f) ? 'block' : 'none'};padding:10px 6px;border-bottom:1px solid rgba(128,128,128,.25)"><div class="row"><b style="font-size:18px">${esc(x.w)}</b>${x.pos ? ` <span class="muted small">${esc(x.pos)}</span>` : ''}${x.ipa ? ` <span class="ipa">/${esc(x.ipa)}/</span>` : ''} ${spk(x.w)}<span class="sp"></span><button class="btn sm" data-act="noteEdit" data-w="${esc(x.w)}">✏️ Sửa nghĩa</button><button class="btn sm bad" data-act="noteDel" data-w="${esc(x.w)}" aria-label="Bỏ note ${esc(x.w)}">✕</button></div><div style="margin-top:4px">${x.vi ? esc(x.vi) : '<span class="muted">(chưa có nghĩa, bấm Sửa nghĩa để thêm)</span>'}</div>${x.ex ? `<div class="small" style="margin-top:4px">${esc(x.ex)} ${spk(x.ex)}${x.exVi ? `<br><span class="muted">${esc(x.exVi)}</span>` : ''}</div>` : ''}${x.ctx ? `<div class="small muted" style="margin-top:4px">Note khi làm câu: ${esc(x.ctx)}</div>` : ''}<div class="small muted" style="margin-top:4px">Đã note ngày ${esc(x.added)}</div></div>`; }).join('');
  return `<h1>Từ vựng đã note</h1><p class="muted" style="margin-top:0">Ở phần Đặt câu, bấm vào từ vựng (nhãn vàng có dấu ＋) để note. Từ đã note được gom về đây để xem lại, nghe và ôn thẻ.</p>
  <div class="panel"><div class="row"><input type="text" id="nfilter" placeholder="Tìm trong từ đã note..." value="${esc(ui.nfilter || '')}" style="max-width:260px" autocomplete="off" aria-label="Tìm từ đã note"><span class="sp"></span><span class="small muted">${S.noted.length} từ</span><button class="btn pri sm" data-act="noteReview" ${S.noted.length ? '' : 'disabled'}>🃏 Ôn thẻ các từ đã note</button><button class="btn sm" data-act="noteCopy" ${S.noted.length ? '' : 'disabled'}>📋 Sao chép danh sách</button></div>
  <div class="row" style="margin-top:10px"><input type="text" id="nw" placeholder="Thêm từ thủ công" style="max-width:200px" autocomplete="off" aria-label="Từ"><input type="text" id="nvi" placeholder="Nghĩa (không bắt buộc)" style="max-width:260px" autocomplete="off" aria-label="Nghĩa"><button class="btn sm" data-act="noteAdd">＋ Thêm</button></div></div>
  <div class="panel">${rows || '<p class="muted">Chưa có từ nào. Vào phần Đặt câu và bấm vào từ vựng để note.</p>'}</div>`;
};

/* ---------- Sự kiện ---------- */
const wordLookup = (tid, lw) => { const tp = S.topics.find(t => t.id === tid); return tp && tp.words.find(w => w.w.toLowerCase() === lw); };
function advance(c, g, kind) {
  const k = c.queue[c.i]; applyGrade(k.s, g, kind); c.n++; if (g === 0) { c.again++; c.queue.splice(Math.min(c.queue.length, c.i + 4), 0, Object.assign({}, k, { s: k.s })); }
  c.i++; c.res = null; c.val = ''; c.flipped = false; if (c.i >= c.queue.length) c.done = true; render();
}
function checkTyped() {
  const c = ui.cs, k = c.queue[c.i], v = ($('#ans') || {}).value || ''; c.val = v;
  const ans = k.ty === 'p' ? [k.w.w] : [clozeOf(k.w).ans, k.w.w]; c.res = judgeWord(v, ans); render(); speak(k.w.w);
}
const ACT = {
  go: el => { stopSpeak(); if (ui.view !== el.dataset.v) { ui.jr.init = false; ui.dc.res = null; ui.dc.val = ''; ui.dc.hint = 0; } ui.view = el.dataset.v; if (ui.view === 'cards') ui.cs = null; if (ui.view === 'sent') ui.ss = null; ui.sh.res = null; ui.sh.err = ''; render(); },
  goT: el => { ui.tid = el.dataset.tid; ACT.go(el); },
  say: el => speak(el.dataset.t),
  sample: async () => { try { const r = await fetch('sample-pack.json'); const j = await r.json(); ui.msg = repMsg(importPack(j)); } catch (e) { ui.msg = { text: 'Không nạp được gói mẫu (cần mở bằng Live Server, không mở trực tiếp file). Bạn có thể kéo thả file sample-pack.json vào ô nhập.', kind: 'warn' }; } render(); },
  doImport: () => { ui.msg = repMsg(importText($('#paste').value)); render(); },
  copyPrompt: async () => {
    let list = ($('#paste') || {}).value.trim(); if (!list || list[0] === '{') list = S.topics.filter(t => !t.passages.length).flatMap(t => t.words.map(w => w.w + (w.vi ? ' - ' + w.vi : ''))).join('\n');
    if (!list) return toast('Hãy dán danh sách từ vào ô nhập trước.');
    const t = claudePrompt(list); try { await navigator.clipboard.writeText(t); toast('Đã sao chép. Dán vào Claude.'); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast('Đã sao chép. Dán vào Claude.'); }
  },
  fillIpa, toggleOpen: el => { ui.open[el.dataset.tid] = !ui.open[el.dataset.tid]; render(); },
  delTopic: el => { const t = S.topics.find(x => x.id === el.dataset.tid); if (t && confirm(`Xoá chủ đề "${t.name}" cùng toàn bộ tiến độ học của nó?`)) { S.topics = S.topics.filter(x => x !== t); save(); render(); } },
  export: () => { const b = new Blob([JSON.stringify(S)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'len-trinh-sao-luu-' + today() + '.json'; a.click(); URL.revokeObjectURL(a.href); },
  reset: () => { if (confirm('Xoá TOÀN BỘ chủ đề và tiến độ? Không thể hoàn tác.')) { S = blank(); save(); ui.cs = ui.ss = null; render(); } },
  /* thẻ */
  startCards: el => startCards(el.dataset.tid), more: () => startCards(ui.tid, 10),
  flip: () => { ui.cs.flipped = true; ui.noFocus = false; render(); },
  check: checkTyped, grade: el => { const sent = ui.view === 'sent'; advance(sent ? ui.ss : ui.cs, +el.dataset.g, sent ? 'sent' : 'card'); },
  endSess: () => { ui.cs = null; ui.ss = null; render(); },
  /* đoạn văn */
  tip: (el, e) => {
    const w = wordLookup(ui.tid, el.dataset.w); const old = $('#tip'); if (old) old.remove(); if (!w) return;
    const d = document.createElement('div'); d.id = 'tip'; d.innerHTML = `<b>${esc(w.w)}</b> <span class="muted small">${esc(w.pos)}</span> ${w.ipa ? `<span class="ipa">/${esc(w.ipa)}/</span>` : ''}<br>${esc(w.vi)}<br><button class="btn sm" data-act="say" data-t="${esc(w.w)}">🔊 Nghe</button>`;
    document.body.appendChild(d); const r = el.getBoundingClientRect(); d.style.left = Math.max(8, Math.min(window.innerWidth - 300, r.left + scrollX)) + 'px'; d.style.top = (r.bottom + scrollY + 6) + 'px'; e.stopPropagation();
  },
  unblur: el => el.parentElement.parentElement.classList.remove('blur'),
  playAll: async () => {
    stopSpeak(); const tok = ++ui.tok, tp = S.topics.find(t => t.id === ui.tid), p = tp.passages[ui.pv.pi];
    for (let i = 0; i < p.lines.length; i++) { if (tok !== ui.tok) return; const row = $(`.line[data-i="${i}"]`); document.querySelectorAll('.line.playing').forEach(x => x.classList.remove('playing')); if (row) { row.classList.add('playing'); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } await speak(p.lines[i].en); await new Promise(r => setTimeout(r, 350)); }
    document.querySelectorAll('.line.playing').forEach(x => x.classList.remove('playing'));
  },
  stop: stopSpeak,
  /* đặt câu */
  startSent: el => startSent(el.dataset.tid), moreS: () => startSent(ui.tid, 10),
  pickAll: () => { document.querySelectorAll('.srow').forEach(r => { if (r.style.display === 'none') return; const c = r.querySelector('.spick'); c.checked = true; ui.pick.add(c.dataset.id); }); const n = $('#pickN'); if (n) n.textContent = ui.pick.size; },
  pickNone: () => { ui.pick.clear(); document.querySelectorAll('.spick').forEach(c => { c.checked = false; }); const n = $('#pickN'); if (n) n.textContent = 0; },
  ipaRun: async () => {
    const s = ui.ipa; s.text = ($('#ipaText') || {}).value || s.text; const toks = ipaTokens(s.text);
    if (!toks.length) return toast('Hãy dán một câu tiếng Anh trước.');
    if (toks.length > 150) return toast('Văn bản dài quá, hãy dán tối đa khoảng 150 từ mỗi lần.');
    s.res = { busy: true }; render(); const uniq = [...new Set(toks.map(w => w.toLowerCase()))], map = {}; let net = false;
    for (let i = 0; i < uniq.length; i += 5) await Promise.all(uniq.slice(i, i + 5).map(async w => { const x = await ipaLookup(w); map[w] = x; if (x.net) net = true; }));
    s.res = { items: toks.map(w => { const x = map[w.toLowerCase()] || {}; return { w, r: x.r || null, src: x.src, diag: x.diag }; }), net }; render();
  },
  ipaClear: () => { ui.ipa.text = ''; ui.ipa.res = null; render(); },
  ipaCopy: async () => {
    const s = ui.ipa; if (!s.res || !s.res.items) return; const t = '/' + s.res.items.map(i => ipaOf(i, s.acc) || '?').join(' ') + '/'; let ok = false;
    try { await Promise.race([navigator.clipboard.writeText(t), new Promise((_, no) => setTimeout(no, 1000))]); ok = true; } catch (e) { }
    if (!ok) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
    toast('Đã sao chép IPA cả câu.');
  },
  reVary: () => { const c = ui.ss; if (!c || c.res) return; const el = $('#sans'); c.val = el ? el.value : ''; c.queue[c.i] = vary(c.queue[c.i], true); render(); },
  noteWord: el => {
    const w = el.dataset.w, i = S.noted.findIndex(x => x.w.toLowerCase() === w.toLowerCase());
    if (i >= 0) { S.noted.splice(i, 1); toast('Đã bỏ note: ' + w); }
    else {
      const tp = S.topics.find(t => t.id === el.dataset.tid), v = (tp && tp.words.find(x => x.w.toLowerCase() === w.toLowerCase())) || findVocab(w), c = ui.view === 'sent' && ui.ss && ui.ss.queue[ui.ss.i];
      S.noted.unshift({ w: v ? v.w : w, ipa: v ? v.ipa : '', pos: v ? v.pos : '', vi: v ? v.vi : (el.dataset.vi || ''), ex: v ? v.ex : (el.dataset.ex || ''), exVi: v ? v.exVi : (el.dataset.exvi || ''), tid: el.dataset.tid || '', added: today(), ctx: c ? c.q.vi : '' });
      toast('Đã note: ' + w + '. Xem ở mục Đã note.');
    }
    save(); el.textContent = (isNoted(w) ? '📌 ' : '＋ ') + w; nav();
  },
  noteAdd: () => {
    const w = (($('#nw') || {}).value || '').trim(), vi = (($('#nvi') || {}).value || '').trim(); if (!w) return toast('Hãy nhập từ cần note.');
    const old = S.noted.find(x => x.w.toLowerCase() === w.toLowerCase());
    if (old) { if (vi) old.vi = vi; save(); render(); return toast('Từ này đã có trong danh sách' + (vi ? ', đã cập nhật nghĩa.' : '.')); }
    let v = null; S.topics.some(t => (v = t.words.find(x => x.w.toLowerCase() === w.toLowerCase())));
    const e = { w, ipa: v ? v.ipa : '', pos: v ? v.pos : '', vi: vi || (v ? v.vi : ''), ex: v ? v.ex : '', exVi: v ? v.exVi : '', tid: '', added: today(), ctx: '' };
    S.noted.unshift(e); save(); render();
    if (!e.ipa && /^[A-Za-z'’-]+$/.test(w)) ipaLookup(w).then(x => { if (x.r && S.noted.includes(e)) { e.ipa = x.r.uk || x.r.us; save(); if (ui.view === 'noted') render(); } });
  },
  noteEdit: el => { const x = S.noted.find(n => n.w === el.dataset.w); if (!x) return; const v = prompt('Nghĩa tiếng Việt của "' + x.w + '":', x.vi); if (v !== null) { x.vi = v.trim(); save(); render(); } },
  noteDel: el => { S.noted = S.noted.filter(x => x.w !== el.dataset.w); save(); render(); },
  noteCopy: async () => { await copyText(S.noted.map(x => x.w + (x.ipa ? ' /' + x.ipa + '/' : '') + (x.vi ? ' - ' + x.vi : '')).join('\n')); toast('Đã sao chép danh sách từ đã note.'); },
  noteReview: () => {
    const keys = new Set(S.noted.map(x => x.w.toLowerCase())), queue = [];
    S.topics.forEach(tp => cardsOf(tp).forEach(c => { if (keys.has(c.w.w.toLowerCase())) queue.push(c); }));
    if (!queue.length) return toast('Các từ đã note chưa nằm trong chủ đề nào nên chưa có thẻ để ôn.');
    shuffle(queue); ui.cs = { queue, i: 0, flipped: false, res: null, val: '', n: 0, again: 0, fresh: queue.filter(c => c.s.b === 0).length, done: false, empty: false, q: { due: [], fresh: [], totalNew: 0 } }; ui.view = 'cards'; render();
  },
  testVoice: () => { stopSpeak(); speak('Hello! This is how I sound. Let us practice English together, one sentence at a time.'); },
  askClaude: async () => {
    const c = ui.ss, k = c && c.queue[c.i]; if (!k) return; const q = k.q;
    const t = `Hãy chấm câu dịch Việt sang Anh của tôi. Giải thích bằng tiếng Việt, ngắn gọn, từng lỗi một (ngữ pháp, thì, giới từ, mạo từ, từ vựng, chính tả): nói rõ vì sao sai và quy tắc đúng, rồi viết lại câu đúng và cho 1 ví dụ tương tự.\n\nCâu tiếng Việt: ${q.vi}\nTừ cần dùng: ${(q.uses || []).join(', ')}\nGợi ý thì: ${q.tense || 'không có'}\nCâu của tôi: ${c.val || '(chưa viết)'}\nĐáp án tham khảo: ${q.en.join(' / ')}`;
    let ok = false; try { await Promise.race([navigator.clipboard.writeText(t), new Promise((_, no) => setTimeout(no, 1000))]); ok = true; } catch (e) { }
    if (!ok) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
    toast('Đã sao chép câu hỏi. Dán vào Claude để được chấm chi tiết.');
  },
  pickOne: el => startPick([el.dataset.id]), pickStart: () => startPick([...ui.pick]),
  checkS: () => { const c = ui.ss, k = c.queue[c.i]; c.val = ($('#sans') || {}).value || ''; if (!c.val.trim()) return toast('Hãy viết câu trả lời trước.'); c.res = judgeSentence(c.val, k.q); ui.noFocus = true; render(); ui.noFocus = false; },
  giveUp: () => { const c = ui.ss, k = c.queue[c.i]; c.val = ($('#sans') || {}).value || ''; c.res = judgeSentence(c.val, k.q); c.res.v = 'no'; render(); },
  /* shadowing */
  pickLine: el => { stopSpeak(); ui.sh.li = +el.dataset.i; ui.sh.res = null; ui.sh.err = ''; render(); },
  sayLine: el => { const tp = S.topics.find(t => t.id === ui.tid); speak(tp.passages[ui.sh.pi].lines[ui.sh.li].en, +el.dataset.r); },
  rec: async () => {
    const sh = ui.sh, tp = S.topics.find(t => t.id === ui.tid), l = tp.passages[sh.pi].lines[sh.li]; if (sh.rec) return; if (tts) speechSynthesis.cancel();
    sh.rec = true; sh.err = ''; sh.res = null; render();
    try { const said = await listen(), d = lcsDiff(nzs(l.en).split(' '), nzs(said).split(' ').filter(Boolean)), hit = d.ops.filter(o => o.t === 'ok').length, tot = d.ops.filter(o => o.t !== 'extra').length, score = tot ? Math.round(100 * hit / tot) : 0; sh.res = { said, ops: d.ops, score }; const key = tp.id + '|' + sh.pi + '|' + sh.li; if ((S.shadow[key] || 0) < score) S.shadow[key] = score; dayRec().shadow++; S.log[today()] = (S.log[today()] || 0) + 1; save(); }
    catch (e) { sh.err = e === 'not-allowed' || e === 'service-not-allowed' ? 'Trình duyệt chưa được cấp quyền micro. Hãy cho phép micro rồi thử lại.' : e === 'no-speech' ? 'Không nghe thấy tiếng. Hãy nói gần micro hơn và thử lại.' : e === 'unsupported' ? 'Trình duyệt này không hỗ trợ nhận dạng giọng nói.' : 'Không thu âm được (' + e + '). Cần mạng và Chrome hoặc Edge.'; }
    sh.rec = false; render();
  },
  echo: async () => {
    stopSpeak(); const tok = ++ui.tok, tp = S.topics.find(t => t.id === ui.tid), p = tp.passages[ui.sh.pi], st = $('#echo');
    for (let i = 0; i < p.lines.length; i++) {
      if (tok !== ui.tok) return; ui.sh.li = i; document.querySelectorAll('.sline').forEach((x, j) => x.classList.toggle('on', j === i));
      st.textContent = `Câu ${i + 1}/${p.lines.length}: nghe…`; await speak(p.lines[i].en); if (tok !== ui.tok) return;
      st.textContent = `Câu ${i + 1}/${p.lines.length}: nhại lại theo (“${p.lines[i].en}”)`; await new Promise(r => setTimeout(r, 900 + p.lines[i].en.split(' ').length * 450));
    }
    if (tok === ui.tok) { st.textContent = 'Xong cả đoạn. Hãy thử thu âm từng câu để lấy điểm.'; }
  }
};
/* ---------- Tra từ nhanh (nội bộ + dịch online) ---------- */
(function () { const st = document.createElement('style'); st.textContent = '.aw{cursor:pointer;border-bottom:1px dotted rgba(128,128,128,.6)}.aw:hover{background:rgba(255,200,0,.25)}.aw.n{background:rgba(255,200,0,.35)}.avi{opacity:.75;font-style:italic;font-size:.92em}.art-p{line-height:2;font-size:18px;margin:0 0 16px}.asn.playing{background:rgba(80,140,255,.15)}#wpop{position:sticky;bottom:8px;z-index:5}.wrow{padding:10px 4px;border-bottom:1px solid rgba(128,128,128,.25)}.wrow textarea{width:100%;box-sizing:border-box}'; document.head.appendChild(st); })();
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
const HASVI = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const MMC = {};
async function mmTranslate(q, from, to) {
  const key = from + '|' + to + '|' + q.toLowerCase(); if (MMC[key]) return MMC[key];
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(q) + '&langpair=' + from + '|' + to, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(), out = [], add = x => { x = String(x || '').trim(); if (x && !/MYMEMORY|INVALID|QUERY LENGTH/i.test(x) && !out.some(o => o.toLowerCase() === x.toLowerCase()) && out.length < 5) out.push(x); };
    add(j.responseData && j.responseData.translatedText); (j.matches || []).forEach(m => add(m.translation));
    return (MMC[key] = { ok: true, list: out });
  } catch (e) { return { ok: false, err: e.name === 'AbortError' ? 'quá thời gian chờ (mạng chậm hoặc bị chặn)' : String(e.message || e) }; } finally { clearTimeout(tm); }
}
function findVocab(w) {
  const x = String(w).toLowerCase(); let hit = null;
  S.topics.some(t => t.words.some(v => { if (new RegExp('^' + reEsc(v.w.toLowerCase()) + '(s|es|ed|d|ing)?$').test(x)) { hit = v; return true; } }));
  return hit;
}
function localSearch(q) {
  const f = fold(q); if (!f) return []; const out = [], seen = new Set();
  const push = v => { const k = v.w.toLowerCase(); if (!seen.has(k) && out.length < 8) { seen.add(k); out.push(v); } };
  S.topics.forEach(t => t.words.forEach(v => { if (fold(v.vi).includes(f) || fold(v.w) === f || fold(v.w).startsWith(f)) push(v); }));
  S.noted.forEach(v => { if (fold(v.vi || '').includes(f) || fold(v.w).startsWith(f)) push(v); });
  return out;
}
const lookupRow = v => `<div style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,.2)"><b>${esc(v.w)}</b>${v.pos ? ` <span class="muted small">${esc(v.pos)}</span>` : ''}${v.ipa ? ` <span class="ipa">/${esc(v.ipa)}/</span>` : ''} ${spk(v.w)} ${noteChip(v.w, '')}<br>${esc(v.vi || '')}</div>`;
async function lookupInto(box, q) {
  q = q.trim(); if (!q) { box.innerHTML = ''; return; }
  const loc = localSearch(q); box.innerHTML = (loc.length ? `<p class="small muted" style="margin:8px 0 2px">Trong từ vựng của bạn:</p>${loc.map(lookupRow).join('')}` : '<p class="small muted" style="margin:8px 0 2px">Chưa thấy trong từ vựng của bạn.</p>') + '<p class="small muted" id="lkon" style="margin:8px 0 0">Đang tra online…</p>';
  const isVi = HASVI.test(q) || /\s/.test(q), r = await mmTranslate(q, isVi ? 'vi' : 'en', isVi ? 'en' : 'vi'), on = box.querySelector('#lkon'); if (!on) return;
  on.outerHTML = r.ok ? (r.list.length ? `<p class="small muted" style="margin:8px 0 2px">Gợi ý dịch online (${isVi ? 'Việt → Anh' : 'Anh → Việt'}), chỉ để tham khảo:</p><ul style="margin:2px 0 0 18px">${r.list.map(x => `<li>${esc(x)} ${isVi ? spk(x) : ''}</li>`).join('')}</ul>` : '<p class="small muted">Không có gợi ý online.</p>') : `<p class="small muted">Tra online không được: ${esc(r.err)}. Phần tra trong từ vựng của bạn vẫn dùng được.</p>`;
}

/* ---------- Đọc báo: bài tiếng Anh, dịch từng câu trong ngoặc ---------- */
const artSents = a => a.paragraphs.flat();
VIEWS.news = () => {
  const N = ui.nw;
  if (N.paste) return `<h1>Dán bài báo</h1><div class="panel"><p class="muted" style="margin-top:0">Dán một bài tiếng Anh bạn muốn đọc. Web tự tách câu. Bản dịch từng câu sẽ lấy online khi bạn bấm nút 💬 (chất lượng chỉ ở mức tham khảo). Muốn bản dịch chuẩn hơn, hãy nhờ Claude soạn gói bài.</p><input type="text" id="apt" placeholder="Tiêu đề bài" style="width:100%;box-sizing:border-box;margin-bottom:8px" autocomplete="off" aria-label="Tiêu đề"><textarea id="apx" rows="12" style="width:100%;box-sizing:border-box" placeholder="Dán nội dung bài báo tiếng Anh vào đây. Cách đoạn bằng một dòng trống." aria-label="Nội dung"></textarea><div class="row" style="margin-top:10px"><button class="btn pri" data-act="aPasteSave">Lưu bài</button><button class="btn" data-act="aBack">Hủy</button></div></div>`;
  const a = N.id && S.articles.find(x => x.id === N.id);
  if (!a) {
    const items = S.articles.map(x => `<div class="panel" style="margin:8px 0"><div class="row"><div style="flex:1"><b style="font-size:18px">${esc(x.title)}</b>${S.artRead[x.id] ? ' <span class="chip t">✓ đã đọc</span>' : ''}<br><span class="small muted">${esc(x.source || '')}${x.level ? ' · ' + esc(x.level) : ''} · ${artSents(x).length} câu${x.tags ? ' · ' + esc(x.tags.join(', ')) : ''}</span>${x.summary ? `<br><span class="small">${esc(x.summary)}</span>` : ''}</div><button class="btn pri sm" data-act="aOpen" data-id="${esc(x.id)}">Đọc ▶</button>${String(x.id).startsWith('u-') ? `<button class="btn sm bad" data-act="aDel" data-id="${esc(x.id)}" aria-label="Xóa bài">✕</button>` : ''}</div></div>`).join('');
    return `<h1>Đọc báo</h1><p class="muted" style="margin-top:0">Các bài ngắn tuyển chọn để học. Mỗi câu tiếng Anh có bản dịch tiếng Việt đặt trong ngoặc. Bấm vào bất kỳ từ nào để xem IPA, nghĩa và note từ đó.</p><div class="row"><button class="btn" data-act="aPaste">📥 Dán bài báo của bạn</button></div>${items || '<div class="panel"><p class="muted">Chưa có bài nào. Nhập gói bài có mục "articles" hoặc dán bài tiếng Anh bạn muốn đọc.</p></div>'}`;
  }
  let gi = -1; const mode = N.mode, notedSet = new Set(S.noted.map(x => x.w.toLowerCase()));
  const word = t => t.replace(/([A-Za-z][A-Za-z'’-]*)|([^A-Za-z]+)/g, (m, w, o) => w ? `<span class="aw${notedSet.has(w.toLowerCase()) ? ' n' : ''}" data-act="aWord" data-w="${esc(w)}">${esc(w)}</span>` : esc(o));
  const body = a.paragraphs.map(par => `<p class="art-p">${par.map(s => { gi++; const open = mode === 'all' || (mode === 'tap' && N.open[gi]); return `<span class="asn" data-gi="${gi}">${word(s.en)} <button class="ico" data-act="say" data-t="${esc(s.en)}" aria-label="Nghe câu" title="Nghe câu">🔊</button>${mode !== 'hide' ? `<button class="ico" data-act="aTr" data-gi="${gi}" aria-label="Dịch câu" title="Dịch">💬</button>` : ''}${open ? ` <span class="avi">(${s.vi ? esc(s.vi) : 'chưa có bản dịch, bấm 💬 để dịch tự động'})</span>` : ''} </span>`; }).join('')}</p>`).join('');
  return `<div class="row"><button class="btn sm" data-act="aBack">◀ Danh sách bài</button><span class="sp"></span><select data-chg="amode" aria-label="Hiện bản dịch"><option value="all" ${mode === 'all' ? 'selected' : ''}>Hiện dịch trong ngoặc</option><option value="tap" ${mode === 'tap' ? 'selected' : ''}>Chỉ hiện khi bấm 💬</option><option value="hide" ${mode === 'hide' ? 'selected' : ''}>Ẩn bản dịch</option></select></div>
  <h1 style="margin-bottom:4px">${esc(a.title)}</h1><p class="small muted" style="margin-top:0">${esc(a.source || '')}${a.level ? ' · ' + esc(a.level) : ''}</p>
  <div class="row" style="margin-bottom:10px"><button class="btn go" data-act="aRead">▶ Nghe cả bài</button><button class="btn" data-act="stop">⏹ Dừng</button><button class="btn ${S.artRead[a.id] ? '' : 'pri'}" data-act="aDone">${S.artRead[a.id] ? '↺ Bỏ đánh dấu đã đọc' : '✓ Đánh dấu đã đọc'}</button></div>
  <div class="panel">${body}</div><div id="wpop"></div>`;
};
Object.assign(ACT, {
  aOpen: el => { ui.nw.id = el.dataset.id; ui.nw.open = {}; render(); window.scrollTo(0, 0); },
  aBack: () => { stopSpeak(); ui.nw.id = null; ui.nw.paste = false; render(); },
  aPaste: () => { ui.nw.paste = true; render(); },
  aPasteSave: () => {
    const title = ($('#apt').value || '').trim() || 'Bài tự dán', txt = ($('#apx').value || '').trim(); if (!txt) return toast('Hãy dán nội dung bài tiếng Anh.');
    const paragraphs = txt.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).map(p => p.split(/(?<=[.!?]["”’']?)\s+(?=["“‘']?[A-Z0-9])/).map(en => ({ en: en.trim(), vi: '' })).filter(s => s.en));
    const id = 'u-' + Date.now(); S.articles.unshift({ id, title, source: 'Bài do bạn dán', level: '', paragraphs }); save(); ui.nw.paste = false; ui.nw.id = id; ui.nw.mode = 'tap'; ui.nw.open = {}; render(); toast('Đã lưu bài. Bấm 💬 ở từng câu để dịch.');
  },
  aDel: el => { if (!confirm('Xóa bài này?')) return; S.articles = S.articles.filter(x => x.id !== el.dataset.id); save(); render(); },
  aDone: () => { const id = ui.nw.id; if (S.artRead[id]) delete S.artRead[id]; else S.artRead[id] = today(); save(); render(); },
  aTr: async el => {
    const N = ui.nw, gi = +el.dataset.gi, a = S.articles.find(x => x.id === N.id), s = artSents(a)[gi]; if (!s) return;
    if (N.mode === 'tap') { N.open[gi] = !N.open[gi]; }
    if (!s.vi && N.open[gi] !== false) {
      toast('Đang dịch câu…'); const r = await mmTranslate(s.en, 'en', 'vi');
      if (r.ok && r.list[0]) { s.vi = r.list[0]; save(); } else toast('Không dịch được: ' + (r.err || 'không có kết quả') + '.');
    }
    if (N.mode === 'hide') N.mode = 'tap', N.open[gi] = true; const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  aWord: async el => {
    const w = el.dataset.w, box = $('#wpop'); if (!box) return; const lw = w.toLowerCase();
    const sent = (el.closest('.asn') || {}).dataset ? artSents(S.articles.find(x => x.id === ui.nw.id))[+el.closest('.asn').dataset.gi] : null;
    const voc = findVocab(lw), nt = S.noted.find(x => x.w.toLowerCase() === lw);
    const draw = (vi, ipa, extra) => { box.innerHTML = `<div class="panel" style="box-shadow:0 2px 12px rgba(0,0,0,.25)"><div class="row"><b style="font-size:20px">${esc(w)}</b>${ipa ? `<span class="ipa">/${esc(ipa)}/</span>` : ''} ${spk(w)}<span class="sp"></span><button class="btn sm" data-act="aPopClose" aria-label="Đóng">✕</button></div><div style="margin:6px 0">${vi ? esc(vi) : '<span class="muted">Đang tra…</span>'}${voc && voc.w.toLowerCase() !== lw ? ` <span class="small muted">(từ gốc: ${esc(voc.w)})</span>` : ''}</div>${extra || ''}<button class="chip y" style="cursor:pointer" data-act="noteWord" data-w="${esc(voc ? voc.w : lw)}" data-tid="" data-vi="${esc(vi || '')}" data-ex="${esc(sent ? sent.en : '')}" data-exvi="${esc(sent ? sent.vi : '')}">${isNoted(voc ? voc.w : lw) ? '📌 ' : '＋ '}${esc(voc ? voc.w : lw)}</button> <span class="small muted">bấm để note hoặc bỏ note</span></div>`; };
    draw(voc ? voc.vi : (nt ? nt.vi : ''), voc ? voc.ipa : (nt ? nt.ipa : ''));
    const need = !(voc || (nt && nt.vi)), [i, m] = await Promise.all([voc && voc.ipa || (nt && nt.ipa) ? null : ipaLookup(lw).catch(() => null), need ? mmTranslate(lw, 'en', 'vi') : null]);
    if (!$('#wpop') || $('#wpop .row b') && $('#wpop .row b').textContent !== w) return;
    const ipa = (voc && voc.ipa) || (nt && nt.ipa) || (i && i.r && (i.r.uk || i.r.us)) || '', vi = voc ? voc.vi : (nt && nt.vi) || (m && m.ok && m.list.length ? m.list.slice(0, 3).join('; ') : '');
    draw(vi || (m && !m.ok ? '' : 'Không có nghĩa gợi ý.'), ipa, m && !m.ok ? `<p class="small muted" style="margin:0 0 6px">Tra nghĩa online không được: ${esc(m.err)}.</p>` : (need && vi ? '<p class="small muted" style="margin:0 0 6px">Nghĩa gợi ý online, chỉ để tham khảo.</p>' : ''));
  },
  aPopClose: () => { const b = $('#wpop'); if (b) b.innerHTML = ''; },
  aRead: async () => {
    const a = S.articles.find(x => x.id === ui.nw.id); if (!a) return; stopSpeak(); const tok = ++ui.tok, ss = artSents(a);
    for (let i = 0; i < ss.length; i++) {
      if (tok !== ui.tok) break; const el = document.querySelector(`.asn[data-gi="${i}"]`); document.querySelectorAll('.asn.playing').forEach(x => x.classList.remove('playing')); if (el) { el.classList.add('playing'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      await speak(ss[i].en);
    }
    document.querySelectorAll('.asn.playing').forEach(x => x.classList.remove('playing'));
  },
});
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.chg === 'amode') { ui.nw.mode = e.target.value; render(); } });

/* ---------- Giao diện sáng/tối ---------- */
ACT.theme = () => {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), n = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('nguyen.theme', n); } catch (e) { }
};
const bump = k => { const r = dayRec(); r[k] = (r[k] || 0) + 1; S.log[today()] = (S.log[today()] || 0) + 1; save(); };

/* ---------- Ô tra từ dùng chung (Đặt câu, Nhật ký) ---------- */
const lkBox = id => { const st = ui.lk[id] || { q: '', html: '' }; return `<div class="lkbox"><div class="row"><b>🔎 Tra từ</b><input type="text" id="lk-${id}" data-lk="${id}" value="${esc(st.q)}" placeholder="Gõ tiếng Việt hoặc tiếng Anh, ví dụ: ganh đua" style="flex:1;min-width:180px;max-width:380px" autocomplete="off" aria-label="Tra từ"><button class="btn sm" data-act="lk" data-id="${id}">Tra</button></div><div id="lkres-${id}">${st.html}</div></div>`; };
ACT.lk = async el => {
  const id = el.dataset.id, inp = $('#lk-' + id), box = $('#lkres-' + id); if (!inp || !box) return;
  const q = inp.value; ui.lk[id] = { q, html: '' }; await lookupInto(box, q); if (ui.lk[id] && ui.lk[id].q === q) ui.lk[id].html = box.innerHTML.replace(/Đang tra online…/, '');
};
document.addEventListener('keydown', e => { const id = e.target.dataset && e.target.dataset.lk; if (e.key === 'Enter' && id) { e.preventDefault(); ACT.lk({ dataset: { id } }); } });

/* ---------- Nghe chép: nghe từng câu, gõ lại ---------- */
function dcSrc() {
  const D = ui.dc;
  if (D.src === 'a') { if (!S.articles.length) return null; const a = S.articles.find(x => x.id === D.aid) || S.articles[0]; D.aid = a.id; return { key: 'a|' + a.id, title: a.title, lines: artSents(a).map(x => ({ en: x.en, vi: x.vi || '', ipa: '' })), tp: null }; }
  const tp = curTopic(pasTopics); if (!tp) return null; ui.tid = tp.id; D.pi = Math.min(D.pi, tp.passages.length - 1); const p = tp.passages[D.pi]; return { key: 'p|' + tp.id + '|' + D.pi, title: p.title, lines: p.lines, tp };
}
const dcMask = (en, lv) => en.split(/\s+/).map(w => w.replace(/[A-Za-z0-9]/g, (ch, i) => i < lv - 1 ? ch : '•')).join(' ');
const dcBest = (src, i) => S.dict[src.key + '|' + i];
VIEWS.dict = () => {
  const D = ui.dc, src = dcSrc(), head = '<h1>Nghe chép</h1><p class="muted" style="margin-top:0">Nghe từng câu rồi gõ lại đúng những gì bạn nghe được. Không hiện chữ trước, chỉ gợi ý khi bạn cần. Đây là cách luyện tai và chính tả hiệu quả nhất.</p>';
  const srcSel = `<select data-chg="dsrc" aria-label="Nguồn"><option value="p" ${D.src === 'p' ? 'selected' : ''}>Đoạn văn trong chủ đề</option><option value="a" ${D.src === 'a' ? 'selected' : ''}>Bài báo</option></select>`;
  if (!src) return head + `<div class="panel"><div class="row">${srcSel}</div></div>` + empty(D.src === 'a' ? 'Chưa có bài báo. Hãy nhập gói bài báo hoặc dán bài ở mục Đọc báo.' : 'Chưa có đoạn văn nào để nghe chép.');
  D.i = Math.min(D.i, src.lines.length - 1); const l = src.lines[D.i], n = src.lines.length;
  const sel2 = D.src === 'a' ? `<select data-chg="daid" aria-label="Bài báo">${S.articles.map(a => `<option value="${esc(a.id)}" ${a.id === D.aid ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select>` : topicSelect(pasTopics) + (src.tp.passages.length > 1 ? `<select data-chg="dpi" aria-label="Đoạn">${src.tp.passages.map((x, i) => `<option value="${i}" ${i === D.pi ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select>` : '');
  const scores = src.lines.map((_, i) => dcBest(src, i)), done = scores.filter(x => x != null), avg = done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : 0;
  const top = `<div class="panel"><div class="row">${srcSel}${sel2}<span class="sp"></span><span class="chip t">${done.length}/${n} câu đã chép</span>${done.length ? `<span class="chip">TB ${avg}%</span>` : ''}</div></div>`;
  if (D.done) return head + top + `<div class="panel" style="text-align:center"><div class="score">${avg}%</div><h2 style="margin-top:12px">Hoàn thành “${esc(src.title)}”</h2><p class="muted">Điểm trung bình ${avg}% trên ${done.length}/${n} câu. ${avg >= 85 ? 'Tai nghe rất tốt!' : avg >= 60 ? 'Khá ổn, luyện lại các câu điểm thấp nhé.' : 'Nghe chậm hơn và dùng gợi ý, đừng vội.'}</p><div class="row" style="justify-content:center"><button class="btn pri" data-act="dcRestart">↻ Làm lại từ câu 1</button></div></div>`;
  const list = src.lines.map((x, i) => { const b = scores[i]; return `<div class="sline ${i === D.i ? 'on' : ''}" data-act="dcPick" data-i="${i}" tabindex="0" role="button"><b>${i + 1}</b><span style="flex:1" class="en-t ${b == null ? 'muted' : ''}">${b == null ? '••• chưa chép •••' : esc(x.en)}</span>${b != null ? `<span class="chip ${b >= 80 ? 't' : b >= 50 ? 'y' : 'r'}">${b}%</span>` : ''}</div>`; }).join('');
  let res = '';
  if (D.res) { const r = D.res; res = `<div class="res ${r.score >= 80 ? 'yes' : r.score >= 50 ? 'near' : 'no'}"><div class="row"><span class="score">${r.score}%</span><div><b>${r.score === 100 ? 'Chính xác hoàn toàn!' : r.score >= 80 ? 'Rất tốt, gần đúng hết' : r.score >= 50 ? 'Khá, còn sót vài từ' : 'Cần nghe lại kỹ hơn'}</b><br><span class="small muted">Không phân biệt hoa thường và dấu câu.</span></div></div>${r.ops ? `<p style="margin:10px 0 0">${diffHtml(r.ops)}</p><p class="small muted" style="margin:6px 0 0">Từ <span class="miss">xanh</span> là từ bạn thiếu hoặc gõ sai, <del class="extra">gạch đỏ</del> là từ thừa.</p>` : ''}<p style="margin:10px 0 0"><b>Câu đúng:</b> <span style="font-size:18px">${esc(l.en)}</span> ${spk(l.en)}</p>${l.ipa ? `<div class="ipa">/${esc(l.ipa)}/</div>` : ''}${l.vi ? `<p class="muted" style="margin:6px 0 0">${esc(l.vi)}</p>` : ''}</div>`; }
  const hintTxt = D.hint && !D.res ? `<div class="dline"><div class="small muted">💡 Gợi ý cấp ${D.hint}/3 (${D.hint === 1 ? 'số từ và độ dài' : D.hint === 2 ? 'chữ cái đầu mỗi từ' : '2 chữ cái đầu mỗi từ'})</div><div class="dtext">${esc(dcMask(l.en, D.hint))}</div></div>` : '';
  return head + top + `<div class="grid g2" style="align-items:start"><div class="panel" style="padding:8px;max-height:560px;overflow:auto">${list}</div>
  <div class="panel"><div class="ctype">Câu ${D.i + 1}/${n}</div><div class="row"><button class="btn pri" data-act="dcSay" data-r="1">🔊 Nghe</button><button class="btn" data-act="dcSay" data-r="0.6">🐢 Nghe chậm</button>${D.res ? '' : `<button class="btn warn" data-act="dcHint" ${D.hint >= 3 ? 'disabled' : ''}>💡 Gợi ý</button>`}</div>${hintTxt}
  <textarea id="dans" rows="3" style="margin-top:12px" placeholder="Gõ lại câu bạn vừa nghe…" ${D.res ? 'disabled' : ''} aria-label="Câu bạn nghe được" autocomplete="off" spellcheck="false">${esc(D.val || '')}</textarea>
  <div class="row" style="margin-top:10px">${D.res ? `<button class="btn pri" data-act="dcNext">${D.i < n - 1 ? 'Câu tiếp ▶ (Enter)' : 'Hoàn thành ✔'}</button><button class="btn" data-act="dcRetry">↻ Chép lại câu này</button>` : '<button class="btn pri" data-act="dcCheck">Kiểm tra (Enter)</button><button class="btn" data-act="dcGive">Bỏ qua, xem đáp án</button>'}</div>${res}</div></div>`;
};
function dcCheck(giveUp) {
  const D = ui.dc, src = dcSrc(), l = src.lines[D.i], val = giveUp ? '' : (($('#dans') || {}).value || ''); D.val = val;
  if (!giveUp && !val.trim()) return toast('Hãy gõ câu bạn nghe được trước, hoặc bấm "Bỏ qua, xem đáp án".');
  const r = judgeSentence(val, { en: [l.en], uses: [] }), score = giveUp ? 0 : r.v === 'yes' ? 100 : Math.round(r.ratio * 100);
  D.res = { score, ops: giveUp ? null : r.ops, gave: giveUp };
  const k = src.key + '|' + D.i; if (S.dict[k] == null || score > S.dict[k]) S.dict[k] = score;
  const d = dayRec(); d.dictSum = (d.dictSum || 0) + score; d.dictN = (d.dictN || 0) + 1; bump('dict'); render();
}
Object.assign(ACT, {
  dcSay: el => { const src = dcSrc(); speak(src.lines[ui.dc.i].en, +el.dataset.r); },
  dcHint: () => { const D = ui.dc; D.hint = Math.min(3, D.hint + 1); ui.noFocus = true; const v = ($('#dans') || {}).value; D.val = v || ''; render(); ui.noFocus = false; const t = $('#dans'); if (t) t.focus(); },
  dcCheck: () => dcCheck(false), dcGive: () => dcCheck(true),
  dcRetry: () => { const D = ui.dc; D.res = null; D.val = ''; render(); ACT.dcSay({ dataset: { r: 1 } }); },
  dcNext: () => { const D = ui.dc, src = dcSrc(); if (D.i >= src.lines.length - 1) { D.done = true; D.res = null; render(); window.scrollTo(0, 0); return; } D.i++; D.res = null; D.val = ''; D.hint = 0; render(); speak(src.lines[D.i].en, 1); },
  dcPick: el => { const D = ui.dc; D.i = +el.dataset.i; D.res = null; D.val = ''; D.hint = 0; D.done = false; render(); ACT.dcSay({ dataset: { r: 1 } }); },
  dcRestart: () => { const D = ui.dc; D.i = 0; D.res = null; D.val = ''; D.hint = 0; D.done = false; render(); ACT.dcSay({ dataset: { r: 1 } }); },
});
document.addEventListener('keydown', e => { if (ui.view === 'dict' && e.target.id === 'dans' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!ui.dc.res) dcCheck(false); } else if (ui.view === 'dict' && ui.dc.res && !ui.dc.done && e.key === 'Enter' && !(e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT')) { e.preventDefault(); ACT.dcNext(); } });
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.chg, D = ui.dc, reset = () => { D.i = 0; D.res = null; D.val = ''; D.hint = 0; D.done = false; };
  if (k === 'dsrc') { D.src = e.target.value; reset(); render(); } else if (k === 'daid') { D.aid = e.target.value; reset(); render(); } else if (k === 'dpi') { D.pi = +e.target.value; reset(); render(); }
  else if (k === 'goal') { S.settings.goalDays = Math.min(7, Math.max(1, +e.target.value || 5)); save(); render(); }
});

/* ---------- Nhật ký: Hôm nay bạn thế nào? ---------- */
const MOODS = [['great', '😄', 'Tuyệt vời'], ['good', '🙂', 'Ổn'], ['meh', '😐', 'Bình thường'], ['tired', '😴', 'Mệt'], ['worry', '😟', 'Lo lắng'], ['sad', '😢', 'Buồn']];
const moodIc = k => (MOODS.find(m => m[0] === k) || [0, '📝'])[1];
const STARTERS = ['Today I feel … because …', 'The best part of my day was …', 'Today I learned that …', 'At work, I …', 'Tomorrow I want to …', 'Something that made me smile today was …', 'I am a little worried about … because …'];
const hashS = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const allVocab = () => { const seen = new Set(), out = []; S.topics.forEach(t => t.words.forEach(w => { const k = w.w.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(w); } })); return out; };
const dailyWords = () => allVocab().map(w => [hashS(today() + w.w), w]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]);
const usedVocab = text => { const x = text.toLowerCase(); return allVocab().filter(w => new RegExp('\\b' + reEsc(w.w.toLowerCase()) + '(s|es|ed|d|ing)?\\b').test(x)); };
const wc = t => (t.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
function quickCheck(t) {
  const out = [];
  if (/(^|[\s(])i([\s,.!?]|$)/.test(t)) out.push('Chữ “I” (tôi) luôn viết hoa.');
  if (/\b(dont|cant|im|ive|didnt|doesnt|isnt|wasnt|wont|couldnt|shouldnt)\b/i.test(t)) out.push('Thiếu dấu nháy: don’t, can’t, I’m, I’ve, didn’t…');
  if (/\b(\w+)\s+\1\b/i.test(t.replace(/\b(had|that)\s+\1\b/gi, ''))) out.push('Có từ bị lặp liền nhau (ví dụ “the the”).');
  if (/\b(he|she|it)\s+(don't|do|have)\b/i.test(t)) out.push('Với he/she/it: dùng doesn’t / does / has.');
  if (/\b(i|you|we|they)\s+(doesn't|does|has)\b/i.test(t)) out.push('Với I/you/we/they: dùng don’t / do / have.');
  const ss = t.split(/(?<=[.!?])\s+|\n+/).map(x => x.trim()).filter(Boolean);
  if (ss.some(x => /^[a-z]/.test(x))) out.push('Đầu câu phải viết hoa.');
  if (t.trim() && !/[.!?…"”]$/.test(t.trim())) out.push('Cuối câu cuối cùng chưa có dấu chấm.');
  return out;
}
function jRender() {
  const t = ($('#jtx') || {}).value || '', n = wc(t), used = usedVocab(t), qc = quickCheck(t), box = $('#jlive'); if (!box) return;
  ui.jr.text = t; box.innerHTML = `<div class="row small"><span class="chip">${n} từ</span><span class="chip t">${used.length} từ vựng đã dùng</span></div>${used.length ? `<div style="margin:4px 0">${used.map(w => `<span class="chip t">${esc(w.w)}</span>`).join('')}</div>` : ''}${qc.length ? `<div class="msg warn" style="margin:8px 0 0"><b>Kiểm tra nhanh:</b><ul>${qc.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : (n > 3 ? '<p class="small" style="color:var(--go);margin:6px 0 0">✔ Chưa phát hiện lỗi cơ bản. Muốn kiểm tra kỹ hơn, bấm “Nhờ Claude sửa”.</p>' : '')}`;
}
function jStreak() { let n = 0, d = today(); if (!S.journal[d]) d = addDays(d, -1); while (S.journal[d]) { n++; d = addDays(d, -1); } return n; }
VIEWS.journal = () => {
  const J = ui.jr; if (!J.init) { J.date = today(); const e = S.journal[J.date]; J.mood = e ? e.mood : ''; J.text = e ? e.text : ''; J.init = true; }
  const isToday = J.date === today(), dw = dailyWords(), st = STARTERS[hashS(J.date) % STARTERS.length], js = jStreak();
  const hist = Object.keys(S.journal).sort().reverse().slice(0, 12).map(d => { const e = S.journal[d], open = ui.jr.open === d; return `<div class="hist"><div class="row"><b>${moodIc(e.mood)} ${d.split('-').reverse().join('/')}</b><span class="chip">${e.words} từ</span>${e.used && e.used.length ? `<span class="chip t">${e.used.length} từ vựng</span>` : ''}<span class="sp"></span><button class="btn sm" data-act="jOpen" data-d="${d}">${open ? 'Thu gọn' : 'Xem'}</button><button class="btn sm" data-act="jEdit" data-d="${d}">Sửa</button><button class="btn sm bad" data-act="jDel" data-d="${d}">Xoá</button></div><p class="ht ${open ? '' : 'muted'}">${open ? esc(e.text) + ' ' + spk(e.text) : esc(e.text.length > 140 ? e.text.slice(0, 140) + '…' : e.text)}</p></div>`; }).join('');
  return `<h1>Hôm nay bạn thế nào?</h1><p class="muted" style="margin-top:0">${isToday ? greet() + ', Nguyên! ' : 'Đang sửa nhật ký ngày ' + J.date.split('-').reverse().join('/') + '. '}Viết vài câu tiếng Anh về ngày của bạn. Viết sai cũng không sao, quan trọng là viết đều mỗi ngày.${js ? ` <span class="chip y">🔥 ${js} ngày viết liên tiếp</span>` : ''}</p>
  <div class="panel"><h3>Bạn cảm thấy thế nào?</h3><div class="mood">${MOODS.map(m => `<button class="${J.mood === m[0] ? 'on' : ''}" data-act="jMood" data-m="${m[0]}"><span>${m[1]}</span>${m[2]}</button>`).join('')}</div></div>
  <div class="panel"><div class="row" style="margin-bottom:8px"><h3 style="margin:0">Viết bằng tiếng Anh</h3><span class="sp"></span><button class="btn sm" data-act="jStart" data-s="${esc(st)}">✨ Gợi ý mở đầu</button></div>
  ${dw.length ? `<p class="small" style="margin:0 0 8px">Thử dùng từ hôm nay (bấm để chèn): ${dw.map(w => `<span class="chip y" data-act="jIns" data-w="${esc(w.w)}" style="cursor:pointer" title="${esc(w.vi)}">＋ ${esc(w.w)}</span>`).join('')}</p>` : ''}
  <textarea id="jtx" rows="8" placeholder="Today I feel … Hôm nay mình thấy … (viết bằng tiếng Anh)" aria-label="Nhật ký">${esc(J.text)}</textarea><div id="jlive" style="margin-top:8px"></div>
  <div class="row" style="margin-top:12px"><button class="btn go" data-act="jSave">💾 Lưu nhật ký</button><button class="btn" data-act="jClaude">📋 Nhờ Claude sửa</button><button class="btn" data-act="jSay">🔊 Nghe lại</button>${isToday ? '' : '<button class="btn" data-act="jToday">Về hôm nay</button>'}</div></div>
  <div class="panel">${lkBox('j')}</div>
  <div class="panel"><h3>Nhật ký đã viết</h3>${hist || '<p class="empty">Chưa có bài nào. Hãy viết bài đầu tiên nhé!</p>'}</div>`;
};
Object.assign(ACT, {
  jMood: el => { ui.jr.text = ($('#jtx') || {}).value || ui.jr.text; ui.jr.mood = el.dataset.m; ui.noFocus = true; render(); ui.noFocus = false; jRender(); },
  jStart: el => { const t = $('#jtx'); if (!t) return; t.value = (t.value ? t.value.replace(/\s*$/, '\n') : '') + el.dataset.s.replace(/…/g, '...') + ' '; t.focus(); jRender(); },
  jIns: el => { const t = $('#jtx'); if (!t) return; t.value += (t.value && !/\s$/.test(t.value) ? ' ' : '') + el.dataset.w + ' '; t.focus(); jRender(); },
  jSave: () => {
    const J = ui.jr, text = (($('#jtx') || {}).value || '').trim(); if (!text) return toast('Bạn chưa viết gì. Thử bấm “Gợi ý mở đầu” nhé.');
    const isNew = !S.journal[J.date]; S.journal[J.date] = { mood: J.mood, text, words: wc(text), used: usedVocab(text).map(w => w.w), ts: Date.now() };
    if (isNew && J.date === today()) bump('journal'); else save(); J.text = text; toast('Đã lưu nhật ký. Làm tốt lắm!'); ui.noFocus = true; render(); ui.noFocus = false; jRender();
  },
  jOpen: el => { ui.jr.open = ui.jr.open === el.dataset.d ? null : el.dataset.d; ui.jr.text = ($('#jtx') || {}).value || ui.jr.text; ui.noFocus = true; render(); ui.noFocus = false; jRender(); },
  jEdit: el => { const e = S.journal[el.dataset.d]; Object.assign(ui.jr, { date: el.dataset.d, mood: e.mood, text: e.text, init: true }); render(); window.scrollTo(0, 0); },
  jToday: () => { ui.jr.init = false; render(); },
  jDel: el => { if (confirm('Xoá bài nhật ký ngày ' + el.dataset.d + '?')) { delete S.journal[el.dataset.d]; save(); ui.jr.init = false; render(); } },
  jSay: () => { const t = ($('#jtx') || {}).value.trim(); if (t) speak(t); },
  jClaude: async () => {
    const t = ($('#jtx') || {}).value.trim(); if (!t) return toast('Hãy viết nhật ký trước.');
    const p = `Hãy sửa nhật ký tiếng Anh dưới đây của mình (trình độ đang học, mình là người Việt). Yêu cầu: 1) đưa bản đã sửa hoàn chỉnh; 2) liệt kê từng lỗi bằng tiếng Việt, giải thích ngắn gọn vì sao sai; 3) gợi ý 3 cách diễn đạt tự nhiên hơn; 4) chấm điểm trên 10.\n\n"""\n${t}\n"""`;
    try { await navigator.clipboard.writeText(p); } catch (e) { const a = document.createElement('textarea'); a.value = p; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } toast('Đã sao chép. Dán vào Claude để được sửa chi tiết.');
  },
});
document.addEventListener('input', e => { if (e.target.id === 'jtx') jRender(); });

/* ---------- Báo cáo tuần ---------- */
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const weekStart = off => { const d = new Date(today() + 'T00:00:00'); return addDays(today(), -((d.getDay() + 6) % 7) + off * 7); };
function weekData(off) {
  const st = weekStart(off), days = DOW.map((nm, i) => { const d = addDays(st, i), r = S.day[d] || {}; return { d, nm, rev: r.reviews || 0, sent: r.sent || 0, sh: r.shadow || 0, dc: r.dict || 0, jn: S.journal[d] ? 1 : 0, tot: S.log[d] || 0, future: d > today(), now: d === today() }; });
  const sum = k => days.reduce((a, x) => a + x[k], 0), R = d => S.day[d.d] || {}, sr = k => days.reduce((a, x) => a + (R(x)[k] || 0), 0);
  const ok = sr('ok'), hard = sr('hard'), miss = sr('miss'), dN = sr('dictN');
  return { st, end: addDays(st, 6), days, rev: sum('rev'), sent: sum('sent'), sh: sum('sh'), dc: sum('dc'), jn: sum('jn'), tot: sum('tot'), active: days.filter(x => x.tot > 0).length, ok, hard, miss, acc: ok + hard + miss ? Math.round(100 * ok / (ok + hard + miss)) : null, newW: sr('new') + sr('sentNew'), dAvg: dN ? Math.round(sr('dictSum') / dN) : null, jWords: days.reduce((a, x) => a + (S.journal[x.d] ? S.journal[x.d].words : 0), 0) };
}
const delta = (a, b, suf = '') => { if (b == null || a == null) return ''; const d = a - b; return d === 0 ? '' : `<span class="dl ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${suf}</span>`; };
const dmy = d => d.slice(8) + '/' + d.slice(5, 7);
function insights(w, p, off) {
  const g = S.settings.goalDays, out = [], add = (e, t) => out.push(`<div class="insight"><span class="ie">${e}</span><div>${t}</div></div>`);
  if (!w.tot) { add('🌱', off === 0 ? 'Tuần này bạn chưa học buổi nào. Chỉ cần <b>10 phút</b> hôm nay là chuỗi ngày bắt đầu rồi!' : 'Tuần này bạn không có hoạt động nào.'); return out; }
  add(w.active >= g ? '🎯' : '📅', w.active >= g ? `Đạt mục tiêu: học <b>${w.active}/${g}</b> ngày trong tuần. Giữ nhịp này nhé!` : `Bạn đã học <b>${w.active}/${g}</b> ngày${off === 0 ? `, còn cần thêm <b>${g - w.active}</b> ngày để đạt mục tiêu` : ''}.`);
  if (p.tot) add(w.tot >= p.tot ? '📈' : '📉', `Tổng hoạt động <b>${w.tot}</b> so với <b>${p.tot}</b> tuần trước (${w.tot >= p.tot ? 'tăng' : 'giảm'} ${Math.abs(w.tot - p.tot)}).`);
  if (w.acc != null) add(w.acc >= 80 ? '🧠' : w.acc >= 60 ? '💪' : '⚠️', w.acc >= 80 ? `Ghi nhớ rất tốt: đúng <b>${w.acc}%</b> các lượt ôn.` : w.acc >= 60 ? `Độ chính xác <b>${w.acc}%</b>. Còn quên khá nhiều, hãy đọc lại ví dụ của các từ hay sai.` : `Độ chính xác chỉ <b>${w.acc}%</b>. Giảm số từ mới mỗi ngày (Cài đặt) để ôn kỹ hơn.`);
  if (!w.dc) add('🎧', 'Chưa có buổi <b>Nghe chép</b> nào. Mỗi ngày 5 câu sẽ cải thiện tai nghe rất nhanh.'); else if (w.dAvg != null) add('🎧', `Nghe chép: điểm trung bình <b>${w.dAvg}%</b> qua ${w.dc} câu.`);
  if (!w.jn) add('📔', 'Tuần này chưa viết <b>nhật ký</b>. Chỉ 3 câu “Hôm nay bạn thế nào?” là đủ.'); else add('📔', `Đã viết <b>${w.jn}</b> bài nhật ký, tổng <b>${w.jWords}</b> từ tiếng Anh.`);
  const best = [...w.days].sort((a, b) => b.tot - a.tot)[0]; if (best.tot) add('⭐', `Ngày học tốt nhất: <b>${best.nm} ${dmy(best.d)}</b> với ${best.tot} hoạt động.`);
  if (off === 0 && streak() >= 3) add('🔥', `Chuỗi học hiện tại: <b>${streak()}</b> ngày liên tiếp.`);
  return out;
}
VIEWS.report = () => {
  const off = ui.rp.off, w = weekData(off), p = weekData(off - 1), max = Math.max(1, ...w.days.map(x => x.rev + x.sent + x.sh + x.dc + x.jn));
  const cols = w.days.map(x => { const t = x.rev + x.sent + x.sh + x.dc + x.jn, H = 130, h = v => Math.round(H * v / max); return `<div class="col ${x.now ? 'today' : ''}" title="${x.nm} ${dmy(x.d)}: ${t} hoạt động"><em>${t || ''}</em><div class="stack" style="height:${t ? Math.max(6, h(t)) : 4}px">${[['c1', x.rev], ['c2', x.sent], ['c3', x.sh], ['c4', x.dc], ['c5', x.jn]].map(([c, v]) => v ? `<i class="${c}" style="height:${100 * v / t}%"></i>` : '').join('')}</div><span>${x.nm}</span></div>`; }).join('');
  const words = allVocab(), grp = [[0, 0, '#cbd5e1', 'Mới / chưa học'], [1, 3, '#f59e0b', 'Đang học (hộp 1–3)'], [4, 5, '#0ea5e9', 'Khá chắc (hộp 4–5)'], [6, 6, '#10b981', 'Đã thuộc (hộp 6)']];
  const bx = x => (x.srs && x.srs.r ? x.srs.r.b : 0), cnt = grp.map(g => words.filter(x => bx(x) >= g[0] && bx(x) <= g[1]).length), tot = words.length || 1; let acc = 0;
  const conic = tot && words.length ? cnt.map((c, i) => { const a = acc, b = acc += 100 * c / tot; return `${grp[i][2]} ${a}% ${b}%`; }).join(',') : '#e5e7eb 0 100%';
  const leech = words.map(x => [Math.max(0, ...Object.values(x.srs || {}).map(s => s.lapses || 0)), x]).filter(a => a[0] >= 3).sort((a, b) => b[0] - a[0]).slice(0, 10);
  const trows = S.topics.map(t => { const n = t.words.length, m = t.words.filter(x => bx(x) >= 4).length, pc = n ? Math.round(100 * m / n) : 0; return `<tr><td><b>${esc(t.name)}</b></td><td>${n}</td><td style="min-width:140px"><div class="bar"><i style="width:${pc}%"></i></div></td><td>${pc}%</td></tr>`; }).join('');
  const mood = Object.keys(S.journal).filter(d => d >= w.st && d <= w.end).map(d => moodIc(S.journal[d].mood)).join(' ');
  return `<h1>Báo cáo tuần</h1><div class="row" style="margin-bottom:16px"><button class="btn sm" data-act="rpPrev">◀ Tuần trước</button><b>${dmy(w.st)} – ${dmy(w.end)}${off === 0 ? ' (tuần này)' : ''}</b><button class="btn sm" data-act="rpNext" ${off >= 0 ? 'disabled' : ''}>Tuần sau ▶</button><span class="sp"></span><label class="small" for="goal">Mục tiêu</label><input id="goal" type="number" min="1" max="7" value="${S.settings.goalDays}" data-chg="goal" style="width:64px"><span class="small muted">ngày/tuần</span><button class="btn sm" data-act="rpCopy">📋 Sao chép báo cáo</button></div>
  <div class="grid g4" style="margin-bottom:18px"><div class="stat"><b>${w.tot}</b><span>hoạt động ${delta(w.tot, p.tot)}</span></div><div class="stat"><b>${w.active}/${S.settings.goalDays}</b><span>ngày đã học ${delta(w.active, p.active)}</span></div><div class="stat"><b>${w.acc == null ? '–' : w.acc + '%'}</b><span>độ chính xác ${delta(w.acc, p.acc, '%')}</span></div><div class="stat"><b>${w.newW}</b><span>mục mới học ${delta(w.newW, p.newW)}</span></div></div>
  <div class="panel"><h2>Hoạt động theo ngày</h2><div class="chart">${cols}</div><div class="legend"><span><i class="c1"></i>Thẻ ${w.rev}</span><span><i class="c2"></i>Đặt câu ${w.sent}</span><span><i class="c3"></i>Shadowing ${w.sh}</span><span><i class="c4"></i>Nghe chép ${w.dc}</span><span><i class="c5"></i>Nhật ký ${w.jn}</span></div>${mood ? `<p class="small muted" style="margin:12px 0 0">Tâm trạng trong tuần: <span style="font-size:20px">${mood}</span></p>` : ''}</div>
  <div class="panel"><h2>Nhận xét của tuần</h2>${insights(w, p, off).join('')}</div>
  <div class="grid g2" style="align-items:start"><div class="panel"><h2>Mức độ nhớ từ vựng</h2>${words.length ? `<div class="row" style="gap:20px;align-items:center"><div class="donut" style="background:conic-gradient(${conic})"><div><b>${words.length}</b><small>từ</small></div></div><div class="legend" style="flex-direction:column;gap:6px;margin:0">${grp.map((g, i) => `<span><i style="background:${g[2]}"></i>${g[3]}: <b>${cnt[i]}</b></span>`).join('')}</div></div>` : '<p class="empty">Chưa có từ vựng.</p>'}</div>
  <div class="panel"><h2>Từ hay quên</h2>${leech.length ? leech.map(a => `<span class="chip r" title="Quên ${a[0]} lần">${esc(a[1].w)} · ${a[0]}</span>`).join('') + '<p class="small muted" style="margin:8px 0 0">Đọc lại ví dụ và đặt thêm câu với những từ này.</p>' : '<p class="muted">Chưa có từ nào bị quên nhiều lần. Tốt lắm!</p>'}</div></div>
  <div class="panel"><h2>Tiến độ theo chủ đề</h2>${trows ? `<table class="wl"><tr><th>Chủ đề</th><th>Số từ</th><th>Đã thuộc</th><th></th></tr>${trows}</table>` : '<p class="empty">Chưa có chủ đề.</p>'}</div>`;
};
function reportText(off) {
  const w = weekData(off), p = weekData(off - 1);
  return `BÁO CÁO TUẦN ${dmy(w.st)} – ${dmy(w.end)} (Nguyên ơi học đi)\n- Tổng hoạt động: ${w.tot} (tuần trước ${p.tot})\n- Ngày đã học: ${w.active}/${S.settings.goalDays}\n- Thẻ: ${w.rev} · Đặt câu: ${w.sent} · Shadowing: ${w.sh} · Nghe chép: ${w.dc}${w.dAvg != null ? ' (TB ' + w.dAvg + '%)' : ''} · Nhật ký: ${w.jn} bài (${w.jWords} từ)\n- Độ chính xác ôn tập: ${w.acc == null ? 'chưa có' : w.acc + '%'}\n- Mục mới học: ${w.newW}`;
}
Object.assign(ACT, {
  rpPrev: () => { ui.rp.off--; render(); }, rpNext: () => { ui.rp.off = Math.min(0, ui.rp.off + 1); render(); },
  rpCopy: async () => { const t = reportText(ui.rp.off); try { await navigator.clipboard.writeText(t); } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } toast('Đã sao chép báo cáo.'); },
});

function repMsg(r) {
  if (r.err) return { text: r.err, kind: 'err' }; const x = r.rep;
  const html = `<b>Đã nhập:</b> ${x.topics} chủ đề · ${x.wNew} từ mới${x.wUp ? `, ${x.wUp} từ cập nhật` : ''}${x.pas ? ` · ${x.pas} đoạn văn` : ''}${x.sen ? ` · ${x.sen} câu đặt câu` : ''}${x.wr ? ` · ${x.wr} đoạn luyện viết` : ''}${x.art ? ` · ${x.art} bài báo` : ''}.${x.raw ? '<br>Danh sách thô chỉ tạo thẻ. Để có đoạn văn, IPA và câu đặt câu, bấm “Sao chép lời nhắn gửi Claude” rồi dán vào Claude.' : ''}${x.warn.length ? `<ul>${x.warn.slice(0, 8).map(w => `<li>${esc(w)}</li>`).join('')}${x.warn.length > 8 ? `<li>và ${x.warn.length - 8} cảnh báo khác</li>` : ''}</ul>` : ''}`;
  return { html, kind: x.warn.length ? 'warn' : '' };
}
document.addEventListener('click', e => {
  const t = $('#tip'); if (t && !e.target.closest('#tip') && !e.target.closest('mark')) t.remove();
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const f = ACT[el.dataset.act]; if (f) f(el, e);
});
document.addEventListener('change', async e => {
  const el = e.target; const k = el.dataset && el.dataset.chg;
  if (el.id === 'file' || el.id === 'bk') { const f = el.files[0]; if (!f) return; const txt = await f.text(); if (el.id === 'bk') { try { const j = JSON.parse(txt); if (!Array.isArray(j.topics)) throw 0; S = Object.assign(blank(), j); save(); ui.msg = { text: 'Đã khôi phục từ file sao lưu.' }; } catch (x) { ui.msg = { text: 'File sao lưu không hợp lệ.', kind: 'err' }; } } else ui.msg = repMsg(importText(txt)); render(); return; }
  if (!k) return;
  if (k === 'tsel') { ui.tid = el.value; ui.cs = null; ui.ss = null; ui.sh.li = 0; ui.sh.res = null; ui.pv.pi = 0; ui.sh.pi = 0; Object.assign(ui.dc, { i: 0, pi: 0, res: null, val: '', hint: 0, done: false }); render(); }
  else if (k === 'pi') { ui.pv.pi = +el.value; render(); } else if (k === 'spi') { ui.sh.pi = +el.value; ui.sh.li = 0; ui.sh.res = null; render(); }
  else if (k === 'tg') { ui.pv[el.dataset.k] = el.checked; render(); } else if (k === 'shHide') { ui.sh.hide = el.checked; render(); }
  else if (k === 'npd') { S.settings.newPerDay = Math.max(0, +el.value || 0); save(); nav(); } else if (k === 'nsd') { S.settings.newSent = Math.max(0, +el.value || 0); save(); nav(); }
  else if (k === 'ipaAcc') { ui.ipa.acc = el.value; render(); }
  else if (k === 'spick') { if (el.checked) ui.pick.add(el.dataset.id); else ui.pick.delete(el.dataset.id); const n = $('#pickN'); if (n) n.textContent = ui.pick.size; }
  else if (k === 'rate') { S.settings.rate = +el.value; save(); } else if (k === 'voice') { S.settings.voice = el.value; save(); }
});
document.addEventListener('keydown', e => {
  const tag = e.target.tagName, inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('sline')) return e.target.dataset.act === 'dcPick' ? ACT.dcPick(e.target) : ACT.pickLine(e.target);
  if (e.key === 'Enter' && e.target.matches && e.target.matches('mark')) return ACT.tip(e.target, e);
  if (ui.view === 'cards' && ui.cs && !ui.cs.done && !ui.cs.empty) {
    const c = ui.cs, k = c.queue[c.i], typed = k.ty !== 'r';
    if (typed) { if (e.key === 'Enter') { e.preventDefault(); if (!c.res) checkTyped(); else advance(c, c.res === 'yes' ? 2 : c.res === 'near' ? 1 : 0, 'card'); } else if (c.res && /^[12]$/.test(e.key) && !inField) { const g = c.res === 'yes' ? (e.key === '1' ? 2 : 3) : c.res === 'near' ? 1 : 0; advance(c, g, 'card'); } return; }
    if (inField) return;
    if (!c.flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); ACT.flip(); } else if (c.flipped && /^[1-4]$/.test(e.key)) advance(c, +e.key - 1, 'card');
  } else if (ui.view === 'sent' && ui.ss && !ui.ss.done && !ui.ss.empty) {
    const c = ui.ss; if (e.target.dataset && e.target.dataset.lk) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!c.res) ACT.checkS(); else advance(c, c.res.v === 'yes' ? 2 : c.res.v === 'near' ? 1 : 0, 'sent'); }
  }
});
['dragover', 'dragleave', 'drop'].forEach(ev => document.addEventListener(ev, async e => {
  const d = e.target.closest && e.target.closest('#drop'); if (!d) return; e.preventDefault();
  if (ev === 'dragover') d.classList.add('over'); else d.classList.remove('over');
  if (ev === 'drop' && e.dataTransfer.files[0]) { ui.msg = repMsg(importText(await e.dataTransfer.files[0].text())); render(); }
}));
document.addEventListener('input', e => { if (e.target.id !== 'sfilter') return; ui.sfilter = e.target.value; const f = ui.sfilter.toLowerCase().trim(); document.querySelectorAll('.srow').forEach(r => { r.style.display = !f || r.dataset.t.includes(f) ? 'flex' : 'none'; }); });
document.addEventListener('input', e => { if (e.target.id === 'ipaText') ui.ipa.text = e.target.value; if (e.target.id === 'nfilter') { ui.nfilter = e.target.value; const f = ui.nfilter.toLowerCase().trim(); document.querySelectorAll('.nrow').forEach(r => { r.style.display = !f || r.dataset.t.includes(f) ? 'block' : 'none'; }); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'nw' || e.target.id === 'nvi')) { e.preventDefault(); ACT.noteAdd(); } });
document.addEventListener('keydown', e => { if (ui.view === 'ipa' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACT.ipaRun(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const t = $('#tip'); if (t) t.remove(); } });
if (tts) speechSynthesis.onvoiceschanged = () => { if (ui.view === 'home') render(); };
render();