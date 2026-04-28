import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = (urlParams.get('category') || '').trim();
const initialSearchQuery = (urlParams.get('q') || '').trim();

let categoryData = null;
let allCourseItems = [];
let activeSearchQuery = initialSearchQuery;

const courseColors = [
  { start: '#667eea', end: '#764ba2' },
  { start: '#f093fb', end: '#f5576c' },
  { start: '#4facfe', end: '#00f2fe' },
  { start: '#43e97b', end: '#38f9d7' },
  { start: '#fa709a', end: '#fee140' },
  { start: '#30cfd0', end: '#330867' },
  { start: '#a8edea', end: '#fed6e3' },
  { start: '#ff9a9e', end: '#fecfef' }
];

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => {
    const orderA = Number(a.data()?.order ?? 0);
    const orderB = Number(b.data()?.order ?? 0);
    return orderA - orderB;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim();
}

function isAllCoursesMode() {
  return !categoryId;
}

function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function getCourseCompletionCountFromStorage(categoryIdValue, courseId) {
  try {
    const completed = JSON.parse(localStorage.getItem('completedExercises') || '[]');
    if (!Array.isArray(completed)) return 0;
    const prefix = `${categoryIdValue}_${courseId}_`;
    return completed.filter((key) => typeof key === 'string' && key.startsWith(prefix)).length;
  } catch (error) {
    console.error('Failed to parse completion storage:', error);
    return 0;
  }
}

function getRedirectToCurrentPage() {
  const page = window.location.pathname.split('/').pop() || 'courses.html';
  return `${page}${window.location.search}`;
}

function redirectToLoginForEnroll() {
  const redirect = encodeURIComponent(getRedirectToCurrentPage());
  window.location.href = `profile.html?redirect=${redirect}`;
}

function buildCourseShareUrl(courseUrl) {
  return new URL(courseUrl, window.location.origin).toString();
}

function flashButtonLabel(button, label, duration = 1600) {
  if (!button) return;
  const prev = button.textContent;
  button.textContent = label;
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = prev;
    button.disabled = false;
  }, duration);
}

async function shareCourseLink(button, courseName, courseUrl) {
  const shareUrl = buildCourseShareUrl(courseUrl);
  const shareTitle = courseName || 'Course';
  const shareText = `Check out this course: ${shareTitle}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${shareTitle} - Code Cloner`,
        text: shareText,
        url: shareUrl
      });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashButtonLabel(button, 'Link Copied');
      return;
    } catch (error) {
      console.error('Clipboard copy failed:', error);
    }
  }

  window.prompt('Copy and share this course link:', shareUrl);
}

