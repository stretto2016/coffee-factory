// api/instagram.js — 인스타그램 최신 게시물을 홈페이지 /instagram 바둑판에 보내 준다.
// 열쇠는 코드에 두지 않고 Vercel 환경변수에 둔다 (지금은 미리보기(Preview) 환경에만).
//   INSTAGRAM_TOKEN   (필수) 둘 중 아무거나:
//     ① 시스템 사용자 토큰 (EAA… 로 시작, 만료 없음) — Meta 비즈니스 설정 → 시스템 사용자 → 토큰 생성
//        권한: instagram_basic, pages_show_list, business_management / 자산: 페이스북 페이지 + 인스타그램 계정
//     ② Instagram 로그인 토큰 (IGAA… 로 시작, 약 60일) — 개발자 앱 → Instagram 로그인 API 설정 → 토큰 생성
//   INSTAGRAM_USER_ID (선택) ①일 때 인스타그램 비즈니스 계정 ID. 없으면 토큰으로 찾아 본다.
// 실제 사이트(Production)에는 열쇠가 없으므로 503 → 화면은 "게시물 준비 중" 그대로.
const GRAPH = 'https://graph.facebook.com/v21.0';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
let cachedUserId = null;

async function getJson(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(JSON.stringify(j.error || { status: r.status }));
  return j;
}

// 시스템 사용자 토큰으로 연결된 인스타그램 비즈니스 계정 ID 찾기
async function findUserId(token) {
  if (process.env.INSTAGRAM_USER_ID) return process.env.INSTAGRAM_USER_ID;
  if (cachedUserId) return cachedUserId;
  const t = encodeURIComponent(token);
  const pages = await getJson(`${GRAPH}/me/accounts?fields=name,instagram_business_account{id,username}&limit=50&access_token=${t}`);
  const accts = (pages.data || []).map((p) => p.instagram_business_account).filter(Boolean);
  const pick = accts.find((a) => a.username === 'coffee_stretto') || accts[0];
  if (!pick) throw new Error('no_instagram_account_linked');
  cachedUserId = pick.id;
  return cachedUserId;
}

export default async function handler(req, res) {
  const token = (process.env.INSTAGRAM_TOKEN || '').trim();
  if (!token) return res.status(503).json({ error: 'not_connected' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 9, 24);
  const t = encodeURIComponent(token);
  try {
    let j;
    if (token.startsWith('IG')) {
      j = await getJson(`https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${limit}&access_token=${t}`);
    } else {
      const uid = await findUserId(token);
      j = await getJson(`${GRAPH}/${uid}/media?fields=${FIELDS}&limit=${limit}&access_token=${t}`);
    }
    const posts = (j.data || []).map((p) => ({
      url: p.permalink,
      img: p.media_type === 'VIDEO' ? (p.thumbnail_url || p.media_url) : p.media_url,
      video: p.media_type === 'VIDEO',
      caption: (p.caption || '').slice(0, 200),
      at: p.timestamp,
    })).filter((p) => p.img && p.url);
    // 30분 동안은 Vercel 이 기억해 둔 결과를 쓴다 (인스타그램 호출 횟수 절약)
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    return res.status(200).json({ posts });
  } catch (e) {
    console.error('instagram failed', e.message);
    // 열쇠 문제를 미리보기에서 확인할 수 있게 사유만 짧게 (열쇠 값은 절대 내보내지 않음)
    return res.status(502).json({ error: 'instagram_failed', reason: String(e.message).slice(0, 300) });
  }
}
