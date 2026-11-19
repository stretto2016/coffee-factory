/* ===========================================================
   리뷰 모드 — 홈페이지 화면을 보면서 바로 수정 요청을 남기는 도구
   주소 뒤에 ?review 를 붙였을 때만 index.html이 이 파일을 불러온다.
   일반 방문자에게는 로드조차 되지 않으므로 사이트 성능에 영향이 없다.

   남기는 방법은 네 가지다.
     ✏️ 글자 고치기  — 글자를 눌러 그 자리에서 고쳐 쓰면 "원래 → 고친 문구"로 저장
     🖼 사진 바꾸기  — 사진을 눌러 휴대폰 사진첩에서 고르면 그 사진으로 바꿔 달라는 요청
     🖍 화면에 그리기 — 손가락으로 동그라미 · 화살표를 그리면 그 화면이 그림째로 저장
     💬 메모          — 예전처럼 버튼 · 메모로 남기기

   모든 요청은 Firestore(reviewComments)에 저장되고, 개발자가 직접 읽어 가므로
   파일을 내보내 전달할 필요가 없다. 반영이 끝난 요청은 "반영 완료"로 표시된다.
   고친 글자 · 사진은 이 화면에서만 미리 보여 줄 뿐, 실제 사이트 내용은 바뀌지 않는다.

   미리보기 사이트에서는 💬 Claude와 대화 창이 더 붙는다 (reviewChat).
   사장님 컴퓨터의 리뷰 도우미(functions/review-agent.js)가 대화 · 바로 고침 요청을 받아
   Claude에게 넘기고, 고친 결과를 미리보기 브랜치에만 올린다. 실제 사이트에는 올리지 않는다.
   =========================================================== */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp, limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUjfrQ-HVivBLggiOl8vvRZynala1qqyM",
  authDomain: "roastery-f3e2e.firebaseapp.com",
  projectId: "roastery-f3e2e",
  storageBucket: "roastery-f3e2e.firebasestorage.app",
  messagingSenderId: "79814680110",
  appId: "1:79814680110:web:86aa08fe0e273fed6649bf"
};

const PASS = '1014';
const OK_KEY = 'stretto_review_ok';   // 비밀번호를 한 번 넣으면 다음부터 안 묻는다
const COL = 'reviewComments';
const UPLOAD_DIR = 'reviewUploads';   // 바꿀 사진 · 그림 캡처가 올라가는 Storage 폴더
const H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

/* 메모를 남길 때 쓰는 빠른 선택 버튼 */
const TAG_GROUPS = [
  { label: '글자', tags: ['더 크게', '더 작게', '굵게', '얇게', '글꼴 바꾸기'] },
  { label: '색상', tags: ['더 진하게', '더 연하게', '색 바꾸기'] },
  { label: '줄',   tags: ['여기서 줄바꿈', '줄바꿈 없애기', '줄간격 넓게', '줄간격 좁게'] },
  { label: '간격', tags: ['위 여백 늘리기', '위 여백 줄이기', '아래 여백 늘리기', '아래 여백 줄이기'] },
  { label: '정렬', tags: ['왼쪽 정렬', '가운데 정렬'] },
  { label: '내용', tags: ['삭제', '순서 이동'] }
];

/* 섹션 id를 사람이 읽을 수 있는 이름으로 */
const SECTION_NAMES = {
  hero: '메인 첫 화면', story: '스토리', shop: '원두 샵', finder: '원두 추천',
  wholesale: '납품·도매', maintenance: '유지보수', consulting: '컨설팅',
  contact: '푸터 · 문의하기', repairModal: '수리 신청 창',
  'home-brand': '메인 · 브랜드', 'home-beans': '메인 · 원두', 'home-business': '메인 · 비즈니스',
  'brand-naming': '이름과 연혁', 'brand-vision': '비전',
  'wh-quality': '품질', 'wh-promise': '파트너십 약속', 'wh-process': '진행 절차',
  'care-intro': '수리 항목', 'care-process': '수리 절차', 'care-benefit': '파트너 혜택',
  'cs-services': '컨설팅 내용', education: '바리스타 교육', 'edu-course': '교육 내용', 'edu-process': '교육 진행', 'cs-manual': '창업 매뉴얼', 'cs-steps': '창업 10단계'
};

/* 홈페이지가 /brand, /wholesale 같은 페이지로 나뉜 뒤로는 코멘트마다 어느 페이지인지 기록한다 */
const ROUTE_NAMES = {
  home: '메인', brand: '브랜드 스토리', beans: '원두', wholesale: '원두 납품',
  care: '머신 케어', consulting: '창업 컨설팅', education: '바리스타 교육'
};
const ROUTE_PATHS = {
  home: '/', brand: '/brand', beans: '/beans', wholesale: '/wholesale', care: '/care', consulting: '/consulting', education: '/education'
};
const currentRoute = () => document.body.dataset.route || 'home';

/* 미리보기(vercel.app · 내 컴퓨터)와 실제 사이트의 코멘트를 섞지 않는다.
   예전 코멘트에는 site 가 없으므로 실제 사이트 것으로 본다. */
const SITE = /(^|\.)stretto\.co\.kr$/.test(location.hostname) ? 'live' : 'preview';
const SITE_NAMES = { live: '실제 사이트', preview: '미리보기' };

/* 💬 Claude와 대화 — 미리보기 사이트에서만 (실제 사이트 리뷰는 예전처럼 요청만 남긴다) */
const CHAT_ON = SITE === 'preview';
const CHAT_COL = 'reviewChat';
const AGENT_COL = 'reviewAgent';

const KIND_LABEL = { edit: '✏️ 글자 고침', photo: '🖼 사진 교체', draw: '🖍 그림', memo: '💬 메모' };

/* 코멘트를 달 수 있는 요소들 */
const PICKABLE = 'h1,h2,h3,h4,h5,h6,p,li,span,a,button,strong,em,img,figcaption,blockquote,td,th,label,dt,dd,summary';
/* 그 자리에서 글자를 고칠 수 있는 요소들 */
const TEXT_TAGS = /^(H[1-6]|P|LI|SPAN|A|BUTTON|STRONG|EM|B|FIGCAPTION|BLOCKQUOTE|TD|TH|LABEL|DT|DD|SUMMARY|SMALL)$/;
const RV_UI = '#rv-panel,#rv-gate,#rv-pins,#rv-hover,#rv-toast,#rv-bubble,#rv-editbar,#rv-draw,#rv-lightbox,#rv-fab,#rv-pickbar';

let db, storage, comments = [], selected = null, picking = true, activeId = null;
let editing = null;        // 지금 고쳐 쓰는 중인 글자 { el, startHtml, origText, info, prevId }
let mapPending = false;    // 글자를 고치는 동안 들어온 새 목록은 다 고친 뒤에 반영한다
let showDone = false;
const pinEls = new Map();
const origStore = new Map(); // 미리 보여 주려고 바꾼 요소의 원래 모습 (el → { html } 또는 { src })
let chatMsgs = [], chatReady = false, agent = null;
let agentSeenAt = 0, wokeAt = Date.now();   // agentOnline() 참고
let attach = [];           // 보낼 메시지에 붙인 것들 (📍 위치 · 🖍 그림 · 📎 사진)
let pickForChat = false;   // 📍 위치 버튼을 누른 뒤 화면을 누르면 그 자리를 대화에 붙인다
let tab = CHAT_ON ? 'chat' : 'list';

/* ---------- 작은 도우미들 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const isRvUI = (el) => !!(el && el.closest && el.closest(RV_UI));
const isDone = (c) => c.status === 'done';
/* 이 화면을 연 뒤에(또는 열기 직전 1분 30초 안에) 반영된 요청은, 화면을 새로 받기 전까지 고친 모습을 계속 보여 준다.
   예전에는 "반영 완료"가 되는 순간 원래 사진 · 글자로 되돌아가서, 새로고침 전에는 안 바뀐 것처럼 보였다. */
const LOADED_AT = Date.now();
const doneSinceLoad = (c) => isDone(c) && c.doneAt && c.doneAt.toMillis && c.doneAt.toMillis() > LOADED_AT - 90 * 1000;
const showChange = (c) => !isDone(c) || doneSinceLoad(c);
const kindOf = (c) => c.kind || 'memo';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

function toast(msg, stay) {
  const t = $('#rv-toast');
  t.textContent = msg;
  t.classList.add('rv-show');
  clearTimeout(toast._t);
  if (!stay) toast._t = setTimeout(() => t.classList.remove('rv-show'), 2200);
}

