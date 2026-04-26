import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;
let selectedCategory = null;
let selectedCourse = null;
let selectedTopic = null;
let quill;

initShellUI();

// Initialize Quill editor
quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]
  }
});

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
    const q = query(collection(db, 'learning_categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    select.innerHTML = '<option value="">Select a category</option>';
    snapshot.docs.forEach(doc => {
      const cat = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
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
  selectedTopic = null;
  const courseSelect = document.getElementById('courseFilter');
  const topicSelect = document.getElementById('topicFilter');
  
  if (selectedCategory) {
    courseSelect.disabled = false;
    courseSelect.innerHTML = '<option value="">Loading...</option>';
    topicSelect.disabled = true;
    topicSelect.innerHTML = '<option value="">Select course first</option>';
    
    try {
      const q = query(collection(db, `learning_categories/${selectedCategory}/courses`), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      courseSelect.innerHTML = '<option value="">Select a course</option>';
      snapshot.docs.forEach(doc => {
        const course = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = `${course.icon || ''} ${course.name}`;
        courseSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  } else {
    courseSelect.disabled = true;
    topicSelect.disabled = true;
    courseSelect.innerHTML = '<option value="">Select category first</option>';
    topicSelect.innerHTML = '<option value="">Select course first</option>';
  }
});

document.getElementById('courseFilter').addEventListener('change', async (e) => {
  selectedCourse = e.target.value;
  selectedTopic = null;
  const topicSelect = document.getElementById('topicFilter');
  
  if (selectedCourse) {
    topicSelect.disabled = false;
    topicSelect.innerHTML = '<option value="">Loading...</option>';
    
    try {
      const q = query(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      topicSelect.innerHTML = '<option value="">Select a topic</option>';
      snapshot.docs.forEach(doc => {
        const topic = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = topic.name;
        topicSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  } else {
    topicSelect.disabled = true;
    topicSelect.innerHTML = '<option value="">Select course first</option>';
  }
});

document.getElementById('topicFilter').addEventListener('change', (e) => {
  selectedTopic = e.target.value;
  if (selectedTopic) {
    loadExercises();
  } else {
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem">Select a topic</td></tr>';
  }
});

async function loadExercises() {
  const tbody = document.getElementById('tableBody');
  
  if (!selectedCategory || !selectedCourse || !selectedTopic) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem">Select a topic</td></tr>';
    return;
  }

  try {
    const q = query(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${selectedTopic}/exercises`), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem">No exercises yet</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    snapshot.docs.forEach(docSnap => {
      const exercise = docSnap.data();
      const date = exercise.createdAt?.toDate().toLocaleDateString() || '-';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${exercise.title}</strong></td>
        <td>${exercise.order}</td>
        <td>${exercise.views || 0}</td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm btn-soft edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editExercise(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteExercise(btn.dataset.id));
    });

  } catch (error) {
    console.error('Error loading exercises:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:red">Error loading data</td></tr>';
  }
}

async function editExercise(id) {
  editingId = id;
  
  try {
    const docSnap = await getDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${selectedTopic}/exercises`, id));
    
    if (docSnap.exists()) {
      const exercise = docSnap.data();
      document.getElementById('modalTitle').textContent = 'Edit Exercise';
      document.getElementById('title').value = exercise.title || '';
      quill.root.innerHTML = exercise.content || '';
      document.getElementById('order').value = exercise.order || 0;
      document.getElementById('modal').style.display = 'flex';
    }
  } catch (error) {
    console.error('Error loading exercise:', error);
  }
}

async function deleteExercise(id) {
  if (confirm('Delete this exercise?')) {
    try {
      await deleteDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${selectedTopic}/exercises`, id));
      alert('Exercise deleted!');
      loadExercises();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting exercise');
    }
  }
}

document.getElementById('addBtn').addEventListener('click', () => {
  if (!selectedCategory || !selectedCourse || !selectedTopic) {
    alert('Please select a category, course, and topic first!');
    return;
  }
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Exercise';
  document.getElementById('exerciseForm').reset();
  quill.root.innerHTML = '';
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('exerciseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    title: document.getElementById('title').value,
    content: quill.root.innerHTML,
    order: parseInt(document.getElementById('order').value),
    views: 0,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${selectedTopic}/exercises`, editingId), data);
      alert('Exercise updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${selectedTopic}/exercises`), data);
      alert('Exercise added!');
    }
    document.getElementById('modal').style.display = 'none';
    loadExercises();
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving exercise');
  }
});
