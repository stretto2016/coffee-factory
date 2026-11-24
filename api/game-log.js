// api/game-log.js
// 원두 찾기 게임(개인 · 카페) 한 판의 기록을 사장님 구글 시트로 넘긴다 (2026-11-24)
// - 홈페이지는 이 주소로만 보내고, 구글 시트 주소와 비밀값은 Vercel 환경변수에만 둔다
//   (GAME_SHEET_URL = 시트의 Apps Script 웹 앱 주소, GAME_SHEET_SECRET = 시트 코드에 넣은 비밀값)
// - 지역은 Vercel 이 알려 주는 접속 위치(시 · 도, 도시)만 쓴다. IP 주소 같은 개인정보는 저장하지 않는다.
// - 환경변수가 없으면 아무것도 하지 않는다 (시트 연결 전에도 게임은 그대로 동작).

const KR_REGION = {
  '11': '서울', '26': '부산', '27': '대구', '28': '인천', '29': '광주', '30': '대전', '31': '울산',
  '50': '세종', '41': '경기', '42': '강원', '51': '강원', '43': '충북', '44': '충남',
  '45': '전북', '52': '전북', '46': '전남', '47': '경북', '48': '경남', '49': '제주',
};

function clean(v, max = 300) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function device(ua) {
  ua = String(ua || '');
  if (/iPad|Tablet|SM-T|Tab\b/i.test(ua)) return '태블릿';
  if (/Mobi|iPhone|Android/i.test(ua)) return '휴대폰';
  return 'PC';
}

function kst(ms) {
  const d = new Date(ms + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.GAME_SHEET_URL;
  const secret = process.env.GAME_SHEET_SECRET;
  if (!url || !secret) return res.status(204).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad body' });
  if (JSON.stringify(body).length > 8000) return res.status(413).json({ error: 'too large' });

  const game = body.game === '카페' ? '카페' : body.game === '개인' ? '개인' : null;
  if (!game) return res.status(400).json({ error: 'bad game' });

  const h = req.headers;
  const country = clean(h['x-vercel-ip-country'], 4);
  const regionCode = clean(h['x-vercel-ip-country-region'], 8);
  let city = '';
  try { city = clean(decodeURIComponent(h['x-vercel-ip-city'] || ''), 60); } catch (_) {}
  const region = country === 'KR' ? (KR_REGION[regionCode] || regionCode || '국내') : (country ? `해외 (${country})` : '');

  // 시트의 한 줄 — 앞쪽 칸은 두 게임이 같고, 뒤쪽은 게임마다 고른 내용
  const row = {
    '시간': kst(Date.now()),
    '사이트': process.env.VERCEL_ENV === 'production' ? '실제' : '미리보기',
    '끝까지': body.done ? 'O' : 'X',
    '마지막 단계': clean(body.round, 20),
    '걸린 시간(초)': Math.max(0, Math.min(3600, Math.round(Number(body.secs) || 0))),
    '지역': region,
    '도시': city,
    '기기': device(h['user-agent']),
  };
  const picks = body.picks && typeof body.picks === 'object' ? body.picks : {};
  Object.keys(picks).slice(0, 20).forEach((k) => { row[clean(k, 30)] = clean(picks[k]); });
  row['결과'] = clean(body.result, 300);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, sheet: game === '카페' ? '카페 · 사업자' : '개인 고객', row }),
      redirect: 'follow',
    });
    // 시트 코드는 비밀값이 틀리면 {ok:false} 로 답한다 → 실제로 한 줄이 들어갔는지까지 확인
    let ok = false;
    try { ok = r.ok && (await r.json()).ok === true; } catch (_) {}
    return res.status(ok ? 200 : 502).json({ ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
}
