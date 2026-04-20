import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function initAdmin() {
  if (getApps().length) return;
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(sa) });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    initAdmin();
    const { title, category, type, docId } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });

    const db = getFirestore();
    const url = `read.html?type=${type}&id=${encodeURIComponent(docId)}`;

    // 1. Firestore mein save karo
    await db.collection("notifications").add({
      title,
      category: category || type,
      type,
      url,
      read: false,
      createdAt: new Date(),
    });

    // 2. Sabhi FCM tokens fetch karo
    const tokensSnap = await db.collection("fcm_tokens").get();
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

    if (!tokens.length) return res.json({ sent: 0, message: "No subscribers yet" });

    // 3. FCM push bhejo (batch of 500)
    const messaging = getMessaging();
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

    let sent = 0, failed = 0;
    for (const chunk of chunks) {
      const result = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title: "Code Cloner", body: title },
        data: { url, type, category: category || "" },
        webpush: {
          notification: {
            title: "Code Cloner 🚀",
            body: title,
            icon: "/code_cloner_logo.jpeg",
            badge: "/code_cloner_logo.jpeg",
            click_action: url,
          },
          fcmOptions: { link: url },
        },
        android: {
          notification: {
            title: "Code Cloner 🚀",
            body: title,
            icon: "ic_notification",
            click_action: url,
          },
        },
      });
      sent += result.successCount;
      failed += result.failureCount;

      // Invalid tokens clean karo
      const invalidTokens = result.responses
        .map((r, i) => (!r.success ? chunk[i] : null))
        .filter(Boolean);
      for (const t of invalidTokens) {
        const snap = await db.collection("fcm_tokens").where("token", "==", t).get();
        snap.forEach(d => d.ref.delete());
      }
    }

    res.json({ sent, failed });
  } catch (e) {
    console.error("send-notification error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
