/* 원두 찾기 게임 (개인 고객 5라운드) — index.html 원두 페이지 #fg
   ROUND 1 향미 월드컵 · 2 맛 스와이프 · 3 직접 로스팅 · 4 장비 진열장 · 5 뽑기 한 판 → 결과
   - 카드·뽑기 그림: finder-designs.js (window.FD) / 모양: finder-game.css
   - 원두 데이터: 사이트가 불러온 window.__publicProducts (공개용 미러). 아직 안 왔으면 아래 스냅숏으로 먼저 보여 준다.
   - 카페 · 사업자는 기존 질문(.finder-shell)으로 넘긴다. 기존 질문의 '처음으로'는 window.FG.home() 으로 이 시작 화면에 돌아온다.
   시안 원본: .review-inbox/finder-game.html */
(function () {
  const ROOT = document.getElementById('fg');
  if (!ROOT || !window.FD) return;
  const SHELL = document.querySelector('#finder .finder-shell');
  const DESIGN = { aroma: 'illus', swipe: 'illus', gacha: 'machine' };

  /* ================= 데이터 ================= */
  // 원두 스냅숏 (publicProducts, 2026-11-19) — 실제 데이터가 오기 전 · 못 받았을 때만 쓴다
  const SNAP = [{"name":"알토 블렌드 (Alto)","category":"blend","roastingLevel":"Dark","cupNote":"다크초콜릿 · 아몬드 · 묵직한 바디","description":"스트레토 대표 강배전 커피로 스모키함 속에서도 구수한 향미, 단맛, 좋은 밸런스를 가진 커피","imageUrl":"alto_blend.jpg","price":10000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/7703485371","profile":{"acidity":1.6,"body":5,"sweetness":3.7,"roastScore":5}},{"name":"스트레토 블렌드 (Stretto)","category":"blend","roastingLevel":"Medium Dark","cupNote":"고소함 · 밸런스 · 복합적 향미","description":"단맛과 고소함의 완벽한 밸런스. 호불호 없이 누구나 즐길 수 있는 데일리 블렌드.","imageUrl":"stretto_blend.jpg","price":11000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/4741890835","profile":{"acidity":2.3,"body":3.6,"sweetness":3.4,"roastScore":4}},{"name":"구스토 블렌드 (Gusto)","category":"blend","roastingLevel":"Medium Light","cupNote":"피치 · 플로럴 · 살구 · 시트러스 · 베리","description":"에티오피아와 케냐의 조화. 입안 가득 퍼지는 풍성한 향미와 산뜻한 산미.","imageUrl":"gusto_blend.jpg","price":14000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/4743046576","profile":{"acidity":4.6,"body":2.4,"sweetness":3,"roastScore":2}},{"name":"디카페인 콜롬비아 엑셀소","category":"decaf","roastingLevel":"Medium Dark","cupNote":"군고구마 · 카라멜 · 브라운슈거 · 오렌지","description":"군고구마의 향미와 카라멜향, 좋은 단맛과 오렌지 같은 상큼함을 지닌 커피","imageUrl":"decaffeine.jpg","price":15500,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/8420400655","profile":{"acidity":2.6,"body":3.6,"sweetness":4.1,"roastScore":4}},{"name":"에티오피아 G1 예가체프 코케 내추럴","category":"single_fruity","roastingLevel":"Medium Light","cupNote":"딸기 · 살구 · 꿀 · 레몬","description":"딸기와 살구의 선명한 과일향이 느껴지고 꿀의 부드러운 단맛과 쥬시한 바디감이 매력적인 커피","imageUrl":"rwanda_busanze.jpg","price":17000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/12455597683","profile":{"acidity":5,"body":2.4,"sweetness":3.7,"roastScore":2}},{"name":"케냐 응고라노 AA","category":"single_fruity","roastingLevel":"Medium Light","cupNote":"자두 · 블랙커런트 · 히비스커스","description":"히비스커스의 플로럴함과 베리류의 풍미. 과하지 않은 밝은 산미와 마일드한 바디의 조화.","imageUrl":"kenya_ngorano.jpg","price":20000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/7805124250","profile":{"acidity":5,"body":2.4,"sweetness":3,"roastScore":2}},{"name":"케냐 카구모 AA","category":"single_fruity","roastingLevel":"Medium Light","cupNote":"블랙커런트 · 토마토 · 자몽 · 오렌지· 황설탕","description":"블랙커런트, 자몽, 오렌지의 밝고 쥬시한 산미에 황설탕의 묵직한 단맛이 인상적인 커피","imageUrl":"kenya_kagumo1.jpg","price":22000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/7805158072","profile":{"acidity":5,"body":2.7,"sweetness":3.7,"roastScore":2}},{"name":"과테말라 엘소코로 옐로우 카투라","category":"single_nutty","roastingLevel":"Medium Dark","cupNote":"밀크초콜릿 · 캐러맬 · 오렌지 · 청사과","description":"은은한 오렌지, 청사과의 뉘앙스에 밀크초콜릿, 캐러멜의 깊은 단맛이 느껴지는 커피","imageUrl":"guatemala_el_soc.jpg","price":15500,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/8480420344","profile":{"acidity":1.9,"body":4.1,"sweetness":3.7,"roastScore":4}},{"name":"과테말라 안티구아 SHB","category":"single_nutty","roastingLevel":"Medium Dark","cupNote":"마카다미아 · 아몬드 · 밀크초콜릿","description":"한국인이 가장 선호하는 맛. 묵직하고 부드러운 바디와 견과류의 고소함, 좋은 밸런스.","imageUrl":"guatemala_antigua.jpg","price":11000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/5342064375","profile":{"acidity":1.3,"body":5,"sweetness":3.4,"roastScore":4}},{"name":"에티오피아 예가체프 게뎁 초르소","category":"single_fruity","roastingLevel":"Medium Light","cupNote":"아카시아 · 베르가못 · 살구 · 사과 · 레몬","description":"과일향이 가득하고, 밝은 산미와 부드러운 바디가 어우러진 매력적인 커피.","imageUrl":"ethiopia_guji.jpg","price":22000,"shopLink":"https://smartstore.naver.com/stretto_coffeefactory/products/13698590259","profile":{"acidity":5,"body":2.4,"sweetness":3,"roastScore":2}}];
  const STORE = 'https://smartstore.naver.com/stretto_coffeefactory';
  function beans() {
    const live = (window.__publicProducts || []).filter((p) => p.profile && p.recommendB2C !== false && p.shopVisible !== false);
    const list = live.length ? live : SNAP;
    return list.map((p) => ({
      name: p.name, cat: p.category || '', roast: p.roastingLevel || '', notes: p.cupNote || '', desc: p.description || '',
      img: p.imageUrl ? (/^(https?:)?\/\//.test(p.imageUrl) || p.imageUrl.startsWith('/') ? p.imageUrl : '/' + p.imageUrl) : '',
      price: p.price || 0, link: p.shopLink || STORE,
      pr: { acidity: p.profile.acidity || 3, body: p.profile.body || 3, sweetness: p.profile.sweetness || 3, roastScore: p.profile.roastScore || 3 },
    }));
  }

  // 향미 8종 [산미, 바디, 단맛, 배전] 보정값 — 이름·그림은 FD.AROMA
  const AROMAS = {
    berry:   { v: [0.6, -0.3, 0.1, -0.4], bright: true },
    citrus:  { v: [0.8, -0.4, -0.1, -0.5], bright: true },
    floral:  { v: [0.5, -0.6, 0.1, -0.7], bright: true },
    wine:    { v: [0.3, 0.3, 0.3, 0.0], bright: true },
    caramel: { v: [-0.2, 0.2, 0.8, 0.2] },
    choco:   { v: [-0.6, 0.4, 0.5, 0.5] },
    nutty:   { v: [-0.6, 0.3, 0.4, 0.4] },
    smoky:   { v: [-0.9, 0.9, -0.2, 1.0] },
  };
  const AN = (k) => FD.AROMA[k].ko;
  const FIRST_ROUND = [['berry', 'choco'], ['floral', 'nutty'], ['citrus', 'caramel'], ['wine', 'smoky']];
  const SWIPES = FD.SWIPE;

  const STAGES = [
    { to: 0.17, k: 'UNDER ROASTED', n: '풀 내음 · 생땅콩 · 아직 커피가 아니에요', rs: 0, like: '아직 커피가 아니에요' },
    { to: 0.34, k: 'LIGHT',         n: '꽃 · 레몬 껍질 · 홍차', rs: 1, like: '레몬에이드처럼 산뜻하고 가볍게', w: '꽃 · 레몬' },
    { to: 0.49, k: 'MEDIUM LIGHT',  n: '베리 · 살구 · 꿀', rs: 2, like: '베리 잼처럼 상큼하고 달콤하게', w: '베리 · 꿀' },
    { to: 0.64, k: 'MEDIUM',        n: '캐러멜 · 밀크초콜릿 · 둥근 단맛', rs: 3, like: '밀크초콜릿처럼 둥글고 편안하게', w: '캐러멜' },
    { to: 0.80, k: 'MEDIUM DARK',   n: '다크초콜릿 · 구운 견과 · 흑설탕', rs: 4, like: '다크초콜릿처럼 진하고 고소하게', w: '다크초콜릿' },
    { to: 1.00, k: 'DARK',          n: '카카오 닙 · 훈연 · 긴 여운', rs: 5, like: '에스프레소처럼 묵직하고 쌉싸름하게', w: '훈연 · 카카오' },
    { to: 9,    k: 'BEYOND DARK',   n: '숯 · 쓴맛 · 이건 좀 과했어요', rs: 5, like: '앗, 탄 맛이 나기 시작해요' },
  ];
  const STAGE_COL = ['#C9B66B', '#B98A4E', '#8E5A33', '#6B3F24', '#3a2416'];
  // 향미와 로스팅이 서로 반대 방향인지 (밝은 향 + 진한 로스팅 / 진한 향 + 밝은 로스팅)
  const BRIGHT = ['berry', 'citrus', 'floral'], DEEP = ['choco', 'nutty', 'smoky'];
  function roastClash(champ, rs) {
    if (BRIGHT.includes(champ) && rs >= 4) return `${AN(champ)} 향은 라이트 ~ 미디엄 라이트에서 가장 잘 살아나요. 이만큼 볶으면 ${AN(champ)} 향이 로스팅에 묻혀요.`;
    if (DEEP.includes(champ) && rs <= 2) return `${AN(champ)} 향은 미디엄 이상 볶아야 나와요. 이 정도면 ${AN(champ)}보다 상큼한 맛이 먼저 느껴져요.`;
    return '';
  }
  const CRACK1 = 0.40, CRACK2 = 0.73;
  const BEAN_STOPS = [[0, '#8FA05A'], [0.16, '#C9B66B'], [0.34, '#B98A4E'], [0.5, '#8E5A33'], [0.65, '#6B3F24'], [0.8, '#4A2A18'], [0.94, '#2A1A10'], [1.08, '#0e0906']];

  const GEARS = {
    drip:     { n: '드리퍼',     s: '핸드드립',   v: [0.3, -0.2, -0.4], i: '<path d="M10 14h28l-8 14H18z"/><path d="M24 28v5M16 40h16M24 4v4M20 8h8"/>' },
    espresso: { n: '에스프레소', s: '머신',       v: [-0.2, 0.4, 0.7],  i: '<rect x="9" y="5" width="30" height="12" rx="2"/><path d="M17 17v4M31 17v4M15 27h18v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"/><path d="M33 29h3a3 3 0 0 1 0 6h-3"/>' },
    moka:     { n: '모카포트',   s: '가정용 압력', v: [-0.1, 0.4, 0.5], i: '<path d="M16 6h16l-2 12H18zM18 18l-4 22h20l-4-22M32 9h4v8"/><path d="M24 2v4"/>' },
    cold:     { n: '콜드브루',   s: '차갑게 오래', v: [-0.2, 0.5, 0.6], i: '<path d="M14 8h20l-3 32H17z"/><path d="M18 18h12M20 26l2 2M26 24l2 2M21 32l2 1"/>' },
    capsule:  { n: '캡슐 · 드립백', s: '간편 추출', v: [0, 0.1, 0.3],   i: '<path d="M13 14h22l-4 22H17z"/><path d="M11 14h26"/><circle cx="24" cy="9" r="2"/>' },
  };

  /* ================= 판 만들기 ================= */
  ROOT.innerHTML = `<div class="board">
      <div class="hud" id="fg-hud" style="display:none">
        <div class="hud-left"><span class="hud-round" id="fg-hud-round"></span><span class="hud-name" id="fg-hud-name"></span></div>
        <div class="hud-beans" id="fg-hud-beans"></div>
        <button type="button" class="hud-home" id="fg-hud-home">처음으로</button>
      </div>
      <div class="stage" id="fg-stage"></div>
    </div><div class="toast" id="fg-toast"></div>`;
  const $ = (s, r = ROOT) => r.querySelector(s);
  const stage = $('#fg-stage');

  const ROUNDS = ['향미 월드컵', '맛 스와이프', '직접 로스팅', '장비 진열장', '내 원두 뽑기'];
  let S;
  function reset() { S = { round: 0, champ: null, runner: null, taste: { a: 0, b: 0, s: 0 }, likes: [], roast: null, roastKey: '', roastClash: '', fails: 0, gears: [], none: false, adventure: null }; }
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const won = (n) => Number(n || 0).toLocaleString('ko-KR');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toast(t) { const el = $('#fg-toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200); }
  function mix(c1, c2, t) { const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16); const r = (x, s) => (x >> s) & 255; const m = (s) => Math.round(r(a, s) + (r(b, s) - r(a, s)) * t); return `rgb(${m(16)},${m(8)},${m(0)})`; }
  function beanColor(p) { for (let i = 1; i < BEAN_STOPS.length; i++) { if (p <= BEAN_STOPS[i][0]) { const [p0, c0] = BEAN_STOPS[i - 1], [p1, c1] = BEAN_STOPS[i]; return mix(c0, c1, (p - p0) / (p1 - p0)); } } return BEAN_STOPS[BEAN_STOPS.length - 1][1]; }
  const beanSvg = (fill, stroke = 'rgba(0,0,0,.25)') => `<svg viewBox="0 0 40 50"><ellipse cx="20" cy="25" rx="16" ry="21" fill="${fill}" stroke="${stroke}" stroke-width="1"/><path d="M21 6c-6 8 4 14-1 19s-5 12 1 19" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.6" stroke-linecap="round"/></svg>`;

  // 키보드 (스와이프 화살표 · 로스팅 스페이스바) — 화면에 게임이 보일 때만
  const KEY = { down: null, up: null };
  const visible = () => ROOT.offsetParent !== null && ROOT.style.display !== 'none';
  document.addEventListener('keydown', (e) => { if (KEY.down && visible()) KEY.down(e); });
  document.addEventListener('keyup', (e) => { if (KEY.up && visible()) KEY.up(e); });

  function hud() {
    const h = $('#fg-hud');
    if (S.round < 1 || S.round > 5) { h.style.display = 'none'; return; }
    h.style.display = '';
    $('#fg-hud-round').textContent = S.round <= 4 ? `ROUND ${S.round} / 4` : 'FINAL';
    $('#fg-hud-name').textContent = ROUNDS[S.round - 1];
    const cols = ['#8FA05A', '#C9B66B', '#B98A4E', '#8E5A33', '#4A2A18'];
    $('#fg-hud-beans').innerHTML = [0, 1, 2, 3, 4].map((i) => {
      const done = i < S.round - 1, cur = i === S.round - 1;
      return beanSvg(done ? cols[i] : (cur ? '#fff' : '#f2f2f2'), cur ? '#202020' : (done ? 'rgba(0,0,0,.2)' : '#ddd')).replace('<svg', `<svg class="${cur ? 'cur' : ''}"`);
    }).join('');
  }
  $('#fg-hud-home').addEventListener('click', () => { reset(); go(0); });
  function go(r, noScroll) {
    KEY.down = KEY.up = null;
    ROOT.querySelectorAll('.gx-open').forEach((x) => x.remove()); // 뽑기 캡슐 화면이 떠 있으면 닫기
    S.round = r; hud(); [entry, r1, r2, r3, r4, r5, result][r]();
    if (!noScroll) { const y = ROOT.getBoundingClientRect().top + window.scrollY - 84; if (Math.abs(window.scrollY - y) > 40) window.scrollTo({ top: y, behavior: 'smooth' }); }
  }
  function screen(html) { stage.innerHTML = `<div class="screen">${html}</div>`; return stage.firstElementChild; }

  /* ================= 시작 ================= */
  function entry() {
    const el = screen(`<div class="entry">
      <button type="button" class="entry-card" data-m="b2c"><img src="/img/hero-beans-2.jpg" alt=""><div class="in"><small>FOR YOU</small><b>개인 고객</b><span>네 번의 게임으로<br>내 취향의 원두를 찾아요.</span><div class="meta"><span>4 ROUNDS + 뽑기</span><span>약 1분</span></div></div><span class="go">게임 시작</span></button>
      <button type="button" class="entry-card" data-m="b2b"><img src="/img/wh-sample-tasting.jpg" alt=""><div class="in"><small>FOR CAFÉ</small><b>카페 · 사업자</b><span>다섯 번의 게임으로<br>매장 맞춤 처방전을 받아요.</span><div class="meta"><span>5 ROUNDS</span><span>약 2분</span></div></div><span class="go">게임 시작</span></button>
    </div>`);
    el.querySelector('[data-m="b2c"]').onclick = () => go(1);
    el.querySelector('[data-m="b2b"]').onclick = toCafe;
  }
  // 카페 · 사업자 → 기존 질문
  // 카페 · 사업자 → 카페용 게임(cafe-game.js, #cg). 없으면 기존 질문으로
  function toCafe() {
    if (window.CG) { ROOT.style.display = 'none'; window.CG.start(); return; }
    const btn = document.querySelector('#finder .finder-mode[data-mode="b2b"]');
    if (!SHELL || !btn) return;
    ROOT.style.display = 'none'; SHELL.style.display = '';
    btn.click();
  }

  /* ================= ROUND 1 향미 월드컵 ================= */
  function r1() {
    let round = FIRST_ROUND.map((p) => p.slice()), next = [], idx = 0, picks = 0;
    const label = () => round.length === 4 ? `8강 · ${idx + 1} / 4` : round.length === 2 ? `4강 · ${idx + 1} / 2` : '결승';
    function show() {
      const [a, b] = round[idx];
      const card = (k) => `<button type="button" class="wc-card" data-k="${k}">${FD.aromaCard(DESIGN.aroma, k)}</button>`;
      const el = screen(`<h3 class="q-title">더 끌리는 향을 골라 주세요</h3><p class="q-hint">끝까지 살아남은 향이 당신의 취향이에요</p>
        <div class="wc-stage">${label()}</div>
        <div class="wc">${card(a)}<div class="wc-vs">VS</div>${card(b)}</div>
        <div class="bracket">${Array.from({ length: 7 }, (_, i) => `<span class="${i < picks ? 'on' : ''}"></span>`).join('')}</div>`);
      el.querySelectorAll('.wc-card').forEach((c) => c.onclick = () => {
        if (el.dataset.lock) return; el.dataset.lock = 1;
        const w = c.dataset.k, l = w === a ? b : a;
        c.classList.add('win'); el.querySelector(`.wc-card[data-k="${l}"]`).classList.add('lose');
        picks++; next.push(w);
        setTimeout(() => {
          idx++;
          if (idx < round.length) return show();
          if (next.length === 1) { S.champ = next[0]; return runnerUp(FD.ORDER.filter((k) => k !== S.champ)); }
          const r = []; for (let i = 0; i < next.length; i += 2) r.push([next[i], next[i + 1]]);
          round = r; next = []; idx = 0; show();
        }, 520);
      });
    }
    // 2등 정하기: 우승 향을 뺀 나머지 일곱 개 중에서 손님이 직접 하나 더 고른다 (월드컵에서 언제 떨어졌는지와 상관없이)
    function runnerUp(cands) {
      const el = screen(`<h3 class="q-title">우승은 ${AN(S.champ)}! 2등은 어떤 향일까요?</h3><p class="q-hint">${AN(S.champ)} 말고 또 좋아하는 향을 하나 더 골라 주세요</p>
        <div class="ru">${cands.map((k) => `<button type="button" class="ru-card" data-k="${k}">${FD.aromaCard(DESIGN.aroma, k)}</button>`).join('')}</div>`);
      el.querySelectorAll('.ru-card').forEach((c) => c.onclick = () => {
        if (el.dataset.lock) return; el.dataset.lock = 1;
        c.classList.add('win'); el.querySelectorAll('.ru-card').forEach((o) => { if (o !== c) o.classList.add('lose'); });
        S.runner = c.dataset.k; setTimeout(champion, 520);
      });
    }
    function champion() {
      const el = screen(`<div class="champ"><small>CHAMPION</small><div class="trophy">${FD.aromaCard(DESIGN.aroma, S.champ)}</div>
        <p style="margin-top:16px">2등 · ${AN(S.runner)}</p></div>
        <div class="foot"><button type="button" class="btn-text" id="fg-again">다시 하기</button><button type="button" class="btn-ink" id="fg-nx">다음 라운드 →</button></div>`);
      el.querySelector('#fg-nx').onclick = () => go(2);
      el.querySelector('#fg-again').onclick = () => r1();
    }
    show();
  }

  /* ================= ROUND 2 맛 스와이프 ================= */
  function r2() {
    S.taste = { a: 0, b: 0, s: 0 }; S.likes = [];
    let i = 0, busy = false;
    const el = screen(`<h3 class="q-title">이 맛, 좋아요? 별로예요?</h3><p class="q-hint">카드를 오른쪽(좋아요) · 왼쪽(별로예요)으로 넘겨 주세요</p>
      <div class="sw-area" id="fg-sw"></div>
      <div class="sw-btns"><button type="button" class="sw-btn" id="fg-no">← 별로예요</button><button type="button" class="sw-btn like" id="fg-yes">좋아요 →</button></div>
      <div class="sw-count" id="fg-cnt"></div>`);
    const area = el.querySelector('#fg-sw');
    function render() {
      busy = false;
      if (i >= SWIPES.length) return summary();
      el.querySelector('#fg-cnt').textContent = `${i + 1} / ${SWIPES.length}`;
      area.innerHTML = SWIPES.slice(i, i + 3).map((c, k) => `<div class="sw-card ${k ? 'back' + k : 'top'}" style="z-index:${3 - k}">
        <span class="stamp like">좋아요</span><span class="stamp nope">별로예요</span>${FD.swipeCard(DESIGN.swipe, c, i + k)}</div>`).reverse().join('');
      bindDrag(area.querySelector('.top'));
    }
    function decide(like) {
      if (busy || i >= SWIPES.length) return; busy = true;
      const c = SWIPES[i], top = area.querySelector('.top');
      const f = like ? 1 : -0.5;
      S.taste.a += (c.a || 0) * f; S.taste.b += (c.b || 0) * f; S.taste.s += (c.s || 0) * f;
      if (like) S.likes.push(c.ko);
      top.style.transition = 'transform .35s ease, opacity .35s';
      top.style.transform = `translateX(${like ? 140 : -140}%) rotate(${like ? 18 : -18}deg)`;
      top.style.opacity = 0;
      i++; setTimeout(render, 260);
    }
    function bindDrag(card) {
      let x0 = null, dx = 0;
      const like = card.querySelector('.stamp.like'), nope = card.querySelector('.stamp.nope');
      card.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; });
      card.addEventListener('pointermove', (e) => { if (x0 === null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`; like.style.opacity = clamp(dx / 90, 0, 1); nope.style.opacity = clamp(-dx / 90, 0, 1); });
      const end = () => { if (x0 === null) return; x0 = null; if (Math.abs(dx) > 90) decide(dx > 0); else { card.style.transition = 'transform .3s'; card.style.transform = ''; like.style.opacity = nope.style.opacity = 0; } };
      card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
    }
    el.querySelector('#fg-yes').onclick = () => decide(true);
    el.querySelector('#fg-no').onclick = () => decide(false);
    KEY.down = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); decide(true); } if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false); } };
    function summary() {
      KEY.down = null;
      const acid = clamp(3 + S.taste.a * 0.9, 1, 5), body = clamp(3 + S.taste.b * 0.9, 1, 5);
      const word = (v, w) => w[Math.round(v) - 1];
      const s2 = screen(`<div class="sw-sum"><small>YOUR TASTE</small>
        <div class="meter"><span>산미</span><div class="bar"><i style="width:0"></i></div><em>${word(acid, ['거의 없이', '은은하게', '균형 있게', '산뜻하게', '화사하게'])}</em></div>
        <div class="meter"><span>바디</span><div class="bar"><i style="width:0"></i></div><em>${word(body, ['아주 가볍게', '가볍게', '적당히', '묵직하게', '아주 묵직하게'])}</em></div>
        <p class="q-hint" style="margin-top:22px">${S.likes.length ? '좋아요 · ' + S.likes.slice(0, 4).join(', ') + (S.likes.length > 4 ? ' 외' : '') : '좋아요를 하나도 안 누르셨네요. 까다로운 입맛도 환영이에요.'}</p></div>
        <div class="foot"><button type="button" class="btn-text" id="fg-again">다시 하기</button><button type="button" class="btn-ink" id="fg-nx">다음 라운드 →</button></div>`);
      requestAnimationFrame(() => { const b = s2.querySelectorAll('.bar i'); b[0].style.width = (acid - 1) / 4 * 100 + '%'; b[1].style.width = (body - 1) / 4 * 100 + '%'; });
      s2.querySelector('#fg-nx').onclick = () => go(3);
      s2.querySelector('#fg-again').onclick = () => r2();
    }
    render();
  }

  /* ================= ROUND 3 직접 로스팅 ================= */
  // 진행도 p: 0 생두 → 1.0 다크 → 1.25 탄 맛. 생두 구간은 빠르게(2초), 맛이 갈리는 구간은 천천히(다크까지 11초 더)
  const PMAX = 1.08;
  const speedAt = (p) => p < 0.17 ? 0.17 / 2 : 0.83 / 11;
  const tempAt = (p) => 120 + 126 * (1 - Math.pow(1 - Math.min(p, 1.25) / 1.3, 1.7));
  function r3() {
    S.roast = null; S.roastClash = '';
    const W = 320, H = 150, X = (p) => (Math.min(p, PMAX) / PMAX) * W, Y = (t) => H - ((t - 110) / 140) * H;
    const bands = STAGES.slice(1, 6).map((st, i) => { const x0 = X(STAGES[i].to), x1 = X(st.to); return `<rect class="rb" data-i="${i}" x="${x0}" y="0" width="${x1 - x0}" height="${H}" fill="${STAGE_COL[i]}"/>`; }).join('');
    const zone = `<rect class="rz" x="${X(0.34)}" y="0" width="${X(0.80) - X(0.34)}" height="${H}"/>`;
    const el = screen(`<h3 class="q-title">원하는 만큼 직접 볶아 보세요</h3><p class="q-hint">버튼을 꾹 누르는 동안 볶아지고, 손을 떼는 순간 로스팅이 끝나요</p>
      <div class="roast">
        <div><div class="drum" id="fg-drum"><div class="smoke" id="fg-smoke"></div><div class="bean" id="fg-bean">${beanSvg(beanColor(0))}</div><div class="crack" id="fg-crack"></div><div class="temp" id="fg-temp">120°C</div></div></div>
        <div>
          <div class="note" id="fg-note"><small>GREEN BEAN</small><b>아직 생두예요. 꾹 눌러 볶아 보세요</b><em>볶을수록 맛이 어떻게 바뀌는지 아래에 보여 드려요</em></div>
          <div class="rc"><svg viewBox="0 0 ${W} ${H + 18}">
            <g class="rbs">${bands}</g>${S.fails >= 2 ? zone : ''}
            <line class="rk" x1="${X(CRACK1)}" x2="${X(CRACK1)}" y1="0" y2="${H}"/><line class="rk" x1="${X(CRACK2)}" x2="${X(CRACK2)}" y1="0" y2="${H}"/>
            <text class="rkt" x="${X(CRACK1) + 4}" y="13">1차 팝</text><text class="rkt" x="${X(CRACK2) + 4}" y="13">2차 팝</text>
            <path class="rl" id="fg-curve" d="M0 ${Y(120)}"/><circle class="rd" id="fg-dot" cx="0" cy="${Y(120)}" r="4"/>
            <text class="rax" x="0" y="${H + 14}">시간 →</text><text class="rax" x="${W}" y="${H + 14}" text-anchor="end">원두 온도 그래프</text>
          </svg></div>
          <div class="ladder">${STAGES.slice(1, 6).map((st, i) => `<div data-i="${i}" style="flex:${(st.to - STAGES[i].to).toFixed(2)}"><i style="background:${STAGE_COL[i]}"></i><b>${st.k.replace('MEDIUM ', 'M.')}</b><span>${st.w}</span></div>`).join('')}</div>
          <div id="fg-ctrl"><button type="button" class="hold" id="fg-hold">꾹 눌러서 볶기</button><div class="hold-sub" id="fg-hsub">PC는 스페이스바를 눌러도 돼요</div></div>
        </div>
      </div>`);
    const q = (id) => el.querySelector('#fg-' + id);
    const bean = q('bean'), note = q('note'), temp = q('temp'), crack = q('crack'), curve = q('curve'), dot = q('dot');
    const drum = q('drum'), smoke = q('smoke'), hold = q('hold');
    let p = 0, holding = false, raf = 0, last = 0, stageKey = 'GREEN', c1 = false, c2 = false, smoked = false;
    const pts = [[0, Y(120)]];
    const stageOf = (v) => STAGES.find((s) => v <= s.to);
    function paint() {
      bean.innerHTML = beanSvg(beanColor(Math.min(p, PMAX)));
      const tc = tempAt(p);
      temp.textContent = Math.round(tc) + '°C';
      const x = X(p), y = Y(tc);
      if (x - pts[pts.length - 1][0] > 1.5) pts.push([x, y]);
      curve.setAttribute('d', 'M' + pts.map((pt) => pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' L') + ` L${x.toFixed(1)} ${y.toFixed(1)}`);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      const s = stageOf(p), si = STAGES.indexOf(s) - 1;
      el.querySelectorAll('.ladder > div').forEach((d) => d.classList.toggle('on', +d.dataset.i === si));
      el.querySelectorAll('.rb').forEach((r) => r.classList.toggle('on', +r.dataset.i === si));
      if (p > 0.02 && s.k !== stageKey) {
        stageKey = s.k; note.classList.add('fade');
        setTimeout(() => { note.innerHTML = `<small>${s.k}</small><b>${s.like}</b><em>${s.n}</em>`; note.classList.remove('fade'); }, 160);
      }
      if (!c1 && p >= CRACK1) { c1 = true; pop('1차 팝 · 타닥'); }
      if (!c2 && p >= CRACK2) { c2 = true; pop('2차 팝 · 타닥타닥'); }
      if (!smoked && p > 1.0) { smoked = true; smoke.innerHTML = [-30, 10, 34, -8].map((dx, k) => `<i style="--dx:${dx}px;animation-delay:${k * .45}s"></i>`).join(''); }
    }
    function pop(t) { crack.textContent = t; crack.classList.remove('show'); void crack.offsetWidth; crack.classList.add('show'); bean.classList.remove('shake'); void bean.offsetWidth; bean.classList.add('shake'); }
    // 시간 기준으로 진행 (화면이 잠깐 가려져도 누른 시간만큼 정확히 볶인다)
    function tick() {
      if (!holding) return;
      const now = performance.now(); let dt = Math.min(1.5, (now - last) / 1000); last = now;
      while (dt > 0 && p < 1.25) { const step = Math.min(dt, 0.02); p = Math.min(1.25, p + step * speedAt(p)); dt -= step; }
      paint();
    }
    function start(e) { if (e && e.cancelable) e.preventDefault(); if (holding || S.roast) return; holding = true; last = performance.now(); hold.classList.add('on'); hold.textContent = '볶는 중… 손을 떼면 끝나요'; drum.classList.add('spin'); q('hsub').textContent = ''; raf = setInterval(tick, 16); }
    function stop() {
      if (!holding) return; tick(); holding = false; clearInterval(raf); hold.classList.remove('on'); drum.classList.remove('spin');
      const s = stageOf(p);
      if (p < 0.02) { hold.textContent = '꾹 눌러서 볶기'; return; }
      if (s.rs === 0) {
        S.fails++;
        q('ctrl').innerHTML = `<div class="lock"><small>UNDER ROASTED</small><div class="lock-row"><button type="button" class="btn-ink" id="fg-re">조금 더 볶아 볼까요?</button></div>${S.fails >= 2 ? '<div class="tip">로스터는 원래 타이밍 싸움이에요. 그래프의 민트색 구간에서 손을 떼 보세요.</div>' : ''}</div>`;
        q('re').onclick = () => r3();
        return;
      }
      if (s.k === 'BEYOND DARK') S.fails++;
      const key = s.k === 'BEYOND DARK' ? 'DARK' : s.k;
      const clash = roastClash(S.champ, s.rs);
      const done = (keep) => {
        S.roast = s.rs; S.roastKey = key; S.roastClash = keep ? clash : '';
        q('ctrl').innerHTML = `<div class="lock"><small>YOUR ROAST</small><b class="lock-k">${key}</b>
          ${s.k === 'BEYOND DARK' ? '<div class="tip">살짝 태웠지만 괜찮아요. 가장 진한 맛을 좋아하시는 걸로 기억할게요.</div>' : ''}
          ${keep ? `<div class="tip">좋아요, ${AN(S.champ)} 향과 ${key} 로스팅 사이에서 균형을 찾아 추천할게요.</div>` : ''}
          <div class="lock-row"><button type="button" class="btn-line" id="fg-re">다시 볶기</button><button type="button" class="btn-ink" id="fg-nx">다음 라운드 →</button></div></div>`;
        q('re').onclick = () => r3();
        q('nx').onclick = () => go(4);
      };
      if (!clash) return done(false);
      q('ctrl').innerHTML = `<div class="lock warn"><small>잠깐만요</small><b class="lock-k">${key}로 볶으셨네요</b><p>${clash}</p>
        <div class="lock-row"><button type="button" class="btn-ink" id="fg-re">다시 볶아 볼게요</button><button type="button" class="btn-line" id="fg-keep">이대로 갈게요</button></div></div>`;
      q('re').onclick = () => r3();
      q('keep').onclick = () => done(true);
    }
    hold.addEventListener('pointerdown', start);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => hold.addEventListener(t, stop));
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
    KEY.down = (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) start(); } };
    KEY.up = (e) => { if (e.code === 'Space') { e.preventDefault(); stop(); } };
  }

  /* ================= ROUND 4 장비 진열장 ================= */
  function r4() {
    S.gears = []; S.none = false;
    const el = screen(`<h3 class="q-title">우리 집 커피 장비를 담아 주세요</h3><p class="q-hint">있는 걸 모두 눌러 주세요 · 여러 개 골라도 돼요</p>
      <div class="shelf"><div class="shelf-row">${Object.entries(GEARS).map(([k, g]) => `<button type="button" class="gear" data-k="${k}"><svg viewBox="0 0 48 48">${g.i}</svg><b>${g.n}</b><small>${g.s}</small></button>`).join('')}</div>
      <button type="button" class="gear-none" id="fg-none">장비는 없어요, 주로 카페에서 사 마셔요</button></div>
      <div class="foot"><span></span><button type="button" class="btn-ink" id="fg-nx" disabled>다음 라운드 →</button></div>`);
    const nx = el.querySelector('#fg-nx'), none = el.querySelector('#fg-none');
    const sync = () => { nx.disabled = !(S.gears.length || S.none); };
    el.querySelectorAll('.gear').forEach((b) => b.onclick = () => {
      const k = b.dataset.k; b.classList.toggle('sel');
      S.gears = b.classList.contains('sel') ? [...S.gears, k] : S.gears.filter((x) => x !== k);
      S.none = false; none.classList.remove('sel'); sync();
    });
    none.onclick = () => { S.none = !S.none; none.classList.toggle('sel', S.none); if (S.none) { S.gears = []; el.querySelectorAll('.gear').forEach((g) => g.classList.remove('sel')); } sync(); };
    nx.onclick = () => go(5);
  }

  /* ================= FINAL 내 원두 뽑기 (질문 없이 결과를 여는 장면) ================= */
  // 손잡이를 반 바퀴 돌리면 캡슐이 떨어지고 → 크게 보이는 캡슐을 한 번 누르면 원두 카드 → 결과 화면
  // 시안: .review-inbox/gacha-reveal.html
  const GX_TURN = 180;
  function gxCapsule(cx, cy, r, col, rot = 0) {
    return `<g transform="rotate(${rot} ${cx} ${cy})">
      <path d="M${cx - r} ${cy}a${r} ${r} 0 0 1 ${2 * r} 0z" fill="${col}"/><path d="M${cx - r} ${cy}a${r} ${r} 0 0 0 ${2 * r} 0z" fill="#fff"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><rect x="${cx - r}" y="${cy - 1.6}" width="${2 * r}" height="3.2" fill="rgba(0,0,0,.18)"/>
      <ellipse cx="${cx - r * .35}" cy="${cy - r * .45}" rx="${r * .28}" ry="${r * .16}" fill="#fff" opacity=".6" transform="rotate(-30 ${cx - r * .35} ${cy - r * .45})"/></g>`;
  }
  function gxMachine() {
    const I = '#202020', M = '#AAD5DB';
    const cols = [M, '#8E5A33', '#E8D5B0', '#5c7f86', '#C9824F', '#202020', '#B5495B', M, '#8E5A33', '#E8D5B0', '#C9824F', M, '#5c7f86', '#8E5A33', '#E8D5B0'];
    const pos = [[110, 178], [148, 186], [188, 182], [224, 170], [96, 146], [134, 152], [172, 150], [210, 140], [242, 136], [118, 116], [156, 118], [196, 108], [138, 86], [178, 80], [228, 104]];
    const caps = pos.map(([x, y], i) => `<g class="cap">${gxCapsule(x, y, 17, cols[i], (i * 47) % 180)}</g>`).join('');
    return `<svg viewBox="0 0 320 470" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="fg-glass" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#bcd9de" stop-opacity=".45"/></radialGradient>
        <linearGradient id="fg-body" x1="0" x2="1"><stop offset="0" stop-color="#9fcdd4"/><stop offset=".45" stop-color="#bde0e5"/><stop offset="1" stop-color="#8fc1c9"/></linearGradient>
        <linearGradient id="fg-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafafa"/><stop offset="1" stop-color="#cfcfcf"/></linearGradient>
        <clipPath id="fg-dome"><circle cx="160" cy="136" r="106"/></clipPath>
        <clipPath id="fg-chute"><rect x="118" y="392" width="84" height="46" rx="6"/></clipPath>
      </defs>
      <ellipse cx="160" cy="462" rx="120" ry="7" fill="rgba(0,0,0,.08)"/>
      <rect x="132" y="14" width="56" height="16" rx="4" fill="${I}"/>
      <circle cx="160" cy="136" r="108" fill="#f4fafb" stroke="${I}" stroke-width="2"/>
      <g clip-path="url(#fg-dome)" class="gx-caps">${caps}</g>
      <circle cx="160" cy="136" r="106" fill="url(#fg-glass)"/>
      <path d="M86 92a90 90 0 0 1 60-52" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/>
      <path d="M80 118a90 90 0 0 1 3-12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>
      <rect x="98" y="232" width="124" height="22" rx="4" fill="${I}"/>
      <path d="M70 254h180l10 196H60z" fill="url(#fg-body)" stroke="${I}" stroke-width="2" stroke-linejoin="round"/>
      <rect x="96" y="262" width="128" height="18" rx="2" fill="#fff" stroke="${I}" stroke-width="1.2"/>
      <text x="160" y="275" text-anchor="middle" font-size="9" letter-spacing="2" font-family="Archivo, sans-serif" fill="${I}">STRETTO BEAN</text>
      <rect x="84" y="300" width="14" height="30" rx="3" fill="url(#fg-metal)" stroke="${I}" stroke-width="1.2"/><rect x="89" y="306" width="4" height="18" rx="1" fill="${I}"/>
      <circle cx="160" cy="318" r="44" fill="url(#fg-metal)" stroke="${I}" stroke-width="1.6"/>
      <circle class="gx-pulse" id="fg-gx-pulse" cx="160" cy="318" r="44" fill="none" stroke="${M}" stroke-width="5"/>
      <circle cx="160" cy="318" r="52" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="4"/>
      <circle class="gx-ring" id="fg-gx-ring" cx="160" cy="318" r="52" fill="none" stroke="${I}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 52}" stroke-dashoffset="${2 * Math.PI * 52}" transform="rotate(-90 160 318)"/>
      <g class="gx-handle" id="fg-gx-handle"><rect x="148" y="278" width="24" height="80" rx="12" fill="#fff" stroke="${I}" stroke-width="2"/><circle cx="160" cy="318" r="9" fill="${I}"/><rect x="154" y="282" width="12" height="14" rx="6" fill="${M}" stroke="${I}" stroke-width="1.2"/></g>
      <g id="fg-gx-arrow" opacity=".9"><path d="M214 290a62 62 0 0 1 6 52" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round"/><path d="M213 336l7 8 5-10" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="gx-hand" id="fg-gx-hand"><g transform="translate(150 246)"><circle cx="10" cy="10" r="13" fill="${I}" opacity=".12"/><path d="M6 22V8a3 3 0 0 1 6 0v8l1-1a3 3 0 0 1 5 2v1a3 3 0 0 1 5 1v1a3 3 0 0 1 5 2v5c0 7-5 12-12 12h-1c-4 0-7-2-9-5l-5-7a3 3 0 0 1 4-4z" fill="#fff" stroke="${I}" stroke-width="1.6" stroke-linejoin="round"/></g></g>
      <rect x="114" y="388" width="92" height="54" rx="8" fill="${I}"/><rect x="118" y="392" width="84" height="46" rx="6" fill="#333"/>
      <g clip-path="url(#fg-chute)"><g class="gx-out" id="fg-gx-out" style="display:none">${gxCapsule(160, 416, 19, '#8E5A33', -20)}</g></g>
      <path d="M118 392h84" stroke="#555" stroke-width="2"/>
    </svg>`;
  }
  // 딸깍 소리 + 짧은 진동 (돌리는 맛)
  let actx = null;
  function click(strong) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = strong ? 340 : 220 + Math.random() * 40;
      g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(strong ? .12 : .06, actx.currentTime + .005); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + .05);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .06);
    } catch (_) {}
    if (navigator.vibrate) try { navigator.vibrate(strong ? 25 : 6); } catch (_) {}
  }
  function r5() {
    const R = analyze();
    if (!R) { screen(`<div class="loading"><p class="q-hint">원두 정보를 불러오지 못했어요. 잠시 뒤 다시 해 주세요.</p></div>`); return; }
    const el = screen(`<div class="gx">
        <div class="gx-machine" id="fg-gx-m">${gxMachine()}</div>
        <div class="gx-side">
          <small>FINAL · 내 원두 뽑기</small>
          <h4 id="fg-gx-h">네 번의 결과를 캡슐에 담았어요</h4>
          <p id="fg-gx-p">손잡이를 잡고 화살표 방향으로 반 바퀴 돌려 주세요.</p>
          <ol class="gx-steps"><li class="on" data-s="0"><i>1</i>손잡이를 반 바퀴 돌리기</li><li data-s="1"><i>2</i>캡슐 열기</li><li data-s="2"><i>3</i>내 원두 확인</li></ol>
          <div class="gx-prog" id="fg-gx-prog"><div><i id="fg-gx-bar"></i></div><span id="fg-gx-pt">0%</span></div>
          <button type="button" class="gx-auto" id="fg-gx-auto">돌리기 어렵다면 · 대신 돌려 주세요</button>
        </div>
      </div>`);
    const q = (id) => el.querySelector('#fg-gx-' + id);
    const m = q('m'), svg = m.querySelector('svg'), handle = q('handle'), ring = q('ring');
    const C = 2 * Math.PI * 52;
    let total = 0, lastTick = 0, drag = null, done = false, idle;
    const caps = [...svg.querySelectorAll('.gx-caps g.cap')];
    const setStep = (n) => el.querySelectorAll('.gx-steps li').forEach((li) => { const s = +li.dataset.s; li.className = s < n ? 'done' : s === n ? 'on' : ''; });
    const hints = (on) => { q('hand').style.display = on ? '' : 'none'; q('pulse').style.display = on ? '' : 'none'; };
    const hintsLater = () => { clearTimeout(idle); idle = setTimeout(() => { if (!done && total < 20 && el.isConnected) hints(true); }, 2500); };
    function paint() {
      handle.style.transform = `rotate(${total}deg)`;
      ring.style.strokeDashoffset = C * (1 - Math.min(total, GX_TURN) / GX_TURN);
      q('bar').style.width = Math.min(100, total / GX_TURN * 100) + '%';
      q('pt').textContent = total < GX_TURN ? `${Math.round(total / GX_TURN * 100)}%` : '드르륵!';
      const step = Math.floor(total / 30);
      if (step > lastTick) {
        lastTick = step; click(false);
        m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
        caps.forEach((c) => { c.style.transform = `translate(${(Math.random() - .5) * 10}px, ${(Math.random() - .5) * 8 - 2}px) rotate(${(Math.random() - .5) * 30}deg)`; });
        if (step === 3) { q('h').textContent = '좋아요, 그대로 계속!'; q('p').textContent = '조금만 더 돌리면 캡슐이 나와요.'; }
      }
      if (total >= GX_TURN && !done) finish();
    }
    const center = () => { const r = svg.getBoundingClientRect(), s = r.width / 320; return { x: r.left + 160 * s, y: r.top + 318 * s, s }; };
    const angleAt = (e) => { const c = center(); return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; };
    const inKnob = (e) => { const c = center(); return Math.hypot(e.clientX - c.x, e.clientY - c.y) < 78 * c.s; };
    svg.addEventListener('pointerdown', (e) => { if (done || !inKnob(e)) return; drag = angleAt(e); try { svg.setPointerCapture(e.pointerId); } catch (_) {} hints(false); clearTimeout(idle); e.preventDefault(); });
    svg.addEventListener('pointermove', (e) => {
      if (drag === null || done) return;
      const a = angleAt(e); let d = a - drag; if (d > 180) d -= 360; if (d < -180) d += 360; drag = a;
      if (d > 0) { total += Math.min(d, 40); paint(); } // 시계 방향만 (라쳇: 뒤로는 안 돌아가요)
    });
    const up = () => { if (drag === null) return; drag = null; if (!done && total < GX_TURN) { if (total < 20) q('p').textContent = '손잡이를 누른 채로 동그랗게 원을 그리듯 돌려 주세요.'; hintsLater(); } };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    q('auto').onclick = () => {
      if (done) return; hints(false); clearTimeout(idle);
      const from = total, t0 = performance.now(), dur = 1000;
      const step = (now) => { const k = Math.min(1, (now - t0) / dur); total = from + (GX_TURN - from) * (1 - Math.pow(1 - k, 2)) + (k >= 1 ? 1 : 0); paint(); if (k < 1 && !done) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    function finish() {
      done = true; click(true);
      q('arrow').style.display = 'none'; q('auto').style.visibility = 'hidden';
      const pick = caps[1]; pick.style.transition = 'transform .5s ease-in, opacity .3s .2s'; pick.style.transform = 'translate(10px, 90px)'; pick.style.opacity = 0;
      setTimeout(() => {
        const out = q('out'); out.style.display = ''; out.classList.add('drop'); click(true);
        setStep(1); q('h').textContent = '캡슐이 나왔어요!'; q('p').textContent = ''; q('prog').style.display = 'none';
        setTimeout(() => { if (el.isConnected) openCap(); }, 1100); // 떨어진 캡슐을 누르지 않아도 바로 여는 화면으로
      }, 450);
    }
    function openCap() {
      setStep(2);
      const top = R.split ? null : R.ranked[0];
      const card = R.split
        ? `<div><small>YOUR BEANS</small><b>취향이 두 갈래예요</b>${R.split.map((x, i) => `<span class="gx-two">${'AB'[i]} · ${esc(x.b.name)}</span>`).join('')}<button type="button" class="btn-ink">결과 자세히 보기 →</button></div>`
        : `${top.b.img ? `<img src="${esc(top.b.img)}" alt="">` : ''}<div><small>YOUR BEAN</small><b>${esc(top.b.name)}</b><span>${esc(top.b.notes)}</span><span class="gx-pct">취향 일치 ${clamp(Math.round(top.s), 58, 98)}%</span><button type="button" class="btn-ink">결과 자세히 보기 →</button></div>`;
      const ov = document.createElement('div'); ov.className = 'gx-open';
      ov.innerHTML = `<div class="gx-big"><div class="gx-rays"></div>
        <svg viewBox="60 50 200 200"><g class="bot"><path d="M90 150a70 70 0 0 0 140 0z" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><path d="M98 150h124" stroke="rgba(0,0,0,.15)" stroke-width="3"/></g>
          <g class="top"><path d="M90 150a70 70 0 0 1 140 0z" fill="#8E5A33" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><rect x="90" y="146" width="140" height="6" fill="#AAD5DB"/><ellipse cx="135" cy="112" rx="18" ry="10" fill="#fff" opacity=".5" transform="rotate(-30 135 112)"/></g></svg>
        <span class="gx-tap">눌러서 열기</span>
        <div class="gx-card">${card}</div></div>`;
      ROOT.querySelector('.board').appendChild(ov);
      const big = ov.querySelector('.gx-big');
      big.addEventListener('pointerdown', () => { if (big.classList.contains('opened')) return; big.classList.add('opened'); click(true); }); // 누르는 순간 바로 열린다
      ov.querySelector('.gx-card button').onclick = (e) => { e.stopPropagation(); ov.remove(); go(6); };
    }
    paint(); hints(true); hintsLater();
  }

  /* ================= 추천 계산 (사이트 기존 방식과 같은 점수표) ================= */
  // o.noAroma / o.noRoast / o.noTaste: 서로 반대되는 선택이 있을 때 한쪽만 보고 계산 (각각에 어울리는 원두 추천용)
  function target(o = {}) {
    const ta = o.noTaste ? 0 : S.taste.a;
    const t = { acidity: clamp(3 + ta * 0.9, 1, 5), body: clamp(3 + S.taste.b * 0.9, 1, 5), sweetness: clamp(3 + S.taste.s * 0.9, 1, 5), roast: 3 };
    const A = AROMAS[S.champ].v, R = AROMAS[S.runner].v, f = o.noAroma ? 0 : (o.noRoast || o.noTaste ? 1.3 : 1);
    t.acidity += (A[0] + R[0] * 0.4) * f; t.body += (A[1] + R[1] * 0.4) * f; t.sweetness += (A[2] + R[2] * 0.4) * f; t.roast += (A[3] + R[3] * 0.4) * f;
    if (S.roast && !o.noRoast) { t.roast = t.roast * 0.25 + S.roast * 0.75; t.body += (S.roast - 3) * 0.3; t.acidity -= (S.roast - 3) * 0.3; }
    if (S.gears.length) { const v = [0, 0, 0]; S.gears.forEach((k) => GEARS[k].v.forEach((x, i) => v[i] += x / S.gears.length)); t.acidity += v[0]; t.body += v[1]; t.roast += v[2] * 0.4; }
    if (!o.noAroma && !o.noTaste && AROMAS[S.champ].bright && t.acidity <= 2.2) { t.acidity = 2.2; t.sweetness += 0.6; }
    ['acidity', 'body', 'sweetness', 'roast'].forEach((k) => t[k] = clamp(t[k], 1, 5));
    return t;
  }
  function score(p, t) {
    const pr = p.pr;
    let s = 100 - (Math.abs(pr.acidity - t.acidity) * 12 + Math.abs(pr.body - t.body) * 10 + Math.abs(pr.sweetness - t.sweetness) * 5 + Math.abs(pr.roastScore - t.roast) * (S.roast ? 11 : 8)); // 직접 볶은 정도는 조금 더 무겁게
    return s;
  }

  // 추천 결과 계산 (뽑기 카드와 결과 화면이 같이 쓴다)
  function analyze() {
    const t = target(), all = beans();
    const ranked = all.filter((b) => b.cat !== 'decaf').map((b) => ({ b, s: score(b, t) })).sort((x, y) => y.s - x.s);
    if (!ranked.length) return null;
    // 서로 반대되는 선택 → 한쪽씩 따로 계산해서 각각 어울리는 원두를 추천
    const tasteClash = !S.roastClash && AROMAS[S.champ].bright && S.taste.a < -0.6;
    const sides = S.roastClash ? [{ o: { noRoast: true }, k: `${AN(S.champ)} 향을 살리면` }, { o: { noAroma: true }, k: `${S.roastKey} 로스팅을 살리면` }]
      : tasteClash ? [{ o: { noTaste: true }, k: `${AN(S.champ)} 향을 살리면` }, { o: { noAroma: true }, k: '산미 적은 맛 취향을 살리면' }] : null;
    let split = null;
    if (sides) {
      const pick = (o, not) => all.filter((b) => b.cat !== 'decaf' && b !== not).map((b) => ({ b, s: score(b, target(o)) })).sort((x, y) => y.s - x.s)[0];
      const A = pick(sides[0].o), B = pick(sides[1].o, A.b);
      split = [{ ...A, k: sides[0].k }, { ...B, k: sides[1].k }];
    }
    return { t, all, ranked, split, tasteClash };
  }

  /* ================= 결과 ================= */
  const ROAST_NAME = ['', '라이트', '미디엄 라이트', '미디엄', '미디엄 다크', '다크'];
  function result() {
    S.round = 6; hud();
    const R = analyze();
    if (!R) { screen(`<div class="loading"><p class="q-hint">원두 정보를 불러오지 못했어요. 잠시 뒤 다시 해 주세요.</p></div>`); return; }
    const { t, all, ranked, split, tasteClash } = R;
    const top = ranked[0].b, pct = clamp(Math.round(ranked[0].s), 58, 98);
    const decaf = all.find((b) => b.cat === 'decaf');
    (() => {
      const pos = (v) => ((v - 1) / 4 * 100).toFixed(1) + '%';
      const row = (lbl, you, bean) => `<div class="cmp-row"><span>${lbl}</span><div class="cmp-track"><span class="you" style="left:${pos(you)}"></span><span class="bean" style="left:${pos(bean)}"></span></div></div>`;
      const why = [`우승 향미 <b style="color:#000;font-weight:500">${AN(S.champ)}</b>`, `직접 볶은 <b style="color:#000;font-weight:500">${S.roastKey}</b>`].join(' · ');
      const chips = top.notes.split(/[·,]/).map((n) => n.trim()).filter(Boolean).slice(0, 4).map((n) => `<span>${esc(n)}</span>`).join('');
      const W5 = (v, w) => w[clamp(Math.round(v), 1, 5) - 1];
      const acidW = W5(t.acidity, ['거의 없고', '은은하고', '적당하고', '산뜻하고', '화사하고']);
      const bodyW = W5(t.body, ['아주 가벼운', '가벼운', '적당한', '묵직한', '아주 묵직한']);
      const roastW = ROAST_NAME[clamp(Math.round(t.roast), 1, 5)];
      const conflict = S.roastClash ? `${AN(S.champ)} 향과 ${S.roastKey} 로스팅은 서로 반대 방향이에요. 어느 쪽이 더 끌리는지에 따라 맞는 원두가 달라서, 양쪽에 어울리는 원두를 하나씩 골랐어요.`
        : tasteClash ? `${AN(S.champ)} 향을 고르셨지만 맛 카드에서는 산미를 피하셨어요. 그래서 양쪽에 어울리는 원두를 하나씩 골랐어요.` : '';
      const rankPct = (r) => clamp(Math.round(r.s), 58, 98);
      const el = screen(`<div class="flip"><div class="flip-in">
        <div class="taste">
          <small>Your coffee taste</small>
          <h4>${split ? (S.roastClash ? `${esc(AN(S.champ))} · ${esc(AN(S.runner))} 향을 좋아하시는데, 직접 볶은 건 <b>${S.roastKey} 로스팅</b>이었어요` : `${esc(AN(S.champ))} · ${esc(AN(S.runner))} 향을 좋아하시는데, 맛은 <b>산미 적은 쪽</b>을 고르셨어요`) : `${esc(AN(S.champ))} · ${esc(AN(S.runner))} 향이 나고, 산미는 ${acidW} 바디는 ${bodyW} <b>${roastW} 로스팅</b> 커피가 잘 맞아요`}</h4>
          <div class="taste-row">
            <div><span>좋아하는 향</span><b>${esc(AN(S.champ))} · ${esc(AN(S.runner))}</b></div>
            <div><span>산미</span><b>${W5(t.acidity, ['거의 없이', '은은하게', '균형 있게', '산뜻하게', '화사하게'])}</b></div>
            <div><span>바디</span><b>${W5(t.body, ['아주 가볍게', '가볍게', '적당히', '묵직하게', '아주 묵직하게'])}</b></div>
            <div><span>로스팅</span><b>${roastW}</b></div>
          </div>
          ${conflict ? `<p class="taste-note">💡 ${esc(conflict)}</p>` : ''}
          <p class="taste-go">${split ? '취향이 두 갈래예요 · 끌리는 쪽을 골라 보세요 ↓' : '스트레토 원두 중에서 이 취향에 가까운 순서로 골랐어요 ↓'}</p>
        </div>
        ${split ? `<div class="split2">${split.map((x, i) => `<div class="sp">
            <div class="sp-img">${x.b.img ? `<img src="${esc(x.b.img)}" alt="">` : ''}<span>${'AB'[i]} · ${esc(x.k)}</span></div>
            <div class="sp-body"><div class="res-name">${esc(x.b.name)}</div><div class="res-sub">${esc(x.b.roast)}${x.b.price ? ` · ${won(x.b.price)}원 / 200g` : ''}</div>
              <div class="chips">${x.b.notes.split(/[·,]/).map((n) => n.trim()).filter(Boolean).slice(0, 4).map((n) => `<span>${esc(n)}</span>`).join('')}</div>
              <p class="res-desc">${esc(x.b.desc)}</p>
              <a class="btn-mint" href="${esc(x.b.link)}" target="_blank" rel="noopener">이 원두 보기</a></div></div>`).join('')}</div>
          <div class="res-cta sp-cta"><button type="button" class="btn-line" id="fg-share">결과 공유</button><button type="button" class="btn-text" id="fg-again" style="margin-left:auto">다시 하기</button></div>
          <p class="rank-t">두 취향을 함께 놓고 본 순위</p>
          <div class="rank">${ranked.slice(0, 3).map((r, k) => `<a href="${esc(r.b.link)}" target="_blank" rel="noopener"><em>${k + 1}위</em>${r.b.img ? `<img src="${esc(r.b.img)}" alt="">` : '<span></span>'}<div><b>${esc(r.b.name)}</b><span>${esc(r.b.notes)}</span></div><strong>${rankPct(r)}%</strong></a>`).join('')}</div>` : `
        <div class="res">
          <div class="res-img">${top.img ? `<img src="${esc(top.img)}" alt="${esc(top.name)}">` : ''}<span>1위 · BEST MATCH</span></div>
          <div class="res-body">
            <small>NO.1 YOUR BEAN</small>
            <div class="res-name">${esc(top.name)}</div>
            <div class="res-sub">${esc(top.roast)}${top.price ? ` · ${won(top.price)}원 / 200g` : ''}</div>
            <div class="chips">${chips}</div>
            <div class="match"><span>취향 일치</span><div><i id="fg-mt"></i></div><b>${pct}%</b></div>
            <div class="cmp">${row('산미', t.acidity, top.pr.acidity)}${row('바디', t.body, top.pr.body)}${row('단맛', t.sweetness, top.pr.sweetness)}${row('배전', t.roast, top.pr.roastScore)}
              <div class="cmp-legend"><span><i style="border:1.5px solid #202020"></i>내 취향</span><span><i style="background:#202020"></i>이 원두</span></div></div>
            <p class="res-desc">${esc(top.desc)}</p>
            <p class="res-why">${why}</p>
            <div class="res-cta"><a class="btn-mint" href="${esc(top.link)}" target="_blank" rel="noopener">이 원두 보기</a><button type="button" class="btn-line" id="fg-share">결과 공유</button><button type="button" class="btn-text" id="fg-again" style="margin-left:auto">다시 하기</button></div>
          </div>
        </div>
        <div class="rank">${ranked.slice(1, 3).map((r, k) => `<a href="${esc(r.b.link)}" target="_blank" rel="noopener"><em>${k + 2}위</em>${r.b.img ? `<img src="${esc(r.b.img)}" alt="">` : '<span></span>'}<div><b>${esc(r.b.name)}</b><span>${esc(r.b.notes)}</span><small>${k ? '색다르게 즐기고 싶을 때' : '1위와 함께 비교해 보기 좋은'}</small></div><strong>${rankPct(r)}%</strong></a>`).join('')}</div>`}
        ${decaf ? `<div class="decaf">늦은 밤에도 커피를 즐기신다면 · <a href="${esc(decaf.link)}" target="_blank" rel="noopener">${esc(decaf.name)}</a></div>` : ''}
      </div></div>`);
      requestAnimationFrame(() => setTimeout(() => { const m = el.querySelector('#fg-mt'); if (m) m.style.width = pct + '%'; }, 50));
      el.querySelector('#fg-again').onclick = () => { reset(); go(1); };
      el.querySelector('#fg-share').onclick = async () => {
        const text = split ? `나의 커피는 ${split[0].b.name} 아니면 ${split[1].b.name} · 스트레토 원두 찾기` : `나의 커피는 ${top.name} (취향 일치 ${pct}%) · 스트레토 원두 찾기`;
        const url = location.origin + '/beans';
        try { if (navigator.share) await navigator.share({ text, url }); else { await navigator.clipboard.writeText(text + ' ' + url); toast('결과를 복사했어요'); } } catch (_) {}
      };
    })();
  }

  /* ================= 시작 ================= */
  window.FG = {
    home() { if (SHELL) SHELL.style.display = 'none'; if (window.CG) window.CG.hide(); ROOT.style.display = ''; reset(); go(0, true); },
  };
  if (SHELL) SHELL.style.display = 'none';
  reset(); go(0, true);
})();
