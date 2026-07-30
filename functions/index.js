// 1:1 상담 새 메시지 → 사장님 안드로이드 앱으로 푸시 알림
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyNewChatMessage = onDocumentCreated(
  { document: "chats/{clientId}/messages/{messageId}", region: "asia-northeast3" },
  async (event) => {
    const msg = event.data && event.data.data();
    if (!msg || msg.sender !== "client") return; // 거래처가 보낸 메시지만 알림

    // 거래처 이름 조회 (채팅방 요약 문서)
    let clientName = "거래처";
    try {
      const roomSnap = await admin.firestore().doc(`chats/${event.params.clientId}`).get();
      if (roomSnap.exists && roomSnap.data().clientName) clientName = roomSnap.data().clientName;
    } catch (e) { /* 이름 조회 실패해도 알림은 발송 */ }

    // 등록된 사장님 기기 토큰 전부 조회
    const tokensSnap = await admin.firestore().collection("adminPushTokens").get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (tokens.length === 0) return;

    const text = String(msg.text || "").slice(0, 100);
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `💬 ${clientName}`,
        body: text,
      },
      android: {
        priority: "high",
        notification: { channelId: "PushDefaultForeground", sound: "default" },
      },
      data: { type: "chat", clientId: event.params.clientId },
    });

    // 만료된 토큰 정리
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          invalid.push(tokens[i]);
        }
      }
    });
    await Promise.all(invalid.map((t) => admin.firestore().doc(`adminPushTokens/${t}`).delete()));
  }
);

// 주문 생성 시점의 원가 스냅샷 저장 (앱/파트너 주문 공통)
// 이후 생두 원가·배합비·손실률·부자재비를 바꿔도 과거 주문의 마진이 변하지 않도록 고정
exports.snapshotOrderCost = onDocumentCreated(
  { document: "orders/{orderId}", region: "asia-northeast3" },
  async (event) => {
    const order = event.data && event.data.data();
    if (!order || order.costSnapshot || !order.productType) return;
    if (order.isPrepaidDraw) return; // 선주문 차감 기록(0원)은 원가 스냅샷 불필요 (선주문 등록 건에 있음)

    const db = admin.firestore();

    // 주문된 제품 찾기
    const prodSnap = await db.collection("products").where("name", "==", order.productType).limit(1).get();
    if (prodSnap.empty) return; // 수기 품목 등 제품 마스터에 없으면 스냅샷 생략
    const prod = prodSnap.docs[0].data();

    // 생두 원가 합산 (배합비 반영)
    const beansSnap = await db.collection("beans").get();
    const beanCostMap = {};
    beansSnap.docs.forEach((d) => { beanCostMap[d.data().name] = d.data().costPerKg || 0; });

    let greenCostPerKg = 0;
    Object.entries(prod.composition || {}).forEach(([beanName, ratio]) => {
      greenCostPerKg += (beanCostMap[beanName] || 0) * Number(ratio || 0);
    });

    const shrinkage = Number(prod.shrinkage || 0);
    const roastedCostPerKg = shrinkage < 1 ? greenCostPerKg / (1 - shrinkage) : greenCostPerKg;

    // 부자재비: 거래처 포장 프로필(봉투/라벨)이 있으면 그것을 우선 사용, 없으면 제품 마스터 값
    let overheadPerKg =
      Number(prod.costBag || 0) + Number(prod.costLabel || 0) +
      Number(prod.costBox || 0) + Number(prod.extraCost || 0);
    try {
      if (order.clientId) {
        const clientSnap = await db.doc(`clients/${order.clientId}`).get();
        const packaging = clientSnap.exists ? clientSnap.data().packaging : null;
        if (packaging) {
          const bagId = (packaging.perProduct && packaging.perProduct[order.productType] && packaging.perProduct[order.productType].bagMaterialId)
            || packaging.defaultBagMaterialId;
          let bagCost = Number(prod.costBag || 0);
          if (bagId) {
            const bagSnap = await db.doc(`packagingMaterials/${bagId}`).get();
            if (bagSnap.exists) bagCost = Number(bagSnap.data().unitCost || 0);
          }
          let labelCost = 0;
          if (packaging.labelMaterialId) {
            const labelSnap = await db.doc(`packagingMaterials/${packaging.labelMaterialId}`).get();
            if (labelSnap.exists) labelCost = Number(labelSnap.data().unitCost || 0);
          }
          overheadPerKg = bagCost + labelCost + Number(prod.extraCost || 0);
        }
      }
    } catch (e) { /* 프로필 조회 실패 시 제품 마스터 값 사용 */ }

    await event.data.ref.update({
      costSnapshot: {
        greenCostPerKg: Math.round(greenCostPerKg),
        roastedCostPerKg: Math.round(roastedCostPerKg),
        overheadPerKg: Math.round(overheadPerKg),
        shrinkage,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }
);

// 파트너 페이지 새 발주 → 사장님 앱으로 푸시 알림
// (앱에서 직접 입력한 주문은 orderGroupId가 없어 제외, 장바구니 여러 건은 그룹당 1회만 발송)
exports.notifyNewOrder = onDocumentCreated(
  { document: "orders/{orderId}", region: "asia-northeast3" },
  async (event) => {
    const order = event.data && event.data.data();
    if (!order || !order.orderGroupId) return; // 파트너 페이지 발주만

    // 같은 orderGroupId(장바구니 1회 주문)로는 푸시 1번만: 마커 문서 create가 실패하면 이미 발송됨
    try {
      await admin.firestore().doc(`orderPushDedupe/${order.orderGroupId}`).create({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      return; // 이미 다른 문서가 발송함
    }

    const tokensSnap = await admin.firestore().collection("adminPushTokens").get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (tokens.length === 0) return;

    const clientName = String(order.clientName || "거래처");
    const item = `${String(order.productType || "")} ${order.amountKg || ""}kg`;

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `🛒 새 발주: ${clientName}`,
        body: `${item} (자세한 내역은 앱에서 확인)`,
      },
      android: {
        priority: "high",
        notification: { channelId: "PushDefaultForeground", sound: "default" },
      },
      data: { type: "order", orderGroupId: String(order.orderGroupId) },
    });

    // 만료된 토큰 정리
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          invalid.push(tokens[i]);
        }
      }
    });
    await Promise.all(invalid.map((t) => admin.firestore().doc(`adminPushTokens/${t}`).delete()));
  }
);

