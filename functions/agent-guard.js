#!/usr/bin/env node
/* 리뷰 도우미 안의 Claude가 쓰는 vercel / firebase 명령 문지기.
   review-agent.js 가 시작할 때 C:\stretto-agent\bin 에 복사하고, 그 폴더를 Claude 의 PATH 맨 앞에 둔다.
   원칙: 미리보기(preview)·확인용 명령은 통과, 실제 사이트(production)나 공용 서버 설정을 바꾸는 명령은 막는다.
   - vercel: 프로덕션 배포·승격·도메인·삭제·프로덕션 환경변수 금지. 미리보기 환경변수·조회·미리보기 배포는 허용.
   - firebase: 규칙·함수·DB 는 실제 사이트와 같이 쓰므로 deploy·삭제·설정 변경 금지. 조회·로컬 에뮬레이터만 허용. */
const { spawnSync } = require("child_process");
const path = require("path");

const NPM = path.join(process.env.APPDATA || "C:\\Users\\shpar\\AppData\\Roaming", "npm");
const REAL = { vercel: path.join(NPM, "vercel.cmd"), firebase: path.join(NPM, "firebase.cmd") };

const tool = process.argv[2];
const args = process.argv.slice(3);
const low = args.map((a) => String(a).toLowerCase());
const sub = low.find((a) => !a.startsWith("-")) || "";

function block(why) {
  console.error(`[막힘] ${tool} ${args.join(" ")}\n이유: ${why}\n실제 사이트(stretto.co.kr)에 영향을 주는 명령은 사장님이 직접 하셔야 해요. 미리보기에서 할 수 있는 방법을 찾아 주세요.`);
  process.exit(1);
}

if (tool === "vercel") {
  if (low.some((a) => a === "--prod" || a.startsWith("--prod=") || a === "--production" || a.includes("production") || a === "prod" || a === "prd"))
    block("프로덕션(실제 사이트) 대상 명령");
  const target = low.findIndex((a) => a === "--target" || a === "-t");
  if (target >= 0 && low[target + 1] && !["preview", "development"].includes(low[target + 1])) block("preview/development 외의 대상");
  const deny = ["promote", "rollback", "alias", "aliases", "domains", "domain", "dns", "certs", "cert", "remove", "rm",
    "redeploy", "teams", "team", "switch", "login", "logout", "git", "integration", "integrations", "billing",
    "transfer", "project", "projects", "api", "blob", "redirects", "rolling-release", "microfrontends", "webhooks"];
  if (deny.includes(sub)) {
    // 프로젝트 목록 조회만은 허용
    if (!((sub === "project" || sub === "projects") && ["ls", "list"].includes(low[low.indexOf(sub) + 1] || ""))) block(`'${sub}' 명령은 실제 사이트·계정 설정을 바꿀 수 있음`);
  }
  if (sub === "env") {
    const op = low[low.indexOf("env") + 1] || "";
    if (["add", "rm", "remove", "update"].includes(op)) {
      const rest = low.slice(low.indexOf("env") + 2).filter((a) => !a.startsWith("-"));
      if (!rest.some((a) => a === "preview" || a === "development")) block("환경변수는 preview 또는 development 를 꼭 적어야 함 (production 금지)");
    }
  }
} else if (tool === "firebase") {
  const allow = ["", "help", "projects:list", "apps:list", "functions:list", "functions:log", "firestore:indexes",
    "emulators:start", "emulators:exec", "serve", "open", "login:list", "use"];
  if (low.includes("--version") || low.includes("-v") || low.includes("--help") || low.includes("-h")) { /* 통과 */ }
  else if (!allow.includes(sub) || (sub === "use" && low.length > 1)) block("Firebase 규칙·함수·DB 는 실제 사이트와 같이 써서, 배포·삭제·설정 변경은 실제 사이트에 바로 영향을 줌");
} else {
  block("알 수 없는 도구");
}

const q = (a) => (/^[\w@%+=:,./\\-]+$/.test(a) ? a : `"${String(a).replace(/"/g, '\\"')}"`);
const r = spawnSync(`"${REAL[tool]}" ${args.map(q).join(" ")}`, { stdio: "inherit", shell: true, windowsHide: true });
process.exit(r.status == null ? 1 : r.status);
