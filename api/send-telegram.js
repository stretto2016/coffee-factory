// api/send-telegram.js
export default async function handler(req, res) {
  // 1. 보안 점검: POST 요청인지 확인
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body; // 프론트엔드에서 보낸 메시지 내용
  
  // 2. Vercel 비밀 금고에서 토큰 꺼내기
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 3. 서버에서 텔레그램으로 전송 (이 과정은 유저에게 안 보임)
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API Error');
    }

    // 4. 성공 결과 반환
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Telegram Error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
