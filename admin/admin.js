import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection, addDoc, deleteDoc, updateDoc, doc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = window.__env || {};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ── Auth ───────────────────────────────────────────────────────
const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

let unsubscribers = []; // store onSnapshot unsubs

// ── Admin Role Check ───────────────────────────────────────────
async function checkAdminRole(user) {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      console.log("User document not found in Firestore");
      return false;
    }
    const userData = userDoc.data();
    console.log("User data:", userData);
    console.log("isAdmin value:", userData.isAdmin);
    return userData.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    
    // Show loading state
    loginBtn.textContent = "Checking permissions...";
    loginBtn.disabled = true;
    
    // Check if user is admin
    const isAdmin = await checkAdminRole(user);
    
    console.log("Is admin?", isAdmin);
    
    if (!isAdmin) {
      // Not an admin - show error and sign out
      console.log("Access denied - not an admin");
      loginError.innerHTML = `<div class="toast error" style="margin-bottom:.8rem">⛔ Access Denied: You don't have admin privileges.<br><small>Contact administrator to get access.</small></div>`;
      await signOut(auth);
      loginBtn.textContent = "Sign In";
      loginBtn.disabled = false;
      return;
    }
    
    // User is admin - grant access
    console.log("Access granted - user is admin");
    loginScreen.style.display = "none";
    adminPanel.style.display = "block";
    document.getElementById("adminEmail").textContent = user.email;
    initAdmin();
  } else {
    loginScreen.style.display = "flex";
    adminPanel.style.display = "none";
    loginBtn.textContent = "Sign In";
    loginBtn.disabled = false;
    // unsubscribe all listeners on logout
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginBtn.textContent = "Signing in...";
  loginBtn.disabled = true;
  loginError.innerHTML = "";
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById("loginEmail").value.trim(),
      document.getElementById("loginPassword").value
    );
  } catch (err) {
    loginError.innerHTML = `<div class="toast error" style="margin-bottom:.8rem">${friendlyAuthError(err.code)}</div>`;
    loginBtn.textContent = "Sign In";
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email": "Invalid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return map[code] || "Login failed. Check your credentials.";
}

