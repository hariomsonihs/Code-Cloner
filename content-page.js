import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, initRevealAnimations, initShellNavigation } from "./ui.js";
import { initNotifications } from "./notifications.js";

const main = document.querySelector("main[data-collection]");
if (!main) {
  throw new Error("Missing page dataset for collection.");
}

const collectionName = main.dataset.collection;
const kind = main.dataset.kind;

const grid = document.getElementById("contentGrid");
const liveStatus = document.getElementById("liveStatus");
const errorBox = document.getElementById("errorBox");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

const codeModal = document.getElementById("codeModal");
const modalTitle = document.getElementById("modalTitle");
const modalCode = document.getElementById("modalCode");
const closeModalBtn = document.getElementById("closeModal");

let allDocs = [];
let activeCategory = "All";
let resourcesData = {}; // Store resources data for modal

const categoryChips = document.getElementById("categoryChips");

function buildCategoryChips() {
  if (!categoryChips) return;
  const cats = ["All", ...new Set(allDocs.map(d => d.category).filter(Boolean))];
  
  // Create dropdown structure
  categoryChips.innerHTML = `
    <div class="category-filter-wrap">
      <button class="category-filter-btn" id="categoryFilterBtn">
        <span id="selectedCategory">${escapeHtml(activeCategory)}</span>
        <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="category-dropdown" id="categoryDropdown">
        ${cats.map(c => `<div class="category-dropdown-item${c === activeCategory ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</div>`).join("")}
      </div>
    </div>
  `;
  
  const filterBtn = document.getElementById("categoryFilterBtn");
  const dropdown = document.getElementById("categoryDropdown");
  const selectedCategorySpan = document.getElementById("selectedCategory");
  
  // Toggle dropdown
  filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
    filterBtn.classList.toggle("open");
  });
  
  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".category-filter-wrap")) {
      dropdown?.classList.remove("open");
      filterBtn?.classList.remove("open");
    }
  });
  
  // Handle category selection
  dropdown?.querySelectorAll(".category-dropdown-item").forEach(item => {
    item.addEventListener("click", () => {
      activeCategory = item.dataset.cat;
      selectedCategorySpan.textContent = activeCategory;
      dropdown.classList.remove("open");
      filterBtn.classList.remove("open");
      
      // Update active state
      dropdown.querySelectorAll(".category-dropdown-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      
      render();
    });
  });
}

// HTML tags strip karke plain text preview banao (cards ke liye)
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// 150 chars tak truncate karo
function preview(text, len = 150) {
  const plain = stripHtml(text);
  return plain.length > len ? plain.slice(0, len).trimEnd() + "…" : plain;
}

function renderState(text) {
  grid.innerHTML = `<div class="state-box" style="grid-column:1/-1">${escapeHtml(text)}</div>`;
}

function banner(cls, icon, imageUrl) {
  // Agar imageUrl hai aur empty string nahi hai, to image dikhaao
  if (imageUrl && imageUrl.trim()) {
    return `<div class="card-banner card-banner-img"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('card-banner-img');this.remove()"/></div>`;
  }
  // Warna gradient banner with icon dikhaao
  return `<div class="card-banner ${cls}"><span class="card-banner-icon">${icon}</span><div class="card-banner-shape"></div><div class="card-banner-shape2"></div></div>`;
}

function cardForArticles(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  return `
    <a class="content-card" href="read.html?type=articles&id=${item.id}">
      ${banner("banner-article", "📄", item.imageUrl)}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge">${escapeHtml(item.category || "Article")}</span>
          ${item.readTime ? `<span class="badge badge-muted">⏱ ${escapeHtml(item.readTime)}</span>` : ""}
          ${item.views ? `<span class="badge badge-muted">👁 ${item.views}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || item.content || ""))}</p>
      </div>
      <div class="card-bottom">
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}

