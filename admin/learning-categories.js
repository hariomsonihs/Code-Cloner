import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;

initShellUI();

// Check authentication
onAuthStateChanged(auth, (user) => {
  document.body.classList.add('ready');
  if (!user) {
    alert('Please login first!');
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
  const tbody = document.getElementById('tableBody');
  console.log('Loading categories...');
  
  try {
    const q = query(collection(db, 'learning_categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    console.log('Categories found:', snapshot.size);
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#666">No categories yet. Click "+ Add Category" to create one!</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    for (const docSnap of snapshot.docs) {
      const cat = docSnap.data();
      console.log('Category:', cat.name);
      
      // Count courses
      let coursesCount = 0;
      try {
        const coursesSnap = await getDocs(collection(db, `learning_categories/${docSnap.id}/courses`));
        coursesCount = coursesSnap.size;
      } catch (err) {
        console.log('Error counting courses:', err);
      }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-size:2rem">${cat.icon || '📚'}</td>
        <td><strong>${cat.name}</strong></td>
        <td>${cat.description || '-'}</td>
        <td>${cat.order}</td>
        <td>${coursesCount}</td>
        <td>
          <button class="btn btn-sm btn-soft edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    }

    // Attach event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editCategory(btn.dataset.id));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
    });

  } catch (error) {
    console.error('Error loading categories:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:red">Error: ' + error.message + '</td></tr>';
  }
}

async function editCategory(id) {
  editingId = id;
  
  try {
    const docSnap = await getDocs(query(collection(db, 'learning_categories')));
    const cat = docSnap.docs.find(d => d.id === id)?.data();
    
    if (cat) {
      document.getElementById('modalTitle').textContent = 'Edit Category';
      document.getElementById('icon').value = cat.icon || '';
      document.getElementById('name').value = cat.name || '';
      document.getElementById('description').value = cat.description || '';
      document.getElementById('order').value = cat.order || 0;
      document.getElementById('modal').style.display = 'flex';
    }
  } catch (error) {
    console.error('Error loading category:', error);
    alert('Error loading category: ' + error.message);
  }
}

async function deleteCategory(id) {
  if (confirm('Delete this category? All courses, topics, and exercises will be deleted!')) {
    try {
      await deleteDoc(doc(db, 'learning_categories', id));
      alert('Category deleted!');
      loadCategories();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting category: ' + error.message);
    }
  }
}

document.getElementById('addBtn').addEventListener('click', () => {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Category';
  document.getElementById('categoryForm').reset();
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  const data = {
    icon: document.getElementById('icon').value,
    name: document.getElementById('name').value,
    description: document.getElementById('description').value,
    order: parseInt(document.getElementById('order').value),
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, 'learning_categories', editingId), data);
      alert('Category updated!');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'learning_categories'), data);
      alert('Category added!');
    }
    document.getElementById('modal').style.display = 'none';
    loadCategories();
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving category: ' + error.message);
  } finally {
    saveBtn.textContent = 'Save';
    saveBtn.disabled = false;
  }
});
