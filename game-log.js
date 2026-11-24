/* 원두 찾기 게임 플레이 기록 (2026-11-24)
   한 판이 끝나거나 중간에 나가면, 고른 내용과 결과를 /api/game-log 로 보낸다 → 사장님 구글 시트에 한 줄.
   - 이름 · 연락처 · IP 같은 개인정보는 보내지 않는다 (지역은 서버가 시 · 도 정도만 붙인다)
   - 내 컴퓨터(localhost)에서 열었을 때는 보내지 않는다
   쓰는 법 (finder-game.js · cafe-game.js):
     GameLog.start('개인', () => ({ 향미: '…', … }))   ← 1라운드 시작. 두 번째 값은 지금까지 고른 내용을 돌려주는 함수
     GameLog.round(3)                                  ← 지금 몇 라운드인지
     GameLog.done('추천 결과 글')                       ← 결과 화면이 열렸을 때
     GameLog.quit()                                    ← 처음 화면으로 나갔을 때 (창을 닫을 때는 저절로) */
(function () {
  const OFF = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let cur = null;   // { game, t0, round, pick }

  function picks() {
    try { return (cur && cur.pick && cur.pick()) || {}; } catch (_) { return {}; }
  }
  function send(data, beacon) {
    if (OFF) return;
    const body = JSON.stringify(data);
    try {
      if (beacon && navigator.sendBeacon && navigator.sendBeacon('/api/game-log', new Blob([body], { type: 'application/json' }))) return;
      fetch('/api/game-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (_) {}
  }
  function payload(done, result) {
    return {
      game: cur.game, done, round: done ? '결과' : `${cur.round}라운드`,
      secs: Math.round((Date.now() - cur.t0) / 1000), picks: picks(), result: result || '',
    };
  }

  window.GameLog = {
    start(game, pick) { if (cur) this.quit(); cur = { game, t0: Date.now(), round: 1, pick }; },
    round(n) { if (cur) cur.round = n; },
    done(result) { if (!cur) return; send(payload(true, result)); cur = null; },
    quit(beacon) { if (!cur) return; send(payload(false, ''), beacon); cur = null; },
    _peek() { return cur ? payload(false, '') : null; },   // 확인용
  };
  // 창을 닫거나 다른 페이지로 갈 때: 하던 판이 있으면 '중간에 나감'으로 남긴다
  window.addEventListener('pagehide', () => window.GameLog.quit(true));
})();
