/* 원두 찾기 게임 — 카드·뽑기 디자인 모음 (시안 고르기 화면과 게임이 같이 쓴다)
   window.FD = { AROMA, SWIPE, aromaCard(style, key), swipeCard(style, item, idx), gacha[style](el, done), safe(el, done), choice(), setChoice() } */
(function () {
  const INK = '#202020';

  /* ───────── 향미 8종 ───────── */
  const AROMA = {
    berry:   { en: 'Berry',   ko: '베리',    d: '딸기 · 블루베리 · 체리',        bg: '#F6E3E4', c1: '#C4505E', c2: '#7E2F45', c3: '#F2B4BA' },
    citrus:  { en: 'Citrus',  ko: '시트러스', d: '레몬 · 오렌지 · 자몽',          bg: '#FBF0D9', c1: '#F0A93B', c2: '#E3C74A', c3: '#FFE3A3' },
    floral:  { en: 'Floral',  ko: '플로럴',  d: '자스민 · 아카시아 · 홍차',      bg: '#F3EFE6', c1: '#E9DFC6', c2: '#B8A77C', c3: '#FFFDF6' },
    wine:    { en: 'Wine',    ko: '와인',    d: '적포도 · 건자두 · 발효 과일',   bg: '#EFE1E4', c1: '#6E2236', c2: '#3D1220', c3: '#B65A6E' },
    caramel: { en: 'Caramel', ko: '캐러멜',  d: '흑설탕 · 꿀 · 메이플',          bg: '#F5E7D3', c1: '#C27C35', c2: '#8A4E1C', c3: '#E9B470' },
    choco:   { en: 'Chocolate', ko: '초콜릿', d: '밀크초콜릿 · 코코아 · 브라우니', bg: '#EDE3DC', c1: '#5B3626', c2: '#3A2117', c3: '#8B5E48' },
    nutty:   { en: 'Nutty',   ko: '너트',    d: '아몬드 · 마카다미아 · 구운 땅콩', bg: '#F2E9DE', c1: '#B98A5E', c2: '#7C5532', c3: '#E2C6A2' },
    smoky:   { en: 'Smoky',   ko: '스모키',  d: '카카오 닙 · 훈연 · 다크 로스트', bg: '#E4E1DF', c1: '#2B2522', c2: '#141110', c3: '#6D6560' },
  };
  const ORDER = ['berry', 'citrus', 'floral', 'wine', 'caramel', 'choco', 'nutty', 'smoky'];

  // 채색 일러스트 (120×120)
  const AI = {
    berry: `<path d="M44 36c6-5 14-4 18 1 4-5 12-6 18-1-2 6-8 8-12 8 3 3 4 7 2 10-3-3-6-4-8-4s-5 1-8 4c-2-3-1-7 2-10-4 0-10-2-12-8z" fill="#5E8C46"/>
      <path d="M60 46c16 0 26 10 24 26-2 18-14 32-24 34-10-2-22-16-24-34-2-16 8-26 24-26z" fill="#D2414F"/>
      <path d="M60 46c16 0 26 10 24 26-1 8-4 15-8 21 1-16-6-34-16-47z" fill="#A82E3D" opacity=".55"/>
      <g fill="#F8D9A0">${[[50,62],[62,58],[72,64],[46,76],[58,72],[70,78],[52,90],[64,88],[58,100]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4"/>`).join('')}</g>
      <circle cx="26" cy="86" r="11" fill="#3E4E8C"/><circle cx="26" cy="86" r="11" fill="url(#bbS)"/><path d="M22 79l4 3 4-3" stroke="#22305E" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="96" cy="94" r="9" fill="#46579A"/><path d="M93 89l3 2.5 3-2.5" stroke="#22305E" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M92 40c-6 8-8 18-7 28" stroke="#5E7A3A" stroke-width="2" fill="none"/><circle cx="85" cy="74" r="8" fill="#8E1E2E"/><circle cx="82" cy="71" r="2.2" fill="#fff" opacity=".5"/>`,
    citrus: `<circle cx="66" cy="62" r="38" fill="#F2A33A"/><circle cx="66" cy="62" r="33" fill="#FFE0A6"/>
      <g fill="#F7B54C">${Array.from({length:10},(_,i)=>{const a=i*36*Math.PI/180,b=(i*36+30)*Math.PI/180;return `<path d="M66 62L${(66+30*Math.cos(a)).toFixed(1)} ${(62+30*Math.sin(a)).toFixed(1)}A30 30 0 0 1 ${(66+30*Math.cos(b)).toFixed(1)} ${(62+30*Math.sin(b)).toFixed(1)}z"/>`}).join('')}</g>
      <circle cx="66" cy="62" r="4" fill="#FFF3D9"/>
      <path d="M18 104c4-20 22-32 40-30l-6 30z" fill="#E8D04B"/><path d="M24 102c4-14 16-23 30-23l-4 23z" fill="#FAF1B0"/>
      <g stroke="#E8D04B" stroke-width="1.5"><path d="M50 102l-12-14M50 102l-3-20M50 102l-20-6"/></g>`,
    floral: `<g transform="translate(60 56)">${Array.from({length:5},(_,i)=>`<ellipse rx="13" ry="26" cy="-22" fill="#FFFDF5" stroke="#E2D6B8" stroke-width="1.2" transform="rotate(${i*72})"/>`).join('')}<circle r="9" fill="#F2C94C"/><circle r="4" fill="#E0A82E"/></g>
      <g transform="translate(92 92) scale(.55)">${Array.from({length:5},(_,i)=>`<ellipse rx="13" ry="26" cy="-22" fill="#F6EEDB" stroke="#E2D6B8" stroke-width="1.6" transform="rotate(${i*72+20})"/>`).join('')}<circle r="9" fill="#F2C94C"/></g>
      <path d="M28 108c6-18 18-26 32-30" stroke="#6F8F4E" stroke-width="2.4" fill="none"/><path d="M34 96c-10-2-16 4-18 10 8 2 14-2 18-10z" fill="#7FA35A"/><path d="M44 86c2-10 10-14 16-14-1 8-8 13-16 14z" fill="#8DB466"/>`,
    wine: `<path d="M40 22h40c0 26-6 42-20 42S40 48 40 22z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <path d="M41.5 34h37c-1.5 18-8 28-18.5 28S43 52 41.5 34z" fill="#7A1E33"/><path d="M47 38c1 9 4 15 8 18" stroke="#fff" stroke-width="2" opacity=".35" fill="none" stroke-linecap="round"/>
      <path d="M60 64v28M46 96h28" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
      <g fill="#5A2A6E">${[[88,70],[98,70],[93,79],[83,79],[103,79],[88,88],[98,88],[93,97]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g>
      <g fill="#fff" opacity=".35">${[[86,68],[96,68],[91,77]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>
      <path d="M93 64c0-6 3-9 7-10" stroke="#5E7A3A" stroke-width="2" fill="none"/><path d="M98 56c6-4 12-2 14 2-6 3-10 2-14-2z" fill="#7FA35A"/>`,
    caramel: `<path d="M18 18h84v10c-4 0-6 4-6 10s-3 10-7 10-7-6-7-12-2-8-6-8-5 6-5 16-3 18-8 18-8-10-8-20-2-14-6-14-5 4-5 10-3 9-6 9-6-5-6-11-3-8-6-8V18z" fill="#C2772E"/>
      <path d="M18 18h84v4H18z" fill="#A55F1E"/><path d="M28 32c2 0 3 2 3 5M58 30c2 0 3 3 3 8" stroke="#E7AE68" stroke-width="2" stroke-linecap="round" fill="none"/>
      <g><rect x="26" y="78" width="30" height="26" rx="3" fill="#D9934A"/><path d="M26 81l30 0" stroke="#F0C084" stroke-width="2"/><rect x="26" y="78" width="30" height="26" rx="3" fill="none" stroke="#A55F1E" stroke-width="1.4"/></g>
      <g transform="rotate(-10 80 90)"><rect x="64" y="76" width="30" height="26" rx="3" fill="#C9813A"/><path d="M64 79h30" stroke="#EDB878" stroke-width="2"/><rect x="64" y="76" width="30" height="26" rx="3" fill="none" stroke="#9A561B" stroke-width="1.4"/></g>`,
    choco: `<g transform="rotate(-12 60 62)"><rect x="24" y="24" width="72" height="80" rx="4" fill="#4A2A1C"/>
      ${[0,1,2].map(r=>[0,1].map(c=>`<rect x="${30+c*33}" y="${30+r*24}" width="27" height="18" rx="2" fill="#5E3726"/><path d="M${31+c*33} ${31+r*24}h25" stroke="#7A4A35" stroke-width="2"/>`).join('')).join('')}
      <path d="M24 92l12-6 10 8 12-7 12 8 12-6 14 5v14H24z" fill="#fff"/></g>
      <path d="M78 96l14-4 6 10-10 10-12-4z" fill="#5E3726"/><path d="M80 98l10-3" stroke="#7A4A35" stroke-width="2"/>
      <path d="M100 30c4 6 4 10 0 14M108 26c4 6 4 12-1 18" stroke="#C9B8AE" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    nutty: `<path d="M48 22c18 6 26 26 22 48-3 18-14 30-22 30S28 88 26 70c-3-22 4-42 22-48z" fill="#C08A55"/>
      <path d="M48 22c18 6 26 26 22 48-1 8-4 15-8 20 4-26-2-50-14-68z" fill="#9E6D3E"/>
      <g stroke="#9E6D3E" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M40 40c-2 10-2 24 1 36M50 34c2 12 2 30-1 46M36 60c1 8 2 14 5 20"/></g>
      <circle cx="88" cy="84" r="20" fill="#9A6236"/><path d="M68 80c4-12 16-18 26-14 8 3 13 10 13 16-10-6-24-8-39-2z" fill="#6E4122"/>
      <path d="M80 92c4 4 10 5 16 2" stroke="#C78E5B" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="96" cy="68" r="2" fill="#4E2C14"/>`,
    smoky: `<g fill="none" stroke="#9A938E" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M46 56c-8-8 6-12-2-21s4-13 0-21"/><path d="M62 52c8-8-4-12 4-21s-2-13 2-21"/><path d="M78 58c6-7-3-11 3-18"/></g>
      ${[[40,86,-28,'#2B211C'],[66,92,18,'#1E1714'],[88,80,-8,'#33271F'],[56,72,40,'#3A2C23']].map(([x,y,r,c])=>`<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="12" ry="16" fill="${c}"/><ellipse rx="12" ry="16" fill="url(#bnS)"/><path d="M1-14c-5 6 4 10-1 14s-4 9 1 14" stroke="#0d0a08" stroke-width="2" fill="none" stroke-linecap="round"/></g>`).join('')}`,
  };
  // 선 그림 (같은 소재, 라벨·컬러 필드용)
  const AL = {
    berry: '<path d="M60 44c16 0 26 10 24 26-2 18-14 32-24 34-10-2-22-16-24-34-2-16 8-26 24-26z"/><path d="M46 38c6-4 10-3 14 2 4-5 8-6 14-2M60 40v-8"/><path d="M50 62v1M62 58v1M72 64v1M46 76v1M58 72v1M70 78v1M52 90v1M64 88v1"/><circle cx="24" cy="88" r="9"/><circle cx="98" cy="92" r="8"/>',
    citrus: '<circle cx="60" cy="60" r="36"/><circle cx="60" cy="60" r="30"/><path d="M60 60V30M60 60l28 9M60 60l17 24M60 60L43 84M60 60L32 69M60 60l17-24M60 60L43 36"/>',
    floral: '<g transform="translate(60 58)">' + Array.from({ length: 5 }, (_, i) => `<ellipse rx="12" ry="25" cy="-21" transform="rotate(${i * 72})"/>`).join('') + '<circle r="7"/></g><path d="M40 108c4-12 10-18 18-22"/>',
    wine: '<path d="M40 20h40c0 26-6 42-20 42S40 46 40 20z"/><path d="M42 32h36"/><path d="M60 62v30M46 96h28"/><circle cx="92" cy="76" r="5"/><circle cx="102" cy="76" r="5"/><circle cx="97" cy="85" r="5"/>',
    caramel: '<g transform="rotate(-12 60 60)"><rect x="36" y="44" width="48" height="32" rx="9"/><path d="M36 52l-18-10v36l18-10M84 52l18-10v36l-18-10"/><path d="M24 46l6 14-6 14M96 46l-6 14 6 14"/><path d="M46 56c6-3 22-3 28 0M46 64c6 3 22 3 28 0"/></g><path d="M40 96c4 0 6 4 6 8M58 92c3 0 5 4 5 10"/>',
    choco: '<g transform="rotate(-10 60 60)"><path d="M30 22h60v62l-8 4-8-6-8 6-8-5-8 6-8-4-12 4z"/><path d="M30 42h60M30 62h60M50 22v62M70 22v62"/></g><path d="M74 96l12-5 6 9-8 9-11-3z"/>',
    nutty: '<path d="M46 20c18 6 26 26 22 48-3 18-14 30-22 30S26 86 24 68c-3-22 4-42 22-48z"/><path d="M40 40c-2 10-2 24 1 36M50 34c2 12 2 30-1 46"/><circle cx="88" cy="84" r="18"/><path d="M70 80c4-10 14-16 24-12"/>',
    smoky: '<path d="M34 88c0-12 12-20 26-20s26 8 26 20-12 18-26 18-26-6-26-18z"/><path d="M60 70c-4 6 4 12 0 18s-4 10 0 14"/><path d="M48 58c-8-8 6-12-2-22s4-14 0-22M66 56c8-8-4-12 4-22s-2-14 2-22"/>',
  };
  const DEFS = `<defs><radialGradient id="bnS" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="bbS" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const illus = (k, set = AI) => `<svg viewBox="0 0 120 120" class="fd-ill">${DEFS}${set[k]}</svg>`;
  const line = (k, color = INK, w = 1.6) => `<svg viewBox="0 0 120 120" class="fd-line" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${AL[k]}</svg>`;
  const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

  function aromaCard(style, k) {
    const A = AROMA[k], no = String(ORDER.indexOf(k) + 1).padStart(2, '0');
    if (style === 'label') return `<div class="fd-a fd-a-label"><div class="fd-frame"><div class="fd-top"><span>No.${no}</span><span>AROMA</span></div>
      <div class="fd-art">${line(k)}</div><div class="fd-name"><b>${A.en}</b><span>${A.ko}</span></div><small>${A.d}</small></div></div>`;
    if (style === 'field') { const light = k === 'citrus' || k === 'floral';
    return `<div class="fd-a fd-a-field${light ? ' fd-light' : ''}" style="--c1:${A.c1};--c2:${A.c2};--c3:${A.c3}"><div class="fd-grain"></div>
      <div class="fd-art">${line(k, light ? 'rgba(40,30,15,.85)' : 'rgba(255,255,255,.92)', 1.3)}</div><div class="fd-txt"><span class="fd-no">No.${no}</span><b>${A.en}</b><span>${A.ko} · ${A.d}</span></div></div>`; }
    return `<div class="fd-a fd-a-illus" style="--bg:${A.bg}"><div class="fd-art">${illus(k)}</div><div class="fd-txt"><b>${A.ko}</b><span>${A.en}</span><small>${A.d}</small></div></div>`;
  }

  /* ───────── 맛 스와이프 8장 ───────── */
  const SWIPE = [
    { k: 'lemon',   ko: '레몬에이드',     en: 'Lemonade',          d: '새콤 · 상큼',      bg: '#F6EDB4', deep: '#E2C33D', a: 1.0 },
    { k: 'dark',    ko: '다크초콜릿 70%', en: 'Dark Chocolate',    d: '쌉쌀 · 진함',      bg: '#E9DDD5', deep: '#4A2A1C', b: 0.8, a: -0.3 },
    { k: 'grapefruit', ko: '자몽 주스',   en: 'Grapefruit',        d: '쌉싸름한 새콤함',  bg: '#F8DDD3', deep: '#E0644E', a: 0.8 },
    { k: 'stout',   ko: '흑맥주',         en: 'Stout',             d: '묵직 · 고소',      bg: '#E5DFDA', deep: '#2A1E19', b: 1.0 },
    { k: 'wine',    ko: '레드와인',       en: 'Red Wine',          d: '떫은 과일 향',     bg: '#EEDDE2', deep: '#6E1F33', a: 0.4, b: 0.4 },
    { k: 'tea',     ko: '녹차',           en: 'Green Tea',         d: '가볍고 맑음',      bg: '#E3EBD6', deep: '#6E8F3E', b: -0.8 },
    { k: 'brulee',  ko: '크렘 브륄레',    en: 'Crème Brûlée',      d: '캐러멜 · 달콤',    bg: '#F6E6C9', deep: '#B9792E', s: 0.8, b: 0.3 },
    { k: 'yogurt',  ko: '플레인 요거트',  en: 'Plain Yogurt',      d: '부드러운 신맛',    bg: '#F1EEE7', deep: '#9AA3B5', a: 0.6, b: -0.2 },
  ];
  const SI = {
    lemon: `<path d="M38 30h44l-6 74H44z" fill="#fff" stroke="${INK}" stroke-width="1.6"/><path d="M40 46h40l-4.6 56H44.6z" fill="#F5DD5B"/>
      <rect x="47" y="52" width="13" height="13" rx="2" fill="#fff" opacity=".7" transform="rotate(12 53 58)"/><rect x="62" y="66" width="12" height="12" rx="2" fill="#fff" opacity=".6" transform="rotate(-10 68 72)"/>
      <circle cx="56" cy="88" r="2.4" fill="#fff" opacity=".7"/><circle cx="66" cy="94" r="1.8" fill="#fff" opacity=".7"/>
      <path d="M70 12l-6 80" stroke="#E36A5A" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="82" cy="32" r="14" fill="#F2C744"/><circle cx="82" cy="32" r="11" fill="#FBEBA0"/><g stroke="#F2C744" stroke-width="1.4">${[0,45,90,135].map(a=>`<path d="M82 32l${(10*Math.cos(a*Math.PI/180)).toFixed(1)} ${(10*Math.sin(a*Math.PI/180)).toFixed(1)}M82 32l${(-10*Math.cos(a*Math.PI/180)).toFixed(1)} ${(-10*Math.sin(a*Math.PI/180)).toFixed(1)}"/>`).join('')}</g>`,
    dark: `<g transform="rotate(-8 60 64)"><rect x="30" y="20" width="60" height="86" rx="4" fill="#3E2318"/>${[0,1,2,3].map(r=>[0,1].map(c=>`<rect x="${35+c*26}" y="${26+r*19}" width="22" height="15" rx="2" fill="#53301F"/><path d="M${36+c*26} ${27+r*19}h20" stroke="#6E432E" stroke-width="1.8"/>`).join('')).join('')}
      <path d="M30 70h60v36H30z" fill="#C9CDD2"/><path d="M30 70l10 6 10-6 10 6 10-6 10 6 10-6" fill="none" stroke="#9EA4AB" stroke-width="1.4"/><path d="M30 84h60v22H30z" fill="${INK}"/><text x="60" y="99" font-size="9" fill="#fff" text-anchor="middle" font-family="Archivo,sans-serif" letter-spacing="1.5">70%</text></g>`,
    grapefruit: `<circle cx="60" cy="64" r="40" fill="#F08A4B"/><circle cx="60" cy="64" r="35" fill="#FFF0E6"/><circle cx="60" cy="64" r="32" fill="#EE6A5B"/>
      <g stroke="#FFD9CF" stroke-width="2.2">${Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;return `<path d="M60 64L${(60+32*Math.cos(a)).toFixed(1)} ${(64+32*Math.sin(a)).toFixed(1)}"/>`}).join('')}</g>
      <circle cx="60" cy="64" r="5" fill="#FFE3DA"/><g fill="#fff" opacity=".35">${[[48,52],[72,58],[58,82],[44,72]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="2.4" ry="4"/>`).join('')}</g>`,
    stout: `<path d="M36 22h48l-5 84H41z" fill="#fff" stroke="${INK}" stroke-width="1.6"/><path d="M38 40h44l-4.2 64H42.2z" fill="#2A1C16"/>
      <path d="M37 24h46l-1 16H38z" fill="#EFE3CF"/><path d="M36 26c4-8 12-8 16-3 4-6 12-6 16 0 4-5 12-4 16 3" fill="#F6EDDE" stroke="#E2D2B8" stroke-width="1.2"/>
      <path d="M44 48l2 50" stroke="#fff" stroke-width="2.4" opacity=".18" stroke-linecap="round"/>
      <g fill="#8A6A55">${[[52,60],[66,74],[58,88],[70,54]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`,
    wine: `<path d="M38 18h44c0 30-7 46-22 46S38 48 38 18z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <path d="M39.6 32h40.8c-1.6 20-9 30-20.4 30S41.2 52 39.6 32z" fill="#7A1E33"/><path d="M46 36c1 10 4 16 9 20" stroke="#fff" stroke-width="2.2" opacity=".35" fill="none" stroke-linecap="round"/>
      <path d="M60 64v32M44 100h32" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
    tea: `<path d="M22 56h76c0 28-16 46-38 46S22 84 22 56z" fill="#EDE7DA" stroke="${INK}" stroke-width="1.6"/>
      <ellipse cx="60" cy="56" rx="38" ry="9" fill="#8DB25A" stroke="${INK}" stroke-width="1.6"/><ellipse cx="60" cy="55" rx="30" ry="5" fill="#A7C878"/>
      <path d="M40 80c8 6 32 6 40 0" stroke="#D8CFBC" stroke-width="2" fill="none"/>
      <g transform="translate(86 14) rotate(28)"><rect x="-3" y="0" width="6" height="26" rx="2" fill="#C9A66B"/><path d="M-9 26c0 14 4 22 9 22s9-8 9-22z" fill="#E7D3A8" stroke="#B79358" stroke-width="1.2"/><path d="M-5 28v16M0 28v18M5 28v16" stroke="#B79358" stroke-width="1"/></g>
      <path d="M48 40c-2-6 2-8 0-14M62 38c-2-6 2-8 0-14" stroke="#C4C4C4" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    brulee: `<ellipse cx="60" cy="84" rx="44" ry="14" fill="#E9E4DA"/><path d="M18 62h84v20c0 8-19 14-42 14s-42-6-42-14z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <path d="M18 66v14M30 68v16M42 69v17M54 69v17M66 69v17M78 69v17M90 68v16M102 66v14" stroke="#E6E1D6" stroke-width="1.4"/>
      <ellipse cx="60" cy="62" rx="42" ry="12" fill="#C98B3C" stroke="${INK}" stroke-width="1.6"/><ellipse cx="60" cy="61" rx="34" ry="8" fill="#DDA052"/>
      <path d="M40 58l10 4 6-5 8 6 10-4M56 57l-2 8" stroke="#8F5A20" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M78 22l-14 34" stroke="#B9B9B9" stroke-width="3.4" stroke-linecap="round"/><ellipse cx="82" cy="18" rx="6" ry="8" fill="#D4D4D4" transform="rotate(22 82 18)"/>`,
    yogurt: `<path d="M20 52h80c0 30-18 50-40 50S20 82 20 52z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <ellipse cx="60" cy="52" rx="40" ry="10" fill="#FBFAF6" stroke="${INK}" stroke-width="1.6"/>
      <path d="M38 50c10-8 34-8 44 0-8 6-34 6-44 0z" fill="#fff" stroke="#E4E0D6" stroke-width="1.2"/><path d="M52 48c4-3 12-3 16 0" stroke="#E4E0D6" stroke-width="1.4" fill="none"/>
      <circle cx="74" cy="47" r="3.4" fill="#5E6DA8"/><circle cx="80" cy="50" r="3" fill="#4A5A96"/><circle cx="46" cy="49" r="3" fill="#D2414F"/>
      <path d="M92 18l-18 32" stroke="#C9C9C9" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="95" cy="14" rx="5" ry="7" fill="#DADADA" transform="rotate(30 95 14)"/>`,
  };
  const sill = (k) => `<svg viewBox="0 0 120 120" class="fd-ill">${SI[k]}</svg>`;

  function swipeCard(style, it, i) {
    const no = String(i + 1).padStart(2, '0');
    if (style === 'poster') return `<div class="fd-s fd-s-poster" style="--bg:${it.bg};--deep:${it.deep}"><div class="fd-big">${sill(it.k)}</div>
      <div class="fd-txt"><span class="fd-no">${no} / 08</span><b>${it.ko}</b><span>${it.en} — ${it.d}</span></div></div>`;
    if (style === 'label') return `<div class="fd-s fd-s-label"><div class="fd-frame"><div class="fd-top"><span>No.${no}</span><span>TASTE</span></div>
      <div class="fd-art">${sill(it.k)}</div><div class="fd-name"><b>${it.ko}</b><span>${it.en}</span></div><small>${it.d}</small></div></div>`;
    return `<div class="fd-s fd-s-illus" style="--bg:${it.bg}"><div class="fd-art">${sill(it.k)}</div><div class="fd-txt"><span class="fd-no">${no}</span><b>${it.ko}</b><small>${it.d}</small></div></div>`;
  }

  /* ───────── 스타일 ───────── */
  const CSS = `
  .fd-a, .fd-s { position: relative; width: 100%; height: 100%; overflow: hidden; text-align: left; font-family: inherit; color: #000; }
  .fd-ill, .fd-line { display: block; width: 100%; height: 100%; }
  /* 라벨 */
  .fd-a-label, .fd-s-label { background: #F7F3EA; padding: 10px; }
  .fd-frame { height: 100%; border: 1px solid #D9CFBA; outline: 1px solid #D9CFBA; outline-offset: -5px; padding: 16px 18px; display: flex; flex-direction: column; }
  .fd-top { display: flex; justify-content: space-between; font-size: 10.5px; letter-spacing: .2em; color: #8C8170; }
  .fd-a-label .fd-art, .fd-s-label .fd-art { flex: 1; min-height: 0; display: grid; place-items: center; padding: 8px 0; }
  .fd-a-label .fd-art svg, .fd-s-label .fd-art svg { width: auto; height: 100%; max-height: 150px; aspect-ratio: 1; }
  .fd-name { display: flex; align-items: baseline; gap: 10px; border-top: 1px solid #D9CFBA; padding-top: 12px; }
  .fd-name b { font-size: 24px; font-weight: 500; letter-spacing: .02em; }
  .fd-name span { font-size: 14px; color: #5f574a; }
  .fd-frame > small { font-size: 12px; color: #8C8170; margin-top: 6px; }
  /* 컬러 필드 */
  .fd-a-field { background: radial-gradient(120% 90% at 15% 10%, var(--c3) 0%, transparent 55%), radial-gradient(90% 90% at 90% 100%, var(--c2) 0%, transparent 60%), var(--c1); color: #fff; }
  .fd-grain { position: absolute; inset: 0; background-image: ${GRAIN}; mix-blend-mode: overlay; opacity: .55; pointer-events: none; }
  .fd-a-field .fd-art { position: absolute; right: 8%; top: 8%; width: 46%; aspect-ratio: 1; }
  .fd-a-field .fd-txt { position: absolute; left: 22px; right: 22px; bottom: 20px; }
  .fd-a-field .fd-no { font-size: 10.5px; letter-spacing: .22em; opacity: .8; }
  .fd-a-field b { display: block; font-size: 36px; font-weight: 500; line-height: 1.05; margin: 6px 0 8px; letter-spacing: .01em; }
  .fd-a-field span { font-size: 12.5px; opacity: .88; }
  .fd-a-field.fd-light { color: #2a2418; }
  /* 일러스트 */
  .fd-a-illus { background: var(--bg); display: flex; flex-direction: column; }
  .fd-a-illus .fd-art { flex: 1; min-height: 0; display: grid; place-items: center; padding: 14px 0 4px; }
  .fd-a-illus .fd-art svg { height: 100%; width: auto; max-height: 170px; aspect-ratio: 1; filter: drop-shadow(0 6px 10px rgba(0,0,0,.08)); }
  .fd-a-illus .fd-txt { background: #fff; padding: 14px 18px 16px; }
  .fd-a-illus b { font-size: 20px; font-weight: 500; }
  .fd-a-illus .fd-txt span { font-size: 12px; letter-spacing: .14em; color: #999; margin-left: 8px; text-transform: uppercase; }
  .fd-a-illus small { display: block; font-size: 12.5px; color: #818080; margin-top: 4px; }
  /* 스와이프: 포스터 */
  .fd-s-poster { background: var(--bg); }
  .fd-s-poster .fd-big { position: absolute; width: 118%; aspect-ratio: 1; right: -28%; top: -16%; opacity: .96; }
  .fd-s-poster::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 50%; background: linear-gradient(to bottom, transparent, var(--bg) 58%); }
  .fd-s-poster .fd-txt { position: absolute; left: 22px; right: 22px; bottom: 22px; z-index: 2; }
  .fd-s-poster .fd-no { font-size: 11px; letter-spacing: .2em; color: var(--deep); }
  .fd-s-poster b { display: block; font-size: 32px; font-weight: 700; line-height: 1.15; margin: 6px 0 6px; letter-spacing: -.01em; }
  .fd-s-poster .fd-txt > span:last-child { font-size: 13px; color: #4a4a4a; }
  /* 스와이프: 일러스트 */
  .fd-s-illus { background: var(--bg); display: flex; flex-direction: column; }
  .fd-s-illus .fd-art { flex: 1; min-height: 0; display: grid; place-items: center; padding: 18px 0 0; }
  .fd-s-illus .fd-art svg { height: 100%; width: auto; max-height: 190px; aspect-ratio: 1; filter: drop-shadow(0 8px 12px rgba(0,0,0,.1)); }
  .fd-s-illus .fd-txt { padding: 16px 22px 22px; }
  .fd-s-illus .fd-no { font-size: 11px; letter-spacing: .2em; color: #8a8a8a; }
  .fd-s-illus b { display: block; font-size: 26px; font-weight: 500; margin: 4px 0 2px; }
  .fd-s-illus small { font-size: 13px; color: #5a5a5a; }

  /* ── 뽑기 공통 ── */
  .fd-g { display: flex; flex-direction: column; align-items: center; gap: 18px; user-select: none; -webkit-user-select: none; }
  .fd-g-hint { font-size: 13px; color: #818080; letter-spacing: .02em; min-height: 20px; text-align: center; }
  .fd-slip { text-align: center; animation: fdIn .5s cubic-bezier(.16,1,.3,1); }
  .fd-slip small { font-size: 11.5px; letter-spacing: .22em; color: #818080; }
  .fd-slip b { display: block; font-size: 22px; font-weight: 500; margin-top: 8px; }
  .fd-slip span { display: block; font-size: 13px; color: #5a5a5a; margin-top: 6px; }
  @keyframes fdIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  /* 캡슐 기계 */
  .fd-mc { position: relative; width: 240px; height: 420px; }
  .fd-mc::after { content: ''; position: absolute; left: 50%; top: 404px; width: 120px; height: 10px; margin-left: -60px; border-radius: 50%; background: radial-gradient(rgba(0,0,0,.14), transparent 70%); }
  .fd-mc svg { width: 240px; height: 360px; overflow: visible; }
  .fd-mc #fdKnob { transform-origin: 120px 262px; transition: transform 1.1s cubic-bezier(.45,.05,.3,1); cursor: pointer; }
  .fd-mc.turned #fdKnob { transform: rotate(360deg); }
  .fd-mc .fd-caps { transform-origin: 120px 110px; }
  .fd-mc.turning .fd-caps { animation: fdRattle .14s linear infinite alternate; }
  @keyframes fdRattle { from { transform: translate(-2px, 1px) rotate(-2deg); } to { transform: translate(2px, -2px) rotate(2deg); } }
  .fd-cap { position: absolute; left: 50%; top: 300px; width: 54px; height: 54px; margin-left: -27px; opacity: 0; cursor: pointer; }
  .fd-cap.drop { animation: fdDrop .9s cubic-bezier(.3,1.5,.5,1) forwards; }
  @keyframes fdDrop { 0% { opacity: 0; transform: translateY(-30px) scale(.7); } 40% { opacity: 1; } 100% { opacity: 1; transform: translateY(56px) rotate(200deg); } }
  .fd-cap .top, .fd-cap .bot { position: absolute; left: 0; width: 54px; height: 27px; transition: transform .6s cubic-bezier(.3,1.4,.5,1), opacity .5s; }
  .fd-cap .top { top: 0; border-radius: 27px 27px 0 0; background: radial-gradient(circle at 35% 30%, #fff 0 8%, transparent 9%), linear-gradient(#C5E6EA, #8FC4CC); border: 1.5px solid #202020; border-bottom: 0; }
  .fd-cap .bot { top: 27px; border-radius: 0 0 27px 27px; background: #fff; border: 1.5px solid #202020; border-top: 1px solid #202020; }
  .fd-cap.open .top { transform: translate(-30px, -36px) rotate(-40deg); opacity: 0; }
  .fd-cap.open .bot { transform: translate(24px, 30px) rotate(30deg); opacity: 0; }
  .fd-cap.wiggle { animation: fdWig 1s ease-in-out infinite; }
  @keyframes fdWig { 0%, 100% { transform: translateY(56px) rotate(200deg); } 50% { transform: translateY(51px) rotate(212deg); } }
  /* 슬롯머신 */
  .fd-sl { position: relative; width: 320px; padding: 22px 54px 26px 22px; }
  .fd-sl-body { background: #202020; border-radius: 18px; padding: 18px 16px 20px; box-shadow: inset 0 0 0 3px #AAD5DB; position: relative; }
  .fd-sl-title { text-align: center; color: #AAD5DB; font-size: 12px; letter-spacing: .32em; margin-bottom: 12px; }
  .fd-bulbs { position: absolute; inset: 6px; pointer-events: none; }
  .fd-bulbs i { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #F6E7A8; box-shadow: 0 0 6px #F6E7A8; }
  .fd-sl.spin .fd-bulbs i { animation: fdBlink .3s steps(2) infinite; }
  .fd-sl.spin .fd-bulbs i:nth-child(2n) { animation-delay: .15s; }
  @keyframes fdBlink { 50% { opacity: .2; } }
  .fd-reels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #111; padding: 8px; border-radius: 10px; }
  .fd-reel { height: 92px; overflow: hidden; background: #FBF8F1; border-radius: 6px; position: relative; box-shadow: inset 0 10px 12px -8px rgba(0,0,0,.35), inset 0 -10px 12px -8px rgba(0,0,0,.35); }
  .fd-strip { position: absolute; left: 0; right: 0; top: 0; }
  .fd-strip div { height: 92px; display: grid; place-items: center; }
  .fd-strip svg { width: 58px; height: 58px; }
  .fd-lever { position: absolute; right: 8px; top: 40px; width: 40px; height: 150px; cursor: pointer; }
  .fd-lever .rod { position: absolute; left: 17px; top: 18px; width: 6px; height: 104px; background: linear-gradient(90deg, #bbb, #eee, #999); border-radius: 3px; transform-origin: 50% 100%; transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
  .fd-lever .ball { position: absolute; left: 6px; top: 0; width: 28px; height: 28px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff 0 10%, #E8584F 12%, #A92E2A 100%); transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
  .fd-lever .base { position: absolute; left: 8px; bottom: 16px; width: 24px; height: 18px; background: #202020; border-radius: 4px; }
  .fd-sl.pulled .fd-lever .rod { transform: scaleY(-.55); }
  .fd-sl.pulled .fd-lever .ball { transform: translateY(150px); }
  .fd-pay { margin-top: 12px; height: 10px; background: #111; border-radius: 0 0 8px 8px; }
  /* 스크래치 */
  .fd-sc { position: relative; width: 300px; height: 190px; border-radius: 12px; overflow: hidden; background: #F7F3EA; border: 1px solid #D9CFBA; touch-action: none; }
  .fd-sc-under { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 16px; }
  .fd-sc-under small { font-size: 11px; letter-spacing: .24em; color: #8C8170; }
  .fd-sc-under b { font-size: 24px; font-weight: 500; margin: 8px 0 4px; }
  .fd-sc-under span { font-size: 12.5px; color: #5a5a5a; }
  .fd-sc canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; transition: opacity .6s; }
  .fd-sc.done canvas { opacity: 0; pointer-events: none; }
  /* 단골 도장 (안심 모드) */
  .fd-st { width: 300px; background: #F7F3EA; border: 1px solid #D9CFBA; padding: 18px 20px 22px; }
  .fd-st-head { display: flex; justify-content: space-between; font-size: 10.5px; letter-spacing: .2em; color: #8C8170; margin-bottom: 14px; }
  .fd-st-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .fd-st-grid i { aspect-ratio: 1; border-radius: 50%; border: 1px dashed #C9BEA7; display: grid; place-items: center; }
  .fd-st-grid i.on { border: 0; }
  .fd-st-grid i svg { width: 76%; height: 76%; }
  .fd-st-grid i.last { cursor: pointer; border: 1.5px solid #202020; animation: fdPulse 1.2s ease-in-out infinite; }
  @keyframes fdPulse { 50% { transform: scale(1.08); } }
  .fd-st-grid i.stamp svg { animation: fdStamp .45s cubic-bezier(.3,1.8,.5,1); }
  @keyframes fdStamp { from { transform: scale(2.2) rotate(-20deg); opacity: 0; } to { transform: none; opacity: 1; } }
  `;
  if (!document.getElementById('fd-css')) { const st = document.createElement('style'); st.id = 'fd-css'; st.textContent = CSS; document.head.appendChild(st); }

  /* ───────── 뽑기 3종 ───────── */
  const slip = (el) => { el.insertAdjacentHTML('beforeend', `<div class="fd-slip"><small>ADVENTURE MODE ON</small><b>개성 있는 싱글 오리진에 가산점!</b><span>처음 만나는 맛을 추천해 드릴게요</span></div>`); };

  function machine(el, done) {
    const capCols = [['#C4505E', '#fff'], ['#F0A93B', '#fff'], ['#AAD5DB', '#fff'], ['#5B3626', '#fff'], ['#E9DFC6', '#fff'], ['#6E2236', '#fff'], ['#B98A5E', '#fff']];
    const pos = [[72, 150], [102, 160], [134, 158], [164, 150], [86, 126], [118, 132], [150, 124], [100, 100], [136, 102], [70, 106], [168, 112], [120, 76], [88, 168], [150, 172]];
    const caps = pos.map(([x, y], i) => { const [a, b] = capCols[i % capCols.length]; const r = (i * 47) % 360; return `<g transform="translate(${x} ${y}) rotate(${r})"><circle r="15" fill="${b}" stroke="#202020" stroke-width="1.2"/><path d="M-15 0a15 15 0 0 1 30 0z" fill="${a}" stroke="#202020" stroke-width="1.2"/><circle cx="-5" cy="-7" r="2.4" fill="#fff" opacity=".7"/></g>`; }).join('');
    el.innerHTML = `<div class="fd-g"><div class="fd-mc" id="fdMc"><svg viewBox="0 0 240 360">
      <defs><radialGradient id="fdGlass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".6" stop-color="#EAF5F7" stop-opacity=".5"/><stop offset="1" stop-color="#CFE6EA" stop-opacity=".7"/></radialGradient><clipPath id="fdDome"><circle cx="120" cy="112" r="92"/></clipPath></defs>
      <rect x="62" y="194" width="116" height="16" rx="3" fill="#202020"/>
      <circle cx="120" cy="112" r="94" fill="#F7FBFC" stroke="#202020" stroke-width="2"/>
      <g clip-path="url(#fdDome)"><g class="fd-caps">${caps}</g></g>
      <circle cx="120" cy="112" r="94" fill="url(#fdGlass)" stroke="#202020" stroke-width="2"/>
      <path d="M58 70c10-22 30-36 52-40" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".85"/><path d="M52 92c1-6 3-11 5-15" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>
      <rect x="112" y="10" width="16" height="10" rx="2" fill="#202020"/>
      <path d="M50 210h140l10 112c0 6-4 10-10 10H40c-6 0-10-4-10-10z" fill="#AAD5DB" stroke="#202020" stroke-width="2"/>
      <path d="M44 226h152" stroke="#202020" stroke-width="1" opacity=".25"/>
      <text x="120" y="224" text-anchor="middle" font-size="9" letter-spacing="3" fill="#08191c" font-family="Archivo,sans-serif">STRETTO</text>
      <rect x="160" y="240" width="18" height="30" rx="3" fill="#fff" stroke="#202020" stroke-width="1.5"/><rect x="167" y="245" width="4" height="20" rx="1" fill="#202020"/>
      <rect x="88" y="294" width="64" height="30" rx="6" fill="#fff" stroke="#202020" stroke-width="2"/><rect x="96" y="300" width="48" height="18" rx="4" fill="#202020"/>
      <rect x="38" y="332" width="30" height="10" rx="2" fill="#202020"/><rect x="172" y="332" width="30" height="10" rx="2" fill="#202020"/>
      <g id="fdKnob"><circle cx="120" cy="262" r="24" fill="#fff" stroke="#202020" stroke-width="2"/><rect x="104" y="257" width="32" height="10" rx="5" fill="#202020"/><circle cx="120" cy="262" r="4" fill="#AAD5DB"/></g>
    </svg><div class="fd-cap" id="fdCap"><span class="top"></span><span class="bot"></span></div></div>
    <div class="fd-g-hint" id="fdHint">손잡이를 눌러 돌려 주세요</div></div>`;
    const mc = el.querySelector('#fdMc'), hint = el.querySelector('#fdHint'), cap = el.querySelector('#fdCap');
    let step = 0;
    el.querySelector('#fdKnob').addEventListener('click', () => {
      if (step) return; step = 1; hint.textContent = '드르륵…';
      mc.classList.add('turning', 'turned');
      setTimeout(() => { mc.classList.remove('turning'); cap.classList.add('drop'); }, 1150);
      setTimeout(() => { cap.classList.remove('drop'); cap.style.opacity = 1; cap.style.transform = 'translateY(56px) rotate(200deg)'; cap.classList.add('wiggle'); hint.textContent = '캡슐을 눌러 열어 보세요'; step = 2; }, 2050);
    });
    cap.addEventListener('click', () => {
      if (step !== 2) return; step = 3; cap.classList.remove('wiggle'); cap.classList.add('open'); hint.textContent = '';
      setTimeout(() => { slip(el.querySelector('.fd-g')); done && done(); }, 450);
    });
  }

  function slot(el, done) {
    const icons = ['berry', 'citrus', 'choco', 'nutty', 'floral', 'wine', 'caramel'];
    const bean = `<svg viewBox="0 0 40 50"><ellipse cx="20" cy="25" rx="15" ry="20" fill="#6B3F24"/><path d="M21 7c-6 8 4 14-1 18s-5 12 1 18" fill="none" stroke="#2A1A10" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    const strip = (seed) => { const arr = []; for (let i = 0; i < 18; i++) arr.push(`<div>${illus(icons[(i + seed) % icons.length])}</div>`); arr.push(`<div>${bean}</div>`); return arr.join(''); };
    const bulbs = Array.from({ length: 14 }, (_, i) => { const t = i / 14; const x = t < .5 ? 4 + t * 2 * 92 : 96 - (t - .5) * 2 * 92; const y = t < .5 ? 2 : 96; return `<i style="left:${x}%;top:${y}%"></i>`; }).join('');
    el.innerHTML = `<div class="fd-g"><div class="fd-sl" id="fdSl"><div class="fd-sl-body"><div class="fd-bulbs">${bulbs}</div><div class="fd-sl-title">STRETTO · LUCKY ROAST</div>
      <div class="fd-reels">${[0, 3, 5].map((s) => `<div class="fd-reel"><div class="fd-strip">${strip(s)}</div></div>`).join('')}</div><div class="fd-pay"></div></div>
      <div class="fd-lever" id="fdLever"><span class="rod"></span><span class="ball"></span><span class="base"></span></div></div>
      <div class="fd-g-hint" id="fdHint">오른쪽 레버를 당겨 주세요</div></div>`;
    const sl = el.querySelector('#fdSl'), hint = el.querySelector('#fdHint');
    const strips = [...el.querySelectorAll('.fd-strip')];
    let used = false;
    el.querySelector('#fdLever').addEventListener('click', () => {
      if (used) return; used = true; sl.classList.add('pulled', 'spin'); hint.textContent = '';
      setTimeout(() => sl.classList.remove('pulled'), 380);
      strips.forEach((s, i) => {
        const end = -(18 * 92);
        s.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${end - 30}px)`, offset: .92 }, { transform: `translateY(${end}px)` }],
          { duration: 1400 + i * 520, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'forwards' });
      });
      setTimeout(() => { sl.classList.remove('spin'); hint.textContent = 'JACKPOT · 원두 세 개!'; slip(el.querySelector('.fd-g')); done && done(); }, 1400 + 2 * 520 + 200);
    });
  }

  function scratch(el, done) {
    el.innerHTML = `<div class="fd-g"><div class="fd-sc" id="fdSc"><div class="fd-sc-under"><div style="width:62px;height:62px">${illus('floral')}</div><small>ADVENTURE MODE ON</small><b>모험 모드 당첨!</b><span>개성 있는 싱글 오리진에 가산점</span></div><canvas></canvas></div>
      <div class="fd-g-hint" id="fdHint">은색 부분을 문질러 긁어 보세요</div></div>`;
    const box = el.querySelector('#fdSc'), cv = box.querySelector('canvas'), hint = el.querySelector('#fdHint');
    const dpr = window.devicePixelRatio || 1, W = 300, H = 190;
    cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#CFCFCF'); grd.addColorStop(.45, '#EDEDED'); grd.addColorStop(.55, '#BDBDBD'); grd.addColorStop(1, '#D9D9D9');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 900; i++) g.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    g.fillStyle = '#6b6b6b'; g.font = '500 13px Archivo, sans-serif'; g.textAlign = 'center'; g.fillText('S T R E T T O   L U C K Y', W / 2, H / 2 - 6); g.font = '12px "Noto Sans KR", sans-serif'; g.fillText('여기를 긁어 보세요', W / 2, H / 2 + 16);
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 36;
    let down = false, last = null, finished = false, moves = 0;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const check = () => { const d = g.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, n = 0; for (let i = 3; i < d.length; i += 16 * 4) { n++; if (d[i] < 40) clear++; } if (clear / n > .5 && !finished) { finished = true; box.classList.add('done'); hint.textContent = ''; done && done(); } };
    cv.addEventListener('pointerdown', (e) => { down = true; last = pt(e); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!down) return; const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; if (++moves % 8 === 0) check(); });
    const up = () => { down = false; check(); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  function safe(el, done) {
    const bean = (c) => `<svg viewBox="0 0 40 50"><ellipse cx="20" cy="25" rx="15" ry="20" fill="${c}"/><path d="M21 7c-6 8 4 14-1 18s-5 12 1 18" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    el.innerHTML = `<div class="fd-g"><div class="fd-st"><div class="fd-st-head"><span>STRETTO REGULAR</span><span>단골 쿠폰</span></div>
      <div class="fd-st-grid">${Array.from({ length: 10 }, (_, i) => i < 9 ? `<i class="on">${bean('#8E5A33')}</i>` : `<i class="last" id="fdLast"></i>`).join('')}</div></div>
      <div class="fd-g-hint" id="fdHint">마지막 칸을 눌러 도장을 찍어 주세요</div></div>`;
    const last = el.querySelector('#fdLast');
    last.addEventListener('click', () => {
      if (last.classList.contains('stamp')) return;
      last.className = 'on stamp'; last.innerHTML = bean('#202020'); el.querySelector('#fdHint').textContent = '';
      setTimeout(() => { el.querySelector('.fd-g').insertAdjacentHTML('beforeend', `<div class="fd-slip"><small>SAFE MODE</small><b>믿고 마시는 단골의 한 잔</b><span>익숙하고 균형 잡힌 원두로 추천해 드릴게요</span></div>`); done && done(); }, 380);
    });
  }

  /* ───────── 선택 저장 ───────── */
  const KEY = 'strettoFinderDesign';
  const DEFAULT = { aroma: 'illus', swipe: 'illus', gacha: 'machine' };
  function choice() { try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) { return Object.assign({}, DEFAULT); } }
  function setChoice(part, v) { const c = choice(); c[part] = v; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (_) {} return c; }

  window.FD = { AROMA, ORDER, SWIPE, aromaCard, swipeCard, illus, gacha: { machine, slot, scratch }, safe, choice, setChoice };
})();
