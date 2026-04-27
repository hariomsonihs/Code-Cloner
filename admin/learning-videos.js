import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let categories = [];
let videos = [];
let editingVideoId = null;
let selectedCategoryId = '';
let selectedCourseId = '';

function parseOrder(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => parseOrder(a.data()?.order) - parseOrder(b.data()?.order));
}

function getYouTubeVideoId(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const candidate = parsed.pathname.split('/').filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery && /^[A-Za-z0-9_-]{11}$/.test(fromQuery)) {
        return fromQuery;
      }

      const segments = parsed.pathname.split('/').filter(Boolean);
      const markerIndex = segments.findIndex((part) => ['embed', 'shorts', 'live', 'v'].includes(part));
      if (markerIndex !== -1 && segments[markerIndex + 1] && /^[A-Za-z0-9_-]{11}$/.test(segments[markerIndex + 1])) {
        return segments[markerIndex + 1];
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function encodeCloudinaryPublicId(publicId) {
  return String(publicId)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeCloudinaryUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host.includes('player.cloudinary.com') && path.includes('/embed')) {
      const cloudName = parsed.searchParams.get('cloud_name');
      const publicId = parsed.searchParams.get('public_id');

      if (cloudName && publicId) {
        const safePublicId = encodeCloudinaryPublicId(publicId);
        return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/upload/${safePublicId}.mp4`;
      }
    }
  } catch (error) {
    return rawUrl;
  }

  return rawUrl;
}

function getGoogleDriveFileId(url) {
  if (!url) return null;
  const raw = String(url).trim();

  const patternMatches = [
    raw.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/),
    raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/),
    raw.match(/\/d\/([A-Za-z0-9_-]{10,})/)
  ];

  for (const match of patternMatches) {
    if (match && match[1]) return match[1];
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('drive.google.com') && !host.includes('docs.google.com')) {
      return null;
    }

    const idFromQuery = parsed.searchParams.get('id');
    if (idFromQuery && /^[A-Za-z0-9_-]{10,}$/.test(idFromQuery)) {
      return idFromQuery;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function normalizeGoogleDriveUrl(rawUrl) {
  const fileId = getGoogleDriveFileId(rawUrl);
  if (!fileId) return rawUrl;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function normalizeVideoUrl(rawUrl) {
  return normalizeGoogleDriveUrl(normalizeCloudinaryUrl(rawUrl));
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function setGridMessage(message, color = 'var(--muted)') {
  document.getElementById('videosGrid').innerHTML = `
    <div class="empty-state" style="grid-column:1 / -1;color:${color}">
      <p>${message}</p>
    </div>
  `;
}

function initShellUI() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}

function applyCoursesToSelect(selectEl, courseDocs, placeholder = 'Select Course') {
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  courseDocs.forEach((courseDoc) => {
    const course = courseDoc.data();
    const option = document.createElement('option');
    option.value = courseDoc.id;
    option.textContent = `${course.icon || ''} ${course.name}`.trim();
    selectEl.appendChild(option);
  });
}

async function getCoursesForCategory(categoryId) {
  if (!categoryId) return [];
  const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses`));
  return sortDocsByOrder(snapshot.docs);
}

async function loadCategories() {
  try {
    const snap = await getDocs(collection(db, 'learning_categories'));
    categories = sortDocsByOrder(snap.docs).map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    const filterCategory = document.getElementById('filterCategory');
    const videoCategory = document.getElementById('videoCategory');

    filterCategory.innerHTML = '<option value="">Select a category</option>';
    videoCategory.innerHTML = '<option value="">Select Category</option>';

    categories.forEach((cat) => {
      const label = `${cat.icon || ''} ${cat.name}`.trim();
      filterCategory.innerHTML += `<option value="${cat.id}">${label}</option>`;
      videoCategory.innerHTML += `<option value="${cat.id}">${label}</option>`;
    });

    setGridMessage('Select a course to load videos.');
  } catch (error) {
    console.error('Error loading categories:', error);
    setGridMessage('Failed to load categories.', 'var(--red)');
  }
}

