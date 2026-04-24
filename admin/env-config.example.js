// ========================================
// ADMIN PANEL - FIREBASE CONFIG EXAMPLE
// ========================================
// 
// ⚠️ IMPORTANT: Ye sirf example file hai!
// 
// Setup Instructions:
// 1. Is file ko copy karo aur naam rakho: env-config.js
// 2. Apne Firebase credentials daalo
// 3. env-config.js ko .gitignore me add karo (already added hai)
// 
// Location: Code Cloner Admin/env-config.js
// 
// ========================================

self.__env = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};

if (typeof window !== "undefined") window.__env = self.__env;
