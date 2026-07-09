// 1:1 상담 새 메시지 → 사장님 안드로이드 앱으로 푸시 알림
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
