import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const cfg = (typeof self !== 'undefined' && self.__env) || (typeof window !== 'undefined' && window.__env) || {};

const firebaseConfig = {
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
  measurementId: cfg.measurementId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initAnalytics() {
  try {
    const supported = await isSupported();
    if (supported) getAnalytics(app);
  } catch (error) {
    console.warn("Analytics not initialized:", error?.message || error);
  }
}

initAnalytics();

export { app, db };