/* ---------- 1. 비밀번호 화면 ---------- */
function showGate() {
  const gate = document.createElement('div');
  gate.id = 'rv-gate';
  gate.innerHTML = `
    <div class="rv-gate-card">
      <h2>스트레토 홈페이지 검토</h2>
      <p>비밀번호를 입력해 주세요</p>
      <input id="rv-pass" type="password" inputmode="numeric" maxlength="12" autocomplete="off">
      <p id="rv-gate-err"></p>
      <button id="rv-gate-btn">들어가기</button>
    </div>`;
  document.body.appendChild(gate);

  const input = $('#rv-pass');
  input.focus();
  const submit = () => {
    if (input.value.trim() === PASS) {
      try { localStorage.setItem(OK_KEY, '1'); } catch (_) {}
      gate.remove();
      start();
    } else {
      $('#rv-gate-err').textContent = '비밀번호가 맞지 않습니다.';
      input.value = '';
      input.focus();
    }
  };
  $('#rv-gate-btn').addEventListener('click', submit);
  gate.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
}

/* ---------- 2. 요소 위치 기록 ---------- */
function sectionOf(el) {
  if (el.closest('.page-hero')) return { id: 'page-hero', name: '페이지 첫 배너' };
  if (el.closest('.page-chips')) return { id: 'page-chips', name: '페이지 바로가기 버튼' };
  const sec = el.closest('section[id],div[id],header[id],footer[id]');
  if (!sec) return { id: '', name: '기타' };
  const id = sec.id;
  return { id, name: SECTION_NAMES[id] || id };
}

/* 나중에 다시 찾아올 수 있게 CSS 경로를 만든다 */
function cssPath(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.body) {
    if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
    let p = node.tagName.toLowerCase();
    const cls = [...node.classList].filter((c) => !c.startsWith('rv-')).slice(0, 2);
    if (cls.length) p += '.' + cls.map((c) => CSS.escape(c)).join('.');
    const sibs = node.parentElement
      ? [...node.parentElement.children].filter((s) => s.tagName === node.tagName) : [];
    if (sibs.length > 1) p += `:nth-of-type(${sibs.indexOf(node) + 1})`;
    parts.unshift(p);
    node = node.parentElement;
    if (parts.length > 8) break;
  }
  return parts.join(' > ');
}

/* 코멘트 하나에 자동으로 따라붙는 정보 — "조금만 키워주세요"를 정확히 처리하기 위한 핵심 */
function describe(el) {
  const cs = getComputedStyle(el);
  const sec = sectionOf(el);
  const text = norm(el.innerText || el.getAttribute('alt') || '');
  return {
    page: location.pathname.split('/').pop() || 'index.html',
    site: SITE,
    route: currentRoute(),
    sectionId: sec.id,
    sectionName: sec.name,
    selector: cssPath(el),
    tagName: el.tagName.toLowerCase(),
    text: text.slice(0, 160),
    imgSrc: el.tagName === 'IMG' ? (el.getAttribute('src') || '') : '',
    style: {
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      color: cs.color,
      fontFamily: (cs.fontFamily || '').split(',')[0].replace(/["']/g, ''),
      textAlign: cs.textAlign,
      margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
      letterSpacing: cs.letterSpacing
    },
    viewport: window.innerWidth,
    device: window.innerWidth < 768 ? '모바일' : (window.innerWidth < 1100 ? '태블릿' : 'PC')
  };
}

/* 저장해 둔 코멘트의 요소를 다시 찾는다.
   내가 사이트를 고치면 CSS 경로가 어긋날 수 있어서, 문구로도 한 번 더 찾는다. */
function relocate(c) {
  if (c.selector) {
    try {
      const e = document.querySelector(c.selector);
      if (e && !isRvUI(e)) return e;
    } catch (_) {}
  }
  if (c.imgSrc) {
    const e = [...document.images].find((i) => i.getAttribute('src') === c.imgSrc);
    if (e) return e;
  }
  if (c.text) {
    const key = c.text.slice(0, 40);
    for (const e of document.querySelectorAll(PICKABLE + ',div,section')) {
      if (isRvUI(e)) continue;
      const t = norm(e.innerText || e.getAttribute('alt') || '');
      if (t && t.slice(0, 40) === key && t.length <= c.text.length + 80) return e;
    }
  }
  return null;
}

/* ---------- 3. 고친 글자 · 바꾼 사진을 화면에 미리 보여 주기 ---------- */
const snap = (el) => el.tagName === 'IMG'
  ? { src: el.getAttribute('src') }
  : { html: el.innerHTML };

function putBack(el, o) {
  if ('html' in o) el.innerHTML = o.html;
  else el.setAttribute('src', o.src);
  el.classList.remove('rv-edited', 'rv-replaced');
}

function restoreAll() {
  for (const [el, o] of origStore) putBack(el, o);
  origStore.clear();
}

function applyChanges() {
  comments.forEach((c) => {
    const el = c._el;
    if (!el || !showChange(c)) return;
    const done = isDone(c);   // 반영 완료된 것은 노란 표시 없이 바뀐 모습만
    if (kindOf(c) === 'edit' && el.tagName !== 'IMG') {
      if (!origStore.has(el)) origStore.set(el, snap(el));
      el.innerText = c.newText || '';
      if (!done) el.classList.add('rv-edited');
    } else if (kindOf(c) === 'photo' && el.tagName === 'IMG' && c.newImageUrl) {
      if (!origStore.has(el)) origStore.set(el, snap(el));
      el.setAttribute('src', c.newImageUrl);
      if (!done) el.classList.add('rv-replaced');
    }
  });
}

/* 미리 보기로 바뀐 요소라도 원래 모습 기준으로 정보를 기록한다 */
function withOriginal(el, fn) {
  const o = origStore.get(el);
  if (!o) return fn();
  const cur = snap(el);
  const cls = ['rv-edited', 'rv-replaced'].filter((k) => el.classList.contains(k));
  putBack(el, o);
  try { return fn(); } finally { putBack(el, cur); el.classList.add(...cls); }
}

/* ---------- 4. 화면 표시 — 테두리와 번호 핀 ---------- */
function drawHover(el) {
  const box = $('#rv-hover');
  if (!el) { box.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) { box.style.display = 'none'; return; }
  Object.assign(box.style, {
    display: 'block',
    left: (r.left - 2) + 'px',
    top: (r.top - 2) + 'px',
    width: (r.width + 4) + 'px',
    height: (r.height + 4) + 'px'
  });
}

function syncPins() {
  for (const [, pin] of pinEls) {
    const el = pin._target;
    if (!el || !el.isConnected) { pin.style.display = 'none'; continue; }
    const r = el.getBoundingClientRect();
    if (r.width < 1 && r.height < 1) { pin.style.display = 'none'; continue; }
    pin.style.display = 'flex';
    pin.style.left = (r.left + window.scrollX) + 'px';
    pin.style.top = (r.top + window.scrollY) + 'px';
  }
}

function rebuildPins() {
  const box = $('#rv-pins');
  box.innerHTML = '';
  pinEls.clear();
  openList().forEach((c, i) => {
    if (!c._el) return;
    const pin = document.createElement('div');
    pin.className = 'rv-pin';
    pin.textContent = String(i + 1);
    pin.title = KIND_LABEL[kindOf(c)];
    pin._target = c._el;
    pin.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openPanel();
      focusComment(c.id);
    });
    box.appendChild(pin);
    pinEls.set(c.id, pin);
  });
  syncPins();
}

