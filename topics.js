import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');
const courseId = urlParams.get('course');

function upsertMetaTag(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url) {
  if (!url) return;
  let canonicalEl = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', url);
}

function setPageSeo({ title, description, keywords }) {
  const absoluteUrl = window.location.href;
  if (title) {
    document.title = title;
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'twitter:title', title);
  }
  if (description) {
    upsertMetaTag('name', 'description', description);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'twitter:description', description);
  }
  if (keywords) {
    upsertMetaTag('name', 'keywords', keywords);
  }

  upsertMetaTag('property', 'og:url', absoluteUrl);
  upsertMetaTag('property', 'twitter:url', absoluteUrl);
  upsertCanonical(absoluteUrl);
}

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
    const categoryName = cat.name || 'Programming';
    const courseName = course.name || 'Course';
    const description = course.description
      ? `${course.description} Follow topic-wise exercises and study plan on Code Cloner.`
      : `Explore the ${courseName} topic roadmap, lessons, and exercises on Code Cloner Learning Hub.`;
    setPageSeo({
      title: `${courseName} Topics & Roadmap | Code Cloner`,
      description,
      keywords: `${categoryName.toLowerCase()} topics, ${courseName.toLowerCase()} roadmap, coding exercises, course syllabus, code cloner`
    });

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
