// 실제 사이트(www.stretto.co.kr)가 지정한 커밋과 똑같은지 확인한다.
// 사용: node live-check.mjs <저장소 폴더> <커밋>   → 마지막 줄에 JSON {ok, ...}
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [repo, sha] = process.argv.slice(2);
const LIVE = 'https://www.stretto.co.kr';
const SITE_EXT = /\.(html|js|css|png|jpe?g|webp|gif|svg|ico|json|txt|xml|woff2?|ttf|otf|mp4|webm)$/i;
const SKIP = /^(functions\/|api\/|\.|scripts\/|tools\/|node_modules\/)|(^|\/)(package(-lock)?\.json|vercel\.json|firebase\.json|firestore\.rules|storage\.rules|README\.md)$/;

const git = (...a) => execFileSync('git', ['-C', repo, ...a], { maxBuffer: 1 << 28 });
const files = git('ls-tree', '-r', '--name-only', sha).toString().split('\n').filter((f) => f && SITE_EXT.test(f) && !SKIP.test(f));
const md5 = (b) => createHash('md5').update(b).digest('hex');

const bad = [];
let i = 0;
async function one(f) {
  const want = md5(git('show', `${sha}:${f}`));
  try {
    const r = await fetch(`${LIVE}/${f.split('/').map(encodeURIComponent).join('/')}`, { cache: 'no-store' });
    const got = md5(Buffer.from(await r.arrayBuffer()));
    if (!r.ok || got !== want) bad.push(`${f} (${r.status})`);
  } catch (e) { bad.push(`${f} (${e.message})`); }
}
async function worker() { while (i < files.length) await one(files[i++]); }
await Promise.all(Array.from({ length: 8 }, worker));

const routes = ['/', '/brand', '/beans', '/wholesale', '/care', '/consulting', '/education', '/faq', '/instagram', '/reviews'];
const routeBad = [];
for (const p of routes) {
  try { const r = await fetch(LIVE + p); if (r.status !== 200) routeBad.push(`${p} ${r.status}`); } catch (e) { routeBad.push(`${p} ${e.message}`); }
}
let insta = false, gameLog = 0;
try { const r = await fetch(LIVE + '/api/instagram'); insta = r.ok; } catch (_) {}
try {
  const r = await fetch(LIVE + '/api/game-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"game":"x"}' });
  gameLog = r.status; // 400 = 환경변수 살아 있음, 204 = 환경변수 없음
} catch (_) {}

const ok = bad.length === 0 && routeBad.length === 0 && insta && gameLog === 400;
console.log(JSON.stringify({ ok, files: files.length, bad, routeBad, insta, gameLog }));