// ── Helpers ────────────────────────────────────────────────────
function esc(t) {
  return String(t ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function toast(colName, msg, type = "success") {
  const el = document.getElementById("toast-" + colName);
  if (!el) return;
  el.innerHTML = `<div class="toast ${type}">${msg}</div>`;
  setTimeout(() => (el.innerHTML = ""), 3500);
}

function formToObj(form) {
  const obj = {};
  new FormData(form).forEach((v, k) => (obj[k] = v.trim()));
  return obj;
}

// ── Configs ────────────────────────────────────────────────────
const configs = {
  articles: {
    rowFn: (d) => `<td>${esc(d.title)}</td><td>${esc(d.category)}</td><td>${esc(d.readTime)}</td>`,
    editFields: [
      { name: "title", label: "Title", full: true },
      { name: "category", label: "Category" },
      { name: "readTime", label: "Read Time" },
      { name: "description", label: "Short Description", type: "textarea", full: true },
      { name: "content", label: "Full Content", type: "textarea", full: true, rows: 5 },
      { name: "tags", label: "Tags", full: true },
    ],
  },
  tips: {
    rowFn: (d) => `<td>${esc(d.title)}</td><td>${esc(d.category)}</td>`,
    editFields: [
      { name: "title", label: "Title", full: true },
      { name: "category", label: "Category" },
      { name: "body", label: "Body", type: "textarea", full: true },
      { name: "example", label: "Code Example", type: "textarea", full: true, rows: 4 },
      { name: "tags", label: "Tags", full: true },
    ],
  },
  facts: {
    rowFn: (d) => `<td>${esc(d.title)}</td><td>${esc(d.category)}</td>`,
    editFields: [
      { name: "title", label: "Title", full: true },
      { name: "category", label: "Category" },
      { name: "body", label: "Body", type: "textarea", full: true },
      { name: "source", label: "Source", full: true },
    ],
  },
  projects: {
    rowFn: (d) => `<td>${esc(d.name)}</td><td>${esc(d.level)}</td><td>${esc(d.stack)}</td>`,
    editFields: [
      { name: "name", label: "Project Name", full: true },
      { name: "level", label: "Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
      { name: "stack", label: "Stack" },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "code", label: "Source Code", type: "textarea", full: true, rows: 5 },
      { name: "liveUrl", label: "Live URL" },
      { name: "repoUrl", label: "Repo URL" },
    ],
  },
  resources: {
    rowFn: (d) => `<td>${esc(d.title)}</td><td>${esc(d.type)}</td><td>${esc(d.category)}</td>`,
    editFields: [
      { name: "title", label: "Title", full: true },
      { name: "type", label: "Type", type: "select", options: ["Tool","Article","Video","Course","Book","Website","Other"] },
      { name: "category", label: "Category" },
      { name: "description", label: "Description", type: "textarea", full: true },
      { name: "url", label: "URL", full: true },
      { name: "tags", label: "Tags", full: true },
    ],
  },
};

// ── Edit Modal ─────────────────────────────────────────────────
const editModal = document.getElementById("editModal");
const editFormContainer = document.getElementById("editFormContainer");
const saveEditBtn = document.getElementById("saveEditBtn");

let editState = null;

function buildEditForm(colName, data) {
  const fields = configs[colName].editFields.map((f) => {
    const cls = f.full ? "full" : "";
    let input;
    if (f.type === "textarea") {
      input = `<textarea class="textarea" name="${f.name}" rows="${f.rows || 3}">${esc(data[f.name] ?? "")}</textarea>`;
    } else if (f.type === "select") {
      const opts = f.options.map((o) => `<option${o === data[f.name] ? " selected" : ""}>${o}</option>`).join("");
      input = `<select class="select" name="${f.name}">${opts}</select>`;
    } else {
      input = `<input class="input" name="${f.name}" value="${esc(data[f.name] ?? "")}" />`;
    }
    return `<div class="edit-form-grid ${cls}"><label>${f.label}</label>${input}</div>`;
  }).join("");
  return `<div class="edit-form-grid">${fields}</div>`;
}

document.getElementById("closeEditModal").addEventListener("click", () => editModal.close());
document.getElementById("cancelEditBtn").addEventListener("click", () => editModal.close());

saveEditBtn.addEventListener("click", async () => {
  if (!editState) return;
  const updated = {};
  editFormContainer.querySelectorAll("[name]").forEach((el) => (updated[el.name] = el.value.trim()));
  try {
    await updateDoc(doc(db, editState.colName, editState.docId), updated);
    toast(editState.colName, "Updated successfully ✓");
    editModal.close();
  } catch (e) {
    toast(editState.colName, "Update failed: " + e.message, "error");
  }
});

window.handleEdit = function (colName, docId, jsonStr) {
  editState = { colName, docId };
  editFormContainer.innerHTML = buildEditForm(colName, JSON.parse(jsonStr));
  editModal.showModal();
};

window.handleDelete = async function (colName, docId) {
  if (!confirm("Delete this item?")) return;
  try {
    await deleteDoc(doc(db, colName, docId));
    toast(colName, "Deleted ✓");
  } catch (e) {
    toast(colName, "Delete failed: " + e.message, "error");
  }
};

// ── Tab switching ──────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.remove("hidden");
  });
});

// ── Init admin after login ─────────────────────────────────────
const counts = {};

function initAdmin() {
  Object.keys(configs).forEach((colName) => {
    const cfg = configs[colName];
    const form = document.getElementById("form-" + colName);
    const listEl = document.getElementById("list-" + colName);

    document.getElementById("clear-" + colName).addEventListener("click", () => form.reset());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = formToObj(form);
      data.createdAt = serverTimestamp();
      try {
        await addDoc(collection(db, colName), data);
        toast(colName, "Added successfully ✓");
        form.reset();
      } catch (err) {
        toast(colName, "Error: " + err.message, "error");
      }
    });

    const unsub = onSnapshot(
      query(collection(db, colName), orderBy("createdAt", "desc")),
      (snap) => {
        counts[colName] = snap.size;
        updateSidebarStats();
        if (snap.empty) {
          listEl.innerHTML = `<tr><td colspan="10" style="color:var(--muted);text-align:center;padding:1rem">No items yet.</td></tr>`;
          return;
        }
        listEl.innerHTML = snap.docs.map((d) => {
          const data = d.data();
          return `<tr>
            ${cfg.rowFn(data)}
            <td><div class="inline-actions">
              <button onclick='handleEdit("${colName}","${d.id}",${JSON.stringify(JSON.stringify(data))})'>Edit</button>
              <button class="delete" onclick='handleDelete("${colName}","${d.id}")'>Delete</button>
            </div></td>
          </tr>`;
        }).join("");
      },
      (err) => toast(colName, "Listen error: " + err.message, "error")
    );

    unsubscribers.push(unsub);
  });
}

function updateSidebarStats() {
  const labels = { articles: "Articles", tips: "Tips", facts: "Facts", projects: "Projects", resources: "Resources" };
  document.getElementById("sidebarStats").innerHTML = Object.entries(labels)
    .map(([k, v]) => `<div class="stat-row">${v}<span>${counts[k] ?? 0}</span></div>`)
    .join("");
}
