import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');
let categoryData = null;

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

function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function getCourseCompletionCountFromStorage(courseId) {
  try {
    const completed = JSON.parse(localStorage.getItem('completedExercises') || '[]');
    if (!Array.isArray(completed)) return 0;
    const prefix = `${categoryId}_${courseId}_`;
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

function setEnrollButtonState(button, state, progress = 0) {
  if (!button) return;
  const textEl = button.querySelector('[data-enroll-text]');

  button.classList.remove('enrolled', 'login-required');
  button.disabled = false;

  if (state === 'enrolled') {
    button.classList.add('enrolled');
    button.disabled = true;
    if (textEl) textEl.textContent = `Enrolled (${progress}%)`;
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

async function loadCategory() {
  if (!categoryId) {
    window.location.href = 'learning.html';
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
  }
}

async function loadCourses() {
  const grid = document.getElementById('coursesGrid');

  try {
    const user = await getCurrentUser();
    const enrolledMap = await getEnrolledCoursesMap(user?.uid);

    const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses`));
    const courseDocs = sortDocsByOrder(snapshot.docs);

    if (!courseDocs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">No courses</div>
          <h3>No courses yet</h3>
          <p>Courses will be added soon. Check back later!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    const exerciseCounts = await Promise.all(
      courseDocs.map((courseDoc) => countCourseExercises(categoryId, courseDoc.id))
    );

    courseDocs.forEach((courseDoc, index) => {
      const course = courseDoc.data();
      const courseDocId = courseDoc.id;
      const colors = courseColors[index % courseColors.length];
      const exerciseCount = exerciseCounts[index];
      const completedFromLocal = getCourseCompletionCountFromStorage(courseDocId);
      const localProgress = exerciseCount > 0 ? Math.min(100, Math.round((completedFromLocal / exerciseCount) * 100)) : 0;
      const enrollmentData = enrolledMap.get(courseDocId);
      const enrolledProgress = Number(enrollmentData?.progress ?? localProgress);

      const levelClass = course.level === 'Beginner'
        ? 'level-beginner'
        : course.level === 'Intermediate'
          ? 'level-intermediate'
          : 'level-advanced';

      const isEnrolled = Boolean(enrollmentData);
      const openCourseUrl = `exercises.html?category=${encodeURIComponent(categoryId)}&course=${encodeURIComponent(courseDocId)}`;

      const card = document.createElement('article');
      card.className = 'course-card';
      
      const hasImage = course.imageUrl && course.imageUrl.trim();
      const bannerContent = hasImage 
        ? `<img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(course.name)}" class="course-banner-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="course-banner-icon" style="display:none;">${escapeHtml(course.icon || 'C')}</span>`
        : `<span class="course-banner-icon">${escapeHtml(course.icon || 'C')}</span>`;
      
      card.innerHTML = `
        <div class="course-card-link">
          <div class="course-banner" style="background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)">
            ${bannerContent}
          </div>
          <div class="course-body">
            <h3 class="course-name">${escapeHtml(course.name || 'Untitled Course')}</h3>
            <p class="course-desc">${escapeHtml(course.description || '')}</p>
            <div class="course-meta">
              <span class="level-badge ${levelClass}">${escapeHtml(course.level || 'Beginner')}</span>
              <span class="meta-badge">Duration ${Number(course.duration || 0)}h</span>
              <span class="meta-badge">${exerciseCount} exercises</span>
            </div>
          </div>
        </div>
        <div class="course-actions">
          <button type="button" class="course-enroll-btn${isEnrolled ? ' enrolled' : (!user ? ' login-required' : '')}" data-course-id="${courseDocId}">
            <span data-enroll-text>${isEnrolled ? `Enrolled (${enrolledProgress}%)` : (!user ? 'Login To Enroll' : 'Enroll Now')}</span>
          </button>
          <a class="course-open-link" href="${openCourseUrl}">${isEnrolled ? 'Continue Learning' : 'Open Course'}</a>
        </div>
      `;

      const enrollButton = card.querySelector('.course-enroll-btn');
      if (enrollButton) {
        if (isEnrolled) {
          setEnrollButtonState(enrollButton, 'enrolled', enrolledProgress);
        } else if (!user) {
          setEnrollButtonState(enrollButton, 'login');
          enrollButton.addEventListener('click', () => {
            redirectToLoginForEnroll();
          });
        } else {
          enrollButton.addEventListener('click', async () => {
            setEnrollButtonState(enrollButton, 'loading');
            try {
              const progress = exerciseCount > 0 ? Math.min(100, Math.round((completedFromLocal / exerciseCount) * 100)) : 0;

              await setDoc(doc(db, 'users', user.uid, 'enrollments', courseDocId), {
                categoryId,
                categoryName: categoryData?.name || '',
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

              setEnrollButtonState(enrollButton, 'enrolled', progress);
            } catch (error) {
              console.error('Enrollment failed:', error);
              const textEl = enrollButton.querySelector('[data-enroll-text]');
              if (textEl) textEl.textContent = 'Try Again';
              enrollButton.disabled = false;
            }
          });
        }
      }

      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading courses:', error);
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
  await loadCategory();
  await loadCourses();
}

init();