// 선주문 차감 기록(0원 주문)이 삭제(주문 취소)되면 선주문 잔량 자동 복구
exports.restorePrepaidOnDelete = onDocumentDeleted(
  { document: "orders/{orderId}", region: "asia-northeast3" },
  async (event) => {
    const deleted = event.data && event.data.data();
    if (!deleted || !deleted.isPrepaidDraw || !deleted.prepaidParentId) return;

    const qty = Number(deleted.amountKg || 0);
    if (qty <= 0) return;

    const parentRef = admin.firestore().doc(`orders/${deleted.prepaidParentId}`);
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(parentRef);
      if (!snap.exists) return;
      const parent = snap.data();
      const newShipped = Math.max(0, Math.round(((parent.shippedAmount || 0) - qty) * 1000) / 1000);
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      tx.update(parentRef, {
        shippedAmount: newShipped,
        isShipped: newShipped >= Number(parent.amountKg || 0),
        drawHistory: admin.firestore.FieldValue.arrayUnion({
          date: dateStr, amountKg: -qty, by: "cancel", at: Date.now(),
        }),
      });
    });
  }
);

// 거래처가 파트너 페이지에서 선주문 잔량을 직접 차감 → 사장님 앱으로 푸시 알림
exports.notifyPrepaidDraw = onDocumentUpdated(
  { document: "orders/{orderId}", region: "asia-northeast3" },
  async (event) => {
    const before = event.data && event.data.before.data();
    const after = event.data && event.data.after.data();
    if (!before || !after || !after.isPrepaid) return;

    const prevShipped = Number(before.shippedAmount || 0);
    const newShipped = Number(after.shippedAmount || 0);
    if (newShipped <= prevShipped) return; // 차감(증가)이 아니면 무시

    // 마지막 차감 기록이 거래처(client) 직접 차감인 경우에만 알림 (앱에서 사장님이 직접 차감한 건 제외)
    const history = Array.isArray(after.drawHistory) ? after.drawHistory : [];
    const last = history.length > 0 ? history[history.length - 1] : null;
    if (!last || last.by !== "client") return;

    const tokensSnap = await admin.firestore().collection("adminPushTokens").get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (tokens.length === 0) return;

    const drawn = Math.round((newShipped - prevShipped) * 1000) / 1000;
    const remaining = Math.round((Number(after.amountKg || 0) - newShipped) * 1000) / 1000;

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `📦 선주문 차감: ${after.clientName || "거래처"}`,
        body: `${after.productType || ""} ${drawn}kg 차감 (잔량 ${remaining}kg)`,
      },
      android: {
        priority: "high",
        notification: { channelId: "PushDefaultForeground", sound: "default" },
      },
      data: { type: "prepaidDraw", orderId: event.params.orderId },
    });

    // 만료된 토큰 정리
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          invalid.push(tokens[i]);
        }
      }
    });
    await Promise.all(invalid.map((t) => admin.firestore().doc(`adminPushTokens/${t}`).delete()));
  }
);