function cardForTips(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  return `
    <a class="content-card" href="read.html?type=tips&id=${item.id}">
      ${banner("banner-tip", "💡", item.imageUrl)}
      <div class="card-top">
        <div class="badge-row">
          <span class="badge badge-green">Tip</span>
          ${item.category ? `<span class="badge">${escapeHtml(item.category)}</span>` : ""}
          ${item.readTime ? `<span class="badge badge-muted">⏱ ${escapeHtml(item.readTime)}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title || "Tip")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || item.body || ""))}</p>
      </div>
      <div class="card-bottom">
        ${item.example ? `<div class="card-code-preview"><code>${escapeHtml(item.example.slice(0, 80))}${item.example.length > 80 ? "…" : ""}</code></div>` : ""}
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div class="card-actions">
          <span class="small-btn">Read more →</span>
        </div>
      </div>
    </a>
  `;
}

function cardForFacts(item) {
  // Category-based icons
  const categoryIcons = {
    "Science": "🔬",
    "Technology": "💻",
    "History": "🏛️",
    "Nature": "🌿",
    "Space": "🚀",
    "Human Body": "🫀",
    "Animals": "🐾",
    "Other": "🔍"
  };
  
  const icon = categoryIcons[item.category] || "🔍";
  const categoryClass = item.category ? `fact-${item.category.toLowerCase().replace(/\s+/g, '-')}` : "fact-other";
  
  // Strip HTML for teaser
  const teaser = preview(item.description || item.body || "", 80);
  
  // Full content for back side
  const fullContent = item.body || item.description || "No content available.";
  
  // Thumbnail rendering
  const hasImage = item.imageUrl && item.imageUrl.trim();
  const headerContent = hasImage 
    ? `<div class="fact-thumbnail-wrapper">
         <img src="${escapeHtml(item.imageUrl)}" alt="" class="fact-thumbnail" loading="lazy"/>
         <div class="fact-thumbnail-overlay">
           <span class="fact-thumbnail-icon">${icon}</span>
         </div>
       </div>`
    : `<span class="fact-icon-large">${icon}</span>
       <div class="fact-particle"></div>
       <div class="fact-particle"></div>
       <div class="fact-particle"></div>`;
  
  return `
    <div class="content-card ${categoryClass}" onclick="flipFactCard(this, event)">
      <div class="fact-card-inner">
        <!-- Front Side -->
        <div class="fact-card-front">
          <div class="fact-front-header ${hasImage ? 'has-image' : ''}">
            ${headerContent}
          </div>
          <div class="fact-front-body">
            <span class="fact-category-badge">
              <svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ${escapeHtml(item.category || "Fact")}
            </span>
            <h3 class="fact-title">${escapeHtml(item.title || "Interesting Fact")}</h3>
            <p class="fact-teaser">${escapeHtml(teaser)}</p>
            <div class="fact-flip-hint">
              <svg viewBox="0 0 24 24" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
              Click to reveal full fact
            </div>
          </div>
        </div>
        
        <!-- Back Side -->
        <div class="fact-card-back">
          <div class="fact-back-header">
            <h3 class="fact-back-title">${escapeHtml(item.title || "Fact")}</h3>
            <button class="fact-back-close" onclick="flipFactCard(this.closest('.content-card'), event)">×</button>
          </div>
          <div class="fact-back-content ql-editor">${fullContent}</div>
          ${item.source ? `
            <div class="fact-back-footer">
              <a href="${escapeHtml(item.source)}" target="_blank" rel="noopener" class="fact-source-link" onclick="event.stopPropagation()">
                <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                View Source
              </a>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

function cardForProjects(item) {
  const fileCount = item.codeFiles?.length || (item.code ? 1 : 0);
  const live = item.liveUrl ? `<span class="small-btn small-btn-ghost" data-src="${escapeHtml(item.liveUrl)}">Live ↗</span>` : "";
  const repo = item.repoUrl ? `<span class="small-btn small-btn-ghost" data-src="${escapeHtml(item.repoUrl)}">GitHub ↗</span>` : "";
  return `
    <a class="content-card" href="read.html?type=projects&id=${item.id}">
      ${banner("banner-project", "🚀", item.imageUrl)}
      <div class="card-top">
        <div class="badge-row">
          ${item.category ? `<span class="badge badge-pink">${escapeHtml(item.category)}</span>` : ""}
          ${item.level ? `<span class="badge badge-purple">${escapeHtml(item.level)}</span>` : ""}
          ${item.stack ? `<span class="badge">🛠 ${escapeHtml(item.stack)}</span>` : ""}
          ${fileCount ? `<span class="badge badge-muted">📄 ${fileCount} file${fileCount > 1 ? "s" : ""}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.name || "Untitled Project")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || ""))}</p>
      </div>
      <div class="card-bottom">
        <div class="card-actions">
          <span class="small-btn">View &amp; Code →</span>${live}${repo}
        </div>
      </div>
    </a>
  `;
}

function cardForResources(item) {
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  
  // Store data for modal
  resourcesData[item.id] = item;
  
  // Category-based icon mapping
  const categoryIcons = {
    "Tools": "🛠️",
    "Library": "📚",
    "Course": "🎓",
    "Documentation": "📖",
    "Tutorial": "🎬",
    "API": "⚡",
    "Design": "🎨",
    "Other": "🔗"
  };
  
  const icon = categoryIcons[item.category] || "🔗";
  const categoryClass = item.category ? `resource-${item.category.toLowerCase()}` : "resource-other";
  
  // Type badge (Free/Paid/Freemium)
  const typeBadge = item.type ? `<span class="resource-type-badge badge-${item.type.toLowerCase()}">${escapeHtml(item.type)}</span>` : "";
  
  // Thumbnail rendering
  const hasImage = item.imageUrl && item.imageUrl.trim();
  const bannerContent = hasImage
    ? `<div class="resource-thumbnail-wrapper">
         <img src="${escapeHtml(item.imageUrl)}" alt="" class="resource-thumbnail" loading="lazy"/>
         <div class="resource-thumbnail-overlay">
           <span class="resource-thumbnail-icon">${icon}</span>
         </div>
       </div>`
    : `<span class="resource-icon">${icon}</span>`;
  
  // Stats (views, rating, etc.)
  const stats = `
    <div class="resource-stats">
      ${item.views ? `<span class="resource-stat"><span class="resource-stat-icon">👁️</span>${item.views}</span>` : ""}
      ${item.rating ? `<span class="resource-stat"><span class="resource-stat-icon">⭐</span>${item.rating}</span>` : ""}
      ${item.category ? `<span class="resource-stat"><span class="resource-stat-icon">📂</span>${escapeHtml(item.category)}</span>` : ""}
    </div>
  `;
  
  return `
    <div class="content-card ${categoryClass}" onclick="openResourceModal('${item.id}')" style="cursor:pointer">
      <div class="card-banner ${hasImage ? 'has-image' : ''}">
        ${bannerContent}
        ${typeBadge}
      </div>
      <div class="card-top">
        <h3>${escapeHtml(item.title || "Resource")}</h3>
        <p class="card-desc">${escapeHtml(preview(item.description || item.body || ""))}</p>
        ${(item.views || item.rating || item.category) ? stats : ""}
      </div>
      <div class="card-bottom">
        ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="resource-link-btn resource-info-btn" onclick="event.stopPropagation();openResourceModal('${item.id}')">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            View Details
          </button>
          ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="resource-link-btn" onclick="event.stopPropagation()">
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            Visit Resource
          </a>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderCard(item) {
  switch (kind) {
    case "articles":
      return cardForArticles(item);
    case "tips":
      return cardForTips(item);
    case "facts":
      return cardForFacts(item);
    case "projects":
      return cardForProjects(item);
    case "resources":
      return cardForResources(item);
    default:
      return "";
  }
}

const PAGE_SIZE = 9;
let page = 1;

function getFilteredDocs() {
  const queryText = (searchInput?.value || "").trim().toLowerCase();
  const sortBy = sortSelect?.value || "newest";

  let docs = allDocs.filter((item) => {
    const matchSearch = !queryText || Object.values(item).map(v => String(v ?? "")).join(" ").toLowerCase().includes(queryText);
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  if (sortBy === "oldest") docs = [...docs].reverse();
  return docs;
}

function render() {
  const docs = getFilteredDocs();
  if (!docs.length) {
    renderState(searchInput?.value ? "No matching result found." : "No content yet. Add from admin panel.");
    document.getElementById("loadMoreWrap")?.remove();
    return;
  }

  const visible = docs.slice(0, page * PAGE_SIZE);
  grid.innerHTML = visible.map((doc) => renderCard(doc)).join("");

  // Load More button
  let wrap = document.getElementById("loadMoreWrap");
  if (visible.length < docs.length) {
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "loadMoreWrap";
      wrap.style.cssText = "text-align:center;margin-top:1.2rem";
      wrap.innerHTML = `<button class="btn soft" id="loadMoreBtn">Load More</button>`;
      grid.parentElement.appendChild(wrap);
      document.getElementById("loadMoreBtn").addEventListener("click", () => { page++; render(); });
    }
  } else {
    wrap?.remove();
  }
}

function bindCodeModal() {
  if (!codeModal) return;

  closeModalBtn?.addEventListener("click", () => codeModal.close());

  codeModal.addEventListener("click", (event) => {
    const modalRect = codeModal.querySelector("article")?.getBoundingClientRect();
    if (!modalRect) return;
    const inside =
      event.clientX >= modalRect.left &&
      event.clientX <= modalRect.right &&
      event.clientY >= modalRect.top &&
      event.clientY <= modalRect.bottom;

    if (!inside) codeModal.close();
  });

  grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-code]");
    if (!trigger) return;

    const name = trigger.getAttribute("data-name") || "Project";
    const code = decodeURIComponent(trigger.getAttribute("data-code") || "");

    modalTitle.textContent = `${name} source code`;
    modalCode.textContent = code;
    codeModal.showModal();
  });
}

searchInput?.addEventListener("input", () => { page = 1; render(); });
sortSelect?.addEventListener("change", () => { page = 1; render(); });

grid.addEventListener("click", e => {
  const src = e.target.closest("[data-src]");
  if (src) { e.preventDefault(); e.stopPropagation(); window.open(src.dataset.src, "_blank", "noopener"); }
});

const liveQuery = query(collection(db, collectionName), orderBy("createdAt", "desc"));
onSnapshot(
  liveQuery,
  (snapshot) => {
    allDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    if (liveStatus) {
      liveStatus.textContent = `Live - ${allDocs.length} item${allDocs.length === 1 ? "" : "s"}`;
    }

    errorBox.innerHTML = "";
    buildCategoryChips();
    render();
  },
  (error) => {
    if (liveStatus) liveStatus.textContent = "Connection error";
    errorBox.innerHTML = `<div class="toast error">Firebase error: ${escapeHtml(error.message)}</div>`;
  }
);

bindCodeModal();
initShellNavigation();
initRevealAnimations();
initNotifications();

// Back to Top
const btt = document.createElement("button");
btt.id = "backToTop"; btt.textContent = "↑"; btt.title = "Back to top";
document.body.appendChild(btt);
window.addEventListener("scroll", () => btt.classList.toggle("show", window.scrollY > 300));
btt.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// Flip card functionality for facts
window.flipFactCard = function(card, event) {
  event.preventDefault();
  event.stopPropagation();
  card.classList.toggle("flipped");
};

// Resource modal functions
window.openResourceModal = function(id) {
  const item = resourcesData[id];
  if (!item) return;
  
  // Create modal dynamically
  const existingModal = document.getElementById('resourceModalContainer');
  if (existingModal) existingModal.remove();
  
  const tags = item.tags ? item.tags.split(",").map(t => `<span class="card-tag">${escapeHtml(t.trim())}</span>`).join("") : "";
  const fullContent = item.body || item.description || "No detailed information available.";
  
  const modalHTML = `
    <div class="resource-modal active" id="resourceModalContainer" onclick="closeResourceModal()">
      <div class="resource-modal-content" onclick="event.stopPropagation()">
        <div class="resource-modal-header">
          <div>
            <div class="resource-modal-badges">
              ${item.type ? `<span class="badge badge-${item.type.toLowerCase()}">${escapeHtml(item.type)}</span>` : ""}
              ${item.category ? `<span class="badge">${escapeHtml(item.category)}</span>` : ""}
            </div>
            <h2 class="resource-modal-title">${escapeHtml(item.title || "Resource")}</h2>
          </div>
          <button class="resource-modal-close" onclick="closeResourceModal()">
            <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="resource-modal-body ql-editor">${fullContent}</div>
        ${tags ? `<div class="resource-modal-tags">${tags}</div>` : ""}
        ${item.url ? `<div class="resource-modal-footer">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="resource-modal-link">
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            Open Resource Link
          </a>
        </div>` : ""}
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
};

window.closeResourceModal = function() {
  const modal = document.getElementById('resourceModalContainer');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      document.body.style.overflow = '';
    }, 300);
  }
};

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeResourceModal();
  }
});