function focusComment(id) {
  activeId = id;
  renderList();
  const item = $(`.rv-item[data-id="${id}"]`);
  if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ---------- 5. 패널 ---------- */
function buildPanel() {
  const p = document.createElement('div');
  p.id = 'rv-panel';
  p.innerHTML = CHAT_ON ? chatPanelHtml() : `
    <button id="rv-handle" title="패널 접기/펴기">❯</button>
    <div class="rv-head">
      <h1>수정 요청 남기기</h1>
      <div class="rv-count" id="rv-count">요청 0개</div>
      <div class="rv-how">글자나 사진을 누르면 <b>고치기 메뉴</b>가 떠요.<br>위치를 그림으로 알려 주고 싶으면 <b>🖍 화면에 그리기</b>를 누르세요.</div>
      <div class="rv-head-btns">
        <button id="rv-draw-btn" class="rv-btn rv-primary">🖍 화면에 그리기</button>
        <button id="rv-mode" class="rv-on" title="끄면 사이트를 평소처럼 눌러볼 수 있어요">
          <span class="rv-switch"></span><span class="rv-mode-txt">고치기 켜짐</span>
        </button>
      </div>
    </div>
    <div id="rv-list"></div>
    <div class="rv-foot">
      <span class="rv-foot-note">남긴 요청은 자동으로 전달돼요</span>
      <button class="rv-link" id="rv-export">파일로 받기</button>
    </div>`;
  document.body.appendChild(p);

  const hover = document.createElement('div'); hover.id = 'rv-hover';
  const pins = document.createElement('div'); pins.id = 'rv-pins';
  const t = document.createElement('div'); t.id = 'rv-toast';
  const fab = document.createElement('button'); fab.id = 'rv-fab';
  fab.innerHTML = '🖍<span>그리기</span>';
  fab.title = '화면에 그리기';
  document.body.append(hover, pins, t, fab);

  $('#rv-handle').addEventListener('click', () => {
    if (p.classList.contains('rv-collapsed')) openPanel(); else closePanel();
  });
  $('#rv-mode').addEventListener('click', setPicking);
  $('#rv-export').addEventListener('click', exportMd);
  $('#rv-draw-btn').addEventListener('click', startDraw);
  fab.addEventListener('click', startDraw);
  if (CHAT_ON) bindChat();

  // 폰에서는 패널이 화면 대부분을 가리므로 접은 채로 시작한다
  if (window.innerWidth < 760) closePanel();
}

function openPanel() { $('#rv-panel').classList.remove('rv-collapsed'); $('#rv-handle').textContent = '❯'; $('#rv-handle').classList.remove('rv-new'); }
function closePanel() { $('#rv-panel').classList.add('rv-collapsed'); $('#rv-handle').textContent = '❮'; }

function setPicking() {
  picking = !picking;
  const btn = $('#rv-mode');
  btn.classList.toggle('rv-on', picking);
  btn.querySelector('.rv-mode-txt').textContent = picking ? '고치기 켜짐' : '고치기 꺼짐';
  document.documentElement.classList.toggle('rv-picking', picking);
  if (!picking) { drawHover(null); hideBubble(); selected = null; renderList(); }
}

/* ---------- 6. 목록 & 메모 작성 폼 ---------- */
const openList = () => comments.filter((c) => !isDone(c));
const doneList = () => comments.filter(isDone);

function itemBody(c) {
  const k = kindOf(c);
  if (k === 'edit') {
    return `<div class="rv-diff"><div class="rv-old">${esc(c.origText || c.text)}</div><div class="rv-new">${esc(c.newText)}</div></div>`;
  }
  if (k === 'photo') {
    return `<div class="rv-quote">(사진) ${esc(c.imgSrc || '')}</div>
      <div class="rv-thumbs"><img src="${esc(c.newImageUrl)}" data-zoom="${esc(c.newImageUrl)}" alt="바꿀 사진"></div>`;
  }
  if (k === 'draw') {
    return c.imageUrl
      ? `<div class="rv-thumbs"><img src="${esc(c.imageUrl)}" data-zoom="${esc(c.imageUrl)}" alt="그림"></div>`
      : `<div class="rv-quote">(그림 캡처 없음) ${esc(c.text || '')}</div>`;
  }
  return `<div class="rv-quote">${esc(c.text || (c.imgSrc ? '(사진) ' + c.imgSrc : '(내용 없음)'))}</div>`;
}

function itemHtml(c, num) {
  const away = otherPage(c);
  const done = isDone(c);
  const lost = !done && !away && (!c._el || !isShown(c._el)) && kindOf(c) !== 'draw';
  const showTags = (c.tags || []).filter((t) => !['문구 수정', '이미지 교체', '그림'].includes(t));
  return `
    <div class="rv-item ${c.id === activeId ? 'rv-active' : ''} ${lost ? 'rv-lost' : ''} ${done ? 'rv-done' : ''}" data-id="${esc(c.id)}">
      <div class="rv-item-top" data-goto="${esc(c.id)}">
        <span class="rv-num">${done ? '✓' : num}</span>
        <div class="rv-item-body">
          <div class="rv-where"><span class="rv-kind">${KIND_LABEL[kindOf(c)]}</span>${c.route ? `<b>${esc(ROUTE_NAMES[c.route] || c.route)}</b> · ` : ''}${esc(c.sectionName || '기타')}</div>
          ${itemBody(c)}
          ${done ? '<span class="rv-done-tag">반영 완료</span>'
            : away ? '<span class="rv-lost-tag">다른 페이지 · 누르면 이동</span>'
            : (lost ? '<span class="rv-lost-tag">화면에서 위치를 못 찾음</span>' : '')}
        </div>
        <button class="rv-del" data-del="${esc(c.id)}" title="삭제">×</button>
      </div>
      ${showTags.length ? `<div class="rv-tags-shown">${showTags.map((t) => `<span class="rv-chip-s">${esc(t)}</span>`).join('')}</div>` : ''}
      ${c.memo ? `<div class="rv-memo-shown">${esc(c.memo)}</div>` : ''}
    </div>`;
}

function renderList() {
  const list = $('#rv-list');
  if (!list) return;
  const open = openList(), done = doneList();
  $('#rv-count').textContent = `요청 ${open.length}개` + (done.length ? ` · 반영 완료 ${done.length}개` : '');

  let html = '';

  if (selected) {
    const d = selected.info;
    html += `
      <div class="rv-item rv-active">
        <div class="rv-item-top">
          <span class="rv-num">+</span>
          <div class="rv-item-body">
            <div class="rv-where"><span class="rv-kind">💬 메모</span>${esc(d.sectionName)}</div>
            <div class="rv-quote">${esc(d.text || (d.imgSrc ? '(사진) ' + d.imgSrc : '(내용 없음)'))}</div>
          </div>
          <button class="rv-del" id="rv-cancel" title="취소">×</button>
        </div>
        <div class="rv-form">
          <textarea class="rv-memo" id="rv-memo" placeholder="하고 싶은 말을 적어 주세요&#10;예) 첫 문장이 답답해 보여요. 여기서 한 번 끊어 주세요"></textarea>
          ${TAG_GROUPS.map((g) => `
            <div class="rv-grp">
              <div class="rv-grp-label">${g.label}</div>
              <div class="rv-chips">
                ${g.tags.map((t) => `<button class="rv-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
              </div>
            </div>`).join('')}
          <div class="rv-form-btns">
            <button class="rv-btn" id="rv-cancel2">취소</button>
            <button class="rv-btn rv-primary" id="rv-save">저장</button>
          </div>
        </div>
      </div>`;
  }

  if (!open.length && !selected) {
    html += `<div id="rv-empty">아직 남긴 요청이 없어요.<br>고치고 싶은 글자나 사진을<br>화면에서 눌러 보세요.</div>`;
  }

  open.forEach((c, i) => { html += itemHtml(c, i + 1); });

  if (done.length) {
    html += `<button class="rv-done-toggle" id="rv-done-toggle">${showDone ? '▾' : '▸'} 반영 완료 ${done.length}개</button>`;
    if (showDone) done.slice().reverse().forEach((c) => { html += itemHtml(c, ''); });
  }

  list.innerHTML = html;

  if (selected) {
    list.querySelectorAll('.rv-chip').forEach((btn) => {
      btn.addEventListener('click', () => btn.classList.toggle('rv-sel'));
    });
    $('#rv-cancel').addEventListener('click', cancelForm);
    $('#rv-cancel2').addEventListener('click', cancelForm);
    $('#rv-save').addEventListener('click', saveComment);
    $('#rv-memo').focus();
  }

  const tg = $('#rv-done-toggle');
  if (tg) tg.addEventListener('click', () => { showDone = !showDone; renderList(); });

  list.querySelectorAll('[data-zoom]').forEach((img) => {
    img.addEventListener('click', (e) => { e.stopPropagation(); showLightbox(img.dataset.zoom); });
  });
  list.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('이 요청을 지울까요?')) return;
      const c = comments.find((x) => x.id === btn.dataset.del);
      try {
        await deleteDoc(doc(db, COL, btn.dataset.del));
        removeUpload(c);
      } catch (_) { toast('삭제하지 못했습니다.'); }
    });
  });
  list.querySelectorAll('[data-goto]').forEach((row) => {
    row.addEventListener('click', () => {
      const c = comments.find((x) => x.id === row.dataset.goto);
      activeId = row.dataset.goto;
      if (c && otherPage(c)) { goRoute(c.route); return; }
      if (c) scrollToComment(c);
      renderList();
    });
  });
}

function scrollToComment(c) {
  if (c._el) c._el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  else if (kindOf(c) === 'draw' && c.scrollY != null) window.scrollTo({ top: c.scrollY, behavior: 'smooth' });
}

function cancelForm() {
  selected = null;
  drawHover(null);
  renderList();
}

async function saveComment() {
  const tags = [...document.querySelectorAll('.rv-chip.rv-sel')].map((b) => b.dataset.tag);
  const memo = $('#rv-memo').value.trim();
  if (!tags.length && !memo) { toast('메모를 적거나 버튼을 골라 주세요.'); return; }

  const payload = { ...selected.info, kind: 'memo', tags, memo, createdAt: serverTimestamp() };
  const btn = $('#rv-save');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    await addDoc(collection(db, COL), payload);
    selected = null;
    drawHover(null);
    toast('저장했어요.');
  } catch (err) {
    console.error(err);
    toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요.');
    btn.disabled = false; btn.textContent = '저장';
  }
}

/* ---------- 7. 화면에서 요소를 누르면 뜨는 작은 메뉴 ---------- */
function pickTarget(node) {
  if (!node || node.nodeType !== 1 || isRvUI(node)) return null;
  if (node.matches(PICKABLE)) return node;
  const up = node.closest(PICKABLE);
  if (up && !isRvUI(up)) return up;
  if (node.matches('section,div,figure,header,footer,nav,article')) return node;
  return null;
}

const isTextEl = (el) => TEXT_TAGS.test(el.tagName)
  && !el.querySelector('img,svg,input,select,textarea,video,iframe')
  && norm(el.innerText).length > 0;
const imgOf = (el) => {
  if (el.tagName === 'IMG') return el;
  const imgs = el.querySelectorAll('img');
  return imgs.length === 1 ? imgs[0] : null;
};

function hideBubble() {
  const b = $('#rv-bubble');
  if (b) b.remove();
  if (!selected && !editing) drawHover(null);
}

function placeNear(box, el) {
  const r = el.getBoundingClientRect();
  const bw = box.offsetWidth, bh = box.offsetHeight;
  let top = r.top - bh - 8;
  if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - bh - 8);
  if (top < 8) top = 8;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - bw - 8));
  box.style.top = top + 'px';
  box.style.left = left + 'px';
}

function showBubble(el) {
  hideBubble();
  const acts = [];
  if (isTextEl(el)) acts.push(['edit', '✏️ 글자 고치기']);
  const img = imgOf(el);
  if (img) acts.push(['photo', '🖼 사진 바꾸기']);
  acts.push(CHAT_ON ? ['ask', '💬 Claude에게 말하기'] : ['memo', '💬 메모']);

  const b = document.createElement('div');
  b.id = 'rv-bubble';
  b.innerHTML = acts.map(([k, l]) => `<button data-act="${k}">${l}</button>`).join('')
    + '<button data-act="x" class="rv-bx" title="닫기">×</button>';
  document.body.appendChild(b);
  b._target = el;
  placeNear(b, el);
  drawHover(el);

  b.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    e.stopPropagation();
    hideBubble();
    if (act === 'edit') startEdit(el);
    else if (act === 'photo') startPhoto(img);
    else if (act === 'ask') attachEl(el);
    else if (act === 'memo') {
      selected = { el, info: withOriginal(el, () => describe(el)) };
      drawHover(el);
      openPanel();
      renderList();
    } else drawHover(null);
  });
}

function attachPicker() {
  let downPt = null;
  document.addEventListener('mousedown', (e) => {
    downPt = (picking && !isRvUI(e.target)) ? { x: e.clientX, y: e.clientY } : null;
  }, true);

  document.addEventListener('mousemove', (e) => {
    if (pickForChat) { if (!e.buttons) drawHover(pickTarget(e.target)); return; }
    if (!picking || selected || editing || $('#rv-bubble') || $('#rv-draw')) return;
    if (e.buttons) return;
    drawHover(pickTarget(e.target));
  }, true);

  document.addEventListener('click', (e) => {
    if (isRvUI(e.target) || $('#rv-draw')) return;

    // 글자를 고치는 중: 그 글자 안을 누르면 커서만 옮기고, 바깥을 누르면 고친 내용을 저장한다
    if (editing) {
      e.preventDefault();
      e.stopPropagation();
      if (!editing.el.contains(e.target)) finishEdit(true);
      return;
    }
    if (pickForChat) {
      const el = pickTarget(e.target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      stopPickForChat();
      attachEl(el);
      return;
    }
    if (!picking) return;
    const el = pickTarget(e.target);
    if (!el) return;
    // 리뷰 중에는 링크 이동이나 버튼 동작을 막는다
    e.preventDefault();
    e.stopPropagation();

    // 글자를 끌어서 선택한 것이라면 메뉴를 띄우지 않는다 (복사할 수 있게)
    const sel = window.getSelection();
    const dragged = downPt && (Math.abs(e.clientX - downPt.x) > 4 || Math.abs(e.clientY - downPt.y) > 4);
    if (dragged || (sel && !sel.isCollapsed && sel.toString().trim())) { drawHover(null); return; }

    if (selected) { selected = null; renderList(); }
    showBubble(el);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (editing) {
      if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finishEdit(true); }
    } else if (e.key === 'Escape') {
      hideBubble();
      closeLightbox();
      if (pickForChat) stopPickForChat();
    }
  }, true);

  // 스크롤·창 크기 변화에 맞춰 테두리, 핀, 메뉴 위치를 다시 계산한다
  let ticking = false;
  const refresh = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      syncPins();
      const b = $('#rv-bubble');
      if (b && b._target) { placeNear(b, b._target); drawHover(b._target); }
      else if (editing) drawHover(null);
      else if (selected && selected.el.isConnected) drawHover(selected.el);
    });
  };
  window.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', () => { refresh(); mapComments(); });
  window.addEventListener('load', () => setTimeout(() => { mapComments(); }, 300));
}

/* ---------- 8. ✏️ 글자를 그 자리에서 고치기 ---------- */
function startEdit(el) {
  if (editing) finishEdit(false);
  hideBubble();
  drawHover(null);

  // 이미 고친 글자를 다시 고치면, 원래 문구는 그대로 두고 제안만 새로 바꾼다
  const prev = openList().find((c) => kindOf(c) === 'edit' && c._el === el);
  const o = origStore.get(el);
  const origText = o ? withOriginal(el, () => el.innerText) : el.innerText;
  const info = withOriginal(el, () => describe(el));

  editing = { el, startHtml: el.innerHTML, startText: el.innerText, origText, info, prevId: prev && prev.id };

  try { el.contentEditable = 'plaintext-only'; } catch (_) { el.contentEditable = 'true'; }
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  el.spellcheck = false;
  el.classList.add('rv-editing');
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const bar = document.createElement('div');
  bar.id = 'rv-editbar';
  bar.innerHTML = `
    <span class="rv-eb-txt">글자를 고쳐 쓰세요 · 줄을 바꾸려면 Enter</span>
    <button class="rv-btn" id="rv-eb-cancel">취소</button>
    <button class="rv-btn rv-primary" id="rv-eb-ok">다 고쳤어요</button>`;
  document.body.appendChild(bar);
  // 버튼을 누르는 순간 글자 칸의 커서가 빠지지 않게 한다
  bar.addEventListener('mousedown', (e) => e.preventDefault());
  $('#rv-eb-cancel').addEventListener('click', () => finishEdit(false));
  $('#rv-eb-ok').addEventListener('click', () => finishEdit(true));
}

async function finishEdit(save) {
  if (!editing) return;
  const ed = editing;
  editing = null;
  const { el } = ed;
  const newText = el.innerText.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  el.removeAttribute('contenteditable');
  el.classList.remove('rv-editing');
  const bar = $('#rv-editbar');
  if (bar) bar.remove();
  window.getSelection().removeAllRanges();
  el.innerHTML = ed.startHtml;   // 화면은 저장된 목록 기준으로 다시 그린다

  const changed = save && norm(newText) !== norm(ed.startText);
  if (!changed) { flushMap(); return; }

  try {
    if (norm(newText) === norm(ed.origText)) {
      // 원래 문구로 되돌린 경우 — 고친 요청을 지운다
      if (ed.prevId) await deleteDoc(doc(db, COL, ed.prevId));
      toast('원래 문구로 되돌렸어요.');
    } else {
      await addDoc(collection(db, COL), {
        ...ed.info, kind: 'edit', tags: ['문구 수정'], memo: '',
        origText: ed.origText.slice(0, 3000), newText: newText.slice(0, 3000),
        createdAt: serverTimestamp()
      });
      if (ed.prevId) await deleteDoc(doc(db, COL, ed.prevId));
      toast(CHAT_ON ? '저장했어요. Claude가 곧 반영해요.' : '고친 글자를 저장했어요.');
    }
  } catch (err) {
    console.error(err);
    toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요.');
  }
  flushMap();
}

function flushMap() {
  if (mapPending) { mapPending = false; mapComments(); }
}

/* ---------- 9. 🖼 사진 바꾸기 ---------- */
async function shrinkImage(file, max = 2000, quality = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function upload(blob, prefix) {
  const path = `${UPLOAD_DIR}/${prefix}-${uid()}.jpg`;
  const r = sRef(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return { path, url: await getDownloadURL(r) };
}

function removeUpload(c) {
  const path = c && (c.imagePath || c.newImagePath);
  if (path) deleteObject(sRef(storage, path)).catch(() => {});
}

function startPhoto(img) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    toast('사진을 올리는 중이에요…', true);
    try {
      const blob = await shrinkImage(file);
      const up = await upload(blob, 'photo');
      const prev = openList().find((c) => kindOf(c) === 'photo' && c._el === img);
      await addDoc(collection(db, COL), {
        ...withOriginal(img, () => describe(img)), kind: 'photo', tags: ['이미지 교체'], memo: '',
        newImageUrl: up.url, newImagePath: up.path, fileName: file.name.slice(0, 120),
        createdAt: serverTimestamp()
      });
      if (prev) { await deleteDoc(doc(db, COL, prev.id)); removeUpload(prev); }
      toast(CHAT_ON ? '사진을 저장했어요. Claude가 곧 반영해요.' : '사진을 바꿨어요. 화면에서 확인해 보세요.');
    } catch (err) {
      console.error(err);
      toast('사진을 올리지 못했습니다. 다시 해 주세요.');
    }
  });
  input.click();
}

/* ---------- 10. 🖍 화면에 그리기 ---------- */
function loadH2C() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (loadH2C._p) return loadH2C._p;
  loadH2C._p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = H2C_URL;
    s.onload = () => res(window.html2canvas);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return loadH2C._p;
}

function startDraw() {
  if (editing) finishEdit(true);
  hideBubble();
  if (selected) cancelForm();
  if ($('#rv-draw')) return;
  loadH2C().catch(() => {});   // 그리는 동안 화면 캡처 도구를 미리 받아 둔다

  const panelWasOpen = !$('#rv-panel').classList.contains('rv-collapsed');
  closePanel();
  document.documentElement.classList.add('rv-drawing');

  const wrap = document.createElement('div');
  wrap.id = 'rv-draw';
  wrap.innerHTML = `
    <canvas id="rv-canvas"></canvas>
    <div class="rv-draw-bar" id="rv-draw-bar">
      <span class="rv-eb-txt">고칠 곳에 동그라미나 화살표를 그려 주세요</span>
      <div class="rv-draw-btns">
        <button class="rv-btn" id="rv-dr-undo">되돌리기</button>
        <button class="rv-btn" id="rv-dr-cancel">취소</button>
        <button class="rv-btn rv-primary" id="rv-dr-next">다 그렸어요</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const cv = $('#rv-canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  cv.width = vw * dpr; cv.height = vh * dpr;
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const strokes = [];
  let cur = null;

  const paint = () => {
    g.clearRect(0, 0, vw, vh);
    drawStrokes(g, strokes, 1);
  };
  cv.addEventListener('pointerdown', (e) => {
    cur = [[e.clientX, e.clientY]];
    strokes.push(cur);
    cv.setPointerCapture(e.pointerId);
    paint();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!cur) return;
    const [lx, ly] = cur[cur.length - 1];
    if (Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly) < 3) return;
    cur.push([e.clientX, e.clientY]);
    paint();
  });
  const end = () => { cur = null; };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  // 그리는 동안 화면이 움직이면 그림 위치가 어긋나므로 스크롤을 막는다
  wrap.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  wrap.addEventListener('touchmove', (e) => { if (e.target === cv) e.preventDefault(); }, { passive: false });

  const close = () => {
    wrap.remove();
    document.documentElement.classList.remove('rv-drawing');
    if (panelWasOpen) openPanel();
  };

  $('#rv-dr-undo').addEventListener('click', () => { strokes.pop(); paint(); });
  $('#rv-dr-cancel').addEventListener('click', close);
  $('#rv-dr-next').addEventListener('click', async () => {
    if (!strokes.length) { toast('먼저 화면에 그려 주세요.'); return; }
    if (CHAT_ON) {
      // 미리보기에서는 다 그리면 그 화면을 대화에 붙이고, 무엇을 고칠지는 대화로 적는다
      const btn = $('#rv-dr-next');
      btn.disabled = true; btn.textContent = '화면 담는 중…';
      try {
        const { info, shot } = await captureDrawing(strokes, wrap, { vw, vh, sx: window.scrollX, sy: window.scrollY });
        if (!shot) throw new Error('캡처 실패');
        close();
        attach.push({ type: 'draw', url: shot.url, path: shot.path, info });
        renderAtt();
        showTab('chat'); openPanel();
        $('#rv-input').focus();
        toast('그림을 붙였어요. 무엇을 고칠지 적고 보내 주세요.');
      } catch (err) {
        console.error(err);
        btn.disabled = false; btn.textContent = '다 그렸어요';
        toast('화면을 담지 못했어요. 다시 해 주세요.');
      }
      return;
    }
    $('#rv-draw-bar').innerHTML = `
      <textarea class="rv-memo" id="rv-dr-memo" rows="2" placeholder="무엇을 고치면 될지 적어 주세요 (안 적어도 돼요)"></textarea>
      <div class="rv-draw-btns">
        <button class="rv-btn" id="rv-dr-back">다시 그리기</button>
        <button class="rv-btn rv-primary" id="rv-dr-save">저장</button>
      </div>`;
    cv.style.pointerEvents = 'none';
    $('#rv-dr-back').addEventListener('click', () => { close(); startDraw(); });
    $('#rv-dr-save').addEventListener('click', async () => {
      const btn = $('#rv-dr-save');
      btn.disabled = true; btn.textContent = '저장 중…';
      const memo = $('#rv-dr-memo').value.trim().slice(0, 1900);
      try {
        await saveDrawing(strokes, memo, wrap, { vw, vh, sx: window.scrollX, sy: window.scrollY });
        close();
        toast('그림을 저장했어요.');
      } catch (err) {
        console.error(err);
        btn.disabled = false; btn.textContent = '저장';
        toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요.');
      }
    });
  });
}

function drawStrokes(g, strokes, k) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#e5243b';
  g.lineWidth = 4 * k;
  strokes.forEach((s) => {
    g.beginPath();
    s.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
    if (s.length === 1) g.lineTo(s[0][0] * k + 0.1, s[0][1] * k);
    g.stroke();
  });
}

