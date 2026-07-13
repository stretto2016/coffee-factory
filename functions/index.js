// 1:1 상담 새 메시지 → 사장님 안드로이드 앱으로 푸시 알림
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
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
