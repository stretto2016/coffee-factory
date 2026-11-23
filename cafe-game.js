/* 원두 찾기 게임 · 카페 사업자용 — index.html 원두 페이지 #cg (시안 원본: .review-inbox/cafe-game.html)
   - 개인 고객 게임(#fg) 시작 화면의 "카페 · 사업자"에서 window.CG.start() 로 들어온다. '개인 고객으로' 는 window.FG.home()
   - 납품 상담 버튼은 사이트의 1:1 상담창(window.__finderConsult)을 연다
   ROUND 1 가게 차리기 · 2 판매 TOP 3 · 3 듣고 싶은 리뷰 · 4 블렌딩 랩 · 5 창고 채우기 → 매장 맞춤 처방전
   - 점수 계산은 사이트 기존 카페용 질문(targetB2B · scoreOf)과 같은 표를 쓴다.
   - 모양은 개인 고객 게임(finder-game.css)의 #fg 스타일 + 아래 cafe-game.css(#fg .cg-*) */
(function () {
  const ROOT = document.getElementById('cg');
  if (!ROOT) return;

  /* ================= 데이터 ================= */
  // publicProducts 스냅숏 (2026-11-20) — 실제 데이터(window.__publicProducts)가 있으면 그걸 쓴다
  const SNAP = [
    { name: '알토 블렌드 (Alto)', category: 'blend', roastingLevel: 'Dark', cupNote: '다크초콜릿 · 아몬드 · 묵직한 바디', description: '스트레토 대표 강배전 커피로 스모키함 속에서도 구수한 향미, 단맛, 좋은 밸런스를 가진 커피', imageUrl: 'alto_blend.jpg', recommendB2B: true, profile: { acidity: 1.6, body: 5, sweetness: 3.7, roastScore: 5 } },
    { name: '스트레토 블렌드 (Stretto)', category: 'blend', roastingLevel: 'Medium Dark', cupNote: '고소함 · 밸런스 · 복합적 향미', description: '단맛과 고소함의 완벽한 밸런스. 호불호 없이 누구나 즐길 수 있는 데일리 블렌드.', imageUrl: 'stretto_blend.jpg', recommendB2B: true, profile: { acidity: 2.3, body: 3.6, sweetness: 3.4, roastScore: 4 } },
    { name: '구스토 블렌드 (Gusto)', category: 'blend', roastingLevel: 'Medium Light', cupNote: '피치 · 플로럴 · 살구 · 시트러스 · 베리', description: '에티오피아와 케냐의 조화. 입안 가득 퍼지는 풍성한 향미와 산뜻한 산미.', imageUrl: 'gusto_blend.jpg', recommendB2B: true, profile: { acidity: 4.6, body: 2.4, sweetness: 3, roastScore: 2 } },
    { name: '과테말라 안티구아 SHB', category: 'single_nutty', cupNote: '마카다미아 · 아몬드 · 밀크초콜릿', recommendB2B: true, profile: { acidity: 1.3, body: 5, sweetness: 3.4, roastScore: 4 } },
    { name: '과테말라 엘소코로 옐로우 카투라', category: 'single_nutty', cupNote: '밀크초콜릿 · 캐러맬 · 오렌지 · 청사과', recommendB2B: true, profile: { acidity: 1.9, body: 4.1, sweetness: 3.7, roastScore: 4 } },
    { name: '에티오피아 G1 예가체프 코케 내추럴', category: 'single_fruity', cupNote: '딸기 · 살구 · 꿀 · 레몬', recommendB2B: true, profile: { acidity: 5, body: 2.4, sweetness: 3.7, roastScore: 2 } },
    { name: '케냐 카구모 AA', category: 'single_fruity', cupNote: '블랙커런트 · 토마토 · 자몽 · 오렌지· 황설탕', recommendB2B: true, profile: { acidity: 5, body: 2.7, sweetness: 3.7, roastScore: 2 } },
  ];
  const SAMPLE_FORM_URL = 'https://forms.gle/5UyaH3M9RWvmNfEb6';
  function products() {
    const live = (window.__publicProducts || []).filter((p) => p.profile && p.recommendB2B !== false);
    return (live.length ? live : SNAP).map((p) => ({
      name: p.name, cat: p.category || '', roast: p.roastingLevel || '', notes: p.cupNote || '', desc: p.description || '',
      img: p.imageUrl ? (/^(https?:)?\/\//.test(p.imageUrl) || p.imageUrl.startsWith('/') ? p.imageUrl : '/' + p.imageUrl) : '',
      pr: { acidity: p.profile.acidity || 3, body: p.profile.body || 3, sweetness: p.profile.sweetness || 3, roastScore: p.profile.roastScore || 3 },
    }));
  }

  const INK = '#202020', MINT = '#AAD5DB';
  const L = (d) => `<g fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;

  // ── ROUND 1 가게 · 머신 ──
  const STORES = {
    cafe:   { n: '카페 · 커피 전문점', d: '커피가 주인공', sign: 'COFFEE',
      i: `<path d="M12 20h20v9a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z" fill="${MINT}" stroke="${INK}" stroke-width="1.3"/><path d="M32 23h3a4 4 0 0 1 0 8h-3" fill="none" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M18 9c-2 3 2 4 0 7M24 8c-2 3 2 4 0 7"/><path d="M9 41h28"/>')}` },
    bakery: { n: '베이커리 · 디저트', d: '빵과 케이크 옆의 커피', sign: 'BAKERY',
      i: `<path d="M5 31c2-9 9-15 19-15s17 6 19 15c-4 3-9 1-11-1-2 4-14 4-16 0-2 2-7 4-11 1z" fill="#E7C08A" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>${L('<path d="M17 18l3 11M24 16v13M31 18l-3 11"/>')}` },
    resto:  { n: '레스토랑 · 바', d: '식사의 마지막 한 잔', sign: 'BISTRO',
      i: `<path d="M15 7h18c0 10-3 15-9 15s-9-5-9-15z" fill="#B5495B" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M15 7h18M24 22v14M17 40h14"/>')}` },
    office: { n: '오피스 · 기타', d: '사무실 · 숙박 · 무인매장', sign: 'OFFICE',
      i: `<rect x="11" y="7" width="26" height="34" fill="#EDEDED" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M16 13h4M28 13h4M16 20h4M28 20h4M16 27h4M28 27h4M21 41v-7h6v7"/>')}<rect x="16" y="13" width="4" height="3" fill="${MINT}"/><rect x="28" y="20" width="4" height="3" fill="${MINT}"/>` },
  };
  const MACHINES = {
    semi: { n: '반자동 머신', d: '바리스타가 직접 추출',
      g: `<rect x="4" y="6" width="82" height="40" rx="4" fill="#E9E9E9" stroke="${INK}" stroke-width="1.4"/><rect x="2" y="2" width="86" height="6" rx="2" fill="${INK}"/><rect x="14" y="16" width="62" height="10" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.2"/><circle cx="45" cy="21" r="3" fill="${MINT}" stroke="${INK}" stroke-width="1"/>${L('<path d="M22 46v5h10v-5M58 46v5h10v-5M18 51h18M54 51h18"/>')}<rect x="20" y="56" width="10" height="8" fill="#fff" stroke="${INK}" stroke-width="1.2"/><rect x="60" y="56" width="10" height="8" fill="#fff" stroke="${INK}" stroke-width="1.2"/>` },
    auto: { n: '전자동 머신', d: '버튼 하나로 균일하게',
      g: `<rect x="24" y="0" width="44" height="64" rx="5" fill="#2b2b2b" stroke="${INK}" stroke-width="1.4"/><rect x="31" y="7" width="30" height="15" rx="2" fill="${MINT}"/>${L('<path d="M35 12h12M35 16h8"/>')}<rect x="40" y="30" width="12" height="6" rx="1" fill="#6d6d6d"/><rect x="40" y="46" width="12" height="12" fill="#fff" stroke="${INK}" stroke-width="1.2"/><rect x="28" y="58" width="36" height="4" fill="#555"/>` },
    brew: { n: '브루잉 바', d: '핸드드립 위주',
      g: `<rect x="6" y="18" width="70" height="4" fill="#C9A27A" stroke="${INK}" stroke-width="1.2"/>${L('<path d="M10 22v42M72 22v42"/>')}<path d="M16 6h22l-7 12h-8z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M44 6h22l-7 12h-8z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M19 40h16l-2 22H21z" fill="#8E5A33" fill-opacity=".25" stroke="${INK}" stroke-width="1.3"/><path d="M47 40h16l-2 22H49z" fill="#8E5A33" fill-opacity=".25" stroke="${INK}" stroke-width="1.3"/><path d="M80 42h8v20h-8z" fill="${MINT}" stroke="${INK}" stroke-width="1.2"/>${L('<path d="M80 46c-4-6-10-8-14-6"/>')}` },
    cold: { n: '콜드브루 타워', d: '천천히 대량 추출',
      g: `${L('<path d="M22 2v62M68 2v62M18 64h54M22 2h46"/>')}<circle cx="45" cy="14" r="9" fill="#fff" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M45 23v5"/><path d="M39 30h12l-2 10h-8z"/><path d="M45 40v3c-6 2 6 4 0 6s6 4 0 6"/>')}<path d="M37 48h16v14H37z" fill="#4A2A18" fill-opacity=".55" stroke="${INK}" stroke-width="1.3"/><circle cx="45" cy="34" r="1.5" fill="${MINT}"/>` },
  };
  const svg = (vb, inner, cls = '') => `<svg class="${cls}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  function storefront(store, machine) {
    const st = STORES[store], mc = MACHINES[machine];
    const stripes = Array.from({ length: 12 }, (_, i) => `<rect x="${28 + i * 22}" y="86" width="11" height="18" fill="${MINT}"/>`).join('');
    const scallop = Array.from({ length: 12 }, (_, i) => `<path d="M${28 + i * 22} 104a11 7 0 0 0 22 0" fill="${i % 2 ? '#fff' : MINT}" stroke="${INK}" stroke-width="1.2"/>`).join('');
    return svg('0 0 320 232', `
      <rect x="20" y="40" width="280" height="184" fill="#F6F1EA" stroke="${INK}" stroke-width="1.4"/>
      <rect x="12" y="28" width="296" height="14" fill="${INK}"/>
      <rect x="92" y="50" width="136" height="28" fill="#fff" stroke="${INK}" stroke-width="1.3"/>
      <text x="160" y="69" text-anchor="middle" font-size="13" letter-spacing="4" fill="${INK}" font-family="Archivo, sans-serif" class="cg-sign">${st ? st.sign : 'STRETTO'}</text>
      <rect x="28" y="86" width="264" height="18" fill="#fff" stroke="${INK}" stroke-width="1.2"/>${stripes}${scallop}
      <rect x="40" y="122" width="168" height="94" fill="#fff" stroke="${INK}" stroke-width="1.3"/>
      <rect x="41" y="190" width="166" height="25" fill="#EDE4D8"/><path d="M40 190h168" stroke="${INK}" stroke-width="1.2"/>
      <g class="cg-mach" transform="translate(79 126)">${mc ? mc.g : `<text x="45" y="40" text-anchor="middle" font-size="10" fill="#b5b5b5">머신을 골라 주세요</text>`}</g>
      <rect x="224" y="122" width="58" height="102" fill="#fff" stroke="${INK}" stroke-width="1.3"/><circle cx="272" cy="176" r="2.2" fill="${INK}"/>
      <path d="M253 122v8" stroke="${INK}" stroke-width="1"/><circle cx="253" cy="146" r="16" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
      <g transform="translate(241 134) scale(.5)">${st ? st.i : ''}</g>
      <path d="M8 224h304" stroke="${INK}" stroke-width="1.4"/>`, 'cg-front');
  }

  // ── ROUND 2 메뉴 ──
  const MENU = {
    americano: { n: '아메리카노', milk: 0, i: `<path d="M14 12h20l-2 28H16z" fill="#4A2A18" fill-opacity=".15" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M14 12h20M17 20l4 3M26 26l4 2M19 31l3 1"/>')}<rect x="20" y="17" width="6" height="5" fill="#fff" stroke="${INK}" stroke-width="1"/>` },
    latte: { n: '카페라떼', milk: 1, i: `<path d="M10 18h26v8a11 11 0 0 1-11 11h-4A11 11 0 0 1 10 26z" fill="#E8D5BE" stroke="${INK}" stroke-width="1.3"/><path d="M23 27c-6-4-4-8 0-5 4-3 6 1 0 5z" fill="#fff" stroke="${INK}" stroke-width="1"/>${L('<path d="M36 21h2a4 4 0 0 1 0 8h-2M8 41h30"/>')}` },
    vanilla: { n: '바닐라라떼', milk: 1, i: `<path d="M12 16h20l-2 26H14z" fill="#F3E6C4" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M12 16h20"/>')}<path d="M36 8c-3 8-3 22 0 34" fill="none" stroke="#5a3a1c" stroke-width="2.2" stroke-linecap="round"/><circle cx="22" cy="29" r="3" fill="${MINT}"/>` },
    flat: { n: '플랫화이트', milk: 1, i: `<path d="M13 22h22v5a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" fill="#D9BFA0" stroke="${INK}" stroke-width="1.3"/><circle cx="24" cy="25" r="3" fill="#fff" stroke="${INK}" stroke-width="1"/>${L('<path d="M35 25h2a3 3 0 0 1 0 6h-2M9 39h30"/>')}` },
    einspanner: { n: '아인슈페너', milk: 0.8, i: `<path d="M14 18h20l-2 24H16z" fill="#4A2A18" fill-opacity=".6" stroke="${INK}" stroke-width="1.3"/><path d="M13 18c0-6 5-9 11-9s11 3 11 9z" fill="#fff" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M19 13c3-2 7-2 10 0"/>')}` },
    espresso: { n: '에스프레소', milk: 0, i: `<path d="M16 24h14v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" fill="#4A2A18" fill-opacity=".7" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M30 26h2a3 3 0 0 1 0 6h-2M11 38h24M20 14c-2 3 2 4 0 7M26 14c-2 3 2 4 0 7"/>')}` },
    drip: { n: '핸드드립', milk: 0, brew: 1, i: `<path d="M11 10h26l-8 13h-10z" fill="#fff" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M16 28h16l-2 14H18z" fill="#8E5A33" fill-opacity=".3" stroke="${INK}" stroke-width="1.3"/>${L('<path d="M24 23v3M13 28h22"/>')}` },
    cold: { n: '콜드브루', milk: 0, cold: 1, i: `<path d="M18 6h12v6l4 6v24H14V18l4-6z" fill="#4A2A18" fill-opacity=".55" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/><rect x="17" y="24" width="14" height="9" fill="#fff" stroke="${INK}" stroke-width="1"/>${L('<path d="M18 6h12"/>')}<circle cx="24" cy="28.5" r="1.6" fill="${MINT}"/>` },
  };
  const MENU_ORDER = ['americano', 'latte', 'vanilla', 'flat', 'einspanner', 'espresso', 'drip', 'cold'];
  const RANK_W = [0.5, 0.3, 0.2];

  // ── ROUND 3 리뷰 ── [산미, 바디, 단맛, 배전]
  const REVIEWS = [
    { who: '출근길 3년차', menu: '아메리카노', t: '산미가 과일처럼 상큼해요. 여기 원두 뭐예요?', v: [1, -0.3, 0.1, -0.5], acid: 1 },
    { who: '동네 주민', menu: '아메리카노', t: '신맛 하나 없이 고소해요. 그래서 매일 와요.', v: [-1, 0.3, 0.2, 0.4], acid: -1 },
    { who: '라떼 감별사', menu: '카페라떼', t: '라떼가 진해요. 우유에 커피가 안 묻혀요.', v: [-0.3, 0.9, 0.2, 0.6] },
    { who: '카공족', menu: '핸드드립', t: '꽃향기가 나요. 스페셜티 맛집 인정합니다.', v: [0.9, -0.5, 0.1, -0.7], acid: 1 },
    { who: '을지로 직장인', menu: '에스프레소', t: '옛날 다방처럼 쌉싸름하고 묵직해서 좋아요.', v: [-0.7, 0.8, -0.1, 1] },
    { who: '디저트 원정대', menu: '아메리카노', t: '케이크랑 먹으니 커피 단맛이 확 살아나요.', v: [-0.1, 0.1, 1, 0] },
    { who: '아아 수혈러', menu: '아이스 아메리카노', t: '얼음이 다 녹아도 끝까지 맛이 안 흐려져요.', v: [-0.2, 0.6, 0.2, 0.4] },
    { who: '커피 입문자', menu: '아메리카노', t: '가볍고 깔끔해서 오후에 한 잔 더 마셔요.', v: [0.3, -0.8, 0.1, -0.3] },
  ];

  // ── ROUND 5 창고 · 단가 ──
  const PRICE = {
    value: { n: '데일리', d: '원가 관리가 최우선', t: '부담 없는 단가' },
    mid: { n: '밸런스', d: '품질과 단가의 균형', t: '적정 품질 · 합리적 단가' },
    premium: { n: '프리미엄', d: '품질이 우선', t: '좋은 원두라면 괜찮아요' },
  };
  const volumeKey = (kg) => kg < 10 ? 'xs' : kg < 30 ? 's' : kg < 100 ? 'm' : 'l';
  const VOLUME_TXT = { xs: ['작고 단단한 가게', '10kg 미만 · 소규모 · 신규 오픈'], s: ['단골이 꽉 찬 동네 카페', '10 ~ 30kg · 일반 카페 규모'], m: ['줄 서는 매장', '30 ~ 100kg · 번화가 · 다인 매장'], l: ['다점포 사장님', '100kg 이상 · 대량 납품'] };

  const ROAST_KO = ['', '라이트', '미디엄 라이트', '미디엄', '미디엄 다크', '다크'];
  const ROAST_COL = ['', '#C9A066', '#A8743F', '#85532C', '#5E3920', '#3A2316'];

  /* ================= 판 ================= */
  ROOT.innerHTML = `<div class="board">
      <div class="hud" id="cg-hud" style="display:none">
        <div class="hud-left"><span class="hud-round" id="cg-hud-round"></span><span class="hud-name" id="cg-hud-name"></span></div>
        <div class="hud-beans" id="cg-hud-beans"></div>
        <button type="button" class="hud-home" id="cg-hud-home">처음으로</button>
      </div>
      <div class="stage" id="cg-stage"></div>
    </div><div class="toast" id="cg-toast"></div>`;
  const $ = (s, r = ROOT) => r.querySelector(s);
  const stage = $('#cg-stage');
  const ROUNDS = ['카페 오픈', '판매 TOP 3', '듣고 싶은 리뷰', '블렌딩 랩', '창고 채우기'];
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toast(t) { const el = $('#cg-toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200); }
  const beanSvg = (fill, stroke = 'rgba(0,0,0,.25)') => `<svg viewBox="0 0 40 50"><ellipse cx="20" cy="25" rx="16" ry="21" fill="${fill}" stroke="${stroke}" stroke-width="1"/><path d="M21 6c-6 8 4 14-1 19s-5 12 1 19" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  let S;
  function reset() { S = { round: 0, store: null, machine: null, top: [], latte: 50, latteTouched: false, rv: [0, 0, 0, 0], likes: [], acidLike: 0, acidHate: 0, lab: { nut: 0, choco: 0, caramel: 0, fruit: 0, floral: 0 }, roast: 3, kg: 20, price: null }; }

  const KEY = { down: null };
  const visible = () => ROOT.offsetParent !== null;
  document.addEventListener('keydown', (e) => { if (KEY.down && visible()) KEY.down(e); });

  function hud() {
    const h = $('#cg-hud');
    if (S.round < 1 || S.round > 5) { h.style.display = 'none'; return; }
    h.style.display = '';
    $('#cg-hud-round').textContent = `ROUND ${S.round} / 5`;
    $('#cg-hud-name').textContent = ROUNDS[S.round - 1];
    const cols = ['#8FA05A', '#C9B66B', '#B98A4E', '#8E5A33', '#4A2A18'];
    $('#cg-hud-beans').innerHTML = [0, 1, 2, 3, 4].map((i) => {
      const done = i < S.round - 1, cur = i === S.round - 1;
      return beanSvg(done ? cols[i] : (cur ? '#fff' : '#f2f2f2'), cur ? INK : (done ? 'rgba(0,0,0,.2)' : '#ddd')).replace('<svg', `<svg class="${cur ? 'cur' : ''}"`);
    }).join('');
  }
  // '처음으로'는 개인 고객 / 카페 · 사업자를 고르는 첫 화면으로 (11/22 아내분 요청)
  $('#cg-hud-home').addEventListener('click', () => { reset(); if (window.FG) window.FG.home(); else go(0); });
  function go(r, noScroll) {
    KEY.down = null; S.round = r; hud();
    [intro, r1, r2, r3, r4, r5, result][r]();
    if (!noScroll) { const y = ROOT.getBoundingClientRect().top + window.scrollY - 84; if (Math.abs(window.scrollY - y) > 40) window.scrollTo({ top: y, behavior: 'smooth' }); }
  }
  function screen(html) { stage.innerHTML = `<div class="screen">${html}</div>`; return stage.firstElementChild; }

  /* ================= 시작 ================= */
  function intro() {
    const el = screen(`<div class="cg-intro">
      <small>STRETTO · FOR CAFÉ</small>
      <h3>다섯 번의 선택으로<br>우리 매장 원두를 찾을 수 있어요!</h3>
      <p>가게를 오픈하고, 메뉴를 고르고, 원두를 직접 섞어 보세요.<br>마지막에 로스터가 <b>매장 맞춤 처방전</b>을 써 드려요.</p>
      <ol class="cg-steps">${ROUNDS.map((n, i) => `<li><span>${i + 1}</span>${n}</li>`).join('')}</ol>
      <button type="button" class="btn-ink" id="cg-start">start!</button>
      <small class="cg-time">약 30초 · 답한 내용은 상담할 때만 쓰여요</small>
      <button type="button" class="btn-text cg-back" id="cg-back">← 개인 고객용 게임으로</button>
    </div>`);
    el.querySelector('#cg-start').onclick = () => go(1);
    el.querySelector('#cg-back').onclick = () => { if (window.FG) window.FG.home(); };
  }

  /* ================= ROUND 1 가게 차리기 ================= */
  function r1() {
    const el = screen(`<h3 class="q-title">어떤 카페를 열까요?</h3><p class="q-hint">간판을 달고, 바 위에 머신을 올려 주세요</p>
      <div class="cg-shop">
        <div class="cg-front-wrap" id="cg-front"></div>
        <div class="cg-picks">
          <p class="cg-lbl"><span>1</span>간판</p>
          <div class="cg-tiles">${Object.entries(STORES).map(([k, s]) => `<button type="button" class="cg-tile" data-store="${k}">${svg('0 0 48 48', s.i)}<b>${s.n}</b><small>${s.d}</small></button>`).join('')}</div>
          <p class="cg-lbl"><span>2</span>바 위의 머신</p>
          <div class="cg-tiles">${Object.entries(MACHINES).map(([k, m]) => `<button type="button" class="cg-tile" data-mach="${k}">${svg('0 0 90 66', m.g, 'wide')}<b>${m.n}</b><small>${m.d}</small></button>`).join('')}</div>
        </div>
      </div>
      <div class="foot"><span></span><button type="button" class="btn-ink" id="cg-nx" disabled>오픈하기 →</button></div>`);
    const nx = el.querySelector('#cg-nx');
    function paint(pop) {
      el.querySelector('#cg-front').innerHTML = storefront(S.store, S.machine);
      if (pop) { const g = el.querySelector(pop); if (g) { g.classList.add('cg-pop'); } }
      el.querySelectorAll('[data-store]').forEach((b) => b.classList.toggle('sel', b.dataset.store === S.store));
      el.querySelectorAll('[data-mach]').forEach((b) => b.classList.toggle('sel', b.dataset.mach === S.machine));
      nx.disabled = !(S.store && S.machine);
    }
    el.querySelectorAll('[data-store]').forEach((b) => b.onclick = () => { S.store = b.dataset.store; paint('.cg-sign'); });
    el.querySelectorAll('[data-mach]').forEach((b) => b.onclick = () => { S.machine = b.dataset.mach; paint('.cg-mach'); });
    nx.onclick = () => { toast(`${STORES[S.store].sign} 오픈! 🎉`); go(2); };
    paint();
  }

  /* ================= ROUND 2 판매 TOP 3 ================= */
  function r2() {
    const el = screen(`<h3 class="q-title">우리 가게 판매 TOP 3는?</h3><p class="q-hint">많이 팔리는 순서대로 세 개를 눌러 주세요 (오픈 전이면 팔고 싶은 순서로)</p>
      <div class="cg-podium" id="cg-pod"></div>
      <div class="cg-menu">${MENU_ORDER.map((k) => `<button type="button" class="cg-mi" data-k="${k}"><em></em>${svg('0 0 48 48', MENU[k].i)}<b>${MENU[k].n}</b></button>`).join('')}</div>
      <div class="cg-ratio" id="cg-ratio" hidden>
        <div class="cg-ratio-top"><span>우유 메뉴 비중</span><b id="cg-rv"></b></div>
        <input type="range" min="0" max="100" step="10" id="cg-rr">
        <div class="cg-ratio-ends"><span>아메리카노 위주</span><span>라떼 위주</span></div>
        <p>TOP 3로 계산했어요. 실제와 다르면 살짝 옮겨 주세요.</p>
      </div>
      <div class="foot"><button type="button" class="btn-text" id="cg-clr">다시 고르기</button><button type="button" class="btn-ink" id="cg-nx" disabled>다음 라운드로 가기 →</button></div>`);
    const nx = el.querySelector('#cg-nx'), rr = el.querySelector('#cg-rr');
    const calc = () => Math.round(S.top.reduce((a, k, i) => a + MENU[k].milk * RANK_W[i], 0) * 10) * 10;
    function paint() {
      const slot = (i) => { const k = S.top[i]; return `<div class="cg-pd p${i + 1}${k ? ' on' : ''}">${k ? svg('0 0 48 48', MENU[k].i) + `<b>${MENU[k].n}</b>` : '<i>?</i>'}<span>${i + 1}</span></div>`; };
      el.querySelector('#cg-pod').innerHTML = slot(1) + slot(0) + slot(2);
      el.querySelectorAll('.cg-mi').forEach((b) => { const r = S.top.indexOf(b.dataset.k); b.classList.toggle('sel', r >= 0); b.querySelector('em').textContent = r >= 0 ? r + 1 : ''; });
      const full = S.top.length === 3;
      el.querySelector('#cg-ratio').hidden = !full;
      if (full) { if (!S.latteTouched) S.latte = calc(); rr.value = S.latte; el.querySelector('#cg-rv').textContent = `약 ${S.latte}%`; }
      nx.disabled = !full;
    }
    el.querySelectorAll('.cg-mi').forEach((b) => b.onclick = () => {
      const k = b.dataset.k, r = S.top.indexOf(k);
      if (r >= 0) S.top.splice(r, 1); else if (S.top.length < 3) S.top.push(k); else { toast('세 개까지만 골라요. 빼고 싶은 메뉴를 한 번 더 누르세요'); return; }
      S.latteTouched = false; paint();
    });
    rr.oninput = () => { S.latte = +rr.value; S.latteTouched = true; el.querySelector('#cg-rv').textContent = `약 ${S.latte}%`; };
    el.querySelector('#cg-clr').onclick = () => { S.top = []; S.latteTouched = false; paint(); };
    nx.onclick = () => go(3);
    paint();
  }

  /* ================= ROUND 3 듣고 싶은 리뷰 ================= */
  function r3() {
    S.rv = [0, 0, 0, 0]; S.likes = []; S.acidLike = 0; S.acidHate = 0;
    let i = 0, busy = false;
    const el = screen(`<h3 class="q-title">우리 가게에 달렸으면 하는 리뷰는?</h3><p class="q-hint">받고 싶으면 오른쪽 · 글쎄요면 왼쪽으로 넘겨 주세요</p>
      <div class="sw-area cg-sw" id="cg-sw"></div>
      <div class="sw-btns"><button type="button" class="sw-btn" id="cg-no">← 글쎄요</button><button type="button" class="sw-btn like" id="cg-yes">받고 싶어요 →</button></div>
      <div class="sw-count" id="cg-cnt"></div>`);
    const area = el.querySelector('#cg-sw');
    const card = (r, n) => `<div class="cg-rv">
        <div class="cg-rv-top"><span class="stars">★★★★★</span><span class="tag">${esc(r.menu)}</span></div>
        <p class="cg-rv-q">${esc(r.t)}</p>
        <div class="cg-rv-who"><i>${esc(r.who[0])}</i><div><b>${esc(r.who)}</b><small>방문자 리뷰 · ${['오늘', '어제', '3일 전', '1주 전'][n % 4]}</small></div></div>
      </div>`;
    function render() {
      busy = false;
      if (i >= REVIEWS.length) return summary();
      el.querySelector('#cg-cnt').textContent = `${i + 1} / ${REVIEWS.length}`;
      area.innerHTML = REVIEWS.slice(i, i + 3).map((r, k) => `<div class="sw-card ${k ? 'back' + k : 'top'}" style="z-index:${3 - k}">
        <span class="stamp like">받고 싶어요</span><span class="stamp nope">글쎄요</span>${card(r, i + k)}</div>`).reverse().join('');
      bindDrag(area.querySelector('.top'));
    }
    function decide(like) {
      if (busy || i >= REVIEWS.length) return; busy = true;
      const r = REVIEWS[i], top = area.querySelector('.top'), f = like ? 1 : -0.4;
      r.v.forEach((x, k) => S.rv[k] += x * f);
      if (like) S.likes.push(r.t);
      if (r.acid === 1) like ? S.acidLike++ : S.acidHate++;
      if (r.acid === -1 && like) S.acidHate++;
      top.style.transition = 'transform .35s ease, opacity .35s';
      top.style.transform = `translateX(${like ? 140 : -140}%) rotate(${like ? 18 : -18}deg)`;
      top.style.opacity = 0; i++; setTimeout(render, 260);
    }
    function bindDrag(c) {
      let x0 = null, dx = 0;
      const lk = c.querySelector('.stamp.like'), np = c.querySelector('.stamp.nope');
      c.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; c.setPointerCapture(e.pointerId); c.style.transition = 'none'; });
      c.addEventListener('pointermove', (e) => { if (x0 === null) return; dx = e.clientX - x0; c.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; lk.style.opacity = clamp(dx / 90, 0, 1); np.style.opacity = clamp(-dx / 90, 0, 1); });
      const end = () => { if (x0 === null) return; x0 = null; if (Math.abs(dx) > 90) decide(dx > 0); else { c.style.transition = 'transform .3s'; c.style.transform = ''; lk.style.opacity = np.style.opacity = 0; } };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    }
    el.querySelector('#cg-yes').onclick = () => decide(true);
    el.querySelector('#cg-no').onclick = () => decide(false);
    KEY.down = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); decide(true); } if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false); } };
    function summary() {
      KEY.down = null;
      const tn = tone(), at = acidTol();
      const s2 = screen(`<div class="sw-sum cg-sum"><small>OUR SIGNATURE</small>
        <b class="cg-tone">${TONE_TXT[tn][0]}</b>
        <p class="cg-tone-d">${TONE_TXT[tn][1]}</p>
        <div class="cg-acid"><span>산미 반응</span><b>${ACID_TXT[at]}</b></div>
        <p class="q-hint" style="margin-top:20px">${S.likes.length ? `받고 싶은 리뷰 ${S.likes.length}개` : '하나도 안 고르셨네요. 리뷰보다 맛으로 말하는 가게군요.'}</p></div>
        <div class="foot"><button type="button" class="btn-text" id="cg-re">다시 넘기기</button><button type="button" class="btn-ink" id="cg-nx">다음 라운드로 가기 →</button></div>`);
      s2.querySelector('#cg-re').onclick = () => r3();
      s2.querySelector('#cg-nx').onclick = () => go(4);
    }
    render();
  }
  function tone() {
    const [a, , , r] = S.rv;
    if (a >= 0.9) return 'specialty';
    if (r >= 0.9 && a <= 0) return 'dark';
    if (a <= -0.4) return 'classic';
    return 'balance';
  }
  function acidTol() { if (S.acidLike >= 1 && S.acidHate === 0) return 'want'; if (S.acidHate >= 2 || (S.acidHate >= 1 && S.acidLike === 0)) return 'avoid'; return 'ok'; }
  const TONE_TXT = {
    classic: ['클래식 · 고소', '누구나 편하게 마시는, 매일 오고 싶은 커피'],
    balance: ['밸런스 · 스탠다드', '단맛과 산미가 둥글게 맞물린 커피'],
    specialty: ['스페셜티 · 산미', '향으로 기억되는 화사한 커피'],
    dark: ['다크 · 스트롱', '진하고 묵직한 정통파 커피'],
  };
  const ACID_TXT = { avoid: '산미는 조심스럽게', ok: '적당하면 괜찮아요', want: '산미가 우리 개성' };

  /* ================= ROUND 4 블렌딩 랩 ================= */
  // 향미 통 다섯 개 — 원두 이름 대신 맛만. 실제 배합은 로스터가 이 구성에 맞는 원두로 짠다.
  const JARS = {
    nut:     { k: '고소한 견과', d: '아몬드 · 구운 땅콩', c: '#5E3920', g: 'base', notes: ['아몬드', '구운 견과'], pr: { acidity: 1.4, body: 4.6, sweetness: 3.3, roastScore: 4 } },
    choco:   { k: '초콜릿', d: '밀크 · 다크초콜릿', c: '#7B4A2C', g: 'base', notes: ['밀크초콜릿', '코코아'], pr: { acidity: 1.9, body: 4.2, sweetness: 3.8, roastScore: 4 } },
    caramel: { k: '캐러멜 단맛', d: '캐러멜 · 흑설탕', c: '#A86B3C', g: 'mid', notes: ['캐러멜', '흑설탕'], pr: { acidity: 2.6, body: 3.6, sweetness: 4.5, roastScore: 3 } },
    fruit:   { k: '상큼한 과일', d: '베리 · 오렌지', c: '#C9824F', g: 'bright', notes: ['베리', '오렌지'], pr: { acidity: 4.8, body: 2.6, sweetness: 3.7, roastScore: 2 } },
    floral:  { k: '꽃 · 차', d: '자스민 · 홍차', c: '#DDB477', g: 'bright', notes: ['자스민', '홍차'], pr: { acidity: 4.5, body: 2.2, sweetness: 3.2, roastScore: 1.5 } },
  };
  const jars = () => JARS;
  const labTotal = () => Object.keys(JARS).reduce((a, k) => a + (S.lab[k] || 0), 0);
  function labProfile(J) {
    const tot = labTotal();
    if (!tot) return null;
    const t = { acidity: 0, body: 0, sweetness: 0 };
    Object.keys(J).forEach((k) => {
      const w = S.lab[k] / tot, pr = J[k].pr, d = S.roast - pr.roastScore;
      t.acidity += (pr.acidity - d * 0.35) * w; t.body += (pr.body + d * 0.25) * w; t.sweetness += (pr.sweetness - Math.abs(d) * 0.1) * w;
    });
    Object.keys(t).forEach((k) => t[k] = clamp(t[k], 1, 5));
    t.roast = S.roast;
    return t;
  }
  const grp = (g) => Object.keys(JARS).filter((k) => JARS[k].g === g).reduce((a, k) => a + (S.lab[k] || 0), 0);
  function r4() {
    const J = jars(), MAX = 10;
    const jarSvg = (c) => svg('0 0 80 96', `<rect x="22" y="4" width="36" height="10" rx="2" fill="${INK}"/><path d="M16 18h48v66a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8z" fill="#fff" fill-opacity=".6" stroke="${INK}" stroke-width="1.4"/>
      ${Array.from({ length: 14 }, (_, i) => { const x = 24 + (i % 4) * 10 + (Math.floor(i / 4) % 2) * 5, y = 82 - Math.floor(i / 4) * 11; return `<ellipse cx="${x}" cy="${y}" rx="5" ry="6.5" transform="rotate(${(i * 37) % 60 - 30} ${x} ${y})" fill="${c}" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`; }).join('')}
      <path d="M22 26v40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`, 'cg-jar-svg');
    const el = screen(`<h3 class="q-title">우리 매장 블렌드, 직접 섞어 보세요</h3><p class="q-hint">손님이 느꼈으면 하는 맛을 한 스쿱씩 담아 주세요 · 열 스쿱이면 완성 · 원두는 로스터가 이 구성에 맞춰 골라요</p>
      <div class="cg-lab">
        <div class="cg-jars">${Object.entries(J).map(([k, j]) => `<div class="cg-jar" data-k="${k}">
          <button type="button" class="cg-jar-btn" data-add="${k}">${jarSvg(j.c)}<span class="cg-jar-n" id="cg-n-${k}">0</span></button>
          <b>${j.k}</b><em>${j.d}</em>
          <button type="button" class="cg-minus" data-sub="${k}" aria-label="한 스쿱 빼기">− 빼기</button></div>`).join('')}</div>
        <div class="cg-mixer">
          <div class="cg-glass"><div class="cg-fill" id="cg-fill"></div><span class="cg-glass-cnt" id="cg-cnt">0 / ${MAX}</span></div>
          <div class="cg-roast">
            <div class="cg-roast-top"><span>로스팅 포인트</span><b id="cg-rk"></b></div>
            <input type="range" min="1" max="5" step="1" id="cg-rs">
            <div class="cg-roast-bar">${[1, 2, 3, 4, 5].map((r) => `<i style="background:${ROAST_COL[r]}"></i>`).join('')}</div>
          </div>
        </div>
        <div class="cg-read">
          <small>예상 맛</small>
          <div class="meter"><span>산미</span><div class="bar"><i id="cg-ma"></i></div></div>
          <div class="meter"><span>바디</span><div class="bar"><i id="cg-mb"></i></div></div>
          <div class="meter"><span>단맛</span><div class="bar"><i id="cg-ms"></i></div></div>
          <small style="margin-top:16px">예상 컵노트</small>
          <div class="chips" id="cg-notes"></div>
          <p class="cg-read-tip" id="cg-tip">통을 눌러 원두를 넣어 보세요</p>
        </div>
      </div>
      <div class="foot"><button type="button" class="btn-text" id="cg-clr">비우기</button><button type="button" class="btn-ink" id="cg-nx" disabled>이 배합으로 →</button></div>`);
    const nx = el.querySelector('#cg-nx'), rs = el.querySelector('#cg-rs');
    rs.value = S.roast;
    const tot = labTotal;
    let order = []; // 스쿱 쌓인 순서 (층 그리기)
    Object.keys(J).forEach((k) => { for (let n = 0; n < S.lab[k]; n++) order.push(k); });
    function paint(bump) {
      const t = tot();
      Object.keys(J).forEach((k) => { el.querySelector('#cg-n-' + k).textContent = S.lab[k]; el.querySelector(`[data-sub="${k}"]`).disabled = !S.lab[k]; });
      el.querySelector('#cg-fill').innerHTML = order.map((k, i) => `<i style="background:${J[k].c}" class="${bump && i === order.length - 1 ? 'new' : ''}"></i>`).join('');
      el.querySelector('#cg-cnt').textContent = `${t} / ${MAX}`;
      el.querySelector('#cg-rk').textContent = ROAST_KO[S.roast];
      const p = labProfile(J);
      const w = (v) => p ? ((v - 1) / 4 * 100).toFixed(0) + '%' : '0%';
      el.querySelector('#cg-ma').style.width = w(p && p.acidity); el.querySelector('#cg-mb').style.width = w(p && p.body); el.querySelector('#cg-ms').style.width = w(p && p.sweetness);
      const notes = [];
      Object.keys(J).sort((a, b) => S.lab[b] - S.lab[a]).filter((k) => S.lab[k]).forEach((k) => J[k].notes.forEach((n) => { if (notes.length < 4 && !notes.includes(n)) notes.push(n); }));
      if (S.roast >= 4 && notes.length < 5) notes.push(S.roast === 5 ? '스모키' : '다크초콜릿');
      if (S.roast <= 2 && notes.length < 5) notes.push('밝은 산미');
      el.querySelector('#cg-notes').innerHTML = notes.map((n) => `<span>${esc(n)}</span>`).join('');
      const tip = !t ? '통을 눌러 원두를 넣어 보세요'
        : t < MAX ? `${MAX - t}스쿱 더 넣으면 완성이에요`
        : grp('bright') >= 6 && S.roast >= 4 ? '과일 · 꽃 향을 진하게 볶으면 향이 묻혀요. 로스팅을 낮춰 보세요'
        : grp('base') >= 6 && S.roast <= 2 ? '고소한 맛은 더 볶아야 살아나요. 로스팅을 올려 보세요'
        : grp('bright') >= 5 ? '향이 살아 있는 스페셜티 스타일이에요'
        : grp('base') >= 6 ? '라떼에도 든든한 고소한 스타일이에요'
        : '균형 잡힌 데일리 블렌드예요';
      el.querySelector('#cg-tip').textContent = tip;
      nx.disabled = t < MAX;
    }
    el.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
      const k = b.dataset.add;
      if (tot() >= MAX) { toast('열 스쿱이 가득 찼어요. 빼고 넣어 주세요'); return; }
      S.lab[k]++; order.push(k);
      b.classList.remove('scoop'); void b.offsetWidth; b.classList.add('scoop');
      paint(true);
    });
    el.querySelectorAll('[data-sub]').forEach((b) => b.onclick = () => {
      const k = b.dataset.sub; if (!S.lab[k]) return;
      S.lab[k]--; const at = order.lastIndexOf(k); if (at >= 0) order.splice(at, 1); paint();
    });
    rs.oninput = () => { S.roast = +rs.value; paint(); };
    el.querySelector('#cg-clr').onclick = () => { S.lab = { nut: 0, choco: 0, caramel: 0, fruit: 0, floral: 0 }; order = []; paint(); };
    nx.onclick = () => go(5);
    paint();
  }

  /* ================= ROUND 5 창고 채우기 ================= */
  function r5() {
    const el = screen(`<h3 class="q-title">창고를 채워 볼까요?</h3><p class="q-hint">한 달에 쓰는 원두 양만큼 자루를 쌓고, 단가 태그를 골라 주세요</p>
      <div class="cg-store">
        <div class="cg-wh">
          <div class="cg-sacks" id="cg-sacks"></div>
          <div class="cg-pallet"></div>
          <div class="cg-kg"><b id="cg-kgv"></b><span id="cg-kgt"></span></div>
          <input type="range" min="5" max="150" step="5" id="cg-kgr">
          <div class="cg-ratio-ends"><span>5kg</span><span>150kg+</span></div>
        </div>
        <div class="cg-tags">${Object.entries(PRICE).map(([k, p], i) => `<button type="button" class="cg-tag" data-p="${k}" style="--r:${[-1.5, 1.2, -0.8][i]}deg"><i></i><small>${['DAILY', 'BALANCE', 'PREMIUM'][i]}</small><b>${p.n}</b><span>${p.d}</span></button>`).join('')}</div>
      </div>
      <div class="foot"><span></span><button type="button" class="btn-ink" id="cg-nx" disabled>처방전 받기 →</button></div>`);
    const nx = el.querySelector('#cg-nx'), kr = el.querySelector('#cg-kgr');
    kr.value = S.kg;
    const sack = `<svg viewBox="0 0 40 44"><path d="M8 8c4-3 20-3 24 0l3 30c-6 4-24 4-30 0z" fill="#E9DCC6" stroke="${INK}" stroke-width="1.2"/><path d="M12 9c3 2 13 2 16 0" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="20" cy="25" r="5" fill="none" stroke="${INK}" stroke-width="1"/><path d="M20 21c-2 3 2 5 0 8" fill="none" stroke="${INK}" stroke-width=".9"/></svg>`;
    let shown = -1;
    function paint() {
      const n = Math.max(1, Math.round(S.kg / 5));
      if (n !== shown) {
        el.querySelector('#cg-sacks').innerHTML = Array.from({ length: n }, (_, i) => `<i style="animation-delay:${shown >= 0 && i >= shown ? (i - shown) * 25 : 0}ms" class="${shown >= 0 && i >= shown ? 'drop' : ''}">${sack}</i>`).join('');
        shown = n;
      }
      const v = volumeKey(S.kg);
      el.querySelector('#cg-kgv').textContent = S.kg >= 150 ? '150kg 이상' : `월 ${S.kg}kg`;
      el.querySelector('#cg-kgt').textContent = VOLUME_TXT[v][0];
      el.querySelectorAll('.cg-tag').forEach((b) => b.classList.toggle('sel', b.dataset.p === S.price));
      nx.disabled = !S.price;
    }
    kr.oninput = () => { S.kg = +kr.value; paint(); };
    el.querySelectorAll('.cg-tag').forEach((b) => b.onclick = () => { S.price = b.dataset.p; paint(); });
    nx.onclick = () => go(6);
    paint();
  }

  /* ================= 추천 계산 (사이트 기존 카페용 표와 같음) ================= */
  function answers() {
    const brewish = S.top.includes('drip') && S.machine !== 'brew' ? 0.3 : 0;
    const coldish = S.top.includes('cold') && S.machine !== 'cold' ? 0.3 : 0;
    return { storeType: S.store, latteRatio: S.latte, tone: tone(), acidTol: acidTol(), equip: S.machine, volume: volumeKey(S.kg), price: S.price, brewish, coldish };
  }
  function targetB2B(a) {
    const base = { classic: [2.0, 3.6, 4.2, 4.0], balance: [3.0, 3.5, 3.6, 3.2], specialty: [4.2, 3.0, 3.4, 2.2], dark: [1.5, 4.5, 3.0, 5.0] }[a.tone] || [3, 3.5, 3.5, 3.2];
    const t = { acidity: base[0], body: base[1], sweetness: base[2], roast: base[3] };
    const r = a.latteRatio - 50;
    t.body += (r / 100) * 1.3; t.roast += (r / 100) * 1.1; t.sweetness += (r / 100) * 0.5;
    t.acidity += { avoid: -0.9, ok: 0, want: 0.9 }[a.acidTol] || 0;
    const eq = { semi: [0, 0, 0], auto: [-0.2, 0.1, 0.3], brew: [0.5, -0.4, -0.6], cold: [-0.3, 0.5, 0.6] }[a.equip] || [0, 0, 0];
    t.acidity += eq[0]; t.body += eq[1]; t.roast += eq[2];
    t.acidity += a.brewish * 0.5 - a.coldish * 0.3; t.roast += -a.brewish * 0.6 + a.coldish * 0.6;
    if (a.storeType === 'bakery') { t.acidity -= 0.2; t.sweetness += 0.3; }
    if (a.storeType === 'resto') { t.body += 0.3; t.roast += 0.3; }
    if (a.storeType === 'office') { t.acidity -= 0.4; t.roast += 0.2; }
    if (a.price === 'value') t.acidity -= 0.3;
    if (a.price === 'premium') t.acidity += 0.3;
    ['acidity', 'body', 'sweetness', 'roast'].forEach((k) => t[k] = clamp(t[k], 1, 5));
    return t;
  }
  function target(J) {
    const t = targetB2B(answers()), lp = labProfile(J);
    if (lp) ['acidity', 'body', 'sweetness', 'roast'].forEach((k) => t[k] = clamp(t[k] * 0.55 + lp[k] * 0.45, 1, 5));
    return t;
  }
  const scoreOf = (p, t) => 100 - (Math.abs(p.pr.acidity - t.acidity) * 12 + Math.abs(p.pr.body - t.body) * 10 + Math.abs(p.pr.sweetness - t.sweetness) * 5 + Math.abs(p.pr.roastScore - t.roast) * 8);

  function memo(a, t) {
    const m = [];
    if (a.latteRatio >= 60) m.push('우유 메뉴가 많아, 라떼에서도 커피 맛이 또렷하도록 바디와 배전을 우선했어요.');
    else if (a.latteRatio <= 30) m.push('아메리카노 위주라 깔끔한 뒷맛과 향을 우선했어요.');
    else m.push('아메리카노와 라떼가 고르게 나가, 양쪽 모두 무난한 균형을 잡았어요.');
    if (a.acidTol === 'avoid') m.push('산미 컴플레인이 나오지 않도록 산미는 은은하게 눌렀어요.');
    if (a.acidTol === 'want') m.push('매장의 개성인 산미가 살아나도록 향을 남겼어요.');
    if (a.equip === 'auto') m.push('전자동 머신은 추출 편차가 적은 미디엄 다크 쪽이 안정적이에요.');
    if (a.equip === 'brew') m.push('브루잉 위주라 향이 살아 있는 배전을 권해요.');
    if (a.equip === 'cold') m.push('콜드브루는 단맛과 바디가 잘 우러나는 배전을 권해요.');
    if (a.storeType === 'bakery') m.push('디저트와 어울리도록 단맛을 조금 올렸어요.');
    if (grp('bright') >= 6 && S.roast >= 4) m.push('직접 짠 배합은 과일 · 꽃 향이 많은데 진하게 볶으셨어요. 향이 묻히지 않게 로스팅을 한 단계 낮춰 보는 걸 권해요.');
    const out = m.slice(0, 3);
    out.push(`월 ${S.kg >= 150 ? '150kg 이상' : S.kg + 'kg'} 사용량에 맞춰 로스팅 주기와 납품 일정을 상담해 드려요.`);
    return out;
  }

  /* ================= 결과 · 매장 맞춤 처방전 ================= */
  function result() {
    S.round = 6; hud();
    const J = jars(), a = answers(), t = target(J);
    const pool = products().filter((p) => p.cat === 'blend');
    const ranked = pool.map((p) => ({ p, s: scoreOf(p, t) })).sort((x, y) => y.s - x.s);
    const best = ranked[0];
    const custom = !best || best.s < 82;
    const tot = labTotal();
    const parts = Object.keys(J).filter((k) => S.lab[k]).map((k) => ({ k, n: J[k].k, c: J[k].c, pct: Math.round(S.lab[k] / tot * 100) })).sort((x, y) => y.pct - x.pct);
    const roastRx = Math.round(t.roast);
    // 신호가 엇갈렸는지: 리뷰 · 메뉴 · 장비로 계산한 맛 vs 블렌딩 랩에서 직접 섞은 맛
    const tR = targetB2B(a), tL = labProfile(J);
    const split = tL && (Math.abs(tR.acidity - tL.acidity) >= 1.2 || Math.abs(tR.roast - tL.roast) >= 1.5);
    const dirW = (x) => x.acidity >= 3.4 ? '화사한 쪽' : x.acidity <= 2.3 ? '고소한 쪽' : '균형 잡힌 쪽';
    const bestFor = (x) => pool.map((p) => ({ p, s: scoreOf(p, x) })).sort((m, n) => n.s - m.s)[0];
    const bR = split ? bestFor(tR) : null;
    const bL = split ? pool.filter((p) => p !== bR.p).map((p) => ({ p, s: scoreOf(p, tL) })).sort((m, n) => n.s - m.s)[0] : null;
    // 로스터가 다듬은 비율: 매장에 맞는 산미와 직접 짠 배합의 산미 차이만큼 화사함 ↔ 고소함을 10%씩 옮긴다
    const lp = labProfile(J), fix = { ...S.lab };
    let steps = lp ? clamp(Math.round((t.acidity - lp.acidity) / 0.45), -2, 2) : 0;
    const moved = [];
    const most = (g, src) => Object.keys(J).filter((k) => J[k].g === g && (!src || fix[k] > 0)).sort((x, y) => fix[y] - fix[x])[0];
    while (steps !== 0) {
      const fromG = steps > 0 ? 'base' : 'bright', toG = steps > 0 ? 'bright' : 'base';
      const src = most(fromG, true) || (steps > 0 && fix.caramel > 0 ? 'caramel' : null), dst = most(toG);
      if (!src || !dst) break;
      fix[src]--; fix[dst]++; moved.push([src, dst]); steps += steps > 0 ? -1 : 1;
    }
    const partsFix = Object.keys(J).filter((k) => fix[k]).map((k) => ({ k, n: J[k].k, c: J[k].c, pct: fix[k] * 10 })).sort((x, y) => y.pct - x.pct);
    const movedTxt = moved.length ? `${J[moved[0][0]].k} ${moved.length * 10}%를 ${J[moved[0][1]].k} 쪽으로 옮겼어요.` : '사장님 배합이 매장에 잘 맞아 비율은 그대로 두었어요.';
    const no = String(Date.now()).slice(-5);
    const today = new Date(); const ymd = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    screen(`<div class="loading"><small>WRITING YOUR PRESCRIPTION</small><div style="width:70px;margin:22px auto 0">${beanSvg(ROAST_COL[roastRx])}</div><div class="bar"><i></i></div><p class="q-hint" style="margin-top:16px">로스터가 처방전을 쓰는 중이에요</p></div>`);
    setTimeout(() => {
      const pos = (v) => ((v - 1) / 4 * 100).toFixed(1) + '%';
      const row = (lbl, you, bean) => `<div class="cmp-row"><span>${lbl}</span><div class="cmp-track"><span class="you" style="left:${pos(you)}"></span>${bean != null ? `<span class="bean" style="left:${pos(bean)}"></span>` : ''}</div></div>`;
      const info = [
        ['매장', STORES[S.store].n], ['머신', MACHINES[S.machine].n],
        ['판매 TOP 3', S.top.map((k) => MENU[k].n).join(' · ')], ['우유 메뉴', `약 ${S.latte}%`],
        ['듣고 싶은 리뷰', TONE_TXT[a.tone][0]], ['산미 반응', ACID_TXT[a.acidTol]],
        ['월 사용량', S.kg >= 150 ? '150kg 이상' : `${S.kg}kg`], ['희망 단가', PRICE[S.price].n],
      ];
      const ratio = (list) => `<div class="cg-ratio-bar">${list.map((x) => `<i style="width:${x.pct}%;background:${x.c}"></i>`).join('')}</div>
        <ul class="cg-ratio-list">${list.map((x) => `<li><i style="background:${x.c}"></i>${esc(x.n)}<b>${x.pct}%</b></li>`).join('')}</ul>`;
      const midTag = split && !custom ? (best.p === bR.p ? 'A' : best.p === bL.p ? 'B' : '') : '';
      const main = custom ? `
          <small class="cg-rx-k">처방 · 매장 전용 블렌드 시안</small>
          <div class="res-name">우리 매장 하우스 블렌드</div>
          <div class="res-sub">권장 로스팅 ${ROAST_KO[roastRx]} · 사장님 배합을 로스터가 다듬었어요</div>
          ${ratio(partsFix)}
          <p class="cg-rx-note"><b>${movedTxt}</b> 기존 블렌드 중 딱 맞는 게 없어, 이 향미 구성에 맞는 원두로 매장 전용 블렌드를 짜 드려요. 실제 원두와 비율은 샘플 테이스팅 후 로스터와 함께 확정해요.</p>`
        : `
          <small class="cg-rx-k">${midTag ? `처방 ${midTag} · 자세히` : '처방 · 스트레토 추천 블렌드'}</small>
          <div class="cg-rx-prod">${best.p.img ? `<img src="${esc(best.p.img)}" alt="">` : ''}<div><div class="res-name">${esc(best.p.name)}</div><div class="res-sub">${esc(best.p.roast)}</div></div></div>
          <div class="chips">${best.p.notes.split(/[·,]/).map((n) => n.trim()).filter(Boolean).slice(0, 4).map((n) => `<span>${esc(n)}</span>`).join('')}</div>
          <div class="match"><span>매장 일치</span><div><i id="cg-mt"></i></div><b>${clamp(Math.round(best.s), 60, 98)}%</b></div>`;
      const bean = custom ? null : best.p.pr;
      const el = screen(`<div class="flip"><div class="flip-in">
        <div class="cg-rx">
          <div class="cg-rx-head">
            <div><small>STRETTO COFFEE FACTORY</small><h3>매장 맞춤 처방전</h3></div>
            <div class="cg-rx-no">No. ${no}<br>${ymd}</div>
          </div>
          <div class="cg-rx-grid">
            <div class="cg-rx-info">
              <small class="cg-rx-k">매장 정보</small>
              <dl>${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
              <small class="cg-rx-k" style="margin-top:18px">사장님이 짠 배합</small>
              ${ratio(parts)}
              <p class="cg-rx-mini">로스팅 포인트 · ${ROAST_KO[S.roast]}</p>
            </div>
            <div class="cg-rx-main">
              <span class="cg-rx-big">Rx</span>
              ${split ? `<div class="cg-two"><p class="cg-two-t">💡 리뷰와 메뉴로는 <em>${dirW(tR)}</em>, 직접 섞은 배합은 <em>${dirW(tL)}</em>이었어요. 서로 반대 방향이라 <b>각각에 어울리는 블렌드</b>를 하나씩 처방해 드려요.</p>
                <div class="cg-two-row">${[[bR, 'A', '리뷰 · 메뉴를 살리면'], [bL, 'B', '직접 섞은 배합을 살리면']].map(([x, l, k]) => `<div class="cg-two-c"><small><span>처방 ${l}</span>${k}</small>
                  <div class="cg-rx-prod">${x.p.img ? `<img src="${esc(x.p.img)}" alt="">` : ''}<div><b>${esc(x.p.name)}</b><em>${esc(x.p.roast)}</em></div></div>
                  <p>${esc(x.p.notes)}</p></div>`).join('')}</div>
                <p class="cg-two-mid">${midTag ? `처방 ${midTag}를 자세히 보면 ↓` : '둘의 중간으로 가고 싶다면 ↓'}</p></div>` : ''}
              ${main}
              <div class="cmp">${row('산미', t.acidity, bean && bean.acidity)}${row('바디', t.body, bean && bean.body)}${row('단맛', t.sweetness, bean && bean.sweetness)}${row('배전', t.roast, bean && bean.roastScore)}
                <div class="cmp-legend"><span><i style="border:1.5px solid ${INK}"></i>매장에 맞는 맛</span>${bean ? `<span><i style="background:${INK}"></i>이 블렌드</span>` : ''}</div></div>
              <small class="cg-rx-k">로스터 메모</small>
              <ul class="cg-memo">${memo(a, t).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <div class="res-cta">
                <button type="button" class="btn-mint" id="cg-consult">납품 상담 신청</button>
                <a class="btn-line" href="${SAMPLE_FORM_URL}" target="_blank" rel="noopener">샘플 테이스팅 신청 ↗</a>
                <button type="button" class="btn-text" id="cg-again" style="margin-left:auto">다시 하기</button>
              </div>
            </div>
          </div>
          <div class="cg-stamp"><span>STRETTO</span><b>ROASTED<br>FOR YOU</b><span>${ymd}</span></div>
        </div>
        ${!split && custom && best ? `<div class="more cg-more"><div><small>기존 라인업 중 가장 가까운</small><b>${esc(best.p.name)}</b><span>${esc(best.p.notes)}</span></div></div>` : ''}
        ${!split && !custom && ranked[1] ? `<div class="more cg-more"><div><small>함께 비교해 볼 만한</small><b>${esc(ranked[1].p.name)}</b><span>${esc(ranked[1].p.notes)}</span></div></div>` : ''}
      </div></div>`);
      requestAnimationFrame(() => setTimeout(() => { const m = el.querySelector('#cg-mt'); if (m) m.style.width = clamp(Math.round(best.s), 60, 98) + '%'; }, 50));
      el.querySelector('#cg-again').onclick = () => { reset(); go(1); };
      el.querySelector('#cg-consult').onclick = () => {
        const msg = `[원두 찾기 · 카페] ${custom ? '매장 전용 블렌드' : best.p.name} 납품 상담 문의드립니다. (${info.map(([k, v]) => `${k}: ${v}`).join(' / ')} / 직접 짠 배합: ${parts.map((x) => `${x.n} ${x.pct}%`).join(', ')} · ${ROAST_KO[S.roast]}${custom ? ` / 로스터 제안: ${partsFix.map((x) => `${x.n} ${x.pct}%`).join(', ')} · ${ROAST_KO[roastRx]}` : ''})`;
        if (typeof window.__finderConsult === 'function') window.__finderConsult(msg);
        else toast('시안에서는 여기까지예요. 실제 페이지에서는 1:1 상담창이 열려요');
      };
    }, 1800);
  }

  window.CG = {
    start() { ROOT.style.display = ''; reset(); go(0); },
    hide() { ROOT.style.display = 'none'; },
  };
  reset(); go(0, true);
})();
