/* ===========================================================
   리뷰 모드 — 홈페이지 화면을 보면서 바로 수정 요청을 남기는 도구
   주소 뒤에 ?review 를 붙였을 때만 index.html이 이 파일을 불러온다.
   일반 방문자에게는 로드조차 되지 않으므로 사이트 성능에 영향이 없다.

   코멘트는 Firestore(reviewComments)에 저장되므로 기기를 바꿔도 이어서 볼 수 있고,
   [내보내기]로 마크다운 파일을 받아 그대로 개발자에게 전달하면 된다.
   이 모드는 읽기 전용이다 — 실제 사이트 내용은 절대 바뀌지 않는다.
   =========================================================== */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

/* 빠른 선택 버튼 — 자주 나오는 요청을 미리 만들어 둔다.
   자유 메모만 받으면 "어떻게" 고칠지가 애매해지기 때문이다. */
const TAG_GROUPS = [
  { label: '글자', tags: ['더 크게', '더 작게', '굵게', '얇게', '글꼴 바꾸기'] },
  { label: '색상', tags: ['더 진하게', '더 연하게', '색 바꾸기'] },
  { label: '줄',   tags: ['여기서 줄바꿈', '줄바꿈 없애기', '줄간격 넓게', '줄간격 좁게'] },
  { label: '간격', tags: ['위 여백 늘리기', '위 여백 줄이기', '아래 여백 늘리기', '아래 여백 줄이기'] },
  { label: '정렬', tags: ['왼쪽 정렬', '가운데 정렬'] },
  { label: '내용', tags: ['문구 수정', '이미지 교체', '삭제', '순서 이동'] }
];

/* 섹션 id를 사람이 읽을 수 있는 이름으로 */
const SECTION_NAMES = {
  hero: '메인 첫 화면', story: '스토리', shop: '원두 샵', finder: '원두 추천',
  wholesale: '납품·도매', maintenance: '유지보수', consulting: '컨설팅',
  contact: '문의하기', repairModal: '수리 신청 창'
};

/* 코멘트를 달 수 있는 요소들 */
const PICKABLE = 'h1,h2,h3,h4,h5,h6,p,li,span,a,button,strong,em,img,figcaption,blockquote,td,th,label,dt,dd,summary';

let db, comments = [], selected = null, picking = true, activeId = null;
const pinEls = new Map();

/* ---------- 작은 도우미들 ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const isRvUI = (el) => !!(el && el.closest && el.closest('#rv-panel,#rv-gate,#rv-pins,#rv-hover,#rv-toast'));

function toast(msg) {
  const t = $('#rv-toast');
  t.textContent = msg;
  t.classList.add('rv-show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('rv-show'), 2000);
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
  // 입력칸에서 벗어난 상태로 엔터를 쳐도 들어가지도록 창 전체에서 받는다
  gate.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
}

/* ---------- 2. 요소 위치 기록 ---------- */

