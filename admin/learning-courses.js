import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;
let selectedCategory = null;

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

document.getElementById('categoryFilter').addEventListener('change', (e) => {
  selectedCategory = e.target.value;
  if (selectedCategory) {
    loadCourses();
  } else {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem">Select a category</td></tr>';
  }
});

async function loadCourses() {
  const tbody = document.getElementById('tableBody');
  
  if (!selectedCategory) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem">Select a category</td></tr>';
    return;
  }

  try {
    const snapshot = await getDocs(collection(db, `learning_categories/${selectedCategory}/courses`));
    const courseDocs = sortDocsByOrder(snapshot.docs);
    
    if (!courseDocs.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem">No courses yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    courseDocs.forEach(docSnap => {
      const course = docSnap.data();
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-size:2rem">${course.icon || '📖'}</td>
        <td><strong>${course.name}</strong></td>
        <td>${course.description || '-'}</td>
        <td><span class="badge badge-blue">${course.level || 'Beginner'}</span></td>
        <td>${course.duration || 0}h</td>
        <td>${parseOrder(course.order)}</td>
        <td>
          <button class="btn btn-sm btn-soft edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editCourse(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteCourse(btn.dataset.id));
    });

  } catch (error) {
    console.error('Error loading courses:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:red">Error loading data</td></tr>';
  }
}

async function editCourse(id) {
  editingId = id;
  const docSnap = await getDoc(doc(db, `learning_categories/${selectedCategory}/courses`, id));
  const course = docSnap.exists() ? docSnap.data() : null;
  
  if (course) {
    document.getElementById('modalTitle').textContent = 'Edit Course';
    document.getElementById('icon').value = course.icon || '';
    document.getElementById('name').value = course.name || '';
    document.getElementById('description').value = course.description || '';
    document.getElementById('level').value = course.level || 'Beginner';
    document.getElementById('duration').value = course.duration || 0;
    document.getElementById('order').value = course.order || 0;
    document.getElementById('modal').style.display = 'flex';
  }
}

async function deleteCourse(id) {
  if (confirm('Delete this course? All exercises in this course will be deleted!')) {
    try {
      await deleteDoc(doc(db, `learning_categories/${selectedCategory}/courses`, id));
      alert('Course deleted!');
      loadCourses();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting course');
    }
  }
}

document.getElementById('addBtn').addEventListener('click', () => {
  if (!selectedCategory) {
    alert('Please select a category first!');
    return;
  }
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Course';
  document.getElementById('courseForm').reset();
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('courseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    icon: document.getElementById('icon').value,
    name: document.getElementById('name').value,
    description: document.getElementById('description').value,
    level: document.getElementById('level').value,
    duration: parseOrder(document.getElementById('duration').value),
    order: parseOrder(document.getElementById('order').value),
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, `learning_categories/${selectedCategory}/courses`, editingId), data);
      alert('Course updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, `learning_categories/${selectedCategory}/courses`), data);
      alert('Course added!');
    }
    document.getElementById('modal').style.display = 'none';
    loadCourses();
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving course');
  }
});
