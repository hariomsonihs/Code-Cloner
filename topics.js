import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');
const courseId = urlParams.get('course');

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => {
    const orderA = Number(a.data()?.order ?? 0);
    const orderB = Number(b.data()?.order ?? 0);
    return orderA - orderB;
  });
}

async function loadCourse() {
  if (!categoryId || !courseId) {
    window.location.href = 'learning.html';
    return;
  }

  try {
    const catDoc = await getDoc(doc(db, 'learning_categories', categoryId));
    const courseDoc = await getDoc(doc(db, `learning_categories/${categoryId}/courses`, courseId));
    
    if (!catDoc.exists() || !courseDoc.exists()) {
      window.location.href = 'learning.html';
      return;
    }

    const cat = catDoc.data();
    const course = courseDoc.data();

    document.getElementById('breadCategory').textContent = cat.name;
    document.getElementById('breadCategory').href = `courses.html?category=${categoryId}`;
    document.getElementById('courseName').textContent = course.name;
    document.getElementById('courseTitle').textContent = course.name;
    document.getElementById('courseDesc').textContent = course.description || '';
    document.querySelector('.course-icon').textContent = course.icon || '📖';
    document.getElementById('courseDuration').textContent = course.duration || 0;
    document.title = `${course.name} - Code Cloner`;

  } catch (error) {
    console.error('Error loading course:', error);
  }
}

async function loadTopics() {
  const list = document.getElementById('topicsList');
  
  try {
    const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics`));
    const topicDocs = sortDocsByOrder(snapshot.docs);
    
    if (!topicDocs.length) {
      list.innerHTML = '<div class="loading">No topics found yet!</div>';
      return;
    }

    list.innerHTML = '';
    let totalExercises = 0;

    for (const [index, topicDoc] of topicDocs.entries()) {
      const topic = topicDoc.data();
      
      // Count exercises
      const exercisesSnap = await getDocs(collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicDoc.id}/exercises`));
      const exercisesCount = exercisesSnap.size;
      totalExercises += exercisesCount;
      
      const card = document.createElement('a');
      card.href = `exercise.html?category=${categoryId}&course=${courseId}&topic=${topicDoc.id}`;
      card.className = 'topic-card';
      card.innerHTML = `
        <div class="topic-header">
          <div class="topic-number">${index + 1}</div>
          <h3 class="topic-name">${topic.name}</h3>
        </div>
        <p class="topic-desc">${topic.description || ''}</p>
        <div class="topic-meta">
          <span class="meta-item">💪 ${exercisesCount} exercises</span>
          <span class="meta-item">⏱️ ${topic.duration || 0} min</span>
        </div>
      `;
      list.appendChild(card);
    }

    document.getElementById('topicCount').textContent = topicDocs.length;
    document.getElementById('exerciseCount').textContent = totalExercises;

  } catch (error) {
    console.error('Error loading topics:', error);
    list.innerHTML = '<div class="loading">Error loading topics</div>';
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

loadCourse();
loadTopics();
