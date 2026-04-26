import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');
const courseId = urlParams.get('course');
const topicId = urlParams.get('topic');
let exerciseId = urlParams.get('exercise');

let allExercises = [];
let currentIndex = 0;

async function loadBreadcrumb() {
  try {
    const catDoc = await getDoc(doc(db, 'learning_categories', categoryId));
    const courseDoc = await getDoc(doc(db, `learning_categories/${categoryId}/courses`, courseId));
    const topicDoc = await getDoc(doc(db, `learning_categories/${categoryId}/courses/${courseId}/topics`, topicId));
    
    if (catDoc.exists()) {
      document.getElementById('breadCategory').textContent = catDoc.data().name;
      document.getElementById('breadCategory').href = `courses.html?category=${categoryId}`;
    }
    if (courseDoc.exists()) {
      document.getElementById('breadCourse').textContent = courseDoc.data().name;
      document.getElementById('breadCourse').href = `topics.html?category=${categoryId}&course=${courseId}`;
    }
    if (topicDoc.exists()) {
      document.getElementById('breadTopic').textContent = topicDoc.data().name;
      document.getElementById('breadTopic').href = `topics.html?category=${categoryId}&course=${courseId}`;
    }
  } catch (error) {
    console.error('Error loading breadcrumb:', error);
  }
}

async function loadExercises() {
  const nav = document.getElementById('exercisesNav');
  
  try {
    const q = query(collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicId}/exercises`), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      nav.innerHTML = '<div class="loading">No exercises found!</div>';
      return;
    }

    allExercises = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // If no exercise selected, select first one
    if (!exerciseId && allExercises.length > 0) {
      exerciseId = allExercises[0].id;
      currentIndex = 0;
    } else {
      currentIndex = allExercises.findIndex(ex => ex.id === exerciseId);
      if (currentIndex === -1) currentIndex = 0;
    }

    nav.innerHTML = '';
    allExercises.forEach((ex, index) => {
      const item = document.createElement('a');
      item.href = `exercise.html?category=${categoryId}&course=${courseId}&topic=${topicId}&exercise=${ex.id}`;
      item.className = `exercise-nav-item ${ex.id === exerciseId ? 'active' : ''}`;
      item.innerHTML = `
        <span>${index + 1}.</span>
        <span>${ex.title}</span>
      `;
      nav.appendChild(item);
    });

    loadExercise();

  } catch (error) {
    console.error('Error loading exercises:', error);
    nav.innerHTML = '<div class="loading">Error loading exercises</div>';
  }
}

async function loadExercise() {
  const content = document.getElementById('exerciseContent');
  
  try {
    const exerciseDoc = await getDoc(doc(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicId}/exercises`, exerciseId));
    
    if (!exerciseDoc.exists()) {
      content.innerHTML = '<div class="loading">Exercise not found!</div>';
      return;
    }

    const exercise = exerciseDoc.data();
    document.getElementById('exerciseName').textContent = exercise.title;
    document.title = `${exercise.title} - Code Cloner`;
    
    content.innerHTML = `
      <h1>${exercise.title}</h1>
      ${exercise.content || '<p>No content available</p>'}
    `;

    // Update views
    await updateDoc(doc(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicId}/exercises`, exerciseId), {
      views: increment(1)
    });

    // Update navigation buttons
    document.getElementById('prevExercise').disabled = currentIndex === 0;
    document.getElementById('nextExercise').disabled = currentIndex === allExercises.length - 1;

  } catch (error) {
    console.error('Error loading exercise:', error);
    content.innerHTML = '<div class="loading">Error loading exercise</div>';
  }
}

// Navigation buttons
document.getElementById('prevExercise').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    exerciseId = allExercises[currentIndex].id;
    window.location.href = `exercise.html?category=${categoryId}&course=${courseId}&topic=${topicId}&exercise=${exerciseId}`;
  }
});

document.getElementById('nextExercise').addEventListener('click', () => {
  if (currentIndex < allExercises.length - 1) {
    currentIndex++;
    exerciseId = allExercises[currentIndex].id;
    window.location.href = `exercise.html?category=${categoryId}&course=${courseId}&topic=${topicId}&exercise=${exerciseId}`;
  }
});

document.getElementById('markComplete').addEventListener('click', () => {
  // Save to localStorage
  const completed = JSON.parse(localStorage.getItem('completedExercises') || '[]');
  const key = `${categoryId}_${courseId}_${topicId}_${exerciseId}`;
  if (!completed.includes(key)) {
    completed.push(key);
    localStorage.setItem('completedExercises', JSON.stringify(completed));
    alert('✓ Exercise marked as complete!');
  }
});

// Sidebar toggle for mobile
document.getElementById('toggleSidebar').addEventListener('click', () => {
  document.getElementById('exerciseSidebar').classList.add('active');
  document.getElementById('exerciseNavOverlay')?.classList.add('show');
});

document.getElementById('closeSidebar').addEventListener('click', () => {
  document.getElementById('exerciseSidebar').classList.remove('active');
  document.getElementById('exerciseNavOverlay')?.classList.remove('show');
});

document.getElementById('exerciseNavOverlay')?.addEventListener('click', () => {
  document.getElementById('exerciseSidebar').classList.remove('active');
  document.getElementById('exerciseNavOverlay')?.classList.remove('show');
});

// Top drawer navigation
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

if (!categoryId || !courseId || !topicId) {
  window.location.href = 'learning.html';
} else {
  loadBreadcrumb();
  loadExercises();
}
