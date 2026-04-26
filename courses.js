import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
    const q = query(collection(db, `learning_categories/${categoryId}/courses`), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>No courses yet</h3>
          <p>Courses will be added soon. Check back later!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';

    snapshot.docs.forEach((courseDoc, index) => {
      const course = courseDoc.data();
      const colors = courseColors[index % courseColors.length];
      
      const levelClass = course.level === 'Beginner' ? 'level-beginner' : 
                        course.level === 'Intermediate' ? 'level-intermediate' : 'level-advanced';
      
      const card = document.createElement('a');
      card.href = `topics.html?category=${categoryId}&course=${courseDoc.id}`;
      card.className = 'course-card';
      card.innerHTML = `
        <div class="course-banner" style="background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)">
          ${course.icon || '📖'}
        </div>
        <div class="course-body">
          <h3 class="course-name">${course.name}</h3>
          <p class="course-desc">${course.description || ''}</p>
          <div class="course-meta">
            <span class="level-badge ${levelClass}">${course.level || 'Beginner'}</span>
            <span class="meta-badge">⏱️ ${course.duration || 0}h</span>
            <span class="meta-badge">📝 ${course.topicsCount || 0} topics</span>
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

// Mobile menu
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