// 홈페이지 머신 수리 상담 신청 → 사장님 앱으로 푸시 알림
exports.notifyNewRepairRequest = onDocumentCreated(
  { document: "repairRequests/{requestId}", region: "asia-northeast3" },
  async (event) => {
    const req = event.data && event.data.data();
    if (!req) return;

    const tokensSnap = await admin.firestore().collection("adminPushTokens").get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (tokens.length === 0) return;

    const store = String(req.storeName || req.repName || "고객");
    const machine = String(req.machine || "");
    const symptom = String(req.symptom || "").slice(0, 80);

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `🔧 수리 상담 신청: ${store}`,
        body: `${machine} / ${symptom}`,
      },
      android: {
        priority: "high",
        notification: { channelId: "PushDefaultForeground", sound: "default" },
      },
      data: { type: "repair", requestId: event.params.requestId },
    });

    // 만료된 토큰 정리
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          invalid.push(tokens[i]);
        }
      }
    });
    await Promise.all(invalid.map((t) => admin.firestore().doc(`adminPushTokens/${t}`).delete()));
  }
);

// ───────────────────────────────────────────────────────────────
// products → publicProducts 공개용 미러 동기화
//
// products에는 실제 배합비(composition)·원가·B2B 납품가가 들어 있어 외부에 공개할 수 없다.
// 홈페이지(Shop/원두 추천)는 publicProducts만 읽고, 여기에는 공개 가능한 필드와
// 별도 입력한 공개용 배합비(displayComposition)만 복사한다.
// ───────────────────────────────────────────────────────────────

const ROAST_SCORE = {
  "light": 1, "medium light": 2, "medium": 3, "medium dark": 4, "dark": 5,
};

// 과일 향미는 두 갈래로 나눈다:
// bright(밝은 과일) = 산미와 한 몸인 계열 / darkFruit(말린·검은 과일) = 낮은 산미·묵직한 바디와
// 공존 가능한 계열(내추럴 가공·미디엄다크에서 나옴). "과일 향 + 산미 없음" 같은 모순 답변에서
// darkFruit 원두(예: 예멘 모카 마타리)를 정답으로 밀어주기 위한 구분이다.
const NOTE_KEYWORDS = {
  bright: ["베리", "시트러스", "플로럴", "자두", "히비스커스", "블랙커런트", "레몬", "귤",
    "오렌지", "체리", "피치", "복숭아", "살구", "트로피컬", "망고", "스트로베리",
    "사과", "파인애플", "라임", "자스민", "홍차", "와인", "자몽"],
  darkFruit: ["건포도", "크랜베리", "말린", "무화과", "대추", "다크체리", "푸룬", "자두잼"],
  sweetness: ["카라멜", "브라운슈거", "흑설탕", "꿀", "허니", "바닐라", "초콜릿", "캔디",
    "군고구마", "메이플", "토피", "설탕", "단맛", "시럽", "코코아"],
  body: ["다크초콜릿", "묵직", "견과", "아몬드", "마카다미아", "너트", "헤이즐넛", "스모키",
    "로스티", "카카오", "몰트", "삼나무", "흙", "허브"],
};

