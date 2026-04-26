import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    const q = query(collection(db, 'learning_categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    console.log('Categories found:', snapshot.size);
    
    if (snapshot.empty) {
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
    let totalTopics = 0;
    let totalExercises = 0;

    for (const doc of snapshot.docs) {
      const cat = doc.data();
      const colors = categoryColors[cat.name] || { start: '#667eea', end: '#764ba2' };
      
      console.log('Processing category:', cat.name);
      
      // Count courses
      let coursesCount = 0;
      try {
        const coursesSnap = await getDocs(collection(db, `learning_categories/${doc.id}/courses`));
        coursesCount = coursesSnap.size;
        totalCourses += coursesCount;

        // Count topics and exercises
        for (const courseDoc of coursesSnap.docs) {
          const topicsSnap = await getDocs(collection(db, `learning_categories/${doc.id}/courses/${courseDoc.id}/topics`));
          totalTopics += topicsSnap.size;
          
          for (const topicDoc of topicsSnap.docs) {
            const exercisesSnap = await getDocs(collection(db, `learning_categories/${doc.id}/courses/${courseDoc.id}/topics/${topicDoc.id}/exercises`));
            totalExercises += exercisesSnap.size;
          }
        }
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
    document.getElementById('totalCategories').textContent = snapshot.size;
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('totalTopics').textContent = totalTopics;
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
