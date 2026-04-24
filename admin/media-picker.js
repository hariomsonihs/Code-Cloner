const IMGBB_API_KEY = "fccbe0d61aa2c365cf710c34f0e8cd38";

let mediaPickerCallback = null;
let firebaseApp = null;

export function initMediaPicker(app) {
  firebaseApp = app;
}

export function openMediaPicker(callback) {
  mediaPickerCallback = callback;
  
  const modal = document.createElement("div");
  modal.id = "mediaPickerModal";
  modal.style.cssText = `position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);padding:1rem`;
  
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:900px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <!-- Header -->
      <div style="padding:1.2rem 1.5rem;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between">
        <h2 style="font-size:1.1rem;font-weight:700;margin:0">🖼️ Select or Upload Image</h2>
        <button id="closeMediaPicker" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#999;line-height:1">&times;</button>
      </div>
      
      <!-- Tabs -->
      <div style="display:flex;gap:.5rem;padding:.8rem 1.5rem;border-bottom:1px solid #e5e7eb">
        <button class="media-tab active" data-tab="library" style="padding:.5rem 1rem;border:none;background:#f3f4f6;border-radius:8px;cursor:pointer;font-weight:600;font-size:.88rem">📚 Media Library</button>
        <button class="media-tab" data-tab="url" style="padding:.5rem 1rem;border:none;background:transparent;border-radius:8px;cursor:pointer;font-weight:600;font-size:.88rem;color:#666">🌐 URL</button>
        <button class="media-tab" data-tab="upload" style="padding:.5rem 1rem;border:none;background:transparent;border-radius:8px;cursor:pointer;font-weight:600;font-size:.88rem;color:#666">📤 Upload</button>
      </div>
      
      <!-- Content -->
      <div style="flex:1;overflow-y:auto;padding:1.5rem">
        <!-- Media Library Tab -->
        <div id="libraryTab" class="tab-content">
          <div id="libraryGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem"></div>
        </div>
        
        <!-- URL Tab -->
        <div id="urlTab" class="tab-content" style="display:none">
          <label style="display:block;font-size:.88rem;font-weight:600;margin-bottom:.5rem;color:#333">Image URL</label>
          <input type="text" id="imageUrlInput" placeholder="https://example.com/image.jpg" style="width:100%;padding:.7rem;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;margin-bottom:1rem"/>
          <div id="urlPreview" style="display:none;margin-top:1rem">
            <img id="urlPreviewImg" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #e5e7eb"/>
          </div>
        </div>
        
        <!-- Upload Tab -->
        <div id="uploadTab" class="tab-content" style="display:none">
          <label style="display:block;font-size:.88rem;font-weight:600;margin-bottom:.5rem;color:#333">Upload Image to ImgBB</label>
          <input type="file" id="imageFileInput" accept="image/*" style="width:100%;padding:.7rem;border:1.5px solid #ddd;border-radius:8px;font-size:.9rem;margin-bottom:1rem"/>
          <div id="uploadProgress" style="display:none;margin-top:1rem">
            <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:.5rem">
              <div id="uploadProgressBar" style="background:linear-gradient(90deg,#3cc8a7,#5f8eff);height:100%;width:0%;transition:width .3s"></div>
            </div>
            <p id="uploadProgressText" style="font-size:.82rem;color:#666;text-align:center">Uploading...</p>
          </div>
          <div id="uploadPreview" style="display:none;margin-top:1rem">
            <img id="uploadPreviewImg" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #e5e7eb"/>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding:1rem 1.5rem;border-top:1px solid #e5e7eb;display:flex;gap:.5rem;justify-content:flex-end">
        <button id="cancelMediaPicker" style="padding:.6rem 1.2rem;border:none;background:#f3f4f6;border-radius:8px;cursor:pointer;font-weight:600;font-size:.88rem">Cancel</button>
        <button id="selectMediaBtn" style="padding:.6rem 1.2rem;border:none;background:linear-gradient(115deg,#3cc8a7,#5f8eff);color:#fff;border-radius:8px;cursor:pointer;font-weight:600;font-size:.88rem">Select Image</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  let selectedUrl = "";
  
  // Load media library from Firestore
  loadMediaLibrary(modal);
  
  // Tab switching
  modal.querySelectorAll(".media-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      modal.querySelectorAll(".media-tab").forEach(t => {
        t.classList.remove("active");
        t.style.background = "transparent";
        t.style.color = "#666";
      });
      tab.classList.add("active");
      tab.style.background = "#f3f4f6";
      tab.style.color = "#000";
      
      const tabName = tab.dataset.tab;
      modal.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
      modal.getElementById(tabName + "Tab").style.display = "block";
    });
  });
  
  // URL input preview
  const urlInput = modal.querySelector("#imageUrlInput");
  urlInput.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      selectedUrl = url;
      const preview = modal.querySelector("#urlPreview");
      const img = modal.querySelector("#urlPreviewImg");
      img.src = url;
      preview.style.display = "block";
    } else {
      modal.querySelector("#urlPreview").style.display = "none";
      selectedUrl = "";
    }
  });
  
  // File upload
  const fileInput = modal.querySelector("#imageFileInput");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    
    const progress = modal.querySelector("#uploadProgress");
    const progressBar = modal.querySelector("#uploadProgressBar");
    const progressText = modal.querySelector("#uploadProgressText");
    const preview = modal.querySelector("#uploadPreview");
    const previewImg = modal.querySelector("#uploadPreviewImg");
    
    progress.style.display = "block";
    progressBar.style.width = "30%";
    progressText.textContent = "Uploading to ImgBB...";
    
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: form
      });
      const json = await res.json();
      
      if (!json.success) throw new Error(json.error?.message || "Upload failed");
      
      progressBar.style.width = "100%";
      progressText.textContent = "Upload complete!";
      
      selectedUrl = json.data.url;
      previewImg.src = json.data.url;
      preview.style.display = "block";
      
      setTimeout(() => {
        progress.style.display = "none";
        progressBar.style.width = "0%";
      }, 1000);
    } catch (e) {
      progressText.textContent = "❌ " + e.message;
      progressText.style.color = "#ef4444";
      setTimeout(() => {
        progress.style.display = "none";
        progressBar.style.width = "0%";
        progressText.style.color = "#666";
      }, 3000);
    }
  });
  
  // Close modal
  const closeModal = () => {
    modal.remove();
    mediaPickerCallback = null;
  };
  
  modal.querySelector("#closeMediaPicker").addEventListener("click", closeModal);
  modal.querySelector("#cancelMediaPicker").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Select button
  modal.querySelector("#selectMediaBtn").addEventListener("click", () => {
    if (selectedUrl && mediaPickerCallback) {
      mediaPickerCallback(selectedUrl);
      closeModal();
    } else {
      alert("Please select an image first");
    }
  });
  
  // Media library item click
  modal.addEventListener("click", (e) => {
    const item = e.target.closest(".library-item");
    if (item) {
      modal.querySelectorAll(".library-item").forEach(i => i.style.border = "2px solid #e5e7eb");
      item.style.border = "2px solid #3cc8a7";
      selectedUrl = item.dataset.url;
    }
  });
}

async function loadMediaLibrary(modal) {
  if (!firebaseApp) return;
  
  const grid = modal.querySelector("#libraryGrid");
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#999">Loading...</div>`;
  
  try {
    const { getFirestore, collection, query, orderBy, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
    const db = getFirestore(firebaseApp);
    
    onSnapshot(query(collection(db, "media"), orderBy("uploadedAt", "desc")), snap => {
      const media = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!media.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#999">
          <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;opacity:.3;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <p>No images in library</p>
          <p style="font-size:.8rem;margin-top:.5rem">Upload images from Media page first</p>
        </div>`;
        return;
      }
      
      grid.innerHTML = media.map(m => `
        <div class="library-item" data-url="${esc(m.url)}" style="border:2px solid #e5e7eb;border-radius:8px;overflow:hidden;cursor:pointer;transition:all .2s">
          <div style="aspect-ratio:16/9;background:#f3f4f6;overflow:hidden">
            <img src="${esc(m.thumbUrl || m.url)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover"/>
          </div>
          <div style="padding:.5rem;font-size:.75rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.name)}">${esc(m.name)}</div>
        </div>
      `).join("");
    });
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#ef4444">Error loading media: ${e.message}</div>`;
  }
}

function esc(t) {
  return String(t ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