async function loadFilterCourses(categoryId) {
  const filterCourse = document.getElementById('filterCourse');

  if (!categoryId) {
    filterCourse.disabled = true;
    filterCourse.innerHTML = '<option value="">Select category first</option>';
    return;
  }

  filterCourse.disabled = false;
  filterCourse.innerHTML = '<option value="">Loading...</option>';

  try {
    const courseDocs = await getCoursesForCategory(categoryId);
    applyCoursesToSelect(filterCourse, courseDocs, 'Select a course');
  } catch (error) {
    console.error('Error loading filter courses:', error);
    filterCourse.innerHTML = '<option value="">Failed to load courses</option>';
  }
}

async function loadModalCourses(categoryId, selectedCourse = '') {
  const videoCourse = document.getElementById('videoCourse');

  if (!categoryId) {
    videoCourse.innerHTML = '<option value="">Select Course</option>';
    return;
  }

  videoCourse.innerHTML = '<option value="">Loading...</option>';

  try {
    const courseDocs = await getCoursesForCategory(categoryId);
    applyCoursesToSelect(videoCourse, courseDocs, 'Select Course');
    if (selectedCourse) {
      videoCourse.value = selectedCourse;
    }
  } catch (error) {
    console.error('Error loading modal courses:', error);
    videoCourse.innerHTML = '<option value="">Failed to load courses</option>';
  }
}

