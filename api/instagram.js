// api/instagram.js — 인스타그램 최신 게시물을 홈페이지 /instagram 바둑판에 보내 준다.
// 열쇠(INSTAGRAM_TOKEN)는 코드에 두지 않고 Vercel 환경변수에 둔다.
//  - 지금은 미리보기(Preview) 환경에만 넣는다. 실제 사이트(Production)에는 아직 없으므로 거기서는 503 → 화면은 자리표시 그대로.
//  - 열쇠 만들기: Meta 개발자 앱 → Instagram → "Instagram 로그인으로 API 설정" → 계정 추가 → 액세스 토큰 생성 (약 60일 유효)
export default async function handler(req, res) {
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return res.status(503).json({ error: 'not_connected' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 9, 24);
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  try {
    const r = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    if (!r.ok || j.error) {
      console.error('instagram error', j.error || r.status);
      return res.status(502).json({ error: 'instagram_failed' });
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
    console.error('instagram fetch failed', e);
    return res.status(502).json({ error: 'instagram_failed' });
  }
}
