# 📚 Profile.html - Enrolled Courses Implementation

## Step 1: Add HTML Section

**Location:** Add after `.stats-grid` div and before `.history-section`

```html
<!-- Enrolled Courses Section -->
<div class="enrolled-section reveal" style="margin-top: 1.2rem;">
  <div class="card">
    <div class="card-head" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
      <h2 style="margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        📚 My Enrolled Courses
        <span class="badge badge-blue" id="enrolledCount">0 courses</span>
      </h2>
      <a href="learning.html" class="btn btn-soft btn-sm" style="text-decoration: none;">
        Browse Courses →
      </a>
    </div>
    <div id="enrolledCoursesGrid" style="margin-top: 1rem;"></div>
  </div>
</div>
```

## Step 2: Add CSS Styles

**Location:** Add in `<style>` tag in `<head>`

```css
/* Enrolled Courses Styles */
.enrolled-courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.enrolled-course-card {
  background: var(--surface-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 1.2rem;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.enrolled-course-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #5f83ff, #3cc8a7);
}

.enrolled-course-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(95, 142, 255, 0.15);
  border-color: rgba(95, 142, 255, 0.35);
}

.enrolled-course-header {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}

.enrolled-course-icon {
  font-size: 2rem;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(95, 131, 255, 0.1), rgba(60, 200, 167, 0.1));
  border-radius: 12px;
  border: 1px solid rgba(95, 131, 255, 0.2);
  flex-shrink: 0;
}

.enrolled-course-info {
  flex: 1;
  min-width: 0;
}

.enrolled-course-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.3rem;
  color: var(--text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.enrolled-course-category {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0;
}

.enrolled-course-progress {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.progress-bar-container {
  width: 100%;
  height: 6px;
  background: rgba(95, 131, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #5f83ff, #3cc8a7);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--muted);
}

.progress-percentage {
  font-weight: 600;
  color: var(--brand-2);
}

.enrolled-course-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.8rem;
  border-top: 1px solid var(--line);
}

.last-accessed {
  font-size: 0.75rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.continue-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #5f83ff, #3cc8a7);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.continue-btn:hover {
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(95, 131, 255, 0.3);
}

.empty-enrolled {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--muted);
}

.empty-enrolled-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-enrolled h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--text);
}

.empty-enrolled p {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .enrolled-courses-grid {
    grid-template-columns: 1fr;
  }
  
  .enrolled-course-header {
    gap: 0.6rem;
  }
  
  .enrolled-course-icon {
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
  }
}
```

## Step 3: Add JavaScript to profile.js

**Location:** Add after `loadStats()` function

```javascript
// Import enrollment functions
import { getEnrolledCourses, timeAgo } from './enrollment.js';

// Load enrolled courses
async function loadEnrolledCourses(uid) {
  const grid = document.getElementById('enrolledCoursesGrid');
  const countBadge = document.getElementById('enrolledCount');

  try {
    const courses = await getEnrolledCourses(uid);

    if (!courses.length) {
      grid.innerHTML = `
        <div class="empty-enrolled">
          <div class="empty-enrolled-icon">📚</div>
          <h3>No Enrolled Courses Yet</h3>
          <p>Start your learning journey by enrolling in courses!</p>
          <a href="learning.html" class="btn btn-primary">Browse Courses</a>
        </div>
      `;
      countBadge.textContent = '0 courses';
      return;
    }

    countBadge.textContent = `${courses.length} course${courses.length > 1 ? 's' : ''}`;

    grid.className = 'enrolled-courses-grid';
    grid.innerHTML = courses.map(course => {
      const progress = course.progress || 0;
      const completed = course.completedExercises || 0;
      const total = course.totalExercises || 0;
      const lastAccessed = timeAgo(course.lastAccessedAt);

      return `
        <article class="enrolled-course-card">
          <div class="enrolled-course-header">
            <div class="enrolled-course-icon">${escapeHtml(course.courseIcon || '📘')}</div>
            <div class="enrolled-course-info">
              <h3 class="enrolled-course-name">${escapeHtml(course.courseName || 'Untitled Course')}</h3>
              <p class="enrolled-course-category">${escapeHtml(course.categoryName || 'Category')}</p>
            </div>
          </div>

          <div class="enrolled-course-progress">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">
              <span>${completed}/${total} exercises</span>
              <span class="progress-percentage">${progress}%</span>
            </div>
          </div>

          <div class="enrolled-course-footer">
            <span class="last-accessed">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${lastAccessed}
            </span>
            <a href="exercises.html?category=${course.categoryId}&course=${course.courseId}" class="continue-btn">
              Continue
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </a>
          </div>
        </article>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading enrolled courses:', error);
    grid.innerHTML = `
      <div class="empty-enrolled">
        <div class="empty-enrolled-icon">❌</div>
        <h3>Error Loading Courses</h3>
        <p>Failed to load your enrolled courses. Please try again.</p>
      </div>
    `;
  }
}

// Call in loadProfile function
async function loadProfile(user) {
  // ... existing code ...

  // Load enrolled courses
  await loadEnrolledCourses(user.uid);
  
  // ... rest of existing code ...
}
```

## Step 4: Update Stats to Include Enrolled Courses

**Location:** Modify stats grid to add enrolled courses stat

```html
<!-- Add this stat card in stats-grid -->
<div class="stat-card">
  <span class="stat-num" id="statEnrolled">0</span>
  <div class="stat-label">📚 Enrolled</div>
</div>
```

```javascript
// In loadEnrolledCourses function, update stat
document.getElementById('statEnrolled').textContent = courses.length;
```

## 🎯 Final Result:

### Enrolled Course Card:
```
┌─────────────────────────────────────┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Gradient bar
│                                     │
│ 📘  JavaScript Basics               │
│     Programming                     │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar (45%)
│ 9/20 exercises              45%     │
│                                     │
│ ─────────────────────────────────── │
│ 🕐 2 days ago    [Continue →]      │
└─────────────────────────────────────┘
```

### Empty State:
```
┌─────────────────────────────────────┐
│              📚                     │
│    No Enrolled Courses Yet          │
│  Start your learning journey by     │
│    enrolling in courses!            │
│                                     │
│      [Browse Courses]               │
└─────────────────────────────────────┘
```

## ✅ Testing Checklist:

- [ ] Enrolled courses load from Firebase
- [ ] Progress shows correctly
- [ ] Last accessed time displays
- [ ] Continue button navigates to course
- [ ] Empty state shows when no enrollments
- [ ] Browse courses link works
- [ ] Responsive on mobile
- [ ] Real-time updates work

---

**Profile Page Complete! 🎉**

Now users can:
- ✅ See all enrolled courses
- ✅ Track progress
- ✅ Continue learning
- ✅ Browse new courses
