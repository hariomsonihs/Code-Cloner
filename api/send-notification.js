const CORS_ORIGIN = "https://code-cloner-admin.vercel.app";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const { getMessaging } = await import("firebase-admin/messaging");

    if (!getApps().length) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
      initializeApp({ credential: cert(sa) });
    }

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

    // 2. FCM tokens fetch karo
    const tokensSnap = await db.collection("fcm_tokens").get();
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);

    if (!tokens.length) return res.json({ sent: 0, saved: true, message: "No subscribers yet" });

    // 3. FCM push bhejo
    const messaging = getMessaging();
    let sent = 0, failed = 0;

    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

    for (const chunk of chunks) {
      try {
        const result = await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: { title: "Code Cloner 🚀", body: title },
          data: { url, type, category: category || "" },
          webpush: {
            notification: {
              title: "Code Cloner 🚀",
              body: title,
              icon: "/code_cloner_logo.jpeg",
              badge: "/code_cloner_logo.jpeg",
            },
            fcmOptions: { link: `https://code-cloner.vercel.app/${url}` },
          },
        });
        sent += result.successCount;
        failed += result.failureCount;

        // Invalid tokens clean karo
        const invalid = result.responses
          .map((r, i) => (!r.success ? chunk[i] : null))
          .filter(Boolean);
        for (const t of invalid) {
          const snap = await db.collection("fcm_tokens").where("token", "==", t).get();
          snap.forEach(d => d.ref.delete());
        }
      } catch (fcmErr) {
        console.warn("FCM chunk error:", fcmErr.message);
        failed += chunk.length;
      }
    }

    res.json({ sent, failed, saved: true });
  } catch (e) {
    console.error("send-notification error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
