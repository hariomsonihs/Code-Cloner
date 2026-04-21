# 🚀 Code Cloner - Personal Learning Hub

A modern, full-featured content management platform for articles, tips, facts, projects, and resources with real-time updates, push notifications, and user engagement features.

## ✨ Features

### 📱 User Website
- **Content Types:** Articles, Tips & Tricks, Facts, Projects (with source code), Resources
- **Real-time Updates:** Live content sync with Firebase Firestore
- **Search & Filter:** Advanced search with category filtering
- **User Engagement:** Reactions (👍 ❤️ 🔥 🤯 👏), Comments, Views tracking
- **Bookmarks:** Save favorite content locally
- **Reading History:** Track reading progress
- **Push Notifications:** Get notified about new content
- **Responsive Design:** Works perfectly on mobile, tablet, and desktop
- **Dark/Light Theme:** Beautiful gradient design with glassmorphism
- **Progressive Web App:** Install as native app on Android

### 🎛️ Admin Panel
- **Content Management:** Full CRUD operations for all content types
- **Rich Text Editor:** Quill.js with image upload support
- **Bulk Operations:** Select and delete multiple items
- **GitHub Import:** Import content from JSON files
- **RSS Import:** Fetch content from RSS feeds
- **Featured Content:** Mark content as featured
- **Analytics:** View counts, engagement metrics
- **User Management:** View registered users
- **Notifications:** Send push notifications to users
- **Comments Moderation:** View and manage user comments

## 🔧 Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Firebase (Firestore, Authentication, Cloud Messaging, Storage)
- **Editor:** Quill.js for rich text editing
- **Icons:** Custom SVG icons
- **Fonts:** Space Grotesk, Outfit (Google Fonts)
- **Hosting:** Vercel / Firebase Hosting

## 📦 Installation & Setup

### Prerequisites
- Node.js (optional, for local development)
- Firebase account
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/code-cloner.git
cd code-cloner
```

### Step 2: Firebase Setup

#### 2.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name and follow setup wizard
4. Enable Google Analytics (optional)

#### 2.2 Enable Firebase Services

**Firestore Database:**
1. Go to Firestore Database
2. Click "Create Database"
3. Start in **production mode**
4. Choose location (closest to your users)

**Authentication:**
1. Go to Authentication
2. Click "Get Started"
3. Enable "Email/Password" sign-in method
4. Add your admin email

**Cloud Messaging (Push Notifications):**
1. Go to Project Settings > Cloud Messaging
2. Generate Web Push certificate (VAPID key)
3. Copy the key pair

**Storage (Image Uploads):**
1. Go to Storage
2. Click "Get Started"
3. Start in production mode

#### 2.3 Get Firebase Credentials
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click "Web" icon (</>) to add web app
4. Register app with nickname "Code Cloner"
5. Copy the Firebase config object

### Step 3: Configure Environment Variables

#### 3.1 Website Configuration
```bash
# Copy example file
cp env-config.example.js env-config.js

# Edit env-config.js and add your Firebase credentials
```

**env-config.js:**
```javascript
self.__env = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
  vapidKey: "YOUR_VAPID_KEY",
};
```

#### 3.2 Admin Panel Configuration
```bash
# Copy example file
cp "Code Cloner Admin/env-config.example.js" "Code Cloner Admin/env-config.js"

# Edit and add same Firebase credentials
```

#### 3.3 Firebase Config
```bash
# Copy example file
cp firebase-config.example.js firebase-config.js

# Edit and add Firebase credentials
```

### Step 4: Deploy Firestore Security Rules

#### Option 1: Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Firestore Database > Rules tab
4. Copy content from `firestore.rules` file
5. Paste in console
6. Click "Publish"

#### Option 2: Firebase CLI
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Step 5: Create Admin User
1. Go to Firebase Console > Authentication
2. Click "Add User"
3. Enter your email and password
4. This will be your admin login

### Step 6: Run Locally (Optional)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Open browser
# Website: http://localhost:8000
# Admin: http://localhost:8000/Code%20Cloner%20Admin/
```

### Step 7: Deploy to Production

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