function setSearchQueryInUrl(queryText) {
  const url = new URL(window.location.href);
  if (queryText) {
    url.searchParams.set('q', queryText);
  } else {
    url.searchParams.delete('q');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

async function getEnrolledCoursesMap(userId) {
  if (!userId) return new Map();

  try {
    const snapshot = await getDocs(collection(db, 'users', userId, 'enrollments'));
    return new Map(snapshot.docs.map((enrollmentDoc) => [enrollmentDoc.id, enrollmentDoc.data()]));
  } catch (error) {
    console.error('Error loading enrollment list:', error);
    return new Map();
  }
}

function setEnrollButtonState(button, state) {
  if (!button) return;
  const textEl = button.querySelector('[data-enroll-text]');

  button.classList.remove('enrolled', 'login-required');
  button.disabled = false;

  if (state === 'enrolled') {
    button.classList.add('enrolled');
    if (textEl) textEl.textContent = 'Continue Learning';
    return;
  }

  if (state === 'login') {
    button.classList.add('login-required');
    if (textEl) textEl.textContent = 'Login To Enroll';
    return;
  }

  if (state === 'loading') {
    button.disabled = true;
    if (textEl) textEl.textContent = 'Enrolling...';
    return;
  }

  if (textEl) textEl.textContent = 'Enroll Now';
}

function enableCardContinue(card, openCourseUrl) {
  const currentLink = card.querySelector('.course-card-link');
  if (!currentLink || currentLink.tagName === 'A') return;

  const anchor = document.createElement('a');
  anchor.className = `${currentLink.className} is-clickable`;
  anchor.href = openCourseUrl;
  anchor.setAttribute('aria-label', 'Continue Learning');
  anchor.innerHTML = currentLink.innerHTML;
  currentLink.replaceWith(anchor);
}

function applyEnrolledCardState(card, enrollButton, openCourseUrl) {
  setEnrollButtonState(enrollButton, 'enrolled');
  enrollButton.dataset.action = 'continue';
  card.classList.add('course-card-enrolled');
  enableCardContinue(card, openCourseUrl);
}

function updateCatalogHead(filteredCount, totalCount) {
  const titleEl = document.getElementById('coursesSectionTitle');
  const pillEl = document.getElementById('coursesSectionPill');
  if (!titleEl || !pillEl) return;

  if (isAllCoursesMode()) {
    titleEl.textContent = 'All Courses By Category';
    pillEl.textContent = `${filteredCount}/${totalCount} courses`;
    return;
  }

  titleEl.textContent = 'Available Courses';
  pillEl.textContent = `${filteredCount}/${totalCount} courses`;
}

function matchesCourseSearch(item, queryText) {
  const q = normalizeText(queryText);
  if (!q) return true;

  const course = item.course || {};
  const haystack = [
    item.categoryName,
    course.name,
    course.description,
    course.level
  ].map(normalizeText).join(' ');

  return haystack.includes(q);
}

function createCourseCard(item, user, enrolledMap) {
  const course = item.course || {};
  const courseDocId = item.courseId;
  const colors = item.colors;
  const exerciseCount = item.exerciseCount;
  const completedFromLocal = getCourseCompletionCountFromStorage(item.categoryId, courseDocId);
  const enrollmentData = enrolledMap.get(courseDocId);

  const levelClass = course.level === 'Beginner'
    ? 'level-beginner'
    : course.level === 'Intermediate'
      ? 'level-intermediate'
      : 'level-advanced';

  const isEnrolled = Boolean(enrollmentData);
  const openCourseUrl = `exercises.html?category=${encodeURIComponent(item.categoryId)}&course=${encodeURIComponent(courseDocId)}`;
  const courseName = course.name || 'Untitled Course';
  const cardLinkTag = isEnrolled ? 'a' : 'div';
  const cardLinkAttrs = isEnrolled
    ? `href="${openCourseUrl}" aria-label="Continue Learning"`
    : '';
  const showCategoryBadge = isAllCoursesMode();

  const card = document.createElement('article');
  card.className = `course-card${isEnrolled ? ' course-card-enrolled' : ''}`;

  const hasImage = course.imageUrl && course.imageUrl.trim();
  const bannerContent = hasImage
    ? `<img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(courseName)}" class="course-banner-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="course-banner-icon" style="display:none;">${escapeHtml(course.icon || 'C')}</span>`
    : `<span class="course-banner-icon">${escapeHtml(course.icon || 'C')}</span>`;

  card.innerHTML = `
    <${cardLinkTag} class="course-card-link${isEnrolled ? ' is-clickable' : ''}" ${cardLinkAttrs}>
      <div class="course-banner" style="background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)">
        ${bannerContent}
      </div>
      <div class="course-body">
        <h3 class="course-name">${escapeHtml(courseName)}</h3>
        <p class="course-desc">${escapeHtml(course.description || '')}</p>
        <div class="course-meta">
          ${showCategoryBadge ? `<span class="meta-badge">${escapeHtml(item.categoryName)}</span>` : ''}
          <span class="level-badge ${levelClass}">${escapeHtml(course.level || 'Beginner')}</span>
          <span class="meta-badge">Duration ${Number(course.duration || 0)}h</span>
          <span class="meta-badge">${exerciseCount} exercises</span>
        </div>
      </div>
    </${cardLinkTag}>
    <div class="course-actions">
      <button type="button" class="course-enroll-btn${isEnrolled ? ' enrolled' : (!user ? ' login-required' : '')}" data-course-id="${courseDocId}" data-action="${isEnrolled ? 'continue' : 'enroll'}">
        <span data-enroll-text>${isEnrolled ? 'Continue Learning' : (!user ? 'Login To Enroll' : 'Enroll Now')}</span>
      </button>
      <button type="button" class="course-share-btn">Share Link</button>
    </div>
  `;

  const enrollButton = card.querySelector('.course-enroll-btn');
  const shareButton = card.querySelector('.course-share-btn');

  if (shareButton) {
    shareButton.addEventListener('click', () => {
      shareCourseLink(shareButton, courseName, openCourseUrl);
    });
  }

  if (enrollButton) {
    if (isEnrolled) {
      applyEnrolledCardState(card, enrollButton, openCourseUrl);
      enrollButton.addEventListener('click', () => {
        window.location.href = openCourseUrl;
      });
    } else if (!user) {
      setEnrollButtonState(enrollButton, 'login');
      enrollButton.addEventListener('click', () => {
        redirectToLoginForEnroll();
      });
    } else {
      enrollButton.addEventListener('click', async () => {
        if (enrollButton.dataset.action === 'continue') {
          window.location.href = openCourseUrl;
          return;
        }

        setEnrollButtonState(enrollButton, 'loading');
        try {
          const progress = exerciseCount > 0 ? Math.min(100, Math.round((completedFromLocal / exerciseCount) * 100)) : 0;

          await setDoc(doc(db, 'users', user.uid, 'enrollments', courseDocId), {
            categoryId: item.categoryId,
            categoryName: item.categoryName || '',
            courseId: courseDocId,
            courseName: course.name || '',
            courseIcon: course.icon || 'C',
            courseDescription: course.description || '',
            enrolledAt: serverTimestamp(),
            lastAccessedAt: serverTimestamp(),
            progress,
            completedExercises: completedFromLocal,
            totalExercises: exerciseCount,
            status: 'active'
          }, { merge: true });

          applyEnrolledCardState(card, enrollButton, openCourseUrl);
        } catch (error) {
          console.error('Enrollment failed:', error);
          const textEl = enrollButton.querySelector('[data-enroll-text]');
          if (textEl) textEl.textContent = 'Try Again';
          enrollButton.disabled = false;
        }
      });
    }
  }

  return card;
}

function renderCourseCatalog(user, enrolledMap) {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  const filteredItems = allCourseItems.filter((item) => matchesCourseSearch(item, activeSearchQuery));
  updateCatalogHead(filteredItems.length, allCourseItems.length);

  if (!filteredItems.length) {
    grid.className = 'courses-grid';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">No results</div>
        <h3>No matching courses found</h3>
        <p>Try another category or course keyword.</p>
      </div>
    `;
    return;
  }

  if (!isAllCoursesMode()) {
    grid.className = 'courses-grid';
    grid.innerHTML = '';
    filteredItems.forEach((item) => {
      grid.appendChild(createCourseCard(item, user, enrolledMap));
    });
    return;
  }

  grid.className = 'courses-catalog-groups';
  grid.innerHTML = '';

  const grouped = new Map();
  filteredItems.forEach((item) => {
    if (!grouped.has(item.categoryId)) {
      grouped.set(item.categoryId, {
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,
        items: []
      });
    }
    grouped.get(item.categoryId).items.push(item);
  });

  grouped.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'course-category-group';
    section.innerHTML = `
      <div class="course-category-head">
        <h3 class="course-category-title">${escapeHtml(group.categoryIcon || 'C')} ${escapeHtml(group.categoryName || 'Category')}</h3>
        <span class="course-category-count">${group.items.length} course${group.items.length > 1 ? 's' : ''}</span>
      </div>
    `;

    const groupGrid = document.createElement('div');
    groupGrid.className = 'courses-grid courses-grid-group';
    group.items.forEach((item) => {
      groupGrid.appendChild(createCourseCard(item, user, enrolledMap));
    });

    section.appendChild(groupGrid);
    grid.appendChild(section);
  });
}

async function loadPageHeader() {
  if (isAllCoursesMode()) {
    document.getElementById('categoryName').textContent = 'All Categories';
    document.getElementById('categoryTitle').textContent = 'All Courses Library';
    document.getElementById('categoryDesc').textContent = 'Browse every category and search any course from one place.';
    document.getElementById('categoryIcon').textContent = '📚';
    document.title = 'All Courses - Code Cloner';
    return;
  }

  try {
    const catDoc = await getDoc(doc(db, 'learning_categories', categoryId));
    if (!catDoc.exists()) {
      window.location.href = 'learning.html';
      return;
    }

    const cat = catDoc.data();
    categoryData = cat;
    document.getElementById('categoryName').textContent = cat.name;
    document.getElementById('categoryTitle').textContent = cat.name;
    document.getElementById('categoryDesc').textContent = cat.description || '';
    document.getElementById('categoryIcon').textContent = cat.icon || 'C';
    document.title = `${cat.name} - Code Cloner`;
  } catch (error) {
    console.error('Error loading category:', error);
    window.location.href = 'learning.html';
  }
}

async function buildCourseItems() {
  if (!isAllCoursesMode()) {
    const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses`));
    const courseDocs = sortDocsByOrder(snapshot.docs);

    const exerciseCounts = await Promise.all(
      courseDocs.map((courseDoc) => countCourseExercises(categoryId, courseDoc.id))
    );

    allCourseItems = courseDocs.map((courseDoc, index) => {
      const course = courseDoc.data();
      return {
        categoryId,
        categoryName: categoryData?.name || 'Category',
        categoryIcon: categoryData?.icon || 'C',
        categoryOrder: Number(categoryData?.order ?? 0),
        courseOrder: Number(course?.order ?? 0),
        courseId: courseDoc.id,
        course,
        exerciseCount: exerciseCounts[index],
        colors: courseColors[index % courseColors.length]
      };
    });
    return;
  }

  const categoriesSnap = await getDocs(collection(db, 'learning_categories'));
  const categoryDocs = sortDocsByOrder(categoriesSnap.docs);
  const items = [];

  for (let catIndex = 0; catIndex < categoryDocs.length; catIndex += 1) {
    const categoryDoc = categoryDocs[catIndex];
    const category = categoryDoc.data();
    const coursesSnap = await getDocs(collection(db, `learning_categories/${categoryDoc.id}/courses`));
    const courseDocs = sortDocsByOrder(coursesSnap.docs);

    const exerciseCounts = await Promise.all(
      courseDocs.map((courseDoc) => countCourseExercises(categoryDoc.id, courseDoc.id))
    );

    courseDocs.forEach((courseDoc, index) => {
      const course = courseDoc.data();
      items.push({
        categoryId: categoryDoc.id,
        categoryName: category?.name || 'Category',
        categoryIcon: category?.icon || 'C',
        categoryOrder: Number(category?.order ?? catIndex),
        courseOrder: Number(course?.order ?? index),
        courseId: courseDoc.id,
        course,
        exerciseCount: exerciseCounts[index],
        colors: courseColors[(catIndex + index) % courseColors.length]
      });
    });
  }

  allCourseItems = items.sort((a, b) => {
    if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
    return a.courseOrder - b.courseOrder;
  });
}

