import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');
const courseId = urlParams.get('course');
let exerciseParam = urlParams.get('exercise') || urlParams.get('id');

let allExercises = [];
let currentIndex = 0;
let completedExerciseKeys = new Set();
const COMPLETION_STORAGE_KEY = 'completedExercises';
let closeExerciseImageZoomActive = null;

function parseOrder(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => parseOrder(a.data()?.order) - parseOrder(b.data()?.order));
}

function buildExerciseUrl(exerciseUrlId) {
  return `exercise.html?category=${categoryId}&course=${courseId}&exercise=${encodeURIComponent(exerciseUrlId)}`;
}

function loadCompletedExerciseKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || '[]');
    completedExerciseKeys = new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
  } catch (error) {
    console.error('Error parsing completed exercises:', error);
    completedExerciseKeys = new Set();
  }
}

function persistCompletedExerciseKeys() {
  localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify([...completedExerciseKeys]));
}

function getCompletionKey(exercise) {
  return `${categoryId}_${courseId}_${exercise.urlId}`;
}

function getLegacyCompletionKey(exercise) {
  if (typeof exercise.urlId === 'string' && exercise.urlId.includes('__')) {
    const [topicId, exerciseId] = exercise.urlId.split('__');
    if (topicId && exerciseId) {
      return `${categoryId}_${courseId}_${topicId}_${exerciseId}`;
    }
  }
  return '';
}

function isExerciseCompleted(exercise) {
  if (!exercise) return false;
  const canonical = getCompletionKey(exercise);
  if (completedExerciseKeys.has(canonical)) return true;

  const legacy = getLegacyCompletionKey(exercise);
  return legacy ? completedExerciseKeys.has(legacy) : false;
}

function updateProgressUI() {
  const meta = document.getElementById('exerciseProgressMeta');
  const fill = document.getElementById('exerciseProgressFill');
  if (!meta || !fill) return;

  const total = allExercises.length;
  const completed = allExercises.filter((exercise) => isExerciseCompleted(exercise)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  meta.textContent = `${completed}/${total} completed (${percentage}%)`;
  fill.style.width = `${percentage}%`;
}

function updateMarkCompleteButton() {
  const button = document.getElementById('markComplete');
  if (!button) return;

  const currentExercise = allExercises[currentIndex];
  const completed = isExerciseCompleted(currentExercise);

  button.disabled = completed;
  button.textContent = completed ? 'Completed ✓' : 'Mark Complete';
}

function detectCodeLanguage(codeText = '') {
  const text = codeText.trim();
  if (!text) return 'javascript';
  if (text.includes('<?php')) return 'php';
  if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('</')) return 'markup';
  if (text.includes('SELECT ') || text.includes('INSERT ') || text.includes('UPDATE ')) return 'sql';
  if (text.includes('def ') || text.includes('import ') && text.includes('from ')) return 'python';
  if (text.includes('public class') || text.includes('System.out')) return 'java';
  if (text.includes('interface ') || text.includes(': string') || text.includes(': number')) return 'typescript';
  if (text.includes('function ') || text.includes('const ') || text.includes('let ') || text.includes('=>')) return 'javascript';
  return 'javascript';
}

function resolveLanguage(codeElement, preElement) {
  const codeClass = codeElement.className || '';
  const preClass = preElement.className || '';
  const classValue = `${codeClass} ${preClass}`;
  const directLang = classValue.match(/language-([a-z0-9-]+)/i)?.[1];
  if (directLang) return directLang.toLowerCase();
  return detectCodeLanguage(codeElement.textContent || preElement.textContent || '');
}

function enhanceExerciseCodeBlocks(container) {
  if (!container) return;

  const preBlocks = [...container.querySelectorAll('pre')];
  preBlocks.forEach((pre) => {
    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      code.textContent = pre.textContent || '';
      pre.innerHTML = '';
      pre.appendChild(code);
    }

    const language = resolveLanguage(code, pre);
    code.className = `language-${language}`;

    if (window.Prism && typeof window.Prism.highlightElement === 'function') {
      window.Prism.highlightElement(code);
    }

    let wrapper = pre.closest('.exercise-code-wrap');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'exercise-code-wrap';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    }

    if (wrapper.querySelector('.exercise-copy-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exercise-copy-btn';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent || '');
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 1600);
      } catch (error) {
        console.error('Copy failed:', error);
        button.textContent = 'Failed';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 1600);
      }
    });
    wrapper.appendChild(button);
  });
}

function enableExerciseImageZoom(container) {
  if (!container) return;

  const images = [...container.querySelectorAll('img')];
  images.forEach((img) => {
    if (img.dataset.zoomReady === '1') return;
    img.dataset.zoomReady = '1';
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      const source = img.currentSrc || img.src;
      if (!source) return;
      openExerciseImageZoom(source, img.alt || 'Exercise image');
    });
  });
}

