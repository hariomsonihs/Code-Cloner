import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => {
    const orderA = Number(a.data()?.order ?? 0);
    const orderB = Number(b.data()?.order ?? 0);
    return orderA - orderB;
  });
}

// Category color schemes
const categoryColors = {
  'Web Development': { start: '#667eea', end: '#764ba2' },
  'App Development': { start: '#f093fb', end: '#f5576c' },
  'Programming': { start: '#4facfe', end: '#00f2fe' },
  'Data Science': { start: '#43e97b', end: '#38f9d7' },
  'DevOps': { start: '#fa709a', end: '#fee140' },
  'Database': { start: '#30cfd0', end: '#330867' },
  'Cloud Computing': { start: '#a8edea', end: '#fed6e3' },
  'Cybersecurity': { start: '#ff9a9e', end: '#fecfef' }
};

async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  console.log('Loading categories for user website...');
  
  try {
    const snapshot = await getDocs(collection(db, 'learning_categories'));
    const categoryDocs = sortDocsByOrder(snapshot.docs);
    
    console.log('Categories found:', categoryDocs.length);
    
    if (!categoryDocs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h3>No categories available yet</h3>
          <p>Check back soon for new learning content!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    let totalCourses = 0;
    let totalExercises = 0;

    for (const doc of categoryDocs) {
      const cat = doc.data();
      const colors = categoryColors[cat.name] || { start: '#667eea', end: '#764ba2' };
      
      console.log('Processing category:', cat.name);
      
      // Count courses
      let coursesCount = 0;
      try {
        const coursesSnap = await getDocs(collection(db, `learning_categories/${doc.id}/courses`));
        coursesCount = coursesSnap.size;
        totalCourses += coursesCount;

        const exerciseCounts = await Promise.all(
          coursesSnap.docs.map((courseDoc) => countCourseExercises(doc.id, courseDoc.id))
        );
        totalExercises += exerciseCounts.reduce((sum, count) => sum + count, 0);
      } catch (err) {
        console.log('Error counting for category:', err);
      }

      const card = document.createElement('a');
      card.href = `courses.html?category=${doc.id}`;
      card.className = 'category-card';
      card.style.setProperty('--color-start', colors.start);
      card.style.setProperty('--color-end', colors.end);
      card.innerHTML = `
        <span class="category-icon">${cat.icon || '📚'}</span>
        <h3 class="category-name">${cat.name}</h3>
        <p class="category-description">${cat.description || ''}</p>
        <div class="category-meta">
          <span>📖 ${coursesCount} courses</span>
        </div>
      `;
      grid.appendChild(card);
    }

    // Update stats
    document.getElementById('totalCategories').textContent = categoryDocs.length;
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('totalExercises').textContent = totalExercises;

    console.log('Categories loaded successfully!');

  } catch (error) {
    console.error('Error loading categories:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h3>Error loading categories</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function countCourseExercises(categoryId, courseId) {
  try {
    const directExercisesSnap = await getDocs(
      collection(db, `learning_categories/${categoryId}/courses/${courseId}/exercises`)
    );

    if (directExercisesSnap.size > 0) {
      return directExercisesSnap.size;
    }

    const topicsSnap = await getDocs(
      collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics`)
    );

    let legacyCount = 0;
    for (const topicDoc of topicsSnap.docs) {
      const topicExercisesSnap = await getDocs(
        collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicDoc.id}/exercises`)
      );
      legacyCount += topicExercisesSnap.size;
    }

    return legacyCount;
  } catch (error) {
    console.log('Error counting course exercises:', error);
    return 0;
  }
}

// Mobile menu toggle
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

// Load categories on page load
loadCategories();
