import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;
let selectedCategory = null;
let selectedCourse = null;

function parseOrder(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => parseOrder(a.data()?.order) - parseOrder(b.data()?.order));
}

initShellUI();

onAuthStateChanged(auth, (user) => {
  document.body.classList.add('ready');
  if (!user) {
    window.location.href = 'index.html';
  } else {
    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = (user.email || 'A')[0].toUpperCase();
    loadCategories();
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});

function initShellUI() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}

async function loadCategories() {
  const select = document.getElementById('categoryFilter');
  
  try {
    const snapshot = await getDocs(collection(db, 'learning_categories'));
    const categoryDocs = sortDocsByOrder(snapshot.docs);
    
    select.innerHTML = '<option value="">Select a category</option>';
    categoryDocs.forEach(docSnap => {
      const cat = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = `${cat.icon || ''} ${cat.name}`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

document.getElementById('categoryFilter').addEventListener('change', async (e) => {
  selectedCategory = e.target.value;
  selectedCourse = null;
  const courseSelect = document.getElementById('courseFilter');
  
  if (selectedCategory) {
    courseSelect.disabled = false;
    courseSelect.innerHTML = '<option value="">Loading...</option>';
    
    try {
      const snapshot = await getDocs(collection(db, `learning_categories/${selectedCategory}/courses`));
      const courseDocs = sortDocsByOrder(snapshot.docs);
      
      courseSelect.innerHTML = '<option value="">Select a course</option>';
      courseDocs.forEach(docSnap => {
        const course = docSnap.data();
        const option = document.createElement('option');
        option.value = docSnap.id;
        option.textContent = `${course.icon || ''} ${course.name}`;
        courseSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  } else {
    courseSelect.disabled = true;
    courseSelect.innerHTML = '<option value="">Select category first</option>';
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">Select a course</td></tr>';
  }
});

document.getElementById('courseFilter').addEventListener('change', (e) => {
  selectedCourse = e.target.value;
  if (selectedCourse) {
    loadTopics();
  } else {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">Select a course</td></tr>';
  }
});

async function loadTopics() {
  const tbody = document.getElementById('tableBody');
  
  if (!selectedCategory || !selectedCourse) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">Select a course</td></tr>';
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`));
    const topicDocs = sortDocsByOrder(snapshot.docs);
    
    if (!topicDocs.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem">No topics yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    for (const docSnap of topicDocs) {
      const topic = docSnap.data();
      
      // Count exercises
      const exercisesSnap = await getDocs(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${docSnap.id}/exercises`));
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${topic.name}</strong></td>
        <td>${topic.description || '-'}</td>
        <td>${topic.duration || 0} min</td>
        <td>${parseOrder(topic.order)}</td>
        <td>${exercisesSnap.size}</td>
        <td>
          <button class="btn btn-sm btn-soft edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editTopic(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTopic(btn.dataset.id));
    });

  } catch (error) {
    console.error('Error loading topics:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:red">Error loading data</td></tr>';
  }
}

async function editTopic(id) {
  editingId = id;
  const docSnap = await getDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`, id));
  const topic = docSnap.exists() ? docSnap.data() : null;
  
  if (topic) {
    document.getElementById('modalTitle').textContent = 'Edit Topic';
    document.getElementById('name').value = topic.name || '';
    document.getElementById('description').value = topic.description || '';
    document.getElementById('duration').value = topic.duration || 0;
    document.getElementById('order').value = topic.order || 0;
    document.getElementById('modal').style.display = 'flex';
  }
}

async function deleteTopic(id) {
  if (confirm('Delete this topic? All exercises will be deleted!')) {
    try {
      await deleteDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`, id));
      alert('Topic deleted!');
      loadTopics();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting topic');
    }
  }
}

document.getElementById('addBtn').addEventListener('click', () => {
  if (!selectedCategory || !selectedCourse) {
    alert('Please select a category and course first!');
    return;
  }
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Topic';
  document.getElementById('topicForm').reset();
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('topicForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('name').value,
    description: document.getElementById('description').value,
    duration: parseOrder(document.getElementById('duration').value),
    order: parseOrder(document.getElementById('order').value),
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`, editingId), data);
      alert('Topic updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`), data);
      alert('Topic added!');
    }
    document.getElementById('modal').style.display = 'none';
    loadTopics();
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving topic');
  }
});
