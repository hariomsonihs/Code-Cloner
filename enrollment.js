// enrollment.js - Course Enrollment System
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';

const firebaseConfig = window.__env || {};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Enroll user in a course
export async function enrollInCourse(userId, categoryId, courseId, courseData) {
  if (!userId || !categoryId || !courseId) {
    throw new Error('Missing required parameters');
  }

  try {
    // Count total exercises in course
    const totalExercises = await countCourseExercises(categoryId, courseId);

    const enrollmentData = {
      categoryId,
      categoryName: courseData.categoryName || '',
      courseId,
      courseName: courseData.courseName || '',
      courseIcon: courseData.courseIcon || '📘',
      courseDescription: courseData.courseDescription || '',
      enrolledAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp(),
      progress: 0,
      completedExercises: 0,
      totalExercises,
      status: 'active'
    };

    await setDoc(
      doc(db, 'users', userId, 'enrollments', courseId),
      enrollmentData
    );

    return { success: true, message: 'Successfully enrolled in course!' };
  } catch (error) {
    console.error('Enrollment error:', error);
    throw error;
  }
}

// ✅ Check if user is enrolled in a course
export async function checkEnrollment(userId, courseId) {
  if (!userId || !courseId) return false;

  try {
    const enrollmentDoc = await getDoc(
      doc(db, 'users', userId, 'enrollments', courseId)
    );
    return enrollmentDoc.exists();
  } catch (error) {
    console.error('Check enrollment error:', error);
    return false;
  }
}

// ✅ Get enrollment data
export async function getEnrollmentData(userId, courseId) {
  if (!userId || !courseId) return null;

  try {
    const enrollmentDoc = await getDoc(
      doc(db, 'users', userId, 'enrollments', courseId)
    );
    
    if (enrollmentDoc.exists()) {
      return { id: enrollmentDoc.id, ...enrollmentDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Get enrollment error:', error);
    return null;
  }
}

// ✅ Update course progress
export async function updateCourseProgress(userId, categoryId, courseId) {
  if (!userId || !categoryId || !courseId) return;

  try {
    // Get completed exercises from localStorage
    const completedKey = 'completedExercises';
    const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
    
    // Filter completed exercises for this course
    const coursePrefix = `${categoryId}_${courseId}_`;
    const completedInCourse = completed.filter(key => 
      key.startsWith(coursePrefix)
    ).length;

    // Get total exercises
    const totalExercises = await countCourseExercises(categoryId, courseId);

    // Calculate progress percentage
    const progress = totalExercises > 0 
      ? Math.round((completedInCourse / totalExercises) * 100) 
      : 0;

    // Update enrollment document
    const enrollmentRef = doc(db, 'users', userId, 'enrollments', courseId);
    await updateDoc(enrollmentRef, {
      progress,
      completedExercises: completedInCourse,
      totalExercises,
      lastAccessedAt: serverTimestamp()
    });

    return { progress, completedInCourse, totalExercises };
  } catch (error) {
    console.error('Update progress error:', error);
    return null;
  }
}

// ✅ Count total exercises in a course
async function countCourseExercises(categoryId, courseId) {
  try {
    // Try direct exercises first
    const directExercises = await getDocs(
      collection(db, `learning_categories/${categoryId}/courses/${courseId}/exercises`)
    );

    if (directExercises.size > 0) {
      return directExercises.size;
    }

    // Try legacy topics structure
    const topicsSnap = await getDocs(
      collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics`)
    );

    let totalCount = 0;
    for (const topicDoc of topicsSnap.docs) {
      const exercisesSnap = await getDocs(
        collection(db, `learning_categories/${categoryId}/courses/${courseId}/topics/${topicDoc.id}/exercises`)
      );
      totalCount += exercisesSnap.size;
    }

    return totalCount;
  } catch (error) {
    console.error('Count exercises error:', error);
    return 0;
  }
}

// ✅ Get all enrolled courses for a user
export async function getEnrolledCourses(userId) {
  if (!userId) return [];

  try {
    const enrollmentsRef = collection(db, 'users', userId, 'enrollments');
    const q = query(enrollmentsRef, orderBy('lastAccessedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    return [];
  }
}

// ✅ Update last accessed time
export async function updateLastAccessed(userId, courseId) {
  if (!userId || !courseId) return;

  try {
    const enrollmentRef = doc(db, 'users', userId, 'enrollments', courseId);
    const enrollmentDoc = await getDoc(enrollmentRef);
    
    if (enrollmentDoc.exists()) {
      await updateDoc(enrollmentRef, {
        lastAccessedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Update last accessed error:', error);
  }
}

// ✅ Get current user
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// ✅ Format time ago
export function timeAgo(timestamp) {
  if (!timestamp) return 'Never';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
}

export { auth, db };