async function saveDrawing(strokes, memo, wrap, v) {
  const { info, shot } = await captureDrawing(strokes, wrap, v);
  await addDoc(collection(db, COL), {
    ...info, kind: 'draw', tags: ['그림'], memo,
    strokes: strokes.map((s) => ({ p: s.flatMap(([x, y]) => [Math.round(x + v.sx), Math.round(y + v.sy)]) })),
    scrollY: Math.round(v.sy), viewH: v.vh, viewport: v.vw,
    imageUrl: shot ? shot.url : '', imagePath: shot ? shot.path : '',
    createdAt: serverTimestamp()
  });
}

async function captureDrawing(strokes, wrap, v) {
  // 그림 한가운데에 있는 요소를 기준 위치로 삼는다 (어느 섹션인지 알 수 있게)
  const xs = strokes.flat().map((p) => p[0]), ys = strokes.flat().map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  wrap.style.visibility = 'hidden';
  const under = document.elementFromPoint(cx, cy);
  wrap.style.visibility = '';
  const anchor = under && !isRvUI(under) ? (pickTarget(under) || under) : null;
  const info = anchor ? withOriginal(anchor, () => describe(anchor))
    : { page: 'index.html', site: SITE, route: currentRoute(), sectionId: '', sectionName: '기타', selector: '', tagName: '', text: '', imgSrc: '' };

  // 지금 보이는 화면을 캡처하고 그 위에 그림을 얹는다
  let shot = null;
  try {
    const h2c = await loadH2C();
    const base = await h2c(document.body, {
      x: v.sx, y: v.sy, width: v.vw, height: v.vh,
      windowWidth: v.vw, windowHeight: v.vh,
      // 복제 화면은 스크롤하지 않고, 페이지 전체 좌표에서 지금 보이는 부분만 잘라 낸다
      scrollX: 0, scrollY: 0,
      scale: 1, useCORS: true, logging: false, backgroundColor: '#ffffff',
      ignoreElements: (e) => isRvUI(e),
      // 사이트의 scroll-behavior: smooth 때문에 복제 화면이 스크롤되기 전에 찍히는 것을 막는다
      onclone: (d) => { d.documentElement.style.scrollBehavior = 'auto'; }
    });
    const out = document.createElement('canvas');
    out.width = base.width; out.height = base.height;
    const og = out.getContext('2d');
    og.drawImage(base, 0, 0);
    drawStrokes(og, strokes, base.width / v.vw);
    const blob = await new Promise((res) => out.toBlob(res, 'image/jpeg', 0.82));
    if (blob) shot = await upload(blob, 'draw');
  } catch (err) {
    console.warn('화면 캡처 실패 — 그림 좌표만 저장합니다.', err);
  }
  return { info, shot };
}

