# 🎯 Exercises.html - Enroll Button Implementation

## Step 1: Add Enroll Button HTML

**Location:** Inside `.course-info` div (after `courseDesc`)

```html
<!-- Add this after <p id="courseDesc"></p> -->
<div style="margin-top: 0.8rem; display: flex; gap: 0.6rem; flex-wrap: wrap;">
  <button id="enrollBtn" class="enroll-btn" style="display: none;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
    <span id="enrollBtnText">Enroll Now</span>
  </button>
  <div id="enrollmentStatus" style="display: none; padding: 0.5rem 0.9rem; border-radius: 999px; background: rgba(60, 200, 167, 0.1); border: 1px solid rgba(60, 200, 167, 0.3); color: #0d6e55; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span id="enrollmentProgress">Enrolled • 0% Complete</span>
  </div>
</div>
```

## Step 2: Add CSS Styles

**Location:** Inside `<style>` tag in `<head>`

```css
/* Enroll Button Styles */
.enroll-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #5f83ff 0%, #3cc8a7 100%);
  color: white;
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(95, 131, 255, 0.3);
}

.enroll-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(95, 131, 255, 0.4);
}

.enroll-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.enroll-btn.enrolled {
  background: linear-gradient(135deg, #11a779 0%, #0d6e55 100%);
}

.enroll-btn.login-required {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

@media (max-width: 768px) {
  .enroll-btn {
    width: 100%;
    justify-content: center;
  }
}
```

## Step 3: Add JavaScript (at the end of existing script)

**Location:** Add before closing `</script>` tag

```javascript
// Import enrollment functions
import { 
  enrollInCourse, 
  checkEnrollment, 
  getEnrollmentData,
  updateCourseProgress,
  updateLastAccessed,
  getCurrentUser 
} from './enrollment.js';

// Enrollment state
let currentUser = null;
let isEnrolled = false;
let enrollmentData = null;

// Initialize enrollment UI
async function initEnrollmentUI() {
  currentUser = await getCurrentUser();
  
  const enrollBtn = document.getElementById('enrollBtn');
  const enrollBtnText = document.getElementById('enrollBtnText');
  const enrollmentStatus = document.getElementById('enrollmentStatus');
  const enrollmentProgress = document.getElementById('enrollmentProgress');

  if (!currentUser) {
    // Not logged in
    enrollBtn.style.display = 'inline-flex';
    enrollBtn.className = 'enroll-btn login-required';
    enrollBtnText.textContent = 'Login to Enroll';
    enrollBtn.onclick = () => {
      window.location.href = 'profile.html';
    };
    return;
  }

  // Check if already enrolled
  isEnrolled = await checkEnrollment(currentUser.uid, courseId);

  if (isEnrolled) {
    // Already enrolled - show status
    enrollmentData = await getEnrollmentData(currentUser.uid, courseId);
    
    if (enrollmentData) {
      enrollmentStatus.style.display = 'inline-flex';
      const progress = enrollmentData.progress || 0;
      const completed = enrollmentData.completedExercises || 0;
      const total = enrollmentData.totalExercises || 0;
      enrollmentProgress.textContent = `Enrolled • ${progress}% Complete (${completed}/${total})`;
    }

    // Update last accessed
    await updateLastAccessed(currentUser.uid, courseId);
    
    // Update progress
    await updateCourseProgress(currentUser.uid, categoryId, courseId);
  } else {
    // Not enrolled - show enroll button
    enrollBtn.style.display = 'inline-flex';
    enrollBtn.className = 'enroll-btn';
    enrollBtnText.textContent = 'Enroll Now';
    enrollBtn.onclick = handleEnrollment;
  }
}

// Handle enrollment
async function handleEnrollment() {
  const enrollBtn = document.getElementById('enrollBtn');
  const enrollBtnText = document.getElementById('enrollBtnText');

  if (!currentUser) {
    window.location.href = 'profile.html';
    return;
  }

  // Disable button
  enrollBtn.disabled = true;
  enrollBtnText.textContent = 'Enrolling...';

  try {
    // Get course data
    const catDoc = await getDoc(doc(db, 'learning_categories', categoryId));
    const courseDoc = await getDoc(doc(db, `learning_categories/${categoryId}/courses`, courseId));

    if (!catDoc.exists() || !courseDoc.exists()) {
      throw new Error('Course not found');
    }

    const cat = catDoc.data();
    const course = courseDoc.data();

    // Enroll user
    await enrollInCourse(currentUser.uid, categoryId, courseId, {
      categoryName: cat.name,
      courseName: course.name,
      courseIcon: course.icon || '📘',
      courseDescription: course.description || ''
    });

    // Show success message
    alert('🎉 Successfully enrolled in ' + course.name + '!');

    // Reload enrollment UI
    await initEnrollmentUI();

  } catch (error) {
    console.error('Enrollment error:', error);
    alert('Failed to enroll. Please try again.');
    enrollBtn.disabled = false;
    enrollBtnText.textContent = 'Enroll Now';
  }
}

// Call after loadCourse()
loadCourse().then(() => {
  initEnrollmentUI();
});
```

## Step 4: Update Exercise Completion

**Location:** Find the "Mark Complete" button handler and add this:

```javascript
// After marking exercise complete, update course progress
document.getElementById('markComplete').addEventListener('click', async () => {
  // ... existing code ...
  
  // Update course progress if enrolled
  if (currentUser && isEnrolled) {
    await updateCourseProgress(currentUser.uid, categoryId, courseId);
    // Refresh enrollment UI to show updated progress
    await initEnrollmentUI();
  }
});
```

## 🎯 Final Result:

**Not Logged In:**
```
[🔐 Login to Enroll]
```

**Not Enrolled:**
```
[➕ Enroll Now]
```

**Enrolled:**
```
✓ Enrolled • 45% Complete (9/20)
```

## ✅ Testing Checklist:

- [ ] Button shows "Login to Enroll" when not logged in
- [ ] Clicking redirects to profile page
- [ ] Button shows "Enroll Now" when logged in but not enrolled
- [ ] Enrollment works and saves to Firebase
- [ ] Status shows after enrollment
- [ ] Progress updates when exercises are completed
- [ ] Works on mobile devices

---

**Implementation Complete! 🚀**

Next: Update profile.html to show enrolled courses.
