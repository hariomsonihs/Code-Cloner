import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { addImageUploadToQuill } from './quill-image.js';
import { initMediaPicker, openMediaPicker } from './media-picker.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let editingId = null;
let selectedCategory = null;
let selectedCourse = null;
let quill;

const editorFonts = ['outfit', 'poppins', 'playfair', 'roboto-mono', 'dancing', 'pacifico', 'caveat', 'bebas', 'raleway', 'times'];

function parseOrder(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sortDocsByOrder(docs) {
  return [...docs].sort((a, b) => parseOrder(a.data()?.order) - parseOrder(b.data()?.order));
}

function getExerciseCollectionPath() {
  return `learning_categories/${selectedCategory}/courses/${selectedCourse}/exercises`;
}

function setTableMessage(message, color = 'var(--muted)') {
  document.getElementById('tableBody').innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;padding:2rem;color:${color}">${message}</td>
    </tr>
  `;
}

function setupEditor() {
  const Font = Quill.import('formats/font');
  Font.whitelist = editorFonts;
  Quill.register(Font, true);

  quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Write full exercise content here...',
    modules: {
      toolbar: [
        [{ font: editorFonts }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['blockquote', 'code-block'],
        [{ script: 'sub' }, { script: 'super' }],
        ['link', 'image'],
        ['clean']
      ],
      history: { delay: 1000, maxStack: 100, userOnly: true }
    }
  });

  addImageUploadToQuill(quill, app);
  initMediaPicker(app);

  document.getElementById('insertMediaBtn')?.addEventListener('click', () => {
    openMediaPicker((url) => insertImageInEditor(url));
  });
}

function insertImageInEditor(url) {
  if (!url || !quill) return;
  const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
  quill.insertEmbed(range.index, 'image', url, 'user');
  quill.setSelection(range.index + 1, 0, 'silent');
}

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

    select.innerHTML = '<option value=\"\">Select a category</option>';
    categoryDocs.forEach((docSnap) => {
      const category = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = `${category.icon || ''} ${category.name}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadCoursesForCategory(categoryId) {
  const courseSelect = document.getElementById('courseFilter');

  if (!categoryId) {
    courseSelect.disabled = true;
    courseSelect.innerHTML = '<option value=\"\">Select category first</option>';
    setTableMessage('Select a course');
    return;
  }

  courseSelect.disabled = false;
  courseSelect.innerHTML = '<option value=\"\">Loading...</option>';

  try {
    const snapshot = await getDocs(collection(db, `learning_categories/${categoryId}/courses`));
    const courseDocs = sortDocsByOrder(snapshot.docs);

    courseSelect.innerHTML = '<option value=\"\">Select a course</option>';
    courseDocs.forEach((docSnap) => {
      const course = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = `${course.icon || ''} ${course.name}`;
      courseSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading courses:', error);
    courseSelect.innerHTML = '<option value=\"\">Failed to load courses</option>';
  }
}

async function syncCourseExerciseCount() {
  if (!selectedCategory || !selectedCourse) return;

  try {
    const snapshot = await getDocs(collection(db, getExerciseCollectionPath()));
    await updateDoc(doc(db, `learning_categories/${selectedCategory}/courses`, selectedCourse), {
      exercisesCount: snapshot.size,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error syncing exercise count:', error);
  }
}

async function loadExercises() {
  if (!selectedCategory || !selectedCourse) {
    setTableMessage('Select a course');
    return;
  }

  const tbody = document.getElementById('tableBody');

  try {
    const snapshot = await getDocs(collection(db, getExerciseCollectionPath()));
    const exerciseDocs = sortDocsByOrder(snapshot.docs);

    if (!exerciseDocs.length) {
      const legacyCount = await countLegacyExercises();
      if (legacyCount > 0) {
        setTableMessage(`No direct exercises yet. ${legacyCount} legacy topic exercise(s) found in old structure.`, '#a16900');
      } else {
        setTableMessage('No exercises yet');
      }
      return;
    }

    tbody.innerHTML = '';
    exerciseDocs.forEach((docSnap) => {
      const exercise = docSnap.data();
      const createdAt = exercise.createdAt?.toDate?.();
      const createdDate = createdAt ? createdAt.toLocaleDateString() : '-';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${exercise.title || 'Untitled Exercise'}</strong></td>
        <td>${parseOrder(exercise.order)}</td>
        <td>${exercise.views || 0}</td>
        <td>${createdDate}</td>
        <td>
          <button class=\"btn btn-sm btn-soft edit-btn\" data-id=\"${docSnap.id}\">Edit</button>
          <button class=\"btn btn-sm btn-danger delete-btn\" data-id=\"${docSnap.id}\">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => editExercise(button.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', () => deleteExercise(button.dataset.id));
    });
  } catch (error) {
    console.error('Error loading exercises:', error);
    setTableMessage('Error loading data', 'red');
  }
}

async function countLegacyExercises() {
  if (!selectedCategory || !selectedCourse) return 0;

  try {
    const topicsSnapshot = await getDocs(
      collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics`)
    );

    let total = 0;
    for (const topicDoc of topicsSnapshot.docs) {
      const exerciseSnapshot = await getDocs(
        collection(db, `learning_categories/${selectedCategory}/courses/${selectedCourse}/topics/${topicDoc.id}/exercises`)
      );
      total += exerciseSnapshot.size;
    }
    return total;
  } catch (error) {
    console.error('Error counting legacy exercises:', error);
    return 0;
  }
}

async function editExercise(id) {
  editingId = id;

  try {
    const exerciseDoc = await getDoc(doc(db, getExerciseCollectionPath(), id));
    if (!exerciseDoc.exists()) return;

    const exercise = exerciseDoc.data();
    document.getElementById('modalTitle').textContent = 'Edit Exercise';
    document.getElementById('title').value = exercise.title || '';
    document.getElementById('order').value = parseOrder(exercise.order);
    quill.root.innerHTML = exercise.content || '';
    document.getElementById('modal').style.display = 'flex';
  } catch (error) {
    console.error('Error loading exercise:', error);
  }
}

async function deleteExercise(id) {
  if (!confirm('Delete this exercise?')) return;

  try {
    await deleteDoc(doc(db, getExerciseCollectionPath(), id));
    await syncCourseExerciseCount();
    alert('Exercise deleted.');
    loadExercises();
  } catch (error) {
    console.error('Error deleting exercise:', error);
    alert('Error deleting exercise');
  }
}

function openAddModal() {
  if (!selectedCategory || !selectedCourse) {
    alert('Please select a category and course first.');
    return;
  }

  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Exercise';
  document.getElementById('exerciseForm').reset();
  quill.root.innerHTML = '';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

async function saveExercise(event) {
  event.preventDefault();

  const payload = {
    title: document.getElementById('title').value.trim(),
    content: quill.root.innerHTML,
    order: parseOrder(document.getElementById('order').value),
    updatedAt: serverTimestamp()
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, getExerciseCollectionPath(), editingId), payload);
      alert('Exercise updated.');
    } else {
      payload.views = 0;
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, getExerciseCollectionPath()), payload);
      alert('Exercise added.');
    }

    await syncCourseExerciseCount();
    closeModal();
    loadExercises();
  } catch (error) {
    console.error('Error saving exercise:', error);
    alert('Error saving exercise');
  }
}

function bindEvents() {
  document.getElementById('categoryFilter').addEventListener('change', async (event) => {
    selectedCategory = event.target.value || null;
    selectedCourse = null;
    document.getElementById('courseFilter').value = '';
    await loadCoursesForCategory(selectedCategory);
  });

  document.getElementById('courseFilter').addEventListener('change', (event) => {
    selectedCourse = event.target.value || null;
    if (!selectedCourse) {
      setTableMessage('Select a course');
      return;
    }
    loadExercises();
  });

  document.getElementById('addBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('exerciseForm').addEventListener('submit', saveExercise);
}

function initAuth() {
  onAuthStateChanged(auth, (user) => {
    document.body.classList.add('ready');

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');

    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = (user.email || 'A')[0].toUpperCase();

    loadCategories();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

initShellUI();
setupEditor();
bindEvents();
initAuth();