const clamp15 = (n) => Math.round(Math.min(5, Math.max(1, n)) * 10) / 10;

// 이미 입력된 필드(카테고리·로스팅 레벨·컵노트)에서 향미 프로필을 자동 산출한다.
// 새 싱글 원두를 등록해도 추가 입력 없이 추천 대상에 편입되게 하려는 목적.
function deriveProfile(p) {
  const cat = String(p.category || "").toLowerCase();
  const roast = ROAST_SCORE[String(p.roastingLevel || "").toLowerCase().trim()] || 3;
  const note = String(p.cupNote || "") + " " + String(p.description || "");

  let acidity = cat === "single_fruity" ? 4 : cat === "single_nutty" ? 2 : 3;
  let body = cat === "single_nutty" ? 3.5 : 3;
  let sweetness = 3;

  acidity -= (roast - 3) * 0.7;
  body += (roast - 3) * 0.6;

  const hits = (list) => list.filter((kw) => note.includes(kw)).length;
  acidity += Math.min(3, hits(NOTE_KEYWORDS.bright)) * 0.3;
  // 말린 과일은 산미가 아니라 단맛으로 잡힌다
  sweetness += Math.min(3, hits(NOTE_KEYWORDS.sweetness)) * 0.35
    + Math.min(2, hits(NOTE_KEYWORDS.darkFruit)) * 0.25;
  body += Math.min(3, hits(NOTE_KEYWORDS.body)) * 0.3;

  const num = (v) => (typeof v === "number" && v >= 1 && v <= 5 ? v : null);
  return {
    roastScore: roast,
    acidity: num(p.profileAcidity) || clamp15(acidity),
    body: num(p.profileBody) || clamp15(body),
    sweetness: num(p.profileSweetness) || clamp15(sweetness),
    // 과일 계열 구분 — 추천 로직에서 "과일 향 + 낮은 산미" 답변에 darkFruit 원두를 우선한다
    fruitBright: hits(NOTE_KEYWORDS.bright) > 0,
    fruitDark: hits(NOTE_KEYWORDS.darkFruit) > 0,
    isManual: !!(num(p.profileAcidity) || num(p.profileBody) || num(p.profileSweetness)),
  };
}

// 공개용 배합비. displayComposition이 입력되어 있으면 그것만 쓴다.
// 없으면 비율 없이 원산지 이름만(가나다순) 노출해 실제 비율을 추정할 수 없게 한다.
function publicBlendInfo(p) {
  const disp = p.displayComposition;
  if (disp && typeof disp === "object" && Object.keys(disp).length > 0) {
    const out = {};
    for (const [k, v] of Object.entries(disp)) {
      const r = Number(v) || 0;
      if (r > 0) out[k] = r;
    }
    if (Object.keys(out).length > 0) {
      return { displayComposition: out, blendOrigins: Object.keys(out) };
    }
  }
  const actual = p.composition;
  if (actual && typeof actual === "object") {
    const names = Object.keys(actual).filter((k) => (Number(actual[k]) || 0) > 0).sort();
    if (names.length > 0) return { displayComposition: null, blendOrigins: names };
  }
  return { displayComposition: null, blendOrigins: [] };
}

