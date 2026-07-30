// publicProducts 수동 백필 — Eventarc 트리거 전파 지연 시 또는 로직 변경 후 사용.
// 배포된 syncAllPublicProducts와 동일하게 index.js의 buildPublicDoc/isPublishable을 재사용한다.
// 실행: node backfill.js  (서비스 계정 키 필요: C:\roastery\serviceAccountKey.json)
process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:\\roastery\\serviceAccountKey.json";

const { _buildPublicDoc, _isPublishable } = require("./index.js");
const admin = require("firebase-admin"); // index.js에서 이미 initializeApp 됨

async function main() {
  const db = admin.firestore();
  const [products, existing] = await Promise.all([
    db.collection("products").get(),
    db.collection("publicProducts").get(),
  ]);

  const keep = new Set();
  const batch = db.batch();
  products.forEach((doc) => {
    const p = doc.data();
    if (!_isPublishable(p)) return;
    keep.add(doc.id);
    batch.set(db.doc(`publicProducts/${doc.id}`), _buildPublicDoc(p));
  });
  let removed = 0;
  existing.forEach((doc) => {
    if (!keep.has(doc.id)) { batch.delete(doc.ref); removed++; }
  });
  await batch.commit();
  console.log(`synced: ${keep.size}, removed: ${removed}`);

  // 검증: 미러 내용 + 민감 필드 유출 여부
  const pub = await db.collection("publicProducts").get();
  const LEAK_FIELDS = ["costBag", "costLabel", "costBox", "extraCost", "priceB2B", "defaultPrice", "composition", "shrinkage", "price500g", "price200g"];
  pub.forEach((d) => {
    const p = d.data();
    const leak = LEAK_FIELDS.filter((k) => k in p);
    console.log(
      "-", p.name,
      "| cat:", p.category,
      "| shopVisible:", p.shopVisible,
      "| disp:", p.displayComposition ? JSON.stringify(p.displayComposition) : "-",
      "| prof:", p.profile ? `a${p.profile.acidity}/b${p.profile.body}/s${p.profile.sweetness}/r${p.profile.roastScore}${p.profile.fruitDark ? "/darkFruit" : ""}` : "-",
      leak.length ? "⚠️LEAK:" + leak.join(",") : ""
    );
  });
}

main().then(() => setTimeout(() => process.exit(0), 300)).catch((e) => { console.error(e); process.exit(1); });
