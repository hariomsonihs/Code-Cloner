export function createEditor(container, placeholder = "Write here...") {
  container.innerHTML = `
    <div class="re-toolbar">
      <button type="button" data-cmd="undo" title="Undo">↩</button>
      <button type="button" data-cmd="redo" title="Redo">↪</button>
      <span class="re-sep"></span>
      <select class="re-select" id="re-block-sel">
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="blockquote">Blockquote</option>
        <option value="pre">Code Block</option>
      </select>
      <span class="re-sep"></span>
      <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
      <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
      <button type="button" data-cmd="strikeThrough" title="Strike"><s>S</s></button>
      <span class="re-sep"></span>
      <label class="re-color-label" title="Text Color">A <input type="color" id="re-fgcolor" value="#111827"/></label>
      <span class="re-sep"></span>
      <button type="button" data-cmd="insertUnorderedList" title="Bullet List">• List</button>
      <button type="button" data-cmd="insertOrderedList" title="Numbered List">1. List</button>
      <span class="re-sep"></span>
      <button type="button" data-cmd="indent" title="Indent">⇥</button>
      <button type="button" data-cmd="outdent" title="Outdent">⇤</button>
      <span class="re-sep"></span>
      <button type="button" data-cmd="removeFormat" title="Clear Format">✕</button>
      <span class="re-sep"></span>
      <button type="button" id="re-img-url-btn" title="Insert Image from URL">🌐 Img URL</button>
      <label class="re-upload-label" title="Upload Image">
        📁 Upload
        <input type="file" id="re-img-upload" accept="image/*" style="display:none"/>
      </label>
    </div>
    <div class="re-body" contenteditable="true" spellcheck="true"></div>
  `;

  const toolbar = container.querySelector(".re-toolbar");
  const body = container.querySelector(".re-body");
  const blockSel = container.querySelector("#re-block-sel");
  const fgColor = container.querySelector("#re-fgcolor");
  const imgUrlBtn = container.querySelector("#re-img-url-btn");
  const imgUpload = container.querySelector("#re-img-upload");

  // ── Image from URL ──
  imgUrlBtn.addEventListener("click", () => {
    const url = prompt("Image URL daalo:");
    if (!url) return;
    restoreSelection();
    document.execCommand("insertHTML", false, `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0" alt="image"/>`);
    saveSelection();
  });

  // ── Image Upload to Firebase Storage ──
  imgUpload.addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    const label = container.querySelector(".re-upload-label");
    label.textContent = "Uploading...";
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js");
      const { getApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
      const storage = getStorage(getApp());
      const storageRef = ref(storage, `post-images/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      restoreSelection();
      document.execCommand("insertHTML", false, `<img src="${downloadURL}" style="max-width:100%;border-radius:8px;margin:8px 0" alt="image"/>`);
      saveSelection();
    } catch (e) {
      alert("Image upload failed: " + e.message);
    } finally {
      label.textContent = "📁 Upload";
      this.value = "";
    }
  });

  // Set placeholder via CSS attr
  body.setAttribute("data-placeholder", placeholder);

  let savedRange = null;
  let onChangeCb = null;

  // Save selection whenever user interacts with editor
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Only save if range is inside our editor body
      if (body.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
  }

  // Restore saved selection back into editor
  function restoreSelection() {
    body.focus();
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  body.addEventListener("keyup", saveSelection);
  body.addEventListener("mouseup", saveSelection);
  body.addEventListener("input", () => { saveSelection(); if (onChangeCb) onChangeCb(); });

  // Toolbar button clicks
  toolbar.addEventListener("mousedown", e => {
    const btn = e.target.closest("[data-cmd]");
    if (!btn) return;
    e.preventDefault(); // prevent editor losing focus
    restoreSelection();
    document.execCommand(btn.dataset.cmd, false, null);
    saveSelection();
  });

  // Block format select
  blockSel.addEventListener("mousedown", () => saveSelection());
  blockSel.addEventListener("change", function () {
    restoreSelection();
    document.execCommand("formatBlock", false, this.value);
    saveSelection();
  });

  // Color picker
  fgColor.addEventListener("mousedown", () => saveSelection());
  fgColor.addEventListener("input", function () {
    restoreSelection();
    document.execCommand("foreColor", false, this.value);
    saveSelection();
  });

  return {
    getHTML() { return body.innerHTML; },
    setHTML(html) { body.innerHTML = html || ""; },
    onChange(cb) { onChangeCb = cb; },
    focus() { body.focus(); }
  };
}
