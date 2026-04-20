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
    </div>
    <div class="re-body" contenteditable="true" spellcheck="true"></div>
  `;

  const toolbar = container.querySelector(".re-toolbar");
  const body = container.querySelector(".re-body");
  const blockSel = container.querySelector("#re-block-sel");
  const fgColor = container.querySelector("#re-fgcolor");

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