function buildPublicDoc(p) {
  const blend = publicBlendInfo(p);
  return {
    name: p.name || "",
    category: p.category || "",
    roastingLevel: p.roastingLevel || "",
    cupNote: p.cupNote || "",
    description: p.description || "",
    imageUrl: p.imageUrl || "",
    badge: p.badge || "",
    badgeColor: p.badgeColor || "",
    badgeTextColor: p.badgeTextColor || "",
    shopLink: p.shopLink || "",
    origin: p.origin || "",
    process: p.process || "",
    variety: p.variety || "",
    altitude: p.altitude || "",
    // 소매가(B2C)만 공개 — priceB2B/defaultPrice/원가 계열은 절대 복사하지 않는다
    price: Number(p.price) || 0,
    priceShop: Number(p.priceShop) || 0,
    retailPrice1kg: Number(p.retailPrice1kg) || 0,
    retailPrice500g: Number(p.retailPrice500g) || 0,
    retailPrice200g: Number(p.retailPrice200g) || 0,
    retailPrice10g: Number(p.retailPrice10g) || 0,
    displayComposition: blend.displayComposition,
    blendOrigins: blend.blendOrigins,
    profile: deriveProfile(p),
    // 쇼핑몰 그리드 노출 여부. 커스텀 배합 재료로만 쓰는 원두는 false로 내려가
    // 홈페이지 상품 목록에는 안 뜨지만 배합 제안에는 쓸 수 있다.
    shopVisible: p.showShop === true,
    recommendB2C: p.showShop === true && p.recommendB2C !== false,
    recommendB2B: p.showShop === true && p.recommendB2B !== false,
    useInBlend: p.useInBlend === true,
    orderIndex: p.orderIndex !== undefined ? p.orderIndex : 999,
    createdAt: Number(p.createdAt) || 0,
    syncedAt: Date.now(),
  };
}

// publicProducts에 남길 대상: 홈페이지 노출(showShop) 제품, 또는
// 쇼핑몰에는 없지만 커스텀 배합 제안의 재료로 쓸 원두(useInBlend). 둘 다 숨김이 아니어야 한다.
const isPublishable = (p) => !!p && p.isHidden !== true && (p.showShop === true || p.useInBlend === true);

// 백필/점검 스크립트에서 동일 로직을 재사용하기 위한 export (Cloud Functions 트리거 아님)
exports._buildPublicDoc = buildPublicDoc;
exports._isPublishable = isPublishable;

exports.syncPublicProduct = onDocumentWritten(
  { document: "products/{productId}", region: "asia-northeast3" },
  async (event) => {
    const id = event.params.productId;
    const after = event.data && event.data.after && event.data.after.exists
      ? event.data.after.data() : null;
    const ref = admin.firestore().doc(`publicProducts/${id}`);

    if (!isPublishable(after)) {
      await ref.delete().catch(() => {});
      return;
    }
    await ref.set(buildPublicDoc(after));
  }
);

// 최초 1회 백필 / 로직 변경 후 전체 재생성. 앱 설정 탭의 버튼에서 호출.
exports.syncAllPublicProducts = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    if (!request.auth || request.auth.token.email !== "strettopark@gmail.com") {
      throw new HttpsError("permission-denied", "관리자만 실행할 수 있습니다.");
    }
    const db = admin.firestore();
    const [products, existing] = await Promise.all([
      db.collection("products").get(),
      db.collection("publicProducts").get(),
    ]);

    const keep = new Set();
    let batch = db.batch();
    let ops = 0;
    const commits = [];
    const flush = () => { if (ops > 0) { commits.push(batch.commit()); batch = db.batch(); ops = 0; } };

    products.forEach((doc) => {
      const p = doc.data();
      if (!isPublishable(p)) return;
      keep.add(doc.id);
      batch.set(db.doc(`publicProducts/${doc.id}`), buildPublicDoc(p));
      if (++ops >= 400) flush();
    });

    let removed = 0;
    existing.forEach((doc) => {
      if (keep.has(doc.id)) return;
      batch.delete(doc.ref);
      removed++;
      if (++ops >= 400) flush();
    });

    flush();
    await Promise.all(commits);
    return { synced: keep.size, removed };
  }
);