#### Firebase Hosting
```bash
# Initialize hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## 🔒 Security Guidelines

### ⚠️ NEVER Push These Files to GitHub:
- `env-config.js` (contains API keys)
- `firebase-config.js` (contains credentials)
- `.env` (environment variables)
- `Code Cloner Admin/env-config.js`
- `firebase-messaging-sw.js` (if contains keys)
- Any file with actual credentials

### ✅ Safe to Push:
- `*.example.js` files (placeholder values)
- `.env.example` (placeholder values)
- `firestore.rules` (security rules)
- All HTML, CSS, JS files (without credentials)
- Documentation files

### 🛡️ Security Best Practices:
1. **Never commit credentials** - Use `.gitignore`
2. **Use environment variables** - Keep secrets separate
3. **Enable Firestore rules** - Protect your database
4. **Use HTTPS only** - Enable in Firebase Hosting
5. **Regular backups** - Export Firestore data regularly
6. **Monitor usage** - Check Firebase console for anomalies

## 📁 Project Structure

```
Code Cloner/
├── index.html              # Home page
├── articles.html           # Articles listing
├── tips.html              # Tips listing
├── facts.html             # Facts listing
├── projects.html          # Projects listing
├── resources.html         # Resources listing
├── read.html              # Content reader page
├── search.html            # Search page
├── saved.html             # Bookmarks page
├── profile.html           # User profile
├── app.css                # Main styles
├── main.js                # Home page logic
├── content-page.js        # Content listing logic
├── read.js                # Reader page logic
├── ui.js                  # UI utilities
├── notifications.js       # Push notifications
├── env-config.example.js  # Config example
├── firebase-config.example.js
├── firestore.rules        # Security rules
├── .gitignore             # Git ignore file
│
├── Code Cloner Admin/     # Admin Panel
│   ├── index.html         # Dashboard
│   ├── articles.html      # Article management
│   ├── tips.html          # Tips management
│   ├── facts.html         # Facts management
│   ├── projects.html      # Projects management
│   ├── resources.html     # Resources management
│   ├── users.html         # User management
│   ├── engagement.html    # Comments & reactions
│   ├── rss-import.html    # RSS importer
│   ├── admin.css          # Admin styles
│   ├── admin.js           # Admin logic
│   └── env-config.example.js
│
└── api/                   # API endpoints (optional)
```

## 🎨 Customization

### Change Colors
Edit CSS variables in `app.css`:
```css
:root {
  --brand-1: #3cc8a7;  /* Primary color */
  --brand-2: #5f8eff;  /* Secondary color */
  --brand-3: #ff6fb3;  /* Accent color */
}
```

### Change Logo
Replace `code_cloner_logo.jpeg` with your logo (keep same filename or update references)

### Add New Content Type
1. Create collection in Firestore
2. Add admin page (copy from existing)
3. Add listing page (copy from existing)
4. Update navigation menus
5. Add to `content-page.js` renderer

## 📱 Android App

The project includes PWA support. Users can install it as a native app:

1. Open website on Android Chrome
2. Tap menu (⋮)
3. Select "Add to Home Screen"
4. App will install like native app

For custom APK, check `android/` folder (if available).

## 🐛 Troubleshooting

### Reactions/Comments Not Working
- Check Firestore rules are deployed
- Verify Firebase config is correct
- Check browser console for errors

### Images Not Uploading
- Enable Firebase Storage
- Check storage rules
- Verify storage bucket name in config

### Push Notifications Not Working
- Check VAPID key is correct
- Enable Cloud Messaging in Firebase
- Request notification permission in browser

### Admin Panel Login Failed
- Verify user exists in Firebase Authentication
- Check email/password are correct
- Ensure auth domain is correct in config

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Hariom Kumar**
- LinkedIn: [hariomsonihs](https://linkedin.com/in/hariomsonihs)
- Instagram: [hariomsonihs](https://instagram.com/hariomsonihs)
- GitHub: [hariomsonihs](https://github.com/hariomsonihs)

## 🙏 Acknowledgments

- Firebase for backend services
- Quill.js for rich text editor
- Google Fonts for typography
- Vercel for hosting

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact via WhatsApp: +91 7667110195
- Email: [Your Email]

---

**⚠️ Remember:** Never push sensitive credentials to GitHub! Always use example files with placeholder values.

**🚀 Happy Coding!**
