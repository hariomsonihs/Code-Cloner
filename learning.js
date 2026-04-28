import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

let categoryRecords = [];
let activeSearchQuery = '';

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => {
    const orderA = Number(a.data()?.order ?? 0);
    const orderB = Number(b.data()?.order ?? 0);
    return orderA - orderB;
  });
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim();
}

function matchesCategorySearch(record, searchQuery) {
  const q = normalizeText(searchQuery);
  if (!q) return true;

  const haystack = [
    record.name,
    record.description,
    ...record.courseNames
  ].map(normalizeText).join(' ');

  return haystack.includes(q);
}

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const filtered = categoryRecords.filter((record) => matchesCategorySearch(record, activeSearchQuery));
  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">No results</div>
        <h3>No matching category or course</h3>
        <p>Try a different search keyword.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((record) => {
    const card = document.createElement('a');
    card.href = `courses.html?category=${encodeURIComponent(record.id)}`;
    card.className = 'category-card';
    card.style.setProperty('--color-start', record.colors.start);
    card.style.setProperty('--color-end', record.colors.end);
    card.innerHTML = `
      <span class="category-icon">${record.icon || 'C'}</span>
      <h3 class="category-name">${record.name}</h3>
      <p class="category-description">${record.description || ''}</p>
      <div class="category-meta">
        <span>${record.coursesCount} courses</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function setupLearningSearch() {
  const searchForm = document.getElementById('learningSearchForm');
  const searchInput = document.getElementById('learningSearchInput');
  if (!searchForm || !searchInput) return;

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    const target = query ? `courses.html?q=${encodeURIComponent(query)}` : 'courses.html';
    window.location.href = target;
  });

  searchInput.addEventListener('input', () => {
    activeSearchQuery = searchInput.value.trim();
    renderCategories();
  });
}

async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  try {
    const snapshot = await getDocs(collection(db, 'learning_categories'));
    const categoryDocs = sortDocsByOrder(snapshot.docs);

    if (!categoryDocs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">Empty</div>
          <h3>No categories available yet</h3>
          <p>Check back soon for new learning content.</p>
        </div>
      `;
      return;
    }

    const records = await Promise.all(categoryDocs.map(async (categoryDoc, index) => {
      const cat = categoryDoc.data() || {};
      const coursesSnap = await getDocs(collection(db, `learning_categories/${categoryDoc.id}/courses`));
      const courseDocs = sortDocsByOrder(coursesSnap.docs);
      const courseNames = courseDocs.map((courseDoc) => String(courseDoc.data()?.name || '').trim()).filter(Boolean);

      return {
        id: categoryDoc.id,
        order: Number(cat.order ?? index),
        name: cat.name || 'Untitled Category',
        description: cat.description || '',
        icon: cat.icon || 'C',
        coursesCount: coursesSnap.size,
        courseNames,
        colors: categoryColors[cat.name] || { start: '#667eea', end: '#764ba2' }
      };
    }));

    categoryRecords = records.sort((a, b) => a.order - b.order);

    const totalCourses = categoryRecords.reduce((sum, record) => sum + record.coursesCount, 0);
    const totalCategoriesEl = document.getElementById('totalCategories');
    const totalCoursesEl = document.getElementById('totalCourses');
    if (totalCategoriesEl) totalCategoriesEl.textContent = String(categoryRecords.length);
    if (totalCoursesEl) totalCoursesEl.textContent = String(totalCourses);

    renderCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Error</div>
        <h3>Error loading categories</h3>
        <p>${error.message}</p>
      </div>
    `;
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

setupLearningSearch();
loadCategories();

// Initialize reveal animations for footer
import { initRevealAnimations } from './ui.js';
initRevealAnimations();