function setupCatalogSearch(user, enrolledMap) {
  const searchForm = document.getElementById('catalogSearchForm');
  const searchInput = document.getElementById('catalogSearchInput');
  if (!searchForm || !searchInput) return;

  searchInput.value = activeSearchQuery;

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    activeSearchQuery = searchInput.value.trim();
    setSearchQueryInUrl(activeSearchQuery);
    renderCourseCatalog(user, enrolledMap);
  });

  searchInput.addEventListener('input', () => {
    activeSearchQuery = searchInput.value.trim();
    renderCourseCatalog(user, enrolledMap);
  });
}

async function loadCourses() {
  const grid = document.getElementById('coursesGrid');
  if (!grid) return;

  try {
    const user = await getCurrentUser();
    const enrolledMap = await getEnrolledCoursesMap(user?.uid);
    await buildCourseItems();

    if (!allCourseItems.length) {
      grid.className = 'courses-grid';
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">No courses</div>
          <h3>No courses yet</h3>
          <p>Courses will be added soon. Check back later!</p>
        </div>
      `;
      updateCatalogHead(0, 0);
      setupCatalogSearch(user, enrolledMap);
      return;
    }

    renderCourseCatalog(user, enrolledMap);
    setupCatalogSearch(user, enrolledMap);
  } catch (error) {
    console.error('Error loading courses:', error);
    grid.className = 'courses-grid';
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">Error</div>
        <h3>Error loading courses</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function countCourseExercises(category, course) {
  try {
    const directExercisesSnap = await getDocs(
      collection(db, `learning_categories/${category}/courses/${course}/exercises`)
    );

    if (directExercisesSnap.size > 0) {
      return directExercisesSnap.size;
    }

    const topicsSnap = await getDocs(
      collection(db, `learning_categories/${category}/courses/${course}/topics`)
    );

    let legacyCount = 0;
    for (const topicDoc of topicsSnap.docs) {
      const topicExercisesSnap = await getDocs(
        collection(db, `learning_categories/${category}/courses/${course}/topics/${topicDoc.id}/exercises`)
      );
      legacyCount += topicExercisesSnap.size;
    }
    return legacyCount;
  } catch (error) {
    console.error('Error counting course exercises:', error);
    return 0;
  }
}

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

async function init() {
  await loadPageHeader();
  await loadCourses();
}

init();
