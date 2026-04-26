import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');

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
    document.getElementById('categoryName').textContent = cat.name;
    document.getElementById('categoryTitle').textContent = cat.name;
    document.getElementById('categoryDesc').textContent = cat.description || '';
    document.getElementById('categoryIcon').textContent = cat.icon || '📚';
    document.title = `${cat.name} - Code Cloner`;
  } catch (error) {
    console.error('Error loading category:', error);
  }
}

async function loadCourses() {
  const grid = document.getElementById('coursesGrid');

  try {
    const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses`));
    const courseDocs = sortDocsByOrder(snapshot.docs);

    if (!courseDocs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📘</div>
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
      const colors = courseColors[index % courseColors.length];
      const exerciseCount = exerciseCounts[index];
      const levelClass = course.level === 'Beginner'
        ? 'level-beginner'
        : course.level === 'Intermediate'
          ? 'level-intermediate'
          : 'level-advanced';

      const card = document.createElement('a');
      card.href = `exercises.html?category=${categoryId}&course=${courseDoc.id}`;
      card.className = 'course-card';
      card.innerHTML = `
        <div class="course-banner" style="background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)">
          ${course.icon || '📘'}
        </div>
        <div class="course-body">
          <h3 class="course-name">${course.name}</h3>
          <p class="course-desc">${course.description || ''}</p>
          <div class="course-meta">
            <span class="level-badge ${levelClass}">${course.level || 'Beginner'}</span>
            <span class="meta-badge">⏱️ ${course.duration || 0}h</span>
            <span class="meta-badge">📝 ${exerciseCount} exercises</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading courses:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h3>Error loading courses</h3>
        <p>${error.message}</p>
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

loadCategory();
loadCourses();