/* 사진 · 그림을 크게 보기 */
function showLightbox(src) {
  closeLightbox();
  const lb = document.createElement('div');
  lb.id = 'rv-lightbox';
  lb.innerHTML = `<img src="${esc(src)}" alt=""><button class="rv-lb-x" title="닫기">×</button>`;
  lb.addEventListener('click', closeLightbox);
  document.body.appendChild(lb);
}
function closeLightbox() { const lb = $('#rv-lightbox'); if (lb) lb.remove(); }

/* ---------- 11. 파일로 받기 (예비용 — 평소에는 자동으로 전달된다) ---------- */
function buildMd() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const list = openList();
  let out = `# 스트레토 홈페이지 수정 요청\n\n`;
  out += `- 작성일: ${stamp}\n- 사이트: ${SITE_NAMES[SITE]} (${location.host})\n- 총 ${list.length}건\n\n---\n\n`;

  list.forEach((c, i) => {
    const st = c.style || {};
    out += `## ${i + 1}. ${KIND_LABEL[kindOf(c)]} · ${c.sectionName || '기타'}\n\n`;
    out += `- **페이지**: ${c.route ? `${ROUTE_NAMES[c.route] || c.route} (${ROUTE_PATHS[c.route] || ''})` : (c.page || 'index.html')}\n`;
    out += `- **위치**: \`${c.selector || '-'}\`\n`;
    if (kindOf(c) === 'edit') {
      out += `- **원래 문구**: "${c.origText || c.text}"\n- **고친 문구**: "${c.newText}"\n`;
    } else if (c.text) out += `- **현재 문구**: "${c.text}"\n`;
    if (c.imgSrc) out += `- **사진 파일**: ${c.imgSrc}\n`;
    if (c.newImageUrl) out += `- **바꿀 사진**: ${c.newImageUrl}\n`;
    if (c.imageUrl) out += `- **그림 캡처**: ${c.imageUrl}\n`;
    if (st.fontSize) out += `- **현재 스타일**: ${st.fontSize} / 굵기 ${st.fontWeight} / 줄간격 ${st.lineHeight} / 색 ${st.color} / 정렬 ${st.textAlign}\n`;
    out += `- **보던 화면**: ${c.device || '-'} (${c.viewport || '-'}px)\n`;
    if ((c.tags || []).length) out += `- **요청**: ${c.tags.join(', ')}\n`;
    if (c.memo) out += `- **메모**: ${c.memo}\n`;
    out += '\n';
  });
  return out;
}

