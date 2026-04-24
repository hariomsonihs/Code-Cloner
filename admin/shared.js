import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const cfg = window.__env || {};
const firebaseConfig = {
  apiKey: cfg.apiKey,
  authDomain: cfg.authDomain,
  projectId: cfg.projectId,
  storageBucket: cfg.storageBucket,
  messagingSenderId: cfg.messagingSenderId,
  appId: cfg.appId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ── Auth guard ─────────────────────────────────────────────────
export function requireAuth(onUser) {
  onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    const emailEl = document.getElementById("userEmail");
    const avatarEl = document.getElementById("userAvatar");
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = user.email[0].toUpperCase();
    document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
    onUser(user);
  });
}

// ── Toast ──────────────────────────────────────────────────────
export function toast(msg, type = "success") {
  let wrap = document.getElementById("toastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toastWrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const icons = {
    success: `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    info:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`,
  };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = (icons[type] || "") + msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Sidebar toggle ─────────────────────────────────────────────
export function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburger");
  hamburger?.addEventListener("click", () => { sidebar.classList.toggle("open"); overlay.classList.toggle("show"); });
  overlay?.addEventListener("click", () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); });
}

// ── Active nav ─────────────────────────────────────────────────
export function setActiveNav() {
  const page = location.pathname.split("/").pop();
  document.querySelectorAll(".nav-item").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === page);
  });
}

// ── Escape HTML ────────────────────────────────────────────────
export function esc(t) {
  return String(t ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

// ── Level badge color ──────────────────────────────────────────
export function levelBadge(level) {
  const map = { Beginner: "badge-green", Intermediate: "badge-orange", Advanced: "badge-purple" };
  return `<span class="badge ${map[level] || "badge-gray"}">${esc(level)}</span>`;
}