function openExerciseImageZoom(src, alt = '') {
  if (!src) return;
  if (typeof closeExerciseImageZoomActive === 'function') {
    closeExerciseImageZoomActive();
  }

  const overlay = document.createElement('div');
  overlay.className = 'image-zoom-overlay';
  overlay.innerHTML = `
    <button class="image-zoom-close" aria-label="Close image">x</button>
    <div class="image-zoom-content">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
    </div>
    <div class="image-zoom-controls" role="group" aria-label="Image zoom controls">
      <button class="image-zoom-btn" data-action="zoom-out" aria-label="Zoom out">-</button>
      <button class="image-zoom-btn" data-action="reset" aria-label="Reset zoom">Reset</button>
      <button class="image-zoom-btn" data-action="zoom-in" aria-label="Zoom in">+</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  const image = overlay.querySelector('img');
  const content = overlay.querySelector('.image-zoom-content');
  const closeBtn = overlay.querySelector('.image-zoom-close');
  const controls = [...overlay.querySelectorAll('.image-zoom-btn')];
  if (!image || !content || !closeBtn) {
    closeExerciseImageZoom(overlay);
    return;
  }

  let scale = 1;
  let x = 0;
  let y = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialDistance = 0;
  let initialScale = 1;
  let closed = false;

  const clampScale = (value) => Math.min(Math.max(value, 1), 5);

  const applyTransform = () => {
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  const reset = () => {
    scale = 1;
    x = 0;
    y = 0;
    applyTransform();
  };

  const zoom = (delta) => {
    scale = clampScale(scale + delta);
    if (scale === 1) {
      x = 0;
      y = 0;
    }
    applyTransform();
  };

  const distance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const onMouseMove = (event) => {
    if (!isDragging) return;
    x = event.clientX - startX;
    y = event.clientY - startY;
    applyTransform();
  };

  const onMouseUp = () => {
    isDragging = false;
    image.classList.remove('dragging');
  };

  const onWheel = (event) => {
    event.preventDefault();
    zoom(event.deltaY < 0 ? 0.28 : -0.28);
  };

  const onImageMouseDown = (event) => {
    if (scale <= 1) return;
    isDragging = true;
    startX = event.clientX - x;
    startY = event.clientY - y;
    image.classList.add('dragging');
    event.preventDefault();
  };

  const onImageDoubleClick = (event) => {
    event.preventDefault();
    if (scale > 1) {
      reset();
    } else {
      scale = 2;
      applyTransform();
    }
  };

  const onTouchStart = (event) => {
    if (event.touches.length === 2) {
      initialDistance = distance(event.touches);
      initialScale = scale;
      event.preventDefault();
      return;
    }
    if (event.touches.length === 1 && scale > 1) {
      isDragging = true;
      startX = event.touches[0].clientX - x;
      startY = event.touches[0].clientY - y;
      event.preventDefault();
    }
  };

  const onTouchMove = (event) => {
    if (event.touches.length === 2) {
      const currentDistance = distance(event.touches);
      if (initialDistance > 0) {
        scale = clampScale(initialScale * (currentDistance / initialDistance));
        if (scale === 1) {
          x = 0;
          y = 0;
        }
        applyTransform();
      }
      event.preventDefault();
      return;
    }
    if (event.touches.length === 1 && isDragging && scale > 1) {
      x = event.touches[0].clientX - startX;
      y = event.touches[0].clientY - startY;
      applyTransform();
      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    isDragging = false;
    image.classList.remove('dragging');
    if (scale < 1) reset();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') close();
  };

  const onOverlayClick = (event) => {
    if (event.target === overlay && scale === 1) close();
  };

  const onControlClick = (event) => {
    const action = event.currentTarget.dataset.action;
    if (action === 'zoom-in') zoom(0.28);
    if (action === 'zoom-out') zoom(-0.28);
    if (action === 'reset') reset();
  };

  const cleanup = () => {
    content.removeEventListener('wheel', onWheel);
    image.removeEventListener('mousedown', onImageMouseDown);
    image.removeEventListener('dblclick', onImageDoubleClick);
    image.removeEventListener('touchstart', onTouchStart);
    image.removeEventListener('touchmove', onTouchMove);
    image.removeEventListener('touchend', onTouchEnd);
    closeBtn.removeEventListener('click', close);
    overlay.removeEventListener('click', onOverlayClick);
    controls.forEach((btn) => btn.removeEventListener('click', onControlClick));
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('keydown', onKeyDown);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    cleanup();
    closeExerciseImageZoom(overlay);
    closeExerciseImageZoomActive = null;
  };

  closeExerciseImageZoomActive = close;

  content.addEventListener('wheel', onWheel, { passive: false });
  image.addEventListener('mousedown', onImageMouseDown);
  image.addEventListener('dblclick', onImageDoubleClick);
  image.addEventListener('touchstart', onTouchStart, { passive: false });
  image.addEventListener('touchmove', onTouchMove, { passive: false });
  image.addEventListener('touchend', onTouchEnd, { passive: true });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', onOverlayClick);
  controls.forEach((btn) => btn.addEventListener('click', onControlClick));
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}

function closeExerciseImageZoom(overlay) {
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (overlay.isConnected) overlay.remove();
  }, 220);
}

async function loadBreadcrumb() {
  try {
    const [catDoc, courseDoc] = await Promise.all([
      getDoc(doc(db, 'learning_categories', categoryId)),
      getDoc(doc(db, `learning_categories/${categoryId}/courses`, courseId))
    ]);

    if (catDoc.exists()) {
      document.getElementById('breadCategory').textContent = catDoc.data().name;
      document.getElementById('breadCategory').href = `courses.html?category=${categoryId}`;
    }

    if (courseDoc.exists()) {
      const course = courseDoc.data();
      document.getElementById('breadCourse').textContent = course.name;
      document.getElementById('breadCourse').href = `exercises.html?category=${categoryId}&course=${courseId}`;
    }
  } catch (error) {
    console.error('Error loading breadcrumb:', error);
  }
}

async function loadDirectExercises() {
  const directSnap = await getDocs(
    collection(db, `learning_categories/${categoryId}/courses/${courseId}/exercises`)
  );
  const directDocs = sortDocsByOrder(directSnap.docs);

  return directDocs.map((docSnap) => {
    const exercise = docSnap.data();
    return {
      id: docSnap.id,
      urlId: docSnap.id,
      title: exercise.title || 'Untitled Exercise',
      content: exercise.content || '',
      views: exercise.views || 0,
      order: parseOrder(exercise.order),
      path: `learning_categories/${categoryId}/courses/${courseId}/exercises/${docSnap.id}`
    };
  });
}

async function loadLegacyExercises() {
  const topicsSnap = await getDocs(
    collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics`)
  );
  const topicDocs = sortDocsByOrder(topicsSnap.docs);

  const legacyExercises = [];

  for (const topicDoc of topicDocs) {
    const topicData = topicDoc.data();
    const exerciseSnap = await getDocs(
      collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicDoc.id}/exercises`)
    );
    const exerciseDocs = sortDocsByOrder(exerciseSnap.docs);

    for (const exerciseDoc of exerciseDocs) {
      const exercise = exerciseDoc.data();
      legacyExercises.push({
        id: exerciseDoc.id,
        urlId: `${topicDoc.id}__${exerciseDoc.id}`,
        title: exercise.title || 'Untitled Exercise',
        content: exercise.content || '',
        views: exercise.views || 0,
        order: parseOrder(exercise.order),
        topicOrder: parseOrder(topicData.order),
        topicName: topicData.name || '',
        path: `learning_categories/${categoryId}/courses/${courseId}/topics/${topicDoc.id}/exercises/${exerciseDoc.id}`
      });
    }
  }

  return legacyExercises.sort((a, b) => {
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    return a.order - b.order;
  });
}

function renderExerciseList() {
  const nav = document.getElementById('exercisesNav');
  nav.innerHTML = '';

  allExercises.forEach((exercise, index) => {
    const completed = isExerciseCompleted(exercise);
    const item = document.createElement('a');
    item.href = buildExerciseUrl(exercise.urlId);
    item.className = `exercise-nav-item ${index === currentIndex ? 'active' : ''} ${completed ? 'completed' : ''}`.trim();
    item.innerHTML = `
      <span class="exercise-nav-main">
        <span>${index + 1}.</span>
        <span class="exercise-nav-title">${escapeHtml(exercise.title)}</span>
      </span>
      ${completed ? '<span class="exercise-nav-check" aria-hidden="true">✓</span>' : ''}
    `;
    nav.appendChild(item);
  });
}

async function renderCurrentExercise() {
  const content = document.getElementById('exerciseContent');

  if (!allExercises.length) {
    content.innerHTML = '<div class="loading">No exercises found for this course.</div>';
    return;
  }

  const exercise = allExercises[currentIndex];
  document.getElementById('exerciseName').textContent = exercise.title;
  document.title = `${exercise.title} - Code Cloner`;

  content.innerHTML = `
    <h1>${escapeHtml(exercise.title)}</h1>
    <div class="exercise-body ql-editor">
      ${exercise.content || '<p>No content available.</p>'}
    </div>
  `;
  const exerciseBody = content.querySelector('.exercise-body');
  enhanceExerciseCodeBlocks(exerciseBody);
  enableExerciseImageZoom(exerciseBody);

  document.getElementById('prevExercise').disabled = currentIndex === 0;
  document.getElementById('nextExercise').disabled = currentIndex === allExercises.length - 1;
  updateMarkCompleteButton();

  try {
    await updateDoc(doc(db, exercise.path), { views: increment(1) });
  } catch (error) {
    console.error('Error updating views:', error);
  }
}

function syncUrlWithCurrentExercise() {
  const exercise = allExercises[currentIndex];
  if (!exercise) return;
  history.replaceState({}, '', buildExerciseUrl(exercise.urlId));
}

async function loadExercises() {
  const nav = document.getElementById('exercisesNav');
  nav.innerHTML = '<div class="loading">Loading exercises...</div>';

  try {
    const directExercises = await loadDirectExercises();
    allExercises = directExercises.length ? directExercises : await loadLegacyExercises();

    if (!allExercises.length) {
      nav.innerHTML = '<div class="loading">No exercises found yet.</div>';
      document.getElementById('exerciseContent').innerHTML = '<div class="loading">No exercise content available.</div>';
      document.getElementById('toggleSidebar').disabled = true;
      document.getElementById('prevExercise').disabled = true;
      document.getElementById('nextExercise').disabled = true;
      document.getElementById('markComplete').disabled = true;
      document.getElementById('markComplete').textContent = 'Mark Complete';
      updateProgressUI();
      return;
    }

    const explicitIndex = allExercises.findIndex((exercise) => exercise.urlId === exerciseParam);
    const legacyIndex = allExercises.findIndex((exercise) => exercise.id === exerciseParam);

    if (explicitIndex >= 0) {
      currentIndex = explicitIndex;
    } else if (legacyIndex >= 0) {
      currentIndex = legacyIndex;
    } else {
      currentIndex = 0;
    }

    exerciseParam = allExercises[currentIndex].urlId;
    renderExerciseList();
    updateProgressUI();
    await renderCurrentExercise();
    syncUrlWithCurrentExercise();
  } catch (error) {
    console.error('Error loading exercises:', error);
    nav.innerHTML = '<div class="loading">Error loading exercises.</div>';
    document.getElementById('exerciseContent').innerHTML = '<div class="loading">Error loading exercise.</div>';
  }
}

function openExerciseSidebar() {
  document.getElementById('exerciseSidebar').classList.add('active');
  document.getElementById('exerciseNavOverlay')?.classList.add('show');
}

function closeExerciseSidebar() {
  document.getElementById('exerciseSidebar').classList.remove('active');
  document.getElementById('exerciseNavOverlay')?.classList.remove('show');
}

function setupExerciseNavigation() {
  document.getElementById('prevExercise').addEventListener('click', async () => {
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    renderExerciseList();
    await renderCurrentExercise();
    syncUrlWithCurrentExercise();
  });

  document.getElementById('nextExercise').addEventListener('click', async () => {
    if (currentIndex >= allExercises.length - 1) return;
    currentIndex += 1;
    renderExerciseList();
    await renderCurrentExercise();
    syncUrlWithCurrentExercise();
  });

  document.getElementById('markComplete').addEventListener('click', () => {
    const exercise = allExercises[currentIndex];
    if (!exercise) return;
    if (isExerciseCompleted(exercise)) return;

    completedExerciseKeys.add(getCompletionKey(exercise));
    persistCompletedExerciseKeys();
    renderExerciseList();
    updateProgressUI();
    updateMarkCompleteButton();
    alert('Exercise marked as complete.');
  });
}

function setupSidebarToggles() {
  document.getElementById('toggleSidebar')?.addEventListener('click', openExerciseSidebar);
  document.getElementById('closeSidebar')?.addEventListener('click', closeExerciseSidebar);
  document.getElementById('exerciseNavOverlay')?.addEventListener('click', closeExerciseSidebar);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeExerciseSidebar();
    }
  });
}

function setupTopDrawer() {
  const openDrawer = document.getElementById('openDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const drawer = document.getElementById('sideDrawer');
  const overlay = document.getElementById('drawerOverlay');

  if (openDrawer) {
    openDrawer.addEventListener('click', () => {
      drawer.classList.add('open');
      overlay.classList.add('show');
    });
  }

  if (closeDrawer) {
    closeDrawer.addEventListener('click', () => {
      drawer.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      drawer.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

if (!categoryId || !courseId) {
  window.location.href = 'learning.html';
} else {
  loadCompletedExerciseKeys();
  setupTopDrawer();
  setupSidebarToggles();
  setupExerciseNavigation();
  loadBreadcrumb();
  loadExercises();
}