async function loadVideos() {
  if (!selectedCategoryId || !selectedCourseId) {
    setGridMessage('Select a category and course to view videos.');
    return;
  }

  const grid = document.getElementById('videosGrid');
  grid.innerHTML = '<div class="empty-state" style="grid-column:1 / -1"><p>Loading videos...</p></div>';

  try {
    const q = query(
      collection(db, `learning_categories/${selectedCategoryId}/courses/${selectedCourseId}/videos`),
      orderBy('order', 'asc')
    );

    const snap = await getDocs(q);
    videos = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    if (!videos.length) {
      setGridMessage('No videos found. Click Add Video to create one.');
      return;
    }

    grid.innerHTML = videos.map((video) => {
      const description = video.description ? `<p class="video-card-desc">${video.description}</p>` : '';
      const durationBadge = video.duration ? `<span class="badge badge-orange">${video.duration}</span>` : '';
      const relatedBadge = video.relatedToExercise ? '<span class="badge badge-blue">Related to exercise</span>' : '';
      const safeOrder = parseOrder(video.order);

      return `
        <article class="video-card">
          <div class="video-card-head">
            <h3 class="video-card-title">${video.title || 'Untitled Video'}</h3>
            <span class="badge badge-gray">Order ${safeOrder}</span>
          </div>
          ${description}
          <div class="video-meta">
            ${durationBadge}
            ${relatedBadge}
          </div>
          <div class="video-actions">
            <a href="${video.url}" target="_blank" class="btn btn-soft btn-sm">Watch</a>
            <button type="button" class="btn btn-soft btn-sm" onclick="editVideo('${video.id}')">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="deleteVideo('${video.id}')">Delete</button>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading videos:', error);
    setGridMessage('Error loading videos.', 'var(--red)');
  }
}

async function openModal(videoId = null) {
  const modal = document.getElementById('videoModal');
  const modalTitle = document.getElementById('modalTitle');
  const form = document.getElementById('videoForm');
  const videoCategoryField = document.getElementById('videoCategory');
  const videoCourseField = document.getElementById('videoCourse');

  editingVideoId = videoId;

  if (videoId) {
    const video = videos.find((item) => item.id === videoId);
    if (!video) return;

    modalTitle.textContent = 'Edit Video';
    videoCategoryField.value = selectedCategoryId;
    await loadModalCourses(selectedCategoryId, selectedCourseId);
    videoCategoryField.disabled = true;
    videoCourseField.disabled = true;

    document.getElementById('videoTitle').value = video.title || '';
    document.getElementById('videoUrl').value = video.url || '';
    document.getElementById('videoDescription').value = video.description || '';
    document.getElementById('videoDuration').value = video.duration || '';
    document.getElementById('videoOrder').value = parseOrder(video.order);
    document.getElementById('videoRelated').checked = !!video.relatedToExercise;
  } else {
    modalTitle.textContent = 'Add Video';
    form.reset();

    videoCategoryField.value = selectedCategoryId || '';
    await loadModalCourses(selectedCategoryId, selectedCourseId);
    videoCategoryField.disabled = false;
    videoCourseField.disabled = false;
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('videoModal').style.display = 'none';
  document.getElementById('videoForm').reset();
  document.getElementById('videoCategory').disabled = false;
  document.getElementById('videoCourse').disabled = false;
  editingVideoId = null;
}

async function saveVideo(event) {
  event.preventDefault();

  const categoryId = document.getElementById('videoCategory').value;
  const courseId = document.getElementById('videoCourse').value;
  const title = document.getElementById('videoTitle').value.trim();
  const rawUrl = document.getElementById('videoUrl').value.trim();
  const url = normalizeVideoUrl(rawUrl);
  const description = document.getElementById('videoDescription').value.trim();
  const duration = document.getElementById('videoDuration').value.trim();
  const order = parseOrder(document.getElementById('videoOrder').value);
  const relatedToExercise = document.getElementById('videoRelated').checked;

  if (!categoryId || !courseId || !title || !url) {
    alert('Please fill all required fields.');
    return;
  }

  if (!isValidHttpUrl(url)) {
    alert('Please enter a valid video URL.');
    return;
  }

  const videoId = getYouTubeVideoId(url);
  const googleDriveFileId = getGoogleDriveFileId(url);
  const sourceType = videoId
    ? 'youtube'
    : googleDriveFileId
      ? 'google-drive'
    : url.includes('res.cloudinary.com')
      ? 'cloudinary'
      : 'external';

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const payload = {
      title,
      url,
      videoId: videoId || null,
      sourceType,
      description,
      duration,
      order,
      relatedToExercise,
      updatedAt: serverTimestamp()
    };

    if (editingVideoId) {
      await updateDoc(
        doc(db, `learning_categories/${categoryId}/courses/${courseId}/videos`, editingVideoId),
        payload
      );
      alert('Video updated successfully.');
    } else {
      payload.createdAt = serverTimestamp();
      payload.views = 0;

      await addDoc(collection(db, `learning_categories/${categoryId}/courses/${courseId}/videos`), payload);
      alert('Video added successfully.');
    }

    selectedCategoryId = categoryId;
    selectedCourseId = courseId;
    document.getElementById('filterCategory').value = selectedCategoryId;
    await loadFilterCourses(selectedCategoryId);
    document.getElementById('filterCourse').value = selectedCourseId;

    closeModal();
    await loadVideos();
  } catch (error) {
    console.error('Error saving video:', error);
    alert(`Error saving video: ${error.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Video';
  }
}

window.deleteVideo = async function deleteVideo(videoId) {
  if (!selectedCategoryId || !selectedCourseId) return;
  if (!confirm('Are you sure you want to delete this video?')) return;

  try {
    await deleteDoc(doc(db, `learning_categories/${selectedCategoryId}/courses/${selectedCourseId}/videos`, videoId));
    await loadVideos();
    alert('Video deleted successfully.');
  } catch (error) {
    console.error('Error deleting video:', error);
    alert(`Error deleting video: ${error.message}`);
  }
};

window.editVideo = function editVideo(videoId) {
  openModal(videoId);
};

function bindEvents() {
  document.getElementById('addVideoBtn').addEventListener('click', () => openModal());
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('videoForm').addEventListener('submit', saveVideo);

  document.getElementById('filterCategory').addEventListener('change', async (event) => {
    selectedCategoryId = event.target.value || '';
    selectedCourseId = '';

    await loadFilterCourses(selectedCategoryId);
    document.getElementById('filterCourse').value = '';
    await loadVideos();
  });

  document.getElementById('filterCourse').addEventListener('change', async (event) => {
    selectedCourseId = event.target.value || '';
    await loadVideos();
  });

  document.getElementById('videoCategory').addEventListener('change', async (event) => {
    const categoryId = event.target.value;
    await loadModalCourses(categoryId);
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

function initAuth() {
  onAuthStateChanged(auth, (user) => {
    document.body.classList.add('ready');

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');

    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = (user.email || 'A')[0].toUpperCase();

    loadCategories();
  });
}

initShellUI();
bindEvents();
initAuth();
