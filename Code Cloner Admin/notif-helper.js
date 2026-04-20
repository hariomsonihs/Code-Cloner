import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

const cfg = window.__env || {};
if (!getApps().length) initializeApp(cfg);

export async function saveNotification(title, category, type, docId) {
  try {
    await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, type, docId }),
    });
  } catch (e) {
    console.warn("Notification send failed:", e.message);
  }
}
