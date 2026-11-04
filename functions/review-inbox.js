// 홈페이지 리뷰 모드(?review)에 남긴 수정 요청을 읽어 오는 도구 — 개발자(Claude)용.
// 아내분이 남긴 요청을 파일로 내보내 전달할 필요 없이, 여기서 바로 가져와 반영한다.
//
//   node review-inbox.js                 미리보기 사이트의 반영 안 된 요청을 받아 온다
//   node review-inbox.js --site live     실제 사이트(stretto.co.kr) 요청
//   node review-inbox.js --all           반영 완료된 것까지 모두
//   node review-inbox.js done <id> ...   반영한 요청을 "반영 완료"로 표시 (리뷰 화면에 ✓ 로 보인다)
//   node review-inbox.js reopen <id> ... 반영 완료 표시를 되돌린다
//
// 결과: 저장소 루트의 .review-inbox/inbox.md 와 .review-inbox/img/ (바꿀 사진 · 그림 캡처)
// 서비스 계정 키 필요: C:\roastery\serviceAccountKey.json
process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:\\roastery\\serviceAccountKey.json";

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const COL = "reviewComments";
const OUT = path.join(__dirname, "..", ".review-inbox");

const ROUTE_NAMES = {
  home: "메인 (/)", brand: "브랜드 스토리 (/brand)", beans: "원두 (/beans)",
  wholesale: "원두 납품 (/wholesale)", care: "머신 케어 (/care)", consulting: "창업 컨설팅 (/consulting)",
};
const KIND = { edit: "글자 고침", photo: "사진 교체", draw: "그림", memo: "메모" };

async function setStatus(ids, status) {
  for (const id of ids) {
    const ref = db.collection(COL).doc(id);
    await ref.update(status === "done"
      ? { status: "done", doneAt: admin.firestore.FieldValue.serverTimestamp() }
      : { status: admin.firestore.FieldValue.delete(), doneAt: admin.firestore.FieldValue.delete() });
    console.log(`${status === "done" ? "반영 완료" : "되돌림"}: ${id}`);
  }
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function inbox(site, all) {
  const snap = await db.collection(COL).get();
  const list = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => (c.site || "live") === site && (all || c.status !== "done"))
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

  fs.mkdirSync(path.join(OUT, "img"), { recursive: true });
  let md = `# 홈페이지 수정 요청 (${site === "live" ? "실제 사이트" : "미리보기"})\n\n`;
  md += `- 받아 온 시각: ${new Date().toLocaleString("ko-KR")}\n- ${list.length}건${all ? " (반영 완료 포함)" : ""}\n\n---\n\n`;

  for (const [i, c] of list.entries()) {
    const kind = c.kind || "memo";
    const st = c.style || {};
    const when = c.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";
    md += `## ${i + 1}. [${KIND[kind]}] ${c.sectionName || "기타"}${c.status === "done" ? " ✓반영 완료" : ""}\n\n`;
    md += `- **id**: \`${c.id}\`\n- **남긴 때**: ${when}\n`;
    md += `- **페이지**: ${ROUTE_NAMES[c.route] || c.route || c.page || "-"}\n`;
    md += `- **위치**: \`${c.selector || "-"}\` (${c.tagName || "-"})\n`;
    if (kind === "edit") {
      md += `- **원래 문구**:\n\n\`\`\`\n${c.origText || c.text}\n\`\`\`\n\n- **고친 문구**:\n\n\`\`\`\n${c.newText}\n\`\`\`\n\n`;
    } else if (c.text) {
      md += `- **${kind === "draw" ? "그림 근처 문구" : "현재 문구"}**: "${c.text}"\n`;
    }
    if (c.imgSrc) md += `- **지금 사진 파일**: ${c.imgSrc}\n`;
    for (const [key, label] of [["newImageUrl", "바꿀 사진"], ["imageUrl", "그림 캡처"]]) {
      if (!c[key]) continue;
      const file = path.join(OUT, "img", `${c.id}-${key === "imageUrl" ? "draw" : "photo"}.jpg`);
      try {
        if (!fs.existsSync(file)) await download(c[key], file);
        md += `- **${label}**: ${path.relative(path.join(__dirname, ".."), file).replace(/\\/g, "/")}\n`;
      } catch (e) {
        md += `- **${label}**: (내려받기 실패) ${c[key]}\n`;
      }
    }
    if (kind === "draw" && c.scrollY != null) md += `- **그린 화면**: 위에서 ${c.scrollY}px 스크롤, 화면 ${c.viewport}×${c.viewH}\n`;
    if (st.fontSize) md += `- **현재 스타일**: ${st.fontSize} / 굵기 ${st.fontWeight} / 줄간격 ${st.lineHeight} / 색 ${st.color} / 정렬 ${st.textAlign} / 여백 ${st.margin}\n`;
    md += `- **보던 화면**: ${c.device || "-"} (${c.viewport || "-"}px)\n`;
    const tags = (c.tags || []).filter((t) => !["문구 수정", "이미지 교체", "그림"].includes(t));
    if (tags.length) md += `- **요청**: ${tags.join(", ")}\n`;
    if (c.memo) md += `- **메모**: ${c.memo}\n`;
    md += "\n";
  }

  const file = path.join(OUT, "inbox.md");
  fs.writeFileSync(file, md, "utf8");
  console.log(`${list.length}건 → ${file}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "done" || args[0] === "reopen") {
    await setStatus(args.slice(1), args[0]);
    return;
  }
  const si = args.indexOf("--site");
  await inbox(si >= 0 ? args[si + 1] : "preview", args.includes("--all"));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