/* 이 요소가 어느 섹션에 속하는지 */
function sectionOf(el) {
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

/* ---------- 3. 화면 표시 — 테두리와 번호 핀 ---------- */
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
  for (const [id, pin] of pinEls) {
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
  comments.forEach((c, i) => {
    if (!c._el) return;
    const pin = document.createElement('div');
    pin.className = 'rv-pin';
    pin.textContent = String(i + 1);
    pin.title = (c.tags || []).join(', ') || c.memo || '코멘트';
    pin._target = c._el;
    pin.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
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

/* ---------- 4. 패널 ---------- */
function buildPanel() {
  const p = document.createElement('div');
  p.id = 'rv-panel';
  p.innerHTML = `
    <button id="rv-handle" title="패널 접기/펴기">❯</button>
    <div class="rv-head">
      <h1>수정 요청 남기기</h1>
      <div class="rv-count" id="rv-count">코멘트 0개</div>
      <button id="rv-mode" class="rv-on">
        <span class="rv-switch"></span>
        <span class="rv-mode-txt">코멘트 달기 켜짐
          <span class="rv-mode-sub">고치고 싶은 곳을 클릭하세요</span>
        </span>
      </button>
    </div>
    <div id="rv-list"></div>
    <div class="rv-foot">
      <button class="rv-btn rv-primary" id="rv-export">내보내기</button>
      <button class="rv-btn" id="rv-copy">전체 복사</button>
    </div>`;
  document.body.appendChild(p);

  const hover = document.createElement('div'); hover.id = 'rv-hover';
  const pins = document.createElement('div'); pins.id = 'rv-pins';
  const t = document.createElement('div'); t.id = 'rv-toast';
  document.body.append(hover, pins, t);

  $('#rv-handle').addEventListener('click', () => {
    const c = p.classList.toggle('rv-collapsed');
    $('#rv-handle').textContent = c ? '❮' : '❯';
  });
  $('#rv-mode').addEventListener('click', setPicking);
  $('#rv-export').addEventListener('click', exportMd);
  $('#rv-copy').addEventListener('click', copyMd);
}

function setPicking() {
  picking = !picking;
  const btn = $('#rv-mode');
  btn.classList.toggle('rv-on', picking);
  btn.querySelector('.rv-mode-txt').innerHTML = picking
    ? '코멘트 달기 켜짐<span class="rv-mode-sub">고치고 싶은 곳을 클릭하세요</span>'
    : '코멘트 달기 꺼짐<span class="rv-mode-sub">사이트를 평소처럼 눌러볼 수 있어요</span>';
  document.documentElement.classList.toggle('rv-picking', picking);
  if (!picking) { drawHover(null); selected = null; renderList(); }
}

/* ---------- 5. 목록 & 작성 폼 ---------- */
function renderList() {
  const list = $('#rv-list');
  $('#rv-count').textContent = `코멘트 ${comments.length}개`;

  let html = '';

  if (selected) {
    const d = selected.info;
    const st = d.style;
    html += `
      <div class="rv-item rv-active">
        <div class="rv-item-top">
          <span class="rv-num">+</span>
          <div class="rv-item-body">
            <div class="rv-where">${esc(d.sectionName)} › ${esc(d.tagName)}</div>
            <div class="rv-quote">${esc(d.text || (d.imgSrc ? '(사진) ' + d.imgSrc : '(내용 없음)'))}</div>
          </div>
          <button class="rv-del" id="rv-cancel" title="취소">×</button>
        </div>
        <div class="rv-form">
          <div class="rv-meta">
            <b>지금 상태</b> ${esc(st.fontSize)} · 굵기 ${esc(st.fontWeight)} · 줄간격 ${esc(st.lineHeight)}<br>
            <b>색</b> ${esc(st.color)} · <b>정렬</b> ${esc(st.textAlign)} · <b>글꼴</b> ${esc(st.fontFamily)}<br>
            <b>보던 화면</b> ${esc(d.device)} (${d.viewport}px)
          </div>
          ${TAG_GROUPS.map((g) => `
            <div class="rv-grp">
              <div class="rv-grp-label">${g.label}</div>
              <div class="rv-chips">
                ${g.tags.map((t) => `<button class="rv-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
              </div>
            </div>`).join('')}
          <textarea class="rv-memo" id="rv-memo" placeholder="하고 싶은 말을 자유롭게 적어주세요&#10;예) 첫 문장이 답답해 보여요. 여기서 한 번 끊어주세요"></textarea>
          <div class="rv-form-btns">
            <button class="rv-btn" id="rv-cancel2">취소</button>
            <button class="rv-btn rv-primary" id="rv-save">저장</button>
          </div>
        </div>
      </div>`;
  }

  if (!comments.length && !selected) {
    html += `<div id="rv-empty">아직 코멘트가 없습니다.<br>고치고 싶은 글자나 사진을<br>화면에서 클릭해 보세요.</div>`;
  }

  comments.forEach((c, i) => {
    const lost = !c._el;
    html += `
      <div class="rv-item ${c.id === activeId ? 'rv-active' : ''} ${lost ? 'rv-lost' : ''}" data-id="${esc(c.id)}">
        <div class="rv-item-top" data-goto="${esc(c.id)}">
          <span class="rv-num">${i + 1}</span>
          <div class="rv-item-body">
            <div class="rv-where">${esc(c.sectionName || '기타')} › ${esc(c.tagName || '')}</div>
            <div class="rv-quote">${esc(c.text || (c.imgSrc ? '(사진) ' + c.imgSrc : '(내용 없음)'))}</div>
            ${lost ? '<span class="rv-lost-tag">화면에서 위치를 못 찾음</span>' : ''}
          </div>
          <button class="rv-del" data-del="${esc(c.id)}" title="삭제">×</button>
        </div>
        ${(c.tags || []).length ? `<div class="rv-tags-shown">${c.tags.map((t) => `<span class="rv-chip-s">${esc(t)}</span>`).join('')}</div>` : ''}
        ${c.memo ? `<div class="rv-memo-shown">${esc(c.memo)}</div>` : ''}
      </div>`;
  });

  list.innerHTML = html;

  // 작성 폼 동작
  if (selected) {
    list.querySelectorAll('.rv-chip').forEach((btn) => {
      btn.addEventListener('click', () => btn.classList.toggle('rv-sel'));
    });
    $('#rv-cancel').addEventListener('click', cancelForm);
    $('#rv-cancel2').addEventListener('click', cancelForm);
    $('#rv-save').addEventListener('click', saveComment);
    $('#rv-memo').focus();
  }

  // 목록 동작
  list.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('이 코멘트를 지울까요?')) return;
      try { await deleteDoc(doc(db, COL, btn.dataset.del)); } catch (_) { toast('삭제하지 못했습니다.'); }
    });
  });
  list.querySelectorAll('[data-goto]').forEach((row) => {
    row.addEventListener('click', () => {
      const c = comments.find((x) => x.id === row.dataset.goto);
      activeId = row.dataset.goto;
      if (c && c._el) c._el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      renderList();
    });
  });
}

function cancelForm() {
  selected = null;
  drawHover(null);
  renderList();
}

async function saveComment() {
  const tags = [...document.querySelectorAll('.rv-chip.rv-sel')].map((b) => b.dataset.tag);
  const memo = $('#rv-memo').value.trim();
  if (!tags.length && !memo) { toast('버튼을 고르거나 메모를 적어주세요.'); return; }

  const payload = { ...selected.info, tags, memo, createdAt: serverTimestamp() };
  const btn = $('#rv-save');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    await addDoc(collection(db, COL), payload);
    selected = null;
    drawHover(null);
    toast('저장했습니다.');
  } catch (err) {
    console.error(err);
    toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요.');
    btn.disabled = false; btn.textContent = '저장';
  }
}

/* ---------- 6. 화면에서 요소 고르기 ---------- */
function pickTarget(node) {
  if (!node || node.nodeType !== 1 || isRvUI(node)) return null;
  if (node.matches(PICKABLE)) return node;
  const up = node.closest(PICKABLE);
  if (up && !isRvUI(up)) return up;
  if (node.matches('section,div,figure,header,footer,nav,article')) return node;
  return null;
}

function attachPicker() {
  document.addEventListener('mousemove', (e) => {
    if (!picking || selected) return;
    drawHover(pickTarget(e.target));
  }, true);

  document.addEventListener('click', (e) => {
    if (!picking || isRvUI(e.target)) return;
    const el = pickTarget(e.target);
    if (!el) return;
    // 리뷰 중에는 링크 이동이나 버튼 동작을 막는다 (사이트는 그대로 두고 코멘트만 남긴다)
    e.preventDefault();
    e.stopPropagation();
    selected = { el, info: describe(el) };
    drawHover(el);
    $('#rv-panel').classList.remove('rv-collapsed');
    $('#rv-handle').textContent = '❯';
    renderList();
  }, true);

  // 스크롤·창 크기 변화에 맞춰 테두리와 핀 위치를 다시 계산한다
  let ticking = false;
  const refresh = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      syncPins();
      if (selected && selected.el.isConnected) drawHover(selected.el);
    });
  };
  window.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', () => { refresh(); mapComments(); });
  window.addEventListener('load', () => setTimeout(() => { mapComments(); }, 300));
}

/* ---------- 7. 내보내기 ---------- */
function buildMd() {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let out = `# 스트레토 홈페이지 수정 요청\n\n`;
  out += `- 작성일: ${stamp}\n- 총 ${comments.length}건\n\n---\n\n`;

  comments.forEach((c, i) => {
    const st = c.style || {};
    out += `## ${i + 1}. ${c.sectionName || '기타'} › ${c.tagName || ''}\n\n`;
    out += `- **위치**: \`${c.selector || '-'}\`\n`;
    out += `- **파일**: ${c.page || 'index.html'}\n`;
    if (c.text) out += `- **현재 문구**: "${c.text}"\n`;
    if (c.imgSrc) out += `- **사진 파일**: ${c.imgSrc}\n`;
    out += `- **현재 스타일**: ${st.fontSize || '-'} / 굵기 ${st.fontWeight || '-'} / 줄간격 ${st.lineHeight || '-'} / 색 ${st.color || '-'} / 정렬 ${st.textAlign || '-'} / 글꼴 ${st.fontFamily || '-'} / 자간 ${st.letterSpacing || '-'}\n`;
    out += `- **여백(상 우 하 좌)**: ${st.margin || '-'}\n`;
    out += `- **보던 화면**: ${c.device || '-'} (${c.viewport || '-'}px)\n`;
    out += `- **요청**: ${(c.tags || []).join(', ') || '(선택 없음)'}\n`;
    out += `- **메모**: ${c.memo || '(없음)'}\n\n`;
  });
  return out;
}

function exportMd() {
  if (!comments.length) { toast('내보낼 코멘트가 없습니다.'); return; }
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blob = new Blob([buildMd()], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `홈페이지-수정요청-${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('파일을 저장했습니다.');
}

async function copyMd() {
  if (!comments.length) { toast('복사할 코멘트가 없습니다.'); return; }
  try {
    await navigator.clipboard.writeText(buildMd());
    toast('전체 내용을 복사했습니다.');
  } catch (_) {
    toast('복사에 실패했습니다. [내보내기]를 써주세요.');
  }
}

/* ---------- 8. 시작 ---------- */
function mapComments() {
  comments.forEach((c) => { c._el = relocate(c); });
  rebuildPins();
  renderList();
}

function start() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  const auth = getAuth(app);

  buildPanel();
  attachPicker();
  document.documentElement.classList.add('rv-picking');
  renderList(); // 접속을 기다리는 동안에도 안내 문구가 보이도록 먼저 그린다

  signInAnonymously(auth)
    .then(() => {
      onSnapshot(query(collection(db, COL), orderBy('createdAt', 'asc')), (snap) => {
        comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        mapComments();
      }, (err) => {
        console.error(err);
        toast('코멘트를 불러오지 못했습니다.');
      });
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