function exportMd() {
  if (!openList().length) { toast('받을 요청이 없어요.'); return; }
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blob = new Blob([buildMd()], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `홈페이지-수정요청-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('파일을 저장했어요.');
}

/* ---------- 11-2. 💬 Claude와 대화 (미리보기 사이트) ----------
   가리키고(📍 위치 · 🖍 그림 · 📎 사진) → 말하면, 사장님 컴퓨터의 리뷰 도우미가
   Claude에게 넘겨 미리보기에 반영하고 이 창으로 답을 보낸다. */
function chatPanelHtml() {
  return `
    <button id="rv-handle" title="패널 접기/펴기">❯</button>
    <div class="rv-head">
      <h1>홈페이지 고치기</h1>
      <div class="rv-tabs">
        <button class="rv-tab" data-tab="chat">💬 Claude와 대화</button>
        <button class="rv-tab" data-tab="list">📋 요청 목록</button>
      </div>
      <div class="rv-head-btns rv-list-only">
        <button id="rv-draw-btn" class="rv-btn rv-primary">🖍 화면에 그리기</button>
        <button id="rv-mode" class="rv-on" title="끄면 사이트를 평소처럼 눌러볼 수 있어요">
          <span class="rv-switch"></span><span class="rv-mode-txt">고치기 켜짐</span>
        </button>
      </div>
      <div class="rv-count rv-list-only" id="rv-count">요청 0개</div>
    </div>
    <div id="rv-chat">
      <div id="rv-agent" class="rv-agent"></div>
      <div id="rv-msgs"></div>
      <div class="rv-compose">
        <div id="rv-att"></div>
        <textarea id="rv-input" rows="2" placeholder="고치고 싶은 걸 편하게 말해 주세요&#10;다른 사이트 링크를 붙여도 돼요"></textarea>
        <div class="rv-compose-btns">
          <button class="rv-cbtn" id="rv-pick-btn" title="화면에서 고칠 곳을 눌러 알려 주기">📍 위치</button>
          <button class="rv-cbtn" id="rv-cdraw-btn" title="화면에 동그라미 · 화살표 그리기">🖍 그리기</button>
          <button class="rv-cbtn" id="rv-file-btn" title="사진 · 캡처 붙이기">📎 사진</button>
          <button class="rv-btn rv-primary" id="rv-send">보내기</button>
        </div>
      </div>
    </div>
    <div id="rv-list"></div>
    <div class="rv-foot">
      <span class="rv-foot-note">글자 고침 · 사진 바꾸기도 Claude가 반영해요</span>
      <button class="rv-link" id="rv-export">파일로 받기</button>
    </div>`;
}

function showTab(t) {
  tab = t;
  const p = $('#rv-panel');
  if (!p) return;
  p.classList.toggle('rv-tab-chat', t === 'chat');
  p.classList.toggle('rv-tab-list', t === 'list');
  p.querySelectorAll('.rv-tab').forEach((b) => b.classList.toggle('rv-on', b.dataset.tab === t));
  if (t === 'chat') scrollChat(true);
}

function bindChat() {
  const p = $('#rv-panel');
  p.querySelectorAll('.rv-tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  showTab(tab);

  const input = $('#rv-input');
  $('#rv-send').addEventListener('click', sendChat);
  input.addEventListener('keydown', (e) => {
    // PC에서는 Enter로 보내고 Shift+Enter로 줄바꿈. 폰에서는 Enter가 줄바꿈.
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.innerWidth >= 760) {
      e.preventDefault();
      sendChat();
    }
  });
  // 캡처한 그림을 붙여넣기 · 끌어다 놓기
  input.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  const comp = p.querySelector('.rv-compose');
  comp.addEventListener('dragover', (e) => { e.preventDefault(); comp.classList.add('rv-drop'); });
  comp.addEventListener('dragleave', () => comp.classList.remove('rv-drop'));
  comp.addEventListener('drop', (e) => {
    e.preventDefault(); comp.classList.remove('rv-drop');
    const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) addFiles(files);
  });

  $('#rv-pick-btn').addEventListener('click', startPickForChat);
  $('#rv-cdraw-btn').addEventListener('click', startDraw);
  $('#rv-file-btn').addEventListener('click', () => {
    const f = document.createElement('input');
    f.type = 'file'; f.accept = 'image/*'; f.multiple = true; f.style.display = 'none';
    document.body.appendChild(f);
    f.addEventListener('change', () => { const files = [...(f.files || [])]; f.remove(); if (files.length) addFiles(files); });
    f.click();
  });

  renderAtt();
  renderChat();
  setInterval(renderAgent, 15000);
}

/* 📍 위치: 버튼을 누른 뒤 화면을 누르면 그 자리가 대화에 붙는다 */
function startPickForChat() {
  if (editing) finishEdit(true);
  hideBubble();
  pickForChat = true;
  document.documentElement.classList.add('rv-picking');
  if (window.innerWidth < 760) closePanel();
  const bar = document.createElement('div');
  bar.id = 'rv-pickbar';
  bar.innerHTML = `<span>고칠 곳을 화면에서 눌러 주세요</span><button class="rv-btn">취소</button>`;
  bar.querySelector('button').addEventListener('click', stopPickForChat);
  document.body.appendChild(bar);
}
function stopPickForChat() {
  pickForChat = false;
  const bar = $('#rv-pickbar');
  if (bar) bar.remove();
  drawHover(null);
  if (!picking) document.documentElement.classList.remove('rv-picking');
}

function attachEl(el) {
  const info = withOriginal(el, () => describe(el));
  attach.push({ type: 'element', info });
  drawHover(null);
  renderAtt();
  showTab('chat');
  openPanel();
  $('#rv-input').focus();
}

async function addFiles(files) {
  for (const file of files.slice(0, 6)) {
    if (!file.type.startsWith('image/')) continue;
    toast('사진을 올리는 중이에요…', true);
    try {
      const blob = await shrinkImage(file);
      const up = await upload(blob, 'chat');
      attach.push({ type: 'image', url: up.url, path: up.path, name: (file.name || '').slice(0, 120) });
      renderAtt();
      toast('사진을 붙였어요.');
    } catch (err) {
      console.error(err);
      toast('사진을 올리지 못했어요.');
    }
  }
  showTab('chat');
}

function attLabel(a) {
  if (a.type === 'element') {
    const t = a.info.text ? `“${a.info.text.slice(0, 16)}${a.info.text.length > 16 ? '…' : ''}”` : (a.info.imgSrc ? '사진' : a.info.tagName);
    return `📍 ${esc(a.info.sectionName || '')} · ${esc(t)}`;
  }
  if (a.type === 'draw') return `<img src="${esc(a.url)}" alt="">🖍 그림`;
  if (a.type === 'image') return `<img src="${esc(a.url)}" alt="">📎 사진`;
  if (a.type === 'link') return `🔗 ${esc(a.url.replace(/^https?:\/\//, '').slice(0, 28))}`;
  return '';
}

function renderAtt() {
  const box = $('#rv-att');
  if (!box) return;
  box.innerHTML = attach.map((a, i) => `<span class="rv-att">${attLabel(a)}<button data-rm="${i}" title="빼기">×</button></span>`).join('');
  box.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => {
    const a = attach.splice(Number(b.dataset.rm), 1)[0];
    if (a && a.path) deleteObject(sRef(storage, a.path)).catch(() => {});
    renderAtt();
  }));
}

async function sendChat() {
  const input = $('#rv-input');
  let text = input.value.trim();
  if (!text && !attach.length) { input.focus(); return; }
  if (!text) text = '(첨부한 것을 봐 주세요)';
  const links = [...new Set(text.match(/https?:\/\/[^\s<>"']+/g) || [])].slice(0, 5).map((url) => ({ type: 'link', url }));
  const btn = $('#rv-send');
  btn.disabled = true;
  chatForceBottom = true;   // 내가 보낸 말은 맨 아래로 내려가서 보이게
  try {
    await addDoc(collection(db, CHAT_COL), {
      site: SITE, role: 'user', status: 'pending', host: location.host,
      text: text.slice(0, 4900), attachments: [...attach, ...links].slice(0, 19),
      route: currentRoute(), viewport: window.innerWidth,
      device: window.innerWidth < 768 ? '모바일' : (window.innerWidth < 1100 ? '태블릿' : 'PC'),
      createdAt: serverTimestamp()
    });
    input.value = '';
    attach = [];
    renderAtt();
  } catch (err) {
    console.error(err);
    toast('보내지 못했어요. 인터넷 연결을 확인해 주세요.');
  }
  btn.disabled = false;
}

async function askRevert(m) {
  if (!confirm('이 변경을 원래대로 되돌릴까요?')) return;
  try {
    await addDoc(collection(db, CHAT_COL), {
      site: SITE, role: 'user', status: 'pending', action: 'revert', commit: m.commit, replyId: m.id,
      text: '↩ 방금 바꾼 것을 되돌려 주세요', attachments: [], route: currentRoute(),
      viewport: window.innerWidth, createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error(err);
    toast('보내지 못했어요.');
  }
}

/* 사장님 컴퓨터(리뷰 도우미)가 켜져 있는지 */
// 도우미는 30초마다 lastSeen 을 새로 쓴다. 두 가지로 확인해서 하나라도 맞으면 켜진 것으로 본다.
//  1) 이 화면이 서버에서 마지막으로 소식을 받은 지 100초 안 — 아내분 컴퓨터 시계가 틀려도 정확하다
//  2) lastSeen 시각이 100초 안 (예전 방식)
// 화면을 다른 창 뒤에 두었다가 돌아오면 다시 연결되는 동안 잠깐 기다려 준다.
document.addEventListener('visibilitychange', () => { if (!document.hidden) { wokeAt = Date.now(); renderAgent(); } });
window.addEventListener('online', () => { wokeAt = Date.now(); });
function agentOnline() {
  if (!agent || agent.state === 'off' || !agent.lastSeen) return false;
  if (Date.now() - agentSeenAt < 100 * 1000) return true;
  const t = agent.lastSeen.toMillis ? agent.lastSeen.toMillis() : 0;
  if (Date.now() - t < 100 * 1000) return true;
  return Date.now() - wokeAt < 20 * 1000 && agentSeenAt > 0;   // 막 돌아온 직후엔 판단 보류
}

function renderAgent() {
  const box = $('#rv-agent');
  if (!box) return;
  const on = agentOnline();
  const working = on && agent.state === 'working';
  box.className = 'rv-agent ' + (working ? 'rv-working' : on ? 'rv-online' : 'rv-offline');
  const paused = on && (agent.state === 'login' || agent.state === 'limit');
  if (paused) box.className = 'rv-agent rv-offline';
  box.innerHTML = paused ? (agent.state === 'login'
      ? '<i></i>사장님 컴퓨터의 Claude 로그인이 필요해요. 남긴 말은 저장돼요.'
      : '<i></i>Claude 사용량이 잠시 꽉 찼어요. 조금 뒤 이어서 반영해요.')
    : working ? '<i></i>Claude가 고치는 중이에요…'
    : on ? '<i></i>Claude 연결됨 · 말을 걸면 바로 고쳐요'
    : (navigator.onLine === false
      ? '<i></i>이 컴퓨터의 인터넷 연결이 끊겼어요. 다시 연결되면 이어져요.'
      : !agentSeenAt && Date.now() - LOADED_AT < 40 * 1000
      ? '<i></i>연결하는 중이에요…'
      : '<i></i>사장님 컴퓨터와 연결이 안 돼요. 남긴 말은 저장되고, 연결되면 바로 처리돼요.');
  const typing = $('#rv-typing');
  if (typing) {
    typing.style.display = working ? '' : 'none';
    // 도우미가 보내는 진행 상황 ("보내 주신 사진을 보는 중이에요" 등)
    const p = working && agent.progress ? agent.progress : '';
    const label = typing.querySelector('.rv-typing-txt');
    if (label) label.textContent = p;
    typing.classList.toggle('rv-has-txt', !!p);
    if (working) scrollChat();
  }
}

const fmtText = (s) => esc(s)
  .replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')   // Claude 답장의 **굵게** 표시
  .replace(/^#{1,4}\s*/gm, '')
  .replace(/\n/g, '<br>');

function msgHtml(m) {
  const atts = (m.attachments || []).filter((a) => a.type !== 'link');
  const attHtml = atts.length ? `<div class="rv-msg-atts">${atts.map((a) =>
    (a.type === 'draw' || a.type === 'image')
      ? `<img src="${esc(a.url)}" data-zoom="${esc(a.url)}" alt="">`
      : `<span class="rv-att rv-att-s" data-locate='${esc(JSON.stringify({ selector: a.info.selector, text: a.info.text, imgSrc: a.info.imgSrc, route: a.info.route }))}'>${attLabel(a)}</span>`
  ).join('')}</div>` : '';

  if (m.role === 'assistant') {
    let acts = '';
    if (m.commit) {
      // 미리보기가 다 만들어졌는지 (도우미가 Vercel 을 확인해 deployed 를 붙인다. 오래된 답장은 이미 됐다고 본다)
      const old = m.createdAt && m.createdAt.toMillis && Date.now() - m.createdAt.toMillis() > 10 * 60 * 1000;
      const ready = m.deployed || (old && !m.deployError);
      const note = m.deployError ? '<span class="rv-msg-note rv-bad">미리보기를 만들지 못했어요. 사장님께 알려 주세요.</span>'
        : ready ? `<span class="rv-msg-note rv-ready">✅ 이제 보여요</span><button class="rv-mini rv-mini-go" data-reload>새로고침해서 보기</button>`
        : '<span class="rv-msg-note rv-wait"><i></i>미리보기에 올리는 중이에요 (보통 30초쯤)</span>';
      const undo = (!m.revertOf && !m.reverted) ? `<button class="rv-mini" data-revert="${esc(m.id)}">되돌리기</button>` : '';
      acts = m.reverted ? '<div class="rv-msg-acts"><span class="rv-reverted">↩ 되돌림</span></div>'
        : `<div class="rv-msg-acts">${note}${undo}</div>`;
    }
    return `<div class="rv-msg rv-ai${m.error ? ' rv-err' : ''}"><div class="rv-msg-who">Claude</div><div class="rv-msg-text">${fmtText(m.text)}</div>${acts}</div>`;
  }
  const st = { pending: '전송됨 · 곧 확인해요', working: 'Claude가 보고 있어요…', error: '반영하지 못했어요', done: '' }[m.status] || '';
  return `<div class="rv-msg rv-me">${attHtml}<div class="rv-msg-text">${fmtText(m.text)}</div>${st ? `<div class="rv-msg-st">${st}</div>` : ''}</div>`;
}

// 대화창을 위로 올려 예전 대화를 보는 중이면, 새 답장이 와도 아래로 끌어내리지 않는다.
// (맨 아래 근처에 있을 때만 따라 내려간다. 내가 보낼 때·대화 탭을 열 때는 맨 아래로)
let chatForceBottom = false;
const chatNearBottom = (box) => box.scrollHeight - box.scrollTop - box.clientHeight < 80;
function scrollChat(force) {
  const box = $('#rv-msgs');
  if (!box) return;
  if (!force && !chatForceBottom && !chatNearBottom(box)) return;
  chatForceBottom = false;
  requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

function renderChat() {
  const box = $('#rv-msgs');
  if (!box) return;
  const wasNear = chatNearBottom(box);
  const prevTop = box.scrollTop;
  box.innerHTML = (chatMsgs.length ? chatMsgs.map(msgHtml).join('') : `
    <div class="rv-chat-empty">
      <b>이렇게 해 보세요</b>
      <ol>
        <li>화면에서 고칠 곳을 누르고 <b>💬 Claude에게 말하기</b><br>(또는 아래 <b>📍 위치</b> · <b>🖍 그리기</b>)</li>
        <li>“이 제목 더 작게, 한 줄로” 처럼 적고 보내기</li>
        <li>1~2분 뒤 새로고침하면 바뀐 화면이 보여요</li>
      </ol>
      <p>다른 사이트 링크나 캡처를 붙여서 “이런 느낌으로”라고 해도 돼요.</p>
    </div>`) + '<div class="rv-msg rv-ai rv-typing" id="rv-typing" style="display:none"><span></span><span></span><span></span><b class="rv-typing-txt"></b></div>';

  box.querySelectorAll('[data-zoom]').forEach((img) => img.addEventListener('click', () => showLightbox(img.dataset.zoom)));
  box.querySelectorAll('[data-reload]').forEach((b) => b.addEventListener('click', () => location.reload()));
  box.querySelectorAll('[data-revert]').forEach((b) => b.addEventListener('click', () => {
    const m = chatMsgs.find((x) => x.id === b.dataset.revert);
    if (m) askRevert(m);
  }));
  box.querySelectorAll('[data-locate]').forEach((s) => s.addEventListener('click', () => {
    try {
      const c = JSON.parse(s.dataset.locate);
      if (c.route && c.route !== currentRoute()) { goRoute(c.route); return; }
      const el = relocate(c);
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); drawHover(el); setTimeout(() => drawHover(null), 1600); }
    } catch (_) {}
  }));
  renderAgent();
  if (wasNear || chatForceBottom) scrollChat(true);
  else box.scrollTop = prevTop;   // 보던 위치 그대로
}

function listenChat() {
  onSnapshot(query(collection(db, CHAT_COL), orderBy('createdAt', 'asc'), limitToLast(300)), (snap) => {
    const before = new Map(chatMsgs.map((m) => [m.id, m]));
    chatMsgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.site === SITE);
    if (chatReady && chatMsgs.some((m) => m.role === 'assistant' && !before.has(m.id))) {
      toast('Claude가 답했어요.');
      if ($('#rv-panel').classList.contains('rv-collapsed')) $('#rv-handle').classList.add('rv-new');
    }
    if (chatReady && chatMsgs.some((m) => m.deployed && before.has(m.id) && !before.get(m.id).deployed)) {
      toast('✅ 바뀐 화면이 준비됐어요. 새로고침하면 보여요.');
    }
    chatReady = true;
    renderChat();
  }, (err) => { console.error(err); toast('대화를 불러오지 못했어요.'); });

  onSnapshot(doc(db, AGENT_COL, SITE), { includeMetadataChanges: true }, (d) => {
    const prevBeat = agent && agent.lastSeen && agent.lastSeen.toMillis ? agent.lastSeen.toMillis() : 0;
    agent = d.exists() ? d.data() : null;
    const beatNow = agent && agent.lastSeen && agent.lastSeen.toMillis ? agent.lastSeen.toMillis() : 0;
    // 도우미가 새 신호(lastSeen)를 보냈을 때만 "방금 살아 있음"으로 본다.
    // (처음 받은 값이나, 재연결로 같은 값이 다시 온 것은 세지 않는다 — 꺼진 도우미를 '연결됨'으로 보이게 하던 문제)
    if (!d.metadata.fromCache && prevBeat && beatNow > prevBeat) agentSeenAt = Date.now();
    renderAgent();
  },
    (err) => console.error(err));
}

/* ---------- 12. 시작 ---------- */
function mapComments() {
  if (editing) { mapPending = true; return; }
  // 미리 보기로 바꿔 둔 글자 · 사진을 원래대로 돌린 뒤 다시 찾아서 다시 바꾼다
  restoreAll();
  comments.forEach((c) => { c._el = (otherPage(c) || !showChange(c)) ? null : relocate(c); });
  applyChanges();
  rebuildPins();
  renderList();
}

function isShown(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}
function otherPage(c) { return !!c.route && c.route !== currentRoute(); }

/* 홈페이지 라우터에 페이지 이동을 맡긴다 (?review 는 주소에 그대로 남긴다) */
function goRoute(route) {
  history.pushState({ route }, '', (ROUTE_PATHS[route] || '/') + location.search);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* 메뉴나 목록으로 페이지를 옮기면 그 페이지의 핀을 다시 그리고, 고른 요청으로 스크롤한다 */
new MutationObserver(() => {
  if (!db) return;
  hideBubble();
  if (editing) finishEdit(true);
  mapComments();
  const c = comments.find((x) => x.id === activeId);
  // html 의 scroll-behavior: smooth 때문에 페이지를 바꾼 직후에는 'instant' 로 옮겨야 한다
  if (c && c._el) setTimeout(() => c._el.scrollIntoView({ block: 'center', behavior: 'instant' }), 50);
  else if (c && kindOf(c) === 'draw' && c.scrollY != null) setTimeout(() => window.scrollTo({ top: c.scrollY, behavior: 'instant' }), 50);
}).observe(document.body, { attributes: true, attributeFilter: ['data-route'] });

function start() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  const auth = getAuth(app);

  buildPanel();
  attachPicker();
  document.documentElement.classList.add('rv-picking');
  renderList();

  signInAnonymously(auth)
    .then(() => {
      onSnapshot(query(collection(db, COL), orderBy('createdAt', 'asc')), (snap) => {
        comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => (c.site || 'live') === SITE);
        mapComments();
      }, (err) => {
        console.error(err);
        toast('요청 목록을 불러오지 못했습니다.');
      });
      if (CHAT_ON) listenChat();
    })
    .catch((err) => {
      console.error(err);
      toast('접속에 실패했습니다. 새로고침해 주세요.');
    });
}

/* 비밀번호를 이미 통과한 적이 있으면 바로 시작한다 */
let unlocked = false;
try { unlocked = localStorage.getItem(OK_KEY) === '1'; } catch (_) {}
if (unlocked) start(); else showGate();
